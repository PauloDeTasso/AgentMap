import { AuditoriaService } from 'servicios';
import { ProjetoAberto, ProjetoService } from 'servicios';
import { ResultadoOperacao } from 'tipos';
import * as path from 'path';
import * as fs from 'fs';
import { mcpServer } from '../server';
import { carregarContexto } from '../contexto';

export interface McpToolLog {
  toolName: string;
  projetoId: string | null;
  timestamp: string;
  parametros: Record<string, unknown>;
  sucesso: boolean;
  codigoErro?: string;
  duracaoMs?: number;
  execucaoReal?: boolean;
}

export interface AuditoriaSanidadeResultado {
  toolName: string;
  sucesso: boolean;
  codigoErro?: string;
  mensagem?: string;
  duracaoMs?: number;
  execucaoReal: boolean;
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
    result: ResultadoOperacao<unknown>,
    execucaoReal?: boolean
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
      execucaoReal,
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
        execucaoReal: execucaoReal || false,
      },
      'mcp',
      result.sucesso ? 'sucesso' : 'falha'
    );
  }

  registrar(evento: string, descricao: string, dados: Record<string, unknown> = {}): void {
    this.auditoria.registrar(evento as any, descricao, dados, 'mcp');
  }

  async executarSanidade(projetoService: ProjetoService): Promise<AuditoriaSanidadeResultado[]> {
    const resultados: AuditoriaSanidadeResultado[] = [];
    const tempDir = path.join(process.env.TEMP || '.', 'agentmap-sanidade-' + Date.now());
    const tempProjetoId = 'sanidade-' + Date.now();
    let projetoAbertoId: string | null = null;
    let projetoAnteriorId: string | null = null;

    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const criarResult = projetoService.criarProjeto('Sanidade-' + Date.now(), tempDir, 'Projeto temporário para sanidade de tools');
      if (!criarResult.sucesso || !criarResult.dados) {
        throw new Error('Falha ao criar projeto temporário: ' + (criarResult.erro || 'unknown'));
      }

      const abrirResult = projetoService.abrirProjeto(criarResult.dados);
      if (!abrirResult.sucesso || !abrirResult.dados) {
        throw new Error('Falha ao abrir projeto temporário: ' + (abrirResult.erro || 'unknown'));
      }

      projetoAbertoId = abrirResult.dados.id;
      const registro = projetoService.listarProjetos();
      const reg = (registro.sucesso && registro.dados) ? registro.dados.find((p: any) => p.id === projetoAbertoId) : null;
      projetoAnteriorId = reg?.id || null;

      const registeredTools = (mcpServer as any)._registeredTools as Record<string, any> | undefined;
      if (!registeredTools) {
        throw new Error('_registeredTools não encontrado no mcpServer');
      }

      const toolNames = Object.keys(registeredTools).filter((name) => registeredTools[name]?.enabled !== false);

      for (const toolName of toolNames) {
        const tool = registeredTools[toolName];
        if (!tool || !tool.handler) {
          continue;
        }

        const parametros = gerarParametrosTeste(toolName, projetoAbertoId, tempDir);
        const inicio = Date.now();

        try {
          const result = await tool.handler(parametros);
          const fim = Date.now();
          const sucesso = !(result && (result as any).isError);
          const codigoErro = sucesso ? undefined : 'EXECUTION_ERROR';
          const mensagem = sucesso ? undefined : (result?.content?.[0]?.text || 'Erro na execução');

          resultados.push({
            toolName,
            sucesso,
            codigoErro,
            mensagem,
            duracaoMs: fim - inicio,
            execucaoReal: true,
          });

          const ctx = carregarContexto(projetoService);
          if (ctx.sucesso && ctx.dados) {
            const resultadoOperacao: ResultadoOperacao<unknown> = sucesso
              ? { sucesso: true, dados: result }
              : { sucesso: false, erro: mensagem, codigoErro: codigoErro };
            const auditoria = new McpAuditoria(ctx.dados.projeto.auditoria);
            auditoria.registrarToolCall(toolName, ctx.dados.projeto, parametros, resultadoOperacao, true);
          }
        } catch (error: any) {
          const fim = Date.now();
          resultados.push({
            toolName,
            sucesso: false,
            codigoErro: 'EXCEPTION',
            mensagem: error?.message || String(error),
            duracaoMs: fim - inicio,
            execucaoReal: true,
          });

          const ctx = carregarContexto(projetoService);
          if (ctx.sucesso && ctx.dados) {
            const auditoria = new McpAuditoria(ctx.dados.projeto.auditoria);
            auditoria.registrarToolCall(toolName, ctx.dados.projeto, parametros, {
              sucesso: false,
              erro: error?.message || String(error),
              codigoErro: 'EXCEPTION',
            }, true);
          }
        }
      }
    } catch (error: any) {
      resultados.push({
        toolName: '__setup__',
        sucesso: false,
        codigoErro: 'SETUP_ERROR',
        mensagem: error?.message || String(error),
        execucaoReal: true,
      });
    } finally {
      if (projetoAbertoId) {
        try {
          projetoService.fecharProjeto(projetoAbertoId);
        } catch {}
      }
      try {
        projetoService.removerProjeto(projetoAbertoId || tempProjetoId);
      } catch {}
      if (fs.existsSync(tempDir)) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {}
      }
    }

    return resultados;
  }
}

function gerarParametrosTeste(toolName: string, projetoId: string | null, tempDir: string): Record<string, unknown> {
  const base: Record<string, unknown> = {};

  if (toolName === 'agentmap_projetos_listar') return {};
  if (toolName === 'agentmap_projetos_criar') {
    return { nome: 'Sanidade-' + Date.now(), caminhoParental: tempDir, descricao: 'sanidade' };
  }
  if (toolName === 'agentmap_projetos_abrir') {
    return projetoId ? { caminhoOuId: projetoId } : { caminhoOuId: tempDir };
  }
  if (toolName === 'agentmap_projetos_fechar') {
    return projetoId ? { id: projetoId } : { id: 'sanidade' };
  }
  if (toolName === 'agentmap_projetos_atual') return {};
  if (toolName === 'agentmap_integridade_verificar') return projetoId ? { projetoId } : {};

  if (toolName.endsWith('_listar')) return {};
  if (toolName.endsWith('_obter')) return { id: 'sanidade' };
  if (toolName.endsWith('_criar')) return { dados: {} };
  if (toolName.endsWith('_atualizar')) return { id: 'sanidade' };
  if (toolName.endsWith('_excluir')) return { id: 'sanidade' };
  if (toolName.endsWith('_aprovar')) return { id: 'sanidade' };
  if (toolName.endsWith('_rejeitar')) return { id: 'sanidade' };
  if (toolName.endsWith('_cancelar')) return { id: 'sanidade' };
  if (toolName.endsWith('_resolver')) return { id: 'sanidade', resolucao: 'sanidade' };
  if (toolName.endsWith('_liberar')) return { id: 'sanidade' };
  if (toolName.endsWith('_finalizar')) return { id: 'sanidade', estadoFinal: 'CONCLUIDA' };
  if (toolName.endsWith('_alterar_estado')) return { id: 'sanidade', novoEstado: 'CONCLUIDA' };
  if (toolName.endsWith('_contexto')) return { id: 'sanidade' };
  if (toolName.endsWith('_historico')) return { id: 'sanidade' };
  if (toolName.endsWith('_versoes')) return { id: 'sanidade' };
  if (toolName.endsWith('_consultar_pendencias')) return { agenteId: 'sanidade' };
  if (toolName.endsWith('_obter_mapa_projeto')) return {};
  if (toolName.endsWith('_iniciar_trabalho')) return { agenteId: 'sanidade', tarefaId: 'sanidade' };
  if (toolName.endsWith('_finalizar_trabalho')) return { sessaoId: 'sanidade', tarefaId: 'sanidade', agenteId: 'sanidade', resumo: 'sanidade' };
  if (toolName === 'agentmap_buscar_conhecimento') return { termo: 'sanidade', limite: 1, incluirProjetos: false };
  if (toolName === 'agentmap_buscar_referencias') return { simbolo: 'sanidade', limite: 1, diretorio: '.' };
  if (toolName === 'agentmap_buscar_simbolo') return { simbolo: 'sanidade', limite: 1, diretorio: '.' };
  if (toolName === 'agentmap_ler_trecho_arquivo') return { caminho: '.ia/estado/estado-atual.json', linhaInicio: 1, linhaFim: 10 };
  if (toolName === 'agentmap_obter_contexto_projeto') return {};
  if (toolName === 'agentmap_obter_arquitetura') return {};
  if (toolName === 'agentmap_obter_agente') return { agenteId: 'sanidade' };
  if (toolName === 'agentmap_recomendar_agente') return { tarefaId: 'sanidade', criterios: [] };
  if (toolName === 'agentmap_obter_contexto_tarefa') return { tarefaId: 'sanidade' };
  if (toolName === 'agentmap_auditoria_listar') return { limite: 10 };

  return base;
}

export function createMcpAuditoria(auditoria: AuditoriaService): McpAuditoria {
  return new McpAuditoria(auditoria);
}

export function gerarRelatorioSanidade(resultados: AuditoriaSanidadeResultado[], caminhoSaida: string): void {
  const data = new Date().toISOString().split('T')[0];
  const relatorio = {
    data,
    totalTools: resultados.length,
    sucesso: resultados.filter((r) => r.sucesso).length,
    falha: resultados.filter((r) => !r.sucesso).length,
    tools: resultados.map((r) => ({
      toolName: r.toolName,
      execucaoReal: r.execucaoReal,
      sucesso: r.sucesso,
      codigoErro: r.codigoErro || null,
      mensagem: r.mensagem || null,
      duracaoMs: r.duracaoMs || null,
    })),
  };

  const dir = path.dirname(caminhoSaida);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(caminhoSaida, JSON.stringify(relatorio, null, 2), 'utf-8');
}
