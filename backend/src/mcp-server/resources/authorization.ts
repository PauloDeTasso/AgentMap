import { ProjetoAberto } from 'servicios';
import { getResourceType, parseBloqueiosUri, parseHandoffsUri, parseSolicitacoesUri } from './uri-factory';

export function authorizeResourceAccess(projeto: ProjetoAberto | null, uri: string): boolean {
  const tipo = getResourceType(uri);
  if (!tipo) return false;

  if (tipo === 'solicitacoes') {
    const agenteId = parseSolicitacoesUri(uri);
    if (!agenteId) return false;
    return !!projeto;
  }

  if (tipo === 'handoffs') {
    const agenteId = parseHandoffsUri(uri);
    if (!agenteId) return false;
    return !!projeto;
  }

  if (tipo === 'bloqueios') {
    const projetoId = parseBloqueiosUri(uri);
    if (!projetoId) return false;
    return projeto?.id === projetoId;
  }

  return false;
}
