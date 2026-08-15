import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { FileService } from '../src/arquivos/FileService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { TarefaService } from '../src/servicios/TarefaService';
import { SessaoService } from '../src/servicios/SessaoService';
import { MonitoramentoService } from '../src/servicios/MonitoramentoService';
import { OrquestradorService } from '../src/servicios/OrquestradorService';

describe('OrquestradorService', () => {
  const projectRoot = path.join(os.tmpdir(), 'agentmap-orquestrador-test-' + Date.now());
  fs.mkdirSync(projectRoot, { recursive: true });

  const iaDir = path.join(projectRoot, '.ia');
  fs.mkdirSync(path.join(iaDir, 'tarefas'), { recursive: true });
  fs.mkdirSync(path.join(iaDir, 'sessoes'), { recursive: true });
  fs.mkdirSync(path.join(iaDir, 'agentes'), { recursive: true });
  fs.mkdirSync(path.join(iaDir, 'resultados'), { recursive: true });
  fs.mkdirSync(path.join(iaDir, 'checkpoints'), { recursive: true });
  fs.mkdirSync(path.join(iaDir, 'auditoria'), { recursive: true });

  const fsSvc = new FileService(projectRoot);
  const validator = new SchemaValidator(path.resolve(__dirname, '..', '..', 'esquemas'));
  const auditoria = new AuditoriaService(fsSvc);
  const tarefaService = new TarefaService(fsSvc, auditoria, validator);
  const sessaoService = new SessaoService(fsSvc, auditoria, validator);
  const monitoramento = new MonitoramentoService(fsSvc, auditoria);
  const orquestrador = new OrquestradorService(fsSvc, auditoria, tarefaService, sessaoService, monitoramento);

  beforeAll(() => {
    fs.writeFileSync(path.join(iaDir, 'tarefas', 'tarefas.json'), JSON.stringify({ tarefas: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(iaDir, 'sessoes', 'sessoes.json'), JSON.stringify({ sessoes: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(iaDir, 'agentes', 'agentes.json'), JSON.stringify({ agentes: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(iaDir, 'resultados', 'resultados.json'), JSON.stringify({ resultados: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(iaDir, 'checkpoints', 'checkpoints.json'), JSON.stringify({ checkpoints: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(iaDir, 'auditoria', 'eventos.json'), JSON.stringify({ eventos: [] }, null, 2), 'utf-8');
  });

  afterAll(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  async function criarTarefaEMExecucao(dados: any) {
    const tarefa = await tarefaService.criar(dados);
    expect(tarefa.sucesso).toBe(true);
    await tarefaService.alterarEstado(tarefa.dados!.id, 'PLANEJADA');
    await tarefaService.alterarEstado(tarefa.dados!.id, 'PRONTA');
    const execResult = await tarefaService.alterarEstado(tarefa.dados!.id, 'EM_EXECUCAO');
    expect(execResult.sucesso).toBe(true);
    return tarefa.dados!.id;
  }

  test('recupera órfão para PRONTA quando não há evidência de conclusão', async () => {
    const tarefaId = await criarTarefaEMExecucao({
      titulo: 'Tarefa para recuperar',
      descricao: '',
      objetivo: 'Objetivo',
      tipo: 'desenvolvimento',
      prioridade: 'media',
      agenteResponsavel: 'AGT-001',
      dominio: 'backend',
      ambiente: 'desenvolvimento',
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

    const result = await orquestrador.recuperarOrfaos('PROJ-001');
    expect(result.sucesso).toBe(true);
    expect(result.dados!.recuperados).toContain(tarefaId);
    expect(result.dados!.marcadosOrfaos).toContain(tarefaId);

    const tarefaAtual = tarefaService.obter(tarefaId);
    expect(tarefaAtual.sucesso).toBe(true);
    expect(tarefaAtual.dados!.estado).toBe('PRONTA');
  });

  test('recupera órfão para CONCLUIDA quando há resultado COMPLETO', async () => {
    const tarefaId = await criarTarefaEMExecucao({
      titulo: 'Tarefa completada',
      descricao: '',
      objetivo: 'Objetivo',
      tipo: 'desenvolvimento',
      prioridade: 'media',
      agenteResponsavel: 'AGT-002',
      dominio: 'backend',
      ambiente: 'desenvolvimento',
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

    const resultadosPath = path.join(iaDir, 'resultados', 'resultados.json');
    const resultadosData = JSON.parse(fs.readFileSync(resultadosPath, 'utf-8'));
    resultadosData.resultados.push({
      id: 'RES-2026-00001',
      tarefaId: tarefaId,
      agenteId: 'AGT-002',
      resumo: 'Tarefa completada',
      estado: 'COMPLETO',
      arquivosAlterados: [],
      artefatos: [],
      testesExecutados: [],
      testesAprovados: [],
      riscosEncontrados: [],
      pendencias: [],
      alteracoesSolicitadas: [],
      observacoes: null,
      datas: { criadaEm: new Date().toISOString(), atualizadaEm: new Date().toISOString(), concluidaEm: new Date().toISOString() }
    });
    fs.writeFileSync(resultadosPath, JSON.stringify(resultadosData, null, 2), 'utf-8');

    const result = await orquestrador.recuperarOrfaos('PROJ-001');
    expect(result.sucesso).toBe(true);
    expect(result.dados!.recuperados).toContain(tarefaId);

    const tarefaAtual = tarefaService.obter(tarefaId);
    expect(tarefaAtual.sucesso).toBe(true);
    expect(tarefaAtual.dados!.estado).toBe('CONCLUIDA');
    expect(tarefaAtual.dados!.datas.conclusao).toBeDefined();
  });

  test('recupera órfão para PRONTA quando há checkpoints', async () => {
    const tarefaId = await criarTarefaEMExecucao({
      titulo: 'Tarefa com checkpoint',
      descricao: '',
      objetivo: 'Objetivo',
      tipo: 'desenvolvimento',
      prioridade: 'media',
      agenteResponsavel: 'AGT-003',
      dominio: 'backend',
      ambiente: 'desenvolvimento',
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

    const checkpointsPath = path.join(iaDir, 'checkpoints', 'checkpoints.json');
    const checkpointsData = JSON.parse(fs.readFileSync(checkpointsPath, 'utf-8'));
    checkpointsData.checkpoints.push({
      id: 'CHK-2026-00001',
      tarefaId: tarefaId,
      agenteId: 'AGT-003',
      tipo: 'INTERMEDIARIO',
      titulo: 'Checkpoint 1',
      descricao: 'Progresso salvo',
      artefatos: [],
      alteracoes: [],
      riscos: [],
      pendencias: [],
      observacoes: null,
      dados: {},
      datas: { criadaEm: new Date().toISOString(), atualizadaEm: new Date().toISOString() }
    });
    fs.writeFileSync(checkpointsPath, JSON.stringify(checkpointsData, null, 2), 'utf-8');

    const result = await orquestrador.recuperarOrfaos('PROJ-001');
    expect(result.sucesso).toBe(true);
    expect(result.dados!.recuperados).toContain(tarefaId);

    const tarefaAtual = tarefaService.obter(tarefaId);
    expect(tarefaAtual.sucesso).toBe(true);
    expect(tarefaAtual.dados!.estado).toBe('PRONTA');
  });

  test('não recupera tarefas não órfãs', async () => {
    const tarefa = await tarefaService.criar({
      titulo: 'Tarefa não órfã',
      descricao: '',
      objetivo: 'Objetivo',
      tipo: 'desenvolvimento',
      prioridade: 'media',
      agenteResponsavel: 'AGT-004',
      dominio: 'backend',
      ambiente: 'desenvolvimento',
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
    } as any);
    expect(tarefa.sucesso).toBe(true);
    await tarefaService.alterarEstado(tarefa.dados!.id, 'PLANEJADA');
    await tarefaService.alterarEstado(tarefa.dados!.id, 'PRONTA');

    const result = await orquestrador.recuperarOrfaos('PROJ-001');
    expect(result.sucesso).toBe(true);
    expect(result.dados!.recuperados).toEqual([]);
    expect(result.dados!.marcadosOrfaos).toEqual([]);
  });

  test('retorna erro quando monitoramento é undefined', async () => {
    const orquestradorSemMonitoramento = new OrquestradorService(
      fsSvc,
      auditoria,
      tarefaService,
      sessaoService,
      undefined as any
    );
    const result = await orquestradorSemMonitoramento.recuperarOrfaos('PROJ-001');
    expect(result.sucesso).toBe(false);
  });

  test('registra eventos de auditoria durante recuperação', async () => {
    auditoria.listar(100);

    const tarefaId = await criarTarefaEMExecucao({
      titulo: 'Tarefa com auditoria',
      descricao: '',
      objetivo: 'Objetivo',
      tipo: 'desenvolvimento',
      prioridade: 'media',
      agenteResponsavel: 'AGT-005',
      dominio: 'backend',
      ambiente: 'desenvolvimento',
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

    await orquestrador.recuperarOrfaos('PROJ-001');

    const eventos = auditoria.listar(100);
    const tipos = eventos.map((e) => e.tipo);
    expect(tipos).toContain('TAREFA_MARCADA_ORFA');
    expect(tipos).toContain('TAREFA_RECUPERADA');
  });
});
