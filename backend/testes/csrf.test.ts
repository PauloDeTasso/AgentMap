import { Request, Response, NextFunction } from 'express';
import { csrfMiddleware } from '../src/seguranca/csrf';

function createMockReq(headers: Record<string, string> = {}, method = 'GET'): Partial<Request> {
  return { headers, method } as Partial<Request>;
}

function createMockRes(): Partial<Response> {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return res;
}

function createMockNext(): jest.MockedFunction<NextFunction> {
  return jest.fn();
}

describe('Segurança — CSRF', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  describe('Middleware básico', () => {
    test('GET, HEAD, OPTIONS são permitidos sem verificação', () => {
      const methods = ['GET', 'HEAD', 'OPTIONS'];
      for (const method of methods) {
        const req = createMockReq({ host: 'localhost:3150' }, method);
        const res = createMockRes();
        const next = createMockNext();

        csrfMiddleware(req as Request, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      }
    });

    test('POST de mesma origin é permitido', () => {
      const req = createMockReq({ origin: 'http://localhost:3150', host: 'localhost:3150' }, 'POST');
      const res = createMockRes();
      const next = createMockNext();

      process.env.NODE_ENV = 'development';
      csrfMiddleware(req as Request, res as Response, next);
      process.env.NODE_ENV = 'test';

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('POST de origin diferente é bloqueado', () => {
      const req = createMockReq({ origin: 'http://evil.com', host: 'localhost:3150' }, 'POST');
      const res = createMockRes();
      const next = createMockNext();

      process.env.NODE_ENV = 'development';
      csrfMiddleware(req as Request, res as Response, next);
      process.env.NODE_ENV = 'test';

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        sucesso: false,
        erro: 'CSRF: origem não confere',
        codigoErro: 'CSRF_INVALID'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('PUT de origin diferente é bloqueado', () => {
      const req = createMockReq({ origin: 'http://evil.com', host: 'localhost:3150' }, 'PUT');
      const res = createMockRes();
      const next = createMockNext();

      process.env.NODE_ENV = 'development';
      csrfMiddleware(req as Request, res as Response, next);
      process.env.NODE_ENV = 'test';

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('DELETE de origin diferente é bloqueado', () => {
      const req = createMockReq({ origin: 'http://evil.com', host: 'localhost:3150' }, 'DELETE');
      const res = createMockRes();
      const next = createMockNext();

      process.env.NODE_ENV = 'development';
      csrfMiddleware(req as Request, res as Response, next);
      process.env.NODE_ENV = 'test';

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Validação de origin/referer', () => {
    test('aceita origin com mesma porta e host', () => {
      const req = createMockReq({ origin: 'http://localhost:3150', host: 'localhost:3150' });
      const res = createMockRes();
      const next = createMockNext();

      process.env.NODE_ENV = 'development';
      csrfMiddleware(req as Request, res as Response, next);
      process.env.NODE_ENV = 'test';

      expect(next).toHaveBeenCalled();
    });

    test('aceita referer válido quando origin está ausente', () => {
      const req = createMockReq({ referer: 'http://localhost:3150/docs', host: 'localhost:3150' });
      const res = createMockRes();
      const next = createMockNext();

      process.env.NODE_ENV = 'development';
      csrfMiddleware(req as Request, res as Response, next);
      process.env.NODE_ENV = 'test';

      expect(next).toHaveBeenCalled();
    });

    test('bloqueia referer malicioso quando origin está ausente', () => {
      const req = createMockReq({ referer: 'http://evil.com/phishing', host: 'localhost:3150' }, 'POST');
      const res = createMockRes();
      const next = createMockNext();

      process.env.NODE_ENV = 'development';
      csrfMiddleware(req as Request, res as Response, next);
      process.env.NODE_ENV = 'test';

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('bloqueia quando origin e referer estão ausentes', () => {
      const req = createMockReq({ host: 'localhost:3150' }, 'POST');
      const res = createMockRes();
      const next = createMockNext();

      process.env.NODE_ENV = 'development';
      csrfMiddleware(req as Request, res as Response, next);
      process.env.NODE_ENV = 'test';

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        sucesso: false,
        erro: 'CSRF: origem inválida',
        codigoErro: 'CSRF_INVALID'
      });
    });

    test('aceita origin malformada com mesma string de host', () => {
      const req = createMockReq({ origin: 'http://localhost:3150', host: 'localhost:3150' }, 'POST');
      const res = createMockRes();
      const next = createMockNext();

      process.env.NODE_ENV = 'development';
      csrfMiddleware(req as Request, res as Response, next);
      process.env.NODE_ENV = 'test';

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Validação de URLs inválidas', () => {
    test('origin com URL inválida é bloqueada', () => {
      const req = createMockReq({ origin: 'not-a-valid-url', host: 'localhost:3150' }, 'POST');
      const res = createMockRes();
      const next = createMockNext();

      process.env.NODE_ENV = 'development';
      csrfMiddleware(req as Request, res as Response, next);
      process.env.NODE_ENV = 'test';

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('referer com URL inválida é bloqueada', () => {
      const req = createMockReq({ referer: 'not-a-valid-url', host: 'localhost:3150' }, 'POST');
      const res = createMockRes();
      const next = createMockNext();

      process.env.NODE_ENV = 'development';
      csrfMiddleware(req as Request, res as Response, next);
      process.env.NODE_ENV = 'test';

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Subdomínios maliciosos', () => {
    test('bloqueia subdomínio de mesmo domínio (ex: evil.localhost.com)', () => {
      const req = createMockReq({ origin: 'http://evil.localhost.com', host: 'localhost:3150' }, 'POST');
      const res = createMockRes();
      const next = createMockNext();

      process.env.NODE_ENV = 'development';
      csrfMiddleware(req as Request, res as Response, next);
      process.env.NODE_ENV = 'test';

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('bloqueia porta diferente no mesmo host', () => {
      const req = createMockReq({ origin: 'http://localhost:9999', host: 'localhost:3150' }, 'POST');
      const res = createMockRes();
      const next = createMockNext();

      process.env.NODE_ENV = 'development';
      csrfMiddleware(req as Request, res as Response, next);
      process.env.NODE_ENV = 'test';

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
