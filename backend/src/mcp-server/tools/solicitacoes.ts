import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const solicitacaoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  agenteSolicitante: z.object({ id: z.string() }),
  agenteResponsavel: z.object({ id: z.string().nullable() }),
  alvo: z.object({
    tipo: z.string(),
    nome: z.string(),
    identificador: z.string().nullable(),
    localizacao: z.string().nullable()
  }),
  alteracao: z.object({
    tipo: z.string(),
    descricao: z.string(),
    motivo: z.string(),
    arquivosAfetados: z.array(z.string())
  }),
  impactos: z.array(z.string()),
  dependencias: z.array(z.string()),
  prioridade: z.string(),
  status: z.string(),
  requerAprovacao: z.boolean(),
  aprovacao: z.object({
    status: z.string(),
    agenteId: z.string().nullable(),
    data: z.string().nullable(),
    observacao: z.string().nullable()
  }),
  tarefaOrigem: z.object({ id: z.string() }).nullable(),
  datas: z.object({
    criadaEm: z.string().nullable(),
    atualizadaEm: z.string().nullable(),
    concluidaEm: z.string().nullable()
  }),
  observacoes: z.string().nullable()
}).passthrough();

const eventoHistoricoSchema = z.object({
  id: z.string(),
  solicitacaoId: z.string(),
  tipo: z.string(),
  data: z.string(),
  agenteId: z.string().nullable(),
  observacao: z.string().nullable()
});

registerTracedTool(mcpServer, 'agentmap_solicitacoes_listar', {
  title: 'Listar Solicitacoes',
  description: 'Lista todas as solicitações de alteracao do projeto.',
  inputSchema: z.object({ filtros: z.object({ status: z.string().optional(), prioridade: z.string().optional() }).optional() }),
  annotations: {
    readOnlyHint: true
  }
}, async ({ filtros }: { filtros?: { status?: string; prioridade?: string } }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.solicitacao.listar();
  if (resultado.sucesso && resultado.dados && (filtros?.status || filtros?.prioridade)) {
    const status = filtros?.status ? String(filtros.status) : undefined;
    const prioridade = filtros?.prioridade ? String(filtros.prioridade) : undefined;
    resultado.dados = resultado.dados.filter((s: any) => {
      if (status && s.status !== status) return false;
      if (prioridade && s.prioridade !== prioridade) return false;
      return true;
    });
  }
  auditoria.registrarToolCall('agentmap_solicitacoes_listar', projeto, { filtros }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_solicitacoes_obter', {
  title: 'Obter Solicitacao',
  description: 'Obtem uma solicitacao de alteracao pelo ID.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: solicitacaoSchema,
  annotations: {
    readOnlyHint: true
  }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.solicitacao.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_solicitacoes_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_solicitacoes_criar', {
  title: 'Criar Solicitacao',
  description: 'Cria uma nova solicitacao de alteracao.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: solicitacaoSchema
}, async ({ dados }: { dados: Record<string, unknown> }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.solicitacao.criar(dados as any);
  auditoria.registrarToolCall('agentmap_solicitacoes_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_solicitacoes_atualizar', {
  title: 'Atualizar Solicitacao',
  description: 'Atualiza uma solicitacao de alteracao.',
  inputSchema: z.object({ id: z.string() }).passthrough(),
  outputSchema: solicitacaoSchema,
  annotations: {
    idempotentHint: true
  }
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.solicitacao.atualizar(String(id || ''), dados as any);
  auditoria.registrarToolCall('agentmap_solicitacoes_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_solicitacoes_aprovar', {
  title: 'Aprovar Solicitacao',
  description: 'Aprova uma solicitacao de alteracao.',
  inputSchema: z.object({ id: z.string(), agenteId: z.string(), observacao: z.string() }),
  outputSchema: solicitacaoSchema
}, async ({ id, agenteId, observacao }: { id: string, agenteId: string, observacao: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.solicitacao.aprovar(String(id || ''), String(agenteId || ''), String(observacao || ''));
  auditoria.registrarToolCall('agentmap_solicitacoes_aprovar', projeto, { id, agenteId, observacao }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_solicitacoes_rejeitar', {
  title: 'Rejeitar Solicitacao',
  description: 'Rejeita uma solicitacao de alteracao.',
  inputSchema: z.object({ id: z.string(), agenteId: z.string(), motivo: z.string() }),
  outputSchema: solicitacaoSchema
}, async ({ id, agenteId, motivo }: { id: string, agenteId: string, motivo: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.solicitacao.rejeitar(String(id || ''), String(agenteId || ''), String(motivo || ''));
  auditoria.registrarToolCall('agentmap_solicitacoes_rejeitar', projeto, { id, agenteId, motivo }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_solicitacoes_cancelar', {
  title: 'Cancelar Solicitacao',
  description: 'Cancela uma solicitacao de alteracao.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: solicitacaoSchema
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.solicitacao.atualizar(String(id || ''), { status: 'CANCELADA' });
  auditoria.registrarToolCall('agentmap_solicitacoes_cancelar', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_solicitacoes_excluir', {
  title: 'Excluir Solicitacao',
  description: 'Exclui uma solicitacao de alteracao.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: {
    destructiveHint: true
  }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.solicitacao.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_solicitacoes_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_solicitacoes_historico', {
  title: 'Historico da Solicitacao',
  description: 'Lista o historico de eventos de uma solicitacao.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.array(eventoHistoricoSchema),
  annotations: {
    readOnlyHint: true
  }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.solicitacao.listarHistorico(String(id || ''));
  auditoria.registrarToolCall('agentmap_solicitacoes_historico', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
