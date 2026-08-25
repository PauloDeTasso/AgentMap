import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { RegraIntegridade } from '../tipos';

export function criarIntegridadeRouter(): Router {
  const router = Router();

  router.get('/regras', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.integridade.listarRegras());
  }));

  router.get('/regras/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.integridade.obterRegra(req.params.id));
  }));

  router.post('/regras', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<RegraIntegridade> = req.body;
    const result = await req.servicos!.integridade.criarRegra(dados, req.servicos!.projeto.id);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/regras/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.integridade.atualizarRegra(req.params.id, req.body, req.servicos!.projeto.id);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.delete('/regras/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.integridade.excluirRegra(req.params.id);
    return responder(res, result, result.sucesso ? 200 : 404);
  }));

  router.delete('/regras', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.integridade.excluirTodasRegras();
    return responder(res, result);
  }));

  router.post('/verificar', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.integridade.verificar(req.servicos!.projeto.id);
    return responder(res, result);
  }));

  return router;
}
