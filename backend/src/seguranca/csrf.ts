import { Request, Response, NextFunction } from 'express';

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'test') return next();
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const host = req.headers.host;
  if (!origin && !referer) {
    return res.status(403).json({ sucesso: false, erro: 'CSRF: origem inválida', codigoErro: 'CSRF_INVALID' });
  }
  if (origin && referer) {
    try {
      const originHost = new URL(origin).host;
      const refererHost = new URL(referer).host;
      if (originHost !== host || refererHost !== host) {
        return res.status(403).json({ sucesso: false, erro: 'CSRF: origem não confere', codigoErro: 'CSRF_INVALID' });
      }
    } catch {
      return res.status(403).json({ sucesso: false, erro: 'CSRF: origem inválida', codigoErro: 'CSRF_INVALID' });
    }
  }
  next();
}
