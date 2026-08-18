import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileService } from '../src/arquivos/FileService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { KiloDiscoveryService } from '../src/servicios/KiloDiscoveryService';
import { KiloReconciliationService } from '../src/servicios/KiloReconciliationService';
import { KiloIdempotencyService } from '../src/servicios/KiloIdempotencyService';
import { TaskContextBuilder } from '../src/servicios/TaskContextBuilder';
import { KiloAgentGeneratorService } from '../src/servicios/KiloAgentGeneratorService';
import { FluxoService } from '../src/servicios/FluxoService';
import { IntegridadeService } from '../src/servicios/IntegridadeService';
import { MonitoramentoService } from '../src/servicios/MonitoramentoService';

describe('Integração — Serviços Kilo e Domínio', () => {
  let projectRoot: string;
  let fsSvc: FileService;
  let auditoria: AuditoriaService;
  let validator: SchemaValidator;

  beforeEach(() => {
    projectRoot = path.join(os.tmpdir(), 'agentmap-integ-test-' + Date.now());
    fs.mkdirSync(projectRoot, { recursive: true });
    fsSvc = new FileService(projectRoot);
    auditoria = new AuditoriaService(fsSvc);
    validator = new SchemaValidator(path.resolve(__dirname, '..', '..', 'esquemas'));

    fs.mkdirSync(path.join(projectRoot, '.ia', 'agentes'), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, '.ia', 'tarefas'), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, '.ia', 'contratos'), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, '.ia', 'dependencias'), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, '.ia', 'sessoes'), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, '.ia', 'handoffs'), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, '.ia', 'estado'), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, '.ia', 'auditoria'), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, '.kilo', 'worktrees'), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, '.kilo', 'agent'), { recursive: true });

    fs.writeFileSync(path.join(projectRoot, '.ia', 'agentes', 'agentes.json'), JSON.stringify({ agentes: [{ id: 'agente-1', nome: 'Agente 1' }] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'tarefas', 'tarefas.json'), JSON.stringify({ tarefas: [{ id: 'TAR-001', titulo: 'T1', objetivo: 'Obj1', tipo: 'dev', estado: 'RASCUNHO', prioridade: 'ALTA', agenteResponsavel: 'agente-1', dominio: 'backend', ambiente: 'dev', dependencias: [], contratosObrigatorios: ['CONTRATO-1'], procedimentosObrigatorios: [], arquivosPermitidos: [], arquivosProibidos: [], contextoNecessario: [], criteriosAceitacao: [], testesObrigatorios: [], riscos: [], restricoes: [], condicoesDeParada: [], criteriosConclusao: [], resultado: { resumo: '', arquivosAlterados: [], testesExecutados: [], testesAprovados: [], riscosEncontrados: [], pendencias: [], observacoes: '', commit: '' }, aprovacao: { necessaria: false, estado: 'PENDENTE', aprovador: '', data: null, observacao: '' }, datas: { criacao: null, criadoEm: null, inicio: null, ultimaAtualizacao: null, atualizadaEm: null, conclusao: null } }] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'contratos', 'contratos.json'), JSON.stringify({ contratos: [{ id: 'CONTRATO-1', nome: 'Contrato 1' }] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'contratos', 'CONTRATO-1.json'), JSON.stringify({ nome: 'Contrato 1', versao: '1.0.0', estado: 'ativo' }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'dependencias', 'dependencias.json'), JSON.stringify({ dependencias: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'sessoes', 'sessoes.json'), JSON.stringify({ sessoes: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'handoffs', 'handoffs.json'), JSON.stringify({ handoffs: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'estado', 'bloqueios.json'), JSON.stringify({ bloqueios: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'historico', 'historico.json'), JSON.stringify({ eventos: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.kilo', 'agent-manager.json'), JSON.stringify({ worktrees: {}, sessions: {} }, null, 2), 'utf-8');
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  test('KiloDiscoveryService -> KiloReconciliationService fluxo completo', async () => {
    fs.mkdirSync(path.join(projectRoot, '.kilo', 'worktrees', 'wt-1'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, '.kilo', 'worktrees', 'wt-1', 'README.md'), '# TAR-001', 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.kilo', 'agent', 'agente-1.md'), '---\ndescription: Agente 1\nmode: primary\ncolor: "#FF0000"\n---\n', 'utf-8');

    const discovery = new KiloDiscoveryService(fsSvc, auditoria, projectRoot);
    const kiloResult = await discovery.descobrir();
    expect(kiloResult.sucesso).toBe(true);
    expect(kiloResult.dados?.worktrees).toHaveLength(1);
    expect(kiloResult.dados?.agentes).toHaveLength(1);

    const reconciliation = new KiloReconciliationService(fsSvc, auditoria, validator, projectRoot);
    const reconResult = await reconciliation.reconciliar();
    expect(reconResult.sucesso).toBe(true);
    expect(reconResult.dados?.sessoesDesconhecidas).toHaveLength(0);
    expect(reconResult.dados?.sessoesAgenteMapSemKilo).toHaveLength(0);
  });

  test('KiloIdempotencyService -> KiloDiscoveryService fluxo', async () => {
    const idempotency = new KiloIdempotencyService(fsSvc, auditoria);
    await idempotency.marcarProcessado('msg-1', 'kilohub_report_status', 'ses-1');
    const isProcessado = await idempotency.isProcessado('msg-1');
    expect(isProcessado).toBe(true);

    const isNovo = await idempotency.isProcessado('msg-2');
    expect(isNovo).toBe(false);
  });

  test('TaskContextBuilder -> KiloAgentGeneratorService fluxo', async () => {
    const taskBuilder = new TaskContextBuilder(fsSvc, auditoria, validator);
    const pacote = await taskBuilder.construirPacote('TAR-001');
    expect(pacote.sucesso).toBe(true);
    expect(pacote.dados?.objetivo).toBe('Obj1');
    expect(pacote.dados?.contrato).toBe('Contrato 1');

    const generator = new KiloAgentGeneratorService(fsSvc);
    const tarefa = { id: 'TAR-001', titulo: 'T1', objetivo: 'Obj1', tipo: 'dev', prioridade: 'ALTA', agenteResponsavel: 'agente-1', dominio: 'backend', ambiente: 'dev', dependencias: [], contratosObrigatorios: ['CONTRATO-1'], procedimentosObrigatorios: [], arquivosPermitidos: [], arquivosProibidos: [], contextoNecessario: [], criteriosAceitacao: [], testesObrigatorios: [], riscos: [], restricoes: [], condicoesDeParada: [], criteriosConclusao: [], resultado: { resumo: '', arquivosAlterados: [], testesExecutados: [], testesAprovados: [], riscosEncontrados: [], pendencias: [], observacoes: '', commit: '' }, aprovacao: { necessaria: false, estado: 'PENDENTE', aprovador: '', data: null, observacao: '' }, datas: { criacao: null, criadoEm: null, inicio: null, ultimaAtualizacao: null, atualizadaEm: null, conclusao: null } } as any;
    const md = generator.montarContextoMarkdown(tarefa, pacote.dados);
    expect(md).toContain('# Contexto da Tarefa TAR-001');
    expect(md).toContain('Contrato 1');
  });

  test('IntegridadeService -> FluxoService fluxo', async () => {
    const fluxo = new FluxoService(fsSvc, auditoria);
    const checklist = fluxo.validarChecklist();
    expect(checklist.sucesso).toBe(true);

    const integridade = new IntegridadeService(fsSvc, auditoria, validator, fluxo);
    const result = await integridade.verificar('proj-1');
    expect(result.sucesso).toBe(true);
  });

  test('MonitoramentoService -> KiloReconciliationService fluxo', async () => {
    const monitoramento = new MonitoramentoService(fsSvc, auditoria, validator);
    const estadoKilo = {
      descobertoEm: new Date().toISOString(),
      worktrees: [{ nome: 'wt-1', caminho: '/wt-1', branch: 'main' }],
      sessoes: [
        { id: 'ses-1', nome: 'S1', tipo: 'local', estado: 'ativo', criadoEm: '2024-01-01T00:00:00.000Z', atualizadoEm: '2024-01-01T00:00:00.000Z' }
      ],
      agentes: []
    };
    const regKilo = await monitoramento.registrarKiloState(estadoKilo as any);
    expect(regKilo.sucesso).toBe(true);

    const reconciliation = new KiloReconciliationService(fsSvc, auditoria, validator, projectRoot);
    const reconResult = await reconciliation.reconciliar();
    expect(reconResult.sucesso).toBe(true);
    expect(reconResult.dados?.sessoesDesconhecidas).toHaveLength(1);
  });

  test('FluxoService -> IntegridadeService detecta checklist pendente', async () => {
    fs.rmSync(path.join(projectRoot, '.ia', 'contratos'), { recursive: true, force: true });

    const fluxo = new FluxoService(fsSvc, auditoria);
    const integridade = new IntegridadeService(fsSvc, auditoria, validator, fluxo);
    const result = await integridade.verificar('proj-1');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.inconsistencias.some(i => i.includes('Checklist de fluxo pendente'))).toBe(true);
  });

  test('KiloDiscoveryService + KiloIdempotencyService: descoberta seguida de deduplicacao', async () => {
    const discovery = new KiloDiscoveryService(fsSvc, auditoria, projectRoot);
    const kiloResult = await discovery.descobrir();
    expect(kiloResult.sucesso).toBe(true);

    const idempotency = new KiloIdempotencyService(fsSvc, auditoria);
    const key = `discovery-${kiloResult.dados?.descobertoEm}`;
    const isProcessado = await idempotency.isProcessado(key);
    expect(isProcessado).toBe(false);
    await idempotency.marcarProcessado(key, 'kilohub_descobrir');
    const isProcessado2 = await idempotency.isProcessado(key);
    expect(isProcessado2).toBe(true);
  });
});
