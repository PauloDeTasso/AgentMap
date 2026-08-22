import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const handoffSchema = z.object({
  id: z.string(),
  origem: z.string(),
  destino: z.string(),
  tarefaId: z.string().nullable(),
  resumo: z.string(),
  concluido: z.array(z.string()),
  pendente: z.array(z.string()),
  artefatos: z.array(z.string()),
  decisoes: z.array(z.string()),
  alteracoes: z.array(z.string()),
  riscos: z.array(z.string()),
  bloqueios: z.array(z.string()),
  observacoes: z.string().nullable(),
  estado: z.string(),
  datas: z.object({
    criadaEm: z.string().nullable(),
    criacao: z.string().nullable(),
    aceitaEm: z.string().nullable(),
    concluidaEm: z.string().nullable()
  })
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_handoffs_listar', {
  title: 'Listar Handoffs',
  description: 'Lista todos os handoffs do projeto.',
  inputSchema: z.object({ destino: z.string().optional() }),
  annotations: {
    readOnlyHint: true
  }
}, async ({ destino }: { destino?: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = destino ? ctx.dados!.servicos.handoff.listarPorDestino(String(destino || '')) : ctx.dados!.servicos.handoff.listar();
  auditoria.registrarToolCall('agentmap_handoffs_listar', projeto, { destino }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_handoffs_obter', {
  title: 'Obter Handoff',
  description: 'Obtem um handoff pelo ID.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: handoffSchema,
  annotations: {
    readOnlyHint: true
  }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.handoff.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_handoffs_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_handoffs_criar', {
  title: 'Criar Handoff',
  description: 'Cria um novo handoff.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: handoffSchema
}, async (dados: Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.handoff.criar(dados);
  auditoria.registrarToolCall('agentmap_handoffs_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_handoffs_atualizar', {
  title: 'Atualizar Handoff',
  description: 'Atualiza um handoff existente.',
  inputSchema: z.object({ id: z.string() }).passthrough(),
  outputSchema: handoffSchema,
  annotations: {
    idempotentHint: true
  }
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.handoff.atualizar(String(id || ''), dados as any);
  auditoria.registrarToolCall('agentmap_handoffs_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_handoffs_excluir', {
  title: 'Excluir Handoff',
  description: 'Exclui um handoff.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: {
    destructiveHint: true
  }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.handoff.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_handoffs_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_handoffs_excluir_todos', {
  title: 'Excluir Todas as Transferencias',
  description: 'Exclui todas as transferencias (handoffs) do projeto.',
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
  const resultado = await ctx.dados!.servicos.handoff.excluirTodos();
  auditoria.registrarToolCall('agentmap_handoffs_excluir_todos', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
