import { iniciarTracing } from './tracing';
import { iniciarMetrics } from './metrics';

let initialized = false;

export async function iniciarObservabilidade(): Promise<() => Promise<void>> {
  if (initialized) {
    return shutdownObservabilidade;
  }
  initialized = true;

  await iniciarTracing();
  iniciarMetrics();

  return shutdownObservabilidade;
}

export async function shutdownObservabilidade(): Promise<void> {
  const { shutdownTracing } = await import('./tracing');
  await shutdownTracing();
}
