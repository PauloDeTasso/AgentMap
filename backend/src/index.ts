import { iniciarObservabilidade } from './observability';
import { loadSettings, ProjectRootResolver } from './config';
import * as path from 'path';
import { ProjetoService } from './servicios/ProjetoService';
import { SchemaValidator } from './validacao/SchemaValidator';
import { criarServicos, Servicos } from './api/middleware';
import { MonitoramentoWebSocket } from './websocket/monitoramento';

/**
 * Bootstrap do AgentMap — Single-Project Mode.
 * 
 * 1. Inicializa observabilidade
 * 2. Carrega settings
 * 3. Abre o projeto raiz (auto-detectado)
 * 4. Cria serviços singleton
 * 5. Inicia HTTP + WebSocket
 */
async function bootstrap() {
  await iniciarObservabilidade();

  const settings = loadSettings();
  const PORTA = settings.portaApi;

  // Setup validador
  const esquemasPath = path.resolve(__dirname, '..', '..', 'esquemas');
  const validator = new SchemaValidator(esquemasPath);

  // Abre o projeto raiz
  const projetoService = new ProjetoService(validator);
  const resultado = projetoService.abrirProjetoRaiz();

  if (!resultado.sucesso || !resultado.dados) {
    console.error('[bootstrap] Falha ao abrir projeto raiz:', resultado.erro);
    console.error('[bootstrap] Verifique se o diretório .ia/ existe em:', ProjectRootResolver.resolve());
    console.error('[bootstrap] Defina AGENTMAP_PROJECT_ROOT para apontar para o projeto.');
    process.exit(1);
  }

  const projeto = resultado.dados;
  console.log(`[bootstrap] Projeto aberto: ${projeto.nome} (${projeto.id})`);
  console.log(`[bootstrap] Caminho: ${projeto.caminhoRaiz}`);

  // Cria serviços singleton
  const servicos: Servicos = criarServicos(projeto);

  // Cria app com serviços
  const { createApp } = await import('./app');
  const app = createApp(servicos, projetoService);

  const server = app.listen(PORTA, () => {
    console.log(`\n========================================`);
    console.log(`  AgentMap — Single-Project Mode`);
    console.log(`  Backend: http://localhost:${PORTA}`);
    console.log(`  Frontend: http://localhost:${PORTA}/index.html`);
    console.log(`  WebSocket: ws://localhost:${PORTA}/ws/monitoramento`);
    console.log(`  Projeto: ${projeto.nome}`);
    console.log(`========================================\n`);
  });

  // WebSocket
  const wsServer = new MonitoramentoWebSocket(projetoService);
  wsServer.iniciar(server);
}

bootstrap().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
