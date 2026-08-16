import { trace, SpanStatusCode, type Span } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes, defaultResource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, ATTR_SERVICE_NAMESPACE, ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

let sdk: NodeSDK | null = null;

export function iniciarTracing(): Promise<void> {
  const environment = process.env.NODE_ENV || 'development';
  const serviceName = process.env.OTEL_SERVICE_NAME || 'agentmap-backend';
  const serviceVersion = process.env.OTEL_SERVICE_VERSION || '1.0.0';
  const serviceNamespace = process.env.OTEL_SERVICE_NAMESPACE || 'agentmap';

  const traceExporter =
    environment === 'production'
      ? new OTLPTraceExporter({
          url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
        })
      : new ConsoleSpanExporter();

  const instrumentations = getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-dns': { enabled: false },
  });

  sdk = new NodeSDK({
    resource: defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: serviceName,
        [ATTR_SERVICE_VERSION]: serviceVersion,
        [ATTR_SERVICE_NAMESPACE]: serviceNamespace,
        [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: environment,
      })
    ),
    traceExporter,
    instrumentations,
  });

  sdk.start();
  return Promise.resolve();
}

export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
    } catch (e) {
      console.error('Error shutting down tracing:', e);
    }
    sdk = null;
  }
}

export function getTracer() {
  return trace.getTracer('agentmap', '1.0.0');
}
