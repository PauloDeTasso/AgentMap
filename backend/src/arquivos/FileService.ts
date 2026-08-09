import * as fs from 'fs';
import * as path from 'path';
import { ArquivoInfo, ResultadoOperacao } from '../tipos';
import { resolveProjectPath, PathTraversalError, isPathSafe } from '../seguranca/paths';

export class FileService {
  constructor(private projectRoot: string) {}

  getCaminhoAbsoluto(caminhoRelativo: string): string {
    return this.resolve(caminhoRelativo).caminhoAbsoluto;
  }

  private resolve(relPath: string) {
    return resolveProjectPath(this.projectRoot, relPath);
  }

  listar(caminhoRelativo: string = '.'): ResultadoOperacao<ArquivoInfo[]> {
    try {
      const { caminhoAbsoluto } = this.resolve(caminhoRelativo);
      if (!fs.existsSync(caminhoAbsoluto)) {
        return { sucesso: false, erro: 'Diretório não encontrado', codigoErro: 'DIR_NOT_FOUND' };
      }
      const stats = fs.statSync(caminhoAbsoluto);
      if (!stats.isDirectory()) {
        return { sucesso: false, erro: 'Caminho não é um diretório', codigoErro: 'NOT_A_DIRECTORY' };
      }
      const entries = fs.readdirSync(caminhoAbsoluto, { withFileTypes: true });
      const infos: ArquivoInfo[] = entries.map((entry) => {
        const fullPath = path.join(caminhoAbsoluto, entry.name);
        const relPath = path.win32.relative(caminhoAbsoluto, fullPath).replace(/\\/g, '/');
        const entryStats: fs.Stats = entry.isSymbolicLink() ? fs.statSync(fullPath) : (entry.isDirectory() ? fs.statSync(fullPath) : fs.statSync(fullPath));
        return {
          caminho: relPath,
          nome: entry.name,
          tipo: entryStats.isDirectory() ? 'diretorio' : 'arquivo',
          tamanho: entryStats.isFile() ? entryStats.size : 0,
          modificadoEm: entryStats.mtime.toISOString(),
          extensao: path.win32.extname(entry.name).replace('.', '')
        };
      });
      return { sucesso: true, dados: infos };
    } catch (e) {
      if (e instanceof PathTraversalError) {
        return { sucesso: false, erro: e.message, codigoErro: 'PATH_TRAVERSAL' };
      }
      return { sucesso: false, erro: (e as Error).message, codigoErro: 'FS_ERROR' };
    }
  }

  ler(caminhoRelativo: string): ResultadoOperacao<string> {
    try {
      const { caminhoAbsoluto } = this.resolve(caminhoRelativo);
      if (!fs.existsSync(caminhoAbsoluto)) {
        return { sucesso: false, erro: 'Arquivo não encontrado', codigoErro: 'FILE_NOT_FOUND' };
      }
      const stats = fs.statSync(caminhoAbsoluto);
      if (!stats.isFile()) {
        return { sucesso: false, erro: 'Caminho não é um arquivo', codigoErro: 'NOT_A_FILE' };
      }
      const data = fs.readFileSync(caminhoAbsoluto, 'utf-8');
      return { sucesso: true, dados: data };
    } catch (e) {
      if (e instanceof PathTraversalError) {
        return { sucesso: false, erro: e.message, codigoErro: 'PATH_TRAVERSAL' };
      }
      return { sucesso: false, erro: (e as Error).message, codigoErro: 'FS_ERROR' };
    }
  }

  escrever(caminhoRelativo: string, conteudo: string, opcoes: { backup?: boolean } = {}): ResultadoOperacao<string> {
    try {
      const { caminhoAbsoluto } = this.resolve(caminhoRelativo);
      const dir = path.dirname(caminhoAbsoluto);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (opcoes.backup && fs.existsSync(caminhoAbsoluto)) {
        this.criarBackup(caminhoAbsoluto);
      }
      const tmpPath = caminhoAbsoluto + '.tmp-' + Date.now() + '-' + Math.random().toString(16).slice(2);
      fs.writeFileSync(tmpPath, conteudo, 'utf-8');
      fs.renameSync(tmpPath, caminhoAbsoluto);
      const relPath = path.win32.relative(this.projectRoot, caminhoAbsoluto).replace(/\\/g, '/');
      return { sucesso: true, dados: relPath };
    } catch (e) {
      if (e instanceof PathTraversalError) {
        return { sucesso: false, erro: e.message, codigoErro: 'PATH_TRAVERSAL' };
      }
      return { sucesso: false, erro: (e as Error).message, codigoErro: 'FS_ERROR' };
    }
  }

  excluir(caminhoRelativo: string, opcoes: { backup?: boolean } = {}): ResultadoOperacao<string> {
    try {
      const { caminhoAbsoluto } = this.resolve(caminhoRelativo);
      if (!fs.existsSync(caminhoAbsoluto)) {
        return { sucesso: false, erro: 'Arquivo/diretório não encontrado', codigoErro: 'NOT_FOUND' };
      }
      if (opcoes.backup) {
        this.criarBackup(caminhoAbsoluto);
      }
      const stats = fs.statSync(caminhoAbsoluto);
      if (stats.isDirectory()) {
        fs.rmSync(caminhoAbsoluto, { recursive: true, force: true });
      } else {
        fs.unlinkSync(caminhoAbsoluto);
      }
      const relPath = path.win32.relative(this.projectRoot, caminhoAbsoluto).replace(/\\/g, '/');
      return { sucesso: true, dados: relPath };
    } catch (e) {
      if (e instanceof PathTraversalError) {
        return { sucesso: false, erro: e.message, codigoErro: 'PATH_TRAVERSAL' };
      }
      return { sucesso: false, erro: (e as Error).message, codigoErro: 'FS_ERROR' };
    }
  }

  criarDiretorio(caminhoRelativo: string): ResultadoOperacao<string> {
    try {
      const { caminhoAbsoluto } = this.resolve(caminhoRelativo);
      if (!fs.existsSync(caminhoAbsoluto)) {
        fs.mkdirSync(caminhoAbsoluto, { recursive: true });
      }
      const relPath = path.win32.relative(this.projectRoot, caminhoAbsoluto).replace(/\\/g, '/');
      return { sucesso: true, dados: relPath };
    } catch (e) {
      if (e instanceof PathTraversalError) {
        return { sucesso: false, erro: e.message, codigoErro: 'PATH_TRAVERSAL' };
      }
      return { sucesso: false, erro: (e as Error).message, codigoErro: 'FS_ERROR' };
    }
  }

  existe(caminhoRelativo: string): boolean {
    try {
      const { caminhoAbsoluto } = this.resolve(caminhoRelativo);
      return fs.existsSync(caminhoAbsoluto);
    } catch {
      return false;
    }
  }

  lerJson<T>(caminhoRelativo: string): ResultadoOperacao<T> {
    const result = this.ler(caminhoRelativo);
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    try {
      return { sucesso: true, dados: JSON.parse(result.dados) as T };
    } catch (e) {
      return { sucesso: false, erro: 'JSON inválido', codigoErro: 'INVALID_JSON' };
    }
  }

  escreverJson(caminhoRelativo: string, dados: unknown, opcoes: { backup?: boolean } = {}): ResultadoOperacao<string> {
    const conteudo = JSON.stringify(dados, null, 2);
    return this.escrever(caminhoRelativo, conteudo, opcoes);
  }

  private criarBackup(absPath: string): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.projectRoot, '.ia', '.backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const relPath = path.win32.relative(this.projectRoot, absPath).replace(/\\/g, '/');
    const backupPath = path.join(backupDir, `${relPath}-${timestamp}`);
    const backupParent = path.dirname(backupPath);
    fs.mkdirSync(backupParent, { recursive: true });
    if (fs.existsSync(absPath)) {
      const stats = fs.statSync(absPath);
      if (stats.isDirectory()) {
        fs.cpSync(absPath, backupPath, { recursive: true });
      } else {
        fs.copyFileSync(absPath, backupPath);
      }
    }
  }

  protegerArquivo(caminhoRelativo: string): ResultadoOperacao<Buffer> {
    try {
      const { caminhoAbsoluto } = this.resolve(caminhoRelativo);
      if (!fs.existsSync(caminhoAbsoluto) || !fs.statSync(caminhoAbsoluto).isFile()) {
        return { sucesso: false, erro: 'Arquivo não encontrado', codigoErro: 'FILE_NOT_FOUND' };
      }
      return { sucesso: true, dados: fs.readFileSync(caminhoAbsoluto) };
    } catch (e) {
      if (e instanceof PathTraversalError) {
        return { sucesso: false, erro: e.message, codigoErro: 'PATH_TRAVERSAL' };
      }
      return { sucesso: false, erro: (e as Error).message, codigoErro: 'FS_ERROR' };
    }
  }

  isSafe(caminhoRelativo: string): boolean {
    return isPathSafe(this.projectRoot, caminhoRelativo);
  }
}
