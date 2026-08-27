import { Router, Request, Response } from 'express';
import * as path from 'path';
import { asyncHandler, responder } from './middleware';

export function criarEventoRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const destino = req.query.destino as string | undefined;
    const estado = req.query.estado as string | undefined;
    const filtros: { destino?: string; estado?: string } = {};
    if (destino) filtros.destino = destino;
    if (estado) filtros.estado = estado;
    return responder(res, req.servicos!.evento.listar(Object.keys(filtros).length > 0 ? filtros : undefined));
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.evento.obter(req.params.id));
  }));

  router.put('/:id/consumir', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.evento.marcarConsumido(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados = req.body;
    if (!dados || !dados.tipo || !dados.origem || !dados.mensagem) {
      return responder(res, { sucesso: false, erro: 'tipo, origem e mensagem são obrigatórios', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = req.servicos!.evento.registrar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.post('/custom', asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body || {};
    if (!payload.tipo || !payload.origem || !payload.mensagem) {
      return responder(res, { sucesso: false, erro: 'tipo, origem e mensagem são obrigatórios', codigoErro: 'MISSING_FIELDS' }, 400);
    }

    const result = req.servicos!.evento.registrar({
      tipo: payload.tipo,
      origem: payload.origem,
      destino: payload.destino || '',
      referenciaTipo: payload.referenciaTipo || '',
      referenciaId: payload.referenciaId || '',
      mensagem: payload.mensagem,
      estado: payload.estado || 'PENDENTE',
      ...payload
    });

    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  return router;
}