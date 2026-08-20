import { WebSocketServer, WebSocket } from 'ws';
import { Server, IncomingMessage } from 'http';
import { MonitoramentoService, MensagemMonitoramento } from '../servicios/MonitoramentoService';

export class MonitoramentoWebSocket {
  private wss: WebSocketServer | null = null;
  private clientes: Set<WebSocket> = new Set();
  private mensagemHandler: (msg: MensagemMonitoramento) => void;

  private ORIGINS_PERMITIDAS: string[];

  constructor(private monitoramento: MonitoramentoService) {
    this.mensagemHandler = (msg: MensagemMonitoramento) => this.enviarParaTodos(msg);
    this.monitoramento.on('mensagem', this.mensagemHandler);
    const porta = process.env.PORTA || '3150';
    this.ORIGINS_PERMITIDAS = [
      `http://localhost:${porta}`,
      `http://localhost:3150`,
      `http://127.0.0.1:${porta}`,
      `http://127.0.0.1:3150`
    ];
  }

  iniciar(server: Server, caminho = '/ws/monitoramento'): void {
    this.wss = new WebSocketServer({
      server,
      path: caminho,
      verifyClient: (info: { origin: string; req: IncomingMessage; secure: boolean }) => this.verificarOrigem(info)
    });

    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const origin = req.headers?.origin || req.headers?.referer || '';
      const isLocal = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || !origin;
      if (!isLocal) {
        console.warn(`[WebSocket] Origem não permitida rejeitada: ${origin || 'sem origin'}`);
        ws.send(JSON.stringify({ type: 'erro', data: { mensagem: 'Origem não permitida' } }));
        ws.close(1008, 'Forbidden');
        return;
      }

      if (!origin) {
        console.log('[WebSocket] Cliente conectado sem header Origin (permitido em dev)');
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

  private verificarOrigem(info: { origin: string; req: IncomingMessage; secure: boolean }): boolean {
    const origin = info.origin || (info.req.headers && (info.req.headers as any).origin);
    if (!origin) return true;
    return this.ORIGINS_PERMITIDAS.includes(origin);
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

      case 'solicitar_kilo_state':
        const kiloState = await this.monitoramento.obterKiloState();
        ws.send(JSON.stringify({ type: 'kilo_state', data: kiloState }));
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
        try {
          ws.send(envelope);
        } catch (err) {
          console.error('[WebSocket] Erro ao enviar mensagem:', err);
        }
      }
    }
  }

  parar(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.monitoramento.off('mensagem', this.mensagemHandler);
    for (const ws of this.clientes) {
      ws.close();
    }
    this.clientes.clear();
    console.log('[WebSocket] Servidor de monitoramento parado');
  }
}
