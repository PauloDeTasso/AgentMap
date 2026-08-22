import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const decisaoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  estado: z.string(),
  data: z.string(),
  problema: z.string(),
  contexto: z.string(),
  alternativas: z.array(z.string()),
  decisao: z.string(),
  justificativa: z.string(),
  impactos: z.array(z.string()),
  consequencias: z.array(z.string()),
  tarefasRelacionadas: z.array(z.string()),
  contratosAfetados: z.array(z.string()),
  aprovacao: z.object({
    necessaria: z.boolean(),
    estado: z.string(),
    aprovador: z.string(),
    data: z.string().nullable(),
    observacao: z.string()
  })
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_decisoes_listar', {
  title: 'Listar Decisoes',
  description: 'Lista decisoes.',
  inputSchema: z.object({}),
  outputSchema: z.array(decisaoSchema),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.decisao.listar();
  auditoria.registrarToolCall('agentmap_decisoes_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_decisoes_obter', {
  title: 'Obter Decisao',
  description: 'Obtem uma decisao.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: decisaoSchema,
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.decisao.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_decisoes_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_decisoes_criar', {
  title: 'Criar Decisao',
  description: 'Cria uma decisao.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: decisaoSchema
}, async (dados: Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.decisao.criar(dados);
  auditoria.registrarToolCall('agentmap_decisoes_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_decisoes_atualizar', {
  title: 'Atualizar Decisao',
  description: 'Atualiza uma decisao.',
  inputSchema: z.object({ id: z.string() }).passthrough(),
  outputSchema: decisaoSchema,
  annotations: { idempotentHint: true }
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.decisao.atualizar(String(id || ''), dados as any);
  auditoria.registrarToolCall('agentmap_decisoes_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_decisoes_excluir', {
  title: 'Excluir Decisao',
  description: 'Exclui uma decisao.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: { destructiveHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.decisao.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_decisoes_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_decisoes_excluir_todos', {
  title: 'Excluir Todos os Decisões',
  description: 'Exclui todas as decisões do projeto.',
  inputSchema: z.object({}),
  outputSchema: z.boolean(),
  annotations: {
    destructiveHint: true
  }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.decisao.excluirTodos();
  auditoria.registrarToolCall('agentmap_decisoes_excluir_todos', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
