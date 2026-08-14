import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { DaemonManager } from '../src/servicios/DaemonManager';

describe('DaemonManager — testes reais com kilocli', () => {
  const projectRoot = path.join(os.tmpdir(), 'agentmap-daemon-test-' + Date.now());
  fs.mkdirSync(projectRoot, { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'contexto'), { recursive: true });

  const daemonManager = new DaemonManager(projectRoot);
  const workspacePath = projectRoot;

  afterAll(async () => {
    const mappings = daemonManager.listarMappings();
    for (const mapping of mappings) {
      try {
        await daemonManager.stop(mapping.workspacePath);
      } catch {
        // ignore stop errors in cleanup
      }
    }
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  test('start inicia daemon e retorna mapping com porta/pid/versao', async () => {
    const result = await daemonManager.start(workspacePath, 4196);
    expect(result.sucesso).toBe(true);
    expect(result.dados?.pid).toBeGreaterThan(0);
    expect(result.dados?.porta).toBe(4196);
    expect(result.dados?.versaoKilo).toBe('7.4.21');
    expect(result.dados?.healthy).toBe(true);
    expect(result.dados?.url).toContain('http://127.0.0.1:4196');
  });

  test('start para mesmo workspace retorna mapping existente saudável', async () => {
    const result = await daemonManager.start(workspacePath, 4196);
    expect(result.sucesso).toBe(true);
    expect(result.dados?.healthy).toBe(true);
    expect(result.dados?.porta).toBe(4196);
  });

  test('status retorna healthy=true e campos preenchidos', async () => {
    const result = await daemonManager.status(workspacePath);
    expect(result.sucesso).toBe(true);
    expect(result.dados?.healthy).toBe(true);
    expect(result.dados?.pid).toBeGreaterThan(0);
    expect(result.dados?.porta).toBe(4196);
  });

  test('listarMappings retorna o workspace registrado', async () => {
    const mappings = daemonManager.listarMappings();
    expect(mappings).toHaveLength(1);
    expect(mappings[0].workspacePath).toBe(path.resolve(workspacePath));
  });

  test('stop para o daemon e marca healthy=false', async () => {
    const stopResult = await daemonManager.stop(workspacePath);
    expect(stopResult.sucesso).toBe(true);

    const statusResult = await daemonManager.status(workspacePath);
    expect(statusResult.sucesso).toBe(true);
    expect(statusResult.dados?.healthy).toBe(false);
  });

  test('restart inicia novamente após stop', async () => {
    const restartResult = await daemonManager.restart(workspacePath, 4196);
    expect(restartResult.sucesso).toBe(true);
    expect(restartResult.dados?.healthy).toBe(true);
    expect(restartResult.dados?.porta).toBe(4196);
  });

  test('start com porta diferente atualiza mapping', async () => {
    const result = await daemonManager.start(workspacePath, 4199);
    expect(result.sucesso).toBe(true);
    expect(result.dados?.porta).toBe(4199);
  });
});
