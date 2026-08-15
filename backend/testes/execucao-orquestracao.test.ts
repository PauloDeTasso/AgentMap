import path from 'path';
import fs from 'fs';
import os from 'os';
import { FileService } from '../src/arquivos/FileService';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { TarefaService } from '../src/servicios/TarefaService';
import { ResultadoService } from '../src/servicios/ResultadoService';
import { OrquestradorService } from '../src/servicios/OrquestradorService';

const schemataDir = path.resolve(__dirname, '..', '..', 'esquemas');

function criarAmbienteTeste() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentmap-execucao-test-'));
  const iaDir = path.join(tmpDir, '.ia');
  fs.mkdirSync(iaDir, { recursive: true });

  const validator = new SchemaValidator(schemataDir);
  const auditoria = new AuditoriaService(new FileService(tmpDir));
  const fs_service = new FileService(tmpDir);

  ['agentes', 'tarefas', 'solicitacoes', 'criterios', 'resultados', 'artefatos',
    'handoffs', 'pendencias', 'validacoes', 'conflitos', 'reservas', 'sessoes',
    'checkpoints', 'aprendizados', 'dependencias', 'responsabilidades', 'decisoes', 'riscos',
    'historico', 'auditoria', 'estado', 'procedimentos', 'politicas', 'contexto', 'qualidade', 'permissoes', 'conhecimento', 'problemas', 'git', 'configuracao', 'contratos', 'execucoes'].forEach((d) => {
    fs.mkdirSync(path.join(iaDir, d), { recursive: true });
  });

  fs.writeFileSync(path.join(iaDir, 'agentes', 'agentes.json'), JSON.stringify({ agentes: [{ id: 'AGT-BACKEND', nome: 'Backend' }] }));
  fs.writeFileSync(path.join(iaDir, 'tarefas', 'tarefas.json'), JSON.stringify({ tarefas: [], estatisticas: {} }));
  fs.writeFileSync(path.join(iaDir, 'solicitacoes', 'solicitacoes.json'), JSON.stringify({ solicitacoes: [] }));
  fs.writeFileSync(path.join(iaDir, 'auditoria', 'eventos.json'), JSON.stringify({ eventos: [] }));
  fs.writeFileSync(path.join(iaDir, 'decisoes', 'decisoes.json'), JSON.stringify({ decisoes: [] }));
  fs.writeFileSync(path.join(iaDir, 'riscos', 'riscos.json'), JSON.stringify({ riscos: [] }));
  fs.writeFileSync(path.join(iaDir, 'estado', 'bloqueios.json'), JSON.stringify({ bloqueios: [] }));
  fs.writeFileSync(path.join(iaDir, 'historico', 'historico.json'), JSON.stringify({ eventos: [] }));
  fs.writeFileSync(path.join(iaDir, 'execucoes', 'execucoes.json'), JSON.stringify({ execucoes: [] }));

  return { tmpDir, iaDir, fs_service, auditoria, validator, cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }) };
}

describe('Execução e Orquestração', () => {
  let env: ReturnType<typeof criarAmbienteTeste>;

  beforeEach(() => {
    env = criarAmbienteTeste();
  });

  afterEach(() => {
    env.cleanup();
  });

  describe('TarefaService — execuções', () => {
    it('cria execução com execucaoId sequencial', async () => {
      const tarefaSvc = new TarefaService(env.fs_service, env.auditoria, env.validator);
      const tarefa = await tarefaSvc.criar({ titulo: 'Tarefa Teste', descricao: 'Descricao', objetivo: 'Objetivo', tipo: 'dev', prioridade: 'media', agenteResponsavel: 'AGT-BACKEND', dominio: 'backend', ambiente: 'dev', dependencias: [], contratosObrigatorios: [], procedimentosObrigatorios: [], arquivosPermitidos: [], arquivosProibidos: [], contextoNecessario: [], criteriosAceitacao: [], testesObrigatorios: [], riscos: [], restricoes: [], condicoesDeParada: [], criteriosConclusao: [] });
      expect(tarefa.sucesso).toBe(true);

      const execucao = tarefaSvc.criarExecucao(tarefa.dados!.id, 'AGT-BACKEND');
      expect(execucao.sucesso).toBe(true);
      expect(execucao.dados?.execucaoId).toBe(1);
      expect(execucao.dados?.estado).toBe('PENDENTE');

      const execucao2 = tarefaSvc.criarExecucao(tarefa.dados!.id, 'AGT-BACKEND');
      expect(execucao2.sucesso).toBe(true);
      expect(execucao2.dados?.execucaoId).toBe(2);
    });

    it('separa estadoTarefa de estadoExecucao', async () => {
      const tarefaSvc = new TarefaService(env.fs_service, env.auditoria, env.validator);
      const tarefa = await tarefaSvc.criar({ titulo: 'Tarefa Teste', descricao: 'Descricao', objetivo: 'Objetivo', tipo: 'dev', prioridade: 'media', agenteResponsavel: 'AGT-BACKEND', dominio: 'backend', ambiente: 'dev', dependencias: [], contratosObrigatorios: [], procedimentosObrigatorios: [], arquivosPermitidos: [], arquivosProibidos: [], contextoNecessario: [], criteriosAceitacao: [], testesObrigatorios: [], riscos: [], restricoes: [], condicoesDeParada: [], criteriosConclusao: [] });
      expect(tarefa.sucesso).toBe(true);

      const execucao = tarefaSvc.criarExecucao(tarefa.dados!.id, 'AGT-BACKEND');
      expect(execucao.sucesso).toBe(true);

      const paraPlanejada = tarefaSvc.alterarEstado(tarefa.dados!.id, 'PLANEJADA');
      expect(paraPlanejada.sucesso).toBe(true);
      const paraPronta = tarefaSvc.alterarEstado(tarefa.dados!.id, 'PRONTA');
      expect(paraPronta.sucesso).toBe(true);
      const alterarEstado = tarefaSvc.alterarEstado(tarefa.dados!.id, 'EM_EXECUCAO');
      expect(alterarEstado.sucesso).toBe(true);
      expect(alterarEstado.dados?.estado).toBe('EM_EXECUCAO');

      const atualizarExec = tarefaSvc.atualizarEstadoExecucao(tarefa.dados!.id, execucao.dados!.execucaoId, 'EM_EXECUCAO');
      expect(atualizarExec.sucesso).toBe(true);
      expect(atualizarExec.dados?.estado).toBe('EM_EXECUCAO');

      const tarefaAtual = tarefaSvc.obter(tarefa.dados!.id);
      expect(tarefaAtual.sucesso).toBe(true);
      expect(tarefaAtual.dados?.estado).toBe('EM_EXECUCAO');

      const execs = tarefaSvc.listarExecucoes(tarefa.dados!.id);
      expect(execs.sucesso).toBe(true);
      expect(execs.dados?.length).toBe(1);
      expect(execs.dados?.[0].estado).toBe('EM_EXECUCAO');
    });

    it('lista execuções por tarefa', async () => {
      const tarefaSvc = new TarefaService(env.fs_service, env.auditoria, env.validator);
      const tarefa = await tarefaSvc.criar({ titulo: 'Tarefa Teste', descricao: 'Descricao', objetivo: 'Objetivo', tipo: 'dev', prioridade: 'media', agenteResponsavel: 'AGT-BACKEND', dominio: 'backend', ambiente: 'dev', dependencias: [], contratosObrigatorios: [], procedimentosObrigatorios: [], arquivosPermitidos: [], arquivosProibidos: [], contextoNecessario: [], criteriosAceitacao: [], testesObrigatorios: [], riscos: [], restricoes: [], condicoesDeParada: [], criteriosConclusao: [] });
      expect(tarefa.sucesso).toBe(true);

      tarefaSvc.criarExecucao(tarefa.dados!.id, 'AGT-BACKEND');
      tarefaSvc.criarExecucao(tarefa.dados!.id, 'AGT-BACKEND');

      const execs = tarefaSvc.listarExecucoes(tarefa.dados!.id);
      expect(execs.sucesso).toBe(true);
      expect(execs.dados?.length).toBe(2);
      expect(execs.dados?.map((e) => e.execucaoId)).toEqual([1, 2]);
    });
  });

  describe('OrquestradorService', () => {
    it('inicia execucao e atualiza estados', async () => {
      const tarefaSvc = new TarefaService(env.fs_service, env.auditoria, env.validator);
      const resultadoSvc = new ResultadoService(env.fs_service, env.auditoria, env.validator);
      const orquestrador = new OrquestradorService(env.fs_service, env.auditoria, env.validator, tarefaSvc, resultadoSvc);

      const tarefa = await tarefaSvc.criar({ titulo: 'Tarefa Orquestrada', descricao: 'Descricao', objetivo: 'Objetivo', tipo: 'dev', prioridade: 'media', agenteResponsavel: 'AGT-BACKEND', dominio: 'backend', ambiente: 'dev', dependencias: [], contratosObrigatorios: [], procedimentosObrigatorios: [], arquivosPermitidos: [], arquivosProibidos: [], contextoNecessario: [], criteriosAceitacao: [], testesObrigatorios: [], riscos: [], restricoes: [], condicoesDeParada: [], criteriosConclusao: [] });
      expect(tarefa.sucesso).toBe(true);

      await tarefaSvc.alterarEstado(tarefa.dados!.id, 'PLANEJADA');
      await tarefaSvc.alterarEstado(tarefa.dados!.id, 'PRONTA');

      const inicio = await orquestrador.iniciarExecucao({ tarefaId: tarefa.dados!.id, agenteId: 'AGT-BACKEND' });
      expect(inicio.sucesso).toBe(true);
      expect(inicio.dados?.execucaoId).toBe(1);
      expect(inicio.dados?.estado).toBe('EM_EXECUCAO');

      const tarefaAposInicio = tarefaSvc.obter(tarefa.dados!.id);
      expect(tarefaAposInicio.sucesso).toBe(true);
      expect(tarefaAposInicio.dados?.estado).toBe('EM_EXECUCAO');

      const conclusao = await orquestrador.concluirExecucao(tarefa.dados!.id, 1, true, 'Sucesso');
      expect(conclusao.sucesso).toBe(true);
      expect(conclusao.dados?.estado).toBe('SUCESSO');

      const status = await orquestrador.status(tarefa.dados!.id);
      expect(status.sucesso).toBe(true);
      expect(status.dados?.execucoesConcluidas).toBe(1);
    });

    it('nao inicia execucao para tarefa em estado invalido', async () => {
      const tarefaSvc = new TarefaService(env.fs_service, env.auditoria, env.validator);
      const resultadoSvc = new ResultadoService(env.fs_service, env.auditoria, env.validator);
      const orquestrador = new OrquestradorService(env.fs_service, env.auditoria, env.validator, tarefaSvc, resultadoSvc);

      const tarefa = await tarefaSvc.criar({ titulo: 'Tarefa Bloqueada', descricao: 'Descricao', objetivo: 'Objetivo', tipo: 'dev', prioridade: 'media', agenteResponsavel: 'AGT-BACKEND', dominio: 'backend', ambiente: 'dev', dependencias: [], contratosObrigatorios: [], procedimentosObrigatorios: [], arquivosPermitidos: [], arquivosProibidos: [], contextoNecessario: [], criteriosAceitacao: [], testesObrigatorios: [], riscos: [], restricoes: [], condicoesDeParada: [], criteriosConclusao: [] });
      expect(tarefa.sucesso).toBe(true);

      const inicio = await orquestrador.iniciarExecucao({ tarefaId: tarefa.dados!.id, agenteId: 'AGT-BACKEND' });
      expect(inicio.sucesso).toBe(false);
      expect(inicio.codigoErro).toBe('INVALID_TASK_STATE');
    });

    it('permite retry apos falha', async () => {
      const tarefaSvc = new TarefaService(env.fs_service, env.auditoria, env.validator);
      const resultadoSvc = new ResultadoService(env.fs_service, env.auditoria, env.validator);
      const orquestrador = new OrquestradorService(env.fs_service, env.auditoria, env.validator, tarefaSvc, resultadoSvc);

      const tarefa = await tarefaSvc.criar({ titulo: 'Tarefa Retry', descricao: 'Descricao', objetivo: 'Objetivo', tipo: 'dev', prioridade: 'media', agenteResponsavel: 'AGT-BACKEND', dominio: 'backend', ambiente: 'dev', dependencias: [], contratosObrigatorios: [], procedimentosObrigatorios: [], arquivosPermitidos: [], arquivosProibidos: [], contextoNecessario: [], criteriosAceitacao: [], testesObrigatorios: [], riscos: [], restricoes: [], condicoesDeParada: [], criteriosConclusao: [] });
      expect(tarefa.sucesso).toBe(true);

      await tarefaSvc.alterarEstado(tarefa.dados!.id, 'PLANEJADA');
      await tarefaSvc.alterarEstado(tarefa.dados!.id, 'PRONTA');
      const inicio1 = await orquestrador.iniciarExecucao({ tarefaId: tarefa.dados!.id, agenteId: 'AGT-BACKEND' });
      expect(inicio1.sucesso).toBe(true);
      await orquestrador.concluirExecucao(tarefa.dados!.id, 1, false, 'Falhou');

      const tarefaAposFalha = tarefaSvc.obter(tarefa.dados!.id);
      expect(tarefaAposFalha.sucesso).toBe(true);
      expect(tarefaAposFalha.dados?.estado).toBe('BLOQUEADA');

      const inicio2 = await orquestrador.iniciarExecucao({ tarefaId: tarefa.dados!.id, agenteId: 'AGT-BACKEND' });
      expect(inicio2.sucesso).toBe(false);
      expect(inicio2.codigoErro).toBe('INVALID_TASK_STATE');
    });
  });
});
