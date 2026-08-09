import { trace, SpanStatusCode, type Span } from '@opentelemetry/api';
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import {
  GEN_AI_OPERATION_NAME,
  GEN_AI_TOOL_NAME,
  GEN_AI_TOOL_CALL_ID,
  GEN_AI_TOOL_TYPE,
  GEN_AI_AGENT_ID,
  OPERATION_EXECUTE_TOOL,
  TOOL_TYPE_FUNCTION,
} from './gen-ai';
import { getTracer } from './tracing';
import { sanitizeToolArguments, getErrorType } from './sanitization';
import { metricsStore } from './metrics-store';
import {
  toolExecutionsCounter,
  toolErrorsCounter,
  toolDurationHistogram
} from './metrics';

export interface ToolTraceParams {
  toolName: string;
  agentId?: string;
  toolCallId?: string;
  toolType?: string;
}

export async function executeToolWithTracing<T>(
  params: ToolTraceParams,
  fn: () => Promise<T>,
): Promise<T> {
  const tracer = getTracer();
  const start = Date.now();
  return tracer.startActiveSpan(
    `execute_tool ${params.toolName}`,
    async (span: Span) => {
      span.setAttribute(GEN_AI_OPERATION_NAME, OPERATION_EXECUTE_TOOL);
      span.setAttribute(GEN_AI_TOOL_NAME, params.toolName);
      if (params.toolCallId) span.setAttribute(GEN_AI_TOOL_CALL_ID, params.toolCallId);
      if (params.toolType) span.setAttribute(GEN_AI_TOOL_TYPE, params.toolType);
      if (params.agentId) span.setAttribute(GEN_AI_AGENT_ID, params.agentId);

      try {
        const result = await fn();
        const durationMs = Date.now() - start;
        span.setStatus({ code: SpanStatusCode.OK });
        metricsStore.record('agentmap.tool.executions', 1, {
          'tool.name': params.toolName,
          status: 'OK',
        });
        metricsStore.record('agentmap.tool.duration', durationMs, {
          'tool.name': params.toolName,
          status: 'OK',
        });
        toolExecutionsCounter.add(1, { 'tool.name': params.toolName, status: 'OK' });
        toolDurationHistogram.record(durationMs, { 'tool.name': params.toolName, status: 'OK' });
        return result;
      } catch (error) {
        const durationMs = Date.now() - start;
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        metricsStore.record('agentmap.tool.executions', 1, {
          'tool.name': params.toolName,
          status: 'ERROR',
        });
        metricsStore.record('agentmap.tool.errors', 1, {
          'tool.name': params.toolName,
          'error.type': getErrorType(error),
        });
        metricsStore.record('agentmap.tool.duration', durationMs, {
          'tool.name': params.toolName,
          status: 'ERROR',
        });
        toolExecutionsCounter.add(1, { 'tool.name': params.toolName, status: 'ERROR' });
        toolErrorsCounter.add(1, { 'tool.name': params.toolName, 'error.type': getErrorType(error) });
        toolDurationHistogram.record(durationMs, { 'tool.name': params.toolName, status: 'ERROR' });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

export interface ToolTraceOptions {
  agentId?: string;
  toolCallId?: string;
  extractAgentId?: (input: any) => string | undefined;
}

export function registerTracedTool(
  server: McpServer,
  name: string,
  schema: any,
  handler: (...args: any[]) => Promise<any>,
  options?: ToolTraceOptions,
): void {
  server.registerTool(name, schema, async (...args: any[]) => {
    const input = args[0] || {};
    const agentId = options?.agentId || (options?.extractAgentId ? options.extractAgentId(input) : undefined);
    return executeToolWithTracing(
      {
        toolName: name,
        agentId,
        toolCallId: options?.toolCallId,
        toolType: TOOL_TYPE_FUNCTION,
      },
      () => handler(...args)
    );
  });
}
