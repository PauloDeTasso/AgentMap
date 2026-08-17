import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const dependenciaSchema = z.object({
  id: z.string(),
  fonteId: z.string(),
  fonteTipo: z.string(),
  destinoId: z.string(),
  destinoTipo: z.string(),
  tipo: z.string(),
  estado: z.string(),
  datas: z.object({
    criadaEm: z.string().nullable(),
    atualizadaEm: z.string().nullable()
  })
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_dependencias_listar', {
  title: 'Listar Dependencias',
  description: 'Lista dependencias.',
  inputSchema: z.object({}),
  outputSchema: z.array(dependenciaSchema),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.dependencia.listar();
  auditoria.registrarToolCall('agentmap_dependencias_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_dependencias_obter', {
  title: 'Obter Dependencia',
  description: 'Obtem uma dependencia.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: dependenciaSchema,
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.dependencia.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_dependencias_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_dependencias_criar', {
  title: 'Criar Dependencia',
  description: 'Cria uma dependencia.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: dependenciaSchema
}, async ({ dados }: { dados: Record<string, unknown> }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.dependencia.criar(dados);
  auditoria.registrarToolCall('agentmap_dependencias_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_dependencias_excluir', {
  title: 'Excluir Dependencia',
  description: 'Exclui uma dependencia.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: { destructiveHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.dependencia.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_dependencias_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
