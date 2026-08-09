import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { FileService } from '../src/arquivos/FileService';
import { AuditoriaService } from '../src/servicios/AuditoriaService';

function criarAmbienteAuditoria() {
  const projectRoot = path.join(os.tmpdir(), 'agentmap-auditoria-test-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8));
  fs.mkdirSync(projectRoot, { recursive: true });
  const iaDir = path.join(projectRoot, '.ia', 'auditoria');
  fs.mkdirSync(iaDir, { recursive: true });
  fs.writeFileSync(path.join(iaDir, 'eventos.json'), JSON.stringify({ eventos: [] }, null, 2), 'utf-8');
  const fsSvc = new FileService(projectRoot);
  const service = new AuditoriaService(fsSvc);
  return { projectRoot, service, fsSvc };
}

describe('AuditoriaService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registrar', () => {
    test('cria evento de auditoria com campos corretos', () => {
      const { service } = criarAmbienteAuditoria();
      const evento = service.registrar('TESTE_CRIADO', 'Evento de teste criado', { agenteId: 'AGT-1' });

      expect(evento.id).toBeDefined();
      expect(evento.tipo).toBe('TESTE_CRIADO');
      expect(evento.origem).toBe('gerenciador');
      expect(evento.agenteId).toBe('AGT-1');
      expect(evento.usuarioId).toBeUndefined();
      expect(evento.tarefaId).toBeUndefined();
      expect(evento.descricao).toBe('Evento de teste criado');
      expect(evento.dados).toEqual({ agenteId: 'AGT-1' });
      expect(evento.resultado).toBe('sucesso');
      expect(evento.data).toBeDefined();
    });

    test('aceita parametros opcionais de origem e resultado', () => {
      const { service } = criarAmbienteAuditoria();
      const evento = service.registrar('TESTE_FALHA', 'Falha simulada', { agenteId: 'AGT-2', usuarioId: 'USR-1', tarefaId: 'TSK-1' }, 'api', 'falha');

      expect(evento.origem).toBe('api');
      expect(evento.resultado).toBe('falha');
      expect(evento.agenteId).toBe('AGT-2');
      expect(evento.usuarioId).toBe('USR-1');
      expect(evento.tarefaId).toBe('TSK-1');
    });

    test('persiste evento no arquivo', () => {
      const { service, projectRoot } = criarAmbienteAuditoria();
      service.registrar('TESTE_PERSISTENCIA', 'Deve estar no arquivo');

      const raw = fs.readFileSync(path.join(projectRoot, '.ia', 'auditoria', 'eventos.json'), 'utf-8');
      const parsed = JSON.parse(raw);
      const ultimo = parsed.eventos[parsed.eventos.length - 1];

      expect(ultimo.tipo).toBe('TESTE_PERSISTENCIA');
      expect(ultimo.descricao).toBe('Deve estar no arquivo');
    });

    test('IDs sao unicos entre eventos de auditoria', () => {
      const { service } = criarAmbienteAuditoria();
      const ev1 = service.registrar('TESTE_UNICO', 'Unique 1');
      const ev2 = service.registrar('TESTE_UNICO', 'Unique 2');

      expect(ev1.id).not.toBe(ev2.id);
    });

    test('dados armazenam objetos complexos', () => {
      const { service } = criarAmbienteAuditoria();
      const dadosComplexos = {
        detalhes: { chave: 'valor', array: [1, 2, 3] },
        nested: { profundidade: 2 }
      };
      service.registrar('TESTE_COMPLEXO', 'Dados complexos', dadosComplexos);

      const armazenado = service.listar(1)[0];
      const dados = armazenado.dados as Record<string, any>;
      expect(dados.detalhes.chave).toBe('valor');
      expect(dados.detalhes.array).toEqual([1, 2, 3]);
      expect(dados.nested.profundidade).toBe(2);
    });
  });

  describe('listar', () => {
    test('retorna todos eventos em ordem reversa', () => {
      const { service } = criarAmbienteAuditoria();
      service.registrar('TESTE_1', 'Primeiro');
      service.registrar('TESTE_2', 'Segundo');
      service.registrar('TESTE_3', 'Terceiro');

      const eventos = service.listar();
      expect(eventos).toHaveLength(3);
      expect(eventos[0].tipo).toBe('TESTE_3');
      expect(eventos[1].tipo).toBe('TESTE_2');
      expect(eventos[2].tipo).toBe('TESTE_1');
    });

    test('respeita limite padrao de 100', () => {
      const { service } = criarAmbienteAuditoria();
      for (let i = 0; i < 150; i++) {
        service.registrar('TESTE_' + i, 'Evento ' + i);
      }
      const eventos = service.listar();
      expect(eventos.length).toBeLessThanOrEqual(100);
    });

    test('respeita limite customizado', () => {
      const { service } = criarAmbienteAuditoria();
      service.registrar('TESTE_A', 'A');
      service.registrar('TESTE_B', 'B');

      const eventos = service.listar(2);
      expect(eventos).toHaveLength(2);
    });

    test('retorna array vazio quando nao ha eventos', () => {
      const { service } = criarAmbienteAuditoria();
      const eventos = service.listar();
      expect(eventos).toEqual([]);
    });
  });

  describe('buscar', () => {
    test('filtra por tipo', () => {
      const { service } = criarAmbienteAuditoria();
      service.registrar('TESTE_CRIADO', 'Criado 1');
      service.registrar('TESTE_FALHA', 'Falha 1');
      service.registrar('TESTE_CRIADO', 'Criado 2');

      const resultados = service.buscar('TESTE_CRIADO');
      expect(resultados).toHaveLength(2);
      expect(resultados.every((e) => e.tipo === 'TESTE_CRIADO')).toBe(true);
    });

    test('filtra por agenteId', () => {
      const { service } = criarAmbienteAuditoria();
      service.registrar('TESTE_AGENTE', 'Agente 1', { agenteId: 'AGT-X' });
      service.registrar('TESTE_AGENTE', 'Agente 2', { agenteId: 'AGT-Y' });
      service.registrar('TESTE_AGENTE', 'Agente 3', { agenteId: 'AGT-X' });

      const resultados = service.buscar(undefined, 'AGT-X');
      expect(resultados).toHaveLength(2);
      expect(resultados.every((e) => e.agenteId === 'AGT-X')).toBe(true);
    });

    test('combina tipo e agenteId', () => {
      const { service } = criarAmbienteAuditoria();
      service.registrar('TESTE_COMBO', 'Combo 1', { agenteId: 'AGT-A' });
      service.registrar('TESTE_COMBO', 'Combo 2', { agenteId: 'AGT-B' });
      service.registrar('OUTRO_TIPO', 'Outro', { agenteId: 'AGT-A' });

      const resultados = service.buscar('TESTE_COMBO', 'AGT-A');
      expect(resultados).toHaveLength(1);
      expect(resultados[0].tipo).toBe('TESTE_COMBO');
      expect(resultados[0].agenteId).toBe('AGT-A');
    });

    test('retorna vazio quando nenhum evento corresponde', () => {
      const { service } = criarAmbienteAuditoria();
      const resultados = service.buscar('TIPO_INEXISTENTE');
      expect(resultados).toEqual([]);
    });
  });
});
