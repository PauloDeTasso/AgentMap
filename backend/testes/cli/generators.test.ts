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
  jest.spyOn(process, 'cwd').mockReturnValue('C:/projeto');
});

afterEach(() => {
  jest.restoreAllMocks();
});

import { KiloJsoncGenerator } from '../../src/generators/KiloJsoncGenerator';
import { AgentsMdGenerator } from '../../src/generators/AgentsMdGenerator';
import { AgentsRootGenerator } from '../../src/generators/AgentsRootGenerator';
import { RulesGenerator } from '../../src/generators/RulesGenerator';
import { CommandsGenerator } from '../../src/generators/CommandsGenerator';

const baseCtx = {
  cwd: 'C:/projeto',
  agentMapRoot: 'C:/agentmap',
  dryRun: false,
  force: false,
} as any;

describe('generators.test.ts', () => {
  describe('KiloJsoncGenerator', () => {
    test('skipped quando .ia/agentmap.json nao existe', () => {
      const gen = new KiloJsoncGenerator(baseCtx);
      const result = gen.generate();
      expect(result.success).toBe(false);
      expect(result.action).toBe('skipped');
    });

    test('created quando kilo.jsonc nao existe', () => {
      fsDirs.add(norm('C:/agentmap/.ia'));
      fsFiles.set(norm('C:/agentmap/.ia/agentmap.json'), JSON.stringify({}));

      const gen = new KiloJsoncGenerator(baseCtx);
      const result = gen.generate();
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(fsFiles.has(norm('C:/projeto/kilo.jsonc'))).toBe(true);
    });

    test('updated quando ha alteracoes gerenciadas', () => {
      fsDirs.add(norm('C:/agentmap/.ia'));
      fsFiles.set(norm('C:/agentmap/.ia/agentmap.json'), JSON.stringify({}));
      fsFiles.set(norm('C:/projeto/kilo.jsonc'), JSON.stringify({ model: 'old' }, null, '\t') + '\n');

      const gen = new KiloJsoncGenerator(baseCtx);
      const result = gen.generate();
      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
    });

    test('respeita dryRun', () => {
      fsDirs.add(norm('C:/agentmap/.ia'));
      fsFiles.set(norm('C:/agentmap/.ia/agentmap.json'), JSON.stringify({}));

      const ctx = { ...baseCtx, dryRun: true };
      const gen = new KiloJsoncGenerator(ctx);
      const result = gen.generate();
      expect(result.action).toBe('created');
      expect(result.message).toBe('[dry-run]');
      expect(fsFiles.has(norm('C:/projeto/kilo.jsonc'))).toBe(false);
    });
  });

  describe('AgentsMdGenerator', () => {
    test('skipped quando .ia/agentes nao existe', () => {
      const gen = new AgentsMdGenerator(baseCtx);
      const results = gen.generate();
      expect(results[0].success).toBe(false);
      expect(results[0].action).toBe('skipped');
    });

    test('gera md para cada agente com json', () => {
      fsDirs.add(norm('C:/agentmap/.ia'));
      fsDirs.add(norm('C:/agentmap/.ia/agentes'));
      fsDirs.add(norm('C:/agentmap/.ia/agentes/testador-qa'));
      fsFiles.set(norm('C:/agentmap/.ia/agentes/testador-qa/testador-qa.json'), JSON.stringify({ nome: 'Testador QA', responsabilidades: ['Testar'] }));
      fsDirs.add(norm('C:/projeto/.kilo'));
      fsDirs.add(norm('C:/projeto/.kilo/agents'));

      const gen = new AgentsMdGenerator(baseCtx);
      const results = gen.generate();
      expect(results.some((r) => r.action === 'updated')).toBe(true);
      expect(fsFiles.has(norm('C:/projeto/.kilo/agents/agentmap/testador-qa.md'))).toBe(true);
    });

    test('preserva arquivo existente quando nao force', () => {
      fsDirs.add(norm('C:/agentmap/.ia'));
      fsDirs.add(norm('C:/agentmap/.ia/agentes'));
      fsDirs.add(norm('C:/agentmap/.ia/agentes/testador-qa'));
      fsFiles.set(norm('C:/agentmap/.ia/agentes/testador-qa/testador-qa.json'), JSON.stringify({ nome: 'Testador QA', responsabilidades: ['Testar'] }));
      fsFiles.set(norm('C:/projeto/.kilo/agents/agentmap/testador-qa.md'), 'old content');
      fsDirs.add(norm('C:/projeto/.kilo'));
      fsDirs.add(norm('C:/projeto/.kilo/agents'));

      const gen = new AgentsMdGenerator(baseCtx);
      const results = gen.generate();
      expect(results[0].action).toBe('unchanged');
      expect(fsFiles.get(norm('C:/projeto/.kilo/agents/agentmap/testador-qa.md'))).toBe('old content');
    });

    test('forca sobrescrita quando force eh true', () => {
      fsDirs.add(norm('C:/agentmap/.ia'));
      fsDirs.add(norm('C:/agentmap/.ia/agentes'));
      fsDirs.add(norm('C:/agentmap/.ia/agentes/testador-qa'));
      fsFiles.set(norm('C:/agentmap/.ia/agentes/testador-qa/testador-qa.json'), JSON.stringify({ nome: 'Testador QA', responsabilidades: ['Testar'] }));
      fsFiles.set(norm('C:/projeto/.kilo/agents/agentmap/testador-qa.md'), 'old content');
      fsDirs.add(norm('C:/projeto/.kilo'));
      fsDirs.add(norm('C:/projeto/.kilo/agents'));

      const ctx = { ...baseCtx, force: true };
      const gen = new AgentsMdGenerator(ctx);
      const results = gen.generate();
      expect(results[0].action).toBe('updated');
      expect(fsFiles.get(norm('C:/projeto/.kilo/agents/agentmap/testador-qa.md'))).not.toBe('old content');
    });
  });

  describe('AgentsRootGenerator', () => {
    test('cria AGENTS.md quando nao existe', () => {
      const gen = new AgentsRootGenerator(baseCtx);
      const result = gen.generate();
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(fsFiles.has(norm('C:/projeto/AGENTS.md'))).toBe(true);
    });

    test('merge mantem secao customizada do usuario', () => {
      const existing = `<# AgentMap>\n<!-- AGENTMAP_PROTECTED_START -->\nold\n<!-- AGENTMAP_PROTECTED_END -->\n<!-- AGENTMAP_USER_START -->\n# Minha secao\n<!-- AGENTMAP_USER_END -->\n`;
      fsFiles.set(norm('C:/projeto/AGENTS.md'), existing);

      const gen = new AgentsRootGenerator(baseCtx);
      const result = gen.generate();
      expect(result.action).toBe('updated');
      const content = fsFiles.get(norm('C:/projeto/AGENTS.md'))!;
      expect(content).toContain('# Minha secao');
    });

    test('adiciona secao padrao do usuario quando inexistente', () => {
      fsFiles.set(norm('C:/projeto/AGENTS.md'), '<!-- AGENTMAP_PROTECTED_START -->\nold\n<!-- AGENTMAP_PROTECTED_END -->');

      const gen = new AgentsRootGenerator(baseCtx);
      const result = gen.generate();
      expect(result.action).toBe('updated');
      const content = fsFiles.get(norm('C:/projeto/AGENTS.md'))!;
      expect(content).toContain('Seção customizada do usuário');
    });
  });

  describe('RulesGenerator', () => {
    test('gera regras padrao quando .ia/policies nao existe', () => {
      const gen = new RulesGenerator(baseCtx);
      const results = gen.generate();
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.action === 'created')).toBe(true);
      expect(fsFiles.has(norm('C:/projeto/.kilo/rules/agentmap/operating-rules.md'))).toBe(true);
    });

    test('copia policies quando existem', () => {
      fsDirs.add(norm('C:/agentmap/.ia'));
      fsDirs.add(norm('C:/agentmap/.ia/policies'));
      fsFiles.set(norm('C:/agentmap/.ia/policies/custom.md'), 'custom policy');
      fsDirs.add(norm('C:/projeto/.kilo'));

      const gen = new RulesGenerator(baseCtx);
      const results = gen.generate();
      expect(results[0].action).toBe('updated');
      expect(fsFiles.get(norm('C:/projeto/.kilo/rules/agentmap/custom.md'))).toBe('custom policy');
    });
  });

  describe('CommandsGenerator', () => {
    test('skipped quando .ia/procedimentos nao existe', () => {
      const gen = new CommandsGenerator(baseCtx);
      const results = gen.generate();
      expect(results[0].success).toBe(false);
      expect(results[0].action).toBe('skipped');
      expect(results[0].message).toBe('.ia/procedimentos não encontrado');
    });

    test('gera comandos com frontmatter', () => {
      fsDirs.add(norm('C:/agentmap/.ia'));
      fsDirs.add(norm('C:/agentmap/.ia/procedimentos'));
      fsFiles.set(norm('C:/agentmap/.ia/procedimentos/operacao.md'), '# Operacao');
      fsDirs.add(norm('C:/projeto/.kilo'));

      const gen = new CommandsGenerator(baseCtx);
      const results = gen.generate();
      expect(results[0].action).toBe('updated');
      const content = fsFiles.get(norm('C:/projeto/.kilo/commands/agentmap/operacao.md'))!;
      expect(content).toContain('id: operacao');
      expect(content).toContain('type: command');
    });

    test('skipped quando nao ha procedimentos .md', () => {
      fsDirs.add(norm('C:/agentmap/.ia'));
      fsDirs.add(norm('C:/agentmap/.ia/procedimentos'));

      const gen = new CommandsGenerator(baseCtx);
      const results = gen.generate();
      expect(results[0].action).toBe('skipped');
      expect(results[0].message).toBe('Nenhum procedimento .md encontrado');
    });
  });
});
