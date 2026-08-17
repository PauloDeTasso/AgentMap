import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const riscoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  categoria: z.string(),
  probabilidade: z.string(),
  impacto: z.string(),
  gravidade: z.string(),
  causa: z.string(),
  consequencias: z.array(z.string()),
  mitigacao: z.string(),
  responsavel: z.string(),
  tarefasRelacionadas: z.array(z.string()),
  estado: z.string(),
  criadoEm: z.string(),
  resolvidoEm: z.string().nullable()
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_riscos_listar', {
  title: 'Listar Riscos',
  description: 'Lista riscos.',
  inputSchema: z.object({}),
  outputSchema: z.array(riscoSchema),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.risco.listar();
  auditoria.registrarToolCall('agentmap_riscos_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_riscos_obter', {
  title: 'Obter Risco',
  description: 'Obtem um risco.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: riscoSchema,
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.risco.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_riscos_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_riscos_criar', {
  title: 'Criar Risco',
  description: 'Cria um risco.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: riscoSchema
}, async ({ dados }: { dados: Record<string, unknown> }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.risco.criar(dados);
  auditoria.registrarToolCall('agentmap_riscos_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_riscos_atualizar', {
  title: 'Atualizar Risco',
  description: 'Atualiza um risco.',
  inputSchema: z.object({ id: z.string() }).passthrough(),
  outputSchema: riscoSchema,
  annotations: { idempotentHint: true }
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.risco.atualizar(String(id || ''), dados as any);
  auditoria.registrarToolCall('agentmap_riscos_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_riscos_excluir', {
  title: 'Excluir Risco',
  description: 'Exclui um risco.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: { destructiveHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.risco.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_riscos_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
