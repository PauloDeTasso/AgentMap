import { metricsStore } from '../src/observability/metrics-store';

describe('MetricsStore', () => {
  beforeEach(() => {
    (metricsStore as any).data = new Map();
  });

  test('record armazena valor simples', () => {
    metricsStore.record('test.metric', 42);
    const summary = metricsStore.getSummary();
    expect(summary).toHaveLength(1);
    expect(summary[0].name).toBe('test.metric');
    expect(summary[0].count).toBe(1);
    expect(summary[0].sum).toBe(42);
    expect(summary[0].min).toBe(42);
    expect(summary[0].max).toBe(42);
    expect(summary[0].avg).toBe(42);
  });

  test('record agrupa por nome e labels', () => {
    metricsStore.record('test.metric', 10, { label: 'A' });
    metricsStore.record('test.metric', 20, { label: 'A' });
    metricsStore.record('test.metric', 30, { label: 'B' });

    const summary = metricsStore.getSummary();
    expect(summary).toHaveLength(2);
    expect(summary[0].count).toBe(2);
    expect(summary[0].sum).toBe(30);
    expect(summary[0].avg).toBe(15);
    expect(summary[1].count).toBe(1);
    expect(summary[1].sum).toBe(30);
  });

  test('record com labels vazias funciona', () => {
    metricsStore.record('test.metric', 5);
    const summary = metricsStore.getSummary();
    expect(summary[0].labels).toEqual({});
  });

  test('record com labels complexas funciona', () => {
    metricsStore.record('test.metric', 100, {
      'tool.name': 'agentmap_tarefas_criar',
      status: 'OK',
      'error.type': 'Error'
    });
    const summary = metricsStore.getSummary();
    expect(summary[0].labels).toEqual({
      'tool.name': 'agentmap_tarefas_criar',
      status: 'OK',
      'error.type': 'Error'
    });
  });

  test('getSummary calcula min e max corretamente', () => {
    metricsStore.record('test.metric', 5, { tag: 'x' });
    metricsStore.record('test.metric', 100, { tag: 'x' });
    metricsStore.record('test.metric', 50, { tag: 'x' });

    const summary = metricsStore.getSummary();
    expect(summary[0].min).toBe(5);
    expect(summary[0].max).toBe(100);
    expect(summary[0].avg).toBeCloseTo(155 / 3, 5);
  });

  test('getSummary retorna vazio para store vazio', () => {
    expect(metricsStore.getSummary()).toEqual([]);
  });

  test('getByMetric filtra por nome', () => {
    metricsStore.record('metric.a', 1);
    metricsStore.record('metric.b', 2);
    metricsStore.record('metric.a', 3);

    const a = metricsStore.getByMetric('metric.a');
    expect(a).toHaveLength(1);
    expect(a[0].sum).toBe(4);

    const b = metricsStore.getByMetric('metric.b');
    expect(b).toHaveLength(1);
    expect(b[0].sum).toBe(2);
  });

  test('getByMetric retorna vazio para nome inexistente', () => {
    metricsStore.record('metric.a', 1);
    expect(metricsStore.getByMetric('metric.none')).toEqual([]);
  });

  test('acumula valores ao longo de multiplas chamadas', () => {
    for (let i = 0; i < 100; i++) {
      metricsStore.record('test.metric', i);
    }
    const summary = metricsStore.getSummary();
    expect(summary[0].count).toBe(100);
    expect(summary[0].sum).toBe(4950);
    expect(summary[0].min).toBe(0);
    expect(summary[0].max).toBe(99);
  });

  test('record nao falha com valores zero', () => {
    metricsStore.record('test.zero', 0);
    const summary = metricsStore.getSummary();
    expect(summary[0].count).toBe(1);
    expect(summary[0].sum).toBe(0);
    expect(summary[0].avg).toBe(0);
  });

  test('record nao falha com valores negativos', () => {
    metricsStore.record('test.negative', -5);
    const summary = metricsStore.getSummary();
    expect(summary[0].sum).toBe(-5);
    expect(summary[0].min).toBe(-5);
  });

  test('metricas distintas nao se misturam', () => {
    metricsStore.record('metric.a', 1);
    metricsStore.record('metric.b', 2);
    metricsStore.record('metric.a', 3);

    const summary = metricsStore.getSummary();
    expect(summary).toHaveLength(2);
    expect(summary.find((m: any) => m.name === 'metric.a')!.sum).toBe(4);
    expect(summary.find((m: any) => m.name === 'metric.b')!.sum).toBe(2);
  });

  test('key format e consistente para mesmos labels', () => {
    metricsStore.record('test.metric', 1, { a: '1', b: '2' });
    metricsStore.record('test.metric', 2, { a: '1', b: '2' });
    const summary = metricsStore.getSummary();
    expect(summary).toHaveLength(1);
    expect(summary[0].count).toBe(2);
  });
});
