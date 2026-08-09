import * as path from 'path';
import { resolveProjectPath, isPathSafe as isPathSafeBase, PathTraversalError, normalizePath } from '../../seguranca/paths';
import { sanitizeInput as sanitizeInputBase } from '../../seguranca/paths';

export interface ValidatedPath {
  caminhoAbsoluto: string;
  caminhoRelativo: string;
  dentroDaRaiz: boolean;
}

export interface PathValidatorOptions {
  allowlist?: string[];
  allowHidden?: boolean;
  denylist?: string[];
}

export const DEFAULT_OUTPUT_LIMITS = {
  maxResults: 100,
  maxSnippetLines: 200,
  maxContentBytes: 100_000,
  maxSearchResults: 50,
} as const;

export const DEFAULT_PATH_VALIDATOR_OPTIONS: PathValidatorOptions = {
  allowlist: [],
  allowHidden: false,
  denylist: [],
};

export class PathValidator {
  readonly projectRoot: string;
  readonly allowlist: string[];
  readonly allowHidden: boolean;
  readonly denylist: string[];

  constructor(projectRoot: string, options: PathValidatorOptions = {}) {
    this.projectRoot = path.win32.resolve(projectRoot);
    this.allowlist = options.allowlist || [];
    this.allowHidden = options.allowHidden ?? true;
    this.denylist = options.denylist || [];
  }

  validate(caminhoRelativo: string): ValidatedPath {
    const rel = normalizePath(caminhoRelativo || '').replace(/^\/+/, '');
    if (!rel) {
      throw new PathTraversalError('Caminho relativo vazio', caminhoRelativo);
    }

    if (!this.isAllowed(rel)) {
      throw new PathTraversalError(`Caminho '${rel}' não está na allowlist de diretórios MCP`, caminhoRelativo);
    }

    if (this.isDenied(rel)) {
      throw new PathTraversalError(`Caminho '${rel}' está na denylist de diretórios MCP`, caminhoRelativo);
    }

    if (!this.allowHidden) {
      const parts = rel.split('/');
      for (const part of parts) {
        if (part.startsWith('.')) {
          throw new PathTraversalError(`Caminho '${rel}' aponta para diretório/arquivo oculto`, caminhoRelativo);
        }
      }
    }

    try {
      const result = resolveProjectPath(this.projectRoot, rel);
      if (!result.dentroDaRaiz) {
        throw new PathTraversalError(`Caminho '${rel}' escapa da raiz do projeto`, caminhoRelativo);
      }
      return {
        caminhoAbsoluto: result.caminhoAbsoluto,
        caminhoRelativo: result.caminhoRelativo,
        dentroDaRaiz: true,
      };
    } catch (e) {
      if (e instanceof PathTraversalError) throw e;
      throw new PathTraversalError(`Erro ao validar caminho '${rel}'`, caminhoRelativo);
    }
  }

  isPathSafe(caminhoRelativo: string): boolean {
    return isPathSafeBase(this.projectRoot, caminhoRelativo);
  }

  private isAllowed(relPath: string): boolean {
    if (this.allowlist.length === 0) return true;
    return this.allowlist.some((pattern) => {
      const p = pattern.replace(/\\/g, '/');
      if (p === '/**' || p === '*') return true;
      if (p.endsWith('/**')) {
        const prefix = p.slice(0, -3);
        return relPath === prefix || relPath.startsWith(prefix + '/') || relPath.startsWith(prefix.replace(/\/$/, '') + '/');
      }
      return relPath === p || relPath.startsWith(p + '/');
    });
  }

  private isDenied(relPath: string): boolean {
    return this.denylist.some((pattern) => {
      const p = pattern.replace(/\\/g, '/');
      if (p === '/**' || p === '*') return true;
      if (p.endsWith('/**')) {
        const prefix = p.slice(0, -3);
        return relPath === prefix || relPath.startsWith(prefix + '/');
      }
      return relPath === p || relPath.startsWith(p + '/');
    });
  }
}

export function createPathValidator(
  projectRoot: string,
  options: PathValidatorOptions = {}
): PathValidator {
  return new PathValidator(projectRoot, options);
}

export { sanitizeInputBase as sanitizeInput };
