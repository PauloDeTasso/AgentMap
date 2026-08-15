# PROMPT DE EXECUÇÃO — Correção do AgentMap
## Incoerências identificadas e plano completo de correção

---

# 0. PAPEL DO AGENTE

Você é o agente responsável por corrigir o projeto **AgentMap**, que já possui implementação significativa (~121 tools MCP, backend Node.js/TypeScript, frontend, testes Jest).

Este documento foi gerado a partir de **leitura direta do código-fonte real do projeto**, não de suposições. Cada item abaixo cita o arquivo e a evidência encontrada. Sua obrigação:

1. Abrir e confirmar cada arquivo citado antes de alterar qualquer coisa.
2. Não reescrever módulos inteiros — corrigir o que está descrito, preservando tudo que funciona.
3. Rodar os testes existentes (`backend/testes/*`) antes e depois de cada correção.
4. Ao final de cada bloco, atualizar `.ia/contexto/analise-realidade-orquestracao.md` para refletir o novo estado real (esse documento está desatualizado — ver item 1).

---

# 1. INCOERÊNCIAS E ERROS IDENTIFICADOS

## 1.1 — Premissa central errada sobre o Kilo Code (CRÍTICO)

**Onde:** `.ia/contexto/analise-realidade-orquestracao.md` (13/08/2026).

**O erro:** o documento conclui que "orquestração multiagente real NÃO EXISTE" porque a extensão VS Code do Kilo "não expõe API pública automatizável", e trata a ausência do CLI standalone (`kilo`) como se fosse a ausência de qualquer mecanismo de orquestração.

**Fato real:** o Kilo Code possui um recurso nativo chamado **Agent Manager**, embutido na própria extensão VS Code — não depende de CLI standalone. Ele roda múltiplos agentes em paralelo, cada um isolado em seu próprio **git worktree** (`{projectRoot}/.kilo/worktrees/`), com terminal dedicado e painel kanban (To Do/Doing/Done), sem necessidade de copiar/colar entre janelas.

**Evidência de que o projeto já sabe disso, mas de forma isolada:** `backend/src/arquivos/ScaffoldService.ts` (linha ~532–612) e `PLANO GERAL/PROPOSTA-FLUXO-NOVOS-PROJETOS.md` já geram documentação e regras baseadas em worktrees do Agent Manager — inclusive citando um teste real (`PROJETO_WORKTREE_TEST`, visível nos logs `.playwright-mcp/console-2026-08-14T18-20-00-686Z.log`) onde tarefas sem dependência causaram agentes iniciando em paralelo sem pré-requisito.

**Impacto:** toda a arquitetura de dispatch construída em cima da premissa "não existe orquestração nativa" (itens 1.2 e 1.3 abaixo) foi construída para resolver um problema que o Kilo Code já resolve nativamente — e ao mesmo tempo ignora o problema real, que é apenas de **sequenciamento de dependências entre worktrees**.

---

## 1.2 — Código de dispatch depende de um CLI `kilo` que não existe no ambiente (CRÍTICO, quebra em runtime)

**Onde:**
- `backend/src/servicios/DaemonManager.ts` — método `start()` (linha ~74) executa `spawnSync(KILO_CMD, ['daemon', 'start', '--port', ..., '--json'], ...)`.
- `backend/src/servicios/ExecutorKiloDaemon.ts` — usa `KILO_CMD` (`process.env.KILO_CMD || 'kilo'`) via `spawnSync`.
- `backend/src/servicios/KiloDispatcherService.ts` — método `montarComando()` (linha ~188) monta `kilo run --agent <id> --dir <workspace>` via `execSync`.

**O erro:** os três arquivos assumem a existência de um executável `kilo` na linha de comando (`kilo daemon start`, `kilo run --agent`). O próprio `analise-realidade-orquestracao.md` confirma: *"CLI `kilo` no PATH: NÃO ENCONTRADO"* e *"Instalação standalone: NÃO EXISTE"*. Ou seja, esse código nunca vai funcionar no ambiente atual — qualquer chamada a `DaemonManager.start()`, `ExecutorKiloDaemon.dispatch()` ou `KiloDispatcherService.executarPendente()` vai falhar em runtime.

**Agravante:** `KiloDispatcherService.montarComando()` (linha ~187) tem um caminho **absoluto hardcoded com nome de usuário fixo**:
```ts
const kiloCmd = process.platform === 'win32'
  ? 'C:\\Users\\Administrator\\AppData\\Roaming\\npm\\kilo.cmd'
  : 'kilo';
```
Isso quebra em qualquer máquina que não seja exatamente essa, mesmo se o CLI existisse.

**Impacto:** `OrquestradorService` (que depende de `DaemonManager` + `ExecutorKiloDaemon`, ver 1.3) e `KiloDispatcherService` são código morto funcional — compilam, têm testes (possivelmente mockados), mas não operam de verdade.

---

## 1.3 — Três mecanismos de "iniciar trabalho do agente" concorrentes e não unificados

**Onde:**
- `backend/src/servicios/OrquestradorService.ts` (usa `DaemonManager` + `ExecutorKiloDaemon` — CLI daemon, ver 1.2).
- `backend/src/servicios/KiloDispatcherService.ts` (usa outbox `.ia/outbox/<agente>/prompt.md` + `execSync kilo run` — CLI direto, ver 1.2).
- `backend/src/arquivos/ScaffoldService.ts` + `.ia/outbox/*` (fluxo manual baseado em worktrees do Agent Manager + handoffs, sem chamada de CLI).

**O erro:** existem hoje três caminhos diferentes e não integrados para "fazer um agente trabalhar": um via daemon CLI, um via `execSync` direto, e um via geração de instruções para execução manual/worktree. Nenhum documento do projeto declara qual é a fonte de verdade, e a API REST (`backend/src/api/orquestrador.ts`) expõe rotas (`/dispatch`, `/handoffs/auto`, `/recuperar`) que só falam com o mecanismo quebrado (1.2), deixando o mecanismo que de fato funciona (worktrees + outbox manual) fora da API.

**Impacto:** confusão de manutenção, testes cobrindo caminhos que nunca serão usados em produção, e ausência de uma API que reflita o fluxo real (worktree-based).

---

## 1.4 — Documento de auto-análise contradiz o próprio código-fonte do projeto

**Onde:** `.ia/contexto/analise-realidade-orquestracao.md`, seção "Gaps Reais", afirma:

> `Identidade de instâncias (instanciaId, workspaceId, sessaoId) | NÃO EXISTE`

**O erro:** `backend/src/servicios/InstanciaService.ts` (196 linhas) já implementa exatamente isso: um registry de instâncias (`.ia/instancias/instancias.json`) com `id`, `agenteId`, `projetoId`, `workspacePath`, `status`, e métodos de filtro por todos esses campos. O documento de análise foi escrito sem inspecionar esse serviço.

**Impacto:** qualquer decisão tomada com base nesse documento (inclusive o plano de 1350+ linhas de "evolução do AgentMap" mencionado anteriormente) partiu de um mapeamento incompleto do que já existe, violando a própria regra anti-reimplementação que os documentos do projeto definem (`PLANO GERAL/ATUALIZAÇÃO PARA O AGENTMAP.md`, seção 4).

---

## 1.5 — Configuração MCP frágil e não portátil

**Onde:** `kilo.jsonc`
```jsonc
"command": ["cmd", "/c", "cd", "backend", "&&", "npx", "tsx", "src/mcp-server/index.ts"],
"environment": { "WORKSPACE": "G:/PROJETOS/WEB/AgentMap" }
```

**O erro:** o comando é Windows-only (`cmd /c`) e o `WORKSPACE` está hardcoded para um caminho absoluto específico de uma máquina (`G:/PROJETOS/WEB/AgentMap`). Isso é aceitável enquanto o projeto for de uso pessoal em uma única máquina, mas é uma fragilidade que quebra silenciosamente se o projeto for movido de pasta ou clonado em outro caminho — sem nenhuma validação ou mensagem de erro clara nesse cenário.

**Impacto:** baixo a médio — não é um bug ativo, mas é um ponto único de falha silenciosa não documentado.

---

## 1.6 — Auditoria interna de tools mede a coisa errada

**Onde:** `.ia/contexto/tools-quebradas-agentmap.json`
```json
{ "auditoria": { "total": 121, "quebradas": [], "faltantes": [], "incoerentes": [] } }
```

**O erro:** essa auditoria confirma que as 121 tools MCP estão **registradas e coerentes com o backend** (ou seja, a assinatura/schema bate com a implementação). Isso não significa que as tools **funcionam de ponta a ponta em runtime** — em particular, qualquer tool que dependa de `OrquestradorService`, `DaemonManager`, `ExecutorKiloDaemon` ou `KiloDispatcherService` vai falhar na execução real pelo motivo do item 1.2, mesmo estando "coerente" no cadastro.

**Impacto:** falsa sensação de sistema saudável — o relatório diz "0 quebradas" mas não testa a execução real do fluxo de dispatch.

---

# 2. PLANO DE CORREÇÃO

Execute nesta ordem. Cada fase depende da anterior.

## FASE 1 — Corrigir a base de conhecimento do projeto

1. Reescrever `.ia/contexto/analise-realidade-orquestracao.md` para refletir:
   - Agent Manager nativo do Kilo Code existe e é o mecanismo real de paralelismo (worktrees).
   - `InstanciaService.ts` já implementa identidade de instância — remover da lista de gaps.
   - O gap real não é "criar orquestração do zero", é "sequenciar dependências entre worktrees e integrar o AgentMap como fonte de verdade consultada por cada worktree".
2. Não apagar o documento antigo — versionar (ex.: mover para `.ia/contexto/historico/analise-realidade-orquestracao-2026-08-13.md`) antes de reescrever, para preservar histórico de decisão.

## FASE 2 — Remover/isolar código morto baseado no CLI inexistente

3. Em `DaemonManager.ts`, `ExecutorKiloDaemon.ts` e `KiloDispatcherService.ts`: **não apagar** — mas marcar claramente como não utilizados no fluxo atual (ex.: comentário de cabeçalho `@deprecated - depende de CLI kilo standalone, não disponível neste ambiente. Ver item 1.2/1.3 do plano de correção.`).
4. Decidir com base em teste real: se o Kilo Code expuser futuramente um CLI/API automatizável equivalente, esse código pode voltar a ser útil — por isso não deletar sem confirmação explícita do usuário.
5. Remover o caminho absoluto hardcoded `C:\Users\Administrator\...` de `KiloDispatcherService.montarComando()` e substituir por variável de ambiente configurável (`KILO_CMD`), mesmo que o serviço fique marcado como deprecated — evita o erro se alguém reativar o código sem perceber o hardcode.
6. Atualizar `backend/src/api/orquestrador.ts`: marcar as rotas `/dispatch` e `/recuperar` como indisponíveis (retornar 501 com mensagem explicando o motivo, citando este documento) até a Fase 3 entregar o substituto real. Manter `/status`, `/handoffs/auto` e `/instancias/:id/modo` ativas se não dependerem do daemon.

## FASE 3 — Construir o fluxo real: AgentMap + Agent Manager (worktrees)

7. Formalizar como fonte única de verdade o fluxo que `ScaffoldService.ts` e `PROPOSTA-FLUXO-NOVOS-PROJETOS.md` já esboçam:
   - Planejador cria tarefas + dependências no AgentMap antes de qualquer worktree ser aberto.
   - Uma tool MCP nova (ex.: `tarefasProntasParaWorktree`) retorna apenas tarefas sem dependência pendente — para o usuário (ou futuramente o próprio Kilo) saber quais worktrees é seguro abrir agora.
   - Ao finalizar uma tarefa em um worktree, o agente registra resultado + handoff no AgentMap via MCP (mecanismo que já existe e funciona — `HandoffService`, `ResultadoService`).
8. Adicionar uma tool MCP de checagem de bloqueio (`verificarDependenciasPendentes(tarefaId)`) que qualquer agente deve chamar no início do ciclo, formalizando a regra que hoje só existe em texto (`fluxo-trabalho.md` gerado pelo `ScaffoldService`).
9. Atualizar `.ia/docs/runbook.md` com o fluxo real: como abrir um worktree pelo Agent Manager, como o agente consulta o AgentMap dentro do worktree (mesmo MCP `agentmap`, servido via stdio, funciona normalmente dentro de cada worktree), e como fechar/mergear ao final.

## FASE 4 — Consolidar e validar

10. Rodar toda a suíte `backend/testes/*` e corrigir/remover testes que validam exclusivamente o caminho morto do CLI (`ExecutorKiloDaemon.test.ts`, `DaemonManager.test.ts`, `orquestrador-integration.test.ts`) — marcar como `.skip` com comentário explicando o motivo, não apagar.
11. Rodar novamente a auditoria de tools (`.ia/contexto/tools-quebradas-agentmap.json`) e, adicionalmente, criar uma checagem manual de que nenhuma tool MCP ativa depende mais de `DaemonManager`/`ExecutorKiloDaemon`/`KiloDispatcherService` sem o aviso de `@deprecated`.
12. Testar de ponta a ponta em um projeto de teste real (reaproveitar `PROJETO_WORKTREE_TEST` se ainda existir) o fluxo: criar tarefas com dependência → confirmar que a tool de checagem bloqueia a tarefa dependente → abrir dois worktrees pelo Agent Manager → confirmar handoff automático registrado no AgentMap ao final.
13. Atualizar `README.md` e `AGENTS.md` (se existir) com o fluxo real documentado, removendo qualquer menção a `kilo daemon`/`kilo run --attach` como se fossem funcionais hoje.

---

# 3. CRITÉRIOS DE ACEITE

- `.ia/contexto/analise-realidade-orquestracao.md` não contradiz mais nenhum serviço existente no código (checar especificamente `InstanciaService.ts`).
- Nenhuma rota da API ativa retorna sucesso fingido para uma operação que na verdade falha por depender do CLI `kilo` inexistente.
- Existe pelo menos uma tool MCP testada que impede (ou avisa) um agente de iniciar trabalho em uma tarefa com dependência pendente.
- Testes rodam verdes, com os testes do caminho morto explicitamente marcados como `skip` e documentados, não deletados silenciosamente.
- Documentação (`README.md`, `runbook.md`, `fluxo-trabalho.md`) reflete o Agent Manager real do Kilo Code como mecanismo de paralelismo, e o AgentMap como memória/coordenação consultada por cada worktree — não como um orquestrador que inicia agentes sozinho.

---

# 4. REGRA FINAL

Não implemente nada além do que este documento pede sem antes relatar ao usuário o que encontrou. Se durante a execução você encontrar mais alguma incoerência não listada aqui, **pare, registre em `.ia/contexto/` e relate antes de corrigir**, seguindo a mesma regra anti-reimplementação já definida no projeto.
