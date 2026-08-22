import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const checkpointSchema = z.object({
  id: z.string(),
  tarefaId: z.string(),
  agenteId: z.string(),
  tipo: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  artefatos: z.array(z.string()),
  alteracoes: z.array(z.string()),
  riscos: z.array(z.string()),
  pendencias: z.array(z.string()),
  observacoes: z.string().nullable(),
  dados: z.record(z.string(), z.unknown()).nullable(),
  datas: z.object({
    criadaEm: z.string().nullable(),
    atualizadaEm: z.string().nullable()
  })
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_checkpoints_listar', {
  title: 'Listar Checkpoints',
  description: 'Lista checkpoints.',
  inputSchema: z.object({ tarefaId: z.string().optional() }),
  outputSchema: z.array(checkpointSchema),
  annotations: { readOnlyHint: true }
}, async ({ tarefaId }: { tarefaId?: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = tarefaId ? ctx.dados!.servicos.checkpoint.listarPorTarefa(String(tarefaId || '')) : ctx.dados!.servicos.checkpoint.listar();
  auditoria.registrarToolCall('agentmap_checkpoints_listar', projeto, { tarefaId }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_checkpoints_obter', {
  title: 'Obter Checkpoint',
  description: 'Obtem um checkpoint.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: checkpointSchema,
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.checkpoint.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_checkpoints_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_checkpoints_criar', {
  title: 'Criar Checkpoint',
  description: 'Cria um checkpoint.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: checkpointSchema
}, async (dados: Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.checkpoint.criar(dados);
  auditoria.registrarToolCall('agentmap_checkpoints_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_checkpoints_excluir', {
  title: 'Excluir Checkpoint',
  description: 'Exclui um checkpoint.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: { destructiveHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.checkpoint.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_checkpoints_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_checkpoints_atualizar', {
  title: 'Atualizar Checkpoint',
  description: 'Atualiza um checkpoint existente.',
  inputSchema: z.object({ id: z.string() }).passthrough(),
  outputSchema: checkpointSchema,
  annotations: { idempotentHint: true }
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.checkpoint.atualizar(String(id || ''), dados);
  auditoria.registrarToolCall('agentmap_checkpoints_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_checkpoints_excluir_todos', {
  title: 'Excluir Todos os Checkpoints (Marcos)',
  description: 'Exclui todas as checkpoints (marcos) do projeto.',
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
  const resultado = await ctx.dados!.servicos.checkpoint.excluirTodos();
  auditoria.registrarToolCall('agentmap_checkpoints_excluir_todos', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
