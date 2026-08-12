import { mcpServer, toMcpResult, toMcpData, projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { SchemaContatoCriar, SchemaContatoAtualizar, SchemaContatoObter, SchemaContatoExcluir } from '../schemas/validacao';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import * as z from 'zod';

mcpServer.registerTool('agentmap_contatos_listar', {
  description: 'Lista todos os contatos do projeto.',
  inputSchema: z.object({})
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.contato.listar();
  auditoria.registrarToolCall('agentmap_contatos_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_contatos_obter', {
  description: 'Obtém um contato pelo ID.',
  inputSchema: SchemaContatoObter,
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.contato.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_contatos_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_contatos_criar', {
  description: 'Cria um novo contato.',
  inputSchema: SchemaContatoCriar,
}, async ({ nome, email, telefone }: { nome: string; email: string; telefone: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.contato.criar({ nome, email, telefone });
  auditoria.registrarToolCall('agentmap_contatos_criar', projeto, { nome, email, telefone }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_contatos_atualizar', {
  description: 'Atualiza um contato.',
  inputSchema: SchemaContatoAtualizar.passthrough(),
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.contato.atualizar(String(id || ''), dados);
  auditoria.registrarToolCall('agentmap_contatos_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_contatos_excluir', {
  description: 'Exclui um contato.',
  inputSchema: SchemaContatoExcluir,
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.contato.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_contatos_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});
