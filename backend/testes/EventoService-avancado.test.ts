import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { FileService } from '../src/arquivos/FileService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { EventoService } from '../src/servicios/EventoService';

describe('EventoService — avancado', () => {
  const projectRoot = path.join(os.tmpdir(), 'agentmap-evento-avancado-test-' + Date.now());
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

  describe('validacao', () => {
    test('rejeita evento com campos obrigatorios faltando', () => {
      const result = service.registrar({ tipo: 'HANDOFF_CRIADO' } as any);
      expect(result.sucesso).toBe(false);
      expect(result.codigoErro).toBe('VALIDATION_ERROR');
      expect(result.erro).toContain('Validação');
    });

    test('aceita evento com todos campos preenchidos', () => {
      const result = service.registrar({
        id: 'EVT-2026-00001',
        tipo: 'HANDOFF_CRIADO',
        origem: 'AGT-BACKEND',
        destino: 'AGT-FRONTEND',
        referenciaTipo: 'handoff',
        referenciaId: 'HOF-2026-00001',
        mensagem: 'Teste valido',
        estado: 'PENDENTE',
        datas: { criadoEm: new Date().toISOString(), criacao: new Date().toISOString(), consumidoEm: null }
      });
      expect(result.sucesso).toBe(true);
    });

    test('aceita ID customizado quando fornecido', () => {
      const result = service.registrar({
        id: 'EVT-CUSTOM-00001',
        tipo: 'HANDOFF_CRIADO',
        origem: 'A',
        destino: 'B',
        referenciaTipo: 'handoff',
        referenciaId: 'H1',
        mensagem: 'Custom ID',
        estado: 'PENDENTE',
        datas: { criadoEm: new Date().toISOString(), criacao: new Date().toISOString(), consumidoEm: null }
      });
      expect(result.sucesso).toBe(true);
      expect(result.dados?.id).toBe('EVT-CUSTOM-00001');
    });
  });

  describe('idempotencia e duplicados', () => {
    test('rejeita ID duplicado', () => {
      const primeiro = service.registrar({
        id: 'EVT-DUP-00001',
        tipo: 'HANDOFF_CRIADO',
        origem: 'A',
        destino: 'B',
        referenciaTipo: 'handoff',
        referenciaId: 'H1',
        mensagem: 'Primeiro',
        estado: 'PENDENTE',
        datas: { criadoEm: new Date().toISOString(), criacao: new Date().toISOString(), consumidoEm: null }
      });
      expect(primeiro.sucesso).toBe(true);

      const segundo = service.registrar({
        id: 'EVT-DUP-00001',
        tipo: 'HANDOFF_CRIADO',
        origem: 'A',
        destino: 'B',
        referenciaTipo: 'handoff',
        referenciaId: 'H1',
        mensagem: 'Segundo',
        estado: 'PENDENTE',
        datas: { criadoEm: new Date().toISOString(), criacao: new Date().toISOString(), consumidoEm: null }
      });
      expect(segundo.sucesso).toBe(false);
      expect(segundo.codigoErro).toBe('DUPLICATE_ID');
    });

    test('marcarConsumido e idempotente', () => {
      const evt = service.registrar({
        tipo: 'HANDOFF_ACEITO',
        origem: 'A',
        destino: 'B',
        referenciaTipo: 'handoff',
        referenciaId: 'H1',
        mensagem: 'Idempotente'
      });
      expect(evt.sucesso).toBe(true);

      const r1 = service.marcarConsumido(evt.dados!.id);
      expect(r1.sucesso).toBe(true);
      expect(r1.dados!.estado).toBe('CONSUMIDO');

      const r2 = service.marcarConsumido(evt.dados!.id);
      expect(r2.sucesso).toBe(true);
      expect(r2.dados!.estado).toBe('CONSUMIDO');
      expect(r2.dados!.datas.consumidoEm).toBe(r1.dados!.datas.consumidoEm);
    });
  });

  describe('filtros', () => {
    beforeAll(() => {
      service.registrar({ tipo: 'HANDOFF_CRIADO', origem: 'A', destino: 'AGT-1', referenciaTipo: 'handoff', referenciaId: 'H1', mensagem: 'Para 1' });
      service.registrar({ tipo: 'HANDOFF_ACEITO', origem: 'B', destino: 'AGT-2', referenciaTipo: 'handoff', referenciaId: 'H2', mensagem: 'Para 2' });
      service.registrar({ tipo: 'TAREFA_CRIADA', origem: 'C', destino: 'AGT-1', referenciaTipo: 'tarefa', referenciaId: 'T1', mensagem: 'Tarefa 1' });
      service.registrar({ tipo: 'HANDOFF_CONCLUIDO', origem: 'D', destino: 'AGT-3', referenciaTipo: 'handoff', referenciaId: 'H3', mensagem: 'Concluido' });
    });

    test('filtra por destino', () => {
      const result = service.listar({ destino: 'AGT-1' });
      expect(result.sucesso).toBe(true);
      expect(result.dados).toHaveLength(2);
    });

    test('filtra por estado PENDENTE', () => {
      const result = service.listar({ estado: 'PENDENTE' });
      expect(result.sucesso).toBe(true);
      expect(result.dados).toHaveLength(7);
      expect(result.dados!.every((e) => e.estado === 'PENDENTE')).toBe(true);
    });

    test('filtra por estado CONSUMIDO', () => {
      service.marcarConsumido('EVT-2026-00001');
      service.marcarConsumido('EVT-2026-00002');

      const result = service.listar({ estado: 'CONSUMIDO' });
      expect(result.sucesso).toBe(true);
      expect(result.dados).toHaveLength(2);
    });

    test('combina filtros de destino e estado', () => {
      service.marcarConsumido('EVT-2026-00003');

      const result = service.listar({ destino: 'AGT-1', estado: 'PENDENTE' });
      expect(result.sucesso).toBe(true);
      expect(result.dados).toHaveLength(1);
    });
  });

  describe('historico', () => {
    test('obter retorna evento por ID', () => {
      const result = service.obter('EVT-2026-00001');
      expect(result.sucesso).toBe(true);
      expect(result.dados?.id).toBe('EVT-2026-00001');
    });

    test('obter retorna erro para ID inexistente', () => {
      const result = service.obter('EVT-INEXISTENTE');
      expect(result.sucesso).toBe(false);
      expect(result.codigoErro).toBe('NOT_FOUND');
    });

    test('marcarConsumido atualiza datas', async () => {
      const antes = await service.listar();
      const pendentes = antes.dados!.filter((e) => e.estado === 'PENDENTE');
      if (pendentes.length > 0) {
        const id = pendentes[0].id;
        const r = service.marcarConsumido(id);
        expect(r.sucesso).toBe(true);
        expect(r.dados!.estado).toBe('CONSUMIDO');
        expect(r.dados!.datas.consumidoEm).toBeDefined();

        const apos = service.obter(id);
        expect(apos.sucesso).toBe(true);
        expect(apos.dados!.estado).toBe('CONSUMIDO');
      }
    });

    test('listar retorna total correto', () => {
      const result = service.listar();
      expect(result.sucesso).toBe(true);
      expect(result.dados!.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('auditoria', () => {
    test('registra auditoria ao criar evento', () => {
      const auditEvents = auditoria.listar(1000);
      const criados = auditEvents.filter((e) => e.tipo === 'EVENTO_CRIADO');
      expect(criados.length).toBeGreaterThan(0);
    });

    test('registra auditoria ao marcar como consumido', () => {
      const auditEvents = auditoria.listar(1000);
      const consumidos = auditEvents.filter((e) => e.tipo === 'EVENTO_CONSUMIDO');
      expect(consumidos.length).toBeGreaterThan(0);
    });

    test('evento de auditoria referencia o ID do evento', () => {
      const auditEvents = auditoria.listar(1000);
      const eventoAudit = auditEvents.find((e) => e.tipo === 'EVENTO_CRIADO');
      expect(eventoAudit?.dados).toHaveProperty('eventoId');
      expect(eventoAudit?.dados).toHaveProperty('tipo');
      expect(eventoAudit?.dados).toHaveProperty('origem');
      expect(eventoAudit?.dados).toHaveProperty('destino');
    });
  });
});
