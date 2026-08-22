import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

registerTracedTool(mcpServer, 'agentmap_sessoes_listar', {
  description: 'Lista todas as sessoes do projeto.',
  inputSchema: z.object({})
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
  description: 'Obtem uma sessao pelo ID.',
  inputSchema: z.object({ id: z.string() })
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
  description: 'Cria uma nova sessao de trabalho.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) })
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
  description: 'Atualiza uma sessao existente.',
  inputSchema: z.object({ id: z.string() }).passthrough()
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
  description: 'Finaliza uma sessao de trabalho.',
  inputSchema: z.object({ id: z.string(), estadoFinal: z.string() })
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
  description: 'Exclui uma sessao.',
  inputSchema: z.object({ id: z.string() })
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
  title: 'Excluir Todos os Sessões',
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
