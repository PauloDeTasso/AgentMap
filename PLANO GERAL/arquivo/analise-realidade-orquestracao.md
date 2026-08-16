# Análise de Realidade — Orquestração Multiagente do AgentMap
## Data: 2026-08-15

## 1. Validação do Kilo Instalado

### 1.1 Resultado da Validação
- **CLI `kilo` no PATH:** NÃO ENCONTRADO
- **Extensão VS Code Kilo:** Instalada (`.kilocode` presente e `.kilo` no projeto)
- **Instalação standalone:** NÃO EXISTE
- **Conclusão:** O Kilo está disponível **apenas como extensão VS Code**, não como CLI de linha de comando independente.

### 1.2 Impacto Imediato
- Qualquer plano que dependa de `kilo daemon`, `kilo run --attach`, `kilo serve`, `kilo mcp add` via **CLI standalone** está comprometido.
- A extensão VS Code **não expõe API pública automatizável** para orquestração externa.
- O MCP do AgentMap funciona via **stdio** (processo filho), não via HTTP/SSE ainda.

---

## 2. Mecanismo Real de Paralelismo: Agent Manager Worktrees

O paralelismo real no AgentMap é obtido através do **Agent Manager nativo** com **git worktrees isolados**.

Cada agente opera em seu próprio worktree, permitindo execução paralela de tarefas independentes. A coordenação ocorre via:
- Handoffs formais entre agentes
- Dependências explícitas entre tarefas
- Validação de critérios de aceitação
- Auditoria no AgentMap

**Não existe daemon Kilo nem CLI `kilo run` automatizado.** O Agent Manager é a camada de execução.

---

## 3. Mapeamento do que REALMENTE Existe

### 3.1 Backend (Node.js + TypeScript + Express)
- **Estrutura:** `backend/src/` com serviços, API REST, MCP server
- **Rotas API:** `/health`, `/api/admin/*`, `/api/tarefas`, `/api/handoffs`, etc.
- **MCP Server:** Implementado em `backend/src/mcp-server/` usando `@modelcontextprotocol/sdk`
- **State Machine:** `StateMachineService.ts` + `.ia/configuracao/transicoes.json` — **FUNCIONAL**
- **Transições carregadas dinamicamente** do JSON (não hardcoded)
- **Instância Service:** `InstanciaService.ts` — **FUNCIONAL**, implementa identidade completa (`instanciaId`, `workspaceId`, `sessaoId`, `workspacePath`, `modoAutonomia`)
- **Testes:** Jest configurado
- **Build:** TypeScript 5.8.2, compila para `dist/`

### 3.2 Frontend (HTML5 + CSS3 + JS vanilla)
- Páginas: login, dashboard, home, projetos, experiência
- Interface web do AgentMap acessível via backend
- Sem framework SPA — HTML/CSS/JS puro

### 3.3 MCP / AgentMap
- **Protocolo:** stdio (não HTTP/SSE)
- **Tools disponíveis:** 33 tools MCP registradas e funcionais
- **Agentes cadastrados:** arquiteto, frontend, backend, agentmap-admin, dba
- **Sistema de governança:** tarefas, handoffs, resultados, contratos, procedimentos, contexto
- **Persistência:** Arquivos JSON em `.ia/`
- **Validação:** JSON Schema + Zod

### 3.4 Infraestrutura
- Runbook documentado em `.ia/docs/runbook.md`
- Health check em `/api/health`
- CORS dinâmico
- Auditoria automática de ações
- Backup automático
- Readiness em `/api/admin/readiness`

---

## 4. Serviços Funcionais vs Código Morto

### Funcionais
| Serviço | Status |
|---------|--------|
| `InstanciaService.ts` | ✅ Funcional — identidade de instância completa |
| `StateMachineService.ts` | ✅ Funcional — transições dinâmicas |
| `ScaffoldService.ts` | ✅ Funcional — gera estrutura de projetos |
| `MonitoramentoService.ts` | ✅ Funcional — monitora agentes |
| `TarefaService.ts` | ✅ Funcional — CRUD de tarefas |
| `HandoffService.ts` | ✅ Funcional — handoffs entre agentes |
| `EventoService.ts` | ✅ Funcional — eventos assíncronos |
| MCP Tools | ✅ Funcionais — 33 tools registradas |

### Código Morto / Depreciado
| Serviço/Arquivo | Status | Motivo |
|-----------------|--------|--------|
| `DaemonManager.ts` | ❌ Morto | Depende de `kilo daemon` (CLI inexistente) |
| `ExecutorKiloDaemon.ts` | ❌ Morto | Usa `spawnSync('kilo run ...')` (CLI inexistente) |
| `KiloDispatcherService.ts` | ⚠️ Depreciado | Caminho hardcoded + dependência de CLI morto |
| Rotas `/dispatch`, `/recuperar` em `api/orquestrador.ts` | ⚠️ Depreciadas | Chamam código morto |
| `GET /api/auth/key` | ❌ Removida | Exponha API key em texto plano |

---

## 5. Gaps Reais entre Plano e Realidade

### 5.1 O que JÁ EXISTE
- Identidade de instâncias via `InstanciaService.ts`
- State machine dinâmica via JSON
- MCP stdio funcional
- API REST completa
- Frontend funcional
- Sistema de governança por arquivos
- Agent Manager com worktrees (paralelismo real)

### 5.2 O que é FALTA (gaps reais)
| Gap Real | Descrição |
|----------|-----------|
| Sequenciamento de dependências | Falta tool MCP `verificarDependenciasPendentes` |
| Estados de execução expandidos | `EstadoTarefa` precisa de `PREPARANDO`, `PAUSANDO`, `CANCELANDO`, `ORFA`, `RECUPERANDO`, `BLOQUEADA`, `TIMEOUT` |
| Heartbeat | Falta detecção de órfãos e timeout |
| Validação de critérios | Falta pipeline: Kilo terminou → critérios → validação → CONCLUÍDA |
| Execução real via Agent Manager | Falta tool MCP `abrirWorktree` integrada ao Agent Manager |
| Intervenção via web | Falta controle real de pausar/cancelar/redirecionar |

### 5.3 O que NÃO EXISTE (e não deve ser criado)
- `kilo daemon` automatizado
- CLI `kilo` standalone
- Orquestração via HTTP/SSE
- API pública da extensão VS Code

---

## 6. Decisões Técnicas Corrigidas

1. **Executor:** O Agent Manager com worktrees é o mecanismo real de paralelismo.
2. **Comunicação entre agentes:** MCP stdio + arquivos JSON (handoffs, eventos, sessões).
3. **Orquestrador:** O AgentMap itself é o orquestrador via governança de arquivos.
4. **Autonomia:** Mapeada para políticas de permissão do AgentMap.
5. **Eventos:** Sistema de eventos assíncronos já previsto no AGENTS.md.
6. **Path Security:** Proteção contra symlinks/junctions via `fs.realpathSync`.

---

## 7. Próximos Passos Realistas

1. **Imediato:** Remover código morto (DaemonManager, ExecutorKiloDaemon) e rotas depreciadas.
2. **Curto prazo:** Expandir `EstadoTarefa`, implementar heartbeat e detecção de órfãos.
3. **Médio prazo:** Criar tools MCP `tarefasProntasParaWorktree`, `verificarDependenciasPendentes`, `abrirWorktree`.
4. **Longo prazo:** Integração real com Agent Manager para abertura automática de worktrees.

---

## 8. Arquivos de Referência

- `AGENTS.md` — regras do AgentMap
- `PLANO GERAL/GERENCIADOR_LOCAL_DE_AGENTES_DE_IA-ESPECIFICACAO_DE_IMPLEMENTACAO.md` — spec autoritativa
- `backend/src/servicios/InstanciaService.ts` — identidade de instância
- `backend/src/servicios/StateMachineService.ts` — state machine funcional
- `backend/src/seguranca/paths.ts` — path security com symlink protection
- `.ia/configuracao/transicoes.json` — transições dinâmicas
