import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { FileService } from '../src/arquivos/FileService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { DaemonManager } from '../src/servicios/DaemonManager';
import { ExecutorKiloDaemon } from '../src/servicios/ExecutorKiloDaemon';

describe.skip('ExecutorKiloDaemon — testes reais com kilocli', () => {
  const projectRoot = path.join(os.tmpdir(), 'agentmap-executor-test-' + Date.now());
  fs.mkdirSync(projectRoot, { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'contexto'), { recursive: true });

  const fsSvc = new FileService(projectRoot);
  const validator = new SchemaValidator(path.resolve(__dirname, '..', '..', 'esquemas'));
  const auditoria = new AuditoriaService(fsSvc);
  const daemonManager = new DaemonManager(projectRoot);
  const executor = new ExecutorKiloDaemon(fsSvc, auditoria, validator, daemonManager);
  const workspacePath = projectRoot;

  beforeAll(async () => {
    await daemonManager.start(workspacePath, 4197);
  });

  afterAll(async () => {
    const mappings = daemonManager.listarMappings();
    for (const mapping of mappings) {
      await daemonManager.stop(mapping.workspacePath);
    }
    const tentarRemover = (path: string, tentativas = 5) => {
      try {
        fs.rmSync(path, { recursive: true, force: true });
      } catch {
        if (tentativas > 0) {
          setTimeout(() => tentarRemover(path, tentativas - 1), 500);
        }
      }
    };
    tentarRemover(projectRoot);
  });

  test('dispatch executa kilo run e parseia JSON stream', async () => {
    const result = await executor.dispatch({
      tarefaId: 'TAR-TESTE-001',
      mensagem: 'responda OK',
      modoAutonomia: 'MANUAL',
      dir: workspacePath,
      title: 'teste-executor',
      timeoutMs: 30000
    });

    expect(result.sucesso).toBe(true);
    expect(result.dados?.status).toBe('SUCESSO');
    expect(result.dados?.sessionId).toBeDefined();
    expect(result.dados?.duracaoMs).toBeGreaterThan(0);
    expect(result.dados?.eventos).toBeDefined();
    expect(result.dados?.eventos?.length).toBeGreaterThan(0);

    const tipos = result.dados?.eventos?.map((e) => e.type) || [];
    expect(tipos).toContain('step_start');
    expect(tipos).toContain('text');
    expect(tipos).toContain('step_finish');
  });

  test('dispatch registra sessionID no log', async () => {
    const result = await executor.dispatch({
      tarefaId: 'TAR-TESTE-002',
      mensagem: 'diga 123',
      modoAutonomia: 'MANUAL',
      dir: workspacePath,
      title: 'teste-session',
      timeoutMs: 30000
    });

    expect(result.sucesso).toBe(true);
    expect(result.dados?.sessionId).toBeDefined();
    expect(result.dados?.sessionId).toMatch(/^ses_/);
  });

  test('listarLogs retorna logs recentes', async () => {
    const logs = executor.listarLogs(10);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].id).toBeDefined();
    expect(logs[0].comando).toContain('run');
  });

  test('dispatch com mensagem vazia falha com erro', async () => {
    const result = await executor.dispatch({
      tarefaId: 'TAR-TESTE-003',
      mensagem: '',
      modoAutonomia: 'MANUAL',
      dir: workspacePath,
      timeoutMs: 10000
    });

    expect(result.sucesso).toBe(false);
  });
});
