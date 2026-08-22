import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { Artefato } from '../tipos';

export function criarArtefatoRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const tarefaId = req.query.tarefaId as string | undefined;
    if (tarefaId) {
      return responder(res, req.servicos!.artefato.listarPorTarefa(tarefaId));
    }
    return responder(res, req.servicos!.artefato.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.artefato.obter(req.params.id));
  }));

  router.get('/:id/versoes', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.artefato.listarVersoes(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Artefato> = req.body;
    const result = await req.servicos!.artefato.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.artefato.excluir(req.params.id);
    return responder(res, result);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.artefato.atualizar(req.params.id, req.body);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.delete('/', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.artefato.excluirTodos();
    return responder(res, result);
  }));

  return router;
}
