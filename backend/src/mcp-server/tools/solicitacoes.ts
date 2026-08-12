import { mcpServer } from '../server';
import { toMcpResult, toMcpData } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import * as z from 'zod';

mcpServer.registerTool('agentmap_solicitacoes_listar', {
  description: 'Lista todas as solicitações de alteracao do projeto.',
  inputSchema: z.object({})
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.solicitacao.listar();
  auditoria.registrarToolCall('agentmap_solicitacoes_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_solicitacoes_obter', {
  description: 'Obtem uma solicitacao de alteracao pelo ID.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.solicitacao.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_solicitacoes_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_solicitacoes_criar', {
  description: 'Cria uma nova solicitacao de alteracao.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) })
}, async ({ dados }: { dados: Record<string, unknown> }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.solicitacao.criar(dados as any);
  auditoria.registrarToolCall('agentmap_solicitacoes_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_solicitacoes_atualizar', {
  description: 'Atualiza uma solicitacao de alteracao.',
  inputSchema: z.object({ id: z.string() }).passthrough()
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.solicitacao.atualizar(String(id || ''), dados as any);
  auditoria.registrarToolCall('agentmap_solicitacoes_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_solicitacoes_aprovar', {
  description: 'Aprova uma solicitacao de alteracao.',
  inputSchema: z.object({ id: z.string(), agenteId: z.string(), observacao: z.string() })
}, async ({ id, agenteId, observacao }: { id: string, agenteId: string, observacao: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.solicitacao.aprovar(String(id || ''), String(agenteId || ''), String(observacao || ''));
  auditoria.registrarToolCall('agentmap_solicitacoes_aprovar', projeto, { id, agenteId, observacao }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_solicitacoes_rejeitar', {
  description: 'Rejeita uma solicitacao de alteracao.',
  inputSchema: z.object({ id: z.string(), agenteId: z.string(), motivo: z.string() })
}, async ({ id, agenteId, motivo }: { id: string, agenteId: string, motivo: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.solicitacao.rejeitar(String(id || ''), String(agenteId || ''), String(motivo || ''));
  auditoria.registrarToolCall('agentmap_solicitacoes_rejeitar', projeto, { id, agenteId, motivo }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_solicitacoes_cancelar', {
  description: 'Cancela uma solicitacao de alteracao.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.solicitacao.atualizar(String(id || ''), { status: 'CANCELADA' });
  auditoria.registrarToolCall('agentmap_solicitacoes_cancelar', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_solicitacoes_excluir', {
  description: 'Exclui uma solicitacao de alteracao.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.solicitacao.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_solicitacoes_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_solicitacoes_historico', {
  description: 'Lista o historico de eventos de uma solicitacao.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.solicitacao.listarHistorico(String(id || ''));
  auditoria.registrarToolCall('agentmap_solicitacoes_historico', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});
