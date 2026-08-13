import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';

export function criarEventoRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const destino = req.query.destino as string | undefined;
    const estado = req.query.estado as string | undefined;
    const filtros: { destino?: string; estado?: string } = {};
    if (destino) filtros.destino = destino;
    if (estado) filtros.estado = estado;
    return responder(res, req.servicos!.evento.listar(Object.keys(filtros).length > 0 ? filtros : undefined));
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.evento.obter(req.params.id));
  }));

  router.put('/:id/consumir', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.evento.marcarConsumido(req.params.id));
  }));

  return router;
}