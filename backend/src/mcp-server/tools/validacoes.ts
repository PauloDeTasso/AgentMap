import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const validacaoSchema = z.object({
  id: z.string(),
  alvoTipo: z.string(),
  alvoId: z.string(),
  tarefaId: z.string().nullable(),
  criterios: z.array(z.string()),
  responsavel: z.string(),
  estado: z.string(),
  evidencias: z.array(z.string()),
  observacoes: z.string().nullable(),
  datas: z.object({
    criadaEm: z.string().nullable(),
    atualizadaEm: z.string().nullable(),
    concluidaEm: z.string().nullable()
  })
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_validacoes_listar', {
  title: 'Listar Validacoes',
  description: 'Lista validacoes.',
  inputSchema: z.object({}),
  outputSchema: z.array(validacaoSchema),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.validacao.listar();
  auditoria.registrarToolCall('agentmap_validacoes_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_validacoes_obter', {
  title: 'Obter Validacao',
  description: 'Obtem uma validacao.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: validacaoSchema,
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.validacao.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_validacoes_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_validacoes_criar', {
  title: 'Criar Validacao',
  description: 'Cria uma validacao.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: validacaoSchema
}, async (dados: Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.validacao.criar(dados);
  auditoria.registrarToolCall('agentmap_validacoes_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_validacoes_excluir', {
  title: 'Excluir Validacao',
  description: 'Exclui uma validacao.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: { destructiveHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.validacao.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_validacoes_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
