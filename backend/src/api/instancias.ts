import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { Instancia } from '../tipos';

export function criarInstanciaRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const agenteId = req.query.agenteId as string | undefined;
    const projetoId = req.query.projetoId as string | undefined;
    const status = req.query.status as string | undefined;
    const result = req.servicos!.instancia.listar({ agenteId, projetoId, status });
    return responder(res, result);
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.instancia.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Instancia> = req.body;
    const result = await req.servicos!.instancia.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Instancia> = req.body;
    const result = await req.servicos!.instancia.atualizar(req.params.id, dados);
    return responder(res, result);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.instancia.excluir(req.params.id);
    return responder(res, result);
  }));

  return router;
}
