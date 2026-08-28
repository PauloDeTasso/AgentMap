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

import { runInit } from '../../src/cli/commands/init';

describe('cli-init.test.ts', () => {
  test('nao executa geradores quando .ia e .kilo ja existem e --force nao foi passado', () => {
    fsDirs.add(norm('C:/projeto/.ia'));
    fsDirs.add(norm('C:/projeto/.kilo'));

    expect(() => runInit({ force: false })).not.toThrow();
    expect(fsFiles.has(norm('C:/projeto/AGENTS.md'))).toBe(false);
    expect(fsFiles.has(norm('C:/projeto/kilo.jsonc'))).toBe(false);
  });

  test('executa geradores quando .ia e .kilo nao existem', () => {
    fsDirs.add(norm('C:/projeto/.ia'));
    fsDirs.add(norm('C:/projeto/.ia/agentes'));
    fsFiles.set(norm('C:/projeto/.ia/agentmap.json'), JSON.stringify({}));

    expect(() => runInit({ force: false })).not.toThrow();
    expect(fsFiles.has(norm('C:/projeto/AGENTS.md'))).toBe(true);
    expect(fsFiles.has(norm('C:/projeto/kilo.jsonc'))).toBe(true);
  });

  test('executa geradores com --force mesmo se .ia e .kilo ja existem', () => {
    fsDirs.add(norm('C:/projeto/.ia'));
    fsDirs.add(norm('C:/projeto/.kilo'));
    fsFiles.set(norm('C:/projeto/AGENTS.md'), 'old');
    fsDirs.add(norm('C:/projeto/.ia/agentes'));
    fsFiles.set(norm('C:/projeto/.ia/agentmap.json'), JSON.stringify({}));

    expect(() => runInit({ force: true })).not.toThrow();
    expect(fsFiles.has(norm('C:/projeto/AGENTS.md'))).toBe(true);
    expect(fsFiles.get(norm('C:/projeto/AGENTS.md'))).not.toBe('old');
  });

  test('nao executa bootstrap MCP quando skip-mcp eh true', async () => {
    fsDirs.add(norm('C:/projeto/.ia'));
    fsDirs.add(norm('C:/projeto/.ia/agentes'));
    fsFiles.set(norm('C:/projeto/.ia/agentmap.json'), JSON.stringify({}));

    await runInit({ force: false, skipMcp: true });
    expect(fsFiles.has(norm('C:/projeto/AGENTS.md'))).toBe(true);
  });
});
