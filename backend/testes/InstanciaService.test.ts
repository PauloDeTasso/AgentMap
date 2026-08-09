import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { FileService } from '../src/arquivos/FileService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { InstanciaService } from '../src/servicios/InstanciaService';

describe('InstanciaService', () => {
  const projectRoot = path.join(os.tmpdir(), 'agentmap-instancia-test-' + Date.now());
  fs.mkdirSync(projectRoot, { recursive: true });

  const fsSvc = new FileService(projectRoot);
  const validator = new SchemaValidator(path.resolve(__dirname, '..', '..', 'esquemas'));
  const auditoria = new AuditoriaService(fsSvc);
  const service = new InstanciaService(fsSvc, auditoria, validator);

  beforeAll(() => {
    fs.mkdirSync(path.join(projectRoot, '.ia', 'instancias'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, '.ia', 'instancias', 'instancias.json'), JSON.stringify({ instancias: [] }, null, 2), 'utf-8');
  });

  afterAll(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  test('cria instância com campos padrão', async () => {
    const result = await service.criar({
      agenteId: 'backend',
      projetoId: 'proj-1',
      workspaceId: 'ws-1',
      workspacePath: '/tmp/ws-1',
      tipoInstancia: 'EXECUTOR',
      status: 'REGISTRADA',
      modoAutonomia: 'MANUAL',
      capabilities: ['test']
    });
    expect(result.sucesso).toBe(true);
    expect(result.dados?.instanciaId).toBeDefined();
    expect(result.dados?.status).toBe('REGISTRADA');
    expect(result.dados?.datas.criacao).toBeDefined();
  });

  test('cria segunda instância com ID sequencial', async () => {
    const result = await service.criar({
      agenteId: 'frontend',
      projetoId: 'proj-1',
      workspaceId: 'ws-1',
      workspacePath: '/tmp/ws-1',
      tipoInstancia: 'EXECUTOR',
      status: 'CONECTADA',
      modoAutonomia: 'AUTONOMA'
    });
    expect(result.sucesso).toBe(true);
    expect(result.dados?.instanciaId).toMatch(/^INS-2026-00002$/);
  });

  test('lista instâncias sem filtros', async () => {
    const result = service.listar();
    expect(result.sucesso).toBe(true);
    expect(result.dados).toHaveLength(2);
  });

  test('lista instâncias filtradas por agenteId', async () => {
    const result = service.listar({ agenteId: 'backend' });
    expect(result.sucesso).toBe(true);
    expect(result.dados).toHaveLength(1);
  });

  test('lista instâncias filtradas por status', async () => {
    const result = service.listar({ status: 'CONECTADA' });
    expect(result.sucesso).toBe(true);
    expect(result.dados).toHaveLength(1);
  });

  test('obtém instância por ID', async () => {
    const result = service.obter('INS-2026-00001');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.agenteId).toBe('backend');
  });

  test('obtém instância por instanciaId', async () => {
    const result = service.obterPorInstanciaId('INS-2026-00001');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.agenteId).toBe('backend');
  });

  test('atualiza status e modoAutonomia', async () => {
    const result = await service.atualizar('INS-2026-00001', { status: 'CONECTADA', modoAutonomia: 'ASSISTIDA' });
    expect(result.sucesso).toBe(true);
    expect(result.dados?.status).toBe('CONECTADA');
    expect(result.dados?.modoAutonomia).toBe('ASSISTIDA');
    expect(result.dados?.datas.ultimaConexao).toBeDefined();
  });

  test('exclui instância', async () => {
    const result = await service.excluir('INS-2026-00001');
    expect(result.sucesso).toBe(true);
    const listResult = service.listar();
    expect(listResult.dados).toHaveLength(1);
  });

  test('obtém instância inexistente retorna erro', async () => {
    const result = service.obter('INS-9999');
    expect(result.sucesso).toBe(false);
    expect(result.codigoErro).toBe('NOT_FOUND');
  });
});
