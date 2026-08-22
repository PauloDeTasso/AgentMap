import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const pendenciaSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  tarefaId: z.string().nullable(),
  agenteId: z.string().nullable(),
  tipo: z.string(),
  prioridade: z.string(),
  estado: z.string(),
  origem: z.string(),
  referenciaId: z.string().nullable(),
  resolucao: z.string().nullable(),
  datas: z.object({
    criadaEm: z.string().nullable(),
    atualizadaEm: z.string().nullable(),
    resolvidaEm: z.string().nullable()
  })
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_pendencias_listar', {
  title: 'Listar Pendencias',
  description: 'Lista pendencias.',
  inputSchema: z.object({ tarefaId: z.string().optional() }),
  outputSchema: z.array(pendenciaSchema),
  annotations: { readOnlyHint: true }
}, async ({ tarefaId }: { tarefaId?: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = tarefaId ? ctx.dados!.servicos.pendencia.listarPorTarefa(String(tarefaId || '')) : ctx.dados!.servicos.pendencia.listar();
  auditoria.registrarToolCall('agentmap_pendencias_listar', projeto, { tarefaId }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_pendencias_obter', {
  title: 'Obter Pendencia',
  description: 'Obtem uma pendencia.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: pendenciaSchema,
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.pendencia.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_pendencias_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_pendencias_criar', {
  title: 'Criar Pendencia',
  description: 'Cria uma pendencia.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: pendenciaSchema
}, async (dados: Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.pendencia.criar(dados);
  auditoria.registrarToolCall('agentmap_pendencias_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_pendencias_atualizar', {
  title: 'Atualizar Pendencia',
  description: 'Atualiza uma pendencia.',
  inputSchema: z.object({ id: z.string() }).passthrough(),
  outputSchema: pendenciaSchema,
  annotations: { idempotentHint: true }
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.pendencia.atualizar(String(id || ''), dados);
  auditoria.registrarToolCall('agentmap_pendencias_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_pendencias_resolver', {
  title: 'Resolver Pendencia',
  description: 'Resolve uma pendencia.',
  inputSchema: z.object({ id: z.string(), resolucao: z.string() }),
  outputSchema: pendenciaSchema,
  annotations: { idempotentHint: true }
}, async ({ id, resolucao }: { id: string, resolucao: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.pendencia.resolver(String(id || ''), String(resolucao || ''));
  auditoria.registrarToolCall('agentmap_pendencias_resolver', projeto, { id, resolucao }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_pendencias_excluir', {
  title: 'Excluir Pendencia',
  description: 'Exclui uma pendencia.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: { destructiveHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.pendencia.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_pendencias_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
