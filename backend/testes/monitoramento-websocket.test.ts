import * as http from 'http';
import * as net from 'net';
import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { MonitoramentoWebSocket } from '../src/websocket/monitoramento';

class MockMonitoramentoService extends EventEmitter {
  obterModo() {
    return { modoGlobal: 'MANUAL' };
  }
  listarAgentes() {
    return [];
  }
  listarMensagens() {
    return [];
  }
  listarPendentesDispatcher() {
    return [];
  }
  async executarPendenteDispatcher() {
    return { sucesso: false };
  }
  listarLogsDispatcher() {
    return [];
  }
  alterarModo() {
    return { sucesso: true };
  }
  async executarIntervencao() {
    return { sucesso: true };
  }
}

describe('MonitoramentoWebSocket — verifyClient', () => {
  let server: http.Server;
  let wsServer: MonitoramentoWebSocket;
  let mockMonitoramento: MockMonitoramentoService;

  beforeAll((done) => {
    mockMonitoramento = new MockMonitoramentoService();
    wsServer = new MonitoramentoWebSocket(mockMonitoramento as any);
    server = http.createServer();
    wsServer.iniciar(server);
    server.listen(0, '127.0.0.1', done);
  });

  afterAll((done) => {
    wsServer.parar();
    server.close(done);
  });

  function getPort(): number {
    return (server.address() as net.AddressInfo).port;
  }

  function buildUrl(): string {
    return `ws://127.0.0.1:${getPort()}/ws/monitoramento`;
  }

  test('aceita conexão de localhost:3150', async () => {
    const ws = new WebSocket(buildUrl(), {
      headers: {
        origin: 'http://localhost:3150',
        'x-api-key': 'any-token'
      }
    });

    const accepted = await new Promise<boolean>((resolve) => {
      ws.on('open', () => resolve(true));
      ws.on('error', () => resolve(false));
      setTimeout(() => {
        ws.terminate();
        resolve(false);
      }, 2000);
    });

    expect(accepted).toBe(true);
    ws.close();
  });

  test('aceita conexão de 127.0.0.1:3150', async () => {
    const ws = new WebSocket(buildUrl(), {
      headers: {
        origin: 'http://127.0.0.1:3150',
        'x-api-key': 'any-token'
      }
    });

    const accepted = await new Promise<boolean>((resolve) => {
      ws.on('open', () => resolve(true));
      ws.on('error', () => resolve(false));
      setTimeout(() => {
        ws.terminate();
        resolve(false);
      }, 2000);
    });

    expect(accepted).toBe(true);
    ws.close();
  });

  test('aceita conexão sem origin', async () => {
    const ws = new WebSocket(buildUrl(), {
      headers: {
        'x-api-key': 'any-token'
      }
    });

    const accepted = await new Promise<boolean>((resolve) => {
      ws.on('open', () => resolve(true));
      ws.on('error', () => resolve(false));
      setTimeout(() => {
        ws.terminate();
        resolve(false);
      }, 2000);
    });

    expect(accepted).toBe(true);
    ws.close();
  });

  test('rejeita conexão de origin malicioso', async () => {
    const ws = new WebSocket(buildUrl(), {
      headers: {
        origin: 'http://evil.com',
        'x-api-key': 'any-token'
      }
    });

    const rejected = await new Promise<boolean>((resolve) => {
      ws.on('open', () => resolve(false));
      ws.on('error', () => resolve(true));
      ws.on('close', (code: number) => {
        if (code === 1006 || code === 1008) return resolve(true);
        resolve(false);
      });
      setTimeout(() => {
        ws.terminate();
        resolve(true);
      }, 2000);
    });

    expect(rejected).toBe(true);
  });

  test('rejeita conexão de origin diferente', async () => {
    const ws = new WebSocket(buildUrl(), {
      headers: {
        origin: 'http://localhost:8080',
        'x-api-key': 'any-token'
      }
    });

    const rejected = await new Promise<boolean>((resolve) => {
      ws.on('open', () => resolve(false));
      ws.on('error', () => resolve(true));
      ws.on('close', (code: number) => {
        if (code === 1006 || code === 1008) return resolve(true);
        resolve(false);
      });
      setTimeout(() => {
        ws.terminate();
        resolve(true);
      }, 2000);
    });

    expect(rejected).toBe(true);
  });
});
