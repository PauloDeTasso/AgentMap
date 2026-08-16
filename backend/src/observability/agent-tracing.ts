import { trace, SpanStatusCode, type Span } from '@opentelemetry/api';
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { getTracer } from './tracing';
import {
  GEN_AI_OPERATION_NAME,
  GEN_AI_AGENT_ID,
  OPERATION_INVOKE_AGENT,
  OPERATION_PLAN,
  TOOL_TYPE_FUNCTION,
} from './gen-ai';
import { setAgentMapAttributes, type AgentMapAttributes } from './attributes';
import { executeToolWithTracing } from './tool-tracing';
import {
  agentExecutionsCounter,
  agentDurationHistogram
} from './metrics';

export async function withAgentTrace<T>(
  params: {
    agentId: string;
    projectId?: string;
    taskId?: string;
    sessionId?: string;
    correlationId?: string;
    operation?: 'invoke_agent' | 'plan';
  },
  fn: () => Promise<T>,
): Promise<T> {
  const tracer = getTracer();
  const operation = params.operation || OPERATION_INVOKE_AGENT;
  const spanName =
    operation === OPERATION_PLAN
      ? `plan ${params.agentId}`
      : `invoke_agent ${params.agentId}`;

  return tracer.startActiveSpan(spanName, async (span: Span) => {
    span.setAttribute(GEN_AI_OPERATION_NAME, operation);
    span.setAttribute(GEN_AI_AGENT_ID, params.agentId);

    const attrs: AgentMapAttributes = {
      agentId: params.agentId,
      projectId: params.projectId,
      taskId: params.taskId,
      sessionId: params.sessionId,
      correlationId: params.correlationId,
    };
    setAgentMapAttributes(span, attrs);

    const start = Date.now();
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      const durationMs = Date.now() - start;
      agentExecutionsCounter.add(1, { 'agent.id': params.agentId, status: 'OK' });
      agentDurationHistogram.record(durationMs, { 'agent.id': params.agentId });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      const durationMs = Date.now() - start;
      agentExecutionsCounter.add(1, { 'agent.id': params.agentId, status: 'ERROR' });
      agentDurationHistogram.record(durationMs, { 'agent.id': params.agentId });
      throw error;
    } finally {
      span.end();
    }
  });
}

export interface WorkflowTraceOptions {
  agentId?: string;
  extractAgentId?: (input: any) => string | undefined;
}

export function registerWorkflowTool(
  server: McpServer,
  name: string,
  schema: any,
  handler: (...args: any[]) => Promise<any>,
  options?: WorkflowTraceOptions,
): void {
  server.registerTool(name, schema, async (...args: any[]) => {
    const input = args[0] || {};
    const agentId = options?.agentId || (options?.extractAgentId ? options.extractAgentId(input) : undefined);
    return withAgentTrace(
      { agentId: agentId || 'unknown', operation: OPERATION_INVOKE_AGENT },
      () =>
        executeToolWithTracing(
          {
            toolName: name,
            agentId,
            toolType: TOOL_TYPE_FUNCTION,
          },
          () => handler(...args)
        )
    );
  });
}
