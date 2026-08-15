# 📄 Plano de Implementação — Observabilidade OpenTelemetry GenAI

> **Ordem:** 2ª de 5  
> **Prioridade:** Alta  
> **Esforço:** Médio/Alto (4–7 dias)  
> **Depende de:** Documento 1 — MCP Resources/Subscriptions (já implementado)  
> **Projeto alvo:** AgentMap (Node.js + TypeScript + Express + MCP Server)

---

## 1. Resumo Executivo

Transformar a execução dos agentes em **telemetria distribuída, correlacionável e consultável** usando OpenTelemetry com convenções semânticas `gen_ai.*`.

**Problema atual:** O histórico do AgentMap é textual/estrutural (JSON em arquivos). Não há tracing, métricas ou visão temporal das operações.

**Solução:** Instrumentar o backend com OpenTelemetry para gerar traces, métricas e contexto correlacionado, usando `gen_ai.*` para operações de IA/agentes e `agentmap.*` para contexto próprio do domínio.

---

## 2. Objetivos Mensuráveis

Depois da implementação, seremos capazes de responder:

- Qual agente executou determinada operação?
- Qual tarefa originou a operação?
- Qual tool foi chamada e quanto tempo levou?
- A tool falhou? Qual foi o erro?
- Qual sequência de tools ocorreu em um ciclo?
- Qual solicitação/handoff originou aquela execução?
- Onde ocorreu a maior latência?
- Quantas chamadas foram realizadas por agente/tool?
- Qual agente possui maior taxa de erro?
- Quais tools são mais utilizadas?
- Quanto tempo cada ciclo de agente consome?
- Qual foi a cadeia entre agentes (handoff → invoke_agent)?

---

## 3. Princípios Fundamentais

| Princípio | Regra |
|---|---|
| **Observabilidade ≠ dependência crítica** | Se o collector/OTLP falhar, o AgentMap continua funcionando |
| **Segurança primeiro** | Nunca registrar secrets, tokens, prompts completos, arquivos inteiros |
| **Cardinalidade controlada** | Métricas usam apenas atributos de baixa cardinalidade; IDs high-cardinality ficam em traces |
| **Camada de adaptação** | Tools não conhecem OpenTelemetry diretamente; usam helpers próprios |
| **Fixar versões** | `gen_ai.*` semantic-conventions fixada sem `^` ou `~` |
| **Inicialização precoce** | SDK OpenTelemetry iniciado antes de qualquer import de biblioteca instrumentada |

---

## 4. Arquitetura

```
                  ┌───────────────────────┐
                  │      AgentMap          │
                  │                        │
                  │ Node.js / TypeScript   │
                  └───────────┬────────────┘
                              │
                   OpenTelemetry API
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
           Traces          Metrics           Logs
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                   OpenTelemetry Collector
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
            Tempo          Prometheus      Loki
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                           Grafana
```

**Camada de adaptação:**
```
AgentMap
   ↓
Observability Adapter
   ↓
OpenTelemetry API
   ↓
GenAI Semantic Conventions
```

Isso permite que mudanças futuras nas convenções `gen_ai.*` não exijam modificar as 100+ tools.

---

## 5. Estrutura de Arquivos

```
backend/src/observability/
├── index.ts                    # Bootstrap do OpenTelemetry
├── tracing.ts                  # Configuração de traces (NodeSDK, exporter)
├── metrics.ts                  # Configuração de métricas (counters, histograms)
├── context.ts                  # Propagação de contexto entre MCP → service → fs
├── gen-ai.ts                   # Constantes e helpers para convenções gen_ai.*
├── agent-tracing.ts            # Span invoke_agent + plan
├── tool-tracing.ts             # Wrapper registerTracedTool + execute_tool
├── event-tracing.ts            # Instrumentação de eventos (ResourceChangedEvent, handoffs, etc.)
├── sanitization.ts             # Política de sanitização de dados sensíveis
├── attributes.ts               # Helpers para atributos agentmap.*
└── exporters/
    ├── console.ts              # ConsoleSpanExporter para desenvolvimento
    └── otlp.ts                 # OTLP exporter para produção
```

---

## 6. Dependências

```bash
# Core
npm install @opentelemetry/api
npm install @opentelemetry/sdk-node
npm install @opentelemetry/auto-instrumentations-node

# Recursos e convenções
npm install @opentelemetry/resources
npm install @opentelemetry/semantic-conventions

# Exporters (produção)
npm install @opentelemetry/exporter-trace-otlp-proto
npm install @opentelemetry/exporter-metrics-otlp-proto

# Métricas
npm install @opentelemetry/sdk-metrics
```

**Regra:** Fixar versões sem `^` ou `~`. Registrar no `package.json`:
- `opentelemetry.version`
- `gen-ai.semantic-conventions.version`
- `agentmap.observability.schema.version = 1`

---

## 7. Resource OpenTelemetry

```typescript
service.name = "agentmap-backend"
service.version = "0.1.0" | process.env.npm_package_version
service.namespace = "agentmap"
deployment.environment.name = "development" | "production"
```

**NÃO usar como Resource attributes:**
- `agentId`, `taskId`, `requestId`, `correlationId` → pertencem ao span/operação, não ao Resource.

---

## 8. Três Níveis de Tracing

### Nível 1 — `invoke_agent` (ciclo completo do agente)

```text
invoke_agent AGT-BACKEND
```

Atributos:
- `gen_ai.operation.name = invoke_agent`
- `gen_ai.agent.id = AGT-BACKEND`
- `gen_ai.agent.name = Backend` (quando disponível)
- `agentmap.project.id`
- `agentmap.task.id`
- `agentmap.session.id`
- `agentmap.correlation.id`

### Nível 2 — `plan` (planejamento)

```text
invoke_agent AGT-BACKEND
   └── plan
```

Aplicar **somente quando** a arquitetura identificar explicitamente uma fase de planejamento/decomposição. Não criar artificialmente.

### Nível 3 — `execute_tool` (cada tool MCP)

```text
invoke_agent AGT-BACKEND
   ├── execute_tool agentmap_tarefas_criar
   ├── execute_tool agentmap_solicitacoes_criar
   └── execute_tool agentmap_handoffs_criar
```

Atributos:
- `gen_ai.operation.name = execute_tool`
- `gen_ai.tool.name = agentmap_tarefas_criar`
- `gen_ai.tool.call.id = call_123` (quando disponível)
- `gen_ai.tool.type = function`
- `agentmap.project.id`
- `agentmap.task.id`
- `agentmap.correlation.id`

**Hierarquia:** `invoke_agent` → `plan` → `execute_tool` → service → filesystem/HTTP.

---

## 9. Camada de Adaptação (registerTracedTool)

Criar wrapper central para evitar duplicação nas 100+ tools:

```typescript
// tool-tracing.ts
export function registerTracedTool(
  server: McpServer,
  name: string,
  schema: any,
  handler: (input: any, context: ToolContext) => Promise<any>,
  options?: { agentId?: string; toolCallId?: string }
): void {
  server.registerTool(name, schema, async (input, extra) => {
    return executeToolWithTracing(
      { toolName: name, agentId: options?.agentId, toolCallId: options?.toolCallId, toolType: 'function' },
      () => handler(input, extra)
    );
  });
}
```

Isso permite que novas tools já nasçam instrumentadas sem conhecimento de OpenTelemetry.

---

## 10. Helper de Span de Tool

```typescript
// tool-tracing.ts
export async function executeToolWithTracing<T>(
  params: { toolName: string; agentId?: string; toolCallId?: string; toolType?: string },
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(`execute_tool ${params.toolName}`, async (span) => {
    span.setAttribute("gen_ai.operation.name", "execute_tool");
    span.setAttribute("gen_ai.tool.name", params.toolName);
    if (params.toolCallId) span.setAttribute("gen_ai.tool.call.id", params.toolCallId);
    if (params.toolType) span.setAttribute("gen_ai.tool.type", params.toolType);
    if (params.agentId) span.setAttribute("gen_ai.agent.id", params.agentId);

    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.setAttribute("error.type", getErrorType(error));
      throw error;
    } finally {
      span.end();
    }
  });
}
```

**Correção importante:** usar `span.recordException()` + `setStatus(ERROR)` + `error.type` (baixa cardinalidade). Não usar `message` em `setStatus`.

---

## 11. Política de Sanitização

### Proibido por padrão (nunca registrar)
- Senhas, tokens, API keys, authorization headers, credentials, secrets
- Prompt completo
- Conteúdo integral de arquivos
- Resultado completo de tools

### Opt-in (somente quando explicitamente necessário)
- Argumentos de tools (`gen_ai.tool.call.arguments`)
- Resultado de tools (`gen_ai.tool.call.result`)

### Permitido
- Tool name, agent id, task id, project id, duration, status, error type, sizes, counts

```typescript
// sanitization.ts
const SECRET_PATTERNS = [
  /api[_-]?key/i, /password/i, /token/i, /secret/i, /authorization/i,
  /credential/i, /private[_-]?key/i, /bearer/i
];

export function sanitizeToolArguments(args: any): any {
  if (!args || typeof args !== 'object') return args;
  const sanitized = { ...args };
  for (const key of Object.keys(sanitized)) {
    if (SECRET_PATTERNS.some(p => p.test(key))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}
```

**Regra padrão:** `recordArguments = false`, `recordResult = false`.

---

## 12. Métricas OpenTelemetry

### Counter: `agentmap.tool.executions`
- Dimensões: `tool.name`, `tool.type`, `status`
- **Não incluir:** `task.id`, `request.id`, `session.id`, `tool.call.id` (alta cardinalidade)

### Counter: `agentmap.tool.errors`
- Dimensões: `tool.name`, `error.type`

### Histogram: `agentmap.tool.duration`
- Unidade: `ms`
- Dimensões: `tool.name`, `status`

### Counter: `agentmap.agent.executions`
- Dimensões: `agent.id`, `status`
- Observação: cardinalidade baixa (poucos agentes por projeto)

### Histogram: `agentmap.agent.duration`
- Unidade: `ms`
- Dimensões: `agent.id`

**Importante:** Métricas são a fonte primária. O endpoint REST é apenas uma visão do dashboard.

---

## 13. Endpoint REST de Dashboard

Criar `GET /api/observabilidade/metricas` como **visão operacional resumida**, não como armazenamento primário:

```json
{
  "periodo": { "inicio": "2026-08-15T00:00:00Z", "fim": "2026-08-15T23:59:59Z" },
  "agentes": [
    {
      "agentId": "AGT-BACKEND",
      "totalExecucoes": 42,
      "duracaoMediaMs": 3200,
      "taxaErro": 0.02
    }
  ],
  "tools": [
    {
      "toolName": "agentmap_tarefas_criar",
      "totalExecucoes": 15,
      "duracaoMediaMs": 180,
      "taxaErro": 0.0
    }
  ]
}
```

Arquitetura:
```
OpenTelemetry Metrics
       │
       ├── Collector
       │
       └── Dashboard

AgentMap API
       │
       └── visão operacional resumida
```

---

## 14. Instrumentação do Ciclo de Agente

### `invoke_agent`

Criar span quando um agente inicia um ciclo de trabalho:

```typescript
// agent-tracing.ts
export async function withAgentTrace<T>(
  params: { agentId: string; agentName?: string; projectId?: string; taskId?: string; sessionId?: string; correlationId?: string },
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(`invoke_agent ${params.agentId}`, async (span) => {
    span.setAttribute("gen_ai.operation.name", "invoke_agent");
    span.setAttribute("gen_ai.agent.id", params.agentId);
    if (params.agentName) span.setAttribute("gen_ai.agent.name", params.agentName);
    if (params.projectId) span.setAttribute("agentmap.project.id", params.projectId);
    if (params.taskId) span.setAttribute("agentmap.task.id", params.taskId);
    if (params.sessionId) span.setAttribute("agentmap.session.id", params.sessionId);
    if (params.correlationId) span.setAttribute("agentmap.correlation.id", params.correlationId);

    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.setAttribute("error.type", getErrorType(error));
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### `plan`

Instrumentar somente quando houver fase de planejamento identificável (ex: `agentmap_workflows_iniciar_trabalho`).

### Handoff entre agentes

Preservar correlação:
- `agentmap.handoff.id`
- `agentmap.correlation.id`

Se propagation de contexto entre processos for possível, propagar contexto OpenTelemetry. Caso contrário, usar `correlationId` como ponte.

---

## 15. Context Propagation

Dentro do mesmo processo (síncrono), usar `tracer.startActiveSpan()` para que operações filhas sejam automaticamente associadas ao span ativo.

Trace esperado:
```
invoke_agent AGT-BACKEND
    ↓
execute_tool criar_solicitacao_alteracao
    ↓
service → filesystem (span automático via auto-instrumentation)
```

Isso permite que o trace completo seja reconstruído mesmo com operações internas de filesystem/HTTP.

---

## 16. Integração com Documento 1 (MCP Subscriptions)

O Documento 1 já implementa:
- `ResourceChangedEvent` no EventBus
- `sendResourceUpdated` para notificações MCP

O Documento 2 deve instrumentar esses eventos:

```text
execute_tool criar_solicitacao_alteracao
   │
   ├── persist JSON
   │
   └── resource.updated (span filho)
```

Isso cria correlação direta entre:
```
MCP coordination + OpenTelemetry observability
```

---

## 17. Sampling

### Desenvolvimento
```text
100% dos traces
```

### Produção
Configurável via variáveis de ambiente:
```text
OTEL_TRACES_SAMPLER
OTEL_TRACES_SAMPLER_ARG
```

Regras:
- Erros = prioridade alta (sempre amostrar)
- Operações normais = sampling configurável

---

## 18. Tratamento de Falha do Exporter

**Regra fundamental:** falha de observabilidade não derruba o AgentMap.

```text
business logic ≠ telemetry export
```

Se o Collector estiver DOWN:
- O AgentMap continua funcionando
- A falha gera `telemetry error` (log interno)
- Não gera `tool failure` para o usuário

Implementar `fail_silently` no exporter. O OpenTelemetry SDK já suporta esse comportamento por padrão.

---

## 19. Implementação em Fases

### Fase 1 — Foundation (Dia 1-2)

**Objetivo:** SDK funcionando com ConsoleSpanExporter.

- [ ] Instalar dependências (fixadas)
- [ ] Criar `backend/src/observability/index.ts` (bootstrap)
- [ ] Criar `backend/src/observability/tracing.ts` (NodeSDK + Resource + ConsoleSpanExporter)
- [ ] Criar `backend/src/observability/gen-ai.ts` (constantes e helpers)
- [ ] Chamar bootstrap no entry point **antes** de outros imports
- [ ] Validar: `service.name = agentmap-backend` aparece nos spans

### Fase 2 — MCP Tools Tracing (Dia 3-4)

**Objetivo:** 10-15 tools mais usadas instrumentadas.

- [ ] Criar `backend/src/observability/tool-tracing.ts` (`registerTracedTool`, `executeToolWithTracing`)
- [ ] Criar `backend/src/observability/sanitization.ts`
- [ ] Migrar 10-15 tools prioritárias:
  - `agentmap_tarefas_criar`
  - `agentmap_tarefas_listar`
  - `agentmap_solicitacoes_criar`
  - `agentmap_solicitacoes_listar`
  - `agentmap_handoffs_criar`
  - `agentmap_handoffs_listar`
  - `agentmap_bloqueios_criar`
  - `agentmap_bloqueios_listar`
  - `agentmap_projetos_abrir`
  - `agentmap_agentes_listar`
  - `agentmap_workflows_iniciar_trabalho`
  - `agentmap_workflows_finalizar_trabalho`
  - `agentmap_eventos_criar`
  - `agentmap_handoffs_criar`
- [ ] Validar: cada chamada imprime span com `gen_ai.*` no console

### Fase 3 — Agent Lifecycle (Dia 5)

**Objetivo:** Trace completo de ciclo de agente.

- [ ] Criar `backend/src/observability/agent-tracing.ts` (`invoke_agent`, `plan`)
- [ ] Integrar `withAgentTrace` nos workflows:
  - `agentmap_workflows_iniciar_trabalho`
  - `agentmap_workflows_finalizar_trabalho`
- [ ] Validar hierarquia: `invoke_agent` → `execute_tool` → `fs.readFile`

### Fase 4 — Domain Attributes (Dia 5)

**Objetivo:** Atributos `agentmap.*` em spans relevantes.

- [ ] Criar `backend/src/observability/attributes.ts`
- [ ] Aplicar `agentmap.project.id`, `agentmap.task.id`, `agentmap.session.id`, `agentmap.correlation.id`, `agentmap.handoff.id`
- [ ] Validar: spans contêm atributos próprios sem poluir `gen_ai.*`

### Fase 5 — Metrics (Dia 6)

**Objetivo:** Métricas OpenTelemetry funcionando.

- [ ] Criar `backend/src/observability/metrics.ts`
- [ ] Implementar counters e histograms:
  - `agentmap.tool.executions`
  - `agentmap.tool.errors`
  - `agentmap.tool.duration`
  - `agentmap.agent.executions`
  - `agentmap.agent.duration`
- [ ] Validar: métricas aparecem no console/OTLP

### Fase 6 — OTLP & Exporter (Dia 6-7)

**Objetivo:** Produção pronta.

- [ ] Criar `backend/src/observability/exporters/otlp.ts`
- [ ] Configurar `OTLPTraceExporter` + `OTLPMetricExporter`
- [ ] Variáveis de ambiente:
  - `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
  - `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`
  - `OTEL_SERVICE_NAME`
  - `OTEL_SERVICE_VERSION`
  - `OTEL_TRACES_SAMPLER`
- [ ] Validar: Collector pode ser configurado externamente

### Fase 7 — Dashboard & API (Dia 7)

**Objetivo:** Visão agregada na interface Web.

- [ ] Criar `backend/src/api/observabilidade.ts` (`GET /api/observabilidade/metricas`)
- [ ] Integrar no frontend (nova aba ou card no dashboard)
- [ ] Validar: endpoint retorna dados agregados coerentes

### Fase 8 — Correlação entre Agentes (Dia 7+)

**Objetivo:** Trace preserva handoff → invoke_agent.

- [ ] Instrumentar `agentmap_handoffs_criar` com `agentmap.handoff.id`
- [ ] Propagação de `correlationId` entre spans de agentes diferentes
- [ ] Validar: trace de handoff → invoke_agent mantém correlação

---

## 20. Testes de Validação

### Teste 1 — Inicialização
Backend inicia sem erro. `service.name = agentmap-backend` confirmado.

### Teste 2 — Tool span
Executar `agentmap_tarefas_criar` e confirmar span `execute_tool agentmap_tarefas_criar` com `gen_ai.tool.name`.

### Teste 3 — Status OK
Span com `SpanStatusCode.OK` após execução bem-sucedida.

### Teste 4 — Erro
Forçar `ValidationError` e confirmar:
- `status = ERROR`
- `exception event`
- `error.type = ValidationError`

### Teste 5 — Hierarquia
Executar `invoke_agent` que chama 3 tools. Confirmar:
```
invoke_agent AGT-BACKEND
├── execute_tool A
├── execute_tool B
└── execute_tool C
```

### Teste 6 — Contexto
`traceId(invoke_agent) == traceId(execute_tool)` e `parentSpan(execute_tool) == invoke_agent`.

### Teste 7 — Métricas
Executar 10 tools, confirmar `agentmap.tool.executions = 10`. Forçar 2 erros, confirmar `agentmap.tool.errors = 2`.

### Teste 8 — Cardinalidade
Executar 10.000 requests diferentes. Confirmar que métrica não cria 10.000 séries.

### Teste 9 — Sanitização
Enviar argumentos com `apiKey`, `password`, `token`. Confirmar que não aparecem na telemetria.

### Teste 10 — Shutdown
Enviar `SIGTERM` e confirmar que telemetria pendente é exportada antes do encerramento.

---

## 21. Critérios de Aceite (Checklist Final)

### OpenTelemetry
- [ ] Dependências instaladas e fixadas no `package.json`
- [ ] SDK inicializado no bootstrap antes de outros imports
- [ ] `service.name`, `service.version`, `service.namespace` configurados
- [ ] ConsoleSpanExporter funciona em desenvolvimento
- [ ] OTLPTraceExporter + OTLPMetricExporter funcionam em produção
- [ ] Falha do Collector não derruba o AgentMap

### GenAI Semantic Conventions
- [ ] `gen_ai.operation.name` utilizado corretamente (`invoke_agent`, `execute_tool`, `plan`)
- [ ] `gen_ai.agent.id` representa ID estável do agente
- [ ] `gen_ai.tool.name` presente em todos os spans de tool
- [ ] `gen_ai.tool.call.id` utilizado quando disponível
- [ ] `gen_ai.tool.type` utilizado quando disponível
- [ ] Argumentos/resultados de tools são opt-in (OFF por padrão)

### AgentMap
- [ ] `agentmap.project.id`, `agentmap.task.id`, `agentmap.session.id`, `agentmap.correlation.id`, `agentmap.request.id`, `agentmap.handoff.id`
- [ ] Sanitização implementada e testada
- [ ] Cardinalidade controlada (sem IDs high-cardinality em métricas)

### Traces
- [ ] Trace do agente (`invoke_agent`)
- [ ] Spans de tools (`execute_tool`)
- [ ] Spans filhos corretamente associados (hierarquia)
- [ ] Exceções registradas com `recordException()`
- [ ] Status de erro correto com `error.type`
- [ ] Correlação entre agentes via `correlationId` e `handoff.id`

### Metrics
- [ ] `agentmap.tool.executions` (counter)
- [ ] `agentmap.tool.errors` (counter)
- [ ] `agentmap.tool.duration` (histogram)
- [ ] `agentmap.agent.executions` (counter)
- [ ] `agentmap.agent.duration` (histogram)
- [ ] Cardinalidade controlada

### Dashboard
- [ ] `GET /api/observabilidade/metricas` implementado
- [ ] Endpoint retorna visão agregada (não é fonte primária)
- [ ] Interface Web exibe dados

### Integração com Documento 1
- [ ] `ResourceChangedEvent` instrumentado como span filho
- [ ] Trace mostra: `execute_tool → persist → resource.updated`

---

## 22. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| `gen_ai.*` conventions mudam | Fixar versão + camada de adaptação (`gen-ai.ts`) |
| Alta cardinalidade em métricas | Política rigorosa: apenas `tool.name`, `status`, `agent.id` |
| Vazamento de dados sensíveis | Sanitização obrigatória + opt-in para arguments/results |
| Collector DOWN derruba app | `fail_silently` + observabilidade não é dependência crítica |
| Performance impact | Auto-instrumentation seletiva + sampling configurável |
| Instrumentação manual de 124 tools | Wrapper `registerTracedTool` — instrumentação uma vez, reuso sempre |

---

## 23. Referências

- OpenTelemetry GenAI Semantic Conventions: https://github.com/open-telemetry/semantic-conventions-genai
- OpenTelemetry Node.js SDK: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry Instrumentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Exporters: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry Resources: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Metrics: https://opentelemetry.io/docs/concepts/metrics/

---

## 24. Próximos Passos

1. Aprovar este plano
2. Criar branch `feat/observability-opentelemetry`
3. Implementar Fase 1 (Foundation)
4. Validar com testes automatizados
5. Commitar e abrir PR
