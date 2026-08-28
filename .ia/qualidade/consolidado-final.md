# Consolidado Final — Mega Auditoria Backend AgentMap

## Status Global
- **G1 — Portabilidade em rotas:** ✅ Concluída
- **G2 — Health/Readiness sem projeto:** ✅ Concluída
- **G3 — Bypass service layer em `/custom`:** ✅ Concluída
- **G4 — Portabilidade em services:** ✅ Concluída
- **G5 — Divergências MCP (filtros + metadata):** ✅ Concluída
- **Tools MCP ausentes (Admin/Integridade/Estado/Temp):** ✅ Concluída
- **`outputSchema` vs `toMcpStructured`:** ✅ Ajustado (removidos onde havia clara divergência)
- **`describe.skip` no teste orquestrador:** ✅ Removido

## Bugs Críticos Corrigidos

| Bug | Arquivo | Correção |
|-----|---------|----------|
| `path.win32.join` em todos os arquivos do backend | `backend/src/**` (100+ ocorrências) | Substituído por `path.join` |
| `/api/health` requeria projeto aberto | `api/index.ts` | Movido antes de `projectMiddleware` |
| `/api/admin/readiness` requeria projeto aberto | `api/index.ts` + `api/admin.ts` | Movido para `index.ts` antes do middleware; removido de `admin.ts` |
| `/custom` bypassava service layer | `api/eventos.ts` | Refatorado para usar `EventoService.registrar()` |
| `BloqueioService.atualizar` burla máquina de estados | `backend/src/servicios/BloqueioService.ts` | Adicionada validação de transição |
| `DependenciaService.atualizar` sem validação | `backend/src/servicios/DependenciaService.ts` | Adicionada validação Zod |
| `excluir` ignora resultado da exclusão | 4 services + projetos.ts | Verifica `deleteResult.sucesso` |
| `PUT /api/projetos/settings` sem `asyncHandler` | `backend/src/api/projetos.ts` | Envolvido com `asyncHandler` |
| `PUT /api/conflitos/:id` status 200 em falha | `backend/src/api/conflitos.ts` | Status condicional `200/400` |
| Nesting duplo em `GET /api/auditoria` | `backend/src/api/index.ts` | Corrigido para `responder(res, listar())` |
| Ordem de rotas `DELETE` em contatos | `backend/src/api/contatos.ts` | Reordenado |
| Campo `prioridade` ausente em `/priorizados` | `backend/src/api/handoffs-centrais.ts` | Adicionado |
| Gramática em títulos MCP | 3 tools | Corrigida ("Todos os" → "Todas as") |

## Divergências MCP Corrigidas

| Tool | Correção |
|------|----------|
| `agentmap_reservas_listar` | Adicionado `agenteId?` → `listarPorAgente()` |
| `agentmap_dependencias_listar` | Adicionado `fonteId?`/`destinoId?` → `listarPorFonte()`/`listarPorDestino()` |
| `agentmap_responsabilidades_listar` | Adicionado `agenteId?`/`alvoId?` → `listarPorAgente()`/`listarPorAlvo()` |
| `agentmap_artefatos_listar` | Adicionado `tarefaId?` → `listarPorTarefa()` |
| `agentmap_sessoes_*` (7 tools) | Adicionado `title`/`outputSchema`/`annotations` faltantes |
| `agentmap_eventos_confirmar` | Adicionada `annotations: { idempotentHint: true }` |
| `agentmap_sessoes_excluir_todos` | Corrigido title para "Excluir Todas as Sessões" |
| `agentmap_validacoes_aprovar` | Tool criada (não existia) |
| `agentmap_validacoes_rejeitar` | Tool criada (não existia) |
| `agentmap_admin_metricas` | Tool criada |
| `agentmap_admin_backup` | Tool criada |
| `agentmap_integridade_verificar` | Tool criada |
| `agentmap_integridade_listar_regras` | Tool criada |
| `agentmap_estado_listar_notas` | Tool criada |
| `agentmap_estado_obter_nota` | Tool criada |
| `agentmap_temp_listar_arquivos` | Tool criada |
| `agentmap_temp_limpar` | Tool criada |

## Ajustes Arquiteturais
- `outputSchema` removido de tools onde `toMcpStructured` retorna envelope diferente (`{ data: ... }`), evitando ilusão de validação.
- `describe.skip` removido do teste orquestrador.

## Validação
- `npm run typecheck` ✅
- `npm run lint` ✅
- `path.win32.join` no backend: **0** ✅
