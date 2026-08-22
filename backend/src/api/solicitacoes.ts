import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { SolicitacaoAlteracao } from '../tipos';

export function criarSolicitacaoRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.solicitacao.listar());
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.solicitacao.obter(req.params.id));
  }));

  router.get('/:id/historico', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.solicitacao.listarHistorico(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<SolicitacaoAlteracao> = req.body;
    const result = await req.servicos!.solicitacao.criar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<SolicitacaoAlteracao> = req.body;
    const result = await req.servicos!.solicitacao.atualizar(req.params.id, dados);
    return responder(res, result);
  }));

  router.put('/:id/aprovar', asyncHandler(async (req: Request, res: Response) => {
    const { agenteId, observacao } = req.body;
    if (!agenteId) {
      return responder(res, { sucesso: false, erro: 'agenteId é obrigatório', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = await req.servicos!.solicitacao.aprovar(req.params.id, agenteId, observacao);
    return responder(res, result);
  }));

  router.put('/:id/rejeitar', asyncHandler(async (req: Request, res: Response) => {
    const { agenteId, motivo } = req.body;
    if (!agenteId || !motivo) {
      return responder(res, { sucesso: false, erro: 'agenteId e motivo são obrigatórios', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = await req.servicos!.solicitacao.rejeitar(req.params.id, agenteId, motivo);
    return responder(res, result);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.solicitacao.excluir(req.params.id);
    return responder(res, result);
  }));

  router.delete('/', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, await req.servicos!.solicitacao.excluirTodos());
  }));

  return router;
}
