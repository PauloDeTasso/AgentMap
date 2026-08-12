import { mcpServer } from '../server';
import { toMcpResult, toMcpData } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import * as z from 'zod';

mcpServer.registerTool('agentmap_tarefas_listar', {
  description: 'Lista todas as tarefas do projeto aberto.',
  inputSchema: z.object({})
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.tarefa.listar();
  auditoria.registrarToolCall('agentmap_tarefas_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_tarefas_obter', {
  description: 'Obtém uma tarefa pelo ID.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.tarefa.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_tarefas_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_tarefas_criar', {
  description: 'Cria uma nova tarefa no projeto.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) })
}, async ({ dados }: { dados: Record<string, unknown> }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.tarefa.criar(dados as any);
  auditoria.registrarToolCall('agentmap_tarefas_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_tarefas_atualizar', {
  description: 'Atualiza uma tarefa existente.',
  inputSchema: z.object({ id: z.string() }).passthrough()
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.tarefa.atualizar(String(id || ''), dados);
  auditoria.registrarToolCall('agentmap_tarefas_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_tarefas_alterar_estado', {
  description: 'Altera o estado de uma tarefa (respeitando transições válidas).',
  inputSchema: z.object({ id: z.string(), novoEstado: z.string() })
}, async ({ id, novoEstado }: { id: string, novoEstado: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.tarefa.alterarEstado(String(id || ''), String(novoEstado || '') as any);
  auditoria.registrarToolCall('agentmap_tarefas_alterar_estado', projeto, { id, novoEstado }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_tarefas_excluir', {
  description: 'Exclui uma tarefa do projeto.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.tarefa.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_tarefas_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_tarefas_contexto', {
  description: 'Monta o pacote de contexto completo para uma tarefa.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.tarefa.montarContexto(String(id || ''));
  auditoria.registrarToolCall('agentmap_tarefas_contexto', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});
