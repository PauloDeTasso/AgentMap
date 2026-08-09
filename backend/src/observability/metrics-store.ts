interface MetricData {
  name: string;
  labels: Record<string, string>;
  values: number[];
}

class MetricsStore {
  private data: Map<string, MetricData> = new Map();

  record(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = `${name}:${JSON.stringify(labels)}`;
    const existing = this.data.get(key);
    if (existing) {
      existing.values.push(value);
    } else {
      this.data.set(key, { name, labels, values: [value] });
    }
  }

  getSummary(): any[] {
    const result: any[] = [];
    for (const entry of this.data.values()) {
      const values = entry.values;
      result.push({
        name: entry.name,
        labels: entry.labels,
        count: values.length,
        sum: values.reduce((a: number, b: number) => a + b, 0),
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0,
      });
    }
    return result;
  }

  getByMetric(name: string): any[] {
    return this.getSummary().filter((m: any) => m.name === name);
  }
}

export const metricsStore = new MetricsStore();
