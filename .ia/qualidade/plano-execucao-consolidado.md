# Plano Executivo — Correções Backend AgentMap

## Status Geral: Em andamento — G1, G2, G3, G4 concluídas. G5 em andamento.

## Objetivo
Corrigir todos os bugs críticos/altos não resolvidos nas auditorias e deixar o backend 100% estável.

## Estado Atual do Código (verificação direta pós-correções)
- `path.win32.join` eliminado de `backend/src/api/{index.ts,admin.ts,eventos.ts,health.ts}` e de todos `backend/src/servicios/*.ts` e `backend/src/seguranca/paths.ts`
- `/api/health` e `/api/admin/readiness` movidos para antes de `projectMiddleware` em `index.ts`
- `POST /api/eventos/custom` refatorado para usar `EventoService.registrar()`

## Grupos de Trabalho

### G1 — Portabilidade crítica de paths ✅ CONCLUÍDA
**Arquivos:** `backend/src/api/admin.ts`, `eventos.ts`, `index.ts`, `health.ts`  
**Correção:** Substituído `path.win32.join(...)` por `path.join(...)`

### G2 — Health/Readiness fora do middleware de projeto ✅ CONCLUÍDA
**Arquivos:** `backend/src/api/index.ts`, `backend/src/api/admin.ts`  
**Correção:**
1. `criarHealthRouter()` movido para antes de `projectMiddleware`
2. `GET /api/admin/readiness` movido para `index.ts` antes de `projectMiddleware`
3. `/api/admin/readiness` removido de `admin.ts`

### G3 — Eliminar bypass do service layer em `/eventos/custom` ✅ CONCLUÍDA
**Arquivo:** `backend/src/api/eventos.ts`  
**Correção:** Handler `/custom` agora usa `req.servicos!.evento.registrar(...)` com validação, IdGenerator e auditoria. Escrita direta no filesystem removida.

### G4 — Portabilidade em services ✅ CONCLUÍDA
**Arquivos:** `backend/src/servicios/*.ts`, `backend/src/seguranca/paths.ts`  
**Correção:** Substituído `path.win32.join(...)` por `path.join(...)` em todos os services e `paths.ts`

### G5 — Divergências MCP: filtros e tools ausentes 🔵 EM ANDAMENTO
**Arquivos:** `backend/src/mcp-server/tools/*.ts`  
**Ação:**
1. `agentmap_reservas_listar` — aceitar `agenteId?`
2. `agentmap_dependencias_listar` — aceitar `fonteId?`/`destinoId?`
3. `agentmap_responsabilidades_listar` — aceitar `agenteId?`/`alvoId?`
4. `agentmap_artefatos_listar` — aceitar `tarefaId?`
5. Completar `title`/`outputSchema`/`annotations` em tools de sessão e evento faltantes

## Validação Final
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run test` ou `npm run dev` smoke test 🔵 Pendente

