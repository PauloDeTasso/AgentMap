import path from 'path';
import fs from 'fs';
import os from 'os';
import { FileService } from '../src/arquivos/FileService';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { HandoffService } from '../src/servicios/HandoffService';
import { TarefaService } from '../src/servicios/TarefaService';
import { DependenciaService } from '../src/servicios/DependenciaService';
import { OrquestradorService } from '../src/servicios/OrquestradorService';
import { Tarefa, Dependencia } from '../src/tipos';

const schemataDir = path.resolve(__dirname, '..', '..', 'esquemas');

function criarAmbienteTeste() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentmap-handoff-test-'));
  const iaDir = path.join(tmpDir, '.ia');
  fs.mkdirSync(iaDir, { recursive: true });

  const validator = new SchemaValidator(schemataDir);
  const auditoria = new AuditoriaService(new FileService(tmpDir));
  const fsService = new FileService(tmpDir);

  ['agentes', 'tarefas', 'solicitacoes', 'criterios', 'resultados', 'artefatos',
    'handoffs', 'pendencias', 'validacoes', 'conflitos', 'reservas', 'sessoes',
    'checkpoints', 'aprendizados', 'dependencias', 'responsabilidades', 'decisoes', 'riscos',
    'historico', 'auditoria', 'estado', 'procedimentos', 'politicas', 'contexto', 'qualidade', 'permissoes', 'conhecimento', 'problemas', 'git', 'configuracao', 'contratos'].forEach((d) => {
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

  return { tmpDir, iaDir, fsService, auditoria, validator, cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }) };
}

describe('handoffAutomatico - semântica', () => {
  let env: ReturnType<typeof criarAmbienteTeste>;
  let dependenciaService: any;
  let tarefaService: any;
  let handoffService: any;
  let orquestrador: OrquestradorService;

  beforeEach(() => {
    env = criarAmbienteTeste();
    dependenciaService = {
      listarPorFonte: jest.fn(),
      listarPorDestino: jest.fn(),
      atualizar: jest.fn()
    };
    tarefaService = {
      obter: jest.fn(),
      alterarEstado: jest.fn()
    };
    handoffService = {
      criar: jest.fn()
    };

    orquestrador = new OrquestradorService(
      env.fsService,
      env.auditoria,
      env.validator,
      env.tmpDir,
      'PROJ-001',
      {} as any,
      {} as any,
      handoffService,
      tarefaService,
      dependenciaService
    );
  });

  afterEach(() => {
    env.cleanup();
  });

  test('usa listarPorFonte quando a tarefa atual é predecessora', async () => {
    const dep: Dependencia = {
      id: 'DEP-001',
      fonteId: 'TAR-001',
      fonteTipo: 'TAREFA',
      destinoId: 'TAR-002',
      destinoTipo: 'TAREFA',
      tipo: 'FIM_INICIO',
      estado: 'ATIVA',
      datas: { criadaEm: new Date().toISOString(), atualizadaEm: new Date().toISOString() }
    };

    dependenciaService.listarPorFonte.mockReturnValue({ sucesso: true, dados: [dep] });
    tarefaService.obter.mockReturnValue({ sucesso: true, dados: { id: 'TAR-002', agenteResponsavel: 'AGT-FRONTEND', estado: 'PLANEJADA' } as Tarefa });
    handoffService.criar.mockResolvedValue({ sucesso: true, dados: { id: 'HOF-001' } });

    await orquestrador.handoffAutomatico('TAR-001', 'AGT-BACKEND');

    expect(dependenciaService.listarPorFonte).toHaveBeenCalledWith('TAR-001');
    expect(dependenciaService.listarPorDestino).not.toHaveBeenCalled();
    expect(dependenciaService.atualizar).toHaveBeenCalledWith('DEP-001', { estado: 'RESOLVIDA' });
    expect(tarefaService.obter).toHaveBeenCalledWith('TAR-002');
    expect(tarefaService.alterarEstado).toHaveBeenCalledWith('TAR-002', 'PRONTA');
    expect(handoffService.criar).toHaveBeenCalledWith({
      origem: 'AGT-BACKEND',
      destino: 'AGT-FRONTEND',
      tarefaId: 'TAR-002',
      resumo: expect.stringContaining('TAR-001'),
      concluido: [],
      pendente: [],
      artefatos: [],
      decisoes: [],
      alteracoes: [],
      riscos: [],
      bloqueios: []
    });
  });

  test('não altera estado da tarefa dependente se já estiver em execução', async () => {
    const dep: Dependencia = {
      id: 'DEP-002',
      fonteId: 'TAR-001',
      fonteTipo: 'TAREFA',
      destinoId: 'TAR-003',
      destinoTipo: 'TAREFA',
      tipo: 'FIM_INICIO',
      estado: 'ATIVA',
      datas: { criadaEm: new Date().toISOString(), atualizadaEm: new Date().toISOString() }
    };

    dependenciaService.listarPorFonte.mockReturnValue({ sucesso: true, dados: [dep] });
    tarefaService.obter.mockReturnValue({ sucesso: true, dados: { id: 'TAR-003', agenteResponsavel: 'AGT-TESTES', estado: 'EM_EXECUCAO' } as Tarefa });
    handoffService.criar.mockResolvedValue({ sucesso: true, dados: { id: 'HOF-002' } });

    await orquestrador.handoffAutomatico('TAR-001', 'AGT-BACKEND');

    expect(tarefaService.alterarEstado).not.toHaveBeenCalled();
    expect(handoffService.criar).toHaveBeenCalled();
  });

  test('ignora dependências não ativas', async () => {
    const dep: Dependencia = {
      id: 'DEP-003',
      fonteId: 'TAR-001',
      fonteTipo: 'TAREFA',
      destinoId: 'TAR-004',
      destinoTipo: 'TAREFA',
      tipo: 'FIM_INICIO',
      estado: 'RESOLVIDA',
      datas: { criadaEm: new Date().toISOString(), atualizadaEm: new Date().toISOString() }
    };

    dependenciaService.listarPorFonte.mockReturnValue({ sucesso: true, dados: [dep] });

    await orquestrador.handoffAutomatico('TAR-001', 'AGT-BACKEND');

    expect(dependenciaService.atualizar).not.toHaveBeenCalled();
    expect(tarefaService.obter).not.toHaveBeenCalled();
    expect(handoffService.criar).not.toHaveBeenCalled();
  });

  test('retorna sucesso quando listarPorFonte falha', async () => {
    dependenciaService.listarPorFonte.mockReturnValue({ sucesso: false, erro: 'falha', codigoErro: 'ERROR' });

    const result = await orquestrador.handoffAutomatico('TAR-001', 'AGT-BACKEND');

    expect(result.sucesso).toBe(true);
    expect(dependenciaService.atualizar).not.toHaveBeenCalled();
  });

  test('cria handoff para múltiplas dependências ativas', async () => {
    const dep1: Dependencia = {
      id: 'DEP-101',
      fonteId: 'TAR-001',
      fonteTipo: 'TAREFA',
      destinoId: 'TAR-101',
      destinoTipo: 'TAREFA',
      tipo: 'FIM_INICIO',
      estado: 'ATIVA',
      datas: { criadaEm: new Date().toISOString(), atualizadaEm: new Date().toISOString() }
    };
    const dep2: Dependencia = {
      id: 'DEP-102',
      fonteId: 'TAR-001',
      fonteTipo: 'TAREFA',
      destinoId: 'TAR-102',
      destinoTipo: 'TAREFA',
      tipo: 'FIM_INICIO',
      estado: 'ATIVA',
      datas: { criadaEm: new Date().toISOString(), atualizadaEm: new Date().toISOString() }
    };

    dependenciaService.listarPorFonte.mockReturnValue({ sucesso: true, dados: [dep1, dep2] });
    tarefaService.obter
      .mockReturnValueOnce({ sucesso: true, dados: { id: 'TAR-101', agenteResponsavel: 'AGT-FRONTEND', estado: 'PLANEJADA' } as Tarefa })
      .mockReturnValueOnce({ sucesso: true, dados: { id: 'TAR-102', agenteResponsavel: 'AGT-BACKEND', estado: 'PRONTA' } as Tarefa });
    handoffService.criar.mockResolvedValue({ sucesso: true, dados: { id: 'HOF-001' } });

    await orquestrador.handoffAutomatico('TAR-001', 'AGT-BACKEND');

    expect(dependenciaService.atualizar).toHaveBeenCalledTimes(2);
    expect(dependenciaService.atualizar).toHaveBeenCalledWith('DEP-101', { estado: 'RESOLVIDA' });
    expect(dependenciaService.atualizar).toHaveBeenCalledWith('DEP-102', { estado: 'RESOLVIDA' });
    expect(handoffService.criar).toHaveBeenCalledTimes(2);
  });
});
