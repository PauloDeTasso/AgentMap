import { ProjetoService, ProjetoAberto } from 'servicios';
import { Servicos } from 'api/middleware';
import { ResultadoOperacao } from 'tipos';
import { SchemaValidator } from 'validacao/SchemaValidator';
import { FileService } from 'arquivos/FileService';
import { AuditoriaService } from 'servicios';
import { DependenciaService } from 'servicios';
import { AgenteService } from 'servicios';
import { TarefaService } from 'servicios';
import { SolicitacaoService } from 'servicios';
import { CriterioService } from 'servicios';
import { ResultadoService } from 'servicios';
import { ArtefatoService } from 'servicios';
import { HandoffService } from 'servicios';
import { PendenciaService } from 'servicios';
import { ValidacaoService } from 'servicios';
import { ConflitoService } from 'servicios';
import { ReservaService } from 'servicios';
import { SessaoService } from 'servicios';
import { CheckpointService } from 'servicios';
import { AprendizadoService } from 'servicios';
import { ResponsabilidadeService } from 'servicios';
import { IntegridadeService } from 'servicios';
import { DecisaoService } from 'servicios';
import { RiscoService } from 'servicios';
import { BloqueioService } from 'servicios';
import { EventoService } from 'servicios';
import { EstadoService } from 'servicios';
import { ContatoService } from 'servicios';
import { StateMachineService } from 'servicios';
import { ContractValidatorService } from 'servicios';
import { BackupService } from 'servicios';
import { MonitoramentoService } from 'servicios/MonitoramentoService';
import { FluxoService } from 'servicios/FluxoService';
import { InstanciaService } from 'servicios/InstanciaService';
import { OrquestradorService } from 'servicios/OrquestradorService';
import { KiloDiscoveryService } from 'servicios/KiloDiscoveryService';
import { KiloReconciliationService } from 'servicios/KiloReconciliationService';
import { TaskContextBuilder } from 'servicios/TaskContextBuilder';
import { ProjectOrchestrator } from 'servicios/ProjectOrchestrator';
import { PhaseStateMachine } from 'servicios/PhaseStateMachine';
import { CheckpointValidator } from 'servicios/CheckpointValidator';
import { HandoffManager } from 'servicios/HandoffManager';
import { globalEventBus } from './events/event-bus';
import { ProjectRootResolver } from 'config';
import * as path from 'path';

export interface ProjetoContext {
  projetoId: string;
  projeto: ProjetoAberto;
  servicos: Servicos;
}

export function montarServicos(projeto: ProjetoAberto): Servicos {
  const validator = projeto.validator;
  const eventoService = new EventoService(projeto.fileService, projeto.auditoria, validator);
  const stateMachineService = new StateMachineService(projeto.fileService, projeto.auditoria, validator);
  const monitoramento = new MonitoramentoService(projeto.fileService, projeto.auditoria, validator);
  return {
    projeto,
    agente: new AgenteService(projeto.fileService, projeto.auditoria, validator),
    tarefa: new TarefaService(projeto.fileService, projeto.auditoria, validator, projeto.dependencia, eventoService, stateMachineService),
    solicitacao: new SolicitacaoService(projeto.fileService, projeto.auditoria, validator, undefined, globalEventBus, monitoramento),
    criterio: new CriterioService(projeto.fileService, projeto.auditoria, validator),
    resultado: new ResultadoService(projeto.fileService, projeto.auditoria, validator),
    artefato: new ArtefatoService(projeto.fileService, projeto.auditoria, validator),
    handoff: new HandoffService(projeto.fileService, projeto.auditoria, validator, eventoService, globalEventBus, monitoramento),
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
      bloqueio: new BloqueioService(projeto.fileService, projeto.auditoria, validator, undefined, globalEventBus),
      contato: new ContatoService(projeto.fileService, projeto.auditoria, validator, projeto),
      estado: new EstadoService(projeto.fileService, projeto.auditoria),
      evento: eventoService,
      auditoria: projeto.auditoria,
      stateMachine: stateMachineService,
      contractValidator: new ContractValidatorService(projeto.fileService, projeto.auditoria, validator),
      backup: new BackupService(projeto.fileService, projeto.auditoria, validator, projeto.caminhoRaiz),
      monitoramento,
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
        new HandoffService(projeto.fileService, projeto.auditoria, validator, eventoService),
        new TarefaService(projeto.fileService, projeto.auditoria, validator, projeto.dependencia, eventoService, stateMachineService),
        new DependenciaService(projeto.fileService, projeto.auditoria, validator)
      ),
      projectOrchestrator: new ProjectOrchestrator(
        projeto.fileService,
        projeto.auditoria,
        new TarefaService(projeto.fileService, projeto.auditoria, validator, projeto.dependencia, eventoService, stateMachineService),
        new DependenciaService(projeto.fileService, projeto.auditoria, validator),
        new HandoffService(projeto.fileService, projeto.auditoria, validator, eventoService),
        eventoService,
        { projetoId: projeto.id, projetoNome: projeto.nome, caminhoRaiz: projeto.caminhoRaiz }
      ),
      phaseStateMachine: new PhaseStateMachine(projeto.fileService, projeto.auditoria, projeto.id, projeto.nome),
      checkpointValidator: new CheckpointValidator(projeto.fileService, projeto.auditoria, validator),
      handoffManager: new HandoffManager(
        projeto.fileService,
        projeto.auditoria,
        validator,
        new HandoffService(projeto.fileService, projeto.auditoria, validator, eventoService),
        eventoService,
        monitoramento
      ),
      kiloDiscovery: projeto.kiloDiscovery,
      kiloReconciliation: projeto.kiloReconciliation,
      taskContextBuilder: new TaskContextBuilder(projeto.fileService, projeto.auditoria, validator)
    };
  }

/**
 * Carrega contexto do projeto atual.
 * Em single-project mode, usa o projeto aberto no service.
 */
export function carregarContexto(projetoService: ProjetoService): ResultadoOperacao<ProjetoContext> {
  const resultado = projetoService.getProjetoAtual();
  if (!resultado.sucesso) {
    return { sucesso: false, erro: resultado.erro, codigoErro: resultado.codigoErro };
  }
  const projeto = resultado.dados;
  if (!projeto) {
    return {
      sucesso: false,
      erro: 'Nenhum projeto aberto. Verifique se .ia/ existe no diretório raiz.',
      codigoErro: 'NO_PROJECT_OPEN',
    };
  }

  const servicos = montarServicos(projeto);

  return {
    sucesso: true,
    dados: {
      projetoId: projeto.id,
      projeto,
      servicos,
    },
  };
}
