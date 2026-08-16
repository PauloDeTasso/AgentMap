import { mcpServer } from '../server';
import { toMcpResult, toMcpData } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

registerTracedTool(mcpServer, 'agentmap_checkpoints_listar', {
  description: 'Lista checkpoints.',
  inputSchema: z.object({ tarefaId: z.string().optional() })
}, async ({ tarefaId }: { tarefaId?: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = tarefaId ? ctx.dados!.servicos.checkpoint.listarPorTarefa(String(tarefaId || '')) : ctx.dados!.servicos.checkpoint.listar();
  auditoria.registrarToolCall('agentmap_checkpoints_listar', projeto, { tarefaId }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_checkpoints_obter', {
  description: 'Obtem um checkpoint.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.checkpoint.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_checkpoints_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_checkpoints_criar', {
  description: 'Cria um checkpoint.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) })
}, async ({ dados }: { dados: Record<string, unknown> }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.checkpoint.criar(dados);
  auditoria.registrarToolCall('agentmap_checkpoints_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_checkpoints_excluir', {
  description: 'Exclui um checkpoint.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.checkpoint.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_checkpoints_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});
