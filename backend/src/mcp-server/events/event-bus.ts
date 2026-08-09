export interface ResourceChangedEvent {
  uri: string;
  timestamp: number;
  reason: string;
}

export type EventHandler = (event: ResourceChangedEvent) => void;

export class EventBus {
  private handlers: Set<EventHandler> = new Set();
  private coalescenceTimers: Map<string, NodeJS.Timeout> = new Map();
  private coalescenceWindowMs: number;

  constructor(coalescenceWindowMs = 100) {
    this.coalescenceWindowMs = coalescenceWindowMs;
  }

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  publish(event: ResourceChangedEvent): void {
    if (this.coalescenceTimers.has(event.uri)) {
      clearTimeout(this.coalescenceTimers.get(event.uri)!);
    }

    const timer = setTimeout(() => {
      this.coalescenceTimers.delete(event.uri);
      for (const handler of this.handlers) {
        handler(event);
      }
    }, this.coalescenceWindowMs);
    timer.unref();

    this.coalescenceTimers.set(event.uri, timer);
  }

  shutdown(): void {
    try {
      for (const timer of this.coalescenceTimers.values()) {
        clearTimeout(timer);
      }
    } finally {
      this.coalescenceTimers.clear();
      this.handlers.clear();
    }
  }
}

export const globalEventBus = new EventBus(100);
