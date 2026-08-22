import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { SchemaContatoCriar, SchemaContatoAtualizar, SchemaContatoObter, SchemaContatoExcluir } from '../schemas/validacao';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const contatoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  email: z.string(),
  telefone: z.string(),
  projetoId: z.string()
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_contatos_listar', {
  title: 'Listar Contatos',
  description: 'Lista todos os contatos do projeto.',
  inputSchema: z.object({}),
  outputSchema: z.array(contatoSchema),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.contato.listar();
  auditoria.registrarToolCall('agentmap_contatos_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_contatos_obter', {
  title: 'Obter Contato',
  description: 'Obtém um contato pelo ID.',
  inputSchema: SchemaContatoObter,
  outputSchema: contatoSchema,
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.contato.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_contatos_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_contatos_criar', {
  title: 'Criar Contato',
  description: 'Cria um novo contato.',
  inputSchema: SchemaContatoCriar,
  outputSchema: contatoSchema
}, async ({ nome, email, telefone }: { nome: string; email: string; telefone: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.contato.criar({ nome, email, telefone });
  auditoria.registrarToolCall('agentmap_contatos_criar', projeto, { nome, email, telefone }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_contatos_atualizar', {
  title: 'Atualizar Contato',
  description: 'Atualiza um contato.',
  inputSchema: SchemaContatoAtualizar.passthrough(),
  outputSchema: contatoSchema,
  annotations: { idempotentHint: true }
}, async (args: any) => {
  const { id, ...dados } = args || {};
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.contato.atualizar(String(id || ''), dados);
  auditoria.registrarToolCall('agentmap_contatos_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_contatos_excluir', {
  title: 'Excluir Contato',
  description: 'Exclui um contato.',
  inputSchema: SchemaContatoExcluir,
  outputSchema: z.boolean(),
  annotations: { destructiveHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.contato.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_contatos_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_contatos_excluir_todos', {
  title: 'Excluir Todos os Contatos',
  description: 'Exclui todos os contatos do projeto.',
  inputSchema: z.object({}),
  outputSchema: z.number(),
  annotations: { destructiveHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.contato.excluirTodos();
  auditoria.registrarToolCall('agentmap_contatos_excluir_todos', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
