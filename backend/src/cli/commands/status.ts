/**
 * Comando: agentmap status
 *
 * Mostra o status de sincronização entre o template AgentMap e o projeto atual.
 */

import * as path from 'path';
import * as fs from 'fs';
import type { StatusOptions, CliContext } from '../types.js';
import { resolveAgentMapRoot, resolveProjectRoot } from '../utils/project.js';

export function runStatus(_options: StatusOptions): void {
  const cwd = process.cwd();
  const agentMapRoot = resolveAgentMapRoot(cwd);
  const projectRoot = resolveProjectRoot(cwd);

  console.log(`\n[status] AgentMap root: ${agentMapRoot}`);
  console.log(`[status] Project root: ${projectRoot}\n`);

  const checks = [
    { name: '.ia/agentmap.json', path: path.join(agentMapRoot, '.ia', 'agentmap.json'), required: true },
    { name: '.ia/fluxo-trabalho.md', path: path.join(projectRoot, '.ia', 'fluxo-trabalho.md'), required: true },
    { name: '.kilo/agents/agentmap/', path: path.join(projectRoot, '.kilo', 'agents', 'agentmap'), required: true, isDir: true },
    { name: '.kilo/rules/agentmap/', path: path.join(projectRoot, '.kilo', 'rules', 'agentmap'), required: false, isDir: true },
    { name: '.kilo/commands/agentmap/', path: path.join(projectRoot, '.kilo', 'commands', 'agentmap'), required: false, isDir: true },
    { name: 'AGENTS.md', path: path.join(projectRoot, 'AGENTS.md'), required: true },
    { name: 'kilo.jsonc', path: path.join(projectRoot, 'kilo.jsonc'), required: true },
    { name: '.ia/runtime/mcp/dist/main.js', path: path.join(agentMapRoot, '.ia', 'runtime', 'mcp', 'dist', 'main.js'), required: false },
  ];

  let ok = 0;
  let warn = 0;
  let fail = 0;

  for (const check of checks) {
    const exists = check.isDir ? fs.existsSync(check.path) : fs.existsSync(check.path);
    const status = exists ? '✅' : (check.required ? '❌' : '⚠️');
    const label = check.required ? 'REQUERIDO' : 'OPCIONAL';

    console.log(`  ${status} ${label}: ${check.name}${exists ? '' : ' (ausente)'}`);
    if (exists) ok++;
    else if (check.required) fail++;
    else warn++;
  }

  console.log(`\n  Resumo: ${ok} ok, ${warn} warnings, ${fail} erros\n`);
}
