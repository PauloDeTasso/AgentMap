import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { MonitoramentoService } from '../src/servicios/MonitoramentoService';
import { criarMonitoramentoWebSocket } from '../src/websocket/monitoramento';

describe('MonitoramentoService', () => {
  test('registrarHeartbeat armazena timestamp do agente', () => {
    const service = new MonitoramentoService(60000);
    service.registrarHeartbeat('AGT-001');
    expect(service.obterAgentesConhecidos()).toContain('AGT-001');
  });

  test('verificarOrfaos retorna lista vazia quando heartbeats são recentes', () => {
    const service = new MonitoramentoService(60000);
    service.registrarHeartbeat('AGT-001');
    expect(service.verificarOrfaos()).toEqual([]);
  });

  test('verificarOrfaos detecta agente sem heartbeat dentro do timeout', () => {
    const service = new MonitoramentoService(100);
    service.registrarHeartbeat('AGT-001');
    expect(service.verificarOrfaos()).toEqual([]);

    const agora = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(agora + 150);
    expect(service.verificarOrfaos()).toEqual(['AGT-001']);
    jest.spyOn(Date, 'now').mockRestore();
  });

  test('verificarOrfaos não retorna agentes recentes mesmo com múltiplos agentes', () => {
    const service = new MonitoramentoService(100);
    service.registrarHeartbeat('AGT-001');
    service.registrarHeartbeat('AGT-002');

    const agora = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(agora + 150);
    service.registrarHeartbeat('AGT-003');
    expect(service.verificarOrfaos()).toEqual(expect.arrayContaining(['AGT-001', 'AGT-002']));
    expect(service.verificarOrfaos()).not.toContain('AGT-003');
    jest.spyOn(Date, 'now').mockRestore();
  });
});

describe('MonitoramentoWebSocket', () => {
  test('responde pong ao receber ping com agenteId', async () => {
    const server = http.createServer();
    const { wss } = criarMonitoramentoWebSocket(server, undefined, 60000);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const porta = (server.address() as any).port;
        const ws = new WebSocket(`ws://localhost:${porta}`);
        ws.on('open', async () => {
          const resposta = await new Promise<any>((resolveMsg) => {
            ws.on('message', (dados) => {
              resolveMsg(JSON.parse(dados.toString()));
            });
            ws.send(JSON.stringify({ tipo: 'ping', agenteId: 'AGT-001' }));
          });
          expect(resposta).toEqual({ tipo: 'pong', agenteId: 'AGT-001' });
          ws.close();
          resolve();
        });
      });
    });

    (wss as any)._timer && clearInterval((wss as any)._timer);
    wss.close();
    server.close();
  });

  test('ignora mensagens malformadas', async () => {
    const server = http.createServer();
    const { wss } = criarMonitoramentoWebSocket(server, undefined, 60000);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const porta = (server.address() as any).port;
        const ws = new WebSocket(`ws://localhost:${porta}`);
        ws.on('open', () => {
          let mensagemRecebida = false;
          ws.on('message', () => {
            mensagemRecebida = true;
          });
          ws.send('mensagem inválida');
          setTimeout(() => {
            expect(mensagemRecebida).toBe(false);
            ws.close();
            resolve();
          }, 50);
        });
      });
    });

    (wss as any)._timer && clearInterval((wss as any)._timer);
    wss.close();
    server.close();
  });

  test('envia AGENTE_ORFAO quando há órfãos', async () => {
    const service = new MonitoramentoService(100);
    service.registrarHeartbeat('AGT-ORFAO');

    const server = http.createServer();
    const { wss } = criarMonitoramentoWebSocket(server, service, 50);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const porta = (server.address() as any).port;
        const ws = new WebSocket(`ws://localhost:${porta}`);
        ws.on('open', async () => {
          const resposta = await new Promise<any>((resolveMsg) => {
            ws.on('message', (dados) => {
              resolveMsg(JSON.parse(dados.toString()));
            });
          });

          await new Promise((r) => setTimeout(r, 200));
          expect(resposta.tipo).toBe('AGENTE_ORFAO');
          expect(resposta.agentes).toContain('AGT-ORFAO');
          ws.close();
          resolve();
        });
      });
    });

    (wss as any)._timer && clearInterval((wss as any)._timer);
    wss.close();
    server.close();
  });

  test('não envia AGENTE_ORFAO quando não há órfãos', async () => {
    const service = new MonitoramentoService(500);
    service.registrarHeartbeat('AGT-ATIVO');

    const server = http.createServer();
    const { wss } = criarMonitoramentoWebSocket(server, service, 50);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const porta = (server.address() as any).port;
        const ws = new WebSocket(`ws://localhost:${porta}`);
        ws.on('open', () => {
          let mensagemRecebida = false;
          ws.on('message', () => {
            mensagemRecebida = true;
          });
          setTimeout(() => {
            expect(mensagemRecebida).toBe(false);
            ws.close();
            resolve();
          }, 200);
        });
      });
    });

    (wss as any)._timer && clearInterval((wss as any)._timer);
    wss.close();
    server.close();
  });
});
