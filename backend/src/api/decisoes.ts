import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { Decisao } from '../tipos';

export function criarDecisaoRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.decisao.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.decisao.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Decisao> = req.body;
    const result = await req.servicos!.decisao.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Decisao> = req.body;
    const result = await req.servicos!.decisao.atualizar(req.params.id, dados);
    return responder(res, result);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.decisao.excluir(req.params.id);
    return responder(res, result);
  }));

  return router;
}
