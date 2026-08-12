import { AuditoriaService } from 'servicios';
import { ProjetoAberto } from 'servicios';
import { ResultadoOperacao } from 'tipos';
import * as path from 'path';

export interface McpToolLog {
  toolName: string;
  projetoId: string | null;
  timestamp: string;
  parametros: Record<string, unknown>;
  sucesso: boolean;
  codigoErro?: string;
  duracaoMs?: number;
}

const SENSITIVE_KEYS = new Set([
  'senha', 'password', 'token', 'apikey', 'api_key', 'secret',
  'chave', 'senha_projeto', 'private_key', 'access_token', 'refresh_token'
]);

export function sanitizarParametros(parametros: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parametros)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizarParametros(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export class McpAuditoria {
  constructor(private auditoria: AuditoriaService) {}

  registrarToolCall(
    toolName: string,
    projeto: ProjetoAberto | null,
    parametros: Record<string, unknown>,
    result: ResultadoOperacao<unknown>
  ): void {
    const projetoId = projeto?.id || null;
    const sanitizedParams = sanitizarParametros(parametros);
    const log: McpToolLog = {
      toolName,
      projetoId,
      timestamp: new Date().toISOString(),
      parametros: sanitizedParams,
      sucesso: result.sucesso,
      codigoErro: result.codigoErro,
    };

    const evento = this.auditoria.registrar(
      'MCP_TOOL_CALL' as any,
      `MCP tool '${toolName}' chamada${result.sucesso ? ' com sucesso' : ' com erro'} (${result.codigoErro || ''})`,
      {
        projetoId: projetoId || '',
        toolName,
        parametros: sanitizedParams,
        sucesso: result.sucesso,
        codigoErro: result.codigoErro || '',
      },
      'mcp',
      result.sucesso ? 'sucesso' : 'falha'
    );
  }

  registrar(evento: string, descricao: string, dados: Record<string, unknown> = {}): void {
    this.auditoria.registrar(evento as any, descricao, dados, 'mcp');
  }
}

export function createMcpAuditoria(auditoria: AuditoriaService): McpAuditoria {
  return new McpAuditoria(auditoria);
}
