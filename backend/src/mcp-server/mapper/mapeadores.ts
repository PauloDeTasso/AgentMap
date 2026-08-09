import { ProjetoAberto } from 'servicios';
import { AgenteRegistro, AgentePerfil } from 'tipos';

export function mapearProjeto(projeto: ProjetoAberto): Record<string, unknown> {
  return {
    id: projeto.id,
    nome: projeto.nome,
    caminhoRaiz: projeto.caminhoRaiz,
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

export function mapearAgente(agente: AgentePerfil): Record<string, unknown> {
  return {
    id: agente.id,
    nome: agente.nome,
    funcao: agente.funcao,
    estado: agente.estado,
    conhecimentos: agente.conhecimentos || [],
    permissoes: agente.permissoes || {},
    dominios: agente.dominios || [],
    diretrizes: (agente as any).diretrizes || [],
    dataCriacao: (agente as any).dataCriacao,
    dataAtualizacao: (agente as any).dataAtualizacao,
  };
}

export function mapearAgenteRegistro(agente: AgenteRegistro): Record<string, unknown> {
  return {
    id: agente.id,
    nome: agente.nome,
    funcao: agente.funcao,
    estado: agente.estado,
  };
}
