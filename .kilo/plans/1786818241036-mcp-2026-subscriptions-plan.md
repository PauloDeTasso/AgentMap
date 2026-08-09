# Plano — MCP 2026-07-28 `subscriptions/listen` no AgentMap

> **Ordem:** 2/5  
> **Prioridade:** Alta  
> **Depende de:** `.kilo/plans/1786789347005-mcp-resource-subscriptions-plan.md` (Fase 1-5 concluídas)  
> **Stack:** Node.js + TypeScript + Express + MCP Server + Kilo Code

---

## 1. Objetivo

Implementar suporte ao `subscriptions/listen` (MCP 2026-07-28) mantendo compatibilidade retroativa com `resources/subscribe` (MCP 2025). O AgentMap já possui EventBus, URI factory, SubscriptionManager e handlers legacy. Esta fase adiciona o stream longo-vivo do 2026 sem quebrar clientes existentes.

## 2. Escopo

- Adicionar handler `subscriptions/listen` no `McpServer`
- Manter `resources/subscribe` + `resources/unsubscribe` como fallback 2025
- Negociar protocol version no `initialize` (via `_meta` ou `protocolVersion`)
- Entregar notificações no stream com `_meta["io.modelcontextprotocol/subscriptionId"]`
- Enviar `notifications/subscriptions/acknowledged` antes do primeiro evento
- Suportar cancelamento por `notifications/cancelled` (stdio)
- Graceful shutdown: responder empty result antes de fechar stream
- Reutilizar EventBus, URI factory e authorization existentes

Fora do escopo:
- Migração completa para SDK v2
- Remoção de `resources/subscribe` (ainda necessário para clientes 2025)
- SSE dashboard web
- Broker externo (Redis/NATS)

## 3. Decisões arquiteturais

1. **Dual-era:** manter `resources/subscribe` (2025) e adicionar `subscriptions/listen` (2026) lado a lado
2. **Mesmo EventBus:** publicadores de domínio não mudam; apenas a camada de transporte muda
3. **SubscriptionManager adaptado:** adicionar modo `listen` além do modo `subscribe` atual
4. **Negociação por versão:** se cliente enviar `protocolVersion: 2026-07-28` ou `_meta.io.modelcontextprotocol/protocolVersion`, usar novo handler; senão, usar legacy
5. **Session-scoped:** no stdio, subscriptions são por connection; no disconnect/teardown, limpar tudo

## 4. Tarefas

### Fase 1 — Foundation

1. **Verificar SDK TypeScript 2026-07-28**
   - `npm outdated @modelcontextprotocol/sdk`
   - Verificar se `subscriptions/listen` está disponível na versão instalada
   - Se não, manter implementação manual com schemas Zod (como já feito para 2025)

2. **Estender SubscriptionManager**
   - Adicionar `subscriptionListeners: Map<subscriptionId, { filter, sessionId, active }>`
   - `addListenSubscription(subscriptionId, filter, sessionId)`
   - `removeListenSubscription(subscriptionId)`
   - `getListenSubscribers(uri)` → retorna subscription IDs interessados
   - `isLegacyMode()` vs `isListenMode()`

### Fase 2 — Server-side `subscriptions/listen`

3. **Implementar handler `subscriptions/listen`**
   - Registrar via `mcpServer.server.setRequestHandler(SubscribeRequestSchema2026, ...)`
   - Validar filter: `resourceSubscriptions[]`, `toolsListChanged`, `promptsListChanged`, `resourcesListChanged`
   - Criar subscription ID = JSON-RPC request ID
   - Enviar `notifications/subscriptions/acknowledged` com `_meta.io.modelcontextprotocol/subscriptionId`
   - Manter stream aberto; aguardar cancelamento ou shutdown
   - Taggear todas as notificações com `_meta.io.modelcontextprotocol/subscriptionId`

4. **Cancelamento**
   - Handler para `notifications/cancelled` referenciando subscription ID
   - Fechar stream gracefulmente

5. **Graceful shutdown**
   - No `mcpServer.server.onclose` ou `process.on('SIGTERM')`, enviar empty `subscriptions/listen` result para cada subscription ativa
   - Depois limpar `subscriptionManager.unsubscribeAll()` e `eventBus.shutdown()`

### Fase 3 — Notification routing

6. **Adaptar EventBus → SubscriptionManager**
   - Quando `eventBus.publish(uri)` disparar:
     - Para cada subscription ID interessado no URI:
       - Se modo listen: enviar `notifications/resources/updated` com `_meta.io.modelcontextprotocol/subscriptionId`
       - Se modo legacy: enviar `notifications/resources/updated` sem `_meta` extra (compat 2025)
   - Respeitar filter do cliente: só enviar se `resourceSubscriptions` incluir o URI

7. **Capabilities 2026**
   - Anunciar `resources.subscribe: true` e `resources.listChanged: true` (mantém compat 2025)
   - Considerar `extensions` field para `io.modelcontextprotocol/tasks` (futuro)

### Fase 4 — Testes

8. **Testes automatizados**
   - `subscriptions/listen` com `resourceSubscriptions`
   - Acknowledgment recebido antes de notificações
   - Notificações taggeadas com subscription ID
   - Cancelamento via `notifications/cancelled`
   - Graceful shutdown envia empty result
   - Dual-era: cliente 2025 usa `resources/subscribe`, cliente 2026 usa `subscriptions/listen`
   - Coalescência funciona igual em ambos modos

9. **Teste manual com MCP Inspector**
   - Inspector suporta 2026-07-28? Verificar
   - Se sim, testar `subscriptions/listen` diretamente

### Fase 5 — Documentação

10. **Atualizar docs**
    - `docs/protocolo-mcp.md`: seção `subscriptions/listen`
    - `docs/arquitetura-mcp.md`: dual-era, estado 2026
    - `docs/guia-agente-mcp.md`: quando usar listen vs subscribe
    - `README.md`: mencionar suporte a 2026-07-28

## 5. Critérios de aceite

- [ ] `subscriptions/listen` funciona para `resourceSubscriptions`
- [ ] `notifications/subscriptions/acknowledged` enviado com subscription ID correto
- [ ] Notificações taggeadas com `_meta.io.modelcontextprotocol/subscriptionId`
- [ ] Cancelamento por `notifications/cancelled` funciona
- [ ] Graceful shutdown envia empty result para cada subscription ativa
- [ ] `resources/subscribe` continua funcionando para clientes 2025
- [ ] Mesmos EventBus + URI factory + authorization reutilizados
- [ ] Testes automatizados passando (dual-era)
- [ ] Documentação atualizada

## 6. Riscos

| Risco | Mitigação |
|---|---|
| SDK TypeScript não suporta 2026-07-28 | Implementar handler manual com schemas Zod, como feito para 2025 |
| Inspector não suporta 2026 | Testar via script customizado; Inspector é opcional |
| Breaking change em clientes existentes | Manter `resources/subscribe` intacto; 2026 é opt-in |
| Stateful subscriptions em stdio | Server holds no state across reconnections; cliente deve re-listen |

## 7. Arquivos afetados

- `backend/src/mcp-server/server.ts` — capabilities, possibly protocol version detection
- `backend/src/mcp-server/index.ts` — graceful shutdown para listen streams
- `backend/src/mcp-server/subscriptions/subscription-manager.ts` — modo listen
- `backend/src/mcp-server/resources/index.ts` — novo handler `subscriptions/listen`
- `backend/testes/mcp-subscriptions.test.ts` — testes dual-era
- `docs/protocolo-mcp.md`, `docs/arquitetura-mcp.md`, `docs/guia-agente-mcp.md`, `README.md`

## 8. Ordem de execução

1. Verificar suporte SDK 2026-07-28
2. Estender SubscriptionManager
3. Implementar handler `subscriptions/listen`
4. Implementar cancelamento + graceful shutdown
5. Testes automatizados
6. Teste manual
7. Documentação

## 9. Próximos passos após este plano

- Revisar e aprovar plano
- Executar Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5
- Validar com clientes 2025 e 2026
- Documentar migration guide para agentes
