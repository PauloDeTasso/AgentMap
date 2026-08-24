import { iniciarObservabilidade } from './observability';
import { loadSettings } from './config';
import * as path from 'path';

async function bootstrap() {
  await iniciarObservabilidade();

  const { createApp } = await import('./app');
  const { ProjetoService } = await import('./servicios/ProjetoService');
  const { SchemaValidator } = await import('./validacao/SchemaValidator');
  const { MonitoramentoWebSocket } = await import('./websocket/monitoramento');

  const settings = loadSettings();
  const PORTA = settings.portaApi;

  const esquemasPath = path.resolve(__dirname, '..', '..', 'esquemas');
  const validator = new SchemaValidator(esquemasPath);
  const projetoService = new ProjetoService(validator);

  const { MonitoramentoService } = await import('./servicios/MonitoramentoService');
  const { FileService } = await import('./arquivos/FileService');
  const { AuditoriaService } = await import('./servicios/AuditoriaService');

  function getMonitoramentoDeProjeto(projetoId: string): any {
    const registro = projetoService.listarProjetos();
    if (!registro.sucesso || !registro.dados) return null;
    const proj = registro.dados.find((p) => p.id === projetoId || p.caminhoRaiz === projetoId);
    if (!proj) return null;

    const aberto = projetoService.getProjetoCached(proj.id);
    if (aberto) return aberto.monitoramento;

    const fileService = new FileService(proj.caminhoRaiz);
    const auditoria = new AuditoriaService(fileService);
    return new MonitoramentoService(fileService, auditoria, validator);
  }

  function getMonitoramentoAtual(projetoId?: string): any {
    if (projetoId) {
      const monitoramento = getMonitoramentoDeProjeto(projetoId);
      if (monitoramento) return monitoramento;
    }
    const projetoResult = projetoService.getProjetoAtual();
    if (projetoResult.sucesso && projetoResult.dados) {
      return projetoResult.dados.monitoramento;
    }
    return null;
  }

  const app = createApp(getMonitoramentoAtual);
  const server = app.listen(PORTA, () => {
    console.log(`\n========================================`);
    console.log(`  Gerenciador Local de Agentes de IA`);
    console.log(`  Backend: http://localhost:${PORTA}`);
    console.log(`  Frontend: http://localhost:${PORTA}/index.html`);
    console.log(`  WebSocket: ws://localhost:${PORTA}/ws/monitoramento`);
    console.log(`========================================\n`);
  });

  const wsServer = new MonitoramentoWebSocket(projetoService);
  wsServer.iniciar(server);
}

bootstrap().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
