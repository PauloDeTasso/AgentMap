import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const resultadoSchema = z.object({
  id: z.string(),
  tarefaId: z.string(),
  execucaoId: z.number(),
  agenteId: z.string(),
  resumo: z.string(),
  estado: z.string(),
  arquivosAlterados: z.array(z.string()),
  artefatos: z.array(z.string()),
  testesExecutados: z.array(z.string()),
  testesAprovados: z.array(z.string()),
  riscosEncontrados: z.array(z.string()),
  pendencias: z.array(z.string()),
  alteracoesSolicitadas: z.array(z.string()),
  observacoes: z.string().nullable(),
  datas: z.object({
    criadaEm: z.string().nullable(),
    atualizadaEm: z.string().nullable(),
    concluidaEm: z.string().nullable()
  })
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_resultados_listar', {
  title: 'Listar Resultados',
  description: 'Lista resultados.',
  inputSchema: z.object({}),
  outputSchema: z.array(resultadoSchema),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.resultado.listar();
  auditoria.registrarToolCall('agentmap_resultados_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_resultados_obter', {
  title: 'Obter Resultado',
  description: 'Obtem um resultado.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: resultadoSchema,
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.resultado.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_resultados_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_resultados_criar', {
  title: 'Criar Resultado',
  description: 'Cria um resultado.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: resultadoSchema
}, async (dados: Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.resultado.criar(dados);
  auditoria.registrarToolCall('agentmap_resultados_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_resultados_atualizar', {
  title: 'Atualizar Resultado',
  description: 'Atualiza um resultado.',
  inputSchema: z.object({ id: z.string() }).passthrough(),
  outputSchema: resultadoSchema,
  annotations: { idempotentHint: true }
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.resultado.atualizar(String(id || ''), dados as any);
  auditoria.registrarToolCall('agentmap_resultados_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_resultados_excluir', {
  title: 'Excluir Resultado',
  description: 'Exclui um resultado.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: { destructiveHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.resultado.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_resultados_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_resultados_excluir_todos', {
  title: 'Excluir Todos os Resultados',
  description: 'Exclui todas as resultados do projeto.',
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
  const resultado = await ctx.dados!.servicos.resultado.excluirTodos();
  auditoria.registrarToolCall('agentmap_resultados_excluir_todos', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
