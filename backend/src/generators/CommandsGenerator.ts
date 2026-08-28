/**
 * CommandsGenerator — gera .kilo/commands/agentmap/*.md a partir de .ia/procedimentos/
 */

import * as path from 'path';
import * as fs from 'fs';
import type { GeneratorResult, CliContext } from '../cli/types';

export class CommandsGenerator {
  constructor(private ctx: CliContext) {}

  generate(): GeneratorResult[] {
    const results: GeneratorResult[] = [];
    const proceduresSource = path.join(this.ctx.agentMapRoot, '.ia', 'procedimentos');
    const commandsTarget = path.join(this.ctx.cwd, '.kilo', 'commands', 'agentmap');

    fs.mkdirSync(commandsTarget, { recursive: true });

    if (!fs.existsSync(proceduresSource)) {
      return [{ success: false, path: commandsTarget, action: 'skipped', message: '.ia/procedimentos não encontrado' }];
    }

    const files = fs.readdirSync(proceduresSource).filter((f) => f.endsWith('.md'));
    if (files.length === 0) {
      return [{ success: false, path: commandsTarget, action: 'skipped', message: 'Nenhum procedimento .md encontrado' }];
    }

    for (const file of files) {
      const sourcePath = path.join(proceduresSource, file);
      const targetPath = path.join(commandsTarget, file);
      const content = fs.readFileSync(sourcePath, 'utf-8');

      // Adiciona frontmatter para Kilo identificar como comando slash
      const withFrontmatter = this.wrapAsCommand(content, file);

      if (fs.existsSync(targetPath) && !this.ctx.force) {
        results.push({ success: true, path: targetPath, action: 'unchanged' });
        continue;
      }

      if (this.ctx.dryRun) {
        results.push({ success: true, path: targetPath, action: 'updated', message: '[dry-run]' });
        continue;
      }

      fs.writeFileSync(targetPath, withFrontmatter, 'utf-8');
      results.push({ success: true, path: targetPath, action: 'updated' });
    }

    return results;
  }

  private wrapAsCommand(content: string, filename: string): string {
    const slug = filename.replace(/\.md$/, '').replace(/-/g, ' ');
    const name = slug
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return `---
id: ${filename.replace(/\.md$/, '')}
name: ${name}
description: ${name}
type: command
---

${content}`;
  }
}
