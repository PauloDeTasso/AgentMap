# 📄 Documento 1/5 — MCP Resource Subscriptions (avisos automáticos entre agentes)

> **Ordem de implementação:** 1ª de 5
> **Prioridade:** Alta
> **Esforço estimado:** Baixo (1–3 dias de trabalho de agente)
> **Depende de:** nada (pode começar imediatamente)
> **Projeto alvo:** AgentMap (backend Node.js + TypeScript + Express + MCP Server)

---

## 1. Objetivo

Eliminar o processo manual de "copiar e colar" resultados entre janelas do Kilo Code, implementando o mecanismo nativo de **subscriptions** (inscrições) do protocolo MCP. Com isso, um agente poderá se inscrever em um recurso (ex.: suas solicitações de alteração pendentes) e ser **notificado automaticamente** pelo servidor MCP assim que esse recurso mudar — sem precisar ficar consultando (polling) nem depender de um humano repassando contexto entre agentes.

## 2. Contexto do sistema atual

- Backend: Node.js + TypeScript + Express, rodando em `http://localhost:3150`.
- MCP Server via **stdio** (um processo por agente/janela do Kilo Code), localizado em `backend/src/mcp-server/`.
- SDK usado: `@modelcontextprotocol/sdk` v1.30.0, com mais de 100 tools registradas via `registerTool`.
- Dados do projeto vivem como arquivos JSON dentro de `.ia/` (tarefas, contratos, solicitações, handoffs, etc.), validados por schemas em `esquemas/*.schema.json`.
- Hoje, para um agente saber que há uma nova solicitação de alteração destinada a ele, ele precisa **consultar ativamente** (tool `consultar_solicitacoes` ou similar) — não há push automático.

## 3. O que muda depois desta implementação

| Antes | Depois |
|---|---|
| Agente precisa chamar uma tool repetidamente para saber se há algo novo | Agente se inscreve uma vez e recebe notificação automática quando o recurso muda |
| Coordenação depende de o desenvolvedor colar contexto manualmente entre janelas | O próprio MCP Server avisa o cliente (Kilo Code) quando o recurso relevante muda |
| Sem padrão — cada fluxo resolve isso "na mão" | Padrão nativo do protocolo MCP (`resources/subscribe`, `notifications/resources/updated`) |

## 4. Pré-requisitos técnicos

1. Confirmar a versão do `@modelcontextprotocol/sdk` em uso (`backend/package.json`) — subscriptions exigem suporte à capability `resources.subscribe`.
2. Verificar se o cliente MCP embutido no Kilo Code / VS Code processa `notifications/resources/updated`. **Isso é um risco conhecido**: nem todos os clientes MCP implementam esse lado do protocolo. Antes de investir tempo de implementação, validar com um teste mínimo usando o **MCP Inspector** (`npx @modelcontextprotocol/inspector`), que suporta subscriptions nativamente e serve para confirmar que o servidor está emitindo as notificações corretamente, independentemente do cliente final.
3. Caso o Kilo Code não processe as notificações no momento da implementação, a estrutura ainda deve ser construída (o protocolo é aditivo e não quebra nada existente) — o fallback é o cliente continuar fazendo polling manual até o suporte chegar.

## 5. Recursos (resources) que devem se tornar "assinaváveis"

Priorizar, nesta ordem:

1. `solicitacoes:{agenteId}` — solicitações de alteração destinadas a um agente específico.
2. `handoffs:{agenteId}` — handoffs recebidos por um agente.
3. `bloqueios:{projetoId}` — bloqueios ativos do projeto (qualquer agente pode se inscrever).
4. `eventos:{projetoId}` — stream geral de eventos do projeto (uso mais amplo, ex.: dashboard).

## 6. Plano de implementação passo a passo

### Passo 1 — Criar o `SubscriptionManager`

Criar `backend/src/mcp-server/subscriptions/subscription-manager.ts`:

```typescript
import { randomUUID } from "node:crypto";

type ResourceUri = string;
type SessionId = string;

interface Subscription {
  sessionId: SessionId;
  uri: ResourceUri;
  createdAt: string;
}

export class SubscriptionManager {
  private subscriptions = new Map<ResourceUri, Set<SessionId>>();

  subscribe(sessionId: SessionId, uri: ResourceUri): void {
    if (!this.subscriptions.has(uri)) {
      this.subscriptions.set(uri, new Set());
    }
    this.subscriptions.get(uri)!.add(sessionId);
  }

  unsubscribe(sessionId: SessionId, uri: ResourceUri): void {
    this.subscriptions.get(uri)?.delete(sessionId);
  }

  unsubscribeAll(sessionId: SessionId): void {
    for (const set of this.subscriptions.values()) {
      set.delete(sessionId);
    }
  }

  getSubscribers(uri: ResourceUri): SessionId[] {
    return Array.from(this.subscriptions.get(uri) ?? []);
  }
}
```

### Passo 2 — Registrar a capability `resources.subscribe` no servidor MCP

No arquivo de inicialização do servidor (ex.: `backend/src/mcp-server/index.ts`), garantir que a capability é anunciada:

```typescript
const server = new McpServer({
  name: "agentmap-mcp",
  version: "1.0.0",
}, {
  capabilities: {
    resources: { subscribe: true, listChanged: true },
  },
});
```

### Passo 3 — Implementar os handlers `resources/subscribe` e `resources/unsubscribe`

```typescript
import { SubscriptionManager } from "./subscriptions/subscription-manager.js";

const subscriptionManager = new SubscriptionManager();

server.setRequestHandler(SubscribeRequestSchema, async (request, extra) => {
  const { uri } = request.params;
  subscriptionManager.subscribe(extra.sessionId, uri);
  return {};
});

server.setRequestHandler(UnsubscribeRequestSchema, async (request, extra) => {
  const { uri } = request.params;
  subscriptionManager.unsubscribe(extra.sessionId, uri);
  return {};
});
```

> Ajustar os nomes exatos dos schemas de request conforme a versão instalada do SDK (`@modelcontextprotocol/sdk`) — conferir em `node_modules/@modelcontextprotocol/sdk/dist/types.d.ts` antes de codar, pois nomes de export podem variar entre versões minor.

### Passo 4 — Emitir a notificação quando um recurso muda

Criar uma função central `notificarMudancaRecurso(uri: string)` e chamá-la em todo lugar do código onde uma entidade relevante é criada/alterada (ex.: dentro do serviço que cria uma Solicitação de Alteração):

```typescript
export async function notificarMudancaRecurso(server: McpServer, uri: string) {
  const subscribers = subscriptionManager.getSubscribers(uri);
  for (const sessionId of subscribers) {
    await server.notification({
      method: "notifications/resources/updated",
      params: { uri },
    }, sessionId);
  }
}
```

Pontos de integração obrigatórios (buscar no código atual do `servicios/`):

- `criarSolicitacaoAlteracao()` → notificar `solicitacoes:{agenteResponsavel.id}`
- `criarHandoff()` → notificar `handoffs:{agenteDestino.id}`
- `criarBloqueio()` / `resolverBloqueio()` → notificar `bloqueios:{projetoId}`

### Passo 5 — Limpar inscrições ao encerrar sessão

No handler de desconexão do transporte stdio, chamar `subscriptionManager.unsubscribeAll(sessionId)` para evitar vazamento de memória com sessões mortas.

### Passo 6 — Expor também via REST (opcional, para o dashboard web)

Como o frontend web não fala MCP diretamente, considerar um endpoint `GET /api/eventos/stream` usando Server-Sent Events (SSE), reaproveitando o mesmo `SubscriptionManager` para alimentar a interface Web em tempo real.

## 7. Testes de validação

1. **Teste manual com MCP Inspector:**
   ```bash
   npx @modelcontextprotocol/inspector node backend/dist/mcp-server/index.js
   ```
   - Ir na aba *Resources*.
   - Localizar `solicitacoes:AGT-BACKEND`.
   - Clicar em *Subscribe*.
   - Em outro terminal, disparar a criação de uma solicitação via API REST ou tool MCP.
   - Confirmar que a notificação `notifications/resources/updated` aparece no Inspector.

2. **Teste automatizado (Vitest/Jest):**
   - Simular dois "clientes" (sessões) inscritos no mesmo recurso.
   - Disparar uma mudança.
   - Verificar que ambos recebem a notificação e que um terceiro cliente não inscrito não recebe nada.

3. **Teste de limpeza de sessão:**
   - Inscrever uma sessão, encerrá-la, disparar mudança, confirmar que nenhuma notificação é enviada para a sessão morta (sem erro/exception).

## 8. Critérios de aceite (checklist final)

- [ ] `SubscriptionManager` implementado e testado isoladamente.
- [ ] Capability `resources.subscribe` anunciada na inicialização do servidor.
- [ ] Handlers `resources/subscribe` e `resources/unsubscribe` funcionando.
- [ ] Notificação disparada nos 3 pontos de integração prioritários (solicitações, handoffs, bloqueios).
- [ ] Limpeza de sessão ao desconectar implementada.
- [ ] Teste validado com MCP Inspector.
- [ ] Documentação atualizada no README (seção MCP) descrevendo os novos recursos assináveis.

## 9. Referências

- Especificação MCP — Resources: https://modelcontextprotocol.info/docs/concepts/resources/
- SDK oficial: `@modelcontextprotocol/sdk` (npm)
- MCP Inspector: `@modelcontextprotocol/inspector` (npm)

---

**Próximo documento da sequência:** `02-observabilidade-opentelemetry.md`
