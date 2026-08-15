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
import { ContatoService } from 'servicios';
import { StateMachineService } from 'servicios';
import { ContractValidatorService } from 'servicios';
import { BackupService } from 'servicios';
import { MonitoramentoService } from 'servicios/MonitoramentoService';
import { FluxoService } from 'servicios/FluxoService';
import { InstanciaService } from 'servicios/InstanciaService';
import { OrquestradorService } from 'servicios/OrquestradorService';

export interface ProjetoContext {
  projetoId: string;
  projeto: ProjetoAberto;
  servicos: Servicos;
}

export function montarServicos(projeto: ProjetoAberto): Servicos {
  const validator = projeto.validator;
  const eventoService = new EventoService(projeto.fileService, projeto.auditoria, validator);
  const stateMachineService = new StateMachineService(projeto.fileService, projeto.auditoria, validator);
  return {
    projeto,
    agente: new AgenteService(projeto.fileService, projeto.auditoria, validator),
    tarefa: new TarefaService(projeto.fileService, projeto.auditoria, validator, projeto.dependencia, eventoService, stateMachineService),
    solicitacao: new SolicitacaoService(projeto.fileService, projeto.auditoria, validator),
    criterio: new CriterioService(projeto.fileService, projeto.auditoria, validator),
    resultado: new ResultadoService(projeto.fileService, projeto.auditoria, validator),
    artefato: new ArtefatoService(projeto.fileService, projeto.auditoria, validator),
    handoff: new HandoffService(projeto.fileService, projeto.auditoria, validator, eventoService),
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
      contato: new ContatoService(projeto.fileService, projeto.auditoria, validator, projeto),
      evento: eventoService,
      auditoria: projeto.auditoria,
      stateMachine: stateMachineService,
      contractValidator: new ContractValidatorService(projeto.fileService, projeto.auditoria, validator),
      backup: new BackupService(projeto.fileService, projeto.auditoria, validator, projeto.caminhoRaiz),
      monitoramento: new MonitoramentoService(projeto.fileService, projeto.auditoria, validator),
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
      )
    };
}

export function carregarContexto(projetoService: ProjetoService): ResultadoOperacao<ProjetoContext> {
  const resultado = projetoService.getProjetoAtual();
  if (!resultado.sucesso) {
    return { sucesso: false, erro: resultado.erro, codigoErro: resultado.codigoErro };
  }
  const projeto = resultado.dados;
  if (!projeto) {
    return {
      sucesso: false,
      erro: 'Nenhum projeto aberto. Abra ou crie um projeto primeiro.',
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
