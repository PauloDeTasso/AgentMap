import { Router, Request, Response } from 'express';
import { API_KEY } from '../seguranca/auth';

export function criarAuthRouter(): Router {
  const router = Router();

  router.post('/verify', (req: Request, res: Response) => {
    const provided = req.body?.apiKey || req.headers['x-api-key'];
    if (!provided || provided !== API_KEY) {
      return res.status(401).json({ sucesso: false, erro: 'Não autorizado', codigoErro: 'UNAUTHORIZED' });
    }
    return res.status(200).json({ sucesso: true, dados: { valido: true } });
  });

  router.get('/key', (req: Request, res: Response) => {
    return res.status(200).json({ sucesso: true, dados: { apiKey: API_KEY } });
  });

  router.post('/login', (req: Request, res: Response) => {
    const provided = req.body?.apiKey || req.headers['x-api-key'];
    if (!provided || provided !== API_KEY) {
      return res.status(401).json({ sucesso: false, erro: 'Não autorizado', codigoErro: 'UNAUTHORIZED' });
    }
    return res.status(200).json({ sucesso: true, dados: { mensagem: 'Autenticado com sucesso', apiKey: API_KEY } });
  });

  router.post('/logout', (req: Request, res: Response) => {
    return res.status(200).json({ sucesso: true, dados: { mensagem: 'Logout realizado (stateless)' } });
  });

  return router;
}
