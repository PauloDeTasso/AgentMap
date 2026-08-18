import path from 'path';
import fs from 'fs';
import os from 'os';
import { FileService } from '../src/arquivos/FileService';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { TarefaService } from '../src/servicios/TarefaService';
import { AgenteService } from '../src/servicios/AgenteService';
import { BloqueioService } from '../src/servicios/BloqueioService';
import { SolicitacaoService } from '../src/servicios/SolicitacaoService';
import { DependenciaService } from '../src/servicios/DependenciaService';
import { HandoffService } from '../src/servicios/HandoffService';
import { EventoService } from '../src/servicios/EventoService';
import { ResultadoService } from '../src/servicios/ResultadoService';
import { StateMachineService } from '../src/servicios/StateMachineService';

const schemataDir = path.resolve(__dirname, '..', '..', 'esquemas');

function criarAmbienteTeste() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentmap-integracao-tar-2026-00013-'));
  const iaDir = path.join(tmpDir, '.ia');
  fs.mkdirSync(iaDir, { recursive: true });

  const validator = new SchemaValidator(schemataDir);
  const fsService = new FileService(tmpDir);
  const auditoria = new AuditoriaService(fsService);
  const stateMachine = new StateMachineService(fsService, auditoria, validator);

  const dirs = [
    'agentes', 'tarefas', 'solicitacoes', 'criterios', 'resultados', 'artefatos',
    'handoffs', 'pendencias', 'validacoes', 'conflitos', 'reservas', 'sessoes',
    'checkpoints', 'aprendizados', 'dependencias', 'responsabilidades', 'decisoes', 'riscos',
    'historico', 'auditoria', 'estado', 'procedimentos', 'politicas', 'contexto', 'qualidade',
    'permissoes', 'conhecimento', 'problemas', 'git', 'configuracao', 'contratos', 'eventos'
  ];
  dirs.forEach((d) => fs.mkdirSync(path.join(iaDir, d), { recursive: true }));

  fs.writeFileSync(path.join(iaDir, 'agentes', 'agentes.json'), JSON.stringify({ agentes: [] }));
  fs.writeFileSync(path.join(iaDir, 'tarefas', 'tarefas.json'), JSON.stringify({ tarefas: [], estatisticas: {} }));
  fs.writeFileSync(path.join(iaDir, 'solicitacoes', 'solicitacoes.json'), JSON.stringify({ solicitacoes: [] }));
  fs.writeFileSync(path.join(iaDir, 'solicitacoes', 'historico-alteracoes.json'), JSON.stringify({ eventos: [] }));
  fs.writeFileSync(path.join(iaDir, 'auditoria', 'eventos.json'), JSON.stringify({ eventos: [] }));
  fs.writeFileSync(path.join(iaDir, 'decisoes', 'decisoes.json'), JSON.stringify({ decisoes: [] }));
  fs.writeFileSync(path.join(iaDir, 'riscos', 'riscos.json'), JSON.stringify({ riscos: [] }));
  fs.writeFileSync(path.join(iaDir, 'estado', 'bloqueios.json'), JSON.stringify({ bloqueios: [] }));
  fs.writeFileSync(path.join(iaDir, 'historico', 'historico.json'), JSON.stringify({ eventos: [] }));
  fs.writeFileSync(path.join(iaDir, 'eventos', 'eventos.json'), JSON.stringify({ eventos: [] }));
  fs.writeFileSync(path.join(iaDir, 'dependencias', 'dependencias.json'), JSON.stringify({ dependencias: [] }));
  fs.writeFileSync(path.join(iaDir, 'handoffs', 'handoffs.json'), JSON.stringify({ handoffs: [] }));
  fs.writeFileSync(path.join(iaDir, 'resultados', 'resultados.json'), JSON.stringify({ resultados: [] }));
  fs.writeFileSync(path.join(iaDir, 'contratos', 'contratos.json'), JSON.stringify({ contratos: [] }));
  fs.writeFileSync(path.join(iaDir, 'configuracao', 'transicoes.json'), JSON.stringify({
    versao: '1.0.0',
    atualizadoEm: new Date().toISOString(),
    transicoes: stateMachine.listarTransicoes()
  }));

  return { tmpDir, iaDir, fsService, auditoria, validator, stateMachine, cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }) };
}

describe('TAR-2026-00013 — Testes de Integração Completos', () => {
  let env: ReturnType<typeof criarAmbienteTeste>;

  beforeEach(() => {
    env = criarAmbienteTeste();
  });

  afterEach(() => {
    env.cleanup();
  });

  const buildTarefaService = () => new TarefaService(env.fsService, env.auditoria, env.validator, new DependenciaService(env.fsService, env.auditoria, env.validator), new EventoService(env.fsService, env.auditoria, env.validator), env.stateMachine);
  const agenteService = () => new AgenteService(env.fsService, env.auditoria, env.validator);
  const bloqueioService = () => new BloqueioService(env.fsService, env.auditoria, env.validator);
  const solicitacaoService = () => new SolicitacaoService(env.fsService, env.auditoria, env.validator);
  const dependenciaService = () => new DependenciaService(env.fsService, env.auditoria, env.validator);
  const handoffService = (evtSvc?: EventoService) => new HandoffService(env.fsService, env.auditoria, env.validator, evtSvc);
  const eventoService = () => new EventoService(env.fsService, env.auditoria, env.validator);
  const resultadoService = () => new ResultadoService(env.fsService, env.auditoria, env.validator);

  describe('Pré-requisitos — TAR-2026-00010, 00011, 00012', () => {
    it('TAR-2026-00010 deve existir e estar CONCLUIDA', async () => {
      const svc = buildTarefaService();
      const tarefa10 = await svc.criar({
        id: 'TAR-2026-00010',
        titulo: 'Pré-requisito 10',
        objetivo: 'Atender pré-requisito 10',
        tipo: 'desenvolvimento',
        prioridade: 'ALTA',
        agenteResponsavel: 'agente-teste',
        dominio: 'backend',
        ambiente: 'desenvolvimento',
        descricao: '',
        dependencias: [],
        contratosObrigatorios: [],
        procedimentosObrigatorios: [],
        arquivosPermitidos: [],
        arquivosProibidos: [],
        contextoNecessario: [],
        criteriosAceitacao: [],
        testesObrigatorios: [],
        riscos: [],
        restricoes: [],
        condicoesDeParada: [],
        criteriosConclusao: []
      });
      expect(tarefa10.sucesso).toBe(true);
      if (!tarefa10.sucesso) console.error('Erro TAR-2026-00010:', tarefa10.erro, tarefa10.codigoErro);
      const alterarEstado = await buildTarefaService().alterarEstado('TAR-2026-00010', 'CONCLUIDA');
      expect(alterarEstado.sucesso).toBe(true);
      if (!alterarEstado.sucesso) console.error('Erro estado TAR-2026-00010:', alterarEstado.erro, alterarEstado.codigoErro);
      const obtida = svc.obter('TAR-2026-00010');
      expect(obtida.sucesso).toBe(true);
      expect(obtida.dados!.estado).toBe('CONCLUIDA');
    });

    it('TAR-2026-00011 deve existir e estar CONCLUIDA', async () => {
      const svc = buildTarefaService();
      const tarefa11 = await svc.criar({
        id: 'TAR-2026-00011',
        titulo: 'Pré-requisito 11',
        objetivo: 'Atender pré-requisito 11',
        tipo: 'desenvolvimento',
        prioridade: 'ALTA',
        agenteResponsavel: 'agente-teste',
        dominio: 'backend',
        ambiente: 'desenvolvimento',
        descricao: '',
        dependencias: [],
        contratosObrigatorios: [],
        procedimentosObrigatorios: [],
        arquivosPermitidos: [],
        arquivosProibidos: [],
        contextoNecessario: [],
        criteriosAceitacao: [],
        testesObrigatorios: [],
        riscos: [],
        restricoes: [],
        condicoesDeParada: [],
        criteriosConclusao: []
      });
      expect(tarefa11.sucesso).toBe(true);
      if (!tarefa11.sucesso) console.error('Erro TAR-2026-00011:', tarefa11.erro, tarefa11.codigoErro);
      const alterarEstado = await buildTarefaService().alterarEstado('TAR-2026-00011', 'CONCLUIDA');
      expect(alterarEstado.sucesso).toBe(true);
      if (!alterarEstado.sucesso) console.error('Erro estado TAR-2026-00011:', alterarEstado.erro, alterarEstado.codigoErro);
      const obtida = svc.obter('TAR-2026-00011');
      expect(obtida.sucesso).toBe(true);
      expect(obtida.dados!.estado).toBe('CONCLUIDA');
    });

    it('TAR-2026-00012 deve existir e estar CONCLUIDA', async () => {
      const svc = buildTarefaService();
      const tarefa12 = await svc.criar({
        id: 'TAR-2026-00012',
        titulo: 'Pré-requisito 12',
        objetivo: 'Atender pré-requisito 12',
        tipo: 'desenvolvimento',
        prioridade: 'ALTA',
        agenteResponsavel: 'agente-teste',
        dominio: 'backend',
        ambiente: 'desenvolvimento',
        descricao: '',
        dependencias: [],
        contratosObrigatorios: [],
        procedimentosObrigatorios: [],
        arquivosPermitidos: [],
        arquivosProibidos: [],
        contextoNecessario: [],
        criteriosAceitacao: [],
        testesObrigatorios: [],
        riscos: [],
        restricoes: [],
        condicoesDeParada: [],
        criteriosConclusao: []
      });
      expect(tarefa12.sucesso).toBe(true);
      if (!tarefa12.sucesso) console.error('Erro TAR-2026-00012:', tarefa12.erro, tarefa12.codigoErro);
      const alterarEstado = await buildTarefaService().alterarEstado('TAR-2026-00012', 'CONCLUIDA');
      expect(alterarEstado.sucesso).toBe(true);
      if (!alterarEstado.sucesso) console.error('Erro estado TAR-2026-00012:', alterarEstado.erro, alterarEstado.codigoErro);
      const obtida = svc.obter('TAR-2026-00012');
      expect(obtida.sucesso).toBe(true);
      expect(obtida.dados!.estado).toBe('CONCLUIDA');
    });
  });

  describe('TAR-2026-00013 — Criação e dependências', () => {
    it('TAR-2026-00013 deve ser criada com dependências em 00010, 00011 e 00012', async () => {
      const svc = buildTarefaService();
      const tarefa13 = await svc.criar({
        id: 'TAR-2026-00013',
        titulo: 'Executar testes de integração completos',
        objetivo: 'Executar testes de integração cobrindo todos os fluxos principais',
        tipo: 'testes',
        prioridade: 'CRITICA',
        agenteResponsavel: 'qa-testes',
        dominio: 'testes',
        ambiente: 'desenvolvimento',
        descricao: '',
        dependencias: ['TAR-2026-00010', 'TAR-2026-00011', 'TAR-2026-00012'],
        contratosObrigatorios: [],
        procedimentosObrigatorios: [],
        arquivosPermitidos: [],
        arquivosProibidos: [],
        contextoNecessario: [],
        criteriosAceitacao: [],
        testesObrigatorios: [],
        riscos: [],
        restricoes: [],
        condicoesDeParada: [],
        criteriosConclusao: []
      });
      expect(tarefa13.sucesso).toBe(true);
      if (!tarefa13.sucesso) console.error('Erro TAR-2026-00013:', tarefa13.erro, tarefa13.codigoErro);
      expect(tarefa13.dados!.id).toBe('TAR-2026-00013');
      expect(tarefa13.dados!.dependencias).toEqual(['TAR-2026-00010', 'TAR-2026-00011', 'TAR-2026-00012']);
      expect(tarefa13.dados!.estado).toBe('RASCUNHO');
    });

    it('TAR-2026-00013 não pode transitar para EM_EXECUCAO com dependências pendentes', async () => {
      const svc = buildTarefaService();
      const criacao = await svc.criar({
        id: 'TAR-2026-00013',
        titulo: 'Executar testes de integração completos',
        objetivo: 'Executar testes de integração cobrindo todos os fluxos principais',
        tipo: 'testes',
        prioridade: 'CRITICA',
        agenteResponsavel: 'qa-testes',
        dominio: 'testes',
        ambiente: 'desenvolvimento',
        descricao: '',
        dependencias: ['TAR-2026-00010', 'TAR-2026-00011', 'TAR-2026-00012'],
        contratosObrigatorios: [],
        procedimentosObrigatorios: [],
        arquivosPermitidos: [],
        arquivosProibidos: [],
        contextoNecessario: [],
        criteriosAceitacao: [],
        testesObrigatorios: [],
        riscos: [],
        restricoes: [],
        condicoesDeParada: [],
        criteriosConclusao: []
      });
      expect(criacao.sucesso).toBe(true);

      const depSvc = dependenciaService();
      await depSvc.criar({ fonteId: 'TAR-2026-00010', fonteTipo: 'TAREFA', destinoId: 'TAR-2026-00013', destinoTipo: 'TAREFA', tipo: 'FIM_INICIO' });
      await depSvc.criar({ fonteId: 'TAR-2026-00011', fonteTipo: 'TAREFA', destinoId: 'TAR-2026-00013', destinoTipo: 'TAREFA', tipo: 'FIM_INICIO' });
      await depSvc.criar({ fonteId: 'TAR-2026-00012', fonteTipo: 'TAREFA', destinoId: 'TAR-2026-00013', destinoTipo: 'TAREFA', tipo: 'FIM_INICIO' });

      const result = await buildTarefaService().alterarEstado('TAR-2026-00013', 'EM_EXECUCAO');
      expect(result.sucesso).toBe(false);
      expect(result.codigoErro).toBe('PENDING_DEPENDENCIES');
    });

    it('TAR-2026-00013 pode transitar para EM_EXECUCAO quando dependências estão resolvidas', async () => {
      const svc = buildTarefaService();
      const criacao = await svc.criar({
        id: 'TAR-2026-00013',
        titulo: 'Executar testes de integração completos',
        objetivo: 'Executar testes de integração cobrindo todos os fluxos principais',
        tipo: 'testes',
        prioridade: 'CRITICA',
        agenteResponsavel: 'qa-testes',
        dominio: 'testes',
        ambiente: 'desenvolvimento',
        descricao: '',
        dependencias: ['TAR-2026-00010', 'TAR-2026-00011', 'TAR-2026-00012'],
        contratosObrigatorios: [],
        procedimentosObrigatorios: [],
        arquivosPermitidos: [],
        arquivosProibidos: [],
        contextoNecessario: [],
        criteriosAceitacao: [],
        testesObrigatorios: [],
        riscos: [],
        restricoes: [],
        condicoesDeParada: [],
        criteriosConclusao: []
      });
      expect(criacao.sucesso).toBe(true);

      const depSvc = dependenciaService();
      const dep1 = await depSvc.criar({ fonteId: 'TAR-2026-00010', fonteTipo: 'TAREFA', destinoId: 'TAR-2026-00013', destinoTipo: 'TAREFA', tipo: 'FIM_INICIO' });
      const dep2 = await depSvc.criar({ fonteId: 'TAR-2026-00011', fonteTipo: 'TAREFA', destinoId: 'TAR-2026-00013', destinoTipo: 'TAREFA', tipo: 'FIM_INICIO' });
      const dep3 = await depSvc.criar({ fonteId: 'TAR-2026-00012', fonteTipo: 'TAREFA', destinoId: 'TAR-2026-00013', destinoTipo: 'TAREFA', tipo: 'FIM_INICIO' });

      await depSvc.atualizar(dep1.dados!.id, { estado: 'RESOLVIDA' });
      await depSvc.atualizar(dep2.dados!.id, { estado: 'RESOLVIDA' });
      await depSvc.atualizar(dep3.dados!.id, { estado: 'RESOLVIDA' });

      const result = await buildTarefaService().alterarEstado('TAR-2026-00013', 'EM_EXECUCAO');
      expect(result.sucesso).toBe(true);
      expect(result.dados!.estado).toBe('EM_EXECUCAO');
    });
  });

  describe('Fluxo 1: tarefa -> agente -> contrato -> resultado', () => {
    it('deve criar agente, associar à tarefa, criar contrato e registrar resultado', async () => {
      const agtSvc = agenteService();
      const agente = await agtSvc.criar({
        id: 'AGT-QA',
        nome: 'QA Integration Tester',
        funcao: 'testes',
        descricao: 'Agente de QA para testes de integração',
        estado: 'ativo',
        responsabilidades: ['Testes de integração'],
        conhecimentos: ['Jest', 'TypeScript'],
        dominios: ['testes'],
        diretoriosPermitidos: ['/.ia/testes'],
        diretoriosProibidos: ['/.ia/seguranca'],
        contratosObrigatorios: [],
        permissoes: { ler: true, criar: true, alterar: true, excluir: true, executar: true, testar: true, revisar: true, aprovar: true, implantar: false },
        ferramentasPermitidas: ['jest'],
        ambientesPermitidos: ['desenvolvimento']
      });
      expect(agente.sucesso).toBe(true);

      const tarSvc = buildTarefaService();
      const tarefa = await tarSvc.criar({
        id: 'TAR-2026-00013',
        titulo: 'Executar testes de integração completos',
        objetivo: 'Executar testes de integração cobrindo todos os fluxos principais',
        tipo: 'testes',
        prioridade: 'CRITICA',
        agenteResponsavel: 'AGT-QA',
        dominio: 'testes',
        ambiente: 'desenvolvimento',
        descricao: '',
        dependencias: ['TAR-2026-00010', 'TAR-2026-00011', 'TAR-2026-00012'],
        contratosObrigatorios: [],
        procedimentosObrigatorios: [],
        arquivosPermitidos: [],
        arquivosProibidos: [],
        contextoNecessario: [],
        criteriosAceitacao: [],
        testesObrigatorios: [],
        riscos: [],
        restricoes: [],
        condicoesDeParada: [],
        criteriosConclusao: []
      });
      expect(tarefa.sucesso).toBe(true);
      if (!tarefa.sucesso) console.error('Erro tarefa fluxo 1:', tarefa.erro, tarefa.codigoErro);
      expect(tarefa.dados!.agenteResponsavel).toBe('AGT-QA');

      const contrato = {
        id: 'CONTRATO-QA-001',
        nome: 'Contrato de Qualidade QA',
        descricao: 'Contrato que define padrões de qualidade para testes',
        versao: '1.0.0',
        estado: 'ativo',
        obrigatorio: true
      };
      const contratoResult = env.fsService.escreverJson(path.join('.ia', 'contratos', `${contrato.id}.json`), contrato, { backup: true });
      expect(contratoResult.sucesso).toBe(true);

      const registryResult = env.fsService.lerJson<any>(path.join('.ia', 'contratos', 'contratos.json'));
      const registry = registryResult.sucesso && registryResult.dados ? registryResult.dados : { contratos: [] };
      registry.contratos.push({ id: contrato.id, nome: contrato.nome, arquivo: `contratos/${contrato.id}.json`, versao: contrato.versao, estado: contrato.estado, obrigatorio: contrato.obrigatorio });
      env.fsService.escreverJson(path.join('.ia', 'contratos', 'contratos.json'), registry);

      const resSvc = resultadoService();
      const resultado = await resSvc.criar({
        tarefaId: 'TAR-2026-00013',
        agenteId: 'AGT-QA',
        resumo: 'Testes de integração executados com sucesso',
        estado: 'COMPLETO',
        arquivosAlterados: ['testes/integracao-tar-2026-00013.test.ts'],
        artefatos: [],
        testesExecutados: ['Fluxo 1', 'Fluxo 2', 'Fluxo 3', 'Fluxo 4', 'Fluxo 5'],
        testesAprovados: ['Fluxo 1', 'Fluxo 2', 'Fluxo 3', 'Fluxo 4', 'Fluxo 5'],
        riscosEncontrados: [],
        pendencias: []
      });
      expect(resultado.sucesso).toBe(true);
      if (!resultado.sucesso) console.error('Erro resultado fluxo 1:', resultado.erro, resultado.codigoErro);
      expect(resultado.dados!.tarefaId).toBe('TAR-2026-00013');
      expect(resultado.dados!.agenteId).toBe('AGT-QA');

      const listaResultados = resSvc.listar();
      expect(listaResultados.sucesso).toBe(true);
      expect(listaResultados.dados!.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Fluxo 2: bloqueio -> resolucao -> historico', () => {
    it('deve criar bloqueio, resolver e verificar histórico', async () => {
      const tarSvc = buildTarefaService();
      const criacao = await tarSvc.criar({
        id: 'TAR-2026-00013',
        titulo: 'Executar testes de integração completos',
        objetivo: 'Executar testes de integração cobrindo todos os fluxos principais',
        tipo: 'testes',
        prioridade: 'CRITICA',
        agenteResponsavel: 'qa-testes',
        dominio: 'testes',
        ambiente: 'desenvolvimento',
        descricao: '',
        dependencias: [],
        contratosObrigatorios: [],
        procedimentosObrigatorios: [],
        arquivosPermitidos: [],
        arquivosProibidos: [],
        contextoNecessario: [],
        criteriosAceitacao: [],
        testesObrigatorios: [],
        riscos: [],
        restricoes: [],
        condicoesDeParada: [],
        criteriosConclusao: []
      });
      expect(criacao.sucesso).toBe(true);

      const blqSvc = bloqueioService();
      const bloqueio = await blqSvc.criar({
        id: 'BLOQ-2026-00001',
        tarefaId: 'TAR-2026-00013',
        tipo: 'CONTRATO',
        gravidade: 'ALTA',
        descricao: 'Contrato de qualidade pendente de assinatura',
        origem: 'qa-testes',
        responsavelResolucao: 'revisor',
        estado: 'ATIVO',
        criadoEm: new Date().toISOString()
      });
      expect(bloqueio.sucesso).toBe(true);
      if (!bloqueio.sucesso) console.error('Erro bloqueio:', bloqueio.erro, bloqueio.codigoErro);
      expect(bloqueio.dados!.estado).toBe('ATIVO');

      const resolucao = await blqSvc.resolver(bloqueio.dados!.id, 'Contrato assinado pelo revisor');
      expect(resolucao.sucesso).toBe(true);
      if (!resolucao.sucesso) console.error('Erro resolucao:', resolucao.erro, resolucao.codigoErro);
      expect(resolucao.dados!.estado).toBe('RESOLVIDO');
      expect(resolucao.dados!.resolvidoEm).toBe('Contrato assinado pelo revisor');

      const historicoResult = env.fsService.lerJson<any>(path.join('.ia', 'auditoria', 'eventos.json'));
      expect(historicoResult.sucesso).toBe(true);
      const eventos = historicoResult.dados!.eventos || [];
      const eventosFiltrados = eventos.filter((e: any) => e.tipo === 'BLOQUEIO_CRIADO' || e.tipo === 'BLOQUEIO_RESOLVIDO');
      expect(eventosFiltrados.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Fluxo 3: solicitacao -> aprovacao -> auditoria', () => {
    it('deve criar solicitação, aprovar e verificar histórico e auditoria', async () => {
      const solSvc = solicitacaoService();
      const solicitacao = await solSvc.criar({
        id: 'ALT-2026-00001',
        titulo: 'Alterar critério de aceitação',
        descricao: 'Adicionar cobertura de testes de integração',
        agenteSolicitante: { id: 'qa-testes' },
        agenteResponsavel: { id: 'revisor' },
        alvo: { tipo: 'ARQUIVO', nome: 'TAR-2026-00013', identificador: 'TAR-2026-00013' },
        alteracao: { tipo: 'ALTERACAO', descricao: 'Atualizar critérios', motivo: 'Melhorar cobertura', arquivosAfetados: [] },
        impactos: ['TESTES'],
        prioridade: 'ALTA',
        requerAprovacao: true,
        status: 'AGUARDANDO_APROVACAO',
        aprovacao: { status: 'PENDENTE', agenteId: null, data: null, observacao: null },
        datas: { criadaEm: new Date().toISOString(), atualizadaEm: new Date().toISOString(), concluidaEm: null },
        observacoes: null
      });
      expect(solicitacao.sucesso).toBe(true);
      if (!solicitacao.sucesso) console.error('Erro solicitacao:', solicitacao.erro, solicitacao.codigoErro);

      const aprovacao = await solSvc.aprovar(solicitacao.dados!.id, 'revisor', 'Aprovado após análise');
      expect(aprovacao.sucesso).toBe(true);
      if (!aprovacao.sucesso) console.error('Erro aprovacao:', aprovacao.erro, aprovacao.codigoErro);
      expect(aprovacao.dados!.aprovacao.status).toBe('APROVADA');

      const historicoResult = env.fsService.lerJson<any>(path.join('.ia', 'solicitacoes', 'historico-alteracoes.json'));
      expect(historicoResult.sucesso).toBe(true);
      const historico = historicoResult.dados!.eventos || [];
      expect(historico.length).toBeGreaterThanOrEqual(1);

      const auditoriaEventos = env.fsService.lerJson<any>(path.join('.ia', 'auditoria', 'eventos.json'));
      expect(auditoriaEventos.sucesso).toBe(true);
    });
  });

  describe('Fluxo 4: dependencias entre tarefas', () => {
    it('deve criar dependências, detectar ciclo e validar bloqueio de execução', async () => {
      const depSvc = dependenciaService();

      const dep1 = await depSvc.criar({ fonteId: 'TAR-2026-00010', fonteTipo: 'TAREFA', destinoId: 'TAR-2026-00013', destinoTipo: 'TAREFA', tipo: 'FIM_INICIO' });
      expect(dep1.sucesso).toBe(true);

      const dep2 = await depSvc.criar({ fonteId: 'TAR-2026-00011', fonteTipo: 'TAREFA', destinoId: 'TAR-2026-00013', destinoTipo: 'TAREFA', tipo: 'FIM_INICIO' });
      expect(dep2.sucesso).toBe(true);

      const dep3 = await depSvc.criar({ fonteId: 'TAR-2026-00012', fonteTipo: 'TAREFA', destinoId: 'TAR-2026-00013', destinoTipo: 'TAREFA', tipo: 'FIM_INICIO' });
      expect(dep3.sucesso).toBe(true);

      const porDestino = depSvc.listarPorDestino('TAR-2026-00013');
      expect(porDestino.sucesso).toBe(true);
      expect(porDestino.dados!.length).toBe(3);

      const circular = await depSvc.criar({ fonteId: 'TAR-2026-00013', fonteTipo: 'TAREFA', destinoId: 'TAR-2026-00010', destinoTipo: 'TAREFA', tipo: 'FIM_INICIO' });
      expect(circular.sucesso).toBe(true);
      expect(circular.dados!.estado).toBe('CIRCULAR');
    });
  });

  describe('Fluxo 5: handoff -> transferencia -> confirmacao', () => {
    it('deve criar handoff, transferir e confirmar com eventos', async () => {
      const evtSvc = eventoService();
      const hofSvc = handoffService(evtSvc);

      const handoff = await hofSvc.criar({
        origem: 'qa-testes',
        destino: 'revisor',
        tarefaId: 'TAR-2026-00013',
        resumo: 'Transferência de TAR-2026-00013 para revisão',
        concluido: ['Testes de integração executados'],
        pendente: ['Revisão final'],
        artefatos: [],
        decisoes: [],
        alteracoes: [],
        riscos: [],
        bloqueios: []
      });
      expect(handoff.sucesso).toBe(true);
      if (!handoff.sucesso) console.error('Erro handoff:', handoff.erro, handoff.codigoErro);
      expect(handoff.dados!.estado).toBe('PENDENTE');

      const eventosAposCriacao = evtSvc.listar();
      expect(eventosAposCriacao.sucesso).toBe(true);
      const handoffCriadoEvento = eventosAposCriacao.dados!.find((e: any) => e.tipo === 'HANDOFF_CRIADO' && e.referenciaId === handoff.dados!.id);
      expect(handoffCriadoEvento).toBeDefined();

      const aceito = await hofSvc.atualizar(handoff.dados!.id, { estado: 'ACEITO' });
      expect(aceito.sucesso).toBe(true);
      if (!aceito.sucesso) console.error('Erro aceite:', aceito.erro, aceito.codigoErro);
      expect(aceito.dados!.estado).toBe('ACEITO');

      const eventosAposAceite = evtSvc.listar();
      expect(eventosAposAceite.sucesso).toBe(true);
      const handoffAceitoEvento = eventosAposAceite.dados!.find((e: any) => e.tipo === 'HANDOFF_ACEITO' && e.referenciaId === handoff.dados!.id);
      expect(handoffAceitoEvento).toBeDefined();

      const concluido = await hofSvc.atualizar(handoff.dados!.id, { estado: 'CONCLUIDO' });
      expect(concluido.sucesso).toBe(true);
      if (!concluido.sucesso) console.error('Erro conclusao:', concluido.erro, concluido.codigoErro);
      expect(concluido.dados!.estado).toBe('CONCLUIDO');

      const eventosAposConclusao = evtSvc.listar();
      expect(eventosAposConclusao.sucesso).toBe(true);
      const handoffConcluidoEvento = eventosAposConclusao.dados!.find((e: any) => e.tipo === 'HANDOFF_CONCLUIDO' && e.referenciaId === handoff.dados!.id);
      expect(handoffConcluidoEvento).toBeDefined();
    });
  });
});
