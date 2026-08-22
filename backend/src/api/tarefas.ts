import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { EstadoTarefa } from '../tipos';
import { v4 as uuid } from 'uuid';

export function criarTarefaRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.tarefa.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.tarefa.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, await req.servicos!.tarefa.criar(req.body), 201);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.tarefa.atualizar(req.params.id, req.body));
  }));

  router.post('/:id/estado', asyncHandler(async (req: Request, res: Response) => {
    const { estado } = req.body;
    if (!estado) {
      return responder(res, { sucesso: false, erro: 'estado é obrigatório', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    return responder(res, req.servicos!.tarefa.alterarEstado(req.params.id, estado as EstadoTarefa));
  }));

  router.get('/:id/contexto', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, await req.servicos!.tarefa.montarContexto(req.params.id));
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, await req.servicos!.tarefa.excluir(req.params.id));
  }));

  router.delete('/', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, await req.servicos!.tarefa.excluirTodos());
  }));

  return router;
}
