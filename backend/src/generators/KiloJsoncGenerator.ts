/**
 * KiloJsoncGenerator — gera/atualiza kilo.jsonc a partir de .ia/agentmap.json.
 *
 * Seções gerenciadas:
 * - agent (subagentes)
 * - instructions
 * - plugin
 * - mcp.agentmap (command)
 *
 * Seções preservadas (não tocadas):
 * - model
 * - provider
 * - hide_prompt_training_models
 * - auto_collapse_reasoning
 */

import * as path from 'path';
import * as fs from 'fs';
import { readJsonc, mergeJsoncPreservingComments } from '../cli/utils/jsonc';
import type { GeneratorResult, CliContext } from '../cli/types';

export class KiloJsoncGenerator {
  constructor(private ctx: CliContext) {}

  generate(): GeneratorResult {
    const sourcePath = path.join(this.ctx.agentMapRoot, '.ia', 'agentmap.json');
    const targetPath = path.join(this.ctx.cwd, 'kilo.jsonc');

    if (!fs.existsSync(sourcePath)) {
      return {
        success: false,
        path: targetPath,
        action: 'skipped',
        message: `.ia/agentmap.json não encontrado em ${this.ctx.agentMapRoot}`,
      };
    }

    const agentMapConfig = JSON.parse(fs.readFileSync(sourcePath, 'utf-8')) as Record<string, unknown>;
    const updates = this.buildManagedUpdates(agentMapConfig);

    if (!fs.existsSync(targetPath)) {
      const content = this.buildNewKiloJsonc(agentMapConfig, updates);
      if (this.ctx.dryRun) {
        return { success: true, path: targetPath, action: 'created', message: '[dry-run]' };
      }
      fs.writeFileSync(targetPath, content, 'utf-8');
      return { success: true, path: targetPath, action: 'created' };
    }

    const original = fs.readFileSync(targetPath, 'utf-8');
    const managedKeys = Object.keys(updates);
    const merged = mergeJsoncPreservingComments(original, managedKeys, updates);

    if (merged === original) {
      return { success: true, path: targetPath, action: 'unchanged', message: 'Nenhuma alteração gerenciada detectada' };
    }

    if (this.ctx.dryRun) {
      return { success: true, path: targetPath, action: 'updated', message: '[dry-run]' };
    }

    fs.writeFileSync(targetPath, merged, 'utf-8');
    return { success: true, path: targetPath, action: 'updated' };
  }

  private buildManagedUpdates(agentMapConfig: Record<string, unknown>): Record<string, unknown> {
    const updates: Record<string, unknown> = {};

    // Plugin wakeup
    updates.plugin = ['./.kilo/plugin/agentmap-wakeup.ts'];

    // Instructions (paths relativos)
    const instructions: string[] = [];
    const agentDirs = this.getAgentDirectories();
    for (const dir of agentDirs) {
      const instPath = path.join(dir, 'instrucoes.md');
      const rel = path.relative(this.ctx.cwd, instPath).replace(/\\/g, '/');
      instructions.push(rel);
    }
    const perfisPath = path.join(this.ctx.agentMapRoot, '.ia', 'procedimentos', 'perfis-fase1-consolidado.md');
    const perfisRel = path.relative(this.ctx.cwd, perfisPath).replace(/\\/g, '/');
    instructions.push(perfisRel);
    instructions.push('AGENTS.md');
    updates.instructions = instructions;

    // Agents
    const agents: Record<string, unknown> = {};
    for (const dir of agentDirs) {
      const id = path.basename(dir);
      const jsonPath = path.join(dir, `${id}.json`);
      if (!fs.existsSync(jsonPath)) continue;
      const def = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as Record<string, unknown>;
      const instructionsRel: string[] = [];
      const instFile = path.join(dir, 'instrucoes.md');
      const rulesFile = path.join(dir, 'regras.md');
      if (fs.existsSync(instFile)) instructionsRel.push(path.relative(this.ctx.cwd, instFile).replace(/\\/g, '/'));
      if (fs.existsSync(rulesFile)) instructionsRel.push(path.relative(this.ctx.cwd, rulesFile).replace(/\\/g, '/'));

      agents[id] = {
        prompt: this.buildAgentPrompt(def),
        instructions: instructionsRel,
      };
    }
    updates.agent = agents;

    // MCP command
    updates.mcp = {
      agentmap: {
        type: 'local',
        command: [
          'cmd', '/c', 'npx', 'tsx',
          '--tsconfig', 'backend/tsconfig.json',
          'backend/src/mcp-server/index.ts'
        ],
        environment: { NODE_ENV: 'production' },
        enabled: true,
        timeout: 30000,
      },
    };

    return updates;
  }

  private buildAgentUpdates(agentMapConfig: Record<string, unknown>): Record<string, unknown> {
    const agents: Record<string, unknown> = {};
    const agentDirs = this.getAgentDirectories();

    for (const dir of agentDirs) {
      const id = path.basename(dir);
      const jsonPath = path.join(dir, `${id}.json`);
      if (!fs.existsSync(jsonPath)) continue;

      const def = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as Record<string, unknown>;
      const instructionsRel: string[] = [];
      const instFile = path.join(dir, 'instrucoes.md');
      const rulesFile = path.join(dir, 'regras.md');
      if (fs.existsSync(instFile)) {
        instructionsRel.push(path.relative(this.ctx.cwd, instFile).replace(/\\/g, '/'));
      }
      if (fs.existsSync(rulesFile)) {
        instructionsRel.push(path.relative(this.ctx.cwd, rulesFile).replace(/\\/g, '/'));
      }

      agents[id] = {
        prompt: this.buildAgentPrompt(def),
        instructions: instructionsRel,
      };
    }

    return agents;
  }

  private buildAgentPrompt(def: Record<string, unknown>): string {
    const nome = (def.nome as string) || def.id;
    const responsabilidades = (def.responsabilidades as string[]) || [];
    const responsabilidadesStr = responsabilidades.slice(0, 3).join(', ') || 'conforme definido';

    return `Você é o ${nome} do AgentMap. RESPONSABILIDADE: ${responsabilidadesStr}. NÃO altere arquivos fora do domínio sem solicitação de alteração aprovada.`;
  }

  private getAgentDirectories(): string[] {
    const agentsPath = path.join(this.ctx.agentMapRoot, '.ia', 'agentes');
    if (!fs.existsSync(agentsPath)) return [];
    return fs.readdirSync(agentsPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(agentsPath, d.name));
  }

  private buildNewKiloJsonc(
    agentMapConfig: Record<string, unknown>,
    updates: Record<string, unknown>
  ): string {
    const base: Record<string, unknown> = {
      $schema: 'https://app.kilo.ai/config.json',
      model: 'kilo/auto-free',
      hide_prompt_training_models: false,
      auto_collapse_reasoning: true,
    };

    // Preservar providers do config original se existirem
    if (agentMapConfig.provider) {
      base.provider = agentMapConfig.provider;
    } else {
      // Providers padrão mínimos
      base.provider = {
        google: { models: {} },
        openai: { models: {} },
        openrouter: { options: { apiKey: '${OPENROUTER_API_KEY}' }, models: {} },
      };
    }

    return JSON.stringify({ ...base, ...updates }, null, '\t') + '\n';
  }
}
