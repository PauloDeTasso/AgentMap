import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { AgenteService } from '../servicios';
import { AgentePerfil, Permissoes } from '../tipos';

export function criarAgenteRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const result = req.servicos!.agente.listar();
    console.log('[GET /api/agentes] listar resultado:', JSON.stringify({ sucesso: result.sucesso, count: result.dados?.length }));
    return responder(res, result);
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.agente.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const perfil: Omit<AgentePerfil, 'datas'> & { permissoes: Permissoes } = req.body;
    const result = await req.servicos!.agente.criar(perfil);
    return responder(res, result, 201);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.agente.atualizar(req.params.id, req.body));
  }));

  router.get('/:id/dominio/:caminho(*)', asyncHandler(async (req: Request, res: Response) => {
    const caminho = req.params.caminho;
    return responder(res, req.servicos!.agente.validarDominioArquivo(req.params.id, caminho));
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.agente.excluir(req.params.id));
  }));

  return router;
}
