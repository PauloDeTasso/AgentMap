import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const artefatoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  tipo: z.string(),
  descricao: z.string(),
  tarefaId: z.string().nullable(),
  localizacao: z.string().nullable(),
  agenteId: z.string(),
  versaoId: z.string().nullable(),
  dados: z.record(z.string(), z.unknown()).nullable(),
  estado: z.string(),
  datas: z.object({
    criadaEm: z.string().nullable(),
    atualizadaEm: z.string().nullable(),
    excluidaEm: z.string().nullable()
  })
}).passthrough();

const versaoArtefatoSchema = z.object({
  id: z.string(),
  artefatoId: z.string(),
  versao: z.string(),
  estado: z.string(),
  commit: z.string().nullable(),
  dados: z.record(z.string(), z.unknown()).nullable(),
  data: z.string()
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_artefatos_listar', {
  title: 'Listar Artefatos',
  description: 'Lista artefatos.',
  inputSchema: z.object({}),
  outputSchema: z.array(artefatoSchema),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.artefato.listar();
  auditoria.registrarToolCall('agentmap_artefatos_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_artefatos_obter', {
  title: 'Obter Artefato',
  description: 'Obtem um artefato.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: artefatoSchema,
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.artefato.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_artefatos_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_artefatos_criar', {
  title: 'Criar Artefato',
  description: 'Cria um artefato.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: artefatoSchema
}, async ({ dados }: { dados: Record<string, unknown> }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.artefato.criar(dados);
  auditoria.registrarToolCall('agentmap_artefatos_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_artefatos_excluir', {
  title: 'Excluir Artefato',
  description: 'Exclui um artefato.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: { destructiveHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.artefato.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_artefatos_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_artefatos_atualizar', {
  title: 'Atualizar Artefato',
  description: 'Atualiza um artefato existente.',
  inputSchema: z.object({ id: z.string() }).passthrough(),
  outputSchema: artefatoSchema,
  annotations: { idempotentHint: true }
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.artefato.atualizar(String(id || ''), dados);
  auditoria.registrarToolCall('agentmap_artefatos_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_artefatos_versoes', {
  title: 'Versoes do Artefato',
  description: 'Lista versoes de um artefato.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.array(versaoArtefatoSchema),
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.artefato.listarVersoes(String(id || ''));
  auditoria.registrarToolCall('agentmap_artefatos_versoes', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
