# 📄 Documento 2/5 — Observabilidade com OpenTelemetry GenAI (`gen_ai.*`)

> **Ordem de implementação:** 2ª de 5
> **Prioridade:** Alta
> **Esforço estimado:** Médio (3–5 dias de trabalho de agente)
> **Depende de:** Documento 1 (reaproveita os mesmos pontos de integração no MCP Server)
> **Projeto alvo:** AgentMap (backend Node.js + TypeScript + Express + MCP Server)

---

## 1. Objetivo

Instrumentar o AgentMap para registrar, de forma padronizada, **o que cada agente fez, quando, quanto tempo levou e o resultado** — usando o padrão aberto OpenTelemetry com as convenções semânticas `gen_ai.*`, criadas especificamente para sistemas de IA/agentes. Isso transforma o histórico do AgentMap (que hoje é textual/estrutural) em **telemetria consultável**, exibível na interface Web e exportável para qualquer ferramenta compatível com OpenTelemetry (Grafana, Datadog, etc.), sem depender de formato proprietário.

## 2. Contexto do sistema atual

- O AgentMap já registra `projetoId`, `agenteId`, `sessaoId`, `tarefaId`, `correlationId`, `requestId`, `timestamp` em suas entidades (seção "Histórico e rastreabilidade" do README).
- Essa telemetria hoje vive **apenas dentro dos arquivos JSON de domínio** (tarefas, resultados, handoffs) — não existe uma camada de tracing/observabilidade separada.
- O MCP Server tem mais de 100 tools registradas via `registerTool` do SDK — cada chamada de tool é um ponto natural de instrumentação.

## 3. O que muda depois desta implementação

| Antes | Depois |
|---|---|
| Histórico só mostra o resultado final de uma tarefa | Histórico mostra a linha do tempo completa: cada tool chamada, duração, status |
| Sem visão de custo/tempo por agente | Métricas agregadas por agente (tempo total, nº de chamadas, taxa de erro) |
| Formato proprietário (JSON interno do AgentMap) | Formato padrão `gen_ai.*`, exportável para qualquer backend OpenTelemetry |
| Debug de "por que o agente fez isso" é manual, lendo JSON | Trace visual mostrando a sequência de decisões/tools |

## 4. Pré-requisitos técnicos

1. Node.js 18+ já é pré-requisito do projeto (compatível).
2. Instalar as bibliotecas do OpenTelemetry para Node.js.
3. **Atenção:** as convenções `gen_ai.*` ainda estão em fase de desenvolvimento/experimental (sem release 1.0 fechado) — nomes de atributos podem mudar entre versões. Recomenda-se **fixar a versão** da biblioteca de convenções usada e revisar antes de cada atualização, em vez de sempre puxar a última versão automaticamente.

## 5. Plano de implementação passo a passo

### Passo 1 — Instalar dependências

```bash
cd backend
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node --save
npm install @opentelemetry/semantic-conventions --save
```

### Passo 2 — Criar o módulo de inicialização do tracing

Criar `backend/src/observability/tracing.ts`:

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

export function iniciarObservabilidade() {
  const sdk = new NodeSDK({
    serviceName: "agentmap-backend",
    traceExporter: new ConsoleSpanExporter(), // trocar por OTLP exporter em produção
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  return sdk;
}
```

> Nesta primeira fase, usar `ConsoleSpanExporter` (imprime no terminal) para validar rapidamente. Depois trocar por um `OTLPTraceExporter` apontando para um coletor local (ex.: Grafana Tempo, Jaeger) se o desenvolvedor quiser um dashboard visual.

### Passo 3 — Chamar a inicialização no bootstrap do backend

No arquivo principal do backend (ex.: `backend/src/index.ts` ou `server.ts`), garantir que `iniciarObservabilidade()` é chamado **antes** de qualquer outro import relevante (requisito do OpenTelemetry para instrumentação automática funcionar corretamente):

```typescript
import { iniciarObservabilidade } from "./observability/tracing.js";
iniciarObservabilidade();

// demais imports do backend abaixo
```

### Passo 4 — Criar helper de spans customizados para tools MCP

Criar `backend/src/observability/gen-ai-tracer.ts`:

```typescript
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("agentmap-mcp-tools");

export async function comTracingDeTool<T>(
  nomeDaTool: string,
  agenteId: string,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(`execute_tool ${nomeDaTool}`, async (span) => {
    span.setAttribute("gen_ai.operation.name", "execute_tool");
    span.setAttribute("gen_ai.tool.name", nomeDaTool);
    span.setAttribute("gen_ai.agent.id", agenteId);

    try {
      const resultado = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return resultado;
    } catch (erro) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(erro) });
      throw erro;
    } finally {
      span.end();
    }
  });
}
```

### Passo 5 — Envolver as tools MCP existentes com o helper

Para cada tool registrada em `mcp-server/tools/`, envolver a lógica de execução:

```typescript
server.registerTool("criar_solicitacao_alteracao", schema, async (input, extra) => {
  return comTracingDeTool("criar_solicitacao_alteracao", extra.agenteId, async () => {
    // lógica original da tool, sem alterações
    return await servicoSolicitacoes.criar(input);
  });
});
```

> Fazer isso de forma incremental: começar pelas 10–15 tools mais usadas (tarefas, solicitações, handoffs, contratos), não as 124 de uma vez. Priorizar as mesmas entidades já priorizadas no Documento 1.

### Passo 6 — Instrumentar duração de ciclo operacional completo (não só tools individuais)

Criar um span "guarda-chuva" por ciclo de agente (do "Iniciar" ao "Finalizar" do fluxo já documentado no README), para que o trace mostre a árvore completa: ciclo → tools chamadas dentro dele → resultado.

### Passo 7 — Expor métricas agregadas na API REST

Criar endpoint `GET /api/observabilidade/metricas`:

```json
{
  "porAgente": {
    "AGT-BACKEND": {
      "totalExecucoes": 42,
      "duracaoMediaMs": 3200,
      "taxaErro": 0.02
    }
  }
}
```

Esse endpoint alimenta uma nova aba na interface Web (reaproveitando o layout já existente do dashboard).

## 6. Testes de validação

1. Rodar o backend com `ConsoleSpanExporter` ativo e confirmar que cada chamada de tool imprime um span com os atributos `gen_ai.*` esperados.
2. Forçar um erro proposital em uma tool e confirmar que o span registra `SpanStatusCode.ERROR` com a mensagem correta.
3. Validar que o endpoint `/api/observabilidade/metricas` retorna dados agregados coerentes após algumas execuções de teste.

## 7. Critérios de aceite (checklist final)

- [ ] Dependências instaladas e SDK inicializado corretamente no bootstrap.
- [ ] Helper `comTracingDeTool` criado e testado isoladamente.
- [ ] Pelo menos as 10 tools mais usadas envolvidas com tracing.
- [ ] Span "guarda-chuva" de ciclo operacional implementado.
- [ ] Endpoint de métricas agregadas funcionando.
- [ ] Versão da biblioteca de convenções `gen_ai.*` fixada no `package.json` (sem `^` ou `~` soltos).
- [ ] Documentação atualizada no README (nova seção "Observabilidade").

## 8. Referências

- OpenTelemetry GenAI Semantic Conventions (repositório oficial): https://github.com/open-telemetry/semantic-conventions-genai
- OpenTelemetry Node.js SDK: https://opentelemetry.io/docs/languages/js/

---

**Próximo documento da sequência:** `03-protocolo-a2a.md`
