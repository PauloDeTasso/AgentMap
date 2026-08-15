export type ProtocolVersion = '2025' | '2026';

export interface ProtocolAdapter {
  readonly protocolVersion: ProtocolVersion;
  subscribe(sessionId: string, uri: string): void;
  unsubscribe(sessionId: string, uri: string): void;
  notify(uri: string): Promise<void>;
}

export class LegacyProtocolAdapter implements ProtocolAdapter {
  readonly protocolVersion: ProtocolVersion = '2025';

  constructor(private sendUpdated: (params: { uri: string }) => Promise<void>) {}

  subscribe(_sessionId: string, _uri: string): void {
    // Estado de subscription permanece no SubscriptionManager.
  }

  unsubscribe(_sessionId: string, _uri: string): void {
    // noop
  }

  notify(uri: string): Promise<void> {
    return this.sendUpdated({ uri });
  }
}

export class ModernProtocolAdapter implements ProtocolAdapter {
  readonly protocolVersion: ProtocolVersion = '2026';

  constructor(private sendUpdated: (params: { uri: string }) => Promise<void>) {}

  subscribe(_sessionId: string, _uri: string): void {
    // TODO quando SDK v2 suportar subscriptions/listen:
    // registrar callback moderno no servidor.
  }

  unsubscribe(_sessionId: string, _uri: string): void {
    // TODO quando SDK v2 suportar subscriptions/listen.
  }

  notify(uri: string): Promise<void> {
    return this.sendUpdated({ uri });
  }
}

export function detectProtocolVersion(clientProtocolVersion?: string): ProtocolVersion {
  if (clientProtocolVersion && clientProtocolVersion.startsWith('2026')) {
    return '2026';
  }
  return '2025';
}
