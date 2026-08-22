import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { Bloqueio } from '../tipos';

export function criarBloqueioRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.bloqueio.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.bloqueio.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Bloqueio> = req.body;
    const result = await req.servicos!.bloqueio.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/:id/resolver', asyncHandler(async (req: Request, res: Response) => {
    const { resolucao } = req.body;
    if (!resolucao) {
      return responder(res, { sucesso: false, erro: 'resolucao é obrigatório', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = await req.servicos!.bloqueio.resolver(req.params.id, resolucao);
    return responder(res, result);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.bloqueio.excluir(req.params.id);
    return responder(res, result);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.bloqueio.atualizar(req.params.id, req.body);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.delete('/', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.bloqueio.excluirTodos();
    return responder(res, result);
  }));

  return router;
}
