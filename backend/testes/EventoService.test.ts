import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { FileService } from '../src/arquivos/FileService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { EventoService } from '../src/servicios/EventoService';

describe('EventoService', () => {
  const projectRoot = path.join(os.tmpdir(), 'agentmap-evento-test-' + Date.now());
  fs.mkdirSync(projectRoot, { recursive: true });

  const iaDir = path.join(projectRoot, '.ia', 'eventos');
  fs.mkdirSync(iaDir, { recursive: true });

  const fsSvc = new FileService(projectRoot);
  const validator = new SchemaValidator(path.resolve(__dirname, '..', '..', 'esquemas'));
  const auditoria = new AuditoriaService(fsSvc);
  const service = new EventoService(fsSvc, auditoria, validator);

  beforeAll(() => {
    fs.writeFileSync(path.join(iaDir, 'eventos.json'), JSON.stringify({ eventos: [] }, null, 2), 'utf-8');
  });

  afterAll(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  test('cria evento com ID automático', async () => {
    const result = service.registrar({ tipo: 'HANDOFF_CRIADO', origem: 'AGT-BACKEND', destino: 'AGT-FRONTEND', referenciaTipo: 'handoff', referenciaId: 'HOF-2026-00001', mensagem: 'Novo handoff' });
    expect(result.sucesso).toBe(true);
    expect(result.dados?.id).toMatch(/^EVT-2026-00001$/);
    expect(result.dados?.estado).toBe('PENDENTE');
    expect(result.dados?.datas.criadoEm).toBeDefined();
    expect(result.dados?.datas.consumidoEm).toBeNull();
  });

  test('cria segundo evento com ID sequencial', async () => {
    const result = service.registrar({ tipo: 'HANDOFF_ACEITO', origem: 'AGT-FRONTEND', destino: 'AGT-BACKEND', referenciaTipo: 'handoff', referenciaId: 'HOF-2026-00001', mensagem: 'Handoff aceito' });
    expect(result.sucesso).toBe(true);
    expect(result.dados?.id).toMatch(/^EVT-2026-00002$/);
  });

  test('lista eventos sem filtros', () => {
    const result = service.listar();
    expect(result.sucesso).toBe(true);
    expect(result.dados).toHaveLength(2);
  });

  test('lista eventos por destino', () => {
    const result = service.listar({ destino: 'AGT-FRONTEND' });
    expect(result.sucesso).toBe(true);
    expect(result.dados).toHaveLength(1);
  });

  test('lista eventos por estado', () => {
    const result = service.listar({ estado: 'PENDENTE' });
    expect(result.sucesso).toBe(true);
    expect(result.dados).toHaveLength(2);
  });

  test('obtém evento por ID', () => {
    const result = service.obter('EVT-2026-00001');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.tipo).toBe('HANDOFF_CRIADO');
  });

  test('marca evento como consumido', async () => {
    const result = service.marcarConsumido('EVT-2026-00001');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.estado).toBe('CONSUMIDO');
    expect(result.dados?.datas.consumidoEm).toBeDefined();
  });

  test('idempotente ao marcar evento já consumido', async () => {
    const result = service.marcarConsumido('EVT-2026-00001');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.estado).toBe('CONSUMIDO');
  });
});