export interface Subscription {
  sessionId: string;
  uri: string;
  createdAt: number;
  protocolVersion: '2025' | '2026';
}

export interface ListenSubscription {
  subscriptionId: string;
  filter: {
    resourceSubscriptions: string[];
    toolsListChanged?: boolean;
    promptsListChanged?: boolean;
    resourcesListChanged?: boolean;
  };
  sessionId: string;
  active: boolean;
  resolve: (value: any) => void;
}

export class SubscriptionManager {
  private subscriptions: Map<string, Set<Subscription>> = new Map();
  private listenSubscriptions: Map<string, ListenSubscription> = new Map();

  subscribe(sessionId: string, uri: string, protocolVersion: '2025' | '2026' = '2025'): void {
    if (!this.subscriptions.has(uri)) {
      this.subscriptions.set(uri, new Set());
    }
    const existing = this.subscriptions.get(uri)!;
    const found = Array.from(existing).find((s: Subscription) => s.sessionId === sessionId);
    if (!found) {
      existing.add({ sessionId, uri, createdAt: Date.now(), protocolVersion });
    }
  }

  unsubscribe(sessionId: string, uri: string): void {
    const existing = this.subscriptions.get(uri);
    if (!existing) return;
    const toRemove = Array.from(existing).find((s: Subscription) => s.sessionId === sessionId);
    if (toRemove) {
      existing.delete(toRemove);
    }
    if (existing.size === 0) {
      this.subscriptions.delete(uri);
    }
  }

  unsubscribeAll(sessionId: string): void {
    for (const [uri, subs] of this.subscriptions.entries()) {
      const toRemove = Array.from(subs).filter((s: Subscription) => s.sessionId === sessionId);
      for (const sub of toRemove) {
        subs.delete(sub);
      }
      if (subs.size === 0) {
        this.subscriptions.delete(uri);
      }
    }
  }

  getSubscribers(uri: string): string[] {
    const existing = this.subscriptions.get(uri);
    if (!existing) return [];
    return Array.from(existing).map((s: Subscription) => s.sessionId);
  }

  getSubscriptionCount(): number {
    let count = 0;
    for (const subs of this.subscriptions.values()) {
      count += subs.size;
    }
    return count;
  }

  addListenSubscription(subscription: ListenSubscription): void {
    this.listenSubscriptions.set(subscription.subscriptionId, subscription);
  }

  removeListenSubscription(subscriptionId: string): void {
    const sub = this.listenSubscriptions.get(subscriptionId);
    if (sub) {
      sub.active = false;
    }
    this.listenSubscriptions.delete(subscriptionId);
  }

  getListenSubscription(subscriptionId: string): ListenSubscription | undefined {
    return this.listenSubscriptions.get(subscriptionId);
  }

  getListenSubscribersForUri(uri: string): string[] {
    const result: string[] = [];
    for (const sub of this.listenSubscriptions.values()) {
      if (sub.active && sub.filter.resourceSubscriptions.includes(uri)) {
        result.push(sub.subscriptionId);
      }
    }
    return result;
  }

  getAllListenSubscriptions(): ListenSubscription[] {
    return Array.from(this.listenSubscriptions.values()).filter((s) => s.active);
  }

  getListenSubscriptionCount(): number {
    return this.getAllListenSubscriptions().length;
  }

  resolveAllListenSubscriptions(value: unknown): void {
    for (const sub of this.listenSubscriptions.values()) {
      if (sub.active) {
        sub.active = false;
        try {
          sub.resolve(value);
        } catch {
          // ignore resolve errors
        }
      }
    }
    this.listenSubscriptions.clear();
  }
}

export const subscriptionManager = new SubscriptionManager();
