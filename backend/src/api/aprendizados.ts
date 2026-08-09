import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { Aprendizado } from '../tipos';

export function criarAprendizadoRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.aprendizado.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.aprendizado.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Aprendizado> = req.body;
    const result = await req.servicos!.aprendizado.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.aprendizado.excluir(req.params.id);
    return responder(res, result);
  }));

  return router;
}
