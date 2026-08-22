import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { Dependencia } from '../tipos';

export function criarDependenciaRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const fonteId = req.query.fonteId as string | undefined;
    if (fonteId) return responder(res, req.servicos!.dependencia.listarPorFonte(fonteId));
    const destinoId = req.query.destinoId as string | undefined;
    if (destinoId) return responder(res, req.servicos!.dependencia.listarPorDestino(destinoId));
    return responder(res, req.servicos!.dependencia.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.dependencia.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Dependencia> = req.body;
    const result = await req.servicos!.dependencia.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.dependencia.excluir(req.params.id);
    return responder(res, result);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.dependencia.atualizar(req.params.id, req.body);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.delete('/', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.dependencia.excluirTodos();
    return responder(res, result);
  }));

  return router;
}
