import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import { setupRotas } from './api';
import { ProjetoService } from './servicios/ProjetoService';
import { SchemaValidator } from './validacao/SchemaValidator';
import { loadSettings } from './config';

export function createApp(): Application {
  const app: Application = express();
  const settings = loadSettings();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  const esquemasPath = path.resolve(__dirname, '..', '..', 'esquemas');
  const validator = new SchemaValidator(esquemasPath);
  const projetoService = new ProjetoService(validator);

  app.use('/', setupRotas(projetoService));

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

  app.use('/esquemas', express.static(esquemasPath));

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('=== ERRO INTERNO ===');
    console.error('  Metodo:', req.method);
    console.error('  URL:', req.url);
    console.error('  Body:', JSON.stringify(req.body).substring(0, 500));
    console.error('  Erro:', err?.message || err);
    console.error('  Stack:', err?.stack || 'sem stack');
    console.error('  Codigo:', err?.codigoErro || 'N/A');
    console.error('====================');
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor', codigoErro: 'INTERNAL_ERROR' });
  });

  return app;
}
