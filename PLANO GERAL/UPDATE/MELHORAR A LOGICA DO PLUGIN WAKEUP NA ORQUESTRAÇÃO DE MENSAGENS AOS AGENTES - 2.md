# Plano v5 — Wakeup/Recovery/Heartbeat do AgentMap com entrega e orquestração corretas de mensagens

## 0. Resumo executivo

Analisei os 3 arquivos enviados:

1. `Sem_título.png` — fluxograma do plugin **atual** (`agentmap-wakeup.ts`), com nós de LOG incluídos.
2. `agentmap-wakeup.ts` — código-fonte real hoje em produção.
3. `MELHORAR_A_LOGICA_DO_PLUGIN_WAKEUP_NA_ORQUESTRAÇÃO_DE_MENSAGENS_AOS_AGENTES.MD` — sua especificação de 24 seções pedindo a evolução do plugin para uma máquina de estados por sessão, isolamento real entre sessões e cursor por sessão.

Depois, pesquisei a documentação **oficial e atual** do Kilo Code (kilo.ai/docs, o repositório `Kilo-Org/kilocode`, e a documentação do OpenCode — motor sobre o qual o Kilo é construído, com comportamento "idêntico" segundo a própria doc do Kilo). O resultado muda partes importantes tanto do código atual quanto da sua especificação.

**Veredito em uma frase:** sua especificação (arquivo 3) está arquiteturalmente correta e é o caminho certo — máquina de estados por sessão, isolamento real, cursor por contexto — mas ela foi escrita sem acesso a três fatos que a documentação oficial confirma agora e que mudam decisões de implementação importantes. O código atual (arquivo 2) tem um bug crítico não mencionado na sua especificação (mensagens nunca são filtradas por destinatário — nenhuma, de espécie alguma) e pelo menos um bug de "proteção morta" (o cooldown de recovery é escrito mas nunca lido). O fluxograma (arquivo 1) é fiel ao código atual — logo herda os mesmos problemas, além de misturar nós de LOG com nós de negócio, o que você mesmo já pediu para não repetir.

---

## 1. Achados da pesquisa na documentação oficial do Kilo Code (atual, agosto/2026)

Fontes: `kilo.ai/docs/automate/extending/plugins` (página oficial de Plugins, atualizada), repositório `Kilo-Org/kilocode` no GitHub, e documentação do OpenCode (o Kilo roda sobre o mesmo motor — a própria doc do Kilo diz "Upstream docs (behavior is identical to OpenCode)").

### 1.1 `session.status` existe e é a fonte de verdade para ocupado/idle — não uma heurística de tempo

A doc oficial de eventos do Kilo lista, entre os eventos de Sessão: `session.created`, `session.updated`, `session.idle`, `session.error`, `session.deleted`, `session.compacted`, `session.diff`, **`session.status`**.

O schema real do `session.status` (confirmado no código-fonte do motor, via issue pública do repositório upstream) é:

```text
{
  sessionID: string,
  status: { type: "idle" } | { type: "busy" } | { type: "retry", attempt: number, message: string, next: number }
}
```

Isso significa que **não precisamos inferir "ocupado" a partir de um timestamp de última atividade com janela de 60s** (como o código atual faz em `estaOcupado()`/`atividadeRecente`). O próprio Kilo já sabe e publica o estado real da sessão, incluindo um terceiro estado — `retry` — que representa backoff por erro transitório do provider. O código atual não tem esse terceiro estado e o tratará como "não ocupado" depois de 60s, podendo injetar heartbeat/wake-up exatamente durante um retry automático do próprio Kilo.

**Correção:** trocar a heurística de atividade por rastreio do `session.status` real, por sessão. Isso substitui — não complementa — a lógica de `ATIVIDADE_MAX_MS`.

### 1.2 `session.idle` está marcado como **deprecated** no motor upstream, em favor de `session.status` com `type: "idle"`

O código-fonte do evento (confirmado publicamente) traz um comentário explícito `// deprecated` logo acima da definição de `session.idle`. A doc do Kilo ainda lista `session.idle` como eventо comum (não avisa da depreciação), mas isso é coerente com Kilo estar numa versão que ainda emite os dois eventos por compatibilidade. **Risco real:** uma atualização futura do Kilo pode parar de emitir `session.idle` e manter só `session.status`.

**Correção:** o plugin deve tratar `session.idle` OU `session.status` com `status.type === "idle"` como o mesmo sinal lógico ("sessão ficou ociosa"), com um pequeno guard de deduplicação (ver seção 5.3) para não disparar duas vezes quando o Kilo emitir ambos na mesma transição.

### 1.3 Sessões-filhas (subagentes via Task tool) emitem os mesmos eventos, sem forma de diferenciar por padrão

Existe uma issue pública confirmando exatamente este ponto: quando o Kilo cria uma sessão-filha (subagente disparado pela tool `task`), essa sessão-filha também emite `session.status` com `type: "idle"`, **estruturalmente idêntico** ao evento da sessão principal. O campo que distingue (`parentID`) existe no modelo de sessão (`session.info.parentID`) mas **não é incluído no payload de `session.status`** — só aparece em `session.created` e `session.updated`.

Isso é uma lacuna que **nem a sua especificação nem o código atual cobrem**: hoje, se uma sessão-filha (subtarefa) ficar idle, o plugin trata isso exatamente como se a sessão principal da janela tivesse ficado idle — podendo iniciar heartbeat ou tentar wake-up na sessão errada, ou marcar "atividade" da sessão principal com base em eventos de uma subtarefa.

**Correção:** o plugin precisa manter seu próprio mapa `sessionID -> parentID`, populado a partir dos eventos `session.created`/`session.updated` (que carregam `parentID`) ou via `client.session.get({ path: { id } })`, e usar isso para: (a) nunca tratar `session.idle`/`session.status(idle)` de uma sessão-filha como "a janela ficou livre", e (b) decidir se mensagens do AgentMap devem ir para a sessão principal ou para a sessão-filha específica (normalmente: só a principal recebe wake-up/heartbeat; sessões-filhas são geridas pelo próprio ciclo de vida da tool `task`).

### 1.4 `promptAsync` pode não ser o nome real do método — e mesmo o nome certo não prova execução

A documentação oficial atual do SDK (`@opencode-ai/sdk`, que o `@kilocode/sdk` espelha) mostra o método como **`client.session.prompt(...)`**, não `promptAsync`. `promptAsync` aparece em material de terceiros/mais antigo, não na referência oficial atual. O código atual já lida com essa incerteza da pior forma possível: faz `(client.session as any).promptAsync(...)` — um cast para `any` que silencia o TypeScript exatamente no ponto mais crítico do plugin (a chamada que acorda o agente). Se o nome estiver errado, isso falha em runtime, não em build time, e o `catch` genérico do plugin loga o erro mas o fluxo segue como se nada tivesse acontecido em vários pontos.

Além disso, a doc oficial descreve o endpoint por trás desse método como: **"Durably admit one session input and schedule agent-loop execution unless resume is false"** — ou seja, a chamada apenas **admite a mensagem numa fila durável e agenda** a execução; não é uma garantia síncrona de que o modelo já processou ou vai processar imediatamente. Isso confirma tecnicamente a preocupação que você já tinha levantado na sua especificação (seção 9), agora com evidência oficial. Também existe confirmação de que, se a sessão estiver ocupada e não suportar enfileiramento, a chamada pode lançar `BusyError` diretamente — outro motivo para checar `session.status` **antes** de chamar prompt, e não confiar apenas no timestamp.

**Correção:** (a) Gate 0 obrigatório — verificar em runtime, contra o pacote `@kilocode/plugin`/`@kilocode/sdk` realmente instalado no ambiente, se o método se chama `prompt` ou `promptAsync`, sem cast para `any` (usar checagem de tipo real ou, na pior hipótese, feature-detect com `typeof client.session.prompt === "function"`); (b) nunca tratar o retorno da chamada como "sessão retomada com sucesso" — tratar como "mensagem admitida", e confirmar retomada observando a transição de `session.status` para `busy` logo em seguida (com timeout curto e sem polling agressivo — só observando os próprios eventos que já chegam via hook `event`).

### 1.5 O contexto do plugin já entrega `project` de graça — não precisa inventar API para saber a qual projeto a sessão pertence

A doc oficial mostra que a função do plugin recebe `{ project, directory, worktree, client, $, serverUrl, experimental_workspace }`. `project` é "Current project metadata" — ou seja, o vínculo projeto↔sessão que sua especificação (seção 2 e 3) pede para priorizar já está disponível sem chamada de API adicional, pelo menos para identificar em qual projeto aquela instância do Kilo está rodando. Isso simplifica a chave de isolamento: não é preciso perguntar ao AgentMap "a qual projeto pertence esta sessão" — o plugin já sabe, porque cada `kilo serve` roda associado a um diretório/worktree/projeto.

**Correção:** usar `ctx.project` (capturado uma vez, no carregamento do plugin) como parte fixa da chave de estado, e `sessionID` (variável, por evento) como a outra parte — exatamente como pedido na sua seção 3, só que sem a chamada extra ao AgentMap que a princípio pareceria necessária.

### 1.6 `session.error` pode vir **sem** `sessionID`

Confirmado no schema oficial do evento: `sessionID` é `optional()`. O código atual já lida com isso (`if (!sessionId) { warn; return; }`), o que está certo — mas vale manter esse guard explícito na reescrita, porque é comportamento documentado, não defensivo por precaução.

### 1.7 Existe `noReply: true` no `session.prompt` — útil para o "recovery" silencioso, não para o wake-up

A doc do SDK mostra uma opção `noReply: true`: "Inject context without triggering AI response (useful for plugins)". Isso injeta uma mensagem de sistema/contexto na sessão **sem** disparar uma resposta do modelo. Não é o que queremos para wake-up (que precisa que o agente **aja**), mas pode ser útil no futuro para, por exemplo, deixar um "bilhete" de contexto sem gastar uma resposta completa do modelo em casos de baixa prioridade. Vale documentar como opção conhecida, não implementar agora (fora do escopo pedido).

---

## 2. Erros confirmados no código atual (`agentmap-wakeup.ts`)

Numerados por gravidade.

**#1 — CRÍTICO — Nenhuma mensagem é filtrada por sessão/agente destinatário.**
`buscarMensagensPendentes()` filtra só por `TIPOS_RELEVANTES.has(tipo)` e por `eventSequence > cursor`. Não existe, em lugar nenhum do arquivo, qualquer comparação entre a mensagem e o `sessionId`, o `projectId` ou o agente responsável pela sessão que está ficando idle. Isso significa que **toda sessão Kilo que ficar idle, em qualquer projeto, recebe o resumo de absolutamente todas as mensagens pendentes do AgentMap inteiro** — incluindo mensagens destinadas a outros agentes, de outros projetos. Esta é exatamente a falha que sua seção 2 descreve como inaceitável ("nunca entregar uma mensagem simplesmente porque ela é nova"), e no código de hoje ela está 100% presente, não parcialmente.

**#2 — CRÍTICO (proteção morta) — O cooldown de recovery é escrito, nunca lido.**
`sessoesComRecovery` e `recoveryTimers` são preenchidos dentro de `injetarPromptRecovery()`, mas essa mesma função **nunca verifica** `sessoesComRecovery.has(sessionId)` antes de injetar. O event handler de `session.error` também não faz essa checagem antes de chamar `injetarPromptRecovery`. Resultado: o "cooldown de 5 minutos" existe só na aparência — na prática, cada `session.error` não classificado como interrupção do usuário dispara um novo recovery, mesmo que o anterior tenha sido enviado há 2 segundos. Isso é exatamente o loop `error → recovery → error → recovery` que sua seção 7 pede para impedir, e hoje nada impede.

**#3 — ALTO — Cursor de eventos global (`ultimoEventSequenceProcessado`).**
Confirmado: é uma variável de módulo única, compartilhada por todas as sessões que passam por esse processo do Kilo — incluindo sessões-filhas (subagentes via `task`), que rodam no mesmo processo/plugin da sessão principal. Sua seção 3 já identificou esse problema em abstrato; o código confirma que ele é real e agora sabemos (achado 1.3) que sessões-filhas tornam isso ainda mais provável de acontecer na prática, não só em cenários multi-janela.

**#4 — ALTO — `estaOcupado()` usa heurística de tempo, não o estado real da sessão.**
Como visto em 1.1, o Kilo já publica `session.status` com `idle | busy | retry`. O código atual ignora esse evento e assume "ocupado" apenas se algum `tool.execute.after`/`chat.message` chegou nos últimos 60 segundos. Isso falha silenciosamente em qualquer turno onde o modelo fica mais de 60s "pensando" ou gerando texto sem chamar tool — nesse intervalo, `estaOcupado()` retorna `false` mesmo com a sessão genuinamente ocupada, e o heartbeat (que roda a cada 2 minutos) pode injetar um prompt em cima de uma resposta em andamento.

**#5 — MÉDIO — Sem tratamento de sessões-filhas.**
Nenhuma lógica distingue sessão principal de subagente. Ver achado 1.3.

**#6 — MÉDIO — Sem limpeza em `session.deleted`.**
O evento `session.deleted` é real e documentado (achado 1.1), mas o `switch` de eventos do plugin não trata esse caso. `debounceTimers`, `heartbeatTimers`, `recoveryTimers`, `interruptTimers`, `atividadeRecente`, `sessoesComRecovery`, `sessoesInterrompidas` acumulam entradas de sessões que já não existem mais, indefinidamente, enquanto o processo do Kilo estiver de pé.

**#7 — MÉDIO — Sem lock de concorrência por sessão.**
Nada impede que o timer de debounce (wake-up) e o timer de heartbeat disparem para a mesma sessão quase ao mesmo tempo — ambos chamam `buscarMensagensPendentes()` e podem, em teoria, ambos decidir injetar. Sua seção 14 já pede essa proteção; o código de hoje não a tem.

**#8 — MÉDIO — Chamada ao SDK com `as any`, sem verificação de que o método existe.**
Ver achado 1.4. `(client.session as any).promptAsync(...)` em dois pontos do arquivo (linhas ~248 e ~285 e ~391 na numeração do arquivo enviado).

**#9 — BAIXO — Retorno de `promptAsync` tratado como confirmação de sucesso.**
Ver achado 1.4. O código loga `"Wake-up enviado"` e avança o cursor assim que a `Promise` resolve, sem checar se a sessão de fato voltou a ficar `busy`.

**#10 — BAIXO — Lista `TIPOS_RELEVANTES` de ~90 strings hardcoded dentro do plugin Kilo.**
Acoplamento desnecessário: toda vez que o AgentMap ganhar um novo tipo de evento relevante, alguém precisa lembrar de editar e redistribuir o plugin do Kilo — um artefato que vive fora do repositório do AgentMap e é carregado por um processo diferente. O ideal é que o endpoint do AgentMap já devolva só o que é "acionável para wake-up" (ou aceite um parâmetro), e o plugin fique burro em relação a essa lista.

**#11 — BAIXO — `ATIVIDADE_MAX_MS` fixo em 60000, não configurável.**
Sua seção 12 já pedia isso; o código atual não expõe via variável de ambiente (diferente de `DEBOUNCE_MS` e `HEARTBEAT_INTERVAL_MS`, que já são configuráveis). Torna-se moot depois da correção do achado 1.1 (troca por `session.status` real), mas registro porque, se a heurística de atividade for mantida como sinal auxiliar/fallback, ela precisa ser configurável.

---

## 3. Erros/lacunas na sua especificação (arquivo 3)

Sua especificação está correta na arquitetura geral. Os pontos abaixo são lacunas que a pesquisa oficial revelou — não contradições.

- **Não menciona sessões-filhas/subagentes** (achado 1.3). É o ponto mais importante que falta: sem isso, "isolamento entre sessões" fica incompleto mesmo depois de implementado, porque uma sessão-filha idle pode ainda confundir o estado da sessão principal.
- **Pede para reavaliar `ATIVIDADE_MAX_MS`**, mas parte da premissa de que a única fonte disponível é heurística de tempo. A fonte certa é `session.status` (achado 1.1) — isso não é uma "reavaliação de valor", é uma troca de mecanismo.
- **Trata `session.idle` como o evento definitivo de ociosidade**, sem considerar que ele está marcado como deprecated upstream (achado 1.2). A arquitetura de estados que você pediu continua válida, só precisa escutar os dois eventos como o mesmo sinal.
- **Pede para não confiar cegamente em `promptAsync`**, o que está certo e é reforçado pela doc oficial — mas a doc oficial também sugere que o nome do método pode nem ser esse (achado 1.4), o que é um Gate 0 a mais que sua especificação não previa.
- **Seção 2 (isolamento) já pede a ordem certa de prioridade de roteamento**, mas não menciona que `ctx.project` já resolve parte disso de graça (achado 1.5) — o que simplifica a implementação em vez de exigir uma chamada nova ao AgentMap.

Nenhum desses pontos invalida sua especificação — eles a tornam mais precisa.

---

## 4. Arquitetura corrigida

### 4.1 Chave de isolamento

```text
chave = `${ctx.project.id}:${sessionID}`
```

`ctx.project` é capturado uma única vez, no carregamento do plugin (é fixo por processo/worktree). `sessionID` vem de cada evento. Essa chave — não o `sessionID` sozinho — é a chave de todo estado por sessão daqui em diante, incluindo o cursor de eventos.

### 4.2 Estado por sessão (substitui as ~9 estruturas globais soltas do código atual)

```ts
interface SessionWakeupState {
  sessionId: string;
  projectId: string;
  parentId?: string;          // preenchido via session.created/updated ou client.session.get
  isChildSession: boolean;    // parentId !== undefined
  status: "idle" | "busy" | "retry" | "unknown";
  lastStatusEventAt: number;
  cursorEventSequence: number;      // por sessão, nunca global
  interrompida: boolean;
  interruptClearAt?: number;
  recoveryAtivo: boolean;
  recoveryStartedAt?: number;
  operacaoEmAndamento: "idle" | "wakeup" | "recovery" | "heartbeat";
  heartbeatTimer?: ReturnType<typeof setInterval>;
  debounceTimer?: ReturnType<typeof setTimeout>;
  interruptCleanupTimer?: ReturnType<typeof setTimeout>;
}

const estados = new Map<string, SessionWakeupState>(); // chave = `${projectId}:${sessionId}`
```

Sessões-filhas (`isChildSession === true`) **não** recebem heartbeat nem wake-up automático — apenas são rastreadas o suficiente para que seus eventos de `session.status`/`session.idle` não sejam confundidos com os da sessão principal. Isso resolve o achado 1.3 sem precisar reimplementar toda a lógica de subagente (que já é gerida pela própria tool `task` do Kilo).

### 4.3 Roteamento de mensagens — corrige o bug #1 (crítico)

`buscarMensagensPendentes(estado: SessionWakeupState)` passa a exigir, no mínimo, o `sessionId` alvo como parâmetro de filtro, seguindo a ordem de prioridade que sua seção 2 já definiu:

1. `sessionId` do Kilo, se o AgentMap souber mapear a mensagem para ele.
2. `projectId` + agente responsável pela sessão (se `sessionId` não estiver disponível na mensagem, mas o agente estiver identificado).
3. Nunca: entregar por "a mensagem é nova e alguém está idle".

**Isto exige verificar no backend do AgentMap** (Gate 0, seção 6 abaixo) se o contrato de mensagem já carrega um campo que amarra a mensagem a uma sessão Kilo específica (ex.: `sessionIdDestino`, ou o `agenteResponsavel` + uma tabela de `agente -> sessionId` mantida em algum lugar). Pela sua descrição de como o AgentMap funciona hoje (agentes se autoidentificam via tools MCP), o vínculo mais provável é `agente -> sessionId`, não `mensagem -> sessionId` direto. Se for esse o caso, o plugin precisa saber "que agente sou eu" para poder filtrar — e isso só é possível se, em algum momento do fluxo, o agente rodando naquela sessão específica se registrar (via tool MCP) informando seu `sessionId` ao AgentMap, e o AgentMap devolver esse vínculo pela API. **Não inventar esse campo no plugin** — descobrir no Gate 0 exatamente onde esse vínculo já existe ou precisa ser criado no lado do AgentMap, com a menor mudança possível.

### 4.4 Status real via `session.status` — corrige o bug #4

```ts
event: async ({ event }) => {
  if (event.type === "session.status") {
    const { sessionID, status } = event.properties;
    const estado = obterOuCriarEstado(sessionID);
    estado.status = status.type;           // "idle" | "busy" | "retry"
    estado.lastStatusEventAt = Date.now();
    if (status.type === "idle") tratarIdle(estado);
    return;
  }
  // fallback: session.idle (deprecated upstream, mas ainda pode chegar)
  if (event.type === "session.idle") {
    const estado = obterOuCriarEstado(sessionIdDoEvento);
    if (estado.status === "idle" && jaTratouIdleRecentemente(estado)) return; // evita duplicidade se ambos chegarem
    estado.status = "idle";
    tratarIdle(estado);
    return;
  }
  // ...
}
```

`estaOcupado(estado)` deixa de olhar timestamp e passa a ser `estado.status === "busy" || estado.status === "retry"`. Isso é estritamente mais correto e mais simples que a heurística atual.

### 4.5 Recovery com cooldown de verdade — corrige o bug #2

```ts
async function tratarSessionError(estado: SessionWakeupState, erro) {
  if (estado.interrompida || ehInterrupcaoDeUsuario(erro)) return; // ignorar

  if (estado.recoveryAtivo) {
    log("recovery já em andamento para esta sessão — não duplicar");
    return; // <- checagem que faltava no código atual
  }

  estado.recoveryAtivo = true;
  estado.recoveryStartedAt = Date.now();
  await injetarPromptRecovery(estado);
  agendarFimDoCooldown(estado, RECOVERY_COOLDOWN_MS); // ao final, estado.recoveryAtivo = false
}
```

### 4.6 Lock de operação por sessão — corrige o bug #7

Antes de qualquer wake-up, recovery ou heartbeat tentar chamar `session.prompt`, checar `estado.operacaoEmAndamento === "idle"`. Setar para o tipo de operação antes de chamar o SDK; voltar para `"idle"` quando a operação for considerada concluída (retorno do `prompt` +, quando possível, confirmação por `session.status` voltando a `busy` logo em seguida, com timeout curto).

### 4.7 Limpeza em `session.deleted` — corrige o bug #6

```ts
if (event.type === "session.deleted") {
  const chave = `${estado.projectId}:${event.properties.sessionID}`;
  const estado = estados.get(chave);
  if (estado) {
    clearTimeout(estado.debounceTimer);
    clearInterval(estado.heartbeatTimer);
    clearTimeout(estado.interruptCleanupTimer);
    estados.delete(chave);
  }
  return;
}
```

### 4.8 Confirmação de entrega — implementa o achado 1.4 sem polling

```ts
async function enviarPrompt(estado: SessionWakeupState, texto: string) {
  const metodo = (client.session as { prompt?: Function; promptAsync?: Function });
  const chamar = metodo.prompt ?? metodo.promptAsync;
  if (typeof chamar !== "function") {
    throw new Error("Nem session.prompt nem session.promptAsync existem no SDK instalado — Gate 0 falhou.");
  }

  await chamar.call(client.session, { path: { id: estado.sessionId }, body: { parts: [{ type: "text", text: texto }] } });
  // NÃO marcar como concluído aqui. A confirmação real vem do próximo
  // session.status(busy) para esta mesma sessão, capturado pelo hook `event`
  // já registrado. Se nenhum evento busy chegar dentro de um timeout curto
  // (ex.: 10s), logar como "entrega não confirmada" — não retentar
  // automaticamente (evita duplicar prompts), apenas registrar para
  // observabilidade/depuração manual.
}
```

---

## 5. O que precisa ser verificado no AgentMap antes de codificar (Gate 0)

Não invente nada disso — confirme lendo o código real do AgentMap:

1. O contrato de `/api/monitoramento/mensagens` já tem algum campo de destinatário (sessão Kilo, agente, ou projeto) em cada mensagem? Se sim, qual o nome exato do campo?
2. O parâmetro `?after=` do endpoint é realmente respeitado no backend, ou ainda é ignorado (achado de auditoria anterior)? Se ainda ignorado, o cursor por sessão não resolve sozinho — o filtro por `after` também precisa ser corrigido no lado do AgentMap, ou o plugin precisa filtrar client-side por `eventSequence > cursor` além de pedir o parâmetro (defesa em profundidade, mas não substitui o fix no backend).
3. Existe hoje, em qualquer lugar do AgentMap, um vínculo `agente -> sessionId do Kilo`? Como ele é populado (alguma tool MCP de "me identifico como agente X, minha sessão é Y")?
4. O `x-api-key` já está sendo validado de fato no backend, ou continua documentado sem estar implementado (achado de auditoria anterior)? Isso não é bloqueante para a lógica do wake-up, mas é grave o suficiente para não ser ignorado num plano "perfeito" de orquestração de mensagens — mensagens sensíveis de tarefas/handoffs trafegando sem autenticação real.
5. Qual é o nome real do método no `@kilocode/sdk` instalado no projeto — `prompt` ou `promptAsync`? (`bun x tsc --noEmit` contra um arquivo de teste que só declara o tipo, ou inspecionar `node_modules/@kilocode/sdk` diretamente, resolve isso em minutos.)

Sem resposta a 1–3, a "regra fundamental de isolamento" (sua seção 2) não pode ser implementada de verdade — só simulada. É melhor descobrir isso antes de escrever o novo `agentmap-wakeup.ts` do que descobrir depois que o filtro por sessão "funciona" localmente mas não tem dado nenhum para filtrar em produção.

---

## 6. Fases de implementação

**Gate 0 — Verificação (sem escrever código de produção ainda)**
- Confirmar nome real do método de prompt no SDK instalado.
- Confirmar contrato de mensagens do AgentMap (campos de destinatário existentes).
- Confirmar comportamento real do `?after=`.
- Confirmar (ou não) validação do `x-api-key`.
- Produzir um documento curto de evidências (prints de código real, não suposição) antes de prosseguir.

**Fase 1 — Estado por sessão e roteamento correto**
- Substituir as estruturas globais por `Map<chave, SessionWakeupState>`.
- Implementar filtro real de destinatário em `buscarMensagensPendentes`.
- Se o Gate 0 revelar que o AgentMap não tem vínculo agente→sessão, implementar a menor extensão possível no AgentMap para permitir isso (não inventar — registrar como item de escopo do AgentMap, separado do plugin).

**Fase 2 — Status real de sessão**
- Migrar `estaOcupado` para `session.status`, com fallback de `session.idle` deduplicado.
- Tratar `retry` como ocupado.

**Fase 3 — Sessões-filhas**
- Popular `parentId` via `session.created`/`session.updated`.
- Excluir sessões-filhas de heartbeat/wake-up automático.

**Fase 4 — Recovery e concorrência**
- Corrigir o cooldown (checagem antes de injetar, não só depois).
- Implementar lock `operacaoEmAndamento` por sessão.

**Fase 5 — Limpeza e confirmação de entrega**
- Tratar `session.deleted`.
- Implementar confirmação por `session.status(busy)` pós-prompt, sem polling.

**Fase 6 — Testes, documentação, diagramas**
- Rodar os 10 cenários da sua seção 19 (todos continuam válidos) mais os 3 abaixo, que cobrem os achados novos:
  - **Teste 11 — sessão-filha idle não aciona heartbeat/wake-up da sessão principal.**
  - **Teste 12 — segundo `session.error` dentro do cooldown não gera segundo recovery** (este teste, no código atual, falharia — é o que prova o bug #2).
  - **Teste 13 — heartbeat não dispara enquanto `session.status === "retry"`.**
- Só depois de tudo validado, gerar os diagramas Mermaid do fluxo real implementado (sem nós de LOG, como você já pediu), e a explicação nó a nó.

---

## 7. Critérios de aceite (substituindo/complementando os da sua seção 23)

Todos os da sua especificação original permanecem válidos. Adiciono:

- [ ] nenhuma mensagem é entregue a uma sessão sem vínculo confirmado com o destinatário (não "provavelmente relacionado" — confirmado pelo contrato real do AgentMap);
- [ ] sessão-filha (subagente) nunca é confundida com a sessão principal da janela;
- [ ] `estaOcupado` é derivado de `session.status`, não de timestamp;
- [ ] segundo `session.error` dentro da janela de cooldown não gera segundo recovery (testável, não só declarado);
- [ ] `session.deleted` limpa todo o estado daquela sessão;
- [ ] o nome do método de prompt usado no SDK foi confirmado contra o pacote real instalado, sem `as any`;
- [ ] retorno do `prompt`/`promptAsync` nunca é tratado como confirmação de execução — só como admissão;
- [ ] nenhum novo endpoint ou campo é inventado no AgentMap sem antes verificar o que já existe.

---

## 8. Risco residual a documentar (não a esconder)

Mesmo depois de tudo isso, duas limitações permanecem e devem ficar documentadas explicitamente no plugin final, como sua seção 20 pede:

1. **Confirmação de entrega é best-effort.** O Kilo não expõe um "ack" transacional de que um prompt específico foi lido e processado até o fim — só o estado de sessão (`busy`/`idle`) ao redor da chamada. Em caso de dúvida, prefira reenvio idempotente e visível em log a inventar uma garantia que não existe.
2. **O vínculo mensagem→sessão depende do que o AgentMap realmente expõe hoje** (Gate 0, item 3). Se esse vínculo for fraco (por exemplo, só por agente, não por sessão exata), o isolamento entre múltiplas janelas do **mesmo** agente no **mesmo** projeto continuará sendo uma aproximação, não uma garantia — isso deve estar escrito na documentação final, não escondido atrás de um "funciona na prática".
