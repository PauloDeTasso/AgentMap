jest.mock('child_process', () => ({
  spawn: jest.fn(),
  spawnSync: jest.fn(),
  exec: jest.fn(),
  execSync: jest.fn(),
}));

import http from 'http';
import express, { Application, Request, Response, NextFunction } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { criarArquivoRouter } from '../src/api/arquivos';
import { spawn } from 'child_process';
import { FileService } from '../src/arquivos/FileService';

function createTestApp(fileService: FileService): Application {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).servicos = {
      projeto: { fileService, nome: 'teste', id: 'teste-id' }
    };
    next();
  });
  app.use('/api/arquivos', criarArquivoRouter());
  return app;
}

function httpRequest(app: Application, method: string, url: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address() as any;
      const req = http.request({ port: addr.port, method, path: url }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          server.close();
          let body: any;
          try {
            body = JSON.parse(data);
          } catch {
            body = data;
          }
          resolve({ status: res.statusCode!, body });
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

describe('Arquivos Router - /explorer', () => {
  const projectRoot = path.join(os.tmpdir(), `agentmap-arquivos-test-${Date.now()}`);
  const fileService = new FileService(projectRoot);

  beforeAll(() => {
    fs.mkdirSync(projectRoot, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (spawn as jest.Mock).mockReturnValue({
      on: jest.fn(),
      unref: jest.fn(),
    });
  });

  test('missing path returns 400 MISSING_PATH', async () => {
    const app = createTestApp(fileService);
    const res = await httpRequest(app, 'GET', '/api/arquivos/explorer');
    expect(res.status).toBe(400);
    expect(res.body.sucesso).toBe(false);
    expect(res.body.codigoErro).toBe('MISSING_PATH');
    expect(spawn).not.toHaveBeenCalled();
  });

  test('non-existent path returns 404 NOT_FOUND', async () => {
    const app = createTestApp(fileService);
    const res = await httpRequest(app, 'GET', '/api/arquivos/explorer?path=nonexistent-dir');
    expect(res.status).toBe(404);
    expect(res.body.sucesso).toBe(false);
    expect(res.body.codigoErro).toBe('NOT_FOUND');
    expect(spawn).not.toHaveBeenCalled();
  });

  test('valid path spawns explorer with array argument', async () => {
    const dirName = 'explorer-test-dir';
    const dirPath = path.join(projectRoot, dirName);
    fs.mkdirSync(dirPath, { recursive: true });

    const app = createTestApp(fileService);
    const res = await httpRequest(app, 'GET', `/api/arquivos/explorer?path=${dirName}`);

    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(spawn).toHaveBeenCalledTimes(1);

    const spawnCall = (spawn as jest.Mock).mock.calls[0];
    expect(spawnCall[0]).toBe('explorer');
    expect(Array.isArray(spawnCall[1])).toBe(true);
    expect(spawnCall[1]).toEqual([dirPath]);
  });

  test('path traversal is blocked with 403 PATH_TRAVERSAL', async () => {
    const app = createTestApp(fileService);
    const res = await httpRequest(app, 'GET', '/api/arquivos/explorer?path=../../../etc/passwd');
    expect(res.status).toBe(403);
    expect(res.body.sucesso).toBe(false);
    expect(res.body.codigoErro).toBe('PATH_TRAVERSAL');
    expect(spawn).not.toHaveBeenCalled();
  });

  test('spawn receives array args (no shell injection vector)', async () => {
    const dirName = 'safe-dir';
    const dirPath = path.join(projectRoot, dirName);
    fs.mkdirSync(dirPath, { recursive: true });

    const app = createTestApp(fileService);
    const res = await httpRequest(app, 'GET', `/api/arquivos/explorer?path=${dirName}`);

    expect(res.status).toBe(200);
    expect(spawn).toHaveBeenCalledTimes(1);

    const spawnCall = (spawn as jest.Mock).mock.calls[0];
    expect(spawnCall[0]).toBe('explorer');
    expect(Array.isArray(spawnCall[1])).toBe(true);
    expect(spawnCall[1]).toHaveLength(1);
    expect(spawnCall[1][0]).toBe(dirPath);

    const options = spawnCall[2];
    expect(options.shell).not.toBe(true);
  });
});
