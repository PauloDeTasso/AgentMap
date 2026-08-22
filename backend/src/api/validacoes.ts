import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { Validacao } from '../tipos';

export function criarValidacaoRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.validacao.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.validacao.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Validacao> = req.body;
    const result = await req.servicos!.validacao.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/:id/aprovar', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.validacao.aprovar(req.params.id);
    return responder(res, result);
  }));

  router.put('/:id/rejeitar', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.validacao.rejeitar(req.params.id);
    return responder(res, result);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Validacao> = req.body;
    const result = await req.servicos!.validacao.atualizar(req.params.id, dados);
    return responder(res, result);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.validacao.excluir(req.params.id);
    return responder(res, result);
  }));

  router.delete('/', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, await req.servicos!.validacao.excluirTodos());
  }));

  return router;
}
