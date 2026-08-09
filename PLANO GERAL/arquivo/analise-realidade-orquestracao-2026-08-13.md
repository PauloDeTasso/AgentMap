# Análise de Realidade — Orquestração Multiagente do AgentMap
## Data: 2026-08-13

> **NOTA:** Este documento é a versão histórica de 2026-08-13. Ele foi substituído pela análise atualizada em `analise-realidade-orquestracao.md` (2026-08-15), que corrige várias conclusões deste documento à luz da implementação real. Mantido para referência histórica.

## 1. Validação do Kilo Instalado

### 1.1 Resultado da Validação
- **CLI `kilo` no PATH:** NÃO ENCONTRADO
- **Extensão VS Code Kilo:** Instalada (`.kilocode` presente em `C:\Users\Administrator\.kilocode` e `.kilo` no projeto)
- **Instalação standalone:** NÃO EXISTE
- **Conclusão:** O Kilo está disponível **apenas como extensão VS Code**, não como CLI de linha de comando independente.

### 1.2 Impacto Imediato
- Qualquer plano que dependa de `kilo daemon`, `kilo run --attach`, `kilo serve`, `kilo mcp add` via **CLI standalone** está comprometido.
- A extensão VS Code **não expõe API pública automatizável** para orquestração externa.
- O MCP do AgentMap funciona via **stdio** (processo filho), não via HTTP/SSE ainda.

---

## 2. Mapeamento do que REALMENTE Existe

### 2.1 Backend (Node.js + TypeScript + Express)
- **Estrutura:** `backend/src/` com serviços, API REST, MCP server
- **Rotas API:** `/health`, `/api/auth/*`, `/api/admin/*`, `/api/tarefas`, `/api/handoffs`, etc.
- **MCP Server:** Implementado em `backend/src/mcp-server/` usando `@modelcontextprotocol/sdk`
- **State Machine:** `StateMachineService.ts` + `.ia/configuracao/transicoes.json` — **FUNCIONAL**
- **Transições carregadas dinamicamente** do JSON (não hardcoded)
- **Testes:** Jest configurado
- **Build:** TypeScript 5.8.2, compila para `dist/`

### 2.2 Frontend (HTML5 + CSS3 + JS vanilla)
- Páginas: login, dashboard, home, projetos, experiência
- Interface web do AgentMap acessível via backend
- Sem framework SPA — HTML/CSS/JS puro

### 2.3 MCP / AgentMap
- **Protocolo:** stdio (não HTTP/SSE)
- **Tools disponíveis:** 40+ tools funcionando via MCP
- **Agentes cadastrados:** arquiteto, frontend, backend, agentmap-admin, dba
- **Sistema de governança:** tarefas, handoffs, resultados, contratos, procedimentos, contexto
- **Persistência:** Arquivos JSON em `.ia/`
- **Validação:** JSON Schema + Zod

### 2.4 Infraestrutura
- Runbook documentado
- Procedimentos em `.ia/procedimentos/`
- Health check em `/api/health`
- Métricas em `/api/admin/metricas`
- CORS dinâmico
- Backup automático
- Readiness em `/api/admin/readiness`
- Broadcast em `/api/admin/broadcast`
- Estado unificado do projeto em `/api/admin/estado-projeto`

---

## 3. Gaps Reais entre Plano e Realidade

### 3.1 Orquestração Multiagente — NÃO EXISTE
| Recurso Planejado | Status Real |
|-------------------|-------------|
| Orquestração real com Kilo Code | NÃO EXISTE |
| `kilo daemon` rodando por workspace/agente | NÃO EXISTE (CLI não instalado) |
| `kilo run --attach` integrado ao AgentMap | NÃO EXISTE (CLI não instalado) |
| `kilo mcp add` configurado para HTTP/SSE | NÃO EXISTE (MCP atual é stdio) |
| Extensão VS Code como executor automatizado | NÃO EXISTE (apenas instância humana) |
| Identidade de instâncias (instanciaId, workspaceId, sessaoId) | NÃO EXISTE |
| Heartbeat real entre instâncias | NÃO EXISTE |
| Comunicação bidirecional em tempo real (WebSocket) | NÃO EXISTE |
| Fila de tarefas persistente | NÃO EXISTE |
| Despacho automático por instância/workspace | NÃO EXISTE |
| Autonomia MANUAL/ASSISTIDA/AUTONOMA real | NÃO EXISTE |
| Aprovação/intervenção via web | NÃO EXISTE |
| Recuperação de falhas (daemon caiu, sessão órfã) | NÃO EXISTE |
| Testes multiinstância | NÃO EXISTE |

### 3.2 O que É REAL (confirmado)
- `kilo` como **extensão VS Code** — existe, mas limitado a uso humano
- MCP via stdio — existe e funciona
- State machine dinâmica — existe e funciona
- API REST completa — existe e funciona
- Frontend funcional — existe e funciona
- Sistema de governança por arquivos — existe e funciona

### 3.3 O que é FANTASIA no plano original
- Modo `orchestrator` nativo do Kilo — **descontinuado/não existe**
- `kilo console` — **descontinuado**
- API pública da extensão VS Code para controle externo — **não documentada/não suportada**
- `agent_manager` como tool genérica de orquestração — **não existe**, é feature de worktrees da extensão

---

## 4. Plano de Ação Corrigido

### Fase 1: Aceitar a Realidade (ATUAL)
- **Kilo não tem CLI standalone** nesta máquina
- Orquestração via `kilo daemon` + `kilo run --attach` **não é viável** agora
- O MCP atual via stdio **já é funcional** para cooperação entre agentes

### Fase 2: Usar o que já Funciona
- **MCP stdio** como canal de comunicação entre agentes
- **Handoffs** para coordenação assíncrona (já implementado)
- **Solicitações** para aprovações (já implementado)
- **Sessões** para rastreamento de trabalho (já implementado)

### Fase 3: Evitar Dependências Externas Imaginárias
- NÃO aguardar `kilo daemon` para evoluir
- NÃO propor migração para HTTP/SSE sem necessidade real
- NÃO criar arquitetura de orquestração baseada em features que não existem

### Fase 4: Melhorar o que Existe
1. **Ampliar tools MCP** para cobrir cenários reais de cooperação
2. **Implementar eventos automáticos** como efeito colateral de handoffs/solicitações (já documentado no AGENTS.md)
3. **Adicionar heartbeat via arquivos** (polling de `.ia/sessoes/`)
4. **Criar fila simples baseada em arquivos** (`.ia/fila/` ou similar)
5. **Implementar modos de autonomia** como políticas no AgentMap (não via Kilo)

### Fase 5: Validar com o Mundo Real
- Testar cooperação entre múltiplos agentes usando MCP stdio
- Medir latência e confiabilidade dos handoffs
- Documentar limitações reais descobertas

---

## 5. Decisões Técnicas Corrigidas

1. **Executor:** NÃO existirá `kilo daemon` automatizado. A extensão VS Code será usada apenas como **instância humana GERENTE**.
2. **Comunicação entre agentes:** MCP stdio + arquivos JSON (handoffs, eventos, sessões).
3. **Orquestrador:** NÃO será um serviço separado. O AgentMap itself é o orquestrador via governança de arquivos.
4. **Autonomia:** Mapeada para políticas de permissão do AgentMap, não para flags do Kilo.
5. **Eventos:** Sistema de eventos assíncronos já previsto no AGENTS.md — implementar como efeito colateral de operações existentes.

---

## 6. Próximos Passos Realistas

1. **Imediato:** Aceitar que `kilo daemon` não está disponível e ajustar TAR-2026-00014
2. **Curto prazo:** Implementar eventos automáticos do AgentMap (handoffs → eventos)
3. **Médio prazo:** Ampliar tools MCP para automação real dentro das capacidades existentes
4. **Longo prazo:** Se Kilo CLI for instalado no futuro, reavaliar integração

---

## 7. Arquivos de Referência

- `AGENTMAP_ORQUESTRACAO_REAL.md` — documento original (parcialmente correto, mas baseado em features inexistentes)
- `mcp-implementation-prompt.md` — prompt real do Kilo encontrado em `.kilo/plans/`
- `backend/src/servicios/StateMachineService.ts` — state machine funcional
- `backend/src/api/admin.ts` — admin API funcional
- `.ia/configuracao/transicoes.json` — transições dinâmicas funcionando
