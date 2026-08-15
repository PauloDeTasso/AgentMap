import { Request, Response, NextFunction } from 'express';
import { ProjetoService, ProjetoAberto } from '../servicios';
import { AgenteService } from '../servicios';
import { TarefaService } from '../servicios';
import { SolicitacaoService } from '../servicios';
import { CriterioService } from '../servicios';
import { ResultadoService } from '../servicios';
import { ArtefatoService } from '../servicios';
import { HandoffService } from '../servicios';
import { PendenciaService } from '../servicios';
import { ValidacaoService } from '../servicios';
import { ConflitoService } from '../servicios';
import { ReservaService } from '../servicios';
import { SessaoService } from '../servicios';
import { CheckpointService } from '../servicios';
import { AprendizadoService } from '../servicios';
import { DependenciaService } from '../servicios';
import { ResponsabilidadeService } from '../servicios';
import { IntegridadeService } from '../servicios';
import { DecisaoService } from '../servicios';
import { RiscoService } from '../servicios';
import { BloqueioService } from '../servicios';
import { EventoService } from '../servicios';
import { InstanciaService } from '../servicios';
import { OrquestradorService } from '../servicios/OrquestradorService';
import { ContatoService } from '../servicios';
import { ResultadoOperacao } from '../tipos';
import { AuditoriaService } from '../servicios';

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
  instancia: InstanciaService;
  orquestrador: OrquestradorService;
  contato: ContatoService;
  auditoria: AuditoriaService;
}

export function projectMiddleware(projetoService: ProjetoService) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(`[middleware] projectMiddleware -> ${req.method} ${req.url}`);
    const projetoResult = projetoService.getProjetoAtual();
    if (!projetoResult.sucesso) {
      console.error('[middleware] getProjetoAtual falhou:', projetoResult.erro);
      return res.status(500).json({ sucesso: false, erro: 'Erro ao acessar projeto' });
    }
    const projeto = projetoResult.dados;
    if (!projeto) {
      console.log('[middleware] Nenhum projeto aberto — retornando 400 para', req.url);
      return res.status(400).json({ sucesso: false, erro: 'Nenhum projeto aberto. Abra ou crie um projeto primeiro.', codigoErro: 'NO_PROJECT_OPEN' });
    }

    req.servicos = {
      projeto,
      agente: new AgenteService(projeto.fileService, projeto.auditoria, projeto.validator),
      tarefa: new TarefaService(projeto.fileService, projeto.auditoria, projeto.validator, projeto.dependencia),
      solicitacao: new SolicitacaoService(projeto.fileService, projeto.auditoria, projeto.validator),
      criterio: new CriterioService(projeto.fileService, projeto.auditoria, projeto.validator),
      resultado: new ResultadoService(projeto.fileService, projeto.auditoria, projeto.validator),
      artefato: new ArtefatoService(projeto.fileService, projeto.auditoria, projeto.validator),
      handoff: new HandoffService(projeto.fileService, projeto.auditoria, projeto.validator),
      pendencia: new PendenciaService(projeto.fileService, projeto.auditoria, projeto.validator),
      validacao: new ValidacaoService(projeto.fileService, projeto.auditoria, projeto.validator),
      conflito: new ConflitoService(projeto.fileService, projeto.auditoria, projeto.validator),
      reserva: new ReservaService(projeto.fileService, projeto.auditoria, projeto.validator),
      sessao: new SessaoService(projeto.fileService, projeto.auditoria, projeto.validator),
      checkpoint: new CheckpointService(projeto.fileService, projeto.auditoria, projeto.validator),
      aprendizado: new AprendizadoService(projeto.fileService, projeto.auditoria, projeto.validator),
      dependencia: new DependenciaService(projeto.fileService, projeto.auditoria, projeto.validator),
      responsabilidade: new ResponsabilidadeService(projeto.fileService, projeto.auditoria, projeto.validator),
      integridade: new IntegridadeService(projeto.fileService, projeto.auditoria, projeto.validator),
      decisao: new DecisaoService(projeto.fileService, projeto.auditoria, projeto.validator),
      risco: new RiscoService(projeto.fileService, projeto.auditoria, projeto.validator),
      bloqueio: new BloqueioService(projeto.fileService, projeto.auditoria, projeto.validator),
      evento: new EventoService(projeto.fileService, projeto.auditoria, projeto.validator),
      instancia: new InstanciaService(projeto.fileService, projeto.auditoria, projeto.validator),
      orquestrador: new OrquestradorService(
        projeto.fileService,
        projeto.auditoria,
        projeto.validator,
        projeto.caminhoRaiz,
        projeto.id,
        new InstanciaService(projeto.fileService, projeto.auditoria, projeto.validator),
        new EventoService(projeto.fileService, projeto.auditoria, projeto.validator),
        new HandoffService(projeto.fileService, projeto.auditoria, projeto.validator),
        new TarefaService(projeto.fileService, projeto.auditoria, projeto.validator, projeto.dependencia),
        new DependenciaService(projeto.fileService, projeto.auditoria, projeto.validator),
        new CriterioService(projeto.fileService, projeto.auditoria, projeto.validator),
        new ValidacaoService(projeto.fileService, projeto.auditoria, projeto.validator),
        new ArtefatoService(projeto.fileService, projeto.auditoria, projeto.validator),
        new ResultadoService(projeto.fileService, projeto.auditoria, projeto.validator)
      ),
      contato: new ContatoService(projeto.fileService, projeto.auditoria, projeto.validator, projeto),
      auditoria: projeto.auditoria
    };
    console.log(`[middleware] Projeto '${projeto.nome}' (id=${projeto.id}) carregado para ${req.method} ${req.url}`);
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
  if (!result.sucesso) {
    return res.status(status).json({ sucesso: false, erro: result.erro, codigoErro: result.codigoErro });
  }
  return res.status(status).json({ sucesso: true, dados: result.dados });
}
