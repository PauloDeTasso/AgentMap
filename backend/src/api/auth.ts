import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { API_KEY } from '../seguranca/auth';

export function criarAuthRouter(): Router {
  const router = Router();

  router.get('/key', asyncHandler(async (_req: Request, res: Response) => {
    return responder(res, { sucesso: true, dados: { apiKey: API_KEY } });
  }));

  return router;
}
