# Plano Executável — MCP 2026 Preparação e Dual-Era Support

> **Sessão:** executar em worktree/agente separado  
> **Branch base:** `v0010`  
> **Stack:** Node.js + TypeScript + Express + MCP Server SDK v1.30.0  
> **Dependência:** nenhuma (não bloqueia outras features)  
> **Tempo estimado:** 45-90 min

---

## 1. Estado atual

| Item | Status |
|------|--------|
| SDK MCP instalado | `@modelcontextprotocol/sdk` v1.30.0 |
| `resources/subscribe` | ✅ implementado e testado (22 testes passing) |
| `sendResourceUpdated` | ✅ implementado e testado |
| `subscriptions/listen` | ❌ não existe no SDK v1 |
| Cliente stdio manual | ✅ passing (`mcp-client-stdio.ts`) |
| Teste E2E automatizado | ⚠️ não captura notificação (suspeita: buffer fragmentado) |

**Conclusão:** MCP 2026 não está disponível no npm ainda. A preparação é estrutural, não funcional.

---

## 2. Objetivo

Preparar o AgentMap para suportar clientes MCP 2026-07-28 (`subscriptions/listen`) **sem quebrar** clientes MCP 2025 (`resources/subscribe`).

Quando o SDK v2 for publicado, a migração deve ser trivial.

---

## 3. Arquivos já criados (não alterar)

| Arquivo | Status |
|---------|--------|
| `backend/src/mcp-server/subscriptions/protocol-adapter.ts` | ✅ Criado |
| `backend/src/mcp-server/subscriptions/subscription-manager.ts` | ✅ Atualizado (adicionado `protocolVersion`) |
| `backend/src/mcp-server/resources/index.ts` | ✅ Atualizado (imports adicionados) |
| `backend/testes/mcp-client-stdio.ts` | ✅ Criado |
| `backend/testes/mcp-notification-e2e-runner.ts` | ✅ Criado |
| `backend/testes/mcp-notification-e2e.test.ts` | ✅ Criado |

---

## 4. Tarefas para executar

### 4.1 Corrigir teste E2E (buffer fragmentado)

**Arquivo:** `backend/testes/mcp-notification-e2e-runner.ts`

**Problema suspeito:** o handler de notificação no runner usa `parseMessage(chunk)` diretamente, mas mensagens MCP podem chegar fragmentadas em múltiplos chunks. O `sendMessage` já lida com isso acumulando buffer, mas o handler de notificação não.

**Correção:**
1. No `notificationPromise`, substitua o handler atual por um que acumule buffer exatamente como `sendMessage`:
   ```typescript
   let notifBuffer = Buffer.alloc(0);
   const handler = (chunk: Buffer) => {
     notifBuffer = Buffer.concat([notifBuffer, chunk]);
     const parsed = parseMessage(notifBuffer);
     if (parsed && parsed.method === 'notifications/resources/updated') {
       resolve(parsed);
     }
   };
   ```
2. Rode `npx tsx testes/mcp-notification-e2e-runner.ts` até passar.

### 4.2 Integrar `ProtocolAdapter` no fluxo de notificações

**Arquivo:** `backend/src/mcp-server/resources/index.ts`

**Tarefa:**
1. No handler de `resources/subscribe`, detecte o protocolo do cliente via `extra.protocolVersion` ou `request.params?.protocolVersion`:
   ```typescript
   const protocolVersion = detectProtocolVersion(extra?.protocolVersion || request?.params?.protocolVersion);
   subscriptionManager.subscribe(sessionId, uri, protocolVersion);
   ```
2. No handler de `resources/unsubscribe`, passe `protocolVersion` também:
   ```typescript
   subscriptionManager.unsubscribe(sessionId, uri);
   ```
3. No `globalEventBus.subscribe`, ao invés de chamar `sendResourceUpdated` diretamente, use o adapter:
   ```typescript
   globalEventBus.subscribe((event) => {
     const subscribers = subscriptionManager.getSubscribers(event.uri);
     if (subscribers.length > 0) {
       const legacy = new LegacyProtocolAdapter((params) => mcpServer.server.sendResourceUpdated(params));
       legacy.notify(event.uri).catch((err) => {
         console.error(`[MCP] Falha ao enviar notificação para ${event.uri}:`, err);
         for (const sessionId of subscribers) {
           subscriptionManager.unsubscribeAll(sessionId);
         }
       });
     }
   });
   ```
   > **Nota:** Por enquanto, todos os clientes usam `LegacyProtocolAdapter`. O `ModernProtocolAdapter` será usado quando o SDK v2 suportar `subscriptions/listen`.

### 4.3 Adicionar capability negotiation

**Arquivo:** `backend/src/mcp-server/server.ts`

**Tarefa:**
1. No `initialize` do MCP server, detectar `protocolVersion` do cliente:
   ```typescript
   const clientProtocolVersion = params?.protocolVersion as string | undefined;
   const capabilities: any = {
     tools: { listChanged: true },
     resources: { subscribe: true, listChanged: true },
     prompts: {}
   };
   
   if (clientProtocolVersion && clientProtocolVersion.startsWith('2026')) {
     capabilities.resources = { resourceSubscriptions: true, listChanged: true };
   }
   ```
2. Se quiser ser explícito, adicione uma propriedade `_meta` na resposta de initialize indicando o protocolo suportado.

### 4.4 Atualizar `SubscriptionManager` para suportar protocol version por session

**Arquivo:** `backend/src/mcp-server/subscriptions/subscription-manager.ts`

**Status:** Já atualizado no passo anterior. Apenas verificar se os métodos `subscribe` e `unsubscribe` recebem `protocolVersion`.

### 4.5 Adicionar logs de debug (temporários)

**Arquivos:**
- `backend/src/mcp-server/events/event-bus.ts`: adicione `console.error('[E2E-DEBUG] EventBus.publish', JSON.stringify(event));` no início do método `publish`
- `backend/src/mcp-server/resources/index.ts`: adicione `console.error('[E2E-DEBUG] sendResourceUpdated called');` antes de `sendResourceUpdated`

**Remover após validação.**

### 4.6 Testar E2E novamente

```bash
cd backend
npx tsx testes/mcp-notification-e2e-runner.ts
```

Esperado: `E2E TEST PASSED`

### 4.7 Remover logs de debug

Após o teste passar, remova os logs `[E2E-DEBUG]` dos arquivos:
- `backend/src/mcp-server/events/event-bus.ts`
- `backend/src/mcp-server/resources/index.ts`

### 4.8 Executar suite completa

```bash
cd backend
npx tsc --noEmit
npx jest --verbose
```

Esperado: todos os testes passing, incluindo `mcp-subscriptions.test.ts`.

### 4.9 Atualizar documentação

**Arquivos:**
1. `README.md` — adicionar seção "Compatibilidade MCP 2025/2026"
2. `docs/arquitetura-mcp.md` — atualizar "Padrões MCP 2026" e "Estado da Implementação"
3. `docs/protocolo-mcp.md` — adicionar seção de dual-era
4. `AGENTS.md` — adicionar nota sobre preparação para 2026

**Conteúdo mínimo:**
```markdown
## Compatibilidade MCP

O AgentMap é compatível com MCP 2025 (`resources/subscribe`) e está preparado para MCP 2026-07-28 (`subscriptions/listen`). Quando o SDK v2 for publicado, a migração será automática e sem breaking changes.
```

---

## 5. Critérios de aceite

- [ ] `mcp-notification-e2e-runner.ts` passa (`E2E TEST PASSED`)
- [ ] `mcp-client-stdio.ts` passa
- [ ] `mcp-subscriptions.test.ts` passa (22 testes)
- [ ] `tsc --noEmit` sem erros
- [ ] `npm test` sem falhas
- [ ] Logs de debug removidos
- [ ] Documentação atualizada
- [ ] Commit com mensagem: `feat: prepara MCP 2026 dual-era support`
- [ ] Push para branch `v0010`

---

## 6. Comandos úteis

```bash
# Instalar dependências
cd backend && npm install

# Typecheck
cd backend && npx tsc --noEmit

# Testes unitários
cd backend && npx jest --verbose

# Teste stdio manual
cd backend && npx tsx testes/mcp-client-stdio.ts

# Teste E2E
cd backend && npx tsx testes/mcp-notification-e2e-runner.ts

# Git
git add -A
git commit -m "feat: prepara MCP 2026 dual-era support"
git push origin v0010
```

---

## 7. Worktree recomendado

```bash
git worktree add .kilo/worktrees/mcp-2026-dual-era v0010
cd .kilo/worktrees/mcp-2026-dual-era
code .
```

---

## 8. Riscos e mitigações

| Risco | Mitigação |
|--------|-----------|
| SDK v2 não sair tão cedo | Estrutura já preparada; não há urgência |
| Kilo Code não suportar 2026 | Fallback automático para 2025 via capability negotiation |
| Teste E2E instável | Usar `mcp-client-stdio.ts` como validação principal até estabilizar |
| Fragmentação de buffer | Acumular buffer no handler de notificação (tarefa 4.1) |

---

## 9. Próximos passos após este plano

1. Executar tarefas 4.1 a 4.9
2. Abrir PR para `v0010`
3. Quando SDK v2 for publicado: implementar `ModernProtocolAdapter` com `subscriptions/listen`
4. Atualizar Kilo Code config para suportar protocol version
