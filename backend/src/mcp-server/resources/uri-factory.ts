export function solicitacoesUri(agenteId: string): string {
  return `agentmap://solicitacoes/${encodeURIComponent(agenteId)}`;
}

export function handoffsUri(agenteId: string): string {
  return `agentmap://handoffs/${encodeURIComponent(agenteId)}`;
}

export function bloqueiosUri(projetoId: string): string {
  return `agentmap://bloqueios/${encodeURIComponent(projetoId)}`;
}

export function parseSolicitacoesUri(uri: string): string | null {
  const match = uri.match(/^agentmap:\/\/solicitacoes\/(.+)$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

export function parseHandoffsUri(uri: string): string | null {
  const match = uri.match(/^agentmap:\/\/handoffs\/(.+)$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

export function parseBloqueiosUri(uri: string): string | null {
  const match = uri.match(/^agentmap:\/\/bloqueios\/(.+)$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

export function getResourceType(uri: string): string | null {
  if (uri.startsWith('agentmap://solicitacoes/')) return 'solicitacoes';
  if (uri.startsWith('agentmap://handoffs/')) return 'handoffs';
  if (uri.startsWith('agentmap://bloqueios/')) return 'bloqueios';
  return null;
}
