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
  const readdirSync = (p: string, opts?: { withFileTypes?: boolean }) => {
    const prefix = norm(p).endsWith(path.sep) ? norm(p) : norm(p) + path.sep;
    const entries: any[] = [];
    const names = new Set<string>();

    for (const d of fsDirs) {
      const nd = norm(d);
      if (nd === norm(p) || nd.startsWith(prefix)) {
        const rel = nd === norm(p) ? '' : nd.slice(prefix.length);
        const name = rel.split(path.sep)[0];
        if (name && !names.has(name)) {
          names.add(name);
          if (opts?.withFileTypes) entries.push({ name, isDirectory: () => true });
          else entries.push(name);
        }
      }
    }

    for (const f of fsFiles.keys()) {
      const nf = norm(f);
      if (nf.startsWith(prefix)) {
        const name = nf.slice(prefix.length).split(path.sep)[0];
        if (name && !names.has(name)) {
          names.add(name);
          if (opts?.withFileTypes) entries.push({ name, isDirectory: () => false });
          else entries.push(name);
        }
      }
    }

    return entries;
  };

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

import { runDoctor } from '../../src/cli/commands/doctor';

describe('cli-doctor.test.ts', () => {
  test('reporta diretorios obrigatorios ausentes', () => {
    expect(() => runDoctor({ json: false })).not.toThrow();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('MISSING_DIR'));
  });

  test('reporta fluxo-trabalho.md ausente', () => {
    fsDirs.add(norm('C:/projeto/.ia/contratos'));
    fsDirs.add(norm('C:/projeto/.ia/tarefas'));
    fsDirs.add(norm('C:/projeto/.ia/dependencias'));
    fsDirs.add(norm('C:/projeto/.ia/agentes'));
    fsDirs.add(norm('C:/projeto/.ia/procedimentos'));

    expect(() => runDoctor({ json: false })).not.toThrow();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('MISSING_FLUXO'));
  });

  test('reporta agente sem definicao JSON', () => {
    fsDirs.add(norm('C:/projeto/.ia/contratos'));
    fsDirs.add(norm('C:/projeto/.ia/tarefas'));
    fsDirs.add(norm('C:/projeto/.ia/dependencias'));
    fsDirs.add(norm('C:/projeto/.ia/agentes'));
    fsDirs.add(norm('C:/projeto/.ia/procedimentos'));
    fsFiles.set(norm('C:/projeto/.ia/fluxo-trabalho.md'), '');
    fsDirs.add(norm('C:/projeto/.ia/agentes/teste'));

    expect(() => runDoctor({ json: false })).not.toThrow();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('AGENT_MISSING_JSON'));
  });

  test('reporta dependencia circular', () => {
    fsDirs.add(norm('C:/projeto/.ia/contratos'));
    fsDirs.add(norm('C:/projeto/.ia/tarefas'));
    fsDirs.add(norm('C:/projeto/.ia/dependencias'));
    fsDirs.add(norm('C:/projeto/.ia/agentes'));
    fsDirs.add(norm('C:/projeto/.ia/procedimentos'));
    fsFiles.set(norm('C:/projeto/.ia/fluxo-trabalho.md'), '');
    fsFiles.set(norm('C:/projeto/.ia/dependencias/dependencias.json'), JSON.stringify([
      { de: 'A', para: 'B' },
      { de: 'B', para: 'A' },
    ]));

    expect(() => runDoctor({ json: false })).not.toThrow();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('CIRCULAR_DEPENDENCY'));
  });

  test('reporta MCP nao buildado', () => {
    fsDirs.add(norm('C:/projeto/.ia/contratos'));
    fsDirs.add(norm('C:/projeto/.ia/tarefas'));
    fsDirs.add(norm('C:/projeto/.ia/dependencias'));
    fsDirs.add(norm('C:/projeto/.ia/agentes'));
    fsDirs.add(norm('C:/projeto/.ia/procedimentos'));
    fsFiles.set(norm('C:/projeto/.ia/fluxo-trabalho.md'), '');

    expect(() => runDoctor({ json: false })).not.toThrow();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('MCP_NOT_BUILT'));
  });

  test('reporta healthy quando nao ha issues', () => {
    fsDirs.add(norm('C:/projeto/.ia/contratos'));
    fsDirs.add(norm('C:/projeto/.ia/tarefas'));
    fsDirs.add(norm('C:/projeto/.ia/dependencias'));
    fsDirs.add(norm('C:/projeto/.ia/agentes'));
    fsDirs.add(norm('C:/projeto/.ia/procedimentos'));
    fsFiles.set(norm('C:/projeto/.ia/fluxo-trabalho.md'), '');
    fsFiles.set(norm('C:/projeto/.ia/runtime/mcp/dist/main.js'), '');
    fsFiles.set(norm('C:/projeto/.ia/contratos/contratos.json'), '[]');

    expect(() => runDoctor({ json: false })).not.toThrow();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Nenhum problema encontrado'));
  });
});
