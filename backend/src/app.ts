import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import { setupRotas } from './api';
import { ProjetoService } from './servicios/ProjetoService';
import { SchemaValidator } from './validacao/SchemaValidator';
import { loadSettings } from './config';
import { corsService } from './servicios/CorsService';
import { authMiddleware, API_KEY } from './seguranca/auth';
import { csrfMiddleware } from './seguranca/csrf';

const PUBLIC_PATHS = new Set([
  '/api/status',
  '/api/projetos/settings',
]);

function shouldSkipAuth(req: express.Request): boolean {
  if (req.method === 'GET' && PUBLIC_PATHS.has(req.path)) return true;
  if (req.path === '/api/projetos' && req.method === 'GET') return true;
  if (req.path === '/api/projetos/scan' && req.method === 'GET') return true;
  if (req.path === '/api/projetos/atual' && req.method === 'GET') return true;
  return false;
}

function securityHeaders(req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  next();
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 120;

function rateLimitMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return next();
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({ sucesso: false, erro: 'Muitas requisições', codigoErro: 'RATE_LIMIT' });
  }
  next();
}

export function createApp(): Application {
  const app: Application = express();
  const settings = loadSettings();

  app.use(securityHeaders);
  app.use(corsService.getMiddleware());
  app.use(rateLimitMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const log = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        status: res.statusCode,
        durationMs: duration,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
      };
      if (res.statusCode >= 500) {
        console.error('[LOG]', JSON.stringify(log));
      } else if (res.statusCode >= 400) {
        console.warn('[LOG]', JSON.stringify(log));
      } else {
        console.log('[LOG]', JSON.stringify(log));
      }
    });
    next();
  });

  const esquemasPath = path.resolve(__dirname, '..', '..', 'esquemas');
  const validator = new SchemaValidator(esquemasPath);
  const projetoService = new ProjetoService(validator);

  const frontendPath = path.resolve(__dirname, '..', '..', 'frontend');
  app.use(express.static(frontendPath, {
    maxAge: 0,
    etag: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));

  app.use((req, res, next) => {
    if (shouldSkipAuth(req)) return next();
    return authMiddleware(req, res, next);
  });

  app.use((req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    return csrfMiddleware(req, res, next);
  });

  app.use('/', setupRotas(projetoService));

  app.use('/esquemas', express.static(esquemasPath));

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('=== ERRO INTERNO ===');
    console.error('  Metodo:', req.method);
    console.error('  URL:', req.url);
    console.error('  Erro:', err?.message || err);
    console.error('  Codigo:', err?.codigoErro || 'N/A');
    console.error('====================');
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor', codigoErro: 'INTERNAL_ERROR' });
  });

  return app;
}
