import http from 'http';
import express, { Application, Request, Response, NextFunction } from 'express';
import { CorsService, corsService } from '../src/servicios/CorsService';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

function createTestApp(cors: CorsService): Application {
  const app = express();
  app.use(cors.getMiddleware());
  app.use(express.json());

  app.get('/api/test', (_req: Request, res: Response) => {
    res.json({ sucesso: true, dados: 'ok' });
  });

  app.options('/api/test', (_req: Request, res: Response) => {
    res.sendStatus(204);
  });

  app.post('/api/test', (req: Request, res: Response) => {
    res.json({ sucesso: true, dados: req.body });
  });

  return app;
}

function httpRequest(app: Application, path: string, method = 'GET', origin?: string): Promise<{ status: number; headers: Record<string, string>; body: any }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address() as any;
      const options: any = { port: addr.port, method, path };
      if (origin) options.headers = { origin };

      const req = http.request(options, (res) => {
        const headers: Record<string, string> = {};
        const rawHeaders = res.headers as Record<string, string | string[]>;
        for (const [key, value] of Object.entries(rawHeaders)) {
          headers[key] = Array.isArray(value) ? value[value.length - 1] : value;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          server.close();
          let body: any;
          try { body = JSON.parse(data); } catch { body = data; }
          resolve({ status: res.statusCode!, headers, body });
        });
      });
      req.on('error', (err) => {
        server.close();
        reject(err);
      });
      req.end();
    });
  });
}

describe('Segurança — CORS', () => {
  describe('Origins permitidas', () => {
    test('localhost:3150 recebe headers CORS', async () => {
      const cors = new CorsService();
      const app = createTestApp(cors);
      const res = await httpRequest(app, '/api/test', 'GET', 'http://localhost:3150');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3150');
      expect(res.headers['access-control-allow-methods']).toBeDefined();
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    test('127.0.0.1:3150 recebe headers CORS', async () => {
      const cors = new CorsService();
      const app = createTestApp(cors);
      const res = await httpRequest(app, '/api/test', 'GET', 'http://127.0.0.1:3150');
      expect(res.headers['access-control-allow-origin']).toBe('http://127.0.0.1:3150');
    });
  });

  describe('Origens bloqueadas', () => {
    test('origin malicioso não recebe headers CORS', async () => {
      const cors = new CorsService();
      const app = createTestApp(cors);
      const res = await httpRequest(app, '/api/test', 'GET', 'http://evil.com');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
      expect(res.headers['access-control-allow-methods']).toBeUndefined();
    });

    test('origin com HTTPS é bloqueada por padrão', async () => {
      const cors = new CorsService();
      const app = createTestApp(cors);
      const res = await httpRequest(app, '/api/test', 'GET', 'https://evil.com');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('null origin é bloqueada', async () => {
      const cors = new CorsService();
      const app = createTestApp(cors);
      const res = await httpRequest(app, '/api/test', 'GET', 'null');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Métodos HTTP', () => {
    test('OPTIONS retorna 204', async () => {
      const cors = new CorsService();
      const app = createTestApp(cors);
      const res = await httpRequest(app, '/api/test', 'OPTIONS', 'http://localhost:3150');
      expect(res.status).toBe(204);
    });

    test('POST de origin permitida funciona', async () => {
      const cors = new CorsService();
      const app = createTestApp(cors);
      const res = await httpRequest(app, '/api/test', 'POST', 'http://localhost:3150');
      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
    });

    test('POST de origin bloqueada retorna sem CORS headers', async () => {
      const cors = new CorsService();
      const app = createTestApp(cors);
      const res = await httpRequest(app, '/api/test', 'POST', 'http://evil.com');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Atualização de configuração', () => {
    test('updateConfig rejeita origins HTTP inválidas', () => {
      const cors = new CorsService();
      cors.updateConfig({
        origins: ['http://evil.com', 'ftp://invalid.com', 'https://trusted.com']
      });
      const config = cors.getConfig();
      expect(config.origins).toContain('https://trusted.com');
      expect(config.origins).not.toContain('http://evil.com');
      expect(config.origins).not.toContain('ftp://invalid.com');
    });

    test('updateConfig mantém localhost:3150', () => {
      const cors = new CorsService();
      cors.updateConfig({
        origins: ['https://app.com']
      });
      const config = cors.getConfig();
      expect(config.origins).toContain('http://localhost:3150');
      expect(config.origins).toContain('https://app.com');
    });

    test('updateConfig rejeita valores não-string', () => {
      const cors = new CorsService();
      cors.updateConfig({
        origins: ['https://ok.com', null as any, undefined as any, 123 as any]
      });
      const config = cors.getConfig();
      expect(config.origins).toEqual(expect.arrayContaining(['https://ok.com', 'http://localhost:3150']));
    });
  });

  describe('Headers CORS', () => {
    test('Access-Control-Allow-Headers inclui headers padrão', async () => {
      const cors = new CorsService();
      const app = createTestApp(cors);
      const res = await httpRequest(app, '/api/test', 'GET', 'http://localhost:3150');
      const allowedHeaders = res.headers['access-control-allow-headers'];
      expect(allowedHeaders).toContain('Content-Type');
      expect(allowedHeaders).toContain('Authorization');
      expect(allowedHeaders).toContain('x-api-key');
    });

    test('Access-Control-Allow-Methods inclui métodos padrão', async () => {
      const cors = new CorsService();
      const app = createTestApp(cors);
      const res = await httpRequest(app, '/api/test', 'GET', 'http://localhost:3150');
      const methods = res.headers['access-control-allow-methods'];
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('OPTIONS');
    });
  });

  describe('Configuração padrão', () => {
    test('CorsService singleton tem configuração padrão segura', () => {
      const config = corsService.getConfig();
      expect(config.origins).toContain('http://localhost:3150');
      expect(config.methods).toContain('GET');
      expect(config.credentials).toBe(true);
    });
  });
});
