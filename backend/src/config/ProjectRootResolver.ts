import * as path from 'path';
import * as fs from 'fs';

/**
 * ProjectRootResolver — Resolve o raiz do projeto (onde .ia/ está).
 * 
 * Substitui GERENCIADOR_DIR: em vez de apontar para a pasta do AgentMap,
 * aponta para o projeto atual (single-project mode).
 * 
 * Resolução (em ordem):
 * 1. Variável de ambiente AGENTMAP_PROJECT_ROOT
 * 2. Busca ascendente por .ia/ a partir de cwd
 * 3. Fallback: cwd
 */
export class ProjectRootResolver {
  private static cachedRoot: string | null = null;

  static resolve(cwd?: string): string {
    if (this.cachedRoot) {
      return this.cachedRoot;
    }

    // 1. Env var
    const envRoot = process.env.AGENTMAP_PROJECT_ROOT;
    if (envRoot && fs.existsSync(envRoot)) {
      this.cachedRoot = path.resolve(envRoot);
      return this.cachedRoot;
    }

    // 2. Busca ascendente por .ia/
    const startDir = cwd || process.cwd();
    let current = path.resolve(startDir);
    const root = path.parse(current).root;

    while (current !== root) {
      const iaPath = path.join(current, '.ia');
      if (fs.existsSync(iaPath) && fs.statSync(iaPath).isDirectory()) {
        this.cachedRoot = current;
        return this.cachedRoot;
      }
      current = path.dirname(current);
    }

    // 3. Fallback: cwd
    this.cachedRoot = path.resolve(startDir);
    return this.cachedRoot;
  }

  static reset(): void {
    this.cachedRoot = null;
  }

  static get iaPath(): string {
    return path.join(this.resolve(), '.ia');
  }

  static resolveFromIA(relativePath: string): string {
    return path.join(this.iaPath, relativePath);
  }
}

export const PROJECT_ROOT = ProjectRootResolver.resolve();
export const IA_PATH = ProjectRootResolver.iaPath;
