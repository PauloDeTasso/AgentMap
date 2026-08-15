import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';

export function criarOrquestradorRouter(): Router {
  const router = Router();

  router.post('/dispatch', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, { sucesso: false, erro: 'Endpoint depreciado: dispatch via CLI Kilo não está disponível. Use Agent Manager worktrees.', codigoErro: 'NOT_IMPLEMENTED' }, 501);
  }));

  router.get('/status', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.orquestrador.status();
    return responder(res, result);
  }));

  router.post('/handoffs/auto', asyncHandler(async (req: Request, res: Response) => {
    const { tarefaId, agenteId } = req.body;
    if (!tarefaId) {
      return responder(res, { sucesso: false, erro: 'tarefaId é obrigatório', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = await req.servicos!.orquestrador.handoffAutomatico(tarefaId, agenteId || '');
    return responder(res, result);
  }));

  router.put('/instancias/:id/modo', asyncHandler(async (req: Request, res: Response) => {
    const { modo } = req.body;
    if (!modo) {
      return responder(res, { sucesso: false, erro: 'modo é obrigatório', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = await req.servicos!.orquestrador.alterarModoAutonomia(req.params.id, modo);
    return responder(res, result);
  }));

  router.post('/recuperar', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, { sucesso: false, erro: 'Endpoint depreciado: recuperação via CLI Kilo não está disponível. Use Agent Manager worktrees.', codigoErro: 'NOT_IMPLEMENTED' }, 501);
  }));

  return router;
}
