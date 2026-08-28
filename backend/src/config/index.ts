import * as path from 'path';
import * as fs from 'fs';
import { ProjectRootResolver } from './ProjectRootResolver';

/**
 * Configuração do AgentMap — Single-Project Mode.
 * 
 * Removidos (multi-tenant):
 * - GERENCIADOR_DIR
 * - LOCAL_DIR
 * - cachedSettings (global mutável)
 * - Registro de projetos
 * 
 * Mantidos:
 * - Settings simples (porta, idioma, limites MCP)
 * - ensureDir utilitário
 */

export interface GerenciadorSettings {
  idioma: string;
  portaApi: number;
  postgresConectado: boolean;
  postgresConfig: {
    host: string;
    porta: number;
    banco: string;
    usuario: string;
  };
  limitesMcp?: Record<string, unknown>;
}

const DEFAULT_SETTINGS: GerenciadorSettings = {
  idioma: 'pt-BR',
  portaApi: 3150,
  postgresConectado: false,
  postgresConfig: {
    host: 'localhost',
    porta: 5432,
    banco: 'agentmap',
    usuario: 'postgres'
  }
};

/** Diretório .local para arquivos internos (settings, cache) */
export function getLocalDir(): string {
  return path.join(ProjectRootResolver.resolve(), '.local');
}

export function loadSettings(): GerenciadorSettings {
  const localDir = getLocalDir();
  const settingsPath = path.join(localDir, 'settings.json');
  
  if (fs.existsSync(settingsPath)) {
    try {
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<GerenciadorSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: GerenciadorSettings): void {
  const localDir = getLocalDir();
  const settingsPath = path.join(localDir, 'settings.json');
  ensureDir(localDir);
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Re-export para compatibilidade
export { ProjectRootResolver };
