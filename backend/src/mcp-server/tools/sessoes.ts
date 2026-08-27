import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const sessaoSchema = z.object({
  id: z.string(),
  agenteId: z.string(),
  tarefaId: z.string(),
  estado: z.string(),
  contextoConsultado: z.boolean(),
  datas: z.object({
    inicio: z.string().nullable(),
    fim: z.string().nullable(),
    criadaEm: z.string().nullable(),
    atualizadaEm: z.string().nullable()
  }).nullable()
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_sessoes_listar', {
  title: 'Listar Sessões',
  description: 'Lista todas as sessões do projeto.',
  inputSchema: z.object({}),
  outputSchema: z.array(sessaoSchema),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.sessao.listar();
  auditoria.registrarToolCall('agentmap_sessoes_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_sessoes_obter', {
  title: 'Obter Sessão',
  description: 'Obtém uma sessão pelo ID.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: sessaoSchema,
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.sessao.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_sessoes_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_sessoes_criar', {
  title: 'Criar Sessão',
  description: 'Cria uma nova sessão de trabalho.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: sessaoSchema
}, async (dados: Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.sessao.iniciar(dados as any);
  auditoria.registrarToolCall('agentmap_sessoes_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_sessoes_atualizar', {
  title: 'Atualizar Sessão',
  description: 'Atualiza uma sessão existente.',
  inputSchema: z.object({ id: z.string() }).passthrough(),
  outputSchema: sessaoSchema,
  annotations: { idempotentHint: true }
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.sessao.atualizar(String(id || ''), dados as any);
  auditoria.registrarToolCall('agentmap_sessoes_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_sessoes_finalizar', {
  title: 'Finalizar Sessão',
  description: 'Finaliza uma sessão de trabalho.',
  inputSchema: z.object({ id: z.string(), estadoFinal: z.string() }),
  outputSchema: sessaoSchema,
  annotations: { idempotentHint: true }
}, async ({ id, estadoFinal }: { id: string, estadoFinal: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.sessao.finalizar(String(id || ''), { estadoFinal: String(estadoFinal || '') });
  auditoria.registrarToolCall('agentmap_sessoes_finalizar', projeto, { id, estadoFinal }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_sessoes_excluir', {
  title: 'Excluir Sessão',
  description: 'Exclui uma sessão.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: { destructiveHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.sessao.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_sessoes_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_sessoes_excluir_todos', {
  title: 'Excluir Todas as Sessões',
  description: 'Exclui todas as sessões do projeto.',
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
  const resultado = await ctx.dados!.servicos.sessao.excluirTodos();
  auditoria.registrarToolCall('agentmap_sessoes_excluir_todos', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
