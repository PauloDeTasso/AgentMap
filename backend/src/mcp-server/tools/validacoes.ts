import { mcpServer } from '../server';
import { toMcpResult, toMcpData } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

registerTracedTool(mcpServer, 'agentmap_validacoes_listar', {
  description: 'Lista validacoes.',
  inputSchema: z.object({})
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.validacao.listar();
  auditoria.registrarToolCall('agentmap_validacoes_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_validacoes_obter', {
  description: 'Obtem uma validacao.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.validacao.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_validacoes_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_validacoes_criar', {
  description: 'Cria uma validacao.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) })
}, async ({ dados }: { dados: Record<string, unknown> }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.validacao.criar(dados);
  auditoria.registrarToolCall('agentmap_validacoes_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_validacoes_excluir', {
  description: 'Exclui uma validacao.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.validacao.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_validacoes_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});
