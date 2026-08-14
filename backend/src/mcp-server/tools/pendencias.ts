import { mcpServer } from '../server';
import { toMcpResult, toMcpData } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import * as z from 'zod';

mcpServer.registerTool('agentmap_pendencias_listar', {
  description: 'Lista pendencias.',
  inputSchema: z.object({ tarefaId: z.string().optional() })
}, async ({ tarefaId }: { tarefaId?: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.pendencia.listar();
  if (resultado.sucesso && resultado.dados && tarefaId) {
    resultado.dados = resultado.dados.filter((p: any) => p.tarefaId === String(tarefaId || ''));
  }
  auditoria.registrarToolCall('agentmap_pendencias_listar', projeto, { tarefaId }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_pendencias_obter', {
  description: 'Obtem uma pendencia.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.pendencia.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_pendencias_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_pendencias_criar', {
  description: 'Cria uma pendencia.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) })
}, async ({ dados }: { dados: Record<string, unknown> }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.pendencia.criar(dados);
  auditoria.registrarToolCall('agentmap_pendencias_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_pendencias_atualizar', {
  description: 'Atualiza uma pendencia.',
  inputSchema: z.object({ id: z.string() }).passthrough()
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.pendencia.atualizar(String(id || ''), dados);
  auditoria.registrarToolCall('agentmap_pendencias_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_pendencias_resolver', {
  description: 'Resolve uma pendencia.',
  inputSchema: z.object({ id: z.string(), resolucao: z.string() })
}, async ({ id, resolucao }: { id: string, resolucao: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.pendencia.resolver(String(id || ''), String(resolucao || ''));
  auditoria.registrarToolCall('agentmap_pendencias_resolver', projeto, { id, resolucao }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_pendencias_excluir', {
  description: 'Exclui uma pendencia.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.pendencia.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_pendencias_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});
