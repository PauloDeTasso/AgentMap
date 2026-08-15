Sim. Revisei o **Documento 2/5 — Observabilidade com OpenTelemetry GenAI** que você enviou e confrontei a proposta com a documentação oficial atual do OpenTelemetry para JavaScript/Node.js e com as **GenAI Semantic Conventions atuais**, incluindo as convenções específicas para agentes e execução de tools. O documento original está bem direcionado, mas há alguns pontos importantes que precisam ser corrigidos antes de transformá-lo em especificação de implementação. 

A principal correção é esta: **não devemos tratar `gen_ai.*` simplesmente como um conjunto estável de atributos 1.0**. As convenções GenAI continuam em desenvolvimento, e várias convenções atuais já foram reorganizadas no repositório específico de GenAI. Ao mesmo tempo, a modelagem de `execute_tool`, `invoke_agent`, `plan`, `gen_ai.tool.call.id`, argumentos/resultados e métricas evoluiu bastante. ([OpenTelemetry][1])

Também há um problema no documento original: ele pretende criar métricas agregadas por agente via um endpoint REST, mas instala apenas componentes de tracing e **não configura corretamente uma pipeline de métricas OpenTelemetry**. O `NodeSDK` suporta métricas por meio de `MetricReader`/exporter, e produção deve preferencialmente usar OTLP/Collector. ([OpenTelemetry][2])

Abaixo está a versão que eu recomendaria usar como especificação técnica atualizada.

---

# 📄 Documento 2/5 — Observabilidade OpenTelemetry para Agentes, MCP e GenAI

> **Ordem de implementação:** 2ª de 5
> **Prioridade:** Alta
> **Esforço estimado:** Médio/Alto — 4 a 7 dias de implementação + validação
> **Depende de:** Documento 1 — MCP Resources/Subscriptions
> **Projeto alvo:** AgentMap
> **Stack:** Node.js + TypeScript + Express + MCP Server
> **Observabilidade:** OpenTelemetry
> **Tracing:** OpenTelemetry Traces
> **Metrics:** OpenTelemetry Metrics
> **Logs:** OpenTelemetry Logs — fase posterior
> **GenAI:** OpenTelemetry GenAI Semantic Conventions
> **Exportação recomendada:** OTLP → OpenTelemetry Collector → backend de observabilidade

---

# 1. Objetivo

Instrumentar o AgentMap para transformar a execução dos agentes em **telemetria distribuída, correlacionável e consultável**.

O objetivo não é simplesmente registrar logs.

O objetivo é conseguir reconstruir uma execução:

```text
Agente
  ↓
ciclo operacional
  ↓
planejamento
  ↓
tool MCP
  ↓
serviço
  ↓
arquivo/DB
  ↓
resultado
  ↓
handoff
  ↓
outro agente
```

como um **trace distribuído**.

O sistema deverá permitir responder perguntas como:

* Qual agente executou determinada operação?
* Qual tarefa originou a operação?
* Qual tool foi chamada?
* Quanto tempo a tool levou?
* A tool falhou?
* Qual foi o erro?
* Qual sequência de tools ocorreu?
* Qual solicitação/handoff originou aquela execução?
* Onde ocorreu a maior latência?
* Quantas chamadas foram realizadas?
* Qual agente possui maior taxa de erro?
* Quais tools são mais utilizadas?
* Quanto tempo cada ciclo de agente consome?
* Quais operações geram mais falhas?
* Qual foi a cadeia entre agentes?

OpenTelemetry fornece o modelo padronizado para traces, metrics, logs e resources. ([OpenTelemetry][3])

---

# 2. Correção conceitual importante

O documento original descreve:

> "`gen_ai.*`, criadas especificamente para sistemas de IA/agentes."

Isso está conceitualmente correto, mas precisa de uma ressalva.

As **GenAI Semantic Conventions estão em desenvolvimento**, e a documentação atual já separa convenções GenAI em um repositório específico. Além disso, `gen_ai.operation.name` possui valores padronizados como:

```text
chat
create_agent
execute_tool
generate_content
invoke_agent
invoke_workflow
plan
retrieval
```

entre outros. ([OpenTelemetry][1])

Portanto:

> **O AgentMap deve usar as convenções oficiais existentes, mas deve evitar depender de atributos experimentais sem encapsulamento próprio.**

A arquitetura deverá ter uma camada:

```text
AgentMap
   ↓
Observability Adapter
   ↓
OpenTelemetry API
   ↓
GenAI Semantic Conventions
```

Assim, uma eventual alteração futura das convenções não exige modificar as 100+ tools.

---

# 3. O que muda

| Antes                               | Depois                                   |
| ----------------------------------- | ---------------------------------------- |
| Histórico principalmente em JSON    | JSON + telemetria OpenTelemetry          |
| Resultado final sem árvore temporal | Trace completo                           |
| Difícil reconstruir sequência       | Trace pai/filho                          |
| Tools sem tracing uniforme          | Cada tool possui span padronizado        |
| Métricas calculadas manualmente     | OpenTelemetry Metrics                    |
| Erros espalhados em logs            | `error.type`, status e exception         |
| Correlação manual                   | `trace_id`, `span_id`, contexto          |
| Observabilidade proprietária        | OTLP                                     |
| Debug lendo arquivos                | Trace visual                             |
| Agentes isolados                    | Execuções correlacionáveis entre agentes |

---

# 4. Arquitetura de observabilidade

A arquitetura recomendada é:

```text
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

O uso de OTLP e Collector é preferível em produção, pois desacopla a aplicação do backend específico de observabilidade. A documentação oficial do OpenTelemetry recomenda o Collector em ambientes de produção. ([OpenTelemetry][2])

---

# 5. Resources do OpenTelemetry

O AgentMap não deve confundir:

```text
MCP Resource
```

com:

```text
OpenTelemetry Resource
```

São conceitos completamente diferentes.

### MCP Resource

Representa algo que o agente pode ler:

```text
agentmap://solicitacoes/AGT-BACKEND
```

### OpenTelemetry Resource

Representa a entidade que produz a telemetria:

```text
service.name = agentmap-backend
service.version = 1.0.0
```

O OpenTelemetry associa Resources aos spans e métricas produzidos pelo provider. `service.name` deve ser definido explicitamente; caso contrário o SDK pode utilizar `unknown_service`. ([OpenTelemetry][4])

---

# 6. Resource recomendado

Definir:

```text
service.name
service.version
service.namespace
service.instance.id
deployment.environment.name
```

Exemplo:

```text
service.name = agentmap-backend
service.version = 0.1.0
service.namespace = agentmap
deployment.environment.name = development
```

Não utilizar:

```text
agentId
taskId
requestId
correlationId
```

como atributos de **Resource**.

Esses valores pertencem à operação/span.

O Resource representa a entidade observada e é associado aos providers durante sua criação. ([OpenTelemetry][5])

---

# 7. Dependências

O documento original propõe:

```bash
npm install @opentelemetry/api
npm install @opentelemetry/sdk-node
npm install @opentelemetry/auto-instrumentations-node
npm install @opentelemetry/semantic-conventions
```

Isso deve ser ampliado.

Para produção com OTLP:

```bash
npm install @opentelemetry/api
npm install @opentelemetry/sdk-node
npm install @opentelemetry/auto-instrumentations-node
npm install @opentelemetry/resources
npm install @opentelemetry/semantic-conventions
npm install @opentelemetry/exporter-trace-otlp-proto
npm install @opentelemetry/exporter-metrics-otlp-proto
npm install @opentelemetry/sdk-metrics
```

A documentação oficial atual mostra `OTLPTraceExporter` e `OTLPMetricExporter` para Node.js e `PeriodicExportingMetricReader` para métricas. ([OpenTelemetry][2])

---

# 8. Inicialização do OpenTelemetry

O documento original utiliza:

```typescript
const sdk = new NodeSDK({
  serviceName: "agentmap-backend",
});
```

A abordagem atual deve preferencialmente configurar explicitamente o `Resource`.

Exemplo:

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

import { OTLPTraceExporter } from
  "@opentelemetry/exporter-trace-otlp-proto";

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "agentmap-backend",
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "dev",
  }),

  traceExporter: new OTLPTraceExporter({
    url:
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
      "http://localhost:4318/v1/traces",
  }),
});

sdk.start();
```

A documentação oficial mostra explicitamente essa abordagem de configuração de `service.name`/`service.version`. ([OpenTelemetry][6])

---

# 9. Não iniciar o SDK tarde demais

Este ponto do documento original está correto em essência, mas precisa ser implementado corretamente.

A instrumentação automática precisa ser carregada **antes das bibliotecas que serão instrumentadas**.

Não fazer simplesmente:

```typescript
import express from "express";

iniciarObservabilidade();
```

e esperar que toda auto-instrumentação funcione.

Preferir um bootstrap dedicado:

```text
backend/
├── src/
│   ├── instrumentation.ts
│   ├── server.ts
│   └── ...
```

e iniciar o processo com o mecanismo apropriado de preload/import.

A documentação atual do OpenTelemetry JavaScript apresenta esse modelo de inicialização de instrumentation antes da aplicação. ([OpenTelemetry][6])

---

# 10. Console Exporter

O documento original propõe:

```typescript
ConsoleSpanExporter()
```

para a primeira fase.

Isso é adequado para desenvolvimento/debug.

Não deve permanecer como exportador de produção.

Fluxo:

```text
DESENVOLVIMENTO

AgentMap
   ↓
ConsoleSpanExporter
   ↓
terminal
```

Produção:

```text
PRODUÇÃO

AgentMap
   ↓
OTLP
   ↓
Collector
   ↓
backend
```

O próprio OpenTelemetry recomenda exportadores apropriados para visualização/produção e apresenta OTLP como formato preferencial para interoperabilidade. ([OpenTelemetry][2])

---

# 11. Três níveis de tracing do AgentMap

A arquitetura deve possuir três níveis.

## Nível 1 — Agent

```text
invoke_agent
```

Representa o ciclo completo do agente.

---

## Nível 2 — Planejamento

Quando for possível identificar claramente a fase:

```text
plan
```

A convenção GenAI atual define `plan` especificamente para planejamento/decomposição de tarefas. ([GitHub][7])

---

## Nível 3 — Tool

```text
execute_tool
```

Cada tool executada recebe seu próprio span.

A convenção atual define `execute_tool` e recomenda o nome:

```text
execute_tool {gen_ai.tool.name}
```

com `gen_ai.operation.name = execute_tool`. ([GitHub][8])

---

# 12. Hierarquia dos spans

Exemplo real do AgentMap:

```text
invoke_agent AGT-BACKEND
│
├── plan
│
├── execute_tool criar_tarefa
│   └── database/file operation
│
├── execute_tool consultar_contrato
│   └── database/file operation
│
├── execute_tool criar_solicitacao_alteracao
│   └── filesystem
│
└── execute_tool criar_handoff
    └── filesystem
```

Esse trace permite visualizar exatamente a sequência operacional.

---

# 13. Span de agente

Criar:

```typescript
const span = tracer.startSpan(
  `invoke_agent ${agentName}`,
);
```

Atribuir:

```text
gen_ai.operation.name = invoke_agent
gen_ai.agent.id
gen_ai.agent.name
gen_ai.agent.version
```

Quando disponível.

A convenção oficial atual define `invoke_agent` tanto para agentes remotos quanto internos, diferenciando o `SpanKind` conforme o cenário. ([GitHub][7])

Para o AgentMap, quando o agente roda dentro do próprio processo:

```text
SpanKind.INTERNAL
```

é a opção natural.

---

# 14. Span de planejamento

Quando a arquitetura conseguir identificar explicitamente que o agente está planejando:

```text
plan
```

Exemplo:

```text
invoke_agent AGT-BACKEND
   │
   ├── plan
   │
   ├── execute_tool ...
   └── execute_tool ...
```

Não criar um span `plan` artificialmente para qualquer chamada LLM.

A convenção oficial especifica que o span `plan` deve ser utilizado quando a instrumentação consegue determinar que aquela operação é realmente uma fase de planejamento/decomposição. ([GitHub][7])

---

# 15. Span de tool

O helper original:

```typescript
comTracingDeTool()
```

deve ser mantido conceitualmente, mas melhorado.

```typescript
export async function executeToolWithTracing<T>(
  params: {
    toolName: string;
    agentId?: string;
    toolCallId?: string;
    toolType?: string;
  },
  fn: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(
    `execute_tool ${params.toolName}`,
    async (span) => {

      span.setAttribute(
        "gen_ai.operation.name",
        "execute_tool",
      );

      span.setAttribute(
        "gen_ai.tool.name",
        params.toolName,
      );

      if (params.toolCallId) {
        span.setAttribute(
          "gen_ai.tool.call.id",
          params.toolCallId,
        );
      }

      if (params.toolType) {
        span.setAttribute(
          "gen_ai.tool.type",
          params.toolType,
        );
      }

      try {
        const result = await fn();

        span.setStatus({
          code: SpanStatusCode.OK,
        });

        return result;

      } catch (error) {

        span.recordException(error as Error);

        span.setStatus({
          code: SpanStatusCode.ERROR,
        });

        throw error;

      } finally {
        span.end();
      }
    },
  );
}
```

---

# 16. Correção importante: `recordException()`

O documento original fazia:

```typescript
span.setStatus({
  code: SpanStatusCode.ERROR,
  message: String(erro),
});
```

Isso é insuficiente.

Devemos registrar a exceção:

```typescript
span.recordException(error);
```

e então:

```typescript
span.setStatus({
  code: SpanStatusCode.ERROR,
});
```

Isso permite que a telemetria registre a exceção de maneira estruturada, em vez de colocar tudo apenas em uma mensagem textual.

---

# 17. `error.type`

Quando possível, registrar:

```text
error.type
```

com valor de baixa cardinalidade.

Exemplos:

```text
ValidationError
NotFoundError
AuthorizationError
TimeoutError
InternalError
```

Evitar:

```text
error.type =
"Error: arquivo /home/user/projeto/.ia/tarefas/123..."
```

porque isso gera cardinalidade e exposição de dados desnecessárias.

As convenções atuais recomendam que `error.type` seja um identificador de erro de baixa cardinalidade. ([GitHub][7])

---

# 18. Identificador do agente

O documento original utiliza:

```typescript
gen_ai.agent.id = agenteId
```

Isso é aceitável **se `agenteId` for um identificador estável do agente**.

Não utilizar um ID de instância temporário.

A documentação atual especifica que `gen_ai.agent.id` deve representar um identificador estável e não recomenda IDs transitórios de instâncias em memória. ([GitHub][7])

Portanto:

```text
AGT-BACKEND
```

é adequado.

Enquanto:

```text
session-7f89c...
```

não deve ser colocado como `gen_ai.agent.id`.

---

# 19. Atributos próprios do AgentMap

As convenções GenAI não precisam carregar todas as informações internas do projeto.

Criar atributos próprios sob namespace do AgentMap.

Por exemplo:

```text
agentmap.project.id
agentmap.task.id
agentmap.session.id
agentmap.correlation.id
agentmap.request.id
agentmap.handoff.id
agentmap.request.id
```

Exemplo:

```typescript
span.setAttribute(
  "agentmap.project.id",
  projectId,
);

span.setAttribute(
  "agentmap.task.id",
  taskId,
);
```

Isso preserva a separação:

```text
gen_ai.*
    ↓
semântica GenAI padronizada

agentmap.*
    ↓
semântica específica do domínio
```

---

# 20. Não colocar tudo no span

O documento original sugere registrar vários identificadores.

Isso é útil, mas não significa que **todo span deve carregar todos os IDs**.

Regra:

### Span de agente

```text
agentmap.project.id
agentmap.task.id
agentmap.session.id
agentmap.correlation.id
```

quando disponíveis.

### Span de tool

```text
agentmap.task.id
agentmap.correlation.id
```

quando disponíveis.

### Span interno de filesystem

Somente o contexto realmente necessário.

Isso reduz cardinalidade e volume.

---

# 21. Tool call ID

A convenção atual possui:

```text
gen_ai.tool.call.id
```

e recomenda seu uso quando disponível. ([GitHub][8])

Portanto, se o MCP/Kilo Code fornecer um identificador da chamada:

```text
gen_ai.tool.call.id
```

deve ser utilizado.

Exemplo:

```text
tool:
criar_solicitacao_alteracao

call.id:
call_01J...
```

Isso permite correlacionar:

```text
agente
→ tool
→ chamada específica
→ resultado
```

---

# 22. Argumentos da tool

A convenção atual permite:

```text
gen_ai.tool.call.arguments
```

mas esse campo é **opt-in**. ([GitHub][8])

Portanto:

> **Não registrar automaticamente os argumentos completos das 100+ tools.**

Isso pode causar:

* vazamento de segredos;
* PII;
* tokens;
* conteúdo de arquivos;
* prompts;
* informações de infraestrutura;
* aumento enorme do volume de telemetria.

Criar uma política:

```text
default:
arguments = OFF

allowlist:
arguments = ON
```

---

# 23. Resultado da tool

Mesma regra.

O resultado pode ser:

```text
gen_ai.tool.call.result
```

quando apropriado, mas deve ser tratado como conteúdo potencialmente sensível.

Por padrão:

```text
resultado completo = OFF
```

Registrar apenas:

```text
tool.result.status
tool.result.size
tool.result.type
```

ou equivalentes internos, quando necessários.

---

# 24. Exemplo de span seguro

```text
Span:
execute_tool criar_solicitacao_alteracao

gen_ai.operation.name:
execute_tool

gen_ai.tool.name:
criar_solicitacao_alteracao

gen_ai.tool.call.id:
call_123

gen_ai.tool.type:
function

agentmap.project.id:
PROJ-001

agentmap.task.id:
TASK-042

agentmap.agent.id:
AGT-BACKEND

duration:
183 ms

status:
OK
```

Não registrar:

```text
senha
token
prompt completo
arquivo inteiro
resultado inteiro
```

---

# 25. MCP como domínio de instrumentação

Como o AgentMap possui MCP Server, deve existir uma camada explícita:

```text
MCP Request
      ↓
AgentMap MCP Handler
      ↓
OpenTelemetry span
      ↓
Tool
      ↓
Service
```

Idealmente:

```text
execute_tool
   │
   └── MCP operation
          │
          └── AgentMap service
```

O documento original está correto ao identificar as tools MCP como pontos naturais de instrumentação. 

---

# 26. Não instrumentar manualmente 124 tools uma por uma

O documento original recomenda começar pelas 10–15 tools mais usadas. Essa recomendação é boa, mas a arquitetura final deve evitar duplicação.

Criar um wrapper central:

```typescript
registerTracedTool(...)
```

Exemplo:

```typescript
registerTracedTool(
  server,
  "criar_solicitacao_alteracao",
  schema,
  async (input, context) => {
    return servicoSolicitacoes.criar(input);
  },
);
```

Internamente:

```text
registerTracedTool()
       ↓
registerTool()
       ↓
executeToolWithTracing()
       ↓
handler original
```

Assim, depois da migração, novas tools já nascem instrumentadas.

---

# 27. Instrumentação automática

O `getNodeAutoInstrumentations()` deve ser utilizado para bibliotecas suportadas.

Isso pode gerar automaticamente spans para:

* HTTP;
* Express;
* filesystem;
* DNS;
* outros módulos suportados.

Mas isso não substitui os spans de domínio.

A arquitetura deve ter:

```text
Auto Instrumentation
        +
Manual Instrumentation
        +
GenAI Semantic Conventions
```

---

# 28. Trace completo do AgentMap

Exemplo:

```text
invoke_agent AGT-BACKEND
│
├── plan
│
├── execute_tool consultar_tarefa
│   └── fs.readFile
│
├── execute_tool consultar_contrato
│   └── fs.readFile
│
├── execute_tool criar_solicitacao_alteracao
│   ├── fs.readFile
│   └── fs.writeFile
│
└── execute_tool criar_handoff
    ├── fs.readFile
    └── fs.writeFile
```

Isso permite identificar rapidamente:

```text
Tool lenta
Filesystem lento
Serviço lento
Falha de validação
Falha de autorização
```

---

# 29. Context propagation

O OpenTelemetry deve manter o contexto entre:

```text
HTTP
 ↓
MCP
 ↓
service
 ↓
filesystem
```

Quando a operação é síncrona dentro do mesmo processo, utilizar:

```typescript
tracer.startActiveSpan(...)
```

em vez de apenas:

```typescript
tracer.startSpan(...)
```

quando o objetivo for que operações filhas sejam automaticamente associadas ao span ativo.

Isso é especialmente importante para o trace:

```text
invoke_agent
    ↓
execute_tool
        ↓
database/file/http
```

---

# 30. Ciclo completo do agente

O documento original chama isso de:

> span "guarda-chuva".

O conceito deve ser preservado, mas o nome semântico recomendado é:

```text
invoke_agent
```

Exemplo:

```text
invoke_agent AGT-BACKEND
```

Esse span engloba:

```text
plan
execute_tool
execute_tool
execute_tool
handoff
```

A convenção oficial atual define `invoke_agent` como operação de invocação de agente. ([GitHub][7])

---

# 31. Handoff entre agentes

O AgentMap possui handoffs.

Isso cria uma oportunidade importante:

```text
Agent A
   │
   └── criar_handoff
          │
          ▼
     Agent B
          │
          └── invoke_agent
```

O trace deve preservar a correlação:

```text
agentmap.handoff.id
agentmap.correlation.id
```

Se a arquitetura utilizar propagação de contexto entre processos, o contexto OpenTelemetry também deve ser propagado.

Caso isso não seja possível inicialmente, utilizar `correlationId` como ponte de correlação.

---

# 32. Métricas

Aqui está uma das maiores correções do documento original.

O endpoint:

```text
GET /api/observabilidade/metricas
```

não deve ser a fonte primária das métricas.

O OpenTelemetry Metrics deve ser a fonte primária.

Exemplos:

```text
agentmap.tool.executions
agentmap.tool.errors
agentmap.tool.duration
agentmap.agent.executions
agentmap.agent.duration
```

---

# 33. Métrica de execução de tools

Criar um Counter:

```text
agentmap.tool.executions
```

Atributos de baixa cardinalidade:

```text
tool.name
tool.type
status
```

Evitar:

```text
task.id
request.id
session.id
tool.call.id
```

como dimensões de métricas.

Esses IDs possuem cardinalidade alta e devem permanecer principalmente em traces.

---

# 34. Métrica de duração

Criar Histogram:

```text
agentmap.tool.duration
```

Unidade:

```text
ms
```

ou unidade temporal consistente com a convenção adotada pelo SDK.

Dimensões:

```text
tool.name
status
```

---

# 35. Métricas por agente

É possível medir:

```text
agentmap.agent.executions
agentmap.agent.duration
```

com:

```text
agent.id
status
```

Mas `agent.id` só deve ser usado se a cardinalidade for controlada.

Para o AgentMap, onde a quantidade de agentes tende a ser pequena, isso é aceitável.

---

# 36. Endpoint REST

O endpoint:

```text
GET /api/observabilidade/metricas
```

pode existir, mas deve ser tratado como:

> **API de consulta do dashboard**, e não como substituto do OpenTelemetry Metrics.

Arquitetura:

```text
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

# 37. Exemplo de resposta do dashboard

```json
{
  "periodo": {
    "inicio": "2026-08-15T00:00:00Z",
    "fim": "2026-08-15T23:59:59Z"
  },
  "agentes": [
    {
      "agentId": "AGT-BACKEND",
      "totalExecucoes": 42,
      "duracaoMediaMs": 3200,
      "taxaErro": 0.02
    }
  ]
}
```

Isso é uma visão derivada.

Não deve ser o armazenamento primário da telemetria.

---

# 38. Logs

Não é necessário implementar OpenTelemetry Logs na primeira etapa.

Prioridade:

```text
1. Traces
2. Metrics
3. Logs
```

Porque o problema central do AgentMap é reconstruir:

```text
o que o agente fez
```

e:

```text
quanto tempo levou
```

Traces resolvem isso diretamente.

---

# 39. Correlação com logs

Mesmo antes de migrar todos os logs para OpenTelemetry, os logs do AgentMap devem incluir:

```text
trace_id
span_id
```

quando houver contexto ativo.

Exemplo:

```json
{
  "level": "info",
  "message": "Solicitação criada",
  "trace_id": "...",
  "span_id": "...",
  "agent_id": "AGT-BACKEND"
}
```

Isso permite:

```text
Log
 ↓
trace
 ↓
span
 ↓
tool
```

---

# 40. Sampling

Não registrar tudo indiscriminadamente em produção.

Inicialmente:

```text
development:
100%
```

Produção:

```text
sampling configurável
```

Exemplo:

```text
OTEL_TRACES_SAMPLER
OTEL_TRACES_SAMPLER_ARG
```

O OpenTelemetry suporta configuração do sampler por variáveis de ambiente. ([OpenTelemetry][9])

Para erros:

```text
erro = prioridade alta
```

Para operações normais:

```text
sampling configurável
```

---

# 41. Dados sensíveis

Este projeto manipula:

* prompts;
* tarefas;
* contratos;
* handoffs;
* arquivos;
* solicitações;
* resultados de agentes.

Portanto, observabilidade não pode significar:

```text
"copiar tudo para o trace"
```

Regra:

### Permitido

```text
tool name
agent id
task id
project id
duration
status
error type
sizes
counts
```

### Opt-in

```text
tool arguments
tool result
prompt
model output
```

### Proibido por padrão

```text
tokens
passwords
API keys
authorization headers
credentials
secrets
conteúdo integral de arquivos
```

---

# 42. Cardinalidade

Evitar colocar no atributo de métricas:

```text
requestId
sessionId
correlationId
toolCallId
```

Esses valores são excelentes para tracing.

São péssimos como dimensões de métricas.

### Traces

Alta cardinalidade:

```text
task.id
request.id
session.id
```

pode ser aceitável.

### Metrics

Preferir:

```text
tool.name
status
agent.id
```

---

# 43. Versionamento das convenções GenAI

O documento original recomenda fixar a versão.

Essa recomendação deve ser mantida, mas complementada.

O projeto deve registrar:

```text
OpenTelemetry SDK version
GenAI semantic convention version
AgentMap observability schema version
```

Exemplo:

```text
observability.schema.version = 1
```

Não inventar um atributo OTel oficial para isso sem necessidade; pode ser um atributo próprio:

```text
agentmap.observability.schema.version
```

---

# 44. Camada de compatibilidade

Criar:

```text
backend/src/observability/
├── index.ts
├── tracing.ts
├── metrics.ts
├── context.ts
├── gen-ai.ts
├── tool-tracing.ts
├── agent-tracing.ts
├── event-tracing.ts
└── sanitization.ts
```

Essa arquitetura evita que cada tool conheça diretamente os detalhes do OpenTelemetry.

---

# 45. `gen-ai.ts`

Centralizar os nomes:

```typescript
export const GenAI = {
  operation: {
    invokeAgent: "invoke_agent",
    executeTool: "execute_tool",
    plan: "plan",
  },
};
```

E helpers:

```typescript
export function setAgentAttributes(
  span: Span,
  agent: AgentContext,
) {
  span.setAttribute(
    "gen_ai.agent.id",
    agent.id,
  );

  if (agent.name) {
    span.setAttribute(
      "gen_ai.agent.name",
      agent.name,
    );
  }
}
```

Isso reduz erros de digitação e facilita futuras mudanças nas convenções.

---

# 46. Sanitização

Criar:

```typescript
sanitizeTelemetryValue()
```

e:

```typescript
sanitizeToolArguments()
```

Antes de qualquer conteúdo entrar na telemetria.

Exemplo:

```typescript
const safeArguments =
  sanitizeToolArguments(input);
```

Mas, por padrão:

```text
recordArguments = false
```

---

# 47. Testes

## Teste 1 — Inicialização

Backend inicia sem erro:

```text
OpenTelemetry initialized
```

---

## Teste 2 — Service Resource

Confirmar:

```text
service.name = agentmap-backend
```

---

## Teste 3 — Tool span

Executar:

```text
criar_solicitacao_alteracao
```

Esperar:

```text
execute_tool criar_solicitacao_alteracao
```

---

## Teste 4 — Status OK

Confirmar:

```text
SpanStatusCode.OK
```

---

## Teste 5 — Erro

Forçar:

```text
ValidationError
```

Esperar:

```text
status = ERROR
exception event
error.type = ValidationError
```

---

# 48. Teste de hierarquia

Executar:

```text
invoke_agent
```

que chama:

```text
tool A
tool B
tool C
```

Esperado:

```text
invoke_agent
├── execute_tool A
├── execute_tool B
└── execute_tool C
```

Não:

```text
invoke_agent

execute_tool A

execute_tool B

execute_tool C
```

como traces independentes.

---

# 49. Teste de contexto

Verificar:

```text
traceId(invoke_agent)
=
traceId(execute_tool)
```

e:

```text
parentSpan(execute_tool)
=
invoke_agent
```

quando executados no mesmo fluxo.

---

# 50. Teste de métricas

Executar:

```text
10 tools
```

e confirmar:

```text
agentmap.tool.executions = 10
```

Depois:

```text
2 erros
```

confirmar:

```text
agentmap.tool.errors = 2
```

---

# 51. Teste de cardinalidade

Executar 10.000 requests diferentes.

Confirmar que a métrica não cria 10.000 séries diferentes por:

```text
request.id
```

---

# 52. Teste de sanitização

Enviar:

```json
{
  "apiKey": "SECRET",
  "password": "SECRET",
  "token": "SECRET"
}
```

Confirmar que esses valores **não aparecem na telemetria**.

---

# 53. Teste de shutdown

Ao receber:

```text
SIGTERM
```

executar shutdown do OpenTelemetry SDK.

A aplicação deve permitir que a telemetria pendente seja exportada antes do encerramento.

---

# 54. Backend recomendado

Para desenvolvimento:

```text
AgentMap
   ↓
Console
```

Para ambiente local mais completo:

```text
AgentMap
   ↓
OTLP
   ↓
OpenTelemetry Collector
   ↓
Grafana Tempo
```

Para stack completa:

```text
             Collector
            /    |     \
           /     |      \
        Tempo  Prometheus Loki
           \     |      /
             Grafana
```

---

# 55. Docker Compose recomendado para desenvolvimento

A infraestrutura de observabilidade pode posteriormente possuir:

```text
docker-compose.observability.yml
```

contendo:

```text
otel-collector
grafana
tempo
prometheus
```

O AgentMap permanece independente desses componentes.

Se o Collector estiver indisponível:

```text
AgentMap
```

não deve parar de funcionar.

Observabilidade não pode virar dependência operacional crítica do sistema.

---

# 56. Tratamento de falha do exporter

Se:

```text
Collector DOWN
```

o AgentMap deve continuar funcionando.

Portanto:

```text
business logic
      ≠
telemetry export
```

A falha de observabilidade deve gerar:

```text
telemetry error
```

e não:

```text
tool failure
```

---

# 57. Relação com Documento 1

O Documento 1 cria:

```text
ResourceChangedEvent
```

O Documento 2 deve instrumentar esses eventos.

Exemplo:

```text
Agent A
   ↓
criarSolicitacao
   ↓
ResourceChangedEvent
   ↓
MCP notification
```

Trace:

```text
execute_tool criar_solicitacao_alteracao
   │
   ├── persist
   │
   └── resource.updated
```

Isso cria uma conexão direta entre:

```text
MCP coordination
+
OpenTelemetry observability
```

---

# 58. Trace de uma solicitação completa

O cenário ideal:

```text
invoke_agent AGT-BACKEND
│
├── plan
│
├── execute_tool consultar_tarefa
│
├── execute_tool consultar_contrato
│
├── execute_tool criar_solicitacao_alteracao
│     │
│     ├── persist JSON
│     │
│     └── ResourceChangedEvent
│
└── execute_tool criar_handoff
```

No agente destinatário:

```text
invoke_agent AGT-FRONTEND
│
└── execute_tool consultar_solicitacoes
```

Com correlação:

```text
agentmap.correlation.id
```

---

# 59. Observabilidade do sistema de agentes

O resultado final deverá permitir construir uma visão:

```text
PROJETO
│
├── AGT-BACKEND
│    ├── 42 execuções
│    ├── 3 erros
│    └── 2m31s total
│
├── AGT-FRONTEND
│    ├── 37 execuções
│    ├── 1 erro
│    └── 1m54s total
│
└── AGT-QA
     ├── 18 execuções
     ├── 0 erros
     └── 43s total
```

E:

```text
TOOL PERFORMANCE

consultar_tarefa
████████████ 120ms

criar_handoff
████████████████ 180ms

criar_solicitacao
██████████████████████ 420ms

consultar_contrato
████████████████████████████ 680ms
```

---

# 60. Critérios de aceite

## OpenTelemetry

* [ ] OpenTelemetry SDK instalado.
* [ ] `service.name` configurado.
* [ ] `service.version` configurado.
* [ ] Resource configurado corretamente.
* [ ] Tracing funcionando.
* [ ] Metrics funcionando.
* [ ] Exporter configurável por ambiente.

## GenAI

* [ ] `gen_ai.operation.name` utilizado corretamente.
* [ ] `invoke_agent` utilizado para ciclo de agente.
* [ ] `execute_tool` utilizado para execução de tools.
* [ ] `plan` utilizado somente quando houver planejamento identificável.
* [ ] `gen_ai.agent.id` representa ID estável.
* [ ] `gen_ai.tool.name` presente em tool spans.
* [ ] `gen_ai.tool.call.id` utilizado quando disponível.
* [ ] `gen_ai.tool.type` utilizado quando disponível.
* [ ] Argumentos de tools são opt-in.
* [ ] Resultados de tools são opt-in.

As convenções atuais explicitamente definem `execute_tool`, `gen_ai.tool.name`, `gen_ai.tool.call.id`, `gen_ai.tool.type` e campos opcionais para argumentos/resultados. ([GitHub][8])

## AgentMap

* [ ] `agentmap.project.id`.
* [ ] `agentmap.task.id`.
* [ ] `agentmap.session.id`.
* [ ] `agentmap.correlation.id`.
* [ ] `agentmap.request.id`.
* [ ] `agentmap.handoff.id`.
* [ ] Sanitização implementada.

## Traces

* [ ] Trace do agente.
* [ ] Spans de tools.
* [ ] Spans filhos corretamente associados.
* [ ] Exceções registradas.
* [ ] Status de erro correto.
* [ ] Correlação entre agentes.

## Metrics

* [ ] Contador de execuções.
* [ ] Contador de erros.
* [ ] Histogram de duração.
* [ ] Métricas por tool.
* [ ] Métricas por agente.
* [ ] Cardinalidade controlada.

## Exportação

* [ ] Console funciona em desenvolvimento.
* [ ] OTLP funciona.
* [ ] Collector pode ser configurado externamente.
* [ ] Falha do Collector não derruba o AgentMap.

## Dashboard

* [ ] `/api/observabilidade/metricas` implementado.
* [ ] Endpoint não é a fonte primária das métricas.
* [ ] Dashboard consegue exibir dados agregados.
* [ ] Trace pode ser investigado pelo backend escolhido.

---

# 61. Estrutura final de arquivos

Recomendo:

```text
backend/src/observability/
│
├── index.ts
│
├── tracing.ts
├── metrics.ts
├── context.ts
│
├── gen-ai.ts
├── agent-tracing.ts
├── tool-tracing.ts
│
├── sanitization.ts
├── attributes.ts
│
├── exporters/
│   ├── console.ts
│   └── otlp.ts
│
└── __tests__/
    ├── tracing.test.ts
    ├── metrics.test.ts
    ├── tool-tracing.test.ts
    └── sanitization.test.ts
```

---

# 62. Implementação em fases

## Fase 1 — Foundation

Implementar:

```text
OpenTelemetry API
NodeSDK
Resource
ConsoleSpanExporter
```

---

## Fase 2 — MCP Tools

Criar:

```text
registerTracedTool()
```

e instrumentar inicialmente:

```text
10–15 tools
```

---

## Fase 3 — Agent lifecycle

Adicionar:

```text
invoke_agent
plan
```

quando aplicável.

---

## Fase 4 — Domain attributes

Adicionar:

```text
agentmap.*
```

---

## Fase 5 — Metrics

Adicionar:

```text
tool.executions
tool.errors
tool.duration
agent.executions
agent.duration
```

---

## Fase 6 — OTLP

Adicionar:

```text
OTLPTraceExporter
OTLPMetricExporter
```

e Collector.

A documentação oficial fornece exatamente essa arquitetura de exportação para Node.js. ([OpenTelemetry][2])

---

## Fase 7 — Dashboard

Criar:

```text
/api/observabilidade/metricas
```

e interface visual.

---

## Fase 8 — Correlação entre agentes

Integrar:

```text
correlationId
handoff
trace context
```

---

# 63. Resultado final

A arquitetura final será:

```text
                         AGENTMAP
                            │
              ┌─────────────┴─────────────┐
              │                           │
          MCP Server                 REST API
              │                           │
              ▼                           ▼
        Agent / Tools               Dashboard
              │
              ▼
      ┌───────────────────┐
      │ OpenTelemetry     │
      │                   │
      │ Traces            │
      │ Metrics           │
      │ Context           │
      └─────────┬─────────┘
                │
                ▼
       OpenTelemetry Collector
                │
       ┌────────┼────────┐
       ▼        ▼        ▼
     Tempo  Prometheus  Loki
       │        │        │
       └────────┼────────┘
                ▼
             Grafana
```

---

# 64. Trace de referência

O trace que devemos conseguir visualizar é aproximadamente:

```text
invoke_agent AGT-BACKEND
│
├── plan
│
├── execute_tool consultar_tarefa
│   └── fs.readFile
│
├── execute_tool consultar_contrato
│   └── fs.readFile
│
├── execute_tool criar_solicitacao_alteracao
│   ├── fs.readFile
│   ├── fs.writeFile
│   └── resource.updated
│
└── execute_tool criar_handoff
    ├── fs.readFile
    └── fs.writeFile
```

Isso é muito mais poderoso do que simplesmente armazenar:

```json
{
  "agenteId": "AGT-BACKEND",
  "resultado": "OK"
}
```

O AgentMap passa a ter uma **linha temporal operacional completa**.

---

# 65. Correções principais em relação ao documento original

### ❌ Original

```text
gen_ai.agent.id
gen_ai.tool.name
```

sem uma política clara de cardinalidade.

### ✅ Atual

Separar:

```text
gen_ai.*
```

para semântica GenAI e:

```text
agentmap.*
```

para contexto de negócio.

---

### ❌ Original

Métricas via endpoint REST.

### ✅ Atual

```text
OpenTelemetry Metrics
        ↓
Collector
        ↓
backend
```

e REST apenas como visão do dashboard.

---

### ❌ Original

Apenas:

```text
setStatus(ERROR)
```

### ✅ Atual

```text
recordException()
+
setStatus(ERROR)
+
error.type
```

---

### ❌ Original

Argumentos/resultados não tratados.

### ✅ Atual

```text
arguments = opt-in
results = opt-in
```

por risco de dados sensíveis.

---

### ❌ Original

Span genérico:

```text
execute_tool {nome}
```

### ✅ Atual

Isso está alinhado com a convenção oficial atual para execução de tools. ([GitHub][8])

---

### ❌ Original

"span guarda-chuva" genérico.

### ✅ Atual

```text
invoke_agent
```

que corresponde à semântica GenAI atual. ([GitHub][7])

---

### ❌ Original

Não havia planejamento formal.

### ✅ Atual

```text
plan
```

quando a aplicação conseguir identificar verdadeiramente uma etapa de planejamento. ([GitHub][7])

---

### ❌ Original

Console como arquitetura de observabilidade.

### ✅ Atual

```text
Console = desenvolvimento
OTLP = produção
Collector = desacoplamento
```

O OpenTelemetry recomenda o Collector para produção. ([OpenTelemetry][2])

---

# 66. Conclusão técnica

O documento original estava **conceitualmente correto**, mas estava um nível abaixo do que eu consideraria uma especificação segura para implementação no AgentMap.

A versão atual deve seguir esta filosofia:

```text
                AGENTMAP
                   │
                   ▼
             DOMAIN EVENTS
                   │
                   ▼
          OPENTELEMETRY API
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
      TRACE      METRIC      LOG
        │          │
        └──────┬───┘
               ▼
             OTLP
               │
               ▼
           COLLECTOR
               │
               ▼
       OBSERVABILITY BACKEND
```

E, especificamente para os agentes:

```text
invoke_agent
     │
     ├── plan
     │
     ├── execute_tool
     │
     ├── execute_tool
     │
     ├── execute_tool
     │
     └── handoff
```

A grande vantagem é que o **Documento 1 e o Documento 2 passam a se encaixar arquiteturalmente**:

```text
DOCUMENTO 1
MCP Resources + Notifications
              │
              ▼
        ResourceChanged
              │
              ▼
DOCUMENTO 2
OpenTelemetry
              │
              ▼
       Trace + Metrics
```

Ou seja, o AgentMap não terá simplesmente "logs de agentes". Ele terá uma **camada de observabilidade distribuída capaz de reconstruir o comportamento operacional dos agentes, das tools MCP e da coordenação entre agentes**.

### Fontes oficiais verificadas

* OpenTelemetry — GenAI Semantic Conventions e atributos atuais. ([OpenTelemetry][1])
* OpenTelemetry — convenções específicas de agentes, `invoke_agent`, `plan` e `execute_tool`. ([GitHub][7])
* OpenTelemetry — convenção oficial para spans de execução de tools. ([GitHub][8])
* OpenTelemetry JavaScript — instrumentação e inicialização do NodeSDK. ([OpenTelemetry][6])
* OpenTelemetry JavaScript — exporters OTLP para traces e métricas. ([OpenTelemetry][2])
* OpenTelemetry — Resources e `service.name`. ([OpenTelemetry][4])
* O arquivo original utilizado como base desta revisão. 

[1]: https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/?utm_source=chatgpt.com "Gen AI | OpenTelemetry"
[2]: https://opentelemetry.io/pt/docs/languages/js/exporters/?utm_source=chatgpt.com "Exporters | OpenTelemetry"
[3]: https://opentelemetry.io/docs/concepts/semantic-conventions/?utm_source=chatgpt.com "Semantic Conventions | OpenTelemetry"
[4]: https://opentelemetry.io/docs/concepts/resources/?utm_source=chatgpt.com "Resources | OpenTelemetry"
[5]: https://opentelemetry.io/docs/specs/otel/resource/sdk/?utm_source=chatgpt.com "Resource SDK | OpenTelemetry"
[6]: https://opentelemetry.io/pt/docs/languages/js/instrumentation/?utm_source=chatgpt.com "Instrumentação | OpenTelemetry"
[7]: https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md?utm_source=chatgpt.com "semantic-conventions-genai/docs/gen-ai/gen-ai-agent-spans.md at main · open-telemetry/semantic-conventions-genai · GitHub"
[8]: https://github.com/open-telemetry/semantic-conventions/blob/main/model/gen-ai/spans.yaml?ref=portkey.ai&utm_source=chatgpt.com "semantic-conventions/model/gen-ai/spans.yaml at main · open-telemetry/semantic-conventions · GitHub"
[9]: https://opentelemetry.io/pt/docs/languages/sdk-configuration/general/?utm_source=chatgpt.com "Configurações gerais de SDK | OpenTelemetry"
