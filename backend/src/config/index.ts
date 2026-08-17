import * as path from 'path';
import * as fs from 'fs';
import { RegistroProjetos, ProjetoRegistro } from '../tipos';

export const GERENCIADOR_DIR = path.resolve(__dirname, '..', '..');
export const LOCAL_DIR = path.join(GERENCIADOR_DIR, '.local');
export const REGISTRO_PROJETOS_PATH = path.join(LOCAL_DIR, 'registro-projetos.json');

export interface GerenciadorSettings {
  diretorioProjetosDefault: string;
  idioma: string;
  portaApi: number;
  postgresConectado: boolean;
  postgresConfig: {
    host: string;
    porta: number;
    banco: string;
    usuario: string;
  };
  apiKey?: string;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  limitesMcp?: Record<string, unknown>;
}

const DEFAULT_SETTINGS: GerenciadorSettings = {
  diretorioProjetosDefault: 'G:\\PROJETOS\\AgenteMap_Projetos',
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

let cachedSettings: GerenciadorSettings | null = null;

export function getLocalDir(): string {
  return LOCAL_DIR;
}

export function getDiretorioProjetosDefault(): string {
  return loadSettings().diretorioProjetosDefault;
}

export function loadSettings(): GerenciadorSettings {
  if (cachedSettings) return { ...cachedSettings };
  const settingsPath = path.join(LOCAL_DIR, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    try {
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<GerenciadorSettings>;
      cachedSettings = { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      cachedSettings = { ...DEFAULT_SETTINGS };
    }
  } else {
    cachedSettings = { ...DEFAULT_SETTINGS };
  }
  return { ...cachedSettings };
}

export function saveSettings(settings: GerenciadorSettings): void {
  cachedSettings = { ...settings };
  const settingsPath = path.join(LOCAL_DIR, 'settings.json');
  ensureDir(LOCAL_DIR);
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function loadRegistroProjetos(): RegistroProjetos {
  ensureDir(LOCAL_DIR);
  if (!fs.existsSync(REGISTRO_PROJETOS_PATH)) {
    const empty: RegistroProjetos = { projetos: [], projetoAtual: null };
    fs.writeFileSync(REGISTRO_PROJETOS_PATH, JSON.stringify(empty, null, 2), 'utf-8');
    return empty;
  }
  try {
    const raw = fs.readFileSync(REGISTRO_PROJETOS_PATH, 'utf-8');
    return JSON.parse(raw) as RegistroProjetos;
  } catch {
    return { projetos: [], projetoAtual: null };
  }
}

export function saveRegistroProjetos(registro: RegistroProjetos): void {
  ensureDir(LOCAL_DIR);
  fs.writeFileSync(REGISTRO_PROJETOS_PATH, JSON.stringify(registro, null, 2), 'utf-8');
}

export function registrarProjeto(registro: RegistroProjetos, projeto: ProjetoRegistro): RegistroProjetos {
  const existing = registro.projetos.findIndex((p) => p.id === projeto.id);
  if (existing >= 0) {
    registro.projetos[existing] = projeto;
  } else {
    registro.projetos.push(projeto);
  }
  saveRegistroProjetos(registro);
  return registro;
}

export function removerProjetoDoRegistro(registro: RegistroProjetos, id: string): RegistroProjetos {
  registro.projetos = registro.projetos.filter((p) => p.id !== id);
  if (registro.projetoAtual === id) {
    registro.projetoAtual = null;
  }
  saveRegistroProjetos(registro);
  return registro;
}
