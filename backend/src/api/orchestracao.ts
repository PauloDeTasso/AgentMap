import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { FaseProjeto } from '../servicios/PhaseStateMachine';

export function criarOrchestracaoRouter(): Router {
  const router = Router();

  router.get('/fases', asyncHandler(async (req: Request, res: Response) => {
    const fases = req.servicos!.projectOrchestrator.listarFases();
    return responder(res, { sucesso: true, dados: fases });
  }));

  router.get('/estado', asyncHandler(async (req: Request, res: Response) => {
    const estado = req.servicos!.projectOrchestrator.obterEstadoFase();
    return responder(res, estado);
  }));

  router.get('/historico', asyncHandler(async (req: Request, res: Response) => {
    const historico = req.servicos!.projectOrchestrator.obterHistoricoFases();
    return responder(res, historico);
  }));

  router.post('/fases/:faseId/iniciar', asyncHandler(async (req: Request, res: Response) => {
    const { faseId } = req.params;
    const result = await req.servicos!.projectOrchestrator.iniciarFase(faseId as FaseProjeto);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.post('/fases/:faseId/checkpoint/aprovar', asyncHandler(async (req: Request, res: Response) => {
    const { faseId } = req.params;
    const { aprovadoPor, observacoes } = req.body || {};
    if (!aprovadoPor) {
      return responder(res, { sucesso: false, erro: 'aprovadoPor é obrigatório', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = await req.servicos!.projectOrchestrator.aprovarCheckpoint(faseId as FaseProjeto, aprovadoPor);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.get('/handoffs', asyncHandler(async (req: Request, res: Response) => {
    const handoffs = req.servicos!.handoffManager.listarHandoffsPorFase('');
    return responder(res, handoffs);
  }));

  return router;
}
