import { createApp } from './app';
import { loadSettings } from './config';
import { ProjetoService } from './servicios/ProjetoService';
import { SchemaValidator } from './validacao/SchemaValidator';
import { MonitoramentoService } from './servicios/MonitoramentoService';
import { MonitoramentoWebSocket } from './websocket/monitoramento';
import * as path from 'path';

const settings = loadSettings();
const PORTA = settings.portaApi;

const app = createApp();
const server = app.listen(PORTA, () => {
  console.log(`\n========================================`);
  console.log(`  Gerenciador Local de Agentes de IA`);
  console.log(`  Backend: http://localhost:${PORTA}`);
  console.log(`  Frontend: http://localhost:${PORTA}/index.html`);
  console.log(`  WebSocket: ws://localhost:${PORTA}/ws/monitoramento`);
  console.log(`========================================\n`);
});

const esquemasPath = path.resolve(__dirname, '..', '..', 'esquemas');
const validator = new SchemaValidator(esquemasPath);
const projetoService = new ProjetoService(validator);
const projetoResult = projetoService.getProjetoAtual();
if (projetoResult.sucesso && projetoResult.dados) {
  const projeto = projetoResult.dados;
  const monitoramento = new MonitoramentoService(projeto.fileService, projeto.auditoria, projeto.validator);
  const wsServer = new MonitoramentoWebSocket(monitoramento);
  wsServer.iniciar(server);
} else {
  console.log('[WebSocket] Nenhum projeto aberto — WebSocket iniciado sem monitoramento');
}
