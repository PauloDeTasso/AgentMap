import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { CriterioAceitacao } from '../tipos';

export function criarCriterioRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const tarefaId = req.query.tarefaId as string | undefined;
    if (tarefaId) return responder(res, req.servicos!.criterio.listarPorTarefa(tarefaId));
    return responder(res, req.servicos!.criterio.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.criterio.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<CriterioAceitacao> = req.body;
    const result = await req.servicos!.criterio.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.criterio.excluir(req.params.id);
    return responder(res, result);
  }));

  return router;
}
