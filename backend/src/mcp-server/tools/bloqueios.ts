import { mcpServer } from '../server';
import { toMcpResult, toMcpData } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import * as z from 'zod';

mcpServer.registerTool('agentmap_bloqueios_listar', {
  description: 'Lista bloqueios.',
  inputSchema: z.object({})
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.bloqueio.listar();
  auditoria.registrarToolCall('agentmap_bloqueios_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_bloqueios_obter', {
  description: 'Obtem um bloqueio.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.bloqueio.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_bloqueios_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_bloqueios_criar', {
  description: 'Cria um bloqueio.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) })
}, async ({ dados }: { dados: Record<string, unknown> }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.bloqueio.criar(dados);
  auditoria.registrarToolCall('agentmap_bloqueios_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_bloqueios_resolver', {
  description: 'Resolve um bloqueio.',
  inputSchema: z.object({ id: z.string(), resolucao: z.string() })
}, async ({ id, resolucao }: { id: string, resolucao: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.bloqueio.resolver(String(id || ''), String(resolucao || ''));
  auditoria.registrarToolCall('agentmap_bloqueios_resolver', projeto, { id, resolucao }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_bloqueios_excluir', {
  description: 'Exclui um bloqueio.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.bloqueio.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_bloqueios_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});
