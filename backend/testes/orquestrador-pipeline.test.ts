import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { OrquestradorService } from '../src/servicios/OrquestradorService';
import { TarefaService } from '../src/servicios/TarefaService';
import { CriterioService } from '../src/servicios/CriterioService';
import { ValidacaoService } from '../src/servicios/ValidacaoService';
import { ArtefatoService } from '../src/servicios/ArtefatoService';
import { ResultadoService } from '../src/servicios/ResultadoService';
import { HandoffService } from '../src/servicios/HandoffService';
import { DependenciaService } from '../src/servicios/DependenciaService';
import { EventoService } from '../src/servicios/EventoService';
import { InstanciaService } from '../src/servicios/InstanciaService';
import { FileService } from '../src/arquivos/FileService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { DispatchLog, DispatchEventoKilo } from '../src/tipos';

describe('OrquestradorService — pipeline de conclusão', () => {
  const projectRoot = path.join(os.tmpdir(), 'agentmap-orquestrador-pipeline-test-' + Date.now());
  fs.mkdirSync(projectRoot, { recursive: true });

  const fsSvc = new FileService(projectRoot);
  const validator = new SchemaValidator(path.resolve(__dirname, '..', '..', 'esquemas'));
  const auditoria = new AuditoriaService(fsSvc);

  const tarefaService = new TarefaService(fsSvc, auditoria, validator);
  const criterioService = new CriterioService(fsSvc, auditoria, validator);
  const validacaoService = new ValidacaoService(fsSvc, auditoria, validator);
  const artefatoService = new ArtefatoService(fsSvc, auditoria, validator);
  const resultadoService = new ResultadoService(fsSvc, auditoria, validator);
  const handoffService = new HandoffService(fsSvc, auditoria, validator);
  const dependenciaService = new DependenciaService(fsSvc, auditoria, validator);
  const eventoService = new EventoService(fsSvc, auditoria, validator);
  const instanciaService = new InstanciaService(fsSvc, auditoria, validator);

  const orquestrador = new OrquestradorService(
    fsSvc,
    auditoria,
    validator,
    projectRoot,
    'proj-pipeline-test',
    instanciaService,
    eventoService,
    handoffService,
    tarefaService,
    dependenciaService,
    criterioService,
    validacaoService,
    artefatoService,
    resultadoService
  );

  beforeAll(() => {
    const dirs = [
      '.ia/tarefas', '.ia/criterios', '.ia/validacoes', '.ia/artefatos', '.ia/resultados',
      '.ia/handoffs', '.ia/dependencias', '.ia/eventos', '.ia/instancias', '.ia/auditoria',
      '.ia/contratos', '.ia/estado', '.ia/configuracao'
    ];
    for (const dir of dirs) {
      fs.mkdirSync(path.join(projectRoot, dir), { recursive: true });
    }

    fs.writeFileSync(path.join(projectRoot, '.ia', 'tarefas', 'tarefas.json'), JSON.stringify({ tarefas: [], estatisticas: {} }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'criterios', 'criterios.json'), JSON.stringify({ criterios: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'validacoes', 'validacoes.json'), JSON.stringify({ validacoes: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'artefatos', 'artefatos.json'), JSON.stringify({ artefatos: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'resultados', 'resultados.json'), JSON.stringify({ resultados: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'handoffs', 'handoffs.json'), JSON.stringify({ handoffs: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'dependencias', 'dependencias.json'), JSON.stringify({ dependencias: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'eventos', 'eventos.json'), JSON.stringify({ eventos: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'instancias', 'instancias.json'), JSON.stringify({ instancias: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'auditoria', 'eventos.json'), JSON.stringify({ eventos: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'contratos', 'contratos.json'), JSON.stringify({ contratos: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'estado', 'estado-atual.json'), JSON.stringify({ projetoId: 'proj-pipeline-test', estado: 'ativo' }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'configuracao', 'projeto.json'), JSON.stringify({
      id: 'proj-pipeline-test', nome: 'Projeto Pipeline Test', versao: '1.0.0'
    }, null, 2), 'utf-8');
  });

  afterAll(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  test('pipeline de conclusão falha quando há critérios de aceitação insatisfeitos', async () => {
    const tarefaResult = tarefaService.criar({
      titulo: 'Tarefa Pipeline Test',
      objetivo: 'Testar pipeline',
      tipo: 'desenvolvimento',
      prioridade: 'media',
      agenteResponsavel: 'agt-test',
      dominio: 'test',
      ambiente: 'desenvolvimento',
      dependencias: [],
      descricao: '',
      contratosObrigatorios: [],
      procedimentosObrigatorios: [],
      arquivosPermitidos: [],
      arquivosProibidos: [],
      contextoNecessario: [],
      criteriosAceitacao: ['ACE-001'],
      testesObrigatorios: [],
      riscos: [],
      restricoes: [],
      condicoesDeParada: [],
      criteriosConclusao: [],
      tags: []
    });
    expect(tarefaResult.sucesso).toBe(true);
    const tarefa = tarefaResult.dados!;

    await criterioService.criar({
      id: 'ACE-001',
      tarefaId: tarefa.id,
      descricao: 'Critério insatisfeito',
      tipo: 'FUNCIONAL',
      obrigatorio: true,
      estado: 'INSATISFEITO'
    });

    const log: DispatchLog = {
      id: 'DSP-TEST-001',
      timestamp: new Date().toISOString(),
      instanciaId: '',
      tarefaId: tarefa.id,
      comando: 'test',
      status: 'SUCESSO',
      duracaoMs: 1000,
      eventos: [{ type: 'step_finish', timestamp: Date.now(), sessionID: 'ses-test' }] as DispatchEventoKilo[]
    };

    const pipelineResult = await (orquestrador as any).executarPipelineConclusao(tarefa.id, 'agt-test', log);
    expect(pipelineResult.sucesso).toBe(false);
    expect(pipelineResult.codigoErro).toBe('CRITERIOS_NAO_SATISFEITOS');
  });

  test('pipeline de conclusão falha quando há artefatos inválidos', async () => {
    const tarefaResult = tarefaService.criar({
      titulo: 'Tarefa Artefato Test',
      objetivo: 'Testar pipeline',
      tipo: 'desenvolvimento',
      prioridade: 'media',
      agenteResponsavel: 'agt-test',
      dominio: 'test',
      ambiente: 'desenvolvimento',
      dependencias: [],
      descricao: '',
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
      criteriosConclusao: [],
      tags: []
    });
    expect(tarefaResult.sucesso).toBe(true);
    const tarefa = tarefaResult.dados!;

    const artResult = await artefatoService.criar({
      nome: 'Artefato Invalido',
      tipo: 'ARQUIVO',
      descricao: 'Artefato excluído',
      tarefaId: tarefa.id,
      agenteId: 'agt-test',
      estado: 'EXCLUIDO'
    });
    expect(artResult.sucesso).toBe(true);

    const log: DispatchLog = {
      id: 'DSP-TEST-002',
      timestamp: new Date().toISOString(),
      instanciaId: '',
      tarefaId: tarefa.id,
      comando: 'test',
      status: 'SUCESSO',
      duracaoMs: 1000,
      eventos: [{ type: 'step_finish', timestamp: Date.now(), sessionID: 'ses-test-2' }] as DispatchEventoKilo[]
    };

    const pipelineResult = await (orquestrador as any).executarPipelineConclusao(tarefa.id, 'agt-test', log);
    expect(pipelineResult.sucesso).toBe(false);
    expect(pipelineResult.codigoErro).toBe('ARTEFATOS_INVALIDOS');
  });

  test('pipeline de conclusão falha quando contratos obrigatórios estão ausentes', async () => {
    const tarefaResult = tarefaService.criar({
      titulo: 'Tarefa Contrato Test',
      objetivo: 'Testar pipeline',
      tipo: 'desenvolvimento',
      prioridade: 'media',
      agenteResponsavel: 'agt-test',
      dominio: 'test',
      ambiente: 'desenvolvimento',
      dependencias: [],
      descricao: '',
      contratosObrigatorios: ['contrato-ausente'],
      procedimentosObrigatorios: [],
      arquivosPermitidos: [],
      arquivosProibidos: [],
      contextoNecessario: [],
      criteriosAceitacao: [],
      testesObrigatorios: [],
      riscos: [],
      restricoes: [],
      condicoesDeParada: [],
      criteriosConclusao: [],
      tags: []
    });
    expect(tarefaResult.sucesso).toBe(true);
    const tarefa = tarefaResult.dados!;

    fs.writeFileSync(path.join(projectRoot, '.ia', 'contratos', 'contratos.json'), JSON.stringify({ contratos: [] }, null, 2), 'utf-8');

    const log: DispatchLog = {
      id: 'DSP-TEST-003',
      timestamp: new Date().toISOString(),
      instanciaId: '',
      tarefaId: tarefa.id,
      comando: 'test',
      status: 'SUCESSO',
      duracaoMs: 1000,
      eventos: [{ type: 'step_finish', timestamp: Date.now(), sessionID: 'ses-test-3' }] as DispatchEventoKilo[]
    };

    const pipelineResult = await (orquestrador as any).executarPipelineConclusao(tarefa.id, 'agt-test', log);
    expect(pipelineResult.sucesso).toBe(false);
    expect(pipelineResult.codigoErro).toBe('CONTRATOS_AUSENTES');
  });

  test('pipeline de conclusão passa quando todos os critérios são satisfeitos, artefatos OK e contratos presentes', async () => {
    const tarefaResult = tarefaService.criar({
      titulo: 'Tarefa Sucesso Test',
      objetivo: 'Testar pipeline',
      tipo: 'desenvolvimento',
      prioridade: 'media',
      agenteResponsavel: 'agt-test',
      dominio: 'test',
      ambiente: 'desenvolvimento',
      dependencias: [],
      descricao: '',
      contratosObrigatorios: ['contrato-presente'],
      procedimentosObrigatorios: [],
      arquivosPermitidos: [],
      arquivosProibidos: [],
      contextoNecessario: [],
      criteriosAceitacao: [],
      testesObrigatorios: [],
      riscos: [],
      restricoes: [],
      condicoesDeParada: [],
      criteriosConclusao: [],
      tags: []
    });
    expect(tarefaResult.sucesso).toBe(true);
    const tarefa = tarefaResult.dados!;

    await criterioService.criar({
      id: 'ACE-SUCCESS-001',
      tarefaId: tarefa.id,
      descricao: 'Critério satisfeito',
      tipo: 'FUNCIONAL',
      obrigatorio: true,
      estado: 'SATISFEITO'
    });

    await artefatoService.criar({
      nome: 'Artefato Valido',
      tipo: 'ARQUIVO',
      descricao: 'Artefato ativo',
      tarefaId: tarefa.id,
      agenteId: 'agt-test',
      estado: 'ATIVO'
    });

    fs.writeFileSync(path.join(projectRoot, '.ia', 'contratos', 'contratos.json'), JSON.stringify({
      contratos: [{ id: 'contrato-presente', nome: 'Contrato Presente', arquivo: '/.ia/contratos/contrato-presente.json', versao: '1.0.0', estado: 'ativo', obrigatorio: true }]
    }, null, 2), 'utf-8');

    const log: DispatchLog = {
      id: 'DSP-TEST-004',
      timestamp: new Date().toISOString(),
      instanciaId: '',
      tarefaId: tarefa.id,
      comando: 'test',
      status: 'SUCESSO',
      duracaoMs: 1000,
      eventos: [{ type: 'step_finish', timestamp: Date.now(), sessionID: 'ses-test-4' }] as DispatchEventoKilo[]
    };

    const pipelineResult = await (orquestrador as any).executarPipelineConclusao(tarefa.id, 'agt-test', log);
    expect(pipelineResult.sucesso).toBe(true);
  });
});
