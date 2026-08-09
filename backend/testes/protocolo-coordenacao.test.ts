import path from 'path';
import fs from 'fs';
import os from 'os';
import { FileService } from '../src/arquivos/FileService';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { CriterioService } from '../src/servicios/CriterioService';
import { ResultadoService } from '../src/servicios/ResultadoService';
import { ArtefatoService } from '../src/servicios/ArtefatoService';
import { HandoffService } from '../src/servicios/HandoffService';
import { PendenciaService } from '../src/servicios/PendenciaService';
import { ValidacaoService } from '../src/servicios/ValidacaoService';
import { ConflitoService } from '../src/servicios/ConflitoService';
import { ReservaService } from '../src/servicios/ReservaService';
import { SessaoService } from '../src/servicios/SessaoService';
import { CheckpointService } from '../src/servicios/CheckpointService';
import { AprendizadoService } from '../src/servicios/AprendizadoService';
import { DependenciaService } from '../src/servicios/DependenciaService';
import { ResponsabilidadeService } from '../src/servicios/ResponsabilidadeService';
import { IntegridadeService } from '../src/servicios/IntegridadeService';
import { EventoService } from '../src/servicios/EventoService';

const schemataDir = path.resolve(__dirname, '..', '..', 'esquemas');

function criarAmbienteTeste() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentmap-test-'));
  const iaDir = path.join(tmpDir, '.ia');
  fs.mkdirSync(iaDir, { recursive: true });

  const validator = new SchemaValidator(schemataDir);
  const auditoria = new AuditoriaService(new FileService(tmpDir));
  const fs_service = new FileService(tmpDir);

  ['agentes', 'tarefas', 'solicitacoes', 'criterios', 'resultados', 'artefatos',
    'handoffs', 'pendencias', 'validacoes', 'conflitos', 'reservas', 'sessoes',
    'checkpoints', 'aprendizados', 'dependencias', 'responsabilidades', 'decisoes', 'riscos',
    'historico', 'auditoria', 'estado', 'procedimentos', 'politicas', 'contexto', 'qualidade', 'permissoes', 'conhecimento', 'problemas', 'git', 'configuracao', 'contratos', 'eventos'].forEach((d) => {
    fs.mkdirSync(path.join(iaDir, d), { recursive: true });
  });

  fs.writeFileSync(path.join(iaDir, 'agentes', 'agentes.json'), JSON.stringify({ agentes: [{ id: 'AGT-BACKEND', nome: 'Backend' }] }));
  fs.writeFileSync(path.join(iaDir, 'tarefas', 'tarefas.json'), JSON.stringify({ tarefas: [{ id: 'TAR-001', agenteResponsavel: 'AGT-BACKEND' }], estatisticas: {} }));
  fs.writeFileSync(path.join(iaDir, 'solicitacoes', 'solicitacoes.json'), JSON.stringify({ solicitacoes: [] }));
  fs.writeFileSync(path.join(iaDir, 'pendencias', 'pendencias.json'), JSON.stringify({ pendencias: [] }));
  fs.writeFileSync(path.join(iaDir, 'dependencias', 'dependencias.json'), JSON.stringify({ dependencias: [] }));
  fs.writeFileSync(path.join(iaDir, 'auditoria', 'eventos.json'), JSON.stringify({ eventos: [] }));
  fs.writeFileSync(path.join(iaDir, 'decisoes', 'decisoes.json'), JSON.stringify({ decisoes: [] }));
  fs.writeFileSync(path.join(iaDir, 'riscos', 'riscos.json'), JSON.stringify({ riscos: [] }));
  fs.writeFileSync(path.join(iaDir, 'estado', 'bloqueios.json'), JSON.stringify({ bloqueios: [] }));
  fs.writeFileSync(path.join(iaDir, 'historico', 'historico.json'), JSON.stringify({ eventos: [] }));
  fs.writeFileSync(path.join(iaDir, 'eventos', 'eventos.json'), JSON.stringify({ eventos: [] }));

  return { tmpDir, iaDir, fs_service, auditoria, validator, cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }) };
}

describe('Protocolo de Coordenação - Testes de Integração', () => {
  let env: ReturnType<typeof criarAmbienteTeste>;

  beforeEach(() => {
    env = criarAmbienteTeste();
  });

  afterEach(() => {
    env.cleanup();
  });

  describe('CriterioService', () => {
    it('cria e lista critérios de aceitação', async () => {
      const svc = new CriterioService(env.fs_service, env.auditoria, env.validator);
      const res = await svc.criar({ id: 'ACE-001', tarefaId: 'TAR-001', descricao: 'API deve retornar status', tipo: 'FUNCIONAL', obrigatorio: true, estado: 'PENDENTE' });
      expect(res.sucesso).toBe(true);
      expect(res.dados?.id).toBe('ACE-001');
      const list = svc.listar();
      expect(list.dados?.length).toBe(1);
      const byTask = svc.listarPorTarefa('TAR-001');
      expect(byTask.dados?.length).toBe(1);
    });
  });

  describe('ResultadoService', () => {
    it('cria e lista resultados', async () => {
      const svc = new ResultadoService(env.fs_service, env.auditoria, env.validator);
      const res = await svc.criar({ tarefaId: 'TAR-001', agenteId: 'AGT-BACKEND', resumo: 'Tarefa concluída', estado: 'COMPLETO', arquivosAlterados: ['a.ts'], artefatos: [], testesExecutados: [], testesAprovados: [], riscosEncontrados: [], pendencias: [], alteracoesSolicitadas: [] });
      expect(res.sucesso).toBe(true);
      expect(res.dados?.id).toMatch(/^RES-\d{4}-/);
      const list = svc.listar();
      expect(list.dados?.length).toBe(1);
    });
  });

  describe('ArtefatoService', () => {
    it('cria, lista e adiciona versões', async () => {
      const svc = new ArtefatoService(env.fs_service, env.auditoria, env.validator);
      const res = await svc.criar({ id: 'ART-001', nome: 'cliente-resposta.json', tipo: 'CONTRATO', descricao: 'Contrato de resposta', agenteId: 'AGT-BACKEND', tarefaId: 'TAR-001', estado: 'ATIVO' });
      expect(res.sucesso).toBe(true);

      const versao = await svc.adicionarVersao('ART-001', '1.0.0', 'abc123');
      expect(versao.sucesso).toBe(true);
      expect(versao.dados?.versao).toBe('1.0.0');

      const versoes = svc.listarVersoes('ART-001');
      expect(versoes.dados?.length).toBe(1);
    });
  });

  describe('HandoffService', () => {
    it('cria e lista handoffs', async () => {
      const svc = new HandoffService(env.fs_service, env.auditoria, env.validator);
      const res = await svc.criar({ origem: 'AGT-BACKEND', destino: 'AGT-FRONTEND', tarefaId: 'TAR-001', resumo: 'Contrato atualizado', concluido: ['Campo status adicionado'], pendente: ['Atualizar frontend'], artefatos: [], decisoes: [], alteracoes: [], riscos: [], bloqueios: [] });
      expect(res.sucesso).toBe(true);

      const byDestino = svc.listarPorDestino('AGT-FRONTEND');
      expect(byDestino.dados?.length).toBe(1);
    });
  });

  describe('PendenciaService', () => {
    it('cria e lista pendências', async () => {
      const svc = new PendenciaService(env.fs_service, env.auditoria, env.validator);
      const res = await svc.criar({ titulo: 'Falta teste', descricao: 'Precisa de teste', tipo: 'IMPLEMENTACAO', prioridade: 'ALTA', agenteId: 'AGT-BACKEND', origem: 'TAREFA', tarefaId: 'TAR-001' });
      expect(res.sucesso).toBe(true);
    });
  });

  describe('ValidacaoService', () => {
    it('cria e aprova validação', async () => {
      const svc = new ValidacaoService(env.fs_service, env.auditoria, env.validator);
      const res = await svc.criar({ alvoTipo: 'resultado', alvoId: 'RES-22-12345678', responsavel: 'AGT-TESTES', criterios: ['Teste A'] });
      expect(res.sucesso).toBe(true);

      const approved = await svc.aprovar(res.dados!.id);
      expect(approved.sucesso).toBe(true);
      expect(approved.dados?.estado).toBe('APROVADO');
    });
  });

  describe('ConflitoService', () => {
    it('cria e resolve conflito', async () => {
      const svc = new ConflitoService(env.fs_service, env.auditoria, env.validator);
      const res = await svc.criar({ titulo: 'Duplicado', descricao: 'Dois agentes', tipo: 'RECURSO_DUPLICADO', severidade: 'ALTA', agenteId: 'AGT-BACKEND' });
      expect(res.sucesso).toBe(true);

      const resolved = await svc.resolver(res.dados!.id, 'Decisão arquivada');
      expect(resolved.sucesso).toBe(true);
      expect(resolved.dados?.estado).toBe('RESOLVIDO');
    });
  });

  describe('ReservaService', () => {
    it('cria e libera reserva', async () => {
      const svc = new ReservaService(env.fs_service, env.auditoria, env.validator);
      const res = await svc.criar({ alvo: 'cliente-resposta.json', tipoAlvo: 'ARQUIVO', agenteId: 'AGT-BACKEND', tarefaId: 'TAR-001' });
      expect(res.sucesso).toBe(true);

      const liberada = await svc.liberar(res.dados!.id);
      expect(liberada.sucesso).toBe(true);
      expect(liberada.dados?.estado).toBe('CANCELADA');
    });
  });

  describe('SessaoService', () => {
    it('cria e finaliza sessão', async () => {
      const svc = new SessaoService(env.fs_service, env.auditoria, env.validator);
      const res = await svc.iniciar({ agenteId: 'AGT-BACKEND', tarefaId: 'TAR-001', projetoId: 'PROJ-001', contextoConsultado: {}, registrosProduzidos: [], estadoFinal: '' });
      expect(res.sucesso).toBe(true);

      const finalizada = await svc.finalizar(res.dados!.id, { estadoFinal: 'CONCLUIDA', registrosProduzidos: ['resultados.json'] });
      expect(finalizada.sucesso).toBe(true);
      expect(finalizada.dados?.datas.fim).toBeTruthy();
    });
  });

  describe('CheckpointService', () => {
    it('cria checkpoints por tarefa', async () => {
      const svc = new CheckpointService(env.fs_service, env.auditoria, env.validator);
      const res = await svc.criar({ tarefaId: 'TAR-001', agenteId: 'AGT-BACKEND', tipo: 'INTERMEDIARIO', titulo: 'API concluída', descricao: 'Contrato atualizado', artefatos: [], alteracoes: [], riscos: [], pendencias: [] });
      expect(res.sucesso).toBe(true);

      const byTask = svc.listarPorTarefa('TAR-001');
      expect(byTask.dados?.length).toBe(1);
    });
  });

  describe('AprendizadoService', () => {
    it('cria e lista aprendizados', async () => {
      const svc = new AprendizadoService(env.fs_service, env.auditoria, env.validator);
      const res = await svc.criar({ titulo: 'UTC no timestamp', descricao: 'O projeto usa UTC', categoria: 'CONVENCAO', utilidade: 'ALTA', agenteId: 'AGT-BACKEND' });
      expect(res.sucesso).toBe(true);
    });
  });

  describe('DependenciaService', () => {
    it('cria e detecta ciclo', async () => {
      const svc = new DependenciaService(env.fs_service, env.auditoria, env.validator);
      const res1 = await svc.criar({ fonteId: 'TAR-001', fonteTipo: 'TAREFA', destinoId: 'TAR-002', destinoTipo: 'TAREFA', tipo: 'FIM_INICIO' });
      expect(res1.sucesso).toBe(true);

      const res2 = await svc.criar({ fonteId: 'TAR-002', fonteTipo: 'TAREFA', destinoId: 'TAR-001', destinoTipo: 'TAREFA', tipo: 'FIM_INICIO' });
      expect(res2.sucesso).toBe(true);
      expect(res2.dados?.estado).toBe('CIRCULAR');
    });
  });

  describe('ResponsabilidadeService', () => {
    it('cria e lista responsabilidades', async () => {
      const svc = new ResponsabilidadeService(env.fs_service, env.auditoria, env.validator);
      const res = await svc.criar({ agenteId: 'AGT-BACKEND', alvoId: 'cliente-resposta', alvoTipo: 'CONTRATO_API', nivel: 'RESPONSAVEL' });
      expect(res.sucesso).toBe(true);

      const byAgente = svc.listarPorAgente('AGT-BACKEND');
      expect(byAgente.dados?.length).toBe(1);

      const byAlvo = svc.listarPorAlvo('cliente-resposta');
      expect(byAlvo.dados?.length).toBe(1);
    });
  });

  describe('IntegridadeService', () => {
    it('verifica integridade do projeto', async () => {
      const svc = new IntegridadeService(env.fs_service, env.auditoria, env.validator);
      const result = await svc.verificar('PROJ-001');
      expect(result.sucesso).toBe(true);
      expect(result.dados?.inconsistencias).toEqual([]);
    });

    it('calcula estado do projeto', () => {
      const svc = new IntegridadeService(env.fs_service, env.auditoria, env.validator);
      const result = svc.calcularEstadoProjeto('PROJ-001');
      expect(result.sucesso).toBe(true);
      expect(result.dados?.tarefas.total).toBe(1);
      expect(result.dados?.tarefas.concluidas).toBe(0);
    });
  });

  describe('EventoService', () => {
    it('cria e lista eventos', async () => {
      const svc = new EventoService(env.fs_service, env.auditoria, env.validator);
      const res = await svc.registrar({ tipo: 'HANDOFF_CRIADO', origem: 'AGT-BACKEND', destino: 'AGT-FRONTEND', referenciaTipo: 'handoff', referenciaId: 'HOF-001', mensagem: 'Teste' });
      expect(res.sucesso).toBe(true);
      expect(res.dados?.id).toMatch(/^EVT-2026-/);

      const list = svc.listar();
      expect(list.sucesso).toBe(true);
      expect(list.dados).toHaveLength(1);
    });

    it('filtra eventos por destino e estado', async () => {
      const svc = new EventoService(env.fs_service, env.auditoria, env.validator);
      await svc.registrar({ tipo: 'SOLICITACAO_CRIADA', origem: 'AGT-FRONTEND', destino: 'AGT-BACKEND', referenciaTipo: 'solicitacao', referenciaId: 'ALT-001', mensagem: 'Teste' });

      const pendentes = svc.listar({ destino: 'AGT-BACKEND', estado: 'PENDENTE' });
      expect(pendentes.sucesso).toBe(true);
      expect(pendentes.dados).toHaveLength(1);
    });

    it('marca evento como consumido', async () => {
      const svc = new EventoService(env.fs_service, env.auditoria, env.validator);
      const res = await svc.registrar({ tipo: 'HANDOFF_CRIADO', origem: 'AGT-BACKEND', destino: 'AGT-FRONTEND', referenciaTipo: 'handoff', referenciaId: 'HOF-002', mensagem: 'Teste' });
      const id = res.dados!.id;

      const consumido = svc.marcarConsumido(id);
      expect(consumido.sucesso).toBe(true);
      expect(consumido.dados?.estado).toBe('CONSUMIDO');
    });
  });

  describe('HandoffService com EventoService', () => {
    it('emite HANDOFF_CRIADO ao criar handoff com EventoService', async () => {
      const eventoService = new EventoService(env.fs_service, env.auditoria, env.validator);
      const handoffService = new HandoffService(env.fs_service, env.auditoria, env.validator, eventoService);

      const res = await handoffService.criar({ origem: 'AGT-BACKEND', destino: 'AGT-FRONTEND', tarefaId: 'TAR-001', resumo: 'Teste', concluido: [], pendente: [], artefatos: [], decisoes: [], alteracoes: [], riscos: [], bloqueios: [] });
      expect(res.sucesso).toBe(true);

      const eventos = eventoService.listar();
      expect(eventos.sucesso).toBe(true);
      expect(eventos.dados).toHaveLength(1);
      expect(eventos.dados![0].tipo).toBe('HANDOFF_CRIADO');
    });

    it('emite HANDOFF_ACEITO ao atualizar estado com EventoService', async () => {
      const eventoService = new EventoService(env.fs_service, env.auditoria, env.validator);
      const handoffService = new HandoffService(env.fs_service, env.auditoria, env.validator, eventoService);

      const res = await handoffService.criar({ origem: 'AGT-BACKEND', destino: 'AGT-FRONTEND', tarefaId: 'TAR-001', resumo: 'Teste', concluido: [], pendente: [], artefatos: [], decisoes: [], alteracoes: [], riscos: [], bloqueios: [] });
      expect(res.sucesso).toBe(true);
      const handoffId = res.dados!.id;

      const eventosAntes = eventoService.listar();
      expect(eventosAntes.sucesso).toBe(true);
      expect(eventosAntes.dados).toHaveLength(1);

      const updateRes = await handoffService.atualizar(handoffId, { estado: 'ACEITO' });
      expect(updateRes.sucesso).toBe(true);

      const eventosDepois = eventoService.listar();
      expect(eventosDepois.sucesso).toBe(true);
      expect(eventosDepois.dados).toHaveLength(2);
      expect(eventosDepois.dados![1].tipo).toBe('HANDOFF_ACEITO');
    });

    it('não emite duplicado se estado não muda', async () => {
      const eventoService = new EventoService(env.fs_service, env.auditoria, env.validator);
      const handoffService = new HandoffService(env.fs_service, env.auditoria, env.validator, eventoService);

      const res = await handoffService.criar({ origem: 'AGT-BACKEND', destino: 'AGT-FRONTEND', tarefaId: 'TAR-001', resumo: 'Teste', concluido: [], pendente: [], artefatos: [], decisoes: [], alteracoes: [], riscos: [], bloqueios: [] });
      expect(res.sucesso).toBe(true);
      const handoffId = res.dados!.id;

      await handoffService.atualizar(handoffId, { estado: 'PENDENTE' });
      const eventos = eventoService.listar();
      expect(eventos.sucesso).toBe(true);
      expect(eventos.dados).toHaveLength(1);
    });
  });
});
