# Plano de Correção Completo — AgentMap
## Data: 2026-08-15

---

# 0. Diagnóstico Consolidado (sem ambiguidades)

## 0.1 Erros Confirmados por Leitura Direta dos Arquivos

### Críticos (quebram runtime)
1. **`backend/src/servicios/DaemonManager.ts`** — inicia daemon `kilo` que não existe no PATH.
2. **`backend/src/servicios/ExecutorKiloDaemon.ts`** — usa `spawnSync('kilo run ...')` diretamente, ignorando o daemon que iniciou.
3. **`backend/src/servicios/KiloDispatcherService.ts:191-216`** — `montarComando()` tem caminho absoluto hardcoded `C:\Users\Administrator\AppData\Roaming\npm\kilo.cmd`.
4. **`backend/src/servicios/OrquestradorService.ts`** — depende de `DaemonManager` + `ExecutorKiloDaemon`, ambos dependem do CLI inexistente.
5. **`backend/src/api/orquestrador.ts`** — expõe rotas `/dispatch` e `/recuperar` que chamam o código morto acima.
6. **`backend/src/api/auth.ts`** — `GET /api/auth/key` retorna a API key em texto plano.
7. **`backend/src/.local/.api-key`** — segredo commitado/empacotado no projeto.

### Arquiteturais (incoerência conceitual)
8. **Dois dispatchers concorrentes**: `KiloDispatcherService` (antigo) e `OrquestradorService` (novo).
9. **Modo autonomia duplicado**: Orquestrador usa `MANUAL/ASSISTIDA/AUTONOMA`; Monitoramento usa `AUTOMATICO/HIBRIDO`; existe `autoApprove`.
10. **`step_finish` → `CONCLUIDA`**: tarefa é finalizada antes de validação de critérios.
11. **Falta `execucaoId`**: sem rastreamento de múltiplas execuções por tarefa.
12. **Recuperação de estado perigosa**: `EM_EXECUCAO` sem instância pode voltar para `PRONTA`.
13. **Heartbeat inexistente**: apenas `ultimaAtividade`, sem timeout/orphan detection.
14. **`InstanciaService.ts` já existe**, mas `.ia/contexto/analise-realidade-orquestracao.md` afirma que não.

### Segurança
15. **WebSocket aceita `?token=API_KEY`** — segredo na URL.
16. **`express.json` global 50MB** — desnecessariamente amplo.
17. **Rate limit em memória** — perde estado, não distribuído.
18. **Path security só com `startsWith(root)`** — não protege contra symlinks/junctions no Windows.
19. **`kilo.jsonc` tem `WORKSPACE` hardcoded** — `G:/PROJETOS/WEB/AgentMap`.
20. **`data_collection_enabled: true`** — sem documentação explícita.

### Documentação
21. **`.ia/contexto/analise-realidade-orquestracao.md`** — desatualizada, contradiz código fonte.
22. **ScaffoldService.ts:608-612** — já menciona Agent Manager/worktrees como fluxo real, mas não está refletido na arquitetura de dispatch.

---

# 1. Objetivo do Plano

Transformar o AgentMap em um sistema onde:

```
AgentMap (fonte da verdade)
    │
    ▼
Agent Manager (worktrees paralelos, isolados)
    │
    ▼
Agentes executam trabalho real via MCP stdio
    │
    ▼
Handoff + validação + auditoria no AgentMap
```

**Regra fixa: NÃO reescrever. Refatorar, consolidar e corrigir.**

---

# 2. Estrutura de Execução (paralelismo via Agent Manager)

Este plano será executado usando **Agent Manager** com **worktrees** isolados, permitindo que múltiplos agentes trabalhem em paralelo em tarefas independentes.

Cada tarefa abaixo será atribuída a um agente especializado via worktree próprio, com handoff formal no final.

---

# 3. Fases e Tarefas

## FASE 0 — Diagnóstico e Inventário (sequencial, pré-requisito)
**Agente:** revisor + backend (mesmo worktree, análise)

- [ ] 0.1 Confirmar presença de `backend/src/.local/.api-key` e remover.
- [ ] 0.2 Confirmar se `node_modules/` e `dist/` estão versionados (git ls-files).
- [ ] 0.3 Confirmar hardcoded `C:\Users\Administrator\...` em `KiloDispatcherService.ts:192-194`.
- [ ] 0.4 Confirmar `versaoKilo: '7.4.21'` em `OrquestradorService.ts:75`.
- [ ] 0.5 Confirmar `req.query.apiKey` em rotas de auth.
- [ ] 0.6 Confirmar `?token=API_KEY` no WebSocket.
- [ ] 0.7 Executar `npm ci` e `npm run build` em ambiente limpo.
- [ ] 0.8 Executar `npm test` e registrar falhas.
- [ ] 0.9 Gerar relatório `.ia/contexto/diagnostico-inicial-2026-08-15.md`.
- [ ] 0.10 Versionar documento antigo: `.ia/contexto/historico/analise-realidade-orquestracao-2026-08-13.md`.

**Critério:** Nenhuma alteração funcional nesta fase. Apenas leitura, remoção de segredos e documentação.

---

## FASE 1 — Segurança e Higiene (paralelizável em partes)
**Agentes:** seguranca (worktree A) + backend (worktree B)

### Tarefa 1.1 — Segurança Crítica (seguranca)
- [ ] 1.1.1 Remover `backend/src/.local/.api-key`.
- [ ] 1.1.2 Adicionar `**/.api-key`, `**/.local/`, `**/dispatch-log.json`, `**/daemon-mapping.json`, `**/estado.json`, `**/logs/` ao `.gitignore`.
- [ ] 1.1.3 Remover `backend/src/.local/` do repositório se já commitado.
- [ ] 1.1.4 Substituir `?token=API_KEY` no WebSocket por header `Authorization`.
- [ ] 1.1.5 Remover `req.query.apiKey` e `GET /api/auth/key`.
- [ ] 1.1.6 Limitar `express.json` por rota (ex.: 1MB padrão, 10MB para uploads).
- [ ] 1.1.7 Corrigir path security para considerar symlinks/junctions no Windows (`fs.realpath` + validação).
- [ ] 1.1.8 Documentar política de segredos em `SECURITY.md`.

### Tarefa 1.2 — Configuração Portável (backend)
- [ ] 1.2.1 Remover `WORKSPACE` hardcoded de `kilo.jsonc`.
- [ ] 1.2.2 Criar `kilo.local.jsonc` (ignorado) para variáveis locais.
- [ ] 1.2.3 Documentar `data_collection_enabled` explicitamente no README.
- [ ] 1.2.4 Remover `node_modules/` e `dist/` do controle de versão se estiverem commitados.
- [ ] 1.2.5 Garantir que `.gitignore` protege arquivos gerados.

---

## FASE 2 — Documentação Unificada (paralelizável)
**Agentes:** documentacao (worktree A) + revisor (worktree B)

### Tarefa 2.1 — Atualizar Análise de Realidade (documentacao)
- [ ] 2.1.1 Reescrever `.ia/contexto/analise-realidade-orquestracao.md`:
  - Confirmar que **Agent Manager nativo** é o mecanismo real de paralelismo (worktrees).
  - Confirmar que `InstanciaService.ts` já implementa identidade de instância.
  - Declarar que o gap real é **sequenciamento de dependências entre worktrees**, não criar orquestração do zero.
  - Listar serviços funcionais vs código morto.
- [ ] 2.1.2 Versionar documento antigo em `.ia/contexto/historico/`.

### Tarefa 2.2 — Atualizar Documentos de Fluxo (documentacao)
- [ ] 2.2.1 Atualizar `.ia/contexto/fluxo-trabalho.md` com o fluxo real:
  - Planejador cria tarefas + dependências.
  - `tarefasProntasParaWorktree` retorna tarefas sem dependência pendente.
  - Agentes abrem worktrees via Agent Manager.
  - Agentes consultam `verificarDependenciasPendentes` no início de cada ciclo.
  - Ao finalizar, registram handoff + resultado no AgentMap via MCP.
- [ ] 2.2.2 Atualizar `README.md` removendo menções a `kilo daemon`/`kilo run --attach` como funcionais.
- [ ] 2.2.3 Atualizar `AGENTS.md` com o papel do Agent Manager.
- [ ] 2.2.4 Criar `.ia/docs/runbook.md` com passo a passo: abrir worktree, consultar AgentMap, fechar/mergear.

### Tarefa 2.3 — Atualizar Análise de Erros (revisor)
- [ ] 2.3.1 Marcar itens resolvidos nos arquivos `erros/erros1.txt` e `erros/erros2.md`.
- [ ] 2.3.2 Gerar `.ia/contexto/correcoes-aplicadas-2026-08-15.md`.

---

## FASE 3 — Unificar Arquitetura de Execução (paralelizável com dependências)
**Agentes:** backend (worktree A) + arquiteto (worktree B)

### Tarefa 3.1 — Marcar Código Morto (backend)
- [ ] 3.1.1 Adicionar comentário `@deprecated` no cabeçalho de:
  - `DaemonManager.ts`
  - `ExecutorKiloDaemon.ts`
  - `KiloDispatcherService.ts`
  - Rotas `/dispatch` e `/recuperar` em `api/orquestrador.ts`
- [ ] 3.1.2 Remover caminho absoluto hardcoded de `KiloDispatcherService.montarComando()`.
- [ ] 3.1.3 Rotas `/status`, `/handoffs/auto` e `/instancias/:id/modo` permanecem ativas.

### Tarefa 3.2 — Unificar Modelo de Execução (arquiteto)
- [ ] 3.2.1 Criar `KiloRuntimeAdapter.ts` com interface:
  - `detectar()`, `verificarVersao()`, `modoDisponivel()`, `iniciar()`, `executar()`, `interromper()`, `status()`, `diagnostico()`.
- [ ] 3.2.2 Criar `ExecutionService.ts` como camada única de execução.
- [ ] 3.2.3 Atualizar `OrquestradorService.ts` para usar `ExecutionService` ao invés de `ExecutorKiloDaemon` diretamente.
- [ ] 3.2.4 Unificar modos de autonomia:
  - `MANUAL` — apenas análise/planejamento.
  - `ASSISTIDA` — ações de baixo risco, alto risco pede aprovação.
  - `AUTONOMA` — executa dentro de contratos/permissões.
  - Remover `AUTOMATICO`, `HIBRIDO`, `autoApprove` duplicados.

### Tarefa 3.3 — API do Orquestrador (backend)
- [ ] 3.3.1 Retornar `501 Not Implemented` para `/dispatch` e `/recuperar` com mensagem explicando o motivo.
- [ ] 3.3.2 Manter `/status`, `/handoffs/auto`, `/instancias/:id/modo` ativas.

---

## FASE 4 — Ciclo de Vida de Execução (paralelizável)
**Agentes:** backend (worktree A) + testes (worktree B)

### Tarefa 4.1 — Estados e Identidade (backend)
- [ ] 4.1.1 Expandir `EstadoTarefa` em `tipos/index.ts`:
  - `PREPARANDO`, `AGUARDANDO_APROVACAO`, `PAUSANDO`, `CANCELANDO`, `ORFA`, `RECUPERANDO`, `BLOQUEADA`, `TIMEOUT`.
- [ ] 4.1.2 Adicionar `execucaoId` ao modelo de execução.
- [ ] 4.1.3 Separar `estadoTarefa` de `estadoExecucao` em `TarefaService.ts` e `OrquestradorService.ts`.
- [ ] 4.1.4 Implementar transições corretas: `step_finish` ≠ `CONCLUIDA`.

### Tarefa 4.2 — Heartbeat e Recuperação (backend)
- [ ] 4.2.1 Implementar heartbeat: `heartbeatEmitido`, `heartbeatRecebido`, `ultimoHeartbeat`, `timeout`.
- [ ] 4.2.2 Implementar estados de agente: `ONLINE → SUSPEITA → OFFLINE`.
- [ ] 4.2.3 Implementar detecção de órfãos (`ORFA`) e recuperação (`RECUPERANDO`).
- [ ] 4.2.4 Implementar controle de intervenção real (não apenas registro):
  - `PAUSAR_TAREFA` → sinalizar pausa para executor.
  - `CANCELAR_AGENTE` → matar processo/sessão.
  - `REDIRECIONAR_TAREFA` → atualizar agente responsável.
  - `APROVAR` / `REJEITAR` → alterar estado real.

### Tarefa 4.3 — Validação de Critérios (backend)
- [ ] 4.3.1 Implementar pipeline: `Kilo terminou → resultado capturado → critérios de aceitação → validação → artefatos conferidos → contratos conferidos → tarefa CONCLUÍDA`.
- [ ] 4.3.2 Integrar com `CriterioService.ts`, `ValidacaoService.ts`, `ArtefatoService.ts`.

---

## FASE 5 — Tools MCP e Integração Real (paralelizável)
**Agentes:** backend (worktree A) + frontend (worktree B)

### Tarefa 5.1 — Novas Tools MCP (backend)
- [ ] 5.1.1 Criar tool `tarefasProntasParaWorktree()` — retorna apenas tarefas sem dependência pendente.
- [ ] 5.1.2 Criar tool `verificarDependenciasPendentes(tarefaId)` — bloqueia tarefa se houver dependência não concluída.
- [ ] 5.1.3 Criar tool `abrirWorktree(tarefaId)` — integra com Agent Manager para criar worktree automaticamente.
- [ ] 5.1.4 Atualizar tools existentes para usar `ExecutionService` ao invés de serviços deprecated.
- [ ] 5.1.5 Garantir que nenhuma tool ativa dependa de `DaemonManager`/`ExecutorKiloDaemon`/`KiloDispatcherService` sem aviso de `@deprecated`.

### Tarefa 5.2 — Frontend e Monitoramento (frontend)
- [ ] 5.2.1 Atualizar dashboard para refletir estados reais (`ORFA`, `RECUPERANDO`, `BLOQUEADA`).
- [ ] 5.2.2 Implementar interface de intervenção real (pausar, cancelar, redirecionar).
- [ ] 5.2.3 Atualizar página de orquestração para usar o novo fluxo worktree-based.
- [ ] 5.2.4 Remover referências a `kilo daemon` da interface.

---

## FASE 6 — Testes e Validação (paralelizável)
**Agentes:** testes (worktree A) + seguranca (worktree B)

### Tarefa 6.1 — Testes (testes)
- [ ] 6.1.1 Marcar como `.skip` testes que validam exclusivamente o caminho morto do CLI:
  - `DaemonManager.test.ts`
  - `ExecutorKiloDaemon.test.ts`
  - `orquestrador-integration.test.ts`
- [ ] 6.1.2 Corrigir testes que falham por node_modules empacotado/permissões.
- [ ] 6.1.3 Criar testes para o fluxo real:
  - Teste 1: 1 agente, 1 tarefa, execução completa.
  - Teste 2: 2 agentes, handoff A → B.
  - Teste 3: 3 agentes, A → B → C.
  - Teste 4: agente falha, recuperação.
  - Teste 5: agente trava, heartbeat expira.
  - Teste 6: usuário pausa, execução pausa.
  - Teste 7: usuário cancela, processo cancela.
  - Teste 8: AUTONOMA, fluxo completo.
  - Teste 9: ASSISTIDA, ação crítica aguarda aprovação.
  - Teste 10: MANUAL, nenhuma execução automática.
- [ ] 6.1.4 Rodar `npm run build` + `npm test` e garantir 100% verde.

### Tarefa 6.2 — Segurança Final (seguranca)
- [ ] 6.2.1 Rodar detector de segredos no repositório.
- [ ] 6.2.2 Validar que `.gitignore` protege todos os arquivos sensíveis.
- [ ] 6.2.3 Validar que `SECURITY.md` reflete a realidade.
- [ ] 6.2.4 Validar que CORS + CSRF estão formalizados e bind em `127.0.0.1`.

---

## FASE 7 — Documentação Final e Auditoria (sequencial)
**Agente:** revisor

- [ ] 7.1 Atualizar `README.md` com arquitetura final.
- [ ] 7.2 Atualizar `AGENTS.md` com fluxo Agent Manager.
- [ ] 7.3 Atualizar `.ia/docs/runbook.md`.
- [ ] 7.4 Gerar relatório final `.ia/contexto/auditoria-final-2026-08-15.md`.
- [ ] 7.5 Confirmar que nenhuma tool MCP ativa depende de código deprecated sem aviso.
- [ ] 7.6 Confirmar que testes estão verdes.
- [ ] 7.7 Confirmar que build está limpo.

---

# 4. Dependências entre Fases

```
FASE 0 → FASE 1 → FASE 2 → FASE 3 → FASE 4 → FASE 5 → FASE 6 → FASE 7
```

Dentro de cada fase, tarefas marcadas como paralelizáveis podem rodar em worktrees separados via Agent Manager.

---

# 5. Critérios de Aceitação

1. `.ia/contexto/analise-realidade-orquestracao.md` não contradiz nenhum serviço existente.
2. Nenhuma rota ativa retorna sucesso fingido para operação que falha por CLI inexistente.
3. Existe tool MCP `verificarDependenciasPendentes` testada.
4. Testes rodam verdes; testes do caminho morto marcados como `.skip` e documentados.
5. Documentação reflete Agent Manager como mecanismo de paralelismo real.
6. Nenhum segredo commitado; `.gitignore` protege arquivos sensíveis.
7. `kilo.jsonc` não tem caminhos hardcoded.
8. Estado de tarefa separado de estado de execução.
9. Heartbeat implementado com detecção de órfãos.
10. Intervenção via web afeta execução real.

---

# 6. Ferramentas Disponíveis

| Ferramenta | Uso neste plano |
|------------|-----------------|
| **Agent Manager** | Gerenciar worktrees e sessões paralelas para cada fase/tarefa. |
| **Git Worktree** | Isolar agentes por tarefa em diretórios `.kilo/worktrees/`. |
| **MCP Tools (121)** | Todas as tools do AgentMap para governança, tarefas, handoffs, etc. |
| **CLI Kilo** | Para diagnóstico de ambiente (verificar se CLI existe). |
| **npm scripts** | `npm run build`, `npm test`, `npm run lint`. |
| **Jest** | Suíte de testes existente. |
| **TypeScript** | Tipagem forte para refatorações seguras. |

---

# 7. Riscos

| Risco | Mitigação |
|-------|-----------|
| Worktree mal configurado | Usar Agent Manager UI para criar; validar com `git worktree list`. |
| Agente perde contexto | Cada worktree recebe prompt com contexto completo da tarefa. |
| Conflito entre worktrees | Cada tarefa modifica arquivos distintos; handoff formaliza transferência. |
| Código deprecated reativado sem aviso | Comentários `@deprecated` + documentação explícita. |
| Testes existentes quebrados | Rodar testes antes e depois de cada fase; marcar `.skip` com justificativa. |

---

# 8. Nota Final

Este plano **não reescreve o AgentMap**. Ele preserva a base existente (~121 tools MCP, backend, frontend, testes) e corrige as incoerências identificadas nos arquivos `erros/erros1.txt` e `erros/erros2.md`.

A execução deve ser feita fase por fase, com validação contínua. Tarefas paralelas devem ser atribuídas via Agent Manager com worktrees isolados.
