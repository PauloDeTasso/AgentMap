export interface Subscription {
  sessionId: string;
  uri: string;
  createdAt: number;
}

export class SubscriptionManager {
  private subscriptions: Map<string, Set<Subscription>> = new Map();

  subscribe(sessionId: string, uri: string): void {
    if (!this.subscriptions.has(uri)) {
      this.subscriptions.set(uri, new Set());
    }
    const existing = this.subscriptions.get(uri)!;
    const found = Array.from(existing).find((s: Subscription) => s.sessionId === sessionId);
    if (!found) {
      existing.add({ sessionId, uri, createdAt: Date.now() });
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
}

export const subscriptionManager = new SubscriptionManager();
