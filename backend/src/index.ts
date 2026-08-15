import { createApp } from './app';
import { loadSettings } from './config';
import { criarMonitoramentoWebSocket } from './websocket/monitoramento';
import http from 'http';

const settings = loadSettings();
const PORTA = settings.portaApi;

const app = createApp();
const server = http.createServer(app);
const { wss } = criarMonitoramentoWebSocket(server);

server.listen(PORTA, () => {
  console.log(`\n========================================`);
  console.log(`  Gerenciador Local de Agentes de IA`);
  console.log(`  Backend: http://localhost:${PORTA}`);
  console.log(`  Frontend: http://localhost:${PORTA}/index.html`);
  console.log(`========================================\n`);
});
