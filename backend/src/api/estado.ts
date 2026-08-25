import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';

export function criarEstadoRouter(): Router {
  const router = Router();

  router.get('/notas', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.estado.listar());
  }));

  router.get('/notas/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.estado.obter(req.params.id));
  }));

  router.post('/notas', asyncHandler(async (req: Request, res: Response) => {
    const result = req.servicos!.estado.criar(req.body);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/notas/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = req.servicos!.estado.atualizar(req.params.id, req.body);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.delete('/notas/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = req.servicos!.estado.excluir(req.params.id);
    return responder(res, result);
  }));

  router.delete('/notas', asyncHandler(async (req: Request, res: Response) => {
    const result = req.servicos!.estado.excluirTodas();
    return responder(res, result);
  }));

  return router;
}
