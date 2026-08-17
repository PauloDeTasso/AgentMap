import { trace, type Span, SpanStatusCode } from '@opentelemetry/api';
import {
  executeToolWithTracing,
  registerTracedTool,
  type ToolTraceParams,
  type ToolTraceOptions
} from '../src/observability/tool-tracing';

jest.mock('../src/observability/tracing', () => ({
  getTracer: jest.fn()
}));

jest.mock('../src/observability/metrics', () => ({
  toolExecutionsCounter: { add: jest.fn() },
  toolErrorsCounter: { add: jest.fn() },
  toolDurationHistogram: { record: jest.fn() }
}));

jest.mock('../src/observability/metrics-store', () => ({
  metricsStore: {
    record: jest.fn()
  }
}));

import { getTracer } from '../src/observability/tracing';
import { toolExecutionsCounter, toolErrorsCounter, toolDurationHistogram } from '../src/observability/metrics';
import { metricsStore } from '../src/observability/metrics-store';

const mockedGetTracer = getTracer as jest.MockedFunction<typeof getTracer>;
const mockedToolExecutionsCounter = toolExecutionsCounter as jest.Mocked<typeof toolExecutionsCounter>;
const mockedToolErrorsCounter = toolErrorsCounter as jest.Mocked<typeof toolErrorsCounter>;
const mockedToolDurationHistogram = toolDurationHistogram as jest.Mocked<typeof toolDurationHistogram>;
const mockedMetricsStore = metricsStore as jest.Mocked<typeof metricsStore>;

function createMockSpan(): jest.Mocked<Span> {
  return {
    setAttribute: jest.fn(),
    setStatus: jest.fn(),
    recordException: jest.fn(),
    end: jest.fn(),
    isRecording: () => true,
  } as unknown as jest.Mocked<Span>;
}

describe('executeToolWithTracing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('executa funcao com sucesso e retorna resultado', async () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    const result = await executeToolWithTracing(
      { toolName: 'test_tool', agentId: 'AGT-1', toolCallId: 'CALL-1', toolType: 'function' },
      async () => ({ success: true, data: 'resultado' })
    );

    expect(result).toEqual({ success: true, data: 'resultado' });
    expect(mockTracer.startActiveSpan).toHaveBeenCalledWith(
      'execute_tool test_tool',
      expect.any(Function)
    );
  });

  test('define atributos corretos no span de sucesso', async () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    await executeToolWithTracing(
      { toolName: 'minha_tool', agentId: 'AGT-X', toolCallId: 'CALL-99', toolType: 'function' },
      async () => 'ok'
    );

    expect(mockSpan.setAttribute).toHaveBeenCalledWith(expect.any(String), 'execute_tool');
    expect(mockSpan.setAttribute).toHaveBeenCalledWith(expect.any(String), 'minha_tool');
    expect(mockSpan.setAttribute).toHaveBeenCalledWith(expect.any(String), 'AGT-X');
    expect(mockSpan.setAttribute).toHaveBeenCalledWith(expect.any(String), 'CALL-99');
    expect(mockSpan.setAttribute).toHaveBeenCalledWith(expect.any(String), 'function');
  });

  test('registra metricas de sucesso no metricsStore', async () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    await executeToolWithTracing(
      { toolName: 'tool_ok' },
      async () => 'done'
    );

    expect(mockedMetricsStore.record).toHaveBeenCalledWith('agentmap.tool.executions', 1, {
      'tool.name': 'tool_ok',
      status: 'OK'
    });
    expect(mockedMetricsStore.record).toHaveBeenCalledWith('agentmap.tool.duration', expect.any(Number), {
      'tool.name': 'tool_ok',
      status: 'OK'
    });
  });

  test('registra metricas OTel de sucesso', async () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    await executeToolWithTracing(
      { toolName: 'tool_otel_ok' },
      async () => 'done'
    );

    expect(mockedToolExecutionsCounter.add).toHaveBeenCalledWith(1, {
      'tool.name': 'tool_otel_ok',
      status: 'OK'
    });
    expect(mockedToolDurationHistogram.record).toHaveBeenCalledWith(
      expect.any(Number),
      { 'tool.name': 'tool_otel_ok', status: 'OK' }
    );
  });

  test('define status OK no span em caso de sucesso', async () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    await executeToolWithTracing(
      { toolName: 'tool_status_ok' },
      async () => 'done'
    );

    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    expect(mockSpan.end).toHaveBeenCalled();
  });

  test('propaga erro e registra metricas de falha', async () => {
    const error = new Error('falha simulada');
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    await expect(
      executeToolWithTracing(
        { toolName: 'tool_error' },
        async () => { throw error; }
      )
    ).rejects.toThrow('falha simulada');

    expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.ERROR });
    expect(mockedMetricsStore.record).toHaveBeenCalledWith('agentmap.tool.errors', 1, {
      'tool.name': 'tool_error',
      'error.type': 'Error'
    });
    expect(mockedToolErrorsCounter.add).toHaveBeenCalledWith(1, {
      'tool.name': 'tool_error',
      'error.type': 'Error'
    });
  });

  test('span sempre e finalizado no finally', async () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    await executeToolWithTracing(
      { toolName: 'tool_finally' },
      async () => 'done'
    );

    expect(mockSpan.end).toHaveBeenCalledTimes(1);
  });

  test('finaliza span mesmo com erro', async () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    try {
      await executeToolWithTracing(
        { toolName: 'tool_error_finally' },
        async () => { throw new Error('boom'); }
      );
    } catch {
      // esperado
    }

    expect(mockSpan.end).toHaveBeenCalledTimes(1);
  });
});

describe('registerTracedTool', () => {
  const mockServer = {
    registerTool: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registra tool no McpServer', () => {
    registerTracedTool(
      mockServer as any,
      'minha_tool',
      { inputSchema: { type: 'object' } },
      async () => ({ ok: true })
    );

    expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'minha_tool',
      { inputSchema: { type: 'object' } },
      expect.any(Function)
    );
  });

  test('handler wrapper repassa argumentos corretamente', async () => {
    registerTracedTool(
      mockServer as any,
      'minha_tool',
      { inputSchema: { type: 'object' } },
      async (input: any) => ({ received: input })
    );

    const [, , wrapper] = mockServer.registerTool.mock.calls[0];
    const result = await wrapper({ foo: 'bar' });

    expect(result).toEqual({ received: { foo: 'bar' } });
  });

  test('extrai agentId do input via extractAgentId', async () => {
    registerTracedTool(
      mockServer as any,
      'tool_extract',
      { inputSchema: { type: 'object' } },
      async () => ({ ok: true }),
      { extractAgentId: (input: any) => input?.agentId }
    );

    const [, , wrapper] = mockServer.registerTool.mock.calls[0];
    await wrapper({ agentId: 'AGT-EXTRACT' });
  });

  test('usa agentId fixo quando fornecido', async () => {
    registerTracedTool(
      mockServer as any,
      'tool_fixed_agent',
      { inputSchema: { type: 'object' } },
      async () => ({ ok: true }),
      { agentId: 'AGT-FIXED' }
    );

    const [, , wrapper] = mockServer.registerTool.mock.calls[0];
    await wrapper({ foo: 'bar' });
  });

  test('passa toolCallId quando fornecido', async () => {
    registerTracedTool(
      mockServer as any,
      'tool_call_id',
      { inputSchema: { type: 'object' } },
      async () => ({ ok: true }),
      { toolCallId: 'CALL-123' }
    );

    const [, , wrapper] = mockServer.registerTool.mock.calls[0];
    await wrapper({ foo: 'bar' });
  });
});
