import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { ResultadoEntity } from '../tipos';

export function criarResultadoRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const tarefaId = req.query.tarefaId as string | undefined;
    if (tarefaId) return responder(res, req.servicos!.resultado.listarPorTarefa(tarefaId));
    return responder(res, req.servicos!.resultado.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.resultado.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<ResultadoEntity> = req.body;
    const result = await req.servicos!.resultado.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<ResultadoEntity> = req.body;
    const result = await req.servicos!.resultado.atualizar(req.params.id, dados);
    return responder(res, result);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.resultado.excluir(req.params.id);
    return responder(res, result);
  }));

  return router;
}
