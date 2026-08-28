/**
 * Comando: agentmap init [--force]
 *
 * Inicializa AgentMap no diretório atual (ou no diretório alvo).
 * Cria a estrutura mínima: .ia/, .kilo/, AGENTS.md, kilo.jsonc.
 */

import * as path from 'path';
import * as fs from 'fs';
import type { InitOptions, CliContext, GeneratorResult } from '../types.js';
import { KiloJsoncGenerator } from '../../generators/KiloJsoncGenerator';
import { AgentsMdGenerator } from '../../generators/AgentsMdGenerator';
import { AgentsRootGenerator } from '../../generators/AgentsRootGenerator';
import { RulesGenerator } from '../../generators/RulesGenerator';
import { CommandsGenerator } from '../../generators/CommandsGenerator';
import { McpBootstrap } from '../../bootstrap/McpBootstrap';
import { resolveAgentMapRoot, resolveProjectRoot } from '../utils/project.js';

export async function runInit(options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const agentMapRoot = resolveAgentMapRoot(cwd);
  const projectRoot = resolveProjectRoot(cwd);

  const ctx: CliContext = {
    cwd: projectRoot,
    agentMapRoot,
    dryRun: false,
    force: options.force || false,
  };

  console.log(`\n[init] AgentMap root: ${agentMapRoot}`);
  console.log(`[init] Project root: ${projectRoot}\n`);

  // Verifica se já existe estrutura
  const hasIa = fs.existsSync(path.join(projectRoot, '.ia'));
  const hasKilo = fs.existsSync(path.join(projectRoot, '.kilo'));

  if (hasIa && hasKilo && !options.force) {
    console.log('[init] Estrutura do AgentMap já existe. Use --force para sobrescrever.');
    return;
  }

  if (options.force) {
    console.log('[init] Modo --force: sobrescrevendo arquivos gerenciados...\n');
  }

  const results = runGenerators(ctx);

  console.log('\n[init] Resultados dos geradores:');
  for (const r of results) {
    const status = r.success ? '✅' : '❌';
    console.log(`  ${status} ${r.action.toUpperCase()}: ${path.basename(r.path)}${r.message ? ` — ${r.message}` : ''}`);
  }

  // Bootstrap MCP
  console.log('\n[init] Verificando MCP...');
  const bootstrap = new McpBootstrap(ctx);
  const bootstrapResult = await bootstrap.bootstrap();
  console.log(`  ${bootstrapResult.built ? '🔨' : '⏭️'} ${bootstrapResult.message}`);

  console.log('\n[init] Concluído.\n');
}

function runGenerators(ctx: CliContext): GeneratorResult[] {
  const results: GeneratorResult[] = [];

  const generators = [
    new AgentsRootGenerator(ctx),
    new KiloJsoncGenerator(ctx),
    new AgentsMdGenerator(ctx),
    new RulesGenerator(ctx),
    new CommandsGenerator(ctx),
  ];

  for (const gen of generators) {
    const result = (gen as any).generate ? (gen as any).generate() : gen.generate();
    if (Array.isArray(result)) {
      results.push(...result);
    } else {
      results.push(result);
    }
  }

  return results;
}
