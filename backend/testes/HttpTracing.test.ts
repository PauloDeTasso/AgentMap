import { trace, SpanStatusCode, type Span } from '@opentelemetry/api';
import { httpRequestMiddleware } from '../src/observability/http-tracing';

jest.mock('../src/observability/tracing', () => ({
  getTracer: jest.fn()
}));

import { getTracer } from '../src/observability/tracing';

const mockedGetTracer = getTracer as jest.MockedFunction<typeof getTracer>;

function createMockSpan(): jest.Mocked<Span> {
  return {
    setAttribute: jest.fn(),
    setStatus: jest.fn(),
    end: jest.fn(),
  } as unknown as jest.Mocked<Span>;
}

describe('httpRequestMiddleware', () => {
  let req: any;
  let res: any;
  let next: jest.Mock;
  let finishHandlers: Map<string, any>;
  let closeHandlers: Map<string, any>;

  beforeEach(() => {
    jest.clearAllMocks();
    finishHandlers = new Map();
    closeHandlers = new Map();

    next = jest.fn();

    req = {
      method: 'GET',
      url: '/api/test',
      on: jest.fn((event: string, handler: any) => {
        if (event === 'finish') finishHandlers.set('main', handler);
        if (event === 'close') closeHandlers.set('main', handler);
        return req;
      })
    };

    res = {
      statusCode: 200,
      on: jest.fn((event: string, handler: any) => {
        if (event === 'finish') finishHandlers.set('main', handler);
        if (event === 'close') closeHandlers.set('main', handler);
        return res;
      }),
      finish: null
    };
  });

  test('cria span com nome correto', () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startSpan: jest.fn(() => mockSpan)
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    httpRequestMiddleware(req, res, next);

    expect(mockTracer.startSpan).toHaveBeenCalledWith('GET /api/test');
  });

  test('define atributos HTTP no span', () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startSpan: jest.fn(() => mockSpan)
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    httpRequestMiddleware(req, res, next);

    expect(mockSpan.setAttribute).toHaveBeenCalledWith(
      expect.stringContaining('http.request.method'),
      'GET'
    );
    expect(mockSpan.setAttribute).toHaveBeenCalledWith(
      expect.stringContaining('url.full'),
      '/api/test'
    );
  });

  test('chama next()', () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startSpan: jest.fn(() => mockSpan)
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    httpRequestMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('finaliza span com status OK para 2xx', () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startSpan: jest.fn(() => mockSpan)
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    httpRequestMiddleware(req, res, next);
    res.statusCode = 200;
    const finishHandler = finishHandlers.get('main');
    if (finishHandler) finishHandler();

    expect(mockSpan.setAttribute).toHaveBeenCalledWith(
      expect.stringContaining('http.response.status_code'),
      200
    );
    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    expect(mockSpan.end).toHaveBeenCalled();
  });

  test('finaliza span com status ERROR para 5xx', () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startSpan: jest.fn(() => mockSpan)
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    req.url = '/api/erro';
    res.statusCode = 500;

    httpRequestMiddleware(req, res, next);
    const finishHandler = finishHandlers.get('main');
    if (finishHandler) finishHandler();

    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.ERROR });
  });

  test('finaliza span uma unica vez', () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startSpan: jest.fn(() => mockSpan)
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    httpRequestMiddleware(req, res, next);
    const finishHandler = finishHandlers.get('main');
    if (finishHandler) finishHandler();
    if (finishHandler) finishHandler();

    expect(mockSpan.end).toHaveBeenCalledTimes(1);
  });

  test('finaliza span com ERROR no evento close', () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startSpan: jest.fn(() => mockSpan)
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    httpRequestMiddleware(req, res, next);
    const closeHandler = closeHandlers.get('main');
    if (closeHandler) closeHandler();

    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.ERROR });
  });

  test('define status CORRETO no finish', () => {
    const mockSpan = createMockSpan();
    const mockTracer = {
      startSpan: jest.fn(() => mockSpan)
    };
    mockedGetTracer.mockReturnValue(mockTracer as any);

    httpRequestMiddleware(req, res, next);
    res.statusCode = 404;
    const finishHandler = finishHandlers.get('main');
    if (finishHandler) finishHandler();

    expect(mockSpan.setAttribute).toHaveBeenCalledWith(
      expect.stringContaining('http.response.status_code'),
      404
    );
  });
});
