import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';

export function criarContratosValidacaoRouter(): Router {
  const router = Router();

  router.get('/validar/:contratoId', asyncHandler(async (req: Request, res: Response) => {
    const validator = (req as any).servicos?.contractValidator;
    if (!validator) {
      return responder(res, { sucesso: false, erro: 'ContractValidatorService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    const { contratoId } = req.params;
    const result = validator.validarContrato(contratoId);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.get('/validar', asyncHandler(async (req: Request, res: Response) => {
    const validator = (req as any).servicos?.contractValidator;
    if (!validator) {
      return responder(res, { sucesso: false, erro: 'ContractValidatorService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    const result = validator.validarTodosContratos();
    return responder(res, result, result.sucesso ? 200 : 500);
  }));

  return router;
}
