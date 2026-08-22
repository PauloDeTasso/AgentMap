import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const bloqueioSchema = z.object({
  id: z.string(),
  tarefaId: z.string(),
  tipo: z.string(),
  gravidade: z.string(),
  descricao: z.string(),
  origem: z.string(),
  responsavelResolucao: z.string(),
  estado: z.string(),
  criadoEm: z.string(),
  resolvidoEm: z.string().nullable()
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_bloqueios_listar', {
  title: 'Listar Bloqueios',
  description: 'Lista bloqueios.',
  inputSchema: z.object({}),
  outputSchema: z.array(bloqueioSchema),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.bloqueio.listar();
  auditoria.registrarToolCall('agentmap_bloqueios_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_bloqueios_obter', {
  title: 'Obter Bloqueio',
  description: 'Obtem um bloqueio.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: bloqueioSchema,
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.bloqueio.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_bloqueios_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_bloqueios_criar', {
  title: 'Criar Bloqueio',
  description: 'Cria um bloqueio.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: bloqueioSchema
}, async ({ dados }: { dados: Record<string, unknown> }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.bloqueio.criar(dados, projeto.id);
  auditoria.registrarToolCall('agentmap_bloqueios_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_bloqueios_resolver', {
  title: 'Resolver Bloqueio',
  description: 'Resolve um bloqueio.',
  inputSchema: z.object({ id: z.string(), resolucao: z.string() }),
  outputSchema: bloqueioSchema,
  annotations: { idempotentHint: true }
}, async ({ id, resolucao }: { id: string, resolucao: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.bloqueio.resolver(String(id || ''), String(resolucao || ''), projeto.id);
  auditoria.registrarToolCall('agentmap_bloqueios_resolver', projeto, { id, resolucao }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_bloqueios_excluir', {
  title: 'Excluir Bloqueio',
  description: 'Exclui um bloqueio.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: { destructiveHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.bloqueio.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_bloqueios_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_bloqueios_atualizar', {
  title: 'Atualizar Bloqueio',
  description: 'Atualiza um bloqueio existente.',
  inputSchema: z.object({ id: z.string() }).passthrough(),
  outputSchema: bloqueioSchema,
  annotations: { idempotentHint: true }
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.bloqueio.atualizar(String(id || ''), dados, projeto.id);
  auditoria.registrarToolCall('agentmap_bloqueios_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
