import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const aprendizadoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  categoria: z.string(),
  tarefaId: z.string().nullable(),
  agenteId: z.string().nullable(),
  origem: z.string().nullable(),
  dados: z.record(z.string(), z.unknown()).nullable(),
  utilidade: z.string(),
  estado: z.string(),
  datas: z.object({
    criadaEm: z.string().nullable(),
    atualizadaEm: z.string().nullable(),
    promovidaEm: z.string().nullable()
  })
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_aprendizados_listar', {
  title: 'Listar Aprendizados',
  description: 'Lista aprendizados.',
  inputSchema: z.object({}),
  outputSchema: z.array(aprendizadoSchema),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.aprendizado.listar();
  auditoria.registrarToolCall('agentmap_aprendizados_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_aprendizados_obter', {
  title: 'Obter Aprendizado',
  description: 'Obtem um aprendizado.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: aprendizadoSchema,
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.aprendizado.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_aprendizados_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_aprendizados_criar', {
  title: 'Criar Aprendizado',
  description: 'Cria um aprendizado.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: aprendizadoSchema
}, async ({ dados }: { dados: Record<string, unknown> }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.aprendizado.criar(dados);
  auditoria.registrarToolCall('agentmap_aprendizados_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_aprendizados_excluir', {
  title: 'Excluir Aprendizado',
  description: 'Exclui um aprendizado.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: { destructiveHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.aprendizado.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_aprendizados_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
