import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { Risco } from '../tipos';

export function criarRiscoRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.risco.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.risco.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Risco> = req.body;
    const result = await req.servicos!.risco.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Risco> = req.body;
    const result = await req.servicos!.risco.atualizar(req.params.id, dados);
    return responder(res, result);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.risco.excluir(req.params.id);
    return responder(res, result);
  }));

  router.delete('/', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.risco.excluirTodos();
    return responder(res, result);
  }));

  return router;
}
