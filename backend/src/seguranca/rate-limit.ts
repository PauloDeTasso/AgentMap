import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const DEFAULT_WINDOW_MS = 60000;
const DEFAULT_MAX_REQUESTS = 100;

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}

export function createRateLimit(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const keyGenerator = options.keyGenerator ?? ((req: Request) => req.ip || 'unknown');
  const skipSuccessfulRequests = options.skipSuccessfulRequests ?? false;

  const store: RateLimitStore = {};

  function cleanup() {
    const now = Date.now();
    for (const key of Object.keys(store)) {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    }
  }

  setInterval(cleanup, windowMs);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = { count: 1, resetTime: now + windowMs };
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(maxRequests - 1));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));
      return next();
    }

    store[key].count += 1;
    const remaining = maxRequests - store[key].count;
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil((store[key].resetTime) / 1000)));

    if (store[key].count > maxRequests) {
      return res.status(429).json({
        sucesso: false,
        erro: 'Muitas requisições. Tente novamente mais tarde.',
        codigoErro: 'RATE_LIMIT_EXCEEDED'
      });
    }

    next();
  };
}
