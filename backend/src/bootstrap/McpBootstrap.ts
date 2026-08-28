/**
 * McpBootstrap — verifica e constrói o MCP server do AgentMap.
 *
 * Fluxo:
 * 1. Verifica se `.ia/runtime/mcp/dist/main.js` existe
 * 2. Se não existir, executa `npm install && npm run build` dentro de `.ia/runtime/mcp/`
 * 3. Atualiza `kilo.jsonc` para apontar para o MCP buildado
 */

import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import type { CliContext } from '../cli/types';

export class McpBootstrap {
  constructor(private ctx: CliContext) {}

  async bootstrap(): Promise<{ success: boolean; message: string; built: boolean }> {
    const mcpDist = path.join(this.ctx.agentMapRoot, '.ia', 'runtime', 'mcp', 'dist', 'main.js');
    const mcpDir = path.join(this.ctx.agentMapRoot, '.ia', 'runtime', 'mcp');

    if (fs.existsSync(mcpDist)) {
      return { success: true, message: 'MCP já buildado', built: false };
    }

    if (!fs.existsSync(mcpDir)) {
      return { success: true, message: '.ia/runtime/mcp/ não existe — bootstrap pulado', built: false };
    }

    const packageJsonPath = path.join(mcpDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return { success: true, message: 'package.json do MCP não encontrado — bootstrap pulado', built: false };
    }

    try {
      await this.runCommand(mcpDir, 'npm', ['install']);
      await this.runCommand(mcpDir, 'npm', ['run', 'build']);

      if (!fs.existsSync(mcpDist)) {
        return { success: false, message: 'Build concluído, mas main.js não foi gerado', built: true };
      }

      await this.updateKiloJsonc(mcpDist);

      return { success: true, message: 'MCP buildado com sucesso', built: true };
    } catch (err) {
      return { success: false, message: `Falha no bootstrap MCP: ${err instanceof Error ? err.message : String(err)}`, built: false };
    }
  }

  private runCommand(cwd: string, command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd,
        stdio: 'pipe',
        shell: true,
        env: { ...process.env, NODE_ENV: 'production' },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command ${command} ${args.join(' ')} failed with code ${code}: ${stderr || stdout}`));
        }
      });
    });
  }

  private async updateKiloJsonc(mcpDistPath: string): Promise<void> {
    const targetPath = path.join(this.ctx.cwd, 'kilo.jsonc');
    if (!fs.existsSync(targetPath)) {
      return;
    }

    const content = fs.readFileSync(targetPath, 'utf-8');
    const relativePath = path.relative(this.ctx.cwd, mcpDistPath).replace(/\\/g, '/');

    // Substitui o comando MCP para apontar diretamente para o buildado
    const newCommand = `\t\t\t"command": [\n\t\t\t\t"node",\n\t\t\t\t"${relativePath}"\n\t\t\t]`;

    const updated = content.replace(
      /"command":\s*\[\n\t*\s*"cmd"\n\t*\s*,\n\t*\s*"\/c"\n\t*\s*,\n\t*\s*"npx"\n\t*\s*,\n\t*\s*"tsx"\n\t*\s*,\n\t*\s*"--tsconfig"\n\t*\s*,\n\t*\s*"backend\/tsconfig\.json"\n\t*\s*,\n\t*\s*"backend\/src\/mcp-server\/index\.ts"\n\t*\s*\]/,
      newCommand
    );

    if (updated !== content) {
      fs.writeFileSync(targetPath, updated, 'utf-8');
    }
  }
}
