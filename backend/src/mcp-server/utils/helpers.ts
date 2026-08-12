import { ResultadoOperacao } from '../../tipos';

export function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(
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
}

export function toMcpResult<T>(result: ResultadoOperacao<T>): { content: Array<{ type: 'text'; text: string }> } {
  if (!result.sucesso) {
    return {
      content: [
        {
          type: 'text',
          text: safeStringify({
            sucesso: false,
            codigo: result.codigoErro || 'UNKNOWN_ERROR',
            mensagem: result.erro || 'Erro desconhecido',
            detalhes: {}
          })
        }
      ]
    };
  }
  return {
    content: [
      {
        type: 'text',
        text: safeStringify({
          sucesso: true,
          dados: result.dados
        })
      }
    ]
  };
}

export function toMcpData(dados: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [
      {
        type: 'text',
        text: safeStringify(dados)
      }
    ]
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
