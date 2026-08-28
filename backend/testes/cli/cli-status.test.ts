import * as fs from 'fs';
import * as path from 'path';

const fsFiles = new Map<string, string>();
const fsDirs = new Set<string>();

const norm = (p: string) => path.normalize(p);

jest.mock('fs', () => {
  const existsSync = (p: string) => fsDirs.has(norm(p)) || fsFiles.has(norm(p));
  const mkdirSync = (p: string) => { fsDirs.add(norm(p)); };
  const writeFileSync = (p: string, content: string) => { fsFiles.set(norm(p), content); };
  const readFileSync = (p: string) => {
    const np = norm(p);
    if (!fsFiles.has(np)) {
      throw new Error(`ENOENT: no such file or directory, open '${p}'`);
    }
    return fsFiles.get(np)!;
  };
  const readdirSync = () => [];

  return {
    existsSync,
    mkdirSync,
    writeFileSync,
    readFileSync,
    readdirSync,
    statSync: () => ({ isFile: () => true, isDirectory: () => false }),
    constants: { O_RDONLY: 0, O_WRONLY: 1, O_RDWR: 2, O_CREAT: 64, O_TRUNC: 512, O_APPEND: 1024 },
    openSync: () => 0,
    closeSync: () => {},
    appendFileSync: () => {},
    renameSync: () => {},
    unlinkSync: () => {},
    rmdirSync: () => {},
    rmSync: () => {},
    accessSync: () => {},
    copyFileSync: () => {},
    stat: () => ({ isFile: () => true, isDirectory: () => false }),
    exists: () => Promise.resolve(true),
    readFile: () => Promise.resolve(Buffer.from('')),
    writeFile: () => Promise.resolve(),
    mkdir: () => Promise.resolve(),
    access: () => Promise.resolve(),
    copyFile: () => Promise.resolve(),
    rename: () => Promise.resolve(),
    rm: () => Promise.resolve(),
    promises: {
      exists: () => Promise.resolve(true),
      mkdir: () => Promise.resolve(),
      readFile: () => Promise.resolve(Buffer.from('')),
      writeFile: () => Promise.resolve(),
      access: () => Promise.resolve(),
      copyFile: () => Promise.resolve(),
      rename: () => Promise.resolve(),
      rm: () => Promise.resolve(),
      stat: () => Promise.resolve({ isFile: () => true, isDirectory: () => false }),
      realpath: () => Promise.resolve(''),
    },
  };
});

beforeEach(() => {
  fsFiles.clear();
  fsDirs.clear();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(process, 'cwd').mockReturnValue('C:/projeto');
});

afterEach(() => {
  jest.restoreAllMocks();
});

import { runStatus } from '../../src/cli/commands/status';

describe('cli-status.test.ts', () => {
  test('lista status com todos arquivos presentes', () => {
    fsDirs.add(norm('C:/projeto/.ia'));
    fsDirs.add(norm('C:/projeto/.kilo'));
    fsDirs.add(norm('C:/projeto/.kilo/agents/agentmap'));
    fsDirs.add(norm('C:/projeto/.kilo/rules/agentmap'));
    fsDirs.add(norm('C:/projeto/.kilo/commands/agentmap'));
    fsFiles.set(norm('C:/projeto/.ia/fluxo-trabalho.md'), '');
    fsFiles.set(norm('C:/projeto/AGENTS.md'), '');
    fsFiles.set(norm('C:/projeto/kilo.jsonc'), '');
    fsFiles.set(norm('C:/projeto/.ia/runtime/mcp/dist/main.js'), '');

    expect(() => runStatus({ json: false })).not.toThrow();
  });

  test('lista status com arquivos opcionais ausentes', () => {
    fsDirs.add(norm('C:/projeto/.ia'));
    fsDirs.add(norm('C:/projeto/.kilo'));
    fsDirs.add(norm('C:/projeto/.kilo/agents/agentmap'));
    fsFiles.set(norm('C:/projeto/.ia/fluxo-trabalho.md'), '');
    fsFiles.set(norm('C:/projeto/AGENTS.md'), '');
    fsFiles.set(norm('C:/projeto/kilo.jsonc'), '');

    expect(() => runStatus({ json: false })).not.toThrow();
  });

  test('imprime resumo', () => {
    fsDirs.add(norm('C:/projeto/.ia'));
    fsFiles.set(norm('C:/projeto/.ia/fluxo-trabalho.md'), '');
    fsFiles.set(norm('C:/projeto/AGENTS.md'), '');
    fsFiles.set(norm('C:/projeto/kilo.jsonc'), '');

    expect(() => runStatus({ json: false })).not.toThrow();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Resumo:'));
  });
});
