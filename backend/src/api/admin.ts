import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';

export function criarAdminRouter(): Router {
  const router = Router();

  router.get('/transicoes', asyncHandler(async (req: Request, res: Response) => {
    const stateMachine = (req as any).servicos?.stateMachine;
    if (!stateMachine) {
      return responder(res, { sucesso: false, erro: 'StateMachineService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    return responder(res, { sucesso: true, dados: stateMachine.listarTransicoes() });
  }));

  router.put('/transicoes/:origem', asyncHandler(async (req: Request, res: Response) => {
    const stateMachine = (req as any).servicos?.stateMachine;
    if (!stateMachine) {
      return responder(res, { sucesso: false, erro: 'StateMachineService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    const { origem } = req.params;
    const { destinos } = req.body;
    if (!destinos || !Array.isArray(destinos)) {
      return responder(res, { sucesso: false, erro: 'destinos deve ser um array', codigoErro: 'INVALID_BODY' }, 400);
    }
    const result = stateMachine.atualizarTransicao(origem as any, destinos);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.get('/transicoes/validar', asyncHandler(async (req: Request, res: Response) => {
    const stateMachine = (req as any).servicos?.stateMachine;
    if (!stateMachine) {
      return responder(res, { sucesso: false, erro: 'StateMachineService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    const { origem, destino } = req.query;
    if (!origem || !destino) {
      return responder(res, { sucesso: false, erro: 'origem e destino são obrigatórios', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = stateMachine.validarTransicao(origem as any, destino as any);
    return responder(res, result);
  }));

  return router;
}
