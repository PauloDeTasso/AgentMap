/**
 * Comando: agentmap update [--dry-run]
 *
 * Atualiza arquivos gerenciados pelo AgentMap, preservando edições do usuário.
 */

import * as path from 'path';
import * as fs from 'fs';
import type { UpdateOptions, CliContext, GeneratorResult } from '../types.js';
import { KiloJsoncGenerator } from '../../generators/KiloJsoncGenerator';
import { AgentsMdGenerator } from '../../generators/AgentsMdGenerator';
import { AgentsRootGenerator } from '../../generators/AgentsRootGenerator';
import { RulesGenerator } from '../../generators/RulesGenerator';
import { CommandsGenerator } from '../../generators/CommandsGenerator';
import { McpBootstrap } from '../../bootstrap/McpBootstrap';
import { resolveAgentMapRoot, resolveProjectRoot } from '../utils/project.js';

export async function runUpdate(options: UpdateOptions): Promise<void> {
  const cwd = process.cwd();
  const agentMapRoot = resolveAgentMapRoot(cwd);
  const projectRoot = resolveProjectRoot(cwd);

  const ctx: CliContext = {
    cwd: projectRoot,
    agentMapRoot,
    dryRun: options.dryRun || false,
    force: options.force || false,
  };

  console.log(`\n[update] AgentMap root: ${agentMapRoot}`);
  console.log(`[update] Project root: ${projectRoot}`);
  console.log(`[update] Dry run: ${ctx.dryRun}\n`);

  if (!fs.existsSync(path.join(projectRoot, '.ia'))) {
    console.log('[update] Estrutura .ia/ não encontrada. Execute `agentmap init` primeiro.');
    return;
  }

  const results = runGenerators(ctx);

  console.log('\n[update] Resultados dos geradores:');
  for (const r of results) {
    const status = r.success ? '✅' : '❌';
    console.log(`  ${status} ${r.action.toUpperCase()}: ${path.basename(r.path)}${r.message ? ` — ${r.message}` : ''}`);
  }

  // Bootstrap MCP
  console.log('\n[update] Verificando MCP...');
  const bootstrap = new McpBootstrap(ctx);
  const bootstrapResult = await bootstrap.bootstrap();
  console.log(`  ${bootstrapResult.built ? '🔨' : '⏭️'} ${bootstrapResult.message}`);

  console.log('\n[update] Concluído.\n');
}

function runGenerators(ctx: CliContext): GeneratorResult[] {
  const results: GeneratorResult[] = [];

  const generators = [
    new KiloJsoncGenerator(ctx),
    new AgentsMdGenerator(ctx),
    new AgentsRootGenerator(ctx),
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
