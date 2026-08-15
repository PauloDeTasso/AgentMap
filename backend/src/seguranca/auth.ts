import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.join(require('../config').LOCAL_DIR, '.api-key');

function ensureAuthFile(): string {
  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(AUTH_FILE)) {
    const key = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(AUTH_FILE, key, { mode: 0o600, encoding: 'utf-8' });
    return key;
  }
  return fs.readFileSync(AUTH_FILE, 'utf-8').trim();
}

export const API_KEY = ensureAuthFile();

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'test') return next();
  const provided = req.headers['x-api-key'];
  if (!provided || provided !== API_KEY) {
    return res.status(401).json({ sucesso: false, erro: 'Não autorizado', codigoErro: 'UNAUTHORIZED' });
  }
  next();
}

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
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
    const originHost = new URL(origin).host;
    const refererHost = new URL(referer).host;
    if (originHost !== host || refererHost !== host) {
      return res.status(403).json({ sucesso: false, erro: 'CSRF: origem não confere', codigoErro: 'CSRF_INVALID' });
    }
  }
  next();
}
