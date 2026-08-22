import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const responsabilidadeSchema = z.object({
  id: z.string(),
  agenteId: z.string(),
  alvoId: z.string(),
  alvoTipo: z.string(),
  nivel: z.string(),
  datas: z.object({
    criadaEm: z.string().nullable(),
    atualizadaEm: z.string().nullable()
  })
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_responsabilidades_listar', {
  title: 'Listar Responsabilidades',
  description: 'Lista responsabilidades.',
  inputSchema: z.object({}),
  outputSchema: z.array(responsabilidadeSchema),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.responsabilidade.listar();
  auditoria.registrarToolCall('agentmap_responsabilidades_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_responsabilidades_obter', {
  title: 'Obter Responsabilidade',
  description: 'Obtem uma responsabilidade.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: responsabilidadeSchema,
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.responsabilidade.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_responsabilidades_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_responsabilidades_criar', {
  title: 'Criar Responsabilidade',
  description: 'Cria uma responsabilidade.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: responsabilidadeSchema
}, async (dados: Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.responsabilidade.criar(dados);
  auditoria.registrarToolCall('agentmap_responsabilidades_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_responsabilidades_excluir', {
  title: 'Excluir Responsabilidade',
  description: 'Exclui uma responsabilidade.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: { destructiveHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.responsabilidade.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_responsabilidades_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_responsabilidades_atualizar', {
  title: 'Atualizar Responsabilidade',
  description: 'Atualiza uma responsabilidade existente.',
  inputSchema: z.object({ id: z.string() }).passthrough(),
  outputSchema: responsabilidadeSchema,
  annotations: { idempotentHint: true }
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.responsabilidade.atualizar(String(id || ''), dados);
  auditoria.registrarToolCall('agentmap_responsabilidades_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_responsabilidades_excluir_todos', {
  title: 'Excluir Todos os Responsabilidades',
  description: 'Exclui todas as responsabilidades do projeto.',
  inputSchema: z.object({}),
  outputSchema: z.number(),
  annotations: {
    destructiveHint: true
  }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.responsabilidade.excluirTodos();
  auditoria.registrarToolCall('agentmap_responsabilidades_excluir_todos', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
