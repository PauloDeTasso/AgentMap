import http from 'http';
import express, { Application, Request, Response, NextFunction } from 'express';
import { createRateLimit, RateLimitOptions } from '../src/seguranca/rate-limit';

function createTestApp(rateLimiter: ReturnType<typeof createRateLimit>): Application {
  const app = express();
  app.use(rateLimiter);
  app.use(express.json());

  app.get('/api/test', (_req: Request, res: Response) => {
    res.json({ sucesso: true, dados: 'ok' });
  });

  app.post('/api/test', (req: Request, res: Response) => {
    res.json({ sucesso: true, dados: req.body });
  });

  return app;
}

function httpRequest(app: Application, path: string, method = 'GET', headers: Record<string, string> = {}): Promise<{ status: number; headers: Record<string, string>; body: any }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address() as any;
      const options: any = { port: addr.port, method, path };
      if (Object.keys(headers).length > 0) options.headers = headers;
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
          let parsed: any;
          try { parsed = JSON.parse(data); } catch { parsed = data; }
          resolve({ status: res.statusCode!, headers, body: parsed });
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

describe('Segurança — Rate Limiting', () => {
  const defaultOptions: RateLimitOptions = {
    windowMs: 60000,
    maxRequests: 3
  };

  describe('Bloqueio por excesso de requisições', () => {
    test('bloqueia após exceder limite', async () => {
      const app = createTestApp(createRateLimit(defaultOptions));
      const path = '/api/test';

      const responses = [];
      for (let i = 0; i < 5; i++) {
        const res = await httpRequest(app, path);
        responses.push(res);
      }

      const allowed = responses.filter((r) => r.status === 200);
      const blocked = responses.filter((r) => r.status === 429);

      expect(allowed.length).toBeLessThanOrEqual(defaultOptions.maxRequests!);
      expect(blocked.length).toBeGreaterThan(0);
    });

    test('retorna JSON com código RATE_LIMIT_EXCEEDED', async () => {
      const app = createTestApp(createRateLimit(defaultOptions));

      for (let i = 0; i < 5; i++) {
        await httpRequest(app, '/api/test');
      }

      const blocked = await httpRequest(app, '/api/test');
      expect(blocked.status).toBe(429);
      expect(blocked.body.sucesso).toBe(false);
      expect(blocked.body.codigoErro).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Headers de rate limit', () => {
    test('define X-RateLimit-Limit', async () => {
      const app = createTestApp(createRateLimit(defaultOptions));
      const res = await httpRequest(app, '/api/test');
      expect(res.headers['x-ratelimit-limit']).toBe('3');
    });

    test('define X-RateLimit-Remaining', async () => {
      const app = createTestApp(createRateLimit(defaultOptions));
      const res = await httpRequest(app, '/api/test');
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      const remaining = parseInt(res.headers['x-ratelimit-remaining']);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(3);
    });

    test('X-RateLimit-Remaining diminui a cada requisição', async () => {
      const app = createTestApp(createRateLimit(defaultOptions));

      const res1 = await httpRequest(app, '/api/test');
      const res2 = await httpRequest(app, '/api/test');

      const rem1 = parseInt(res1.headers['x-ratelimit-remaining']);
      const rem2 = parseInt(res2.headers['x-ratelimit-remaining']);

      expect(rem1).toBeGreaterThan(rem2);
    });
  });

  describe('Janela de tempo', () => {
    test('limite é redefinido após janela', async () => {
      const app = createTestApp(createRateLimit({ windowMs: 500, maxRequests: 2 }));

      await httpRequest(app, '/api/test');
      await httpRequest(app, '/api/test');
      const blocked = await httpRequest(app, '/api/test');
      expect(blocked.status).toBe(429);

      await new Promise((resolve) => setTimeout(resolve, 600));

      const allowed = await httpRequest(app, '/api/test');
      expect(allowed.status).toBe(200);
    });
  });

  describe('Key generator', () => {
    test('limita por IP por padrão', async () => {
      const app = createTestApp(createRateLimit(defaultOptions));

      const responses = [];
      for (let i = 0; i < 5; i++) {
        responses.push(await httpRequest(app, '/api/test'));
      }

      const allowed = responses.filter((r) => r.status === 200);
      expect(allowed.length).toBeLessThanOrEqual(defaultOptions.maxRequests!);
    });

    test('permite key generator customizado', async () => {
      const app = createTestApp(createRateLimit({
        ...defaultOptions,
        keyGenerator: (req: Request) => (req.headers['x-tenant-id'] as string) || 'default'
      }));

      const headers = { 'x-tenant-id': 'tenant-a' };
      const responses: { status: number }[] = [];
      for (let i = 0; i < 5; i++) {
        const res = await httpRequest(app, '/api/test', 'GET', headers);
        responses.push({ status: res.status });
      }

      const allowed = responses.filter((r) => r.status === 200);
      expect(allowed.length).toBeLessThanOrEqual(defaultOptions.maxRequests!);
    });
  });

  describe('Edge cases', () => {
    test('maxRequests=1 bloqueia segunda requisição', async () => {
      const app = createTestApp(createRateLimit({ windowMs: 60000, maxRequests: 1 }));

      const res1 = await httpRequest(app, '/api/test');
      const res2 = await httpRequest(app, '/api/test');

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(429);
    });

    test('maxRequests alto permite muitas requisições', async () => {
      const app = createTestApp(createRateLimit({ windowMs: 60000, maxRequests: 100 }));

      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(httpRequest(app, '/api/test'));
      }
      const responses = await Promise.all(promises);
      const allowed = responses.filter((r) => r.status === 200);
      expect(allowed.length).toBe(50);
    });
  });
});
