import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { Sessao } from '../tipos';

export function criarSessaoRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const agenteId = req.query.agenteId as string | undefined;
    if (agenteId) {
      const all = req.servicos!.sessao.listar();
      if (all.sucesso && all.dados) {
        return responder(res, { sucesso: true, dados: all.dados.filter((s) => s.agenteId === agenteId && !s.datas.fim) });
      }
      return responder(res, all);
    }
    return responder(res, req.servicos!.sessao.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.sessao.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Sessao> = req.body;
    const result = await req.servicos!.sessao.iniciar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/:id/finalizar', asyncHandler(async (req: Request, res: Response) => {
    const dados = req.body;
    const result = await req.servicos!.sessao.finalizar(req.params.id, dados);
    return responder(res, result);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.sessao.excluir(req.params.id);
    return responder(res, result);
  }));

  return router;
}
