import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { Conflito } from '../tipos';

export function criarConflitoRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.conflito.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.conflito.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Conflito> = req.body;
    const result = await req.servicos!.conflito.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/:id/resolver', asyncHandler(async (req: Request, res: Response) => {
    const { resolucao } = req.body;
    if (!resolucao) {
      return responder(res, { sucesso: false, erro: 'resolucao é obrigatório', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = await req.servicos!.conflito.resolver(req.params.id, resolucao);
    return responder(res, result);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Conflito> = req.body;
    const result = await req.servicos!.conflito.atualizar(req.params.id, dados);
    return responder(res, result);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.conflito.excluir(req.params.id);
    return responder(res, result);
  }));

  return router;
}
