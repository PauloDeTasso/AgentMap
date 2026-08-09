import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { FileService } from '../src/arquivos/FileService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { SolicitacaoService } from '../src/servicios/SolicitacaoService';

describe('SolicitacaoService', () => {
  const projectRoot = path.join(os.tmpdir(), 'agentmap-solicitacao-test-' + Date.now());
  fs.mkdirSync(projectRoot, { recursive: true });

  const iaDir = path.join(projectRoot, '.ia', 'solicitacoes');
  fs.mkdirSync(iaDir, { recursive: true });

  const fsSvc = new FileService(projectRoot);
  const validator = new SchemaValidator(path.resolve(__dirname, '..', '..', 'esquemas'));
  const auditoria = new AuditoriaService(fsSvc);
  const service = new SolicitacaoService(fsSvc, auditoria, validator);

  const solicitacaoBase: any = {
    titulo: 'Adicionar campo status ao contrato',
    descricao: 'O contrato da API precisa disponibilizar o estado atual do contrato.',
    agenteSolicitante: { id: 'AGT-FRONTEND' },
    agenteResponsavel: { id: 'AGT-BACKEND' },
    alvo: { tipo: 'CONTRATO_API' as any, nome: 'Contrato de cliente', identificador: 'cliente-resposta', localizacao: 'backend/contratos/cliente-resposta.json' },
    alteracao: { tipo: 'ADICAO' as any, descricao: 'Adicionar o campo status ao contrato de resposta.', motivo: 'O frontend precisa receber o estado atual.', arquivosAfetados: ['ContratoRespostaDTO.java', 'cliente-resposta.json'] },
    impactos: ['BACKEND', 'FRONTEND', 'API'] as any[],
    dependencias: [],
    prioridade: 'MEDIA',
    requerAprovacao: true,
    aprovacao: { status: 'PENDENTE' as any, agenteId: null, data: null, observacao: null },
    tarefaOrigem: { id: 'TAR-2026-00042' }
  };

  beforeAll(() => {
    fs.writeFileSync(path.join(iaDir, 'solicitacoes.json'), JSON.stringify({ solicitacoes: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(iaDir, 'historico-alteracoes.json'), JSON.stringify({ eventos: [] }, null, 2), 'utf-8');
  });

  afterAll(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  test('cria solicitação válida com ID automático', async () => {
    const result = await service.criar(solicitacaoBase);
    expect(result.sucesso).toBe(true);
    expect(result.dados?.id).toMatch(/^ALT-2026-00001$/);
    expect(result.dados?.titulo).toBe('Adicionar campo status ao contrato');
    expect(result.dados?.status).toBe('PENDENTE');
    expect(result.dados?.datas.criadaEm).toBeDefined();
    expect(result.dados?.datas.atualizadaEm).toBeDefined();
    expect(result.dados?.datas.concluidaEm).toBeNull();
  });

  test('cria segunda solicitação com ID sequencial', async () => {
    const result2 = await service.criar({ ...solicitacaoBase, titulo: 'Segunda solicitação' });
    expect(result2.sucesso).toBe(true);
    expect(result2.dados?.id).toMatch(/^ALT-2026-00002$/);
  });

  test('rejeita solicitação sem título', async () => {
    const result = await service.criar({ ...solicitacaoBase, titulo: '' });
    expect(result.sucesso).toBe(false);
    expect(result.codigoErro).toBe('VALIDATION_ERROR');
  });

  test('rejeita solicitação sem agente solicitante', async () => {
    const result = await service.criar({ ...solicitacaoBase, agenteSolicitante: { id: '' } });
    expect(result.sucesso).toBe(false);
    expect(result.codigoErro).toBe('VALIDATION_ERROR');
  });

  test('rejeita prioridade inválida', async () => {
    const result = await service.criar({ ...solicitacaoBase, prioridade: 'ULTRAPRIORITARIA' as any });
    expect(result.sucesso).toBe(false);
  });

  test('rejeita status inválido', async () => {
    const result = await service.criar({ ...solicitacaoBase, status: 'INVALIDO' as any });
    expect(result.sucesso).toBe(false);
  });

  test('não reutiliza IDs', async () => {
    const result = await service.criar({ ...solicitacaoBase, id: 'ALT-2026-00001' });
    expect(result.sucesso).toBe(false);
    expect(result.codigoErro).toBe('DUPLICATE_ID');
  });

  test('lista solicitações', () => {
    const result = service.listar();
    expect(result.sucesso).toBe(true);
    expect(result.dados).toHaveLength(2);
  });

  test('obtém solicitação por ID', () => {
    const result = service.obter('ALT-2026-00001');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.titulo).toBe('Adicionar campo status ao contrato');
  });

  test('retorna erro para solicitação inexistente', () => {
    const result = service.obter('ALT-2026-99999');
    expect(result.sucesso).toBe(false);
    expect(result.codigoErro).toBe('NOT_FOUND');
  });

  test('atualiza solicitação existente', async () => {
    const result = await service.atualizar('ALT-2026-00002', { titulo: 'Título atualizado', status: 'EM_ANALISE' });
    expect(result.sucesso).toBe(true);
    expect(result.dados?.titulo).toBe('Título atualizado');
    expect(result.dados?.status).toBe('EM_ANALISE');
  });

  test('atualização mantém datas de criação e atualiza atualizadaEm', async () => {
    const result = await service.atualizar('ALT-2026-00002', { titulo: 'Mais um update' });
    expect(result.sucesso).toBe(true);
    expect(result.dados?.datas.criadaEm).toBeDefined();
    expect(result.dados?.datas.atualizadaEm).toBeDefined();
  });

  test('aprova solicitação', async () => {
    await service.atualizar('ALT-2026-00002', { status: 'AGUARDANDO_APROVACAO' });
    const result = await service.aprovar('ALT-2026-00002', 'AGT-APROVADOR', 'Aprovado em teste');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.status).toBe('APROVADA');
    expect(result.dados?.aprovacao.status).toBe('APROVADA');
    expect(result.dados?.aprovacao.agenteId).toBe('AGT-APROVADOR');
    expect(result.dados?.aprovacao.data).toBeDefined();
  });

  test('rejeita solicitação', async () => {
    const createResult = await service.criar({ ...solicitacaoBase, titulo: 'Para rejeitar' });
    const id = createResult.dados!.id;
    await service.atualizar(id, { status: 'EM_ANALISE' });
    await service.atualizar(id, { status: 'AGUARDANDO_APROVACAO' });
    const result = await service.rejeitar(id, 'AGT-REJEITOR', 'Não aplicável');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.status).toBe('REJEITADA');
    expect(result.dados?.aprovacao.status).toBe('REJEITADA');
  });

  test('exclui solicitação', async () => {
    await service.criar({ ...solicitacaoBase, titulo: 'Para excluir' });
    const listarResult = service.listar();
    const countBefore = listarResult.dados!.length;

    const result = await service.excluir('ALT-2026-00003');
    expect(result.sucesso).toBe(true);
    expect(result.dados).toBe(true);

    const listarAfter = service.listar();
    expect(listarAfter.dados!.length).toBe(countBefore - 1);
  });

  test('registra histórico ao criar', async () => {
    const result = await service.criar({ ...solicitacaoBase, titulo: 'Com histórico' });
    expect(result.sucesso).toBe(true);
    const hist = service.listarHistorico(result.dados!.id);
    expect(hist.sucesso).toBe(true);
    expect(hist.dados).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tipo: 'SOLICITACAO_CRIADA', solicitacaoId: result.dados!.id })
      ])
    );
  });

  test('registra histórico ao aprovar', async () => {
    const createResult = await service.criar({ ...solicitacaoBase, titulo: 'Historico aprovacao' });
    const id = createResult.dados!.id;
    await service.atualizar(id, { status: 'EM_ANALISE' });
    await service.atualizar(id, { status: 'AGUARDANDO_APROVACAO' });
    await service.aprovar(id, 'AGT-APROVADOR');
    const hist = service.listarHistorico(id);
    expect(hist.sucesso).toBe(true);
    const tipos = hist.dados!.map((e) => e.tipo);
    expect(tipos).toContain('SOLICITACAO_CRIADA');
    expect(tipos).toContain('SOLICITACAO_APROVADA');
  });

  test('permite agenteResponsavel null', async () => {
    const result = await service.criar({
      ...solicitacaoBase,
      agenteResponsavel: { id: null },
      titulo: 'Sem responsável'
    });
    expect(result.sucesso).toBe(true);
    expect(result.dados?.agenteResponsavel.id).toBeNull();
  });

  test('permite tarefaOrigem null', async () => {
    const result = await service.criar({
      ...solicitacaoBase,
      tarefaOrigem: null,
      titulo: 'Sem tarefa origem'
    });
    expect(result.sucesso).toBe(true);
    expect(result.dados?.tarefaOrigem).toBeNull();
  });
});
