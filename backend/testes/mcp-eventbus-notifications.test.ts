import { globalEventBus } from '../src/mcp-server/events/event-bus';
import { subscriptionManager } from '../src/mcp-server/subscriptions/subscription-manager';

describe('EventBus Notification Dispatch', () => {
  let bus: ReturnType<typeof globalEventBus.subscribe>;
  const mockSendUpdated = jest.fn().mockResolvedValue(undefined);
  const mockNotification = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    subscriptionManager.unsubscribeAll('');
    subscriptionManager.getAllListenSubscriptions().forEach((sub) => subscriptionManager.removeListenSubscription(sub.subscriptionId));
  });

  afterEach(() => {
    if (bus) bus();
  });

  test('dispara notificacao legacy para sessao inscrita', async () => {
    subscriptionManager.subscribe('session-1', 'agentmap://test');
    bus = globalEventBus.subscribe((event) => {
      const legacySubscribers = subscriptionManager.getSubscribers(event.uri);
      if (legacySubscribers.length > 0) {
        mockSendUpdated({ uri: event.uri }).catch(() => {});
      }
    });

    globalEventBus.publish({ uri: 'agentmap://test', timestamp: Date.now(), reason: 'updated' });
    await new Promise((r) => setTimeout(r, 150));
    expect(mockSendUpdated).toHaveBeenCalledWith({ uri: 'agentmap://test' });
  });

  test('dispara notificacao listen para subscription ativa', async () => {
    subscriptionManager.addListenSubscription({
      subscriptionId: 'listen-1',
      filter: { resourceSubscriptions: ['agentmap://test'] },
      sessionId: 'session-1',
      active: true,
      resolve: () => {}
    });

    bus = globalEventBus.subscribe((event) => {
      const listenSubscriberIds = subscriptionManager.getListenSubscribersForUri(event.uri);
      for (const subscriptionId of listenSubscriberIds) {
        mockNotification({
          method: 'notifications/resources/updated',
          params: { uri: event.uri, _meta: { 'io.modelcontextprotocol/subscriptionId': subscriptionId } }
        }).catch(() => {});
      }
    });

    globalEventBus.publish({ uri: 'agentmap://test', timestamp: Date.now(), reason: 'updated' });
    await new Promise((r) => setTimeout(r, 150));
    expect(mockNotification).toHaveBeenCalledWith({
      method: 'notifications/resources/updated',
      params: { uri: 'agentmap://test', _meta: { 'io.modelcontextprotocol/subscriptionId': 'listen-1' } }
    });
  });

  test('nao dispara notificacao se nao houver subscribers', async () => {
    bus = globalEventBus.subscribe((event) => {
      const legacySubscribers = subscriptionManager.getSubscribers(event.uri);
      if (legacySubscribers.length > 0) {
        mockSendUpdated({ uri: event.uri }).catch(() => {});
      }
      const listenSubscriberIds = subscriptionManager.getListenSubscribersForUri(event.uri);
      for (const subscriptionId of listenSubscriberIds) {
        mockNotification({
          method: 'notifications/resources/updated',
          params: { uri: event.uri, _meta: { 'io.modelcontextprotocol/subscriptionId': subscriptionId } }
        }).catch(() => {});
      }
    });

    globalEventBus.publish({ uri: 'agentmap://unsubscribed', timestamp: Date.now(), reason: 'updated' });
    await new Promise((r) => setTimeout(r, 150));
    expect(mockSendUpdated).not.toHaveBeenCalled();
    expect(mockNotification).not.toHaveBeenCalled();
  });

  test('coalesce eventos do mesmo URI', async () => {
    subscriptionManager.subscribe('session-1', 'agentmap://test');
    bus = globalEventBus.subscribe((event) => {
      const legacySubscribers = subscriptionManager.getSubscribers(event.uri);
      if (legacySubscribers.length > 0) {
        mockSendUpdated({ uri: event.uri }).catch(() => {});
      }
    });

    globalEventBus.publish({ uri: 'agentmap://test', timestamp: Date.now(), reason: 'first' });
    globalEventBus.publish({ uri: 'agentmap://test', timestamp: Date.now(), reason: 'second' });
    await new Promise((r) => setTimeout(r, 150));
    expect(mockSendUpdated).toHaveBeenCalledTimes(1);
  });

  test('dispara notificacoes separadas para URIs diferentes', async () => {
    subscriptionManager.subscribe('session-1', 'agentmap://a');
    subscriptionManager.subscribe('session-1', 'agentmap://b');
    bus = globalEventBus.subscribe((event) => {
      const legacySubscribers = subscriptionManager.getSubscribers(event.uri);
      if (legacySubscribers.length > 0) {
        mockSendUpdated({ uri: event.uri }).catch(() => {});
      }
    });

    globalEventBus.publish({ uri: 'agentmap://a', timestamp: Date.now(), reason: 'a' });
    globalEventBus.publish({ uri: 'agentmap://b', timestamp: Date.now(), reason: 'b' });
    await new Promise((r) => setTimeout(r, 150));
    expect(mockSendUpdated).toHaveBeenCalledTimes(2);
    expect(mockSendUpdated).toHaveBeenNthCalledWith(1, { uri: 'agentmap://a' });
    expect(mockSendUpdated).toHaveBeenNthCalledWith(2, { uri: 'agentmap://b' });
  });
});
