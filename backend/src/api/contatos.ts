import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { ContatoService } from '../servicios/ContatoService';

export function criarContatoRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.contato.listar();
    return responder(res, result);
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.contato.obter(req.params.id);
    return responder(res, result);
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.contato.criar(req.body);
    return responder(res, result, 201);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.contato.atualizar(req.params.id, req.body);
    return responder(res, result);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.contato.excluir(req.params.id);
    return responder(res, result);
  }));

  router.delete('/', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, await req.servicos!.contato.excluirTodos());
  }));

  return router;
}
