import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';

function getApiKey(): string | undefined {
  if (process.env.AGENTMAP_API_KEY) return process.env.AGENTMAP_API_KEY;
  const envFile = path.join(__dirname, '..', '..', '.env');
  try {
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
          const key = trimmed.slice(0, idx).trim();
          if (key === 'AGENTMAP_API_KEY') {
            return trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const isExempt = req.path === '/api/status' || req.path === '/api/health';
  if (isExempt) {
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string | undefined;
  const authHeader = req.headers['authorization'] as string | undefined;
  let token: string | undefined;

  if (apiKey) {
    token = apiKey;
  } else if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  const expectedToken = getApiKey();

  if (!expectedToken) {
    console.warn('[AUTH] AGENTMAP_API_KEY não configurado — permitindo acesso local');
    return next();
  }

  if (!token || token !== expectedToken) {
    return res.status(401).json({ sucesso: false, erro: 'Não autorizado', codigoErro: 'UNAUTHORIZED' });
  }

  next();
}
