import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { Reserva } from '../tipos';

export function criarReservaRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const agenteId = req.query.agenteId as string | undefined;
    if (agenteId) return responder(res, req.servicos!.reserva.listarPorAgente(agenteId));
    return responder(res, req.servicos!.reserva.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.reserva.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Reserva> = req.body;
    const result = await req.servicos!.reserva.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/:id/liberar', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.reserva.liberar(req.params.id);
    return responder(res, result);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Reserva> = req.body;
    const result = await req.servicos!.reserva.atualizar(req.params.id, dados);
    return responder(res, result);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.reserva.excluir(req.params.id);
    return responder(res, result);
  }));

  return router;
}
