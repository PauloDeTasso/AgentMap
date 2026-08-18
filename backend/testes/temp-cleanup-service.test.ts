import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TempCleanupService, TempFile, CleanupResult } from '../src/servicios/TempCleanupService';

describe('TempCleanupService', () => {
  let projectRoot: string;
  let service: TempCleanupService;

  beforeEach(() => {
    projectRoot = path.join(os.tmpdir(), 'agentmap-temp-test-' + Date.now());
    fs.mkdirSync(projectRoot, { recursive: true });
    fs.mkdirSync(path.join(projectRoot, 'temp'), { recursive: true });
    service = new TempCleanupService(projectRoot);
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  test('listTempFiles retorna vazio quando nao ha arquivos', () => {
    const files = service.listTempFiles();
    expect(files).toHaveLength(0);
  });

  test('listTempFiles detecta arquivos antigos', () => {
    const oldFile = path.join(projectRoot, 'temp', 'old.txt');
    fs.writeFileSync(oldFile, 'antigo', 'utf-8');
    const oldTime = Date.now() - 10 * 24 * 60 * 60 * 1000;
    fs.utimesSync(oldFile, new Date(oldTime), new Date(oldTime));
    const files = service.listTempFiles(7);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('temp/old.txt');
    expect(files[0].size).toBe(6);
  });

  test('listTempFiles ignora arquivos recentes', () => {
    const recentFile = path.join(projectRoot, 'temp', 'recent.txt');
    fs.writeFileSync(recentFile, 'recente', 'utf-8');
    const files = service.listTempFiles(7);
    expect(files).toHaveLength(0);
  });

  test('listTempFiles escaneia subdiretorios', () => {
    const subDir = path.join(projectRoot, 'temp', 'sub');
    fs.mkdirSync(subDir, { recursive: true });
    const oldFile = path.join(subDir, 'old.txt');
    fs.writeFileSync(oldFile, 'antigo', 'utf-8');
    const oldTime = Date.now() - 10 * 24 * 60 * 60 * 1000;
    fs.utimesSync(oldFile, new Date(oldTime), new Date(oldTime));
    const files = service.listTempFiles(7);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('temp/sub/old.txt');
  });

  test('cleanupTempFiles remove arquivos antigos', () => {
    const oldFile = path.join(projectRoot, 'temp', 'old.txt');
    fs.writeFileSync(oldFile, 'antigo', 'utf-8');
    const oldTime = Date.now() - 10 * 24 * 60 * 60 * 1000;
    fs.utimesSync(oldFile, new Date(oldTime), new Date(oldTime));
    const result = service.cleanupTempFiles(7);
    expect(result.removed).toContain('temp/old.txt');
    expect(result.freedBytes).toBeGreaterThan(0);
    expect(fs.existsSync(oldFile)).toBe(false);
  });

  test('cleanupTempFiles nao remove arquivos recentes', () => {
    const recentFile = path.join(projectRoot, 'temp', 'recent.txt');
    fs.writeFileSync(recentFile, 'recente', 'utf-8');
    const result = service.cleanupTempFiles(7);
    expect(result.removed).toHaveLength(0);
    expect(fs.existsSync(recentFile)).toBe(true);
  });

  test('cleanupTempFiles acumula erros quando falha', () => {
    const oldFile = path.join(projectRoot, 'temp', 'old.txt');
    fs.writeFileSync(oldFile, 'antigo', 'utf-8');
    const oldTime = Date.now() - 10 * 24 * 60 * 60 * 1000;
    fs.utimesSync(oldFile, new Date(oldTime), new Date(oldTime));
    fs.chmodSync(oldFile, 0o000);
    try {
      const result = service.cleanupTempFiles(7);
      expect(result.errors.length).toBeGreaterThan(0);
    } finally {
      fs.chmodSync(oldFile, 0o644);
    }
  });

  test('detectType classifica worktree corretamente', () => {
    expect((service as any).detectType('temp/.kilo/worktrees/wt-1/file.txt')).toBe('worktree');
  });

  test('detectType classifica cache corretamente', () => {
    expect((service as any).detectType('temp/.cache/file.txt')).toBe('cache');
  });

  test('detectType classifica arquivo generico como file', () => {
    expect((service as any).detectType('temp/output.txt')).toBe('file');
  });

  test('getTempDir retorna caminho correto', () => {
    expect(service.getTempDir()).toBe(path.join(projectRoot, 'temp'));
  });
});
