import { FileService } from '../../arquivos/FileService';
import * as path from 'path';

export interface SearchHit {
  arquivo: string;
  linha: number;
  conteudo: string;
  colunaInicio?: number;
}

export interface SearchArquivoHit {
  arquivo: string;
  linhas: number;
}

export const SOURCE_EXTENSIONS = new Set([
  '.ts', '.js', '.tsx', '.jsx', '.json', '.md', '.yaml', '.yml', '.html', '.css', '.txt'
]);

export const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', '.ia', 'dist', 'build', 'coverage'
]);

export interface SearchOptions {
  diretorio?: string;
  limite?: number;
  maxFileSize?: number;
  extensoes?: string[];
  excluirDirs?: string[];
}

export async function listarArquivosRecursivo(
  fs: FileService,
  dir: string,
  maxDepth: number = 10,
  extensoes?: Set<string>,
  excluirDirs: Set<string> = EXCLUDE_DIRS
): Promise<string[]> {
  const files: string[] = [];
  const queue: Array<{ dir: string; depth: number }> = [{ dir: dir || '.', depth: 0 }];

  while (queue.length > 0) {
    const { dir: current, depth } = queue.shift()!;
    if (depth > maxDepth) continue;

    const result = fs.listar(current);
    if (!result.sucesso || !result.dados) continue;

    for (const entry of result.dados) {
      if (entry.tipo === 'diretorio') {
        const lowerName = entry.nome.toLowerCase();
        if (excluirDirs.has(lowerName)) continue;
        const nextDir = path.posix.join(current, entry.nome);
        queue.push({ dir: nextDir, depth: depth + 1 });
      } else {
        if (extensoes) {
          const ext = path.posix.extname(entry.nome).toLowerCase();
          if (!extensoes.has(ext)) continue;
        }
        files.push(path.posix.join(current, entry.nome));
      }
    }
  }
  return files;
}

export async function buscarEmArquivos(
  fs: FileService,
  diretorio: string,
  padrao: RegExp,
  opcoes: {
    limite?: number;
    extensoes?: Set<string>;
    excluirDirs?: Set<string>;
    maxFileSize?: number;
  } = {}
): Promise<SearchHit[]> {
  const limite = opcoes.limite || 50;
  const extensoes = opcoes.extensoes || SOURCE_EXTENSIONS;
  const excluirDirs = opcoes.excluirDirs || EXCLUDE_DIRS;
  const maxFileSize = opcoes.maxFileSize || 1_000_000;

  const files = await listarArquivosRecursivo(fs, diretorio, 10, extensoes, excluirDirs);
  const hits: SearchHit[] = [];

  for (const file of files) {
    const readResult = fs.ler(file);
    if (!readResult.sucesso || !readResult.dados) continue;

    const content = readResult.dados;
    if (content.length > maxFileSize) continue;

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (hits.length >= limite) break;
      const line = lines[i];
      const match = padrao.exec(line);
      if (match) {
        hits.push({
          arquivo: file,
          linha: i + 1,
          conteudo: line.trim(),
          colunaInicio: match.index,
        });
      }
    }
  }

  return hits.slice(0, limite);
}

export async function buscarTermoEmArquivos(
  fs: FileService,
  diretorio: string,
  termo: string,
  opcoes: {
    limite?: number;
    caseSensitive?: boolean;
    extensoes?: Set<string>;
    excluirDirs?: Set<string>;
  } = {}
): Promise<SearchHit[]> {
  const flags = opcoes.caseSensitive ? 'g' : 'gi';
  const escaped = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const padrao = new RegExp(escaped, flags);
  return buscarEmArquivos(fs, diretorio, padrao, opcoes);
}

export async function buscarSimboloDefinicoes(
  fs: FileService,
  diretorio: string,
  simbolo: string,
  tipo: 'funcao' | 'classe' | 'variavel' | 'constante' | 'interface' | 'todos',
  limite: number
): Promise<SearchHit[]> {
  const patterns: RegExp[] = [];
  const escaped = simbolo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (tipo === 'funcao' || tipo === 'todos') {
    patterns.push(new RegExp(`\\bfunction\\s+${escaped}\\b`, 'gi'));
    patterns.push(new RegExp(`\\bconst\\s+${escaped}\\s*=`, 'gi'));
    patterns.push(new RegExp(`\\bconst\\s+{}\\s*=\\s*${escaped}`, 'gi'));
    patterns.push(new RegExp(`\\b${escaped}\\s*=\\s*\\(`, 'gi'));
  }
  if (tipo === 'classe' || tipo === 'todos') {
    patterns.push(new RegExp(`\\bclass\\s+${escaped}\\b`, 'gi'));
    patterns.push(new RegExp(`\\babstract\\s+class\\s+${escaped}\\b`, 'gi'));
  }
  if (tipo === 'variavel' || tipo === 'todos') {
    patterns.push(new RegExp(`\\b(?:const|let|var)\\s+${escaped}\\b`, 'gi'));
  }
  if (tipo === 'constante' || tipo === 'todos') {
    patterns.push(new RegExp(`\\bconst\\s+${escaped}\\b`, 'g'));
  }
  if (tipo === 'interface' || tipo === 'todos') {
    patterns.push(new RegExp(`\\binterface\\s+${escaped}\\b`, 'gi'));
    patterns.push(new RegExp(`\\btype\\s+${escaped}\\b`, 'gi'));
  }

  const allPatterns = patterns;
  const hits: SearchHit[] = [];
  const files = await listarArquivosRecursivo(fs, diretorio, 10, SOURCE_EXTENSIONS, EXCLUDE_DIRS);

  for (const file of files) {
    if (hits.length >= limite) break;
    const readResult = fs.ler(file);
    if (!readResult.sucesso || !readResult.dados) continue;
    const content = readResult.dados;
    if (content.length > 1_000_000) continue;
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (hits.length >= limite) break;
      const line = lines[i];
      for (const pattern of allPatterns) {
        const match = pattern.exec(line);
        if (match) {
          hits.push({
            arquivo: file,
            linha: i + 1,
            conteudo: line.trim(),
            colunaInicio: match.index,
          });
          pattern.lastIndex = 0;
          break;
        }
      }
    }
  }

  return hits;
}
