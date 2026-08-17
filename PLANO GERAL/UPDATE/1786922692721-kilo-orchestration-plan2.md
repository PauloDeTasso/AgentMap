# Plano: Integração AgentMap + Kilo Code como Camada de Orquestração

## 1. Objetivo

Transformar o AgentMap no **Control Plane** do Kilo Code, usando o que já existe no AgentMap e adicionando a camada de integração que falta com o runtime do Kilo.

**NÃO vamos:**
- Recriar LLM, executor ou runtime
- Fazer um sistema de worktree paralelo
- Depender de APIs internas não documentadas do Kilo
- Fazer o AgentMap "controlar VS Codes"
- Tratar MCP como barramento bidirecional de mensagens

**Vamos:**
- Reutilizar a orquestração, tarefas, dependências, eventos e MCP que o AgentMap já tem
- Adicionar descoberta e reconciliação com `.kilo/`
- Usar MCP como **interface de integração** Kilo → AgentMap
- Usar `agent_manager` apenas onde for confirmado (VS Code)

---

## 2. Verdades confirmadas (fontes oficiais)

| O que | Fonte | Status |
|---|---|---|
| `agent_manager` tool existe | docs/agent-manager | Confirmado, VS Code only |
| Worktrees em `.kilo/worktrees/` | docs/agent-manager | Confirmado |
| Estado em `.kilo/agent-manager.json` | docs/agent-manager | Confirmado |
| MCP com STDIO/SSE | docs/mcp/overview | Confirmado |
| `AGENTS.md` por diretório | docs/custom-instructions | Confirmado |
| Permissões granulares por tool | docs/auto-approving-actions | Confirmado |
| `@kilocode/sdk` / `kilo serve` HTTP API | NÃO confirmado em docs públicas | **Risco** |
| Porta/senha dinâmicas do `kilo serve` | NÃO confirmado | **Risco** |
| Issue `child → parent` quebrado | GitHub #12557 | Confirmado |
| JetBrains `agent_manager` | docs | NÃO confirmado | **Risco** |

---

## 3. O que o AgentMap já tem (não reinventar)

- Orquestração: `OrquestradorService`, handoffs, dependências, DAG
- Sessões: `SessaoService` com estados e transições
- Eventos: `EventoService` com tipos como `TAREFA_CONCLUIDA`, `HANDOFF_CRIADO`
- MCP Server: tools registradas, transporte STDIO
- Auditoria, tracing, métricas, WebSocket
- `KiloAgentGeneratorService`: gera `.kilo/agent/{id}.md` com permissões e system prompt
- `InstanciaService` + tipos `KiloDaemonState`, `DispatchEventoKilo`, `DispatchLog`
- Worktree placeholder tool: `agentmap_abrir_worktree`

---

## 4. O que está faltando (a lacuna real)

1. **Descoberta do Kilo** — ler `.kilo/worktrees/`, `.kilo/agent-manager.json`, `.kilo/agent/*.md`
2. **Reconciliação** — comparar estado do Kilo com registros do AgentMap e corrigir divergências
3. **Canal de retorno** — agentes Kilo chamarem tools do AgentMap para reportar progresso/resultado
4. **Empacotamento de contexto** — gerar `task-context.md` por tarefa/worktree
5. **Criação real de worktree** — transformar `agentmap_abrir_worktree` de placeholder em fluxo real

---

## 5. Arquitetura escolhida

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENTMAP (Control Plane)                  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ KiloDiscovery │  │ KiloReconcil │  │  ContextPackager │  │
│  │   Service     │  │   Service    │  │     Service      │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│         ▼                 ▼                    ▼            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              AgentMap MCP Server (STDIO)              │   │
│  │  agentmap_* tools + kilohub_* tools (novas)          │   │
│  └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │ MCP: interface de integração
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  VS Code │   │  Kilo    │   │  Outros  │
    │  + Agent │   │  CLI     │   │  clientes│
    │  Manager │   │  serve   │   │          │
    └──────────┘   └──────────┘   └──────────┘
```

**Canal de ida:** o modelo Kilo, dentro de uma sessão, decide chamar `agent_manager` (tool nativa do Kilo, confirmada no VS Code). O AgentMap registra e descobre o resultado via reconciliação.

**Canal de comunicação AgentMap ↔ Agente Kilo:**
- **Pai → Filho:** prompt direto no Agent Manager (VS Code)
- **Filho → AgentMap:** HTTP direto em `POST /api/monitoramento/mensagens` (tipos `KILO_CHAT`, `KILO_REPLY`, `KILO_RESULT`, `KILO_CHAT_REPLY`)
- **Filho ← AgentMap:** HTTP `GET /api/monitoramento/kilo/receive-chat` ou tool MCP `kilohub_receive_chat_message`

> **Importante:** agentes filhos **não possuem tools MCP de escrita**. O envio de mensagens deve ser feito exclusivamente por HTTP.

**Canal de volta:** o agente Kilo chama tools `kilohub_*` no MCP Server do AgentMap para reportar status, progresso, resultado. MCP é **cliente → servidor**, não um barramento bidirecional.

---

## 6. Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Banco de dados | Manter JSON em `.ia/` | PostgreSQL ainda não implementado; JSON funciona para MVP |
| Processo separado "Kilo Hub" | Não | AgentMap já é o hub; duplicar seria over-engineering |
| Integração com HTTP API do Kilo | Não, por enquanto | Endpoints não confirmados em docs públicas; risco de quebra |
| `agent_manager` | Usar apenas onde confirmado (VS Code) | Docs confirmam VS Code only; JetBrains não documentado |
| Canal de retorno | MCP (AgentMap como servidor MCP) | Oficial, sem dependência de internals |
| Descoberta | Leitura de `.kilo/` + `.ia/` | Arquivos são a fonte de verdade para o AgentMap |
| Fonte da verdade | 3 domínios separados | AgentMap = orquestração; Kilo = sessões/worktrees; Git = código/branches |
| Worktree ownership | Kilo/Git é dono operacional | AgentMap solicita/descobre/registra, não cria concorrentemente |
| Contexto | `AGENTS.md` + `task-context.md` separados | `AGENTS.md` = como trabalhar; `task-context.md` = o que fazer agora |
| MVP scope | Somente Kilo VS Code | CLI/JetBrains/outros são extensões futuras quando houver docs/suporte real |

---

## 7. Regra de ouro

> **AgentMap nunca assume o controle de um recurso que o Kilo já possui como autoridade operacional. Ele solicita, observa, registra, reconcilia e orquestra.**

| Recurso | Dono |
|---|---|
| Agente lógico | **AgentMap** |
| Tarefa | **AgentMap** |
| Dependência | **AgentMap** |
| Orquestração | **AgentMap** |
| Evento de projeto | **AgentMap** |
| Sessão Kilo | **Kilo** |
| Worktree | **Kilo/Git** |
| Branch | **Git/Kilo** |
| Execução LLM | **Kilo** |
| Ferramentas do agente | **Kilo** |
| Contexto/instruções | **AgentMap + AGENTS.md** |
| Estado do Agent Manager | **Kilo** |

---

## 8. Fases de implementação

### Fase 1 — Descoberta e Reconciliação (sem mutar estado do Kilo)

**Objetivo:** AgentMap enxergar o que o Kilo já tem, sem ainda controlar nada.

Tarefas:
1. Criar `KiloDiscoveryService`
   - Ler `.kilo/agent-manager.json`
   - Listar `.kilo/worktrees/*/`
   - Ler `.kilo/agent/*.md`
   - Retornar `KiloState` com worktrees, sessions e agents descobertos
2. Criar `KiloReconciliationService`
   - Comparar `KiloState` com registros do AgentMap
   - Marcar sessions Kilo desconhecidas como `UNKNOWN_SESSION`
   - Marcar sessions AgentMap sem Kilo como `OFFLINE`
   - Registrar evento `KILO_RECONCILIADO`
3. Integrar descoberta em `ProjetoService.abrir()`
   - Ao abrir projeto, rodar descoberta + reconciliação
   - Expor dados no contexto do projeto (`obter_contexto_projeto`)

**Critérios de aceite:**
- Abrir um projeto com `.kilo/` existente mostra worktrees/sessions descobertos
- Divergências são registradas como eventos, não alteram `.ia/` ainda
- Não cria nem modifica nada no Kilo

---

### Fase 2 — Tool MCP de retorno (`kilohub_*`)

**Objetivo:** Permitir que agentes Kilo reportem status e resultados de volta ao AgentMap.

Tarefas:
1. Definir envelope de mensagem:
   ```ts
   interface KiloReportMessage {
     messageId: string;
     correlationId: string;
     projectId: string;
     agentId: string;
     sessionId: string;
     parentSessionId?: string;
     taskId?: string;
     type: 'STATUS' | 'PROGRESS' | 'RESULT' | 'BLOCKED' | 'FAILED';
     timestamp: string;
     payload: Record<string, unknown>;
   }
   ```
2. Adicionar tools MCP no AgentMap:
   - `kilohub_report_status(message)`
   - `kilohub_report_progress(message)`
   - `kilohub_report_result(message)`
3. Validar origem:
   - `sessionId` deve existir no `KiloState` descoberto
   - `messageId` não pode ter sido processado antes (idempotência)
   - Se não existir, registrar como `UNKNOWN_SESSION` e recusar
4. Ao receber report:
   - Atualizar tarefa no AgentMap
   - Gerar eventos correspondentes
   - Disparar handoff automático se tarefa concluída

**Critérios de aceite:**
- Um agente Kilo consegue chamar `kilohub_report_status` e o AgentMap registra
- Session desconhecida é rejeitada com erro claro
- Duplicidade por `messageId` é ignorada
- Eventos são gerados no AgentMap

---

### Fase 3 — Context Packaging por Tarefa/Worktree

**Objetivo:** Fornecer contexto rico e estruturado para o agente Kilo executar a tarefa.

Tarefas:
1. Aprimorar `KiloAgentGeneratorService` para gerar também:
   - `.kilo/agent/task-{taskId}-context.md` com contrato, dependências, critérios
   - Não duplicar `AGENTS.md`; `AGENTS.md` permanece com regras permanentes
2. Criar `TaskContextBuilder`
   - Montar pacote: objetivo, contrato, arquivos relevantes, dependências, decisões, restrições, critérios de aceite
   - Usar `obter_contexto_tarefa` como base
3. Integrar com `agentmap_abrir_worktree`
   - Ao criar worktree para uma tarefa, copiar/gerar contexto no diretório do worktree

**Critérios de aceite:**
- Worktree criado para uma tarefa contém `task-context.md` com contexto da tarefa
- `AGENTS.md` não é poluído; contexto específico fica em `task-context.md`
- Agente Kilo recebe automaticamente o contexto ao acessar o diretório

---

### Fase 4 — Worktree real via `agent_manager` (VS Code)

**Objetivo:** Transformar `agentmap_abrir_worktree` de placeholder em fluxo real.

**Restrição:** Kilo é dono operacional dos worktrees. AgentMap não cria worktree concorrentemente.

Tarefas:
1. Criar fluxo de solicitação:
   - AgentMap registra intenção de criação em `.ia/tarefas/` ou eventos
   - Retorna instrução estruturada para o modelo Kilo: "chame `agent_manager` com estes parâmetros"
2. O modelo Kilo, dentro do VS Code, executa `agent_manager`:
   - `mode: "worktree"`
   - `prompt` da tarefa
   - `branchName: task/{tarefaId}`
3. AgentMap descobre o worktree criado via `KiloDiscoveryService` na próxima reconciliação
4. Mapear `sessionId` retornado pelo Agent Manager para o registro do AgentMap
5. Fora do VS Code, retornar instruções manuais claras (sem prometer automação impossível)

**Critérios de aceite:**
- Dentro do VS Code, `agentmap_abrir_worktree` retorna instrução válida para `agent_manager`
- Fora do VS Code, retorna instruções manuais claras
- Após criação, reconciliação detecta o novo worktree/session
- Session ID do Kilo é registrado no AgentMap

---

### Fase 5 — Dashboard e Observabilidade

**Objetivo:** Visualizar o estado real do Kilo + AgentMap em tempo real.

Tarefas:
1. Estender `MonitoramentoService` para incluir `KiloState`
2. Adicionar seção no frontend:
   - Worktrees Kilo (path, branch, status)
   - Sessions Kilo mapeadas para agentes
   - Eventos de reconciliação
3. Adicionar WebSocket events:
   - `KILO_DESCOBERTO`
   - `KILO_RECONCILIADO`
   - `KILO_SESSION_DESCONHECIDA`
   - `TASK_STARTED`
   - `TASK_PROGRESS`
   - `TASK_BLOCKED`
   - `TASK_COMPLETED`
   - `TASK_FAILED`
   - `APPROVAL_REQUIRED`

**Critérios de aceite:**
- Dashboard mostra worktrees Kilo ao lado de tarefas AgentMap
- Reconciliação é visível em tempo real via WebSocket
- Eventos de tarefa são broadcast para monitoramento

---

### Fase 6 — Autonomia e Gates (futuro)

**Objetivo:** Permitir execução autônoma com gates de aprovação.

Tarefas:
1. Estender `ModoAutonomia` para afetar dispatch de tarefas
2. Implementar gates para ações críticas (deploy, push force, merge)
3. Integrar com sistema de permissões existente do AgentMap

**Nota:** Fase out of scope para MVP. Requer validação com usuário.

---

## 9. MVP (mínimo executável)

Ordem de implementação das fases: **1 → 2 → 3 → 4 → 5**

**MVP = Fases 1 + 2 + 3**

**MVP 1.5 (loop completo):** após MVP, executar teste de loop:
```
Kilo Gerente → AgentMap → Kilo Filho → kilohub_report_result → AgentMap → Kilo Gerente
```

Resultado esperado MVP:
- AgentMap abre um projeto e enxerga o `.kilo/`
- Agente Kilo reporta status de volta ao AgentMap via MCP
- Tarefa tem contexto empacotado no worktree

Resultado esperado MVP 1.5:
- Loop completo gerente → filho → AgentMap → gerente funcionando de forma auditável

Se o MVP 1.5 funcionar, Fase 4 (criação real) e Fase 5 (dashboard) completam a integração.

---

## 10. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| `agent_manager` indisponível (fora do VS Code) | Fallback para instruções manuais; não prometer automação impossível |
| Kilo mudar paths/formatos de `.kilo/` | Versionar schema de descoberta; usar leitura tolerante a faltas |
| Performance ao ler `.kilo/` em projetos grandes | Cache com TTL; ler apenas em `abrir()` e `reconciliar()` |
| Permissões MCP bloqueando `kilohub_*` | Documentar configuração necessária no `mcp_settings.json` |
| Race condition entre Kilo e AgentMap | Eventos de reconciliação são informativos, não destrutivos |
| `child → parent` nativo quebrado | Não depender dele; usar `kilohub_*` como canal de retorno |
| MCP não é push | Agente Kilo sempre inicia a chamada; AgentMap nunca empurra para sessão |
| Escrita concorrente em `.kilo/agent-manager.json` | AgentMap apenas lê; write fica a cargo do Kilo |

---

## 11. Validação

1. **Teste de descoberta:** abrir projeto com `.kilo/` existente e verificar sessions/worktrees listados
2. **Teste de reconciliação:** modificar `.kilo/agent-manager.json` externamente e verificar eventos
3. **Teste de retorno MCP:** chamar `kilohub_report_status` de um agente Kilo e verificar registro no AgentMap
4. **Teste de idempotência:** reenviar mesma `messageId` e verificar que é ignorada
5. **Teste de contexto:** criar tarefa, abrir worktree, verificar `task-context.md` presente
6. **Teste de worktree real (VS Code):** chamar `agentmap_abrir_worktree` e verificar instrução válida para `agent_manager`
7. **Teste de loop completo (MVP 1.5):** gerente Kilo cria tarefa, filho executa, reporta via `kilohub_report_result`, gerente recebe resultado

---

## 12. Critérios de prontidão para implementação

O plano está implementation-ready quando:
- [ ] Nenhuma fase depende de API HTTP interna do Kilo (`kilo serve`)
- [ ] Nenhuma fase depende de `child → parent` nativo do `agent_manager`
- [ ] Fonte da verdade está definida por domínio (AgentMap / Kilo / Git)
- [ ] Worktree ownership está claro: Kilo cria, AgentMap descobre/registra
- [ ] Envelope de mensagem inclui `messageId`, `correlationId`, `parentSessionId`
- [ ] MVP cobre loop completo gerente → filho → AgentMap → gerente
- [ ] Restrições de escopo estão explícitas (VS Code first, JetBrains depois)
