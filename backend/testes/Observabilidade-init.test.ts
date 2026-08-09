describe('iniciarObservabilidade', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('inicia tracing e metrics', async () => {
    jest.doMock('../src/observability/tracing', () => ({
      iniciarTracing: jest.fn(),
      shutdownTracing: jest.fn()
    }));
    jest.doMock('../src/observability/metrics', () => ({
      iniciarMetrics: jest.fn()
    }));

    const { iniciarObservabilidade } = require('../src/observability');
    const { iniciarTracing } = require('../src/observability/tracing');
    const { iniciarMetrics } = require('../src/observability/metrics');

    const shutdown = await iniciarObservabilidade();

    expect(iniciarTracing).toHaveBeenCalledTimes(1);
    expect(iniciarMetrics).toHaveBeenCalledTimes(1);
    expect(typeof shutdown).toBe('function');
  });

  test('nao reinicializa se ja inicializado', async () => {
    jest.doMock('../src/observability/tracing', () => ({
      iniciarTracing: jest.fn(),
      shutdownTracing: jest.fn()
    }));
    jest.doMock('../src/observability/metrics', () => ({
      iniciarMetrics: jest.fn()
    }));

    const { iniciarObservabilidade } = require('../src/observability');
    const { iniciarTracing } = require('../src/observability/tracing');
    const { iniciarMetrics } = require('../src/observability/metrics');

    await iniciarObservabilidade();
    await iniciarObservabilidade();

    expect(iniciarTracing).toHaveBeenCalledTimes(1);
    expect(iniciarMetrics).toHaveBeenCalledTimes(1);
  });

  test('shutdown chama shutdownTracing', async () => {
    jest.doMock('../src/observability/tracing', () => ({
      iniciarTracing: jest.fn(),
      shutdownTracing: jest.fn()
    }));
    jest.doMock('../src/observability/metrics', () => ({
      iniciarMetrics: jest.fn()
    }));

    const { iniciarObservabilidade } = require('../src/observability');
    const { shutdownTracing } = require('../src/observability/tracing');

    const shutdown = await iniciarObservabilidade();
    await shutdown();

    expect(shutdownTracing).toHaveBeenCalledTimes(1);
  });
});
