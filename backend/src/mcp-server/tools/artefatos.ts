import { mcpServer } from '../server';
import { toMcpResult, toMcpData } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

registerTracedTool(mcpServer, 'agentmap_artefatos_listar', {
  description: 'Lista artefatos.',
  inputSchema: z.object({})
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.artefato.listar();
  auditoria.registrarToolCall('agentmap_artefatos_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_artefatos_obter', {
  description: 'Obtem um artefato.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.artefato.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_artefatos_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_artefatos_criar', {
  description: 'Cria um artefato.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) })
}, async ({ dados }: { dados: Record<string, unknown> }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.artefato.criar(dados);
  auditoria.registrarToolCall('agentmap_artefatos_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_artefatos_excluir', {
  description: 'Exclui um artefato.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.artefato.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_artefatos_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_artefatos_versoes', {
  description: 'Lista versoes de um artefato.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.artefato.listarVersoes(String(id || ''));
  auditoria.registrarToolCall('agentmap_artefatos_versoes', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});
