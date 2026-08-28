import { Request, Response, NextFunction } from 'express';
import { ProjetoAberto } from '../servicios/ProjetoService';
import { AgenteService } from '../servicios/AgenteService';
import { TarefaService } from '../servicios/TarefaService';
import { SolicitacaoService } from '../servicios/SolicitacaoService';
import { CriterioService } from '../servicios/CriterioService';
import { ResultadoService } from '../servicios/ResultadoService';
import { ArtefatoService } from '../servicios/ArtefatoService';
import { HandoffService } from '../servicios/HandoffService';
import { PendenciaService } from '../servicios/PendenciaService';
import { ValidacaoService } from '../servicios/ValidacaoService';
import { ConflitoService } from '../servicios/ConflitoService';
import { ReservaService } from '../servicios/ReservaService';
import { SessaoService } from '../servicios/SessaoService';
import { CheckpointService } from '../servicios/CheckpointService';
import { AprendizadoService } from '../servicios/AprendizadoService';
import { DependenciaService } from '../servicios/DependenciaService';
import { ResponsabilidadeService } from '../servicios/ResponsabilidadeService';
import { IntegridadeService } from '../servicios/IntegridadeService';
import { DecisaoService } from '../servicios/DecisaoService';
import { RiscoService } from '../servicios/RiscoService';
import { BloqueioService } from '../servicios/BloqueioService';
import { EventoService } from '../servicios/EventoService';
import { ContatoService } from '../servicios/ContatoService';
import { EstadoService } from '../servicios/EstadoService';
import { StateMachineService } from '../servicios/StateMachineService';
import { ContractValidatorService } from '../servicios/ContractValidatorService';
import { BackupService } from '../servicios/BackupService';
import { MonitoramentoService } from '../servicios/MonitoramentoService';
import { FluxoService } from '../servicios/FluxoService';
import { InstanciaService } from '../servicios/InstanciaService';
import { OrquestradorService } from '../servicios/OrquestradorService';
import { KiloDiscoveryService } from '../servicios/KiloDiscoveryService';
import { KiloReconciliationService } from '../servicios/KiloReconciliationService';
import { TaskContextBuilder } from '../servicios/TaskContextBuilder';
import { AuditoriaService } from '../servicios/AuditoriaService';
import { ProjectOrchestrator } from '../servicios/ProjectOrchestrator';
import { PhaseStateMachine } from '../servicios/PhaseStateMachine';
import { CheckpointValidator } from '../servicios/CheckpointValidator';
import { HandoffManager } from '../servicios/HandoffManager';
import { ResultadoOperacao } from '../tipos';

export interface Servicos {
  projeto: ProjetoAberto;
  agente: AgenteService;
  tarefa: TarefaService;
  solicitacao: SolicitacaoService;
  criterio: CriterioService;
  resultado: ResultadoService;
  artefato: ArtefatoService;
  handoff: HandoffService;
  pendencia: PendenciaService;
  validacao: ValidacaoService;
  conflito: ConflitoService;
  reserva: ReservaService;
  sessao: SessaoService;
  checkpoint: CheckpointService;
  aprendizado: AprendizadoService;
  dependencia: DependenciaService;
  responsabilidade: ResponsabilidadeService;
  integridade: IntegridadeService;
  decisao: DecisaoService;
  risco: RiscoService;
  bloqueio: BloqueioService;
  evento: EventoService;
  contato: ContatoService;
  estado: EstadoService;
  auditoria: AuditoriaService;
  stateMachine: StateMachineService;
  contractValidator: ContractValidatorService;
  backup: BackupService;
  monitoramento: MonitoramentoService;
  fluxo: FluxoService;
  instancia: InstanciaService;
  orquestrador: OrquestradorService;
  projectOrchestrator: ProjectOrchestrator;
  phaseStateMachine: PhaseStateMachine;
  checkpointValidator: CheckpointValidator;
  handoffManager: HandoffManager;
  kiloDiscovery: KiloDiscoveryService;
  kiloReconciliation: KiloReconciliationService;
  taskContextBuilder: TaskContextBuilder;
}

/**
 * Cria todos os serviços para um projeto aberto (singleton).
 * Chamado uma vez na inicialização.
 */
export function criarServicos(projeto: ProjetoAberto): Servicos {
  const validator = projeto.validator;
  const eventoService = new EventoService(projeto.fileService, projeto.auditoria, validator);
  const stateMachineService = new StateMachineService(projeto.fileService, projeto.auditoria, validator);
  const monitoramento = new MonitoramentoService(projeto.fileService, projeto.auditoria, validator);

  return {
    projeto,
    monitoramento,
    agente: new AgenteService(projeto.fileService, projeto.auditoria, validator),
    tarefa: new TarefaService(projeto.fileService, projeto.auditoria, validator, projeto.dependencia, eventoService, stateMachineService),
    solicitacao: new SolicitacaoService(projeto.fileService, projeto.auditoria, validator, undefined, undefined, monitoramento),
    criterio: new CriterioService(projeto.fileService, projeto.auditoria, validator),
    resultado: new ResultadoService(projeto.fileService, projeto.auditoria, validator),
    artefato: new ArtefatoService(projeto.fileService, projeto.auditoria, validator),
    handoff: new HandoffService(projeto.fileService, projeto.auditoria, validator, eventoService, undefined, monitoramento),
    pendencia: new PendenciaService(projeto.fileService, projeto.auditoria, validator),
    validacao: new ValidacaoService(projeto.fileService, projeto.auditoria, validator),
    conflito: new ConflitoService(projeto.fileService, projeto.auditoria, validator),
    reserva: new ReservaService(projeto.fileService, projeto.auditoria, validator),
    sessao: new SessaoService(projeto.fileService, projeto.auditoria, validator),
    checkpoint: new CheckpointService(projeto.fileService, projeto.auditoria, validator),
    aprendizado: new AprendizadoService(projeto.fileService, projeto.auditoria, validator),
    dependencia: new DependenciaService(projeto.fileService, projeto.auditoria, validator),
    responsabilidade: new ResponsabilidadeService(projeto.fileService, projeto.auditoria, validator),
    integridade: new IntegridadeService(projeto.fileService, projeto.auditoria, validator, projeto.fluxo),
    decisao: new DecisaoService(projeto.fileService, projeto.auditoria, validator),
    risco: new RiscoService(projeto.fileService, projeto.auditoria, validator),
    bloqueio: new BloqueioService(projeto.fileService, projeto.auditoria, validator),
    evento: eventoService,
    contato: new ContatoService(projeto.fileService, projeto.auditoria, validator, projeto),
    estado: new EstadoService(projeto.fileService, projeto.auditoria),
    auditoria: projeto.auditoria,
    stateMachine: stateMachineService,
    contractValidator: new ContractValidatorService(projeto.fileService, projeto.auditoria, validator),
    backup: new BackupService(projeto.fileService, projeto.auditoria, validator, projeto.caminhoRaiz),
    fluxo: new FluxoService(projeto.fileService, projeto.auditoria),
    instancia: new InstanciaService(projeto.fileService, projeto.auditoria, validator),
    orquestrador: new OrquestradorService(
      projeto.fileService,
      projeto.auditoria,
      projeto.validator,
      projeto.caminhoRaiz,
      projeto.id,
      new InstanciaService(projeto.fileService, projeto.auditoria, validator),
      eventoService,
      new HandoffService(projeto.fileService, projeto.auditoria, validator),
      new TarefaService(projeto.fileService, projeto.auditoria, validator, projeto.dependencia, eventoService, stateMachineService),
      new DependenciaService(projeto.fileService, projeto.auditoria, validator)
    ),
    projectOrchestrator: new ProjectOrchestrator(
      projeto.fileService,
      projeto.auditoria,
      new TarefaService(projeto.fileService, projeto.auditoria, validator, projeto.dependencia, eventoService, stateMachineService),
      new DependenciaService(projeto.fileService, projeto.auditoria, validator),
      new HandoffService(projeto.fileService, projeto.auditoria, validator),
      eventoService,
      { projetoId: projeto.id, projetoNome: projeto.nome, caminhoRaiz: projeto.caminhoRaiz }
    ),
    phaseStateMachine: new PhaseStateMachine(projeto.fileService, projeto.auditoria, projeto.id, projeto.nome),
    checkpointValidator: new CheckpointValidator(projeto.fileService, projeto.auditoria, validator),
    handoffManager: new HandoffManager(
      projeto.fileService,
      projeto.auditoria,
      validator,
      new HandoffService(projeto.fileService, projeto.auditoria, validator),
      eventoService,
      monitoramento
    ),
    kiloDiscovery: projeto.kiloDiscovery,
    kiloReconciliation: projeto.kiloReconciliation,
    taskContextBuilder: new TaskContextBuilder(projeto.fileService, projeto.auditoria, validator)
  };
}

/**
 * Middleware que injeta os serviços singleton no request.
 * Substitui projectMiddleware (que recriava serviços a cada request).
 */
export function servicesMiddleware(servicos: Servicos) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.servicos = servicos;
    next();
  };
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<Response> | Response) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(`[asyncHandler] Erro em ${req.method} ${req.url}:`, err?.message || err);
      next(err);
    });
  };
}

declare global {
  namespace Express {
    interface Request {
      servicos?: Servicos;
    }
  }
}

export function responder(res: Response, result: ResultadoOperacao<any>, status = 200): Response {
  return res.status(status).json({ sucesso: result.sucesso, dados: result.dados, erro: result.erro, codigoErro: result.codigoErro });
}
