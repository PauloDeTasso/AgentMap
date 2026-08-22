import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const criterioSchema = z.object({
  id: z.string(),
  tarefaId: z.string(),
  descricao: z.string(),
  tipo: z.string(),
  obrigatorio: z.boolean(),
  estado: z.string(),
  dados: z.string().nullable()
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_criterios_listar', {
  title: 'Listar Criterios',
  description: 'Lista criterios.',
  inputSchema: z.object({}),
  outputSchema: z.array(criterioSchema),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.criterio.listar();
  auditoria.registrarToolCall('agentmap_criterios_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_criterios_obter', {
  title: 'Obter Criterio',
  description: 'Obtem um criterio.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: criterioSchema,
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.criterio.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_criterios_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_criterios_criar', {
  title: 'Criar Criterio',
  description: 'Cria um criterio.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: criterioSchema
}, async (dados: Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.criterio.criar(dados);
  auditoria.registrarToolCall('agentmap_criterios_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_criterios_excluir', {
  title: 'Excluir Criterio',
  description: 'Exclui um criterio.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: { destructiveHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.criterio.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_criterios_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_criterios_atualizar', {
  title: 'Atualizar Criterio',
  description: 'Atualiza um criterio existente.',
  inputSchema: z.object({ id: z.string() }).passthrough(),
  outputSchema: criterioSchema,
  annotations: { idempotentHint: true }
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.criterio.atualizar(String(id || ''), dados);
  auditoria.registrarToolCall('agentmap_criterios_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
