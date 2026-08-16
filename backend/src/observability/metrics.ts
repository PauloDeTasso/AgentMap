import { metrics } from '@opentelemetry/api';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

let meterProvider: MeterProvider | null = null;

export function iniciarMetrics(): void {
  const environment = process.env.NODE_ENV || 'development';

  const exporter =
    environment === 'production'
      ? new OTLPMetricExporter({
          url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
        })
      : undefined;

  const readers = exporter
    ? [new PeriodicExportingMetricReader({ exporter, exportIntervalMillis: 60000 })]
    : [];

  meterProvider = new MeterProvider({ readers });
  metrics.setGlobalMeterProvider(meterProvider);
}

export function getMeter() {
  return metrics.getMeter('agentmap', '1.0.0');
}

export function createCounter(name: string, description?: string) {
  const meter = getMeter();
  return meter.createCounter(name, { description });
}

export function createHistogram(name: string, description?: string, unit?: string) {
  const meter = getMeter();
  return meter.createHistogram(name, { description, unit });
}

export const toolExecutionsCounter = createCounter('agentmap.tool.executions', 'Total de execuções de tools');
export const toolErrorsCounter = createCounter('agentmap.tool.errors', 'Total de erros de tools');
export const toolDurationHistogram = createHistogram('agentmap.tool.duration', 'Duração das execuções de tools', 'ms');
export const agentExecutionsCounter = createCounter('agentmap.agent.executions', 'Total de execuções de agentes');
export const agentDurationHistogram = createHistogram('agentmap.agent.duration', 'Duração das execuções de agentes', 'ms');
