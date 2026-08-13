import { ProjetoService, ProjetoAberto } from '../../servicios';
import { ResultadoOperacao } from '../../tipos';
import { PathValidator, createPathValidator } from './pathValidator';
import * as path from 'path';

export interface ProjectAuth {
  projeto: ProjetoAberto;
  pathValidator: PathValidator;
}

export interface ProjectAuthOptions {
  allowlist?: string[];
  allowHidden?: boolean;
  denylist?: string[];
}

export const DEFAULT_PROJECT_OPTIONS: ProjectAuthOptions = {
  allowlist: [],
  allowHidden: true,
  denylist: [],
};

export class ProjectAuthService {
  private projetoService: ProjetoService;
  private defaultOptions: ProjectAuthOptions;

  constructor(projetoService: ProjetoService, defaultOptions: ProjectAuthOptions = DEFAULT_PROJECT_OPTIONS) {
    this.projetoService = projetoService;
    this.defaultOptions = defaultOptions;
  }

  getAuthorizedProject(options: ProjectAuthOptions = {}): ResultadoOperacao<ProjectAuth> {
    const opts = { ...this.defaultOptions, ...options };
    const result = this.projetoService.getProjetoAtual();
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    const projeto = result.dados;
    if (!projeto) {
      return {
        sucesso: false,
        erro: 'Nenhum projeto aberto. Abra ou crie um projeto primeiro.',
        codigoErro: 'NO_PROJECT_OPEN',
      };
    }

    if (!projeto.caminhoRaiz || !path.win32.isAbsolute(projeto.caminhoRaiz)) {
      return {
        sucesso: false,
        erro: 'Projeto aberto tem caminho raiz inválido',
        codigoErro: 'INVALID_PROJECT_PATH',
      };
    }

    const pathValidator = createPathValidator(projeto.caminhoRaiz, opts);

    return {
      sucesso: true,
      dados: {
        projeto,
        pathValidator,
      },
    };
  }

  isAuthorized(projetoId: string): boolean {
    const cached = this.projetoService.getProjetoCached(projetoId);
    return !!cached;
  }
}

export function createProjectAuthService(
  projetoService: ProjetoService,
  options: ProjectAuthOptions = DEFAULT_PROJECT_OPTIONS
): ProjectAuthService {
  return new ProjectAuthService(projetoService, options);
}

export { PathValidator, createPathValidator };
export { resolveProjectPath, isPathSafe } from '../../seguranca/paths';
