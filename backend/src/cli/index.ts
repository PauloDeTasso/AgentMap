#!/usr/bin/env node
/**
 * CLI do AgentMap — Entry point.
 *
 * Uso:
 *   agentmap init [--force]
 *   agentmap update [--dry-run] [--force]
 *   agentmap status [--json]
 *   agentmap doctor [--json] [--repair]
 *   agentmap repair
 */

import { Command } from 'commander';
import { runInit } from './commands/init.js';
import { runUpdate } from './commands/update.js';
import { runStatus } from './commands/status.js';
import { runDoctor } from './commands/doctor.js';
import { runRepair } from './commands/repair.js';

const program = new Command();

program
  .name('agentmap')
  .description('CLI do AgentMap — gerenciamento de templates e projetos')
  .version('2.0.0');

program
  .command('init')
  .description('Inicializa AgentMap no diretório atual')
  .option('--force', 'Sobrescreve arquivos existentes')
  .option('--skip-mcp', 'Pula bootstrap do MCP')
  .action((opts) => {
    runInit(opts);
  });

program
  .command('update')
  .description('Atualiza arquivos gerenciados preservando edições do usuário')
  .option('--dry-run', 'Simula atualização sem escrever arquivos')
  .option('--force', 'Força sobrescrita de arquivos')
  .action((opts) => {
    runUpdate(opts);
  });

program
  .command('status')
  .description('Mostra status de sincronização do AgentMap')
  .option('--json', 'Saída em JSON')
  .action((opts) => {
    runStatus(opts);
  });

program
  .command('doctor')
  .description('Valida integridade do projeto')
  .option('--json', 'Saída em JSON')
  .option('--repair', 'Aplica reparações automáticas')
  .action((opts) => {
    runDoctor(opts);
  });

program
  .command('repair')
  .description('Repara problemas comuns detectados pelo doctor')
  .action(() => {
    runRepair();
  });

program.parse(process.argv);
