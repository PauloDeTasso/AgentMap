import { iniciarObservabilidade } from './observability';
import { loadSettings } from './config';
import * as path from 'path';

async function bootstrap() {
  await iniciarObservabilidade();

  const { createApp } = await import('./app');
  const { ProjetoService } = await import('./servicios/ProjetoService');
  const { SchemaValidator } = await import('./validacao/SchemaValidator');
  const { MonitoramentoService } = await import('./servicios/MonitoramentoService');
  const { MonitoramentoWebSocket } = await import('./websocket/monitoramento');

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

  let monitoramento;
  if (projetoResult.sucesso && projetoResult.dados) {
    const projeto = projetoResult.dados;
    monitoramento = new MonitoramentoService(projeto.fileService, projeto.auditoria, projeto.validator);
  } else {
    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const fileService = new (await import('./arquivos/FileService')).FileService(repoRoot);
    const { AuditoriaService } = await import('./servicios/AuditoriaService');
    monitoramento = new MonitoramentoService(fileService, new AuditoriaService(fileService), validator);
  }

  const wsServer = new MonitoramentoWebSocket(monitoramento);
  wsServer.iniciar(server);
}

bootstrap().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
