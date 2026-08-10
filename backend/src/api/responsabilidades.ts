import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { Responsabilidade } from '../tipos';

export function criarResponsabilidadeRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const agenteId = req.query.agenteId as string | undefined;
    if (agenteId) return responder(res, req.servicos!.responsabilidade.listarPorAgente(agenteId));
    const alvoId = req.query.alvoId as string | undefined;
    if (alvoId) return responder(res, req.servicos!.responsabilidade.listarPorAlvo(alvoId));
    return responder(res, req.servicos!.responsabilidade.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.responsabilidade.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Responsabilidade> = req.body;
    const result = await req.servicos!.responsabilidade.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.responsabilidade.excluir(req.params.id);
    return responder(res, result);
  }));

  return router;
}
