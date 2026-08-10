import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { Handoff } from '../tipos';

export function criarHandoffRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const agenteId = req.query.agenteId as string | undefined;
    if (agenteId) return responder(res, req.servicos!.handoff.listarPorDestino(agenteId));
    return responder(res, req.servicos!.handoff.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.handoff.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Handoff> = req.body;
    const result = await req.servicos!.handoff.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Handoff> = req.body;
    const result = await req.servicos!.handoff.atualizar(req.params.id, dados);
    return responder(res, result);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.handoff.excluir(req.params.id);
    return responder(res, result);
  }));

  return router;
}
