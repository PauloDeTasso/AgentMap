import http from 'http';
import express, { Application, Request, Response, NextFunction } from 'express';
import { apiKeyMiddleware, ApiKeyOptions } from '../src/seguranca/api-key';

jest.mock('../src/config', () => ({
  loadSettings: jest.fn(() => ({})),
  saveSettings: jest.fn(),
  GERENCIADOR_DIR: '',
  LOCAL_DIR: '',
  REGISTRO_PROJETOS_PATH: '',
  getLocalDir: jest.fn(),
  getDiretorioProjetosDefault: jest.fn(),
  loadRegistroProjetos: jest.fn(),
  saveRegistroProjetos: jest.fn(),
  registrarProjeto: jest.fn(),
  removerProjetoDoRegistro: jest.fn(),
  ensureDir: jest.fn()
}));

const mockedLoadSettings = (require('../src/config').loadSettings as jest.Mock);
const mockedSaveSettings = (require('../src/config').saveSettings as jest.Mock);

function createTestApp(options: ApiKeyOptions = {}): Application {
  const app = express();
  app.use(apiKeyMiddleware(options));
  app.use(express.json());

  app.get('/api/test', (_req: Request, res: Response) => {
    res.json({ sucesso: true, dados: 'ok' });
  });

  app.get('/api/status', (_req: Request, res: Response) => {
    res.json({ sucesso: true, dados: { status: 'online' } });
  });

  app.post('/api/test', (req: Request, res: Response) => {
    res.json({ sucesso: true, dados: req.body });
  });

  return app;
}

function httpRequest(app: Application, path: string, method = 'GET', headers: Record<string, string> = {}): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address() as any;
      const req = http.request({ port: addr.port, method, path, headers }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          server.close();
          let parsed: any;
          try { parsed = JSON.parse(data); } catch { parsed = data; }
          resolve({ status: res.statusCode!, body: parsed });
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

describe('Segurança — API Key', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoadSettings.mockReturnValue({});
    mockedSaveSettings.mockImplementation(() => {});
  });

  describe('Sem API key configurada', () => {
    test('permite acesso sem API key', async () => {
      const app = createTestApp();
      const res = await httpRequest(app, '/api/test');
      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
    });

    test('permite acesso com API key quando não configurada', async () => {
      const app = createTestApp();
      const res = await httpRequest(app, '/api/test', 'GET', { 'x-api-key': 'qualquer-coisa' });
      expect(res.status).toBe(200);
    });
  });

  describe('Com API key configurada', () => {
    beforeEach(() => {
      mockedLoadSettings.mockReturnValue({ apiKey: 'secret-key-123' } as any);
    });

    test('bloqueia requisição sem API key', async () => {
      const app = createTestApp();
      const res = await httpRequest(app, '/api/test');
      expect(res.status).toBe(401);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.codigoErro).toBe('MISSING_API_KEY');
    });

    test('bloqueia requisição com API key incorreta', async () => {
      const app = createTestApp();
      const res = await httpRequest(app, '/api/test', 'GET', { 'x-api-key': 'wrong-key' });
      expect(res.status).toBe(403);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.codigoErro).toBe('INVALID_API_KEY');
    });

    test('permite requisição com API key correta', async () => {
      const app = createTestApp();
      const res = await httpRequest(app, '/api/test', 'GET', { 'x-api-key': 'secret-key-123' });
      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
    });

    test('permite POST com API key correta', async () => {
      const app = createTestApp();
      const res = await httpRequest(app, '/api/test', 'POST', { 'x-api-key': 'secret-key-123', 'Content-Type': 'application/json' });
      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
    });
  });

  describe('Skip paths', () => {
    beforeEach(() => {
      mockedLoadSettings.mockReturnValue({ apiKey: 'secret-key-123' } as any);
    });

    test('/api/status é permitido sem API key', async () => {
      const app = createTestApp({
        skipPaths: ['/api/status', '/api/health']
      });
      const res = await httpRequest(app, '/api/status');
      expect(res.status).toBe(200);
    });

    test('/api/test requer API key', async () => {
      const app = createTestApp({
        skipPaths: ['/api/status', '/api/health']
      });
      const res = await httpRequest(app, '/api/test');
      expect(res.status).toBe(401);
    });
  });

  describe('Case-sensitive header', () => {
    beforeEach(() => {
      mockedLoadSettings.mockReturnValue({ apiKey: 'secret-key-123' } as any);
    });

    test('header case-insensitive funciona', async () => {
      const app = createTestApp();
      const res = await httpRequest(app, '/api/test', 'GET', { 'X-API-KEY': 'secret-key-123' });
      expect(res.status).toBe(200);
    });
  });

});
