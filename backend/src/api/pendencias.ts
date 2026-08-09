import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { Pendencia } from '../tipos';

export function criarPendenciaRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const tarefaId = req.query.tarefaId as string | undefined;
    if (tarefaId) {
      return responder(res, req.servicos!.pendencia.listarPorTarefa(tarefaId));
    }
    return responder(res, req.servicos!.pendencia.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.pendencia.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Pendencia> = req.body;
    const result = await req.servicos!.pendencia.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/:id/resolver', asyncHandler(async (req: Request, res: Response) => {
    const { resolucao } = req.body;
    if (!resolucao) {
      return responder(res, { sucesso: false, erro: 'resolucao é obrigatório', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = await req.servicos!.pendencia.resolver(req.params.id, resolucao);
    return responder(res, result);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Pendencia> = req.body;
    const result = await req.servicos!.pendencia.atualizar(req.params.id, dados);
    return responder(res, result);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.pendencia.excluir(req.params.id);
    return responder(res, result);
  }));

  return router;
}
