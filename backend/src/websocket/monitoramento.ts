import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { MonitoramentoService, MensagemMonitoramento } from '../servicios/MonitoramentoService';
import { API_KEY } from '../seguranca/auth';

export class MonitoramentoWebSocket {
  private wss: WebSocketServer | null = null;
  private clientes: Set<WebSocket> = new Set();

  constructor(private monitoramento: MonitoramentoService) {
    this.monitoramento.on('mensagem', (msg: MensagemMonitoramento) => {
      this.enviarParaTodos(msg);
    });
  }

  iniciar(server: Server, caminho = '/ws/monitoramento'): void {
    this.wss = new WebSocketServer({ server, path: caminho });

    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const token = req.headers['authorization']?.replace('Bearer ', '') || req.headers['x-api-key'];
      if (!token || token !== API_KEY) {
        ws.send(JSON.stringify({ type: 'erro', data: { mensagem: 'Não autorizado' } }));
        ws.close(1008, 'Unauthorized');
        return;
      }

      console.log('[WebSocket] Cliente conectado ao monitoramento');
      this.clientes.add(ws);

      const welcomeMsg: MensagemMonitoramento = {
        id: `MSG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        tipo: 'CONECTADO',
        emissor: 'sistema',
        conteudo: 'Conectado ao monitoramento do AgentMap'
      };
      ws.send(JSON.stringify(welcomeMsg));

      const modo = this.monitoramento.obterModo();
      ws.send(JSON.stringify({
        type: 'mensagem_nova',
        data: {
          id: `MSG-${Date.now()}-modo`,
          timestamp: new Date().toISOString(),
          tipo: 'MODO_ATUAL',
          emissor: 'sistema',
          conteudo: `Modo atual: ${modo.modoGlobal}`,
          modo: modo.modoGlobal
        }
      }));

      const agentes = this.monitoramento.listarAgentes();
      ws.send(JSON.stringify({
        type: 'agente_status_alterado',
        data: agentes
      }));

      ws.on('message', async (data: Buffer) => {
        try {
          const payload = JSON.parse(data.toString());
          await this.processarMensagem(ws, payload);
        } catch (err) {
          ws.send(JSON.stringify({
            type: 'erro',
            data: { mensagem: 'JSON inválido recebido' }
          }));
        }
      });

      ws.on('close', () => {
        console.log('[WebSocket] Cliente desconectado');
        this.clientes.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('[WebSocket] Erro na conexão:', err.message);
        this.clientes.delete(ws);
      });
    });

    console.log(`[WebSocket] Servidor de monitoramento iniciado em ws://localhost:${process.env.PORTA || 3150}${caminho}`);
  }

  private async processarMensagem(ws: WebSocket, payload: any): Promise<void> {
    const { type, data } = payload;

    switch (type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', data: { timestamp: Date.now() } }));
        break;

      case 'solicitar_mensagens':
        const msgs = this.monitoramento.listarMensagens(data?.limite || 100);
        ws.send(JSON.stringify({ type: 'mensagens', data: msgs }));
        break;

      case 'solicitar_agentes':
        const agentes = this.monitoramento.listarAgentes();
        ws.send(JSON.stringify({ type: 'agentes', data: agentes }));
        break;

      case 'alterar_modo':
        const result = this.monitoramento.alterarModo(
          data?.modo,
          data?.escopo === 'AGENTE' ? 'AGENTE' : 'GLOBAL',
          data?.agenteId
        );
        ws.send(JSON.stringify({ type: 'resultado', data: result }));
        break;

      case 'solicitar_pendentes_dispatcher':
        const pendentes = this.monitoramento.listarPendentesDispatcher(data?.agenteId);
        ws.send(JSON.stringify({ type: 'pendentes_dispatcher', data: pendentes }));
        break;

      case 'executar_pendente_dispatcher':
        const execResult = await this.monitoramento.executarPendenteDispatcher(data?.agenteId);
        ws.send(JSON.stringify({ type: 'dispatch_resultado', data: execResult }));
        break;

      case 'solicitar_logs_dispatcher':
        const logs = this.monitoramento.listarLogsDispatcher(data?.limite || 100);
        ws.send(JSON.stringify({ type: 'logs_dispatcher', data: logs }));
        break;

      case 'intervenir':
        this.monitoramento.executarIntervencao(data?.comando, data?.payload || {})
          .then(result => {
            ws.send(JSON.stringify({ type: 'intervencao_resultado', data: result }));
          })
          .catch(err => {
            ws.send(JSON.stringify({ type: 'erro', data: { mensagem: err?.message || String(err) } }));
          });
        break;

      default:
        ws.send(JSON.stringify({ type: 'erro', data: { mensagem: `Tipo de mensagem desconhecido: ${type}` } }));
    }
  }

  private enviarParaTodos(mensagem: MensagemMonitoramento): void {
    if (this.clientes.size === 0) return;

    const envelope = JSON.stringify({
      type: 'mensagem_nova',
      data: mensagem
    });

    for (const ws of this.clientes) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(envelope);
      }
    }
  }

  parar(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    for (const ws of this.clientes) {
      ws.close();
    }
    this.clientes.clear();
    console.log('[WebSocket] Servidor de monitoramento parado');
  }
}
