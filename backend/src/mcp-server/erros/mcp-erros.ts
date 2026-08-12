export function isMcpError(content: Array<{ type: string; text: string }>): { codigo: string; mensagem: string } | null {
  if (!content || content.length === 0) return null;
  try {
    const parsed = JSON.parse(content[0].text);
    if (!parsed.sucesso) {
      return {
        codigo: parsed.codigo || 'UNKNOWN_ERROR',
        mensagem: parsed.mensagem || parsed.erro || 'Erro desconhecido'
      };
    }
    return null;
  } catch {
    return null;
  }
}
