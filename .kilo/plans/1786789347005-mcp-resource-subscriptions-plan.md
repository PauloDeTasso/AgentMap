# Plano — MCP Resource Subscriptions e Change Notifications

> **Ordem:** 1/5  
> **Prioridade:** Alta  
> **Depende de:** nenhum  
> **Stack:** Node.js + TypeScript + Express + MCP Server + Kilo Code

---

## 1. Objetivo

Implementar notificações automáticas de mudança de recursos via MCP, eliminando polling manual entre agentes. Quando um recurso mudar, o MCP Server avisa automaticamente os agentes inscritos.

## 2. Escopo

- Registrar recursos MCP com URIs canônicos `agentmap://...`
- Implementar subscriptions (era 2025) e preparar para `subscriptions/listen` (era 2026-07-28)
- Integrar com serviços de domínio (solicitações, handoffs, bloqueios)
- Validar com MCP Inspector

Fora do escopo inicial:
- Migração completa do SDK para v2
- SSE dashboard web
- Redis/NATS ou broker externo

## 3. Decisões arquiteturais

1. **Dual-era:** manter compatibilidade com MCP 2025 (`resources/subscribe`) enquanto prepara para 2026-07-28 (`subscriptions/listen`)
2. **Event Bus local:** separa domínio de transporte. Serviços publicam `ResourceChangedEvent`; camada MCP decide como entregar
3. **Recursos read-only:** mutations continuam via tools; resources são apenas para leitura + notificação
4. **URI canônico:** único gerador `agentmap://{tipo}/{id}`
5. **Sem conteúdo na notificação:** notificação indica only o URI; cliente faz `resources/read`

## 4. Tarefas

### Fase 1 — Foundation

1. **Criar módulos base**
   - `backend/src/mcp-server/events/event-bus.ts` — `publish(event)` + `subscribe(handler)` + `unsubscribe(handler)`
   - `backend/src/mcp-server/resources/uri-factory.ts` — funções canônicas: `solicitacoesUri(agentId)`, `handoffsUri(agentId)`, `bloqueiosUri(projectId)`
   - `backend/src/mcp-server/subscriptions/subscription-manager.ts` — `subscribe(sessionId, uri)`, `unsubscribe(sessionId, uri)`, `unsubscribeAll(sessionId)`, `getSubscribers(uri)`

2. **Criar tipos compartilhados**
   - `ResourceChangedEvent`: `{ uri, timestamp, reason }`
   - `Subscription`: `{ sessionId, uri, createdAt }`

### Fase 2 — Resources MCP

3. **Registrar resources no MCP Server**
   - `agentmap://solicitacoes/{agenteId}`
   - `agentmap://handoffs/{agenteId}`
   - `agentmap://bloqueios/{projetoId}`
   - Usar `registerResource()` + `ResourceTemplate` do SDK
   - Cada resource retorna JSON via `resources/read`

4. **Anunciar capabilities**
   - `capabilities.resources.subscribe = true`
   - `capabilities.resources.listChanged = true`

### Fase 3 — Legacy subscriptions (MCP 2025)

5. **Implementar handlers legacy**
   - `resources/subscribe` → `subscriptionManager.subscribe(sessionId, uri)`
   - `resources/unsubscribe` → `subscriptionManager.unsubscribe(sessionId, uri)`
   - Usar `server.server.sendResourceUpdated({ uri })` ao publicar evento

6. **Limpeza de sessão**
   - No disconnect do stdio, chamar `subscriptionManager.unsubscribeAll(sessionId)`

### Fase 4 — Event integration

7. **Integrar serviços de domínio ao Event Bus**
   - `SolicitacaoService.criar()` → `eventBus.publish({ uri: solicitacoesUri(agenteResponsavel), reason: 'solicitacao_criada' })`
   - `SolicitacaoService.atualizar()` → mesma URI
   - `HandoffService.criar()` → `eventBus.publish({ uri: handoffsUri(agenteDestino), reason: 'handoff_criado' })`
   - `HandoffService.atualizar()` → mesma URI
   - `BloqueioService.criar()` → `eventBus.publish({ uri: bloqueiosUri(projetoId), reason: 'bloqueio_criado' })`
   - `BloqueioService.resolver()` → mesma URI

8. **Coalescência**
   - Agrupar eventos por URI em janela de 50–250ms
   - Publicar apenas 1 notificação por URI por janela

### Fase 5 — Validação

9. **Testes automatizados**
   - Resource registration + read
   - Subscribe/unsubscribe
   - Notificação enviada apenas aos inscritos
   - Cliente não inscrito não recebe
   - Burst de alterações coalesce
   - Processo morto não causa erro

10. **Teste manual com MCP Inspector**
    - `npx @modelcontextprotocol/inspector`
    - Subscribe em `agentmap://solicitacoes/AGT-BACKEND`
    - Criar solicitação via tool/REST
    - Confirmar `notifications/resources/updated`
    - Fazer `resources/read` e validar conteúdo

### Fase 6 — Preparação MCP 2026-07-28 (não-bloqueante)

11. **Avaliar SDK v2**
    - `npm outdated @modelcontextprotocol/sdk`
    - Verificar se `serveStdio()` e `subscriptions/listen` estão disponíveis
    - Se sim, adicionar rota alternativa sem quebrar legacy

## 5. Critérios de aceite

- [ ] `agentmap://solicitacoes/{agenteId}` registrado e legível
- [ ] `agentmap://handoffs/{agenteId}` registrado e legível
- [ ] `agentmap://bloqueios/{projetoId}` registrado e legível
- [ ] `resources/subscribe` + `resources/unsubscribe` funcionando
- [ ] Notificações enviadas apenas a inscritos do URI correto
- [ ] Event Bus desacoplado de serviços de domínio
- [ ] URIs canônicas e validadas
- [ ] Coalescência implementada
- [ ] Limpeza de sessão no disconnect
- [ ] Testes automatizados passando
- [ ] MCP Inspector valida fluxo completo

## 6. Riscos

| Risco | Mitigação |
|---|---|
| Kilo Code não suporta `notifications/resources/updated` | Implementar de qualquer forma (aditivo); fallback é polling |
| SDK v1 vs v2 incompatibilidade | Manter v1 estável; migrar apenas quando necessário |
| Múltiplos processos stdio sem estado compartilhado | Event Bus local por processo; para multi-processo futuro, avaliar broker |
| Performance com burst de alterações | Coalescência por URI + janela curta |

## 7. Arquivos afetados

- `backend/src/mcp-server/index.ts` — inicialização do servidor e capabilities
- `backend/src/mcp-server/events/event-bus.ts` — novo
- `backend/src/mcp-server/resources/uri-factory.ts` — novo
- `backend/src/mcp-server/subscriptions/subscription-manager.ts` — novo
- `backend/src/servicios/SolicitacaoService.ts` — publish eventos
- `backend/src/servicios/HandoffService.ts` — publish eventos
- `backend/src/servicios/BloqueioService.ts` — publish eventos
- `backend/src/mcp-server/tools/*` — ajustar para usar recursos registrados
- `esquemas/*.schema.json` — manter, sem alteração

## 8. Ordem de execução

1. Foundation (Event Bus + URI factory + SubscriptionManager)
2. Resources MCP (registro + capabilities)
3. Legacy subscriptions (handlers + sendResourceUpdated)
4. Event integration (serviços → Event Bus)
5. Validação (testes automatizados + Inspector)
6. Preparação MCP 2026 (avaliação SDK v2)

## 9. Próximos passos após este plano

- Revisar e aprovar plano
- Executar Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5
- Validar com MCP Inspector
- Documentar no README os recursos assináveis
