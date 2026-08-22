import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const conflitoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  tipo: z.string(),
  severidade: z.string(),
  tarefaId: z.string().nullable(),
  agenteId: z.string().nullable(),
  referencias: z.array(z.string()),
  origem: z.string().nullable(),
  resolucao: z.string().nullable(),
  estado: z.string(),
  datas: z.object({
    criadaEm: z.string().nullable(),
    atualizadaEm: z.string().nullable(),
    resolvidaEm: z.string().nullable()
  })
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_conflitos_listar', {
  title: 'Listar Conflitos',
  description: 'Lista conflitos.',
  inputSchema: z.object({}),
  outputSchema: z.array(conflitoSchema),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.conflito.listar();
  auditoria.registrarToolCall('agentmap_conflitos_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_conflitos_obter', {
  title: 'Obter Conflito',
  description: 'Obtem um conflito.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: conflitoSchema,
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.conflito.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_conflitos_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_conflitos_criar', {
  title: 'Criar Conflito',
  description: 'Cria um conflito.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: conflitoSchema
}, async ({ dados }: { dados: Record<string, unknown> }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.conflito.criar(dados);
  auditoria.registrarToolCall('agentmap_conflitos_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_conflitos_atualizar', {
  title: 'Atualizar Conflito',
  description: 'Atualiza um conflito.',
  inputSchema: z.object({ id: z.string() }).passthrough(),
  outputSchema: conflitoSchema,
  annotations: { idempotentHint: true }
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.conflito.atualizar(String(id || ''), dados as any);
  auditoria.registrarToolCall('agentmap_conflitos_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_conflitos_resolver', {
  title: 'Resolver Conflito',
  description: 'Resolve um conflito.',
  inputSchema: z.object({ id: z.string(), resolucao: z.string() }),
  outputSchema: conflitoSchema,
  annotations: { idempotentHint: true }
}, async ({ id, resolucao }: { id: string, resolucao: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.conflito.resolver(String(id || ''), String(resolucao || ''));
  auditoria.registrarToolCall('agentmap_conflitos_resolver', projeto, { id, resolucao }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_conflitos_excluir', {
  title: 'Excluir Conflito',
  description: 'Exclui um conflito.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: { destructiveHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.conflito.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_conflitos_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_conflitos_excluir_todos', {
  title: 'Excluir Todos os Conflitos',
  description: 'Exclui todos os conflitos do projeto.',
  inputSchema: z.object({}),
  outputSchema: z.number(),
  annotations: { destructiveHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.conflito.excluirTodos();
  auditoria.registrarToolCall('agentmap_conflitos_excluir_todos', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
