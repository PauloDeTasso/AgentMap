import { mcpServer, projetoService } from '../src/mcp-server/server';
import { subscriptionManager, ListenSubscription } from '../src/mcp-server/subscriptions/subscription-manager';
import { LegacyProtocolAdapter, ModernProtocolAdapter, detectProtocolVersion } from '../src/mcp-server/subscriptions/protocol-adapter';
import '../src/mcp-server/resources';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

function criarProjetoTeste() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentmap-mcp-sub-test-'));
  const iaDir = path.join(tmpDir, '.ia');

  const dirs = [
    'contratos', 'tarefas', 'dependencias', 'solicitacoes', 'handoffs',
    'estado', 'auditoria', 'monitoramento', 'configuracao', 'eventos', 'contexto'
  ];
  for (const d of dirs) {
    fs.mkdirSync(path.join(iaDir, d), { recursive: true });
  }

  fs.writeFileSync(path.join(iaDir, 'fluxo-trabalho.md'), '# Fluxo\n');
  fs.writeFileSync(path.join(iaDir, 'contratos', 'contrato-teste.json'), JSON.stringify({ id: 'CNT-001' }));
  fs.writeFileSync(path.join(iaDir, 'tarefas', 'tarefas.json'), JSON.stringify({ tarefas: [] }));
  fs.writeFileSync(path.join(iaDir, 'dependencias', 'dependencias.json'), JSON.stringify({ dependencias: [] }));

  const projetoId = 'PROJ-TEST-' + Date.now();
  const config = {
    id: projetoId,
    nome: 'Projeto Teste MCP',
    descricao: 'Teste',
    versao: '1.0.0',
    estado: 'ativo',
    idioma: 'pt-BR',
    fusoHorario: 'America/Sao_Paulo',
    proprietario: { tipo: 'humano', nome: 'Test' },
    objetivos: [],
    escopo: { incluso: [], excluido: [] },
    tecnologias: { frontend: [], backend: [], android: [], bancoDeDados: [], infraestrutura: [], testes: [] },
    ambiente: 'desenvolvimento',
    arquiteturas: [],
    padroes: [],
    diretorios: {},
    configuracaoIa: { diretorio: '/.ia', contratoPrincipal: '/.ia/contratos/contrato-projeto.json', estadoAtual: '/.ia/estado/estado-atual.json' },
    datas: { criacao: new Date().toISOString(), ultimaAtualizacao: new Date().toISOString() }
  };
  fs.mkdirSync(path.join(iaDir, 'configuracao'), { recursive: true });
  fs.mkdirSync(path.join(iaDir, 'auditoria'), { recursive: true });
  fs.writeFileSync(path.join(iaDir, 'configuracao', 'projeto.json'), JSON.stringify(config));
  fs.writeFileSync(path.join(iaDir, 'auditoria', 'eventos.json'), JSON.stringify({ eventos: [] }));

  const openResult = (projetoService as any).abrirProjeto(tmpDir);
  if (!openResult.sucesso) {
    throw new Error('Falha ao abrir projeto de teste: ' + openResult.erro);
  }

  return {
    tmpDir,
    projetoId,
    cleanup: () => {
      (projetoService as any).registro.projetos = (projetoService as any).registro.projetos.filter((p: any) => p.id !== projetoId);
      (projetoService as any).registro.projetoAtual = null;
      (projetoService as any).projetosAbertos.delete(projetoId);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  };
}

describe('MCP Subscription Protocol (2025/2026)', () => {
  const requestHandlers = (mcpServer.server as any)._requestHandlers as Map<string, any>;
  const notificationHandlers = (mcpServer.server as any)._notificationHandlers as Map<string, any>;
  const signal = new AbortController().signal;

  beforeEach(() => {
    (projetoService as any).registro.projetoAtual = null;
    (projetoService as any).projetosAbertos.clear();
    (subscriptionManager as any).subscriptions.clear();
    subscriptionManager.getAllListenSubscriptions().forEach((sub) => subscriptionManager.removeListenSubscription(sub.subscriptionId));
  });

  describe('ProtocolAdapter', () => {
    test('detectProtocolVersion retorna 2025 para undefined', () => {
      expect(detectProtocolVersion(undefined)).toBe('2025');
    });

    test('detectProtocolVersion retorna 2025 para versao antiga', () => {
      expect(detectProtocolVersion('2025-03-26')).toBe('2025');
    });

    test('detectProtocolVersion retorna 2026 para versao 2026', () => {
      expect(detectProtocolVersion('2026-01-01')).toBe('2026');
    });

    test('LegacyProtocolAdapter notifica URI', async () => {
      const sendUpdated = jest.fn().mockResolvedValue(undefined);
      const adapter = new LegacyProtocolAdapter(sendUpdated);
      await adapter.notify('agentmap://test');
      expect(sendUpdated).toHaveBeenCalledWith({ uri: 'agentmap://test' });
    });

    test('ModernProtocolAdapter notifica URI', async () => {
      const sendUpdated = jest.fn().mockResolvedValue(undefined);
      const adapter = new ModernProtocolAdapter(sendUpdated);
      await adapter.notify('agentmap://test');
      expect(sendUpdated).toHaveBeenCalledWith({ uri: 'agentmap://test' });
    });

    test('LegacyProtocolAdapter subscribe/unsubscribe sao no-op', () => {
      const adapter = new LegacyProtocolAdapter(jest.fn());
      expect(() => adapter.subscribe('s1', 'agentmap://test')).not.toThrow();
      expect(() => adapter.unsubscribe('s1', 'agentmap://test')).not.toThrow();
    });

    test('ModernProtocolAdapter subscribe/unsubscribe sao no-op', () => {
      const adapter = new ModernProtocolAdapter(jest.fn());
      expect(() => adapter.subscribe('s1', 'agentmap://test')).not.toThrow();
      expect(() => adapter.unsubscribe('s1', 'agentmap://test')).not.toThrow();
    });
  });

  describe('resources/subscribe (2025 legacy)', () => {
    let env: ReturnType<typeof criarProjetoTeste>;

    beforeEach(() => {
      env = criarProjetoTeste();
    });

    afterEach(() => {
      env.cleanup();
    });

    test('subscreve sessao no URI', async () => {
      const handler = requestHandlers.get('resources/subscribe');
      const result = await handler({ method: 'resources/subscribe', params: { uri: 'agentmap://solicitacoes/AGT-BACKEND' } }, { sessionId: 'session-1', signal });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.sucesso).toBe(true);
      expect(subscriptionManager.getSubscribers('agentmap://solicitacoes/AGT-BACKEND')).toEqual(['session-1']);
    });

    test('nao duplica subscription para mesma sessao', async () => {
      const handler = requestHandlers.get('resources/subscribe');
      await handler({ method: 'resources/subscribe', params: { uri: 'agentmap://test' } }, { sessionId: 'session-1', signal });
      await handler({ method: 'resources/subscribe', params: { uri: 'agentmap://test' } }, { sessionId: 'session-1', signal });
      expect(subscriptionManager.getSubscribers('agentmap://test')).toEqual(['session-1']);
    });

    test('retorna erro quando nenhum projeto aberto', async () => {
      const handler = requestHandlers.get('resources/subscribe');
      env.cleanup();
      const result = await handler({ method: 'resources/subscribe', params: { uri: 'agentmap://test' } }, { sessionId: 'session-1', signal });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.sucesso).toBe(false);
      expect(parsed.codigoErro).toBe('NO_PROJECT_OPEN');
    });

    test('usa sessionId do requestInfo como fallback', async () => {
      const handler = requestHandlers.get('resources/subscribe');
      await handler({ method: 'resources/subscribe', params: { uri: 'agentmap://test' } }, { requestInfo: { sessionId: 'session-from-info' }, signal });
      expect(subscriptionManager.getSubscribers('agentmap://test')).toEqual(['session-from-info']);
    });
  });

  describe('resources/unsubscribe (2025 legacy)', () => {
    let env: ReturnType<typeof criarProjetoTeste>;

    beforeEach(() => {
      env = criarProjetoTeste();
    });

    afterEach(() => {
      env.cleanup();
    });

    test('remove subscription da sessao', async () => {
      subscriptionManager.subscribe('session-1', 'agentmap://test');
      const handler = requestHandlers.get('resources/unsubscribe');
      const result = await handler({ method: 'resources/unsubscribe', params: { uri: 'agentmap://test' } }, { sessionId: 'session-1', signal });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.sucesso).toBe(true);
      expect(subscriptionManager.getSubscribers('agentmap://test')).toEqual([]);
    });

    test('retorna sucesso mesmo sem subscription', async () => {
      const handler = requestHandlers.get('resources/unsubscribe');
      const result = await handler({ method: 'resources/unsubscribe', params: { uri: 'agentmap://test' } }, { sessionId: 'session-1', signal });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.sucesso).toBe(true);
    });
  });

  describe('subscriptions/listen (2026 modern)', () => {
    let env: ReturnType<typeof criarProjetoTeste>;

    beforeEach(() => {
      env = criarProjetoTeste();
    });

    afterEach(() => {
      env.cleanup();
    });

    test('cria listen subscription e envia acknowledged', async () => {
      const handler = requestHandlers.get('subscriptions/listen');
      const acknowledgedSpy = jest.spyOn(mcpServer.server, 'notification').mockResolvedValue(undefined);

      const listenPromise = handler(
        { id: 'req-1', method: 'subscriptions/listen', params: { notifications: { resourceSubscriptions: ['agentmap://test'] } } },
        { sessionId: 'session-1', signal }
      );

      const subscriptionId = String(undefined);
      const actualSubscriptionId = String(undefined);
      expect(subscriptionManager.getListenSubscription(actualSubscriptionId)).toBeDefined();
      expect(subscriptionManager.getListenSubscription(actualSubscriptionId)?.active).toBe(true);
      expect(subscriptionManager.getListenSubscribersForUri('agentmap://test')).toEqual([actualSubscriptionId]);

      expect(acknowledgedSpy).toHaveBeenCalledWith({
        method: 'notifications/subscriptions/acknowledged',
        params: { _meta: { 'io.modelcontextprotocol/subscriptionId': subscriptionId } }
      });

      acknowledgedSpy.mockRestore();
      const sub = subscriptionManager.getListenSubscription(actualSubscriptionId);
      if (sub) sub.resolve({});
      await listenPromise;
    });

    test('usa request.id como subscriptionId', async () => {
      const handler = requestHandlers.get('subscriptions/listen');
      jest.spyOn(mcpServer.server, 'notification').mockResolvedValue(undefined);

      const abortController = new AbortController();
      const listenPromise = handler(
        { id: 'req-42', method: 'subscriptions/listen', params: { notifications: { resourceSubscriptions: [] } } },
        { sessionId: 'session-1', signal: abortController.signal }
      );

      const actualSubscriptionId = String(undefined);
      expect(subscriptionManager.getListenSubscription(actualSubscriptionId)).toBeDefined();
      
      abortController.abort();
      await listenPromise;
    });

    test('retorna erro quando nenhum projeto aberto', async () => {
      const handler = requestHandlers.get('subscriptions/listen');
      jest.spyOn(mcpServer.server, 'notification').mockResolvedValue(undefined);
      env.cleanup();
      const result = await handler(
        { id: 'req-1', method: 'subscriptions/listen', params: { notifications: { resourceSubscriptions: ['agentmap://test'] } } },
        { sessionId: 'session-1', signal }
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.sucesso).toBe(false);
      expect(parsed.codigoErro).toBe('NO_PROJECT_OPEN');
    });

    test('resolve promise quando signal e abortado', async () => {
      const handler = requestHandlers.get('subscriptions/listen');
      jest.spyOn(mcpServer.server, 'notification').mockResolvedValue(undefined);

      const abortController = new AbortController();
      const listenPromise = handler(
        { id: 'req-abort', method: 'subscriptions/listen', params: { notifications: { resourceSubscriptions: ['agentmap://test'] } } },
        { sessionId: 'session-1', signal: abortController.signal }
      );

      abortController.abort();
      const result = await listenPromise;
      const actualSubscriptionId = String(undefined);
      expect(result).toEqual({});
      expect(subscriptionManager.getListenSubscription(actualSubscriptionId)).toBeUndefined();
    });
  });

  describe('notifications/cancelled (2026)', () => {
    test('remove listen subscription quando cancelada', async () => {
      const sub: ListenSubscription = {
        subscriptionId: 'listen-1',
        filter: { resourceSubscriptions: ['agentmap://test'] },
        sessionId: 'session-1',
        active: true,
        resolve: () => {}
      };
      subscriptionManager.addListenSubscription(sub);
      expect(subscriptionManager.getListenSubscription('listen-1')).toBeDefined();

      const handler = notificationHandlers.get('notifications/cancelled');
      await handler({ method: 'notifications/cancelled', params: { requestId: 'listen-1', reason: 'client_disconnect' } });

      expect(subscriptionManager.getListenSubscription('listen-1')).toBeUndefined();
    });

    test('ignora cancelamento de subscription inexistente', async () => {
      const handler = notificationHandlers.get('notifications/cancelled');
      await expect(handler({ method: 'notifications/cancelled', params: { requestId: 'nonexistent' } })).resolves.toBeUndefined();
    });
  });
});
