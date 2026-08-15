import { EventBus, ResourceChangedEvent } from '../src/mcp-server/events/event-bus';
import { SubscriptionManager } from '../src/mcp-server/subscriptions/subscription-manager';
import {
  solicitacoesUri,
  handoffsUri,
  bloqueiosUri,
  parseSolicitacoesUri,
  parseHandoffsUri,
  parseBloqueiosUri,
  getResourceType
} from '../src/mcp-server/resources/uri-factory';
import { authorizeResourceAccess } from '../src/mcp-server/resources/authorization';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus(50);
  });

  afterEach(() => {
    bus.shutdown();
  });

  test('entrega evento a handler inscrito', async () => {
    const handler = jest.fn();
    bus.subscribe(handler);
    bus.publish({ uri: 'agentmap://test', timestamp: Date.now(), reason: 'test' });

    await new Promise((r) => setTimeout(r, 100));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      uri: 'agentmap://test',
      timestamp: expect.any(Number),
      reason: 'test'
    });
  });

  test('coalesce eventos do mesmo URI dentro da janela', async () => {
    const handler = jest.fn();
    bus.subscribe(handler);
    bus.publish({ uri: 'agentmap://test', timestamp: Date.now(), reason: 'first' });
    bus.publish({ uri: 'agentmap://test', timestamp: Date.now(), reason: 'second' });

    await new Promise((r) => setTimeout(r, 100));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('entrega eventos de URIs diferentes separadamente', async () => {
    const handler = jest.fn();
    bus.subscribe(handler);
    bus.publish({ uri: 'agentmap://a', timestamp: Date.now(), reason: 'a' });
    bus.publish({ uri: 'agentmap://b', timestamp: Date.now(), reason: 'b' });

    await new Promise((r) => setTimeout(r, 100));
    expect(handler).toHaveBeenCalledTimes(2);
  });

  test('unsubscribe remove handler', async () => {
    const handler = jest.fn();
    const unsub = bus.subscribe(handler);
    unsub();
    bus.publish({ uri: 'agentmap://test', timestamp: Date.now(), reason: 'test' });

    await new Promise((r) => setTimeout(r, 100));
    expect(handler).not.toHaveBeenCalled();
  });

  test('shutdown limpa timers e handlers', async () => {
    const handler = jest.fn();
    bus.subscribe(handler);
    bus.shutdown();
    bus.publish({ uri: 'agentmap://test', timestamp: Date.now(), reason: 'test' });

    await new Promise((r) => setTimeout(r, 100));
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;

  beforeEach(() => {
    manager = new SubscriptionManager();
  });

  test('subscribe adiciona sessao ao URI', () => {
    manager.subscribe('session-1', 'agentmap://test');
    expect(manager.getSubscribers('agentmap://test')).toEqual(['session-1']);
  });

  test('subscribe duplicado nao duplica', () => {
    manager.subscribe('session-1', 'agentmap://test');
    manager.subscribe('session-1', 'agentmap://test');
    expect(manager.getSubscribers('agentmap://test')).toEqual(['session-1']);
  });

  test('unsubscribe remove sessao do URI', () => {
    manager.subscribe('session-1', 'agentmap://test');
    manager.unsubscribe('session-1', 'agentmap://test');
    expect(manager.getSubscribers('agentmap://test')).toEqual([]);
  });

  test('unsubscribeAll remove todas as sessoes', () => {
    manager.subscribe('session-1', 'agentmap://a');
    manager.subscribe('session-2', 'agentmap://b');
    manager.subscribe('session-1', 'agentmap://c');
    manager.unsubscribeAll('session-1');
    expect(manager.getSubscribers('agentmap://a')).toEqual([]);
    expect(manager.getSubscribers('agentmap://b')).toEqual(['session-2']);
    expect(manager.getSubscribers('agentmap://c')).toEqual([]);
  });

  test('getSubscriptionCount retorna total', () => {
    manager.subscribe('session-1', 'agentmap://a');
    manager.subscribe('session-2', 'agentmap://a');
    manager.subscribe('session-1', 'agentmap://b');
    expect(manager.getSubscriptionCount()).toBe(3);
  });
});

describe('UriFactory', () => {
  test('solicitacoesUri gera URI canonica', () => {
    expect(solicitacoesUri('AGT-BACKEND')).toBe('agentmap://solicitacoes/AGT-BACKEND');
  });

  test('handoffsUri gera URI canonica', () => {
    expect(handoffsUri('AGT-FRONTEND')).toBe('agentmap://handoffs/AGT-FRONTEND');
  });

  test('bloqueiosUri gera URI canonica', () => {
    expect(bloqueiosUri('proj-123')).toBe('agentmap://bloqueios/proj-123');
  });

  test('parseSolicitacoesUri extrai agenteId', () => {
    expect(parseSolicitacoesUri('agentmap://solicitacoes/AGT-BACKEND')).toBe('AGT-BACKEND');
  });

  test('parseHandoffsUri extrai agenteId', () => {
    expect(parseHandoffsUri('agentmap://handoffs/AGT-FRONTEND')).toBe('AGT-FRONTEND');
  });

  test('parseBloqueiosUri extrai projetoId', () => {
    expect(parseBloqueiosUri('agentmap://bloqueios/proj-123')).toBe('proj-123');
  });

  test('getResourceType retorna tipo correto', () => {
    expect(getResourceType('agentmap://solicitacoes/AGT-BACKEND')).toBe('solicitacoes');
    expect(getResourceType('agentmap://handoffs/AGT-FRONTEND')).toBe('handoffs');
    expect(getResourceType('agentmap://bloqueios/proj-123')).toBe('bloqueios');
    expect(getResourceType('agentmap://unknown')).toBeNull();
  });

  test('encodeURIComponent em IDs com caracteres especiais', () => {
    expect(solicitacoesUri('AGT/BACKEND')).toBe('agentmap://solicitacoes/AGT%2FBACKEND');
    expect(parseSolicitacoesUri('agentmap://solicitacoes/AGT%2FBACKEND')).toBe('AGT/BACKEND');
  });
});

describe('authorizeResourceAccess', () => {
  const projeto = {
    id: 'proj-1',
    nome: 'Test',
    caminhoRaiz: '/tmp',
    fileService: null as any,
    auditoria: null as any,
    validator: null as any,
    config: {} as any,
    dependencia: null as any,
    fluxo: null as any
  };

  test('autoriza bloqueios para projeto correto', () => {
    expect(authorizeResourceAccess(projeto, 'agentmap://bloqueios/proj-1')).toBe(true);
  });

  test('rejeita bloqueios para projeto diferente', () => {
    expect(authorizeResourceAccess(projeto, 'agentmap://bloqueios/proj-2')).toBe(false);
  });

  test('autoriza solicitacoes e handoffs quando projeto existe', () => {
    expect(authorizeResourceAccess(projeto, 'agentmap://solicitacoes/AGT-BACKEND')).toBe(true);
    expect(authorizeResourceAccess(projeto, 'agentmap://handoffs/AGT-FRONTEND')).toBe(true);
  });

  test('rejeita URIs desconhecidas', () => {
    expect(authorizeResourceAccess(projeto, 'agentmap://unknown')).toBe(false);
  });
});
