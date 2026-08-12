import { ProjetoAberto } from 'servicios';
import { Agente } from 'tipos';

export function mapearProjeto(projeto: ProjetoAberto): Record<string, unknown> {
  return {
    id: projeto.id,
    nome: projeto.nome,
    caminhoRaiz: projeto.caminhoRaiz,
    descricao: projeto.descricao,
    config: projeto.config,
  };
}

export function mapearArquitetura(
  config: Record<string, unknown> | null,
  estado: unknown,
  estadoGit: unknown
): Record<string, unknown> {
  return {
    config,
    estado,
    estadoGit,
  };
}

export function mapearAgente(agente: Agente): Record<string, unknown> {
  return {
    id: agente.id,
    nome: agente.nome,
    funcao: agente.funcao,
    estado: agente.estado,
    conhecimentos: agente.conhecimentos || [],
    permissoes: agente.permissoes || {},
    dominios: agente.dominios || [],
    diretrizes: agente.diretrizes || [],
    dataCriacao: agente.dataCriacao,
    dataAtualizacao: agente.dataAtualizacao,
  };
}

export function mapearAgenteRegistro(agente: Agente): Record<string, unknown> {
  return {
    id: agente.id,
    nome: agente.nome,
    funcao: agente.funcao,
    estado: agente.estado,
  };
}
