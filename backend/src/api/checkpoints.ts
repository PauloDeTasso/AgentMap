import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { Checkpoint } from '../tipos';

export function criarCheckpointRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const tarefaId = req.query.tarefaId as string | undefined;
    if (tarefaId) return responder(res, req.servicos!.checkpoint.listarPorTarefa(tarefaId));
    return responder(res, req.servicos!.checkpoint.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.checkpoint.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Checkpoint> = req.body;
    const result = await req.servicos!.checkpoint.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.checkpoint.excluir(req.params.id);
    return responder(res, result);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.checkpoint.atualizar(req.params.id, req.body);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.delete('/', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.checkpoint.excluirTodos();
    return responder(res, result);
  }));

  return router;
}
