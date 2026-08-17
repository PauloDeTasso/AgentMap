import * as path from 'path';
import * as fs from 'fs';
import { AgentePerfil } from '../tipos';

export class PathTraversalError extends Error {
  public readonly tipo = 'PATH_TRAVERSAL';
  constructor(public readonly message: string, public readonly caminho: string) {
    super(message);
    this.name = 'PathTraversalError';
  }
}

export interface ValidacaoCaminhoResult {
  caminhoAbsoluto: string;
  caminhoRelativo: string;
  dentroDaRaiz: boolean;
}

export function normalizePath(input: string): string {
  return path.win32.normalize(input).replace(/\\/g, '/');
}

export function resolveProjectPath(projectRoot: string, relPath: string): ValidacaoCaminhoResult {
  const root = path.win32.resolve(projectRoot);
  const rel = normalizePath(relPath).replace(/^\/+/, '');
  const absoluto = path.win32.resolve(root, rel);
  const relativo = path.win32.relative(root, absoluto).replace(/\\/g, '/');
  const dentroDaRaiz = absoluto === root || absoluto.startsWith(root + path.win32.sep);
  if (!dentroDaRaiz) {
    throw new PathTraversalError(`Caminho '${relPath}' escapa da raiz do projeto`, relPath);
  }

  try {
    const real = fs.realpathSync(absoluto);
    const realRel = path.win32.relative(root, real).replace(/\\/g, '/');
    const realDentro = real === root || real.startsWith(root + path.win32.sep);
    if (!realDentro) {
      throw new PathTraversalError(`Caminho '${relPath}' escapa da raiz via symlink/junction (real: ${realRel})`, relPath);
    }
  } catch (e: any) {
    if (e instanceof PathTraversalError) throw e;
    if (e instanceof Error && (e as any).code !== 'ENOENT') {
      throw new PathTraversalError(`Erro ao resolver symlink para '${relPath}': ${e.message}`, relPath);
    }
  }

  return { caminhoAbsoluto: absoluto, caminhoRelativo: relativo, dentroDaRaiz: true };
}

export function resolveIaPath(projectRoot: string, relPath: string): ValidacaoCaminhoResult {
  const root = path.win32.resolve(projectRoot);
  const iaRoot = path.win32.join(root, '.ia');
  const rel = normalizePath(relPath).replace(/^\.ia\/?/, '').replace(/^\/+/, '');
  const absoluto = path.win32.resolve(iaRoot, rel);
  const dentroDaRaiz = absoluto === iaRoot || absoluto.startsWith(iaRoot + path.win32.sep);
  if (!dentroDaRaiz) {
    throw new PathTraversalError(`Caminho '${relPath}' escapa do diretório .ia/`, relPath);
  }
  const relativo = path.win32.relative(iaRoot, absoluto).replace(/\\/g, '/');
  return { caminhoAbsoluto: absoluto, caminhoRelativo: relativo, dentroDaRaiz };
}

export function isPathSafe(projectRoot: string, relPath: string): boolean {
  try {
    resolveProjectPath(projectRoot, relPath);
    return true;
  } catch {
    return false;
  }
}

export function matchesPattern(relPath: string, patterns: string[]): boolean {
  const normalized = normalizePath(relPath);
  return patterns.some((pattern) => {
    const p = pattern.replace(/\\/g, '/');
    if (p === '/**') {
      return true;
    }
    if (p.endsWith('/**')) {
      const prefix = p.slice(0, -3);
      return normalized === prefix || normalized.startsWith(prefix + '/');
    }
    if (p.includes('*')) {
      let regex = '';
      let i = 0;
      while (i < p.length) {
        if (p[i] === '*' && p[i + 1] === '*') {
          regex += '.*';
          i += 2;
        } else if (p[i] === '*') {
          regex += '[^/]*';
          i += 1;
        } else {
          const c = p[i];
          regex += c === '.' || '+?()[]{}^$|'.includes(c) ? '\\' + c : c;
          i += 1;
        }
      }
      return new RegExp('^' + regex + '$').test(normalized);
    }
    return normalized === p || normalized.startsWith(p + '/');
  });
}

export function validateAgentDirectoryAccess(
  projectRoot: string,
  relPath: string,
  perfil: AgentePerfil
): { permitido: boolean; motivo: string | null } {
  const normalized = normalizePath(relPath);
  const prohibited = matchesPattern(normalized, perfil.diretoriosProibidos);
  if (prohibited) {
    return { permitido: false, motivo: `Diretório proibido: ${normalized}` };
  }
  if (perfil.diretoriosPermitidos.length > 0 && !matchesPattern(normalized, perfil.diretoriosPermitidos)) {
    return { permitido: false, motivo: `Diretório não autorizado: ${normalized}` };
  }
  return { permitido: true, motivo: null };
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
}

export function sanitizeInput(input: string, maxLength = 4096): string {
  if (typeof input !== 'string') return '';
  return input.slice(0, maxLength).trim();
}

export function isDentroDeDiretorioFilho(absPath: string, baseDir: string): boolean {
  const normalized = path.win32.normalize(absPath);
  const baseNormalized = path.win32.normalize(baseDir);
  return normalized === baseNormalized || normalized.startsWith(baseNormalized + path.win32.sep);
}
