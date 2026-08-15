import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { MonitoramentoService } from '../servicios/MonitoramentoService';

type Server = http.Server;

export const INTERVALO_ORFAOS_MS = 30000;

export function criarMonitoramentoWebSocket(
  httpServer: Server,
  monitoramento?: MonitoramentoService,
  intervaloOrfaosMs: number = INTERVALO_ORFAOS_MS
): {
  wss: WebSocketServer;
  monitoramentoService: MonitoramentoService;
} {
  const svc = monitoramento ?? new MonitoramentoService();
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (dados: string) => {
      try {
        const msg = JSON.parse(dados);
        if (msg.tipo === 'ping' && msg.agenteId) {
          svc.registrarHeartbeat(msg.agenteId);
          ws.send(JSON.stringify({ tipo: 'pong', agenteId: msg.agenteId }));
        }
      } catch {
        // ignora mensagens malformadas
      }
    });
  });

  const timer = setInterval(() => {
    const orfaos = svc.verificarOrfaos();
    if (orfaos.length > 0) {
      const payload = JSON.stringify({ tipo: 'AGENTE_ORFAO', agentes: orfaos });
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }
  }, intervaloOrfaosMs);

  (wss as any)._timer = timer;

  return { wss, monitoramentoService: svc };
}

