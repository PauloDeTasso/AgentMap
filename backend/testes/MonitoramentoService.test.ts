import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { FileService } from '../src/arquivos/FileService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { TarefaService } from '../src/servicios/TarefaService';
import { SessaoService } from '../src/servicios/SessaoService';
import { MonitoramentoService } from '../src/servicios/MonitoramentoService';
import { Tarefa, EstadoTarefa } from '../src/tipos';

const schemataDir = path.resolve(__dirname, '..', '..', 'esquemas');

function criarAmbienteTeste() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentmap-monitoramento-test-'));
  const iaDir = path.join(tmpDir, '.ia');
  fs.mkdirSync(iaDir, { recursive: true });

  const validator = new SchemaValidator(schemataDir);
  const fs_service = new FileService(tmpDir);
  const auditoria = new AuditoriaService(fs_service);
  const tarefaService = new TarefaService(fs_service, auditoria, validator);
  const sessaoService = new SessaoService(fs_service, auditoria, validator);
  const monitoramento = new MonitoramentoService(fs_service, auditoria, tarefaService, sessaoService);

  ['contexto', 'tarefas', 'tarefas/execucao', 'tarefas/rascunho', 'tarefas/aprovacao', 'tarefas/revisao', 'tarefas/concluidas', 'sessoes', 'auditoria'].forEach((d) => {
    fs.mkdirSync(path.join(iaDir, d), { recursive: true });
  });

  fs.writeFileSync(path.join(iaDir, 'tarefas', 'tarefas.json'), JSON.stringify({ tarefas: [], estatisticas: {} }));
  fs.writeFileSync(path.join(iaDir, 'sessoes', 'sessoes.json'), JSON.stringify({ sessoes: [] }));
  fs.writeFileSync(path.join(iaDir, 'auditoria', 'eventos.json'), JSON.stringify({ eventos: [] }));

  return { tmpDir, iaDir, fs_service, auditoria, tarefaService, sessaoService, monitoramento, cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }) };
}

function criarTarefa(iaDir: string, estado: EstadoTarefa = 'RASCUNHO'): Tarefa {
  const tarefa: Tarefa = {
    id: 'TAR-001',
    titulo: 'Teste',
    descricao: 'Teste',
    objetivo: 'Teste',
    tipo: 'desenvolvimento',
    estado,
    prioridade: 'media',
    agenteResponsavel: 'AGT-BACKEND',
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
    criteriosConclusao: [],
    resultado: { resumo: '', arquivosAlterados: [], testesExecutados: [], testesAprovados: [], riscosEncontrados: [], pendencias: [], observacoes: '', commit: '' },
    aprovacao: { necessaria: false, estado: 'nao_solicitada', aprovador: '', data: null, observacao: '' },
    datas: { criacao: new Date().toISOString(), inicio: null, ultimaAtualizacao: new Date().toISOString(), conclusao: null }
  };

  const registry = JSON.parse(fs.readFileSync(path.join(iaDir, 'tarefas', 'tarefas.json'), 'utf-8'));
  registry.tarefas.push(tarefa);
  registry.estatisticas = { total: 1, [estado]: 1 };
  fs.writeFileSync(path.join(iaDir, 'tarefas', 'tarefas.json'), JSON.stringify(registry, null, 2));

  fs.writeFileSync(path.join(iaDir, 'tarefas', 'execucao', 'TAR-001.json'), JSON.stringify(tarefa, null, 2));
  return tarefa;
}

function criarSessao(iaDir: string, agenteId: string, tarefaId: string): { id: string } {
  const sessaoId = 'SES-001';
  const sessao = {
    id: sessaoId,
    agenteId,
    tarefaId,
    projetoId: 'PROJ-001',
    contextoConsultado: {},
    registrosProduzidos: [],
    estadoFinal: '',
    datas: { inicio: new Date().toISOString(), fim: null }
  };

  const registry = JSON.parse(fs.readFileSync(path.join(iaDir, 'sessoes', 'sessoes.json'), 'utf-8'));
  registry.sessoes.push(sessao);
  fs.writeFileSync(path.join(iaDir, 'sessoes', 'sessoes.json'), JSON.stringify(registry, null, 2));
  fs.writeFileSync(path.join(iaDir, 'sessoes', `${sessaoId}.json`), JSON.stringify(sessao, null, 2));
  return { id: sessaoId };
}

describe('MonitoramentoService', () => {
  let env: ReturnType<typeof criarAmbienteTeste>;

  beforeEach(() => {
    env = criarAmbienteTeste();
  });

  afterEach(() => {
    env.cleanup();
  });

  describe('PAUSAR_TAREFA', () => {
    test('escreve pausa.json com dados corretos', async () => {
      const result = await env.monitoramento.executarIntervencao('PROJ-001', 'TAR-001', 'PAUSAR_TAREFA', { motivo: 'Manutenção' });
      expect(result.sucesso).toBe(true);
      expect(result.dados).toEqual(
        expect.objectContaining({
          tarefaId: 'TAR-001',
          pausada: true,
          motivo: 'Manutenção'
        })
      );

      const pausa = JSON.parse(fs.readFileSync(path.join(env.iaDir, 'contexto', 'pausa.json'), 'utf-8'));
      expect(pausa.tarefaId).toBe('TAR-001');
      expect(pausa.pausada).toBe(true);
      expect(pausa.motivo).toBe('Manutenção');
    });

    test('usa motivo padrão quando não fornecido', async () => {
      const result = await env.monitoramento.executarIntervencao('PROJ-001', 'TAR-001', 'PAUSAR_TAREFA');
      expect(result.sucesso).toBe(true);
      expect((result.dados as any).motivo).toBe('Intervenção manual');
    });

    test('registra evento de auditoria', async () => {
      await env.monitoramento.executarIntervencao('PROJ-001', 'TAR-001', 'PAUSAR_TAREFA');
      const eventos = env.auditoria.listar();
      expect(eventos).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tipo: 'TAREFA_PAUSADA' })
        ])
      );
    });
  });

  describe('CANCELAR_AGENTE', () => {
    test('marca sessão ativa como cancelada e cancela tarefa', async () => {
      criarTarefa(env.iaDir, 'EM_EXECUCAO');
      const sessao = criarSessao(env.iaDir, 'AGT-BACKEND', 'TAR-001');

      const result = await env.monitoramento.executarIntervencao('PROJ-001', 'TAR-001', 'CANCELAR_AGENTE', { agenteId: 'AGT-BACKEND' });
      expect(result.sucesso).toBe(true);
      expect((result.dados as any).sessaoId).toBe(sessao.id);

      const sessaoAtualizada = JSON.parse(fs.readFileSync(path.join(env.iaDir, 'sessoes', 'SES-001.json'), 'utf-8'));
      expect(sessaoAtualizada.estadoFinal).toBe('CANCELADA');
      expect(sessaoAtualizada.datas.fim).toBeTruthy();

      const tarefaAtualizada = JSON.parse(fs.readFileSync(path.join(env.iaDir, 'tarefas', 'tarefas.json'), 'utf-8')).tarefas.find((t: Tarefa) => t.id === 'TAR-001');
      expect(tarefaAtualizada.estado).toBe('CANCELADA');
    });

    test('retorna erro quando agenteId não é fornecido', async () => {
      criarTarefa(env.iaDir, 'EM_EXECUCAO');
      const result = await env.monitoramento.executarIntervencao('PROJ-001', 'TAR-001', 'CANCELAR_AGENTE');
      expect(result.sucesso).toBe(false);
      expect(result.codigoErro).toBe('MISSING_AGENT_ID');
    });

    test('retorna erro quando não há sessão ativa', async () => {
      criarTarefa(env.iaDir, 'EM_EXECUCAO');
      const result = await env.monitoramento.executarIntervencao('PROJ-001', 'TAR-001', 'CANCELAR_AGENTE', { agenteId: 'AGT-BACKEND' });
      expect(result.sucesso).toBe(false);
      expect(result.codigoErro).toBe('NO_ACTIVE_SESSION');
    });
  });

  describe('REDIRECIONAR_TAREFA', () => {
    test('atualiza agenteResponsavel da tarefa', async () => {
      criarTarefa(env.iaDir, 'RASCUNHO');

      const result = await env.monitoramento.executarIntervencao('PROJ-001', 'TAR-001', 'REDIRECIONAR_TAREFA', { agenteId: 'AGT-FRONTEND' });
      expect(result.sucesso).toBe(true);
      expect((result.dados as any).agenteResponsavel).toBe('AGT-FRONTEND');

      const tarefaAtualizada = JSON.parse(fs.readFileSync(path.join(env.iaDir, 'tarefas', 'tarefas.json'), 'utf-8')).tarefas.find((t: Tarefa) => t.id === 'TAR-001');
      expect(tarefaAtualizada.agenteResponsavel).toBe('AGT-FRONTEND');
    });

    test('retorna erro quando agenteId não é fornecido', async () => {
      criarTarefa(env.iaDir, 'RASCUNHO');
      const result = await env.monitoramento.executarIntervencao('PROJ-001', 'TAR-001', 'REDIRECIONAR_TAREFA');
      expect(result.sucesso).toBe(false);
      expect(result.codigoErro).toBe('MISSING_AGENT_ID');
    });

    test('registra evento de auditoria', async () => {
      criarTarefa(env.iaDir, 'RASCUNHO');
      await env.monitoramento.executarIntervencao('PROJ-001', 'TAR-001', 'REDIRECIONAR_TAREFA', { agenteId: 'AGT-FRONTEND' });
      const eventos = env.auditoria.listar();
      expect(eventos).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tipo: 'TAREFA_REDIRECIONADA' })
        ])
      );
    });
  });

  describe('APROVAR', () => {
    test('altera estado para CONCLUIDA quando tarefa está em AGUARDANDO_APROVACAO', async () => {
      criarTarefa(env.iaDir, 'AGUARDANDO_APROVACAO');

      const result = await env.monitoramento.executarIntervencao('PROJ-001', 'TAR-001', 'APROVAR');
      expect(result.sucesso).toBe(true);
      expect((result.dados as any).estado).toBe('CONCLUIDA');

      const tarefaAtualizada = JSON.parse(fs.readFileSync(path.join(env.iaDir, 'tarefas', 'tarefas.json'), 'utf-8')).tarefas.find((t: Tarefa) => t.id === 'TAR-001');
      expect(tarefaAtualizada.estado).toBe('CONCLUIDA');
    });

    test('falha para transição inválida', async () => {
      criarTarefa(env.iaDir, 'RASCUNHO');

      const result = await env.monitoramento.executarIntervencao('PROJ-001', 'TAR-001', 'APROVAR');
      expect(result.sucesso).toBe(false);
      expect(result.codigoErro).toBe('INVALID_TRANSITION');
    });
  });

  describe('REJEITAR', () => {
    test('altera estado para REJEITADA quando tarefa está em AGUARDANDO_APROVACAO', async () => {
      criarTarefa(env.iaDir, 'AGUARDANDO_APROVACAO');

      const result = await env.monitoramento.executarIntervencao('PROJ-001', 'TAR-001', 'REJEITAR');
      expect(result.sucesso).toBe(true);
      expect((result.dados as any).estado).toBe('REJEITADA');

      const tarefaAtualizada = JSON.parse(fs.readFileSync(path.join(env.iaDir, 'tarefas', 'tarefas.json'), 'utf-8')).tarefas.find((t: Tarefa) => t.id === 'TAR-001');
      expect(tarefaAtualizada.estado).toBe('REJEITADA');
    });

    test('altera estado para REJEITADA quando tarefa está em EM_REVISAO', async () => {
      criarTarefa(env.iaDir, 'EM_REVISAO');

      const result = await env.monitoramento.executarIntervencao('PROJ-001', 'TAR-001', 'REJEITAR');
      expect(result.sucesso).toBe(true);
      expect((result.dados as any).estado).toBe('REJEITADA');
    });

    test('falha para transição inválida', async () => {
      criarTarefa(env.iaDir, 'RASCUNHO');

      const result = await env.monitoramento.executarIntervencao('PROJ-001', 'TAR-001', 'REJEITAR');
      expect(result.sucesso).toBe(false);
      expect(result.codigoErro).toBe('INVALID_TRANSITION');
    });
  });

  describe('tipo desconhecido', () => {
    test('retorna erro para tipo de intervenção inválido', async () => {
      const result = await env.monitoramento.executarIntervencao('PROJ-001', 'TAR-001', 'INVALIDO' as any);
      expect(result.sucesso).toBe(false);
      expect(result.codigoErro).toBe('UNKNOWN_INTERVENTION');
    });
  });
});
