# 📄 Documento 1/5 — MCP Resource Subscriptions e Change Notifications

> **Ordem de implementação:** 1ª de 5  
> **Prioridade:** Alta  
> **Esforço estimado:** Médio — 2 a 5 dias, dependendo da migração do SDK  
> **Depende de:** Nenhum bloqueio funcional conhecido  
> **Projeto alvo:** AgentMap  
> **Stack:** Node.js + TypeScript + Express + MCP Server + Kilo Code  
> **Transporte atual:** MCP via stdio  
> **Estado recomendado:** compatível com MCP 2025 e preparado para MCP 2026-07-28

---

## 1. Objetivo

Eliminar o processo manual de "copiar e colar" resultados entre diferentes agentes/janelas do Kilo Code, utilizando corretamente o mecanismo de **Resource Subscriptions / Change Notifications do MCP**.

O objetivo é permitir que um agente acompanhe recursos relevantes do AgentMap — por exemplo:

- solicitações de alteração destinadas a ele;
- handoffs recebidos;
- bloqueios de um projeto;
- estado de determinados recursos de coordenação;

e seja informado automaticamente quando o conteúdo desses recursos sofrer alteração.

A notificação **não deve transportar necessariamente o conteúdo atualizado**. O comportamento correto do MCP é informar que determinado recurso mudou e permitir que o cliente faça um novo `resources/read` para obter o estado atual. A especificação define `notifications/resources/updated` exatamente dessa forma.

### Resultado esperado

O fluxo deve evoluir de:

```text
Agente A
   ↓
altera dados
   ↓
humano copia resultado
   ↓
Agente B
   ↓
consulta manualmente
```

para:

```text
Agente A
   ↓
altera dados
   ↓
AgentMap detecta mudança
   ↓
Event Bus
   ↓
MCP Resource Notification
   ↓
Agente B
   ↓
lê novamente o recurso
   ↓
recebe o estado atualizado
```

---

# 2. Estado atual do projeto

Conforme a arquitetura existente:

- Backend em Node.js + TypeScript + Express.
- Backend HTTP executando em `http://localhost:3150`.
- MCP Server executado via **stdio**.
- Existe um processo MCP associado a cada agente/janela do Kilo Code.
- MCP Server localizado em `backend/src/mcp-server/`.
- SDK atualmente declarado no documento como `@modelcontextprotocol/sdk` v1.30.0.
- Mais de 100 tools registradas utilizando `registerTool`.
- Dados persistidos em arquivos JSON dentro de `.ia/`.
- Schemas de validação localizados em `esquemas/*.schema.json`.
- Solicitações, handoffs, tarefas, contratos e bloqueios são persistidos pelo sistema.
- Atualmente não existe um mecanismo confiável de notificação automática entre os agentes.

O documento original registra esses pontos e identifica corretamente o polling/consulta manual como o problema principal.

---

# 3. ⚠️ Atualização crítica: MCP mudou em 2026

O documento original foi escrito em torno do modelo:

```text
resources/subscribe
resources/unsubscribe
notifications/resources/updated
```

Esse modelo continua sendo válido para conexões da **era 2025 do MCP**, mas não deve mais ser tratado como a única arquitetura de implementação.

A revisão MCP **2026-07-28** introduziu:

```text
subscriptions/listen
```

como mecanismo moderno para receber notificações.

Na revisão moderna, o cliente abre um stream de longa duração e informa quais tipos de alterações deseja receber, incluindo:

```text
resourceSubscriptions: [...]
```

O servidor então entrega as notificações correspondentes nesse stream.

A própria documentação do SDK TypeScript estabelece a diferença:

| Era MCP | Mecanismo |
|---|---|
| 2025 / legacy | `resources/subscribe` |
| 2025 / legacy | `resources/unsubscribe` |
| 2025 / legacy | `notifications/resources/updated` |
| 2026-07-28 / modern | `subscriptions/listen` |
| 2026-07-28 / modern | `resourceSubscriptions` |
| 2026-07-28 / modern | `notifications/resources/updated` dentro do stream |

Portanto, **o evento `notifications/resources/updated` continua existindo**, mas o mecanismo utilizado para solicitar sua entrega mudou.

---

# 4. Decisão arquitetural recomendada

O AgentMap deve ser implementado com uma arquitetura **dual-era**, pelo menos durante a transição:

```text
                    ┌───────────────────────┐
                    │      AgentMap Core    │
                    │                       │
                    │  JSON / Services      │
                    │  .ia/                 │
                    └───────────┬───────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Event Bus     │
                       │                 │
                       │ resourceChanged │
                       └────────┬────────┘
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
                 ▼                             ▼
       ┌───────────────────┐       ┌────────────────────┐
       │ MCP legacy        │       │ MCP modern         │
       │ 2025-era          │       │ 2026-07-28         │
       │                   │       │                    │
       │ subscribe        │       │ subscriptions/listen│
       └─────────┬─────────┘       └──────────┬─────────┘
                 │                            │
                 └─────────────┬──────────────┘
                               ▼
                  notifications/resources/updated
                               │
                               ▼
                        Kilo Code Agent
                               │
                               ▼
                         resources/read
```

### Motivo

Isso permite:

1. manter compatibilidade com clientes MCP ainda baseados na especificação 2025;
2. preparar o AgentMap para clientes que negociem MCP 2026-07-28;
3. não obrigar toda a arquitetura a ser reescrita novamente;
4. migrar o cliente gradualmente;
5. testar Kilo Code sem assumir que sua versão atual já implementa o mecanismo moderno.

O SDK TypeScript v2 é atualmente a linha estável associada à especificação de 2026-07-28, enquanto a linha v1 continua recebendo correções e atualizações de segurança durante o período de transição.

---

# 5. Recursos que serão assináveis

Os recursos devem possuir **URIs MCP reais e estáveis**.

O documento original utilizava:

```text
solicitacoes:{agenteId}
handoffs:{agenteId}
bloqueios:{projetoId}
eventos:{projetoId}
```

Isso deve ser substituído por URIs com esquema próprio.

### Padrão recomendado

```text
agentmap://solicitacoes/{agenteId}
agentmap://handoffs/{agenteId}
agentmap://bloqueios/{projetoId}
agentmap://eventos/{projetoId}
```

Exemplo:

```text
agentmap://solicitacoes/AGT-BACKEND
```

ou:

```text
agentmap://handoffs/AGT-FRONTEND
```

Isso torna a identificação dos recursos explícita e compatível com o modelo URI do MCP.

---

# 6. Prioridade dos recursos

Implementar nesta ordem:

### P0 — Solicitações

```text
agentmap://solicitacoes/{agenteId}
```

Representa as solicitações de alteração pendentes destinadas a determinado agente.

Exemplo:

```text
agentmap://solicitacoes/AGT-BACKEND
```

---

### P1 — Handoffs

```text
agentmap://handoffs/{agenteId}
```

Representa os handoffs recebidos por determinado agente.

---

### P1 — Bloqueios

```text
agentmap://bloqueios/{projetoId}
```

Representa os bloqueios ativos relacionados ao projeto.

---

### P2 — Eventos

```text
agentmap://eventos/{projetoId}
```

Representa o estado ou visão consultável dos eventos do projeto.

**Importante:** isso não deve ser confundido com um event stream MCP. Um Resource MCP é um recurso que pode ser lido. O stream de notificações é o mecanismo de mudança, não o conteúdo do recurso.

---

# 7. Registrar os Resources corretamente

O AgentMap não deve apenas armazenar uma tabela de subscriptions.

Os recursos precisam ser efetivamente registrados no MCP Server.

No SDK TypeScript v1, a API oficial utiliza `registerResource()` e `ResourceTemplate` para recursos estáticos e dinâmicos.

Exemplo conceitual:

```typescript
server.registerResource(
  "solicitacoes",
  new ResourceTemplate(
    "agentmap://solicitacoes/{agenteId}",
    { list: undefined }
  ),
  {
    title: "Solicitações do agente",
    description: "Solicitações de alteração destinadas a um agente",
    mimeType: "application/json",
  },
  async (uri, { agenteId }) => {
    const solicitacoes = await consultarSolicitacoes(agenteId);

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(solicitacoes),
        },
      ],
    };
  }
);
```

O recurso deve ser **read-only do ponto de vista MCP**.

As mutações continuam sendo realizadas pelas tools/serviços do AgentMap.

---

# 8. Capability de Resources

Para clientes da era 2025, o servidor deve anunciar:

```typescript
capabilities: {
  resources: {
    subscribe: true,
    listChanged: true,
  },
}
```

A especificação define `subscribe` como a capacidade de receber notificações de alteração de recursos específicos e `listChanged` como a capacidade de informar alterações na lista de recursos.

### Atenção

Essas duas capacidades têm funções diferentes:

```text
resources.subscribe
        ↓
"o conteúdo deste recurso mudou"

resources.listChanged
        ↓
"a lista de recursos disponíveis mudou"
```

Não utilizar `listChanged` para substituir subscriptions.

---

# 9. Implementação legacy — MCP 2025

Enquanto houver clientes da era 2025, o AgentMap deve manter:

```text
resources/subscribe
resources/unsubscribe
notifications/resources/updated
```

O SDK oficial v1 documenta explicitamente os handlers:

```typescript
SubscribeRequestSchema
UnsubscribeRequestSchema
```

e o envio:

```typescript
server.server.sendResourceUpdated({
  uri: resourceUri,
});
```

Esse é o padrão correto do SDK v1.

### Implementação recomendada

```typescript
import {
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const subscriptions = new Set<string>();

server.server.setRequestHandler(
  SubscribeRequestSchema,
  async (request) => {
    subscriptions.add(request.params.uri);
    return {};
  }
);

server.server.setRequestHandler(
  UnsubscribeRequestSchema,
  async (request) => {
    subscriptions.delete(request.params.uri);
    return {};
  }
);
```

Quando o recurso sofrer alteração:

```typescript
if (subscriptions.has(resourceUri)) {
  await server.server.sendResourceUpdated({
    uri: resourceUri,
  });
}
```

Essa abordagem corresponde à documentação oficial atual do SDK v1.

---

# 10. Implementação moderna — MCP 2026-07-28

Para clientes que negociam a revisão:

```text
2026-07-28
```

não implementar uma segunda versão manual de:

```text
resources/subscribe
```

O mecanismo moderno é:

```text
subscriptions/listen
```

O cliente abre um stream e envia um filtro contendo, entre outros campos:

```typescript
{
  resourceSubscriptions: [
    "agentmap://solicitacoes/AGT-BACKEND"
  ]
}
```

O servidor passa então a entregar as alterações correspondentes nesse stream.

A documentação oficial do SDK especifica que `resourceSubscriptions` substitui `resources/subscribe` na revisão 2026-07-28.

### Consequência arquitetural importante

O AgentMap **não precisa implementar manualmente um `SubscriptionManager` para reproduzir `subscriptions/listen`** quando estiver utilizando o mecanismo moderno do SDK.

O SDK faz o roteamento da subscription moderna.

A aplicação precisa fornecer os eventos de alteração:

```text
AgentMap mutation
       ↓
resourceChanged(uri)
       ↓
SDK
       ↓
subscriptions/listen
       ↓
cliente
```

---

# 11. Event Bus do AgentMap

O ponto mais importante da implementação deve ser a separação entre:

```text
"algo mudou"
```

e:

```text
"como o MCP entrega a notificação"
```

Criar um Event Bus interno:

```typescript
export interface ResourceChangedEvent {
  uri: string;
  timestamp: string;
  reason: string;
}

export interface AgentMapEventBus {
  publish(event: ResourceChangedEvent): Promise<void>;
  subscribe(
    handler: (event: ResourceChangedEvent) => Promise<void>
  ): () => void;
}
```

Exemplo:

```typescript
await eventBus.publish({
  uri: `agentmap://solicitacoes/${agenteId}`,
  timestamp: new Date().toISOString(),
  reason: "solicitacao_criada",
});
```

Isso evita acoplar diretamente:

```text
serviço de negócio
      ↓
MCP notification
```

O correto é:

```text
serviço de negócio
      ↓
evento de domínio
      ↓
Event Bus
      ↓
MCP notification
```

---

# 12. Pontos de integração

Os serviços de negócio devem publicar eventos.

### Solicitação criada

```typescript
criarSolicitacaoAlteracao()
```

publica:

```text
agentmap://solicitacoes/{agenteResponsavelId}
```

---

### Solicitação alterada

Também deve publicar:

```text
agentmap://solicitacoes/{agenteResponsavelId}
```

---

### Solicitação concluída

Se a conclusão alterar o recurso retornado ao agente:

```text
agentmap://solicitacoes/{agenteResponsavelId}
```

---

### Handoff criado

```typescript
criarHandoff()
```

publica:

```text
agentmap://handoffs/{agenteDestinoId}
```

---

### Handoff alterado

Publica novamente:

```text
agentmap://handoffs/{agenteDestinoId}
```

---

### Bloqueio criado

```typescript
criarBloqueio()
```

publica:

```text
agentmap://bloqueios/{projetoId}
```

---

### Bloqueio resolvido

```typescript
resolverBloqueio()
```

publica:

```text
agentmap://bloqueios/{projetoId}
```

---

# 13. Não enviar o conteúdo inteiro na notificação

Evitar:

```json
{
  "uri": "agentmap://solicitacoes/AGT-BACKEND",
  "data": {
    "...": "..."
  }
}
```

A notificação MCP deve indicar o recurso:

```json
{
  "method": "notifications/resources/updated",
  "params": {
    "uri": "agentmap://solicitacoes/AGT-BACKEND"
  }
}
```

Depois o cliente deve executar:

```text
resources/read
```

para obter o conteúdo atual.

Essa separação é importante porque:

- reduz o tamanho das notificações;
- evita estado desatualizado;
- evita duplicação;
- mantém o Resource como fonte de verdade;
- permite que várias alterações ocorridas rapidamente sejam consolidadas em uma leitura atual.

A especificação oficial define a notificação justamente como um aviso de que o recurso mudou e pode precisar ser lido novamente.

---

# 14. Coalescência de eventos

O sistema não deve gerar milhares de notificações quando várias alterações ocorrem em sequência.

Exemplo:

```text
solicitação criada
↓
arquivo salvo
↓
timestamp atualizado
↓
status atualizado
↓
índice atualizado
```

Isso pode resultar em vários eventos internos para a mesma mudança lógica.

Implementar coalescência por URI:

```text
agentmap://solicitacoes/AGT-BACKEND
```

durante uma pequena janela:

```text
50–250 ms
```

ou, preferencialmente, publicar apenas no final da operação transacional.

Objetivo:

```text
10 mudanças físicas
        ↓
1 mudança lógica
        ↓
1 notification
        ↓
1 resources/read
```

---

# 15. Arquivos JSON e detecção de mudanças

Como os dados do AgentMap vivem em `.ia/`, existem duas possibilidades.

## Estratégia A — Evento no serviço de domínio

Preferencial.

```text
criarSolicitacao()
       ↓
persistir JSON
       ↓
publicar resourceChanged()
```

Vantagens:

- evento semântico;
- sabe exatamente o motivo da alteração;
- evita depender de filesystem watcher;
- mais fácil de testar.

---

## Estratégia B — File Watcher

Pode ser utilizado como mecanismo complementar:

```text
.ia/**/*.json
       ↓
chokidar/fs.watch
       ↓
mapa arquivo → resource URI
       ↓
resourceChanged()
```

Não utilizar o filesystem watcher como única fonte de verdade se os serviços já possuem pontos de mutação conhecidos.

O watcher pode ser útil para detectar:

- alterações externas;
- edição manual;
- outro processo;
- ferramentas administrativas;
- recuperação após falhas.

---

# 16. Problema crítico: múltiplos processos stdio

O documento original utilizava um:

```typescript
Map<ResourceUri, Set<SessionId>>
```

global em memória.

Isso é insuficiente para a arquitetura do AgentMap se cada agente possuir seu próprio processo MCP.

Exemplo:

```text
Processo MCP A
 └── subscriptions A

Processo MCP B
 └── subscriptions B

Processo MCP C
 └── subscriptions C
```

Uma subscription armazenada no processo A não é conhecida pelo processo B.

Portanto, não assumir que um `Map` global dentro de um módulo é um **registro global do sistema**.

---

# 17. Arquitetura correta para o cenário atual

Como o projeto utiliza:

```text
MCP via stdio
1 processo por agente
```

cada processo deve possuir seu próprio estado de conexão/subscription.

O evento de mudança, entretanto, precisa conseguir chegar ao processo correto.

Há três opções.

## Opção 1 — File Watcher

Cada MCP Server observa `.ia/`.

```text
             .ia/
              │
       ┌──────┼──────┐
       ▼      ▼      ▼
     MCP A  MCP B   MCP C
       │      │      │
       ▼      ▼      ▼
    subs A  subs B subs C
```

É simples e adequado para uma primeira versão local.

---

## Opção 2 — Event Bus local

O backend central publica eventos e os processos MCP recebem:

```text
Backend
   │
   ▼
Event Bus
 ┌─┼─┐
 ▼ ▼ ▼
A B C
```

Pode utilizar:

- IPC;
- Unix socket;
- named pipe;
- Redis;
- NATS;
- outro broker.

Para o AgentMap atual, não introduzir Redis/NATS apenas para resolver esse problema se o sistema continuar estritamente local.

---

## Opção 3 — Backend central de notificações

O processo MCP mantém a conexão com o backend:

```text
Kilo
 ↓
MCP stdio
 ↓
AgentMap notification bridge
 ↓
Backend :3150
 ↓
event bus
```

Essa arquitetura é mais escalável e permite futuramente múltiplos computadores.

---

# 18. Recomendação para o AgentMap

Para a primeira implementação:

### Fase 1

Utilizar:

```text
Domain Event
+
Event Bus local
+
MCP connection-scoped subscriptions
```

### Fase 2

Se os processos MCP precisarem operar independentemente e receber eventos de qualquer processo:

```text
Backend central
+
Event Bus
+
MCP bridge
```

### Fase 3

Se o AgentMap evoluir para execução distribuída:

```text
Redis/NATS
+
ServerEventBus
+
MCP modern subscriptions/listen
```

A documentação oficial do SDK já prevê `ServerEventBus` para cenários multi-processo/multi-node.

---

# 19. Migração do SDK

O documento original considera:

```text
@modelcontextprotocol/sdk v1.30.0
```

Isso não deve ser considerado automaticamente a versão-alvo.

O SDK TypeScript atualmente possui uma linha v2 alinhada ao MCP 2026-07-28.

Entretanto, o AgentMap possui mais de 100 tools.

Portanto:

> **Não migrar todo o projeto cegamente apenas para implementar subscriptions.**

Primeiro executar:

```bash
npm ls @modelcontextprotocol/sdk
```

e:

```bash
npm outdated
```

Depois avaliar a migração.

---

# 20. Estratégia de migração recomendada

## Etapa A — estabilizar a implementação atual

Manter temporariamente:

```text
@modelcontextprotocol/sdk v1.x
```

e implementar corretamente:

```text
registerResource()
resources/subscribe
resources/unsubscribe
sendResourceUpdated()
```

Isso permite validar o conceito imediatamente.

---

## Etapa B — atualizar o SDK

Migrar para a linha v2 quando o restante do AgentMap estiver preparado.

A migração v1 → v2 envolve mudanças de imports, handlers e transports. A documentação oficial informa, por exemplo, que os antigos `*Schema` passam para `@modelcontextprotocol/core`, e que `setRequestHandler` muda para o registro por método.

---

## Etapa C — ativar MCP moderno

Utilizar:

```text
2026-07-28
subscriptions/listen
resourceSubscriptions
```

e manter compatibilidade legacy somente enquanto necessária.

---

# 21. Stdio moderno

Outro ponto importante é o transporte.

No modelo v2 moderno, não basta simplesmente fazer:

```typescript
await server.connect(
  new StdioServerTransport()
);
```

e presumir que a conexão passará automaticamente a operar como MCP 2026-07-28.

A documentação do SDK indica que o servidor stdio moderno/dual-era deve utilizar:

```text
serveStdio(() => buildServer())
```

para que a conexão seja negociada e fixada na era apropriada.

Portanto, durante a migração, revisar:

```text
backend/src/mcp-server/index.ts
```

e toda a inicialização do transporte.

---

# 22. Kilo Code — validação obrigatória

O Kilo Code possui suporte documentado a MCP e consegue descobrir e acessar Resources de servidores MCP. A documentação atual apresenta `access_mcp_resource` para ler recursos MCP e afirma que os recursos são descobertos pelos servidores conectados.

Porém:

> **Não assumir, sem teste, que a versão específica do Kilo Code utilizada pelo AgentMap expõe e processa corretamente subscriptions legacy ou `subscriptions/listen` modernas.**

A documentação pública consultada confirma:

```text
MCP
Tools
Resources
Resource access
stdio
```

mas não é suficiente para afirmar que a versão instalada do Kilo Code já apresenta suporte completo à UX de `notifications/resources/updated` ou ao novo `subscriptions/listen`.

Portanto, isso deve ser tratado como **item de validação**, não como premissa.

---

# 23. Teste mínimo obrigatório com MCP Inspector

O MCP Inspector possui suporte explícito para testar subscriptions.

A documentação atual do Inspector diferencia inclusive:

```text
legacy:
resources/subscribe

modern:
subscriptions/listen
```

e permite observar a chegada de `notifications/resources/updated`.

Executar o Inspector conforme a versão instalada:

```bash
npx @modelcontextprotocol/inspector
```

ou utilizar o modo apropriado para iniciar o servidor AgentMap.

---

# 24. Teste legacy

Conectar ao servidor utilizando uma conexão compatível com a era 2025.

Testar:

```text
resources/list
```

Depois:

```text
resources/read
```

Depois:

```text
resources/subscribe
```

Para:

```text
agentmap://solicitacoes/AGT-BACKEND
```

Alterar a solicitação.

Esperado:

```text
notifications/resources/updated
```

com:

```json
{
  "uri": "agentmap://solicitacoes/AGT-BACKEND"
}
```

Depois:

```text
resources/read
```

deve retornar o novo estado.

---

# 25. Teste moderno

Utilizar uma conexão MCP 2026-07-28.

Abrir:

```text
subscriptions/listen
```

com:

```text
resourceSubscriptions:
[
  "agentmap://solicitacoes/AGT-BACKEND"
]
```

Alterar a solicitação.

Esperado:

```text
notifications/resources/updated
```

dentro do stream de subscriptions.

A revisão moderna envia primeiro uma confirmação de subscription e depois as notificações correspondentes.

---

# 26. Teste de atualização real

O teste não deve verificar somente que uma mensagem chegou.

Deve validar o ciclo inteiro:

```text
1. subscribe
2. alterar entidade
3. receber notification
4. resources/read
5. verificar novo conteúdo
```

Exemplo:

```text
solicitacao.status:

PENDENTE
   ↓
EM_ANALISE
```

Após a alteração:

```text
notification
      ↓
resources/read
      ↓
status = EM_ANALISE
```

---

# 27. Testes automatizados

Implementar testes para:

### Teste 1 — Resource registration

Confirmar que:

```text
agentmap://solicitacoes/AGT-BACKEND
```

é descoberto.

---

### Teste 2 — Resource read

Confirmar:

```text
resources/read
```

retorna JSON válido.

---

### Teste 3 — Subscription

Dois clientes inscritos:

```text
Cliente A → solicitacoes/AGT-BACKEND
Cliente B → solicitacoes/AGT-BACKEND
```

Uma alteração.

Esperado:

```text
A → notification
B → notification
```

---

### Teste 4 — Cliente não inscrito

```text
Cliente C
```

não deve receber a atualização daquele recurso.

---

### Teste 5 — Unsubscribe

Após:

```text
resources/unsubscribe
```

o cliente não recebe novas notificações daquele URI na era legacy.

---

### Teste 6 — Modern listen

Validar:

```text
subscriptions/listen
```

e:

```text
resourceSubscriptions
```

---

### Teste 7 — Reconexão

Encerrar o processo MCP.

Reabrir.

Confirmar que as subscriptions são recriadas pelo cliente quando necessário.

Não assumir que estado de conexão deve sobreviver à morte do processo.

---

### Teste 8 — Alteração sem subscriber

Alterar um recurso sem nenhum subscriber.

Esperado:

```text
nenhum erro
```

e nenhuma tentativa inútil de envio.

---

### Teste 9 — Burst

Executar:

```text
100 alterações
```

em sequência.

Validar que o sistema não cria:

```text
100 × payload completo
```

nem entra em loop.

---

### Teste 10 — Processo morto

Encerrar o MCP Server abruptamente.

Confirmar que o backend não acumula referências inválidas.

---

# 28. Segurança

Nunca aceitar cegamente qualquer URI enviada pelo cliente.

Validar:

```text
scheme
tipo do recurso
identificador
autorização
```

Exemplo:

```text
agentmap://solicitacoes/AGT-BACKEND
```

deve ser validado contra o agente conectado.

Um agente não deve conseguir simplesmente assinar:

```text
agentmap://solicitacoes/AGT-ADMIN
```

se não possuir autorização para acessar esse recurso.

---

# 29. Autorização por recurso

Criar uma função central:

```typescript
authorizeResourceAccess(
  agentId: string,
  uri: string
): Promise<boolean>
```

Exemplo conceitual:

```text
AGT-BACKEND
     │
     ├── solicitacoes/AGT-BACKEND   ✅
     ├── handoffs/AGT-BACKEND       ✅
     ├── bloqueios/PROJETO-X        conforme política
     └── solicitacoes/AGT-ADMIN     ❌
```

A subscription não deve funcionar como mecanismo de autorização.

Primeiro:

```text
autorização
```

Depois:

```text
subscription
```

---

# 30. Canonicalização das URIs

A aplicação deve possuir um único gerador de URI.

Exemplo:

```typescript
export function solicitacoesUri(agentId: string): string {
  return `agentmap://solicitacoes/${encodeURIComponent(agentId)}`;
}
```

Não permitir que diferentes partes do sistema construam:

```text
agentmap://solicitacoes/AGT-BACKEND
```

e:

```text
agentmap://solicitacoes%2FAGT-BACKEND
```

como se fossem recursos diferentes.

O URI precisa ser determinístico.

---

# 31. Observabilidade

Adicionar logs estruturados:

```text
resource.subscription.created
resource.subscription.removed
resource.updated.published
resource.updated.delivered
resource.read
resource.authorization.denied
```

Exemplo:

```json
{
  "event": "resource.updated.published",
  "uri": "agentmap://solicitacoes/AGT-BACKEND",
  "reason": "solicitacao_criada",
  "timestamp": "2026-08-15T18:00:00.000Z"
}
```

Não registrar conteúdo potencialmente sensível do recurso no log.

Registrar apenas:

```text
URI
agentId
projectId
event type
timestamp
latency
result
```

---

# 32. Métricas

Adicionar:

```text
mcp_resource_updates_total
mcp_resource_reads_total
mcp_resource_subscription_total
mcp_resource_subscription_active
mcp_resource_notification_errors_total
mcp_resource_notification_latency_ms
```

Isso permitirá descobrir se o sistema realmente eliminou o polling.

---

# 33. REST/SSE do Dashboard

O documento original sugeria:

```text
GET /api/eventos/stream
```

utilizando o mesmo `SubscriptionManager`.

Essa parte deve ser alterada.

MCP e dashboard Web são dois consumidores diferentes:

```text
                 Event Bus
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      MCP layer          Dashboard SSE
```

Não reutilizar diretamente o estado de subscription MCP para o SSE do navegador.

Criar um adaptador:

```text
AgentMapEventBus
      │
      ├── MCP Notification Adapter
      │
      └── Dashboard SSE Adapter
```

Isso evita acoplamento entre protocolos.

---

# 34. Fluxo completo recomendado

```text
┌───────────────────────┐
│ Agente A              │
│ Kilo Code             │
└───────────┬───────────┘
            │
            │ tool
            ▼
┌───────────────────────┐
│ MCP Server            │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ AgentMap Service      │
│ criarSolicitacao()    │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ .ia/*.json            │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ ResourceChangedEvent  │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Event Bus              │
└───────────┬───────────┘
            │
            ▼
┌──────────────────────────────┐
│ MCP Notification Layer       │
│                              │
│ Legacy: subscribe            │
│ Modern: subscriptions/listen │
└──────────────┬───────────────┘
               │
               ▼
┌───────────────────────┐
│ Agente B              │
│ Kilo Code             │
└───────────┬───────────┘
            │
            ▼
      resources/read
            │
            ▼
┌───────────────────────┐
│ Estado atualizado     │
└───────────────────────┘
```

---

# 35. O que NÃO fazer

Não implementar:

```typescript
server.notification(...)
```

como mecanismo genérico inventado para subscriptions.

Utilizar as APIs oficiais da versão do SDK em uso.

No SDK v1, a documentação utiliza:

```typescript
server.server.sendResourceUpdated({
  uri,
});
```

para a atualização de recursos.

---

Não criar:

```text
sessionId → subscriptions
```

como um estado global do sistema sem considerar a arquitetura de transporte.

A subscription é relacionada à conexão.

---

Não tratar:

```text
notifications/resources/list_changed
```

como:

```text
resource updated
```

São eventos diferentes.

---

Não enviar o conteúdo completo da entidade na notificação.

---

Não assumir suporte do Kilo Code sem teste.

---

Não adicionar Redis/NATS prematuramente.

---

Não transformar cada alteração física de arquivo em uma notificação.

---

# 36. Critérios de aceite

## Resources

- [ ] Recursos registrados com `registerResource`.
- [ ] URIs seguem `agentmap://`.
- [ ] Recursos possuem `mimeType`.
- [ ] `resources/read` retorna o estado atual.
- [ ] Recursos possuem autorização.

## Legacy MCP 2025

- [ ] `resources.subscribe` funciona quando necessário.
- [ ] `resources.unsubscribe` funciona.
- [ ] `notifications/resources/updated` é enviada somente aos inscritos.
- [ ] `sendResourceUpdated()` é utilizado corretamente.

## MCP 2026-07-28

- [ ] SDK v2 avaliado.
- [ ] `serveStdio()` avaliado/migrado quando necessário.
- [ ] `subscriptions/listen` testado.
- [ ] `resourceSubscriptions` testado.
- [ ] stream de subscriptions validado.
- [ ] reconexão testada.

## AgentMap

- [ ] Event Bus implementado.
- [ ] Solicitações publicam eventos.
- [ ] Handoffs publicam eventos.
- [ ] Bloqueios publicam eventos.
- [ ] Eventos possuem URI canônica.
- [ ] Coalescência implementada quando necessária.
- [ ] Processos independentes conseguem receber mudanças.
- [ ] Não há polling obrigatório para o fluxo principal.

## Testes

- [ ] MCP Inspector legacy.
- [ ] MCP Inspector modern.
- [ ] Dois clientes inscritos.
- [ ] Cliente não inscrito.
- [ ] Unsubscribe.
- [ ] Reconexão.
- [ ] Processo morto.
- [ ] Burst de alterações.
- [ ] Alteração sem subscriber.
- [ ] `resources/read` após notification.

## Kilo Code

- [ ] Kilo Code descobre os Resources.
- [ ] Kilo Code consegue ler os Resources.
- [ ] Kilo Code foi testado com o mecanismo de atualização disponível na versão instalada.
- [ ] Se o Kilo não processar subscriptions, polling permanece somente como fallback.
- [ ] A implementação do servidor não fica dependente da UX específica do Kilo.

---

# 37. Plano de implementação recomendado

### Fase 1 — Foundation

Criar:

```text
backend/src/mcp-server/resources/
backend/src/mcp-server/events/
backend/src/mcp-server/subscriptions/
```

Implementar:

```text
Resource URI factory
Resource registry
Event Bus
```

---

### Fase 2 — Resources

Registrar:

```text
solicitacoes
handoffs
bloqueios
```

e validar:

```text
resources/list
resources/read
```

---

### Fase 3 — Legacy subscriptions

Implementar para compatibilidade:

```text
resources/subscribe
resources/unsubscribe
notifications/resources/updated
```

utilizando a API oficial do SDK v1, caso o projeto ainda esteja nessa linha.

---

### Fase 4 — Event integration

Integrar:

```text
criarSolicitacaoAlteracao()
criarHandoff()
criarBloqueio()
resolverBloqueio()
```

ao Event Bus.

---

### Fase 5 — Inspector

Validar o fluxo completo:

```text
subscribe
→ mutate
→ notification
→ read
```

---

### Fase 6 — Kilo Code

Testar a versão exata utilizada pelo projeto.

Não usar "suporte MCP" genérico como prova de suporte a subscriptions.

---

### Fase 7 — MCP 2026

Planejar a migração:

```text
@modelcontextprotocol/sdk
          ↓
SDK v2
          ↓
serveStdio()
          ↓
MCP 2026-07-28
          ↓
subscriptions/listen
```

A documentação oficial do SDK fornece uma matriz explícita de compatibilidade entre a era 2025 e a era 2026-07-28.

---

# 38. Resultado final esperado

Depois da implementação, o fluxo de coordenação do AgentMap deverá funcionar assim:

```text
AGT-BACKEND
     │
     │ cria solicitação
     ▼
AgentMap
     │
     │ resourceChanged
     ▼
agentmap://solicitacoes/AGT-FRONTEND
     │
     ▼
MCP
     │
     ├── legacy → resources/subscribe
     │
     └── modern → subscriptions/listen
     │
     ▼
AGT-FRONTEND
     │
     │ notification
     ▼
resources/read
     │
     ▼
nova solicitação disponível
```

O objetivo final não é simplesmente "mandar uma mensagem para outro agente".

O objetivo arquitetural é:

> **transformar o estado compartilhado do AgentMap em Resources MCP observáveis, com notificações de mudança desacopladas da lógica de negócio e compatíveis com as eras 2025 e 2026-07-28 do protocolo.**

Isso cria uma base muito mais sólida para os próximos documentos da arquitetura, especialmente observabilidade, coordenação entre agentes e automação do fluxo de trabalho.

---

# 39. Referências oficiais utilizadas

### Model Context Protocol

- Especificação oficial de Resources e subscriptions da era 2025: `resources/subscribe`, `resources/unsubscribe` e `notifications/resources/updated`.

- Especificação oficial da revisão MCP 2026-07-28 e mudança para `subscriptions/listen`.

### MCP TypeScript SDK

- Documentação oficial do SDK v1 — Resources e Resource Subscriptions.

- Documentação oficial do SDK v2 — suporte à revisão 2026-07-28.

- Guia oficial de migração v1 → v2.

- Documentação oficial sobre versões/eras do protocolo.

### MCP Inspector

- Implementação/documentação oficial do Inspector para subscriptions legacy e modern.

### Kilo Code

- Documentação oficial sobre MCP no Kilo Code.

- Documentação oficial de acesso a MCP Resources pelo Kilo Code.

---

# 40. Conclusão técnica

O documento original tinha a **direção conceitual correta**, mas precisava de uma atualização importante antes de ser usado como especificação de implementação.

As principais correções são:

```text
ANTES
resources/subscribe
        +
SubscriptionManager global
        +
server.notification()
        +
sessionId manual
```

versus:

```text
ATUAL
MCP Resource real
        +
URI canônica
        +
Domain/Event Bus
        +
sendResourceUpdated() na era legacy
        +
subscriptions/listen na era 2026
        +
estado de subscription por conexão
        +
arquitetura preparada para múltiplos processos
```

A maior decisão de engenharia é **não acoplar o AgentMap à mecânica específica de uma versão do MCP**. O domínio deve apenas publicar:

```text
ResourceChanged(uri)
```

e a camada MCP deve decidir como entregar essa mudança de acordo com a era/protocolo negociado.

Isso permite que o AgentMap continue evoluindo sem precisar reescrever os serviços de negócio quando o transporte ou o mecanismo de subscription mudar novamente.