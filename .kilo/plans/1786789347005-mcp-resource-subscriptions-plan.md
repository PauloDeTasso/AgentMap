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

## 10. Validação real via stdio (pré-commit obrigatória)

Os testes automatizados existentes (`mcp-subscriptions.test.ts`) validam apenas unidades isoladas. Para comprovar que o MCP Resource Subscriptions funciona end-to-end, é necessário um teste real via stdio.

### 10.1 Cliente MCP mínimo (`backend/testes/mcp-client-stdio.ts`)

Criar um script TypeScript que:
1. Abra `spawn` do `npx tsx src/mcp-server/index.ts`
2. Envie `initialize` e espere resposta
3. Envie `notifications/initialized`
4. Envie `resources/subscribe` para `agentmap://solicitacoes/backend`
5. Envie `resources/read` para o mesmo URI e valide JSON retornado
6. Envie `resources/unsubscribe`
7. Envie `shutdown` e feche o processo

Critérios:
- `initialize` retorna `capabilities.resources.subscribe === true`
- `resources/subscribe` retorna `{ sucesso: true }`
- `resources/read` retorna JSON válido com `sucesso` e `dados`
- `resources/unsubscribe` retorna `{ sucesso: true }`
- Processo fecha sem erro (`exit code 0`)

### 10.2 Teste de notificação end-to-end (`backend/testes/mcp-notification-e2e.test.ts`)

Criar teste Jest que:
1. Inicie o MCP server via stdio em um processo filho
2. Conecte cliente MCP e subscreva em `agentmap://handoffs/frontend`
3. Via API REST, crie um handoff com destino `frontend`
4. Aguarde até 500ms e verifique se o cliente recebeu `notifications/resources/updated`
5. Faça `resources/read` e valide que o handoff aparece no JSON
6. Limpeza: unsubscribe + shutdown

Critérios:
- Notificação chega em até 500ms após criação do handoff
- Payload da notificação contém `uri: agentmap://handoffs/frontend`
- `resources/read` retorna o handoff criado

### 10.3 Como executar

```bash
# Teste unitário existente
cd backend && npx jest testes/mcp-subscriptions.test.ts --verbose

# Novo cliente stdio (manual)
cd backend && npx tsx testes/mcp-client-stdio.ts

# Novo teste e2e (automático)
cd backend && npx jest testes/mcp-notification-e2e.test.ts --verbose
```

### 10.4 Aceite antes de commit

- [ ] `mcp-client-stdio.ts` conecta, subscreve, lê, cancela e fecha sem erro
- [ ] `mcp-notification-e2e.test.ts` passa
- [ ] Nenhum timer pendente após shutdown (`detectOpenHandles` limpo)
- [ ] `tsc --noEmit` sem erros

## 11. Próximos passos após este plano

- Implementar Fase 1 → Fase 2 → Fase 3 → Fase 4
- Executar Fase 5 (testes automatizados)
- Executar Fase 10 (validação stdio real)
- Commit + push apenas após Fase 10 aprovada
