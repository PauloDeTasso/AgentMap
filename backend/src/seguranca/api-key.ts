import { Request, Response, NextFunction } from 'express';
import { loadSettings } from '../config';

export interface ApiKeyOptions {
  headerName?: string;
  skipPaths?: string[];
  bypassForLocalhost?: boolean;
}

export function apiKeyMiddleware(options: ApiKeyOptions = {}) {
  const headerName = options.headerName ?? 'x-api-key';
  const skipPaths = options.skipPaths ?? ['/api/status', '/api/health'];
  const bypassForLocalhost = options.bypassForLocalhost ?? true;

  return (req: Request, res: Response, next: NextFunction) => {
    if (skipPaths.some((p) => req.path === p || req.path.startsWith(p))) {
      return next();
    }

    const settings = loadSettings();
    const expectedKey = settings.apiKey;

    if (!expectedKey) {
      return next();
    }

    const providedKey = req.headers[headerName.toLowerCase()] as string | undefined;

    if (!providedKey) {
      return res.status(401).json({
        sucesso: false,
        erro: 'API key não fornecida',
        codigoErro: 'MISSING_API_KEY'
      });
    }

    if (providedKey !== expectedKey) {
      return res.status(403).json({
        sucesso: false,
        erro: 'API key inválida',
        codigoErro: 'INVALID_API_KEY'
      });
    }

    next();
  };
}
