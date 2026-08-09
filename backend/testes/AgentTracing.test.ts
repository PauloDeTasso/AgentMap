import { trace, SpanStatusCode, type Span } from '@opentelemetry/api';
import { withAgentTrace, registerWorkflowTool } from '../src/observability/agent-tracing';

jest.mock('../src/observability/tracing', () => ({
  getTracer: jest.fn()
}));

jest.mock('../src/observability/tool-tracing', () => ({
  executeToolWithTracing: jest.fn((_params: any, fn: any) => fn())
}));

jest.mock('../src/observability/metrics', () => ({
  agentExecutionsCounter: { add: jest.fn() },
  agentDurationHistogram: { record: jest.fn() }
}));

jest.mock('../src/observability/attributes', () => ({
  setAgentMapAttributes: jest.fn(),
  ATTR_AGENTMAP_PROJECT_ID: 'agentmap.project.id',
  ATTR_AGENTMAP_TASK_ID: 'agentmap.task.id',
  ATTR_AGENTMAP_SESSION_ID: 'agentmap.session.id',
  ATTR_AGENTMAP_CORRELATION_ID: 'agentmap.correlation.id',
  ATTR_AGENTMAP_REQUEST_ID: 'agentmap.request.id',
  ATTR_AGENTMAP_HANDOFF_ID: 'agentmap.handoff.id',
  ATTR_AGENTMAP_AGENT_ID: 'agentmap.agent.id',
}));

import { getTracer } from '../src/observability/tracing';
import { executeToolWithTracing } from '../src/observability/tool-tracing';
import { agentExecutionsCounter, agentDurationHistogram } from '../src/observability/metrics';
import { setAgentMapAttributes } from '../src/observability/attributes';

const mockedGetTracer = getTracer as jest.MockedFunction<typeof getTracer>;
const mockedExecuteToolWithTracing = executeToolWithTracing as jest.MockedFunction<typeof executeToolWithTracing>;
const mockedAgentExecutionsCounter = agentExecutionsCounter as jest.Mocked<typeof agentExecutionsCounter>;
const mockedAgentDurationHistogram = agentDurationHistogram as jest.Mocked<typeof agentDurationHistogram>;
const mockedSetAgentMapAttributes = setAgentMapAttributes as jest.MockedFunction<typeof setAgentMapAttributes>;

function createMockSpan(): jest.Mocked<Span> {
  return {
    setAttribute: jest.fn(),
    setStatus: jest.fn(),
    recordException: jest.fn(),
    end: jest.fn(),
    isRecording: () => true,
  } as unknown as jest.Mocked<Span>;
}

describe('withAgentTrace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('executa funcao e retorna resultado', async () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    const result = await withAgentTrace({ agentId: 'AGT-1' }, async () => ({
      success: true
    }));

    expect(result).toEqual({ success: true });
    expect(mockTracer.startActiveSpan).toHaveBeenCalledWith(
      'invoke_agent AGT-1',
      expect.any(Function)
    );
  });

  test('usa nome de span customizado para operacao plan', async () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    await withAgentTrace({ agentId: 'AGT-1', operation: 'plan' }, async () => ({ ok: true }));

    expect(mockTracer.startActiveSpan).toHaveBeenCalledWith(
      'plan AGT-1',
      expect.any(Function)
    );
  });

  test('define atributos GEN_AI no span', async () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    await withAgentTrace({ agentId: 'AGT-1' }, async () => ({ ok: true }));

    expect(mockSpan.setAttribute).toHaveBeenCalledWith(
      expect.stringContaining('gen_ai.operation.name'),
      'invoke_agent'
    );
    expect(mockSpan.setAttribute).toHaveBeenCalledWith(
      expect.stringContaining('gen_ai.agent.id'),
      'AGT-1'
    );
  });

  test('define agentMapAttributes no span', async () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    await withAgentTrace({
      agentId: 'AGT-1',
      projectId: 'PRJ-1',
      taskId: 'TSK-1',
      sessionId: 'SES-1',
      correlationId: 'CORR-1'
    }, async () => ({ ok: true }));

    expect(mockedSetAgentMapAttributes).toHaveBeenCalledWith(mockSpan, {
      agentId: 'AGT-1',
      projectId: 'PRJ-1',
      taskId: 'TSK-1',
      sessionId: 'SES-1',
      correlationId: 'CORR-1'
    });
  });

  test('registra metricas de sucesso', async () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    await withAgentTrace({ agentId: 'AGT-1' }, async () => ({ ok: true }));

    expect(mockedAgentExecutionsCounter.add).toHaveBeenCalledWith(1, {
      'agent.id': 'AGT-1',
      status: 'OK'
    });
    expect(mockedAgentDurationHistogram.record).toHaveBeenCalledWith(
      expect.any(Number),
      { 'agent.id': 'AGT-1' }
    );
  });

  test('define status OK em sucesso', async () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    await withAgentTrace({ agentId: 'AGT-1' }, async () => ({ ok: true }));

    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
  });

  test('registra metricas de erro e relanca', async () => {
    const error = new Error('agent falha');
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    await expect(
      withAgentTrace({ agentId: 'AGT-1' }, async () => { throw error; })
    ).rejects.toThrow('agent falha');

    expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.ERROR });
    expect(mockedAgentExecutionsCounter.add).toHaveBeenCalledWith(1, {
      'agent.id': 'AGT-1',
      status: 'ERROR'
    });
  });

  test('finaliza span sempre', async () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    await withAgentTrace({ agentId: 'AGT-1' }, async () => ({ ok: true }));

    expect(mockSpan.end).toHaveBeenCalledTimes(1);
  });

  test('finaliza span mesmo com erro', async () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startActiveSpan: jest.fn((name: string, fn: any) => fn(mockSpan))
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    try {
      await withAgentTrace({ agentId: 'AGT-1' }, async () => { throw new Error('erro'); });
    } catch {
      // esperado
    }

    expect(mockSpan.end).toHaveBeenCalledTimes(1);
  });
});

describe('registerWorkflowTool', () => {
  const mockServer = {
    registerTool: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registra tool no servidor', () => {
    registerWorkflowTool(
      mockServer as any,
      'workflow_tool',
      { inputSchema: { type: 'object' } },
      async () => ({ ok: true })
    );

    expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
  });

  test('wrapper executa handler com tracing', async () => {
    registerWorkflowTool(
      mockServer as any,
      'workflow_tool',
      { inputSchema: { type: 'object' } },
      async (input: any) => ({ received: input })
    );

    const [, , wrapper] = mockServer.registerTool.mock.calls[0];
    const result = await wrapper({ foo: 'bar' });

    expect(mockedExecuteToolWithTracing).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ received: { foo: 'bar' } });
  });

  test('wrapper extrai agentId via extractAgentId', async () => {
    registerWorkflowTool(
      mockServer as any,
      'workflow_extract',
      { inputSchema: { type: 'object' } },
      async () => ({ ok: true }),
      { extractAgentId: (input: any) => input?.agentId }
    );

    const [, , wrapper] = mockServer.registerTool.mock.calls[0];
    await wrapper({ agentId: 'AGT-EXTRACT' });
  });

  test('wrapper usa agentId fixo quando fornecido', async () => {
    registerWorkflowTool(
      mockServer as any,
      'workflow_fixed',
      { inputSchema: { type: 'object' } },
      async () => ({ ok: true }),
      { agentId: 'AGT-FIXED' }
    );

    const [, , wrapper] = mockServer.registerTool.mock.calls[0];
    await wrapper({ foo: 'bar' });
  });
});
