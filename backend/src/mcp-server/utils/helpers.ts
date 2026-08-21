import { ResultadoOperacao } from '../../tipos';

export function safeStringify(obj: unknown): string {
  if (obj === undefined || obj === null) {
    return 'null';
  }
  const seen = new WeakSet();
  const result = JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    },
    2
  );
  return result === undefined ? 'null' : result;
}

export type McpContent = {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export function toMcpStructured(dados: unknown): { content: Array<{ type: 'text'; text: string }>; structuredContent: Record<string, unknown> } {
  let structured: Record<string, unknown>;
  if (Array.isArray(dados)) {
    structured = { data: dados };
  } else if (dados !== null && typeof dados === 'object') {
    structured = dados as Record<string, unknown>;
  } else {
    structured = { data: dados };
  }
  return {
    content: [
      {
        type: 'text',
        text: safeStringify(dados)
      }
    ],
    structuredContent: structured
  };
}

export function mcpError(resultado: ResultadoOperacao<any>): { content: Array<{ type: 'text'; text: string }>; structuredContent: Record<string, unknown>; isError: boolean } {
  const envelope = {
    sucesso: false,
    codigo: resultado.codigoErro || 'UNKNOWN_ERROR',
    mensagem: resultado.erro || 'Erro desconhecido'
  };
  return {
    content: [
      {
        type: 'text',
        text: safeStringify(envelope)
      }
    ],
    structuredContent: envelope,
    isError: true
  };
}

export function extrairDados<T>(content: Array<{ type: string; text: string }>): T | null {
  if (!content || content.length === 0) return null;
  const texto = content[0].text;
  try {
    const parsed = JSON.parse(texto);
    if (parsed.sucesso) return parsed.dados as T;
    return null;
  } catch {
    return null;
  }
}

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

export function schema<T extends Record<string, any>>(shape: T): any {
  return shape;
}
