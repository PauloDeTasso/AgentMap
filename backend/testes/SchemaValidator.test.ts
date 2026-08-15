import { SchemaValidator } from '../src/validacao/SchemaValidator';
import * as path from 'path';

describe('SchemaValidator', () => {
  const validator = new SchemaValidator(path.resolve(__dirname, '..', '..', 'esquemas'));

  test('valida projeto.json válido', () => {
    const dados = {
      id: 'teste',
      nome: 'Projeto Teste',
      descricao: 'Descrição',
      versao: '1.0.0',
      estado: 'EM_DESENVOLVIMENTO',
      idioma: 'pt-BR',
      fusoHorario: 'America/Sao_Paulo',
      proprietario: { tipo: 'humano', nome: 'Teste' },
      objetivos: ['Obj'],
      escopo: { incluso: [], excluido: [] },
      tecnologias: { frontend: [], backend: [], android: [], bancoDeDados: [], infraestrutura: [], testes: [] },
      arquiteturas: ['Clean'],
      padroes: ['SOLID'],
      diretorios: { frontend: '/frontend', backend: '/backend', android: '/android', banco: '/banco', infraestrutura: '/infraestrutura', implantacao: '/implantacao', testes: '/testes', documentacao: '/docs' },
      configuracaoIa: { diretorio: '/.ia', contratoPrincipal: '/.ia/contratos/contrato-projeto.json', estadoAtual: '/.ia/estado/estado-atual.json' },
      datas: { criacao: '2026-01-01T00:00:00.000Z', ultimaAtualizacao: '2026-01-01T00:00:00.000Z' }
    };
    const result = validator.validar('projeto', dados);
    expect(result.valido).toBe(true);
  });

  test('rejeita projeto inválido (campos obrigatórios ausentes)', () => {
    const result = validator.validar('projeto', { nome: 'Teste' });
    expect(result.valido).toBe(false);
    expect(result.erros).toBeDefined();
    expect(result.erros!.length).toBeGreaterThan(0);
  });

  test('valida agente-perfil', () => {
    const dados = {
      id: 'frontend',
      nome: 'Frontend',
      funcao: 'desenvolvimento_frontend',
      descricao: 'Agente frontend',
      estado: 'ativo',
      permissoes: { ler: true, criar: true, alterar: true, excluir: true, executar: true, testar: true, revisar: false, aprovar: false, implantar: false },
      diretoriosPermitidos: ['/frontend/**'],
      diretoriosProibidos: ['/backend/**'],
      contratosObrigatorios: ['contrato-api'],
      datas: { criacao: '2026-01-01T00:00:00.000Z', ultimaAtualizacao: '2026-01-01T00:00:00.000Z' }
    };
    const result = validator.validar('agente-perfil', dados);
    expect(result.valido).toBe(true);
  });

  test('valida contrato', () => {
    const dados = {
      id: 'contrato-api',
      nome: 'Contrato da API',
      versao: '1.0.0',
      estado: 'ativo',
      historico: [{ versao: '1.0.0', data: '2026-01-01T00:00:00.000Z', alteracao: 'Criação' }]
    };
    const result = validator.validar('contrato', dados);
    expect(result.valido).toBe(true);
  });

  test('valida tarefa com estados válidos', () => {
    const dados = {
      id: 'TAREFA-0001',
      titulo: 'Teste',
      objetivo: 'Objetivo',
      tipo: 'desenvolvimento',
      estado: 'RASCUNHO',
      prioridade: 'MEDIA',
      agenteResponsavel: 'frontend',
      dominio: 'frontend',
      ambiente: 'desenvolvimento'
    };
    const result = validator.validar('tarefa', dados);
    expect(result.valido).toBe(true);
  });

  test('rejeita tarefa com estado inválido', () => {
    const dados = {
      id: 'TAREFA-0001',
      titulo: 'Teste',
      objetivo: 'Obj',
      tipo: 'dev',
      estado: 'invalido',
      prioridade: 'MEDIA',
      agenteResponsavel: 'fe',
      dominio: 'fe',
      ambiente: 'dev'
    };
    const result = validator.validar('tarefa', dados);
    expect(result.valido).toBe(false);
  });

  test('valida agentes-registry', () => {
    const dados = {
      agentes: [
        { id: 'fe', nome: 'Frontend', funcao: 'dev', estado: 'ativo', arquivoPerfil: '/.ia/agentes/frontend/frontend.json' }
      ]
    };
    const result = validator.validar('agentes-registry', dados);
    expect(result.valido).toBe(true);
  });

  test('valida contratos-registry', () => {
    const dados = {
      contratos: [
        { id: 'teste', nome: 'Teste', arquivo: '/.ia/contratos/teste.json', versao: '1.0.0', estado: 'ativo', obrigatorio: true }
      ]
    };
    const result = validator.validar('contratos-registry', dados);
    expect(result.valido).toBe(true);
  });

  test('schema inexistente retorna erro', () => {
    const result = validator.validar('nao-existe', {});
    expect(result.valido).toBe(false);
    expect(result.erros?.[0]).toContain('não encontrado');
  });

  test('valida JSON sintaticamente', () => {
    const result = validator.validarJson('{"teste": true}');
    expect(result.valido).toBe(true);
  });

  test('rejeita JSON inválido', () => {
    const result = validator.validarJson('{invalid json');
    expect(result.valido).toBe(false);
  });
});
