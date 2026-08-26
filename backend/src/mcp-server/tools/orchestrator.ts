import { mcpServer, projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import { toMcpStructured, mcpError } from '../utils/helpers';
import * as z from 'zod';
import * as path from 'path';
import { FaseProjeto } from '../../servicios/PhaseStateMachine';

const faseIdSchema = z.object({
  projetoId: z.string().optional(),
  faseId: z.string()
});

const aprovarCheckpointSchema = z.object({
  projetoId: z.string().optional(),
  faseId: z.string(),
  aprovadoPor: z.string()
});

registerTracedTool(mcpServer, 'agentmap_orquestracao_listar_fases', {
  title: 'Listar Fases do Projeto',
  description: 'Lista as fases do projeto aberto, incluindo a fase atual e status.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    fases: z.array(z.object({
      id: z.string(),
      nome: z.string(),
      ordem: z.number(),
      responsavel: z.string(),
      status: z.string()
    }))
  }).passthrough(),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);

  const estadoPath = path.posix.join('.ia', 'estado', 'estado-fases.json');
  const estadoResult = projeto.fileService.lerJson<any>(estadoPath);
  const estado = estadoResult.sucesso && estadoResult.dados ? estadoResult.dados : null;

  const fasesPath = path.posix.join('.ia', 'estado', 'estado-fases.json');
  const fasesRaw = projeto.fileService.lerJson<any>(fasesPath);
  const fases = (fasesRaw.sucesso && fasesRaw.dados && Array.isArray(fasesRaw.dados.fases)) ? fasesRaw.dados.fases : [];

  const dados = {
    fases: fases.map((f: any) => ({
      id: f.id || f.faseId,
      nome: f.nome,
      ordem: f.ordem,
      responsavel: f.responsavel,
      status: estado?.faseAtual === f.id ? 'active' : 'pending'
    }))
  };

  auditoria.registrarToolCall('agentmap_orquestracao_listar_fases', projeto, {}, { sucesso: true, dados });
  return toMcpStructured(dados);
});

registerTracedTool(mcpServer, 'agentmap_orquestracao_iniciar_fase', {
  title: 'Iniciar Fase',
  description: 'Inicia uma fase do projeto, criando worktree e agentes.',
  inputSchema: faseIdSchema,
  outputSchema: z.object({
    sucesso: z.boolean(),
    fase: z.string(),
    status: z.string()
  }).passthrough(),
  annotations: { destructiveHint: false }
}, async ({ projetoId, faseId }: { projetoId?: string; faseId: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);

  const result = await ctx.dados!.servicos.projectOrchestrator.iniciarFase(faseId as FaseProjeto);
  auditoria.registrarToolCall('agentmap_orquestracao_iniciar_fase', projeto, { projetoId, faseId }, result);
  if (!result.sucesso) return mcpError(result);

  const saida = { sucesso: true, dados: { sucesso: true, fase: faseId, status: 'active' } };
  return toMcpStructured(saida.dados);
});

registerTracedTool(mcpServer, 'agentmap_orquestracao_aprovar_checkpoint', {
  title: 'Aprovar Checkpoint',
  description: 'Aprova o checkpoint de uma fase e inicia a próxima.',
  inputSchema: aprovarCheckpointSchema,
  outputSchema: z.object({
    sucesso: z.boolean(),
    fase: z.string(),
    status: z.string()
  }).passthrough(),
  annotations: { idempotentHint: true }
}, async ({ projetoId, faseId, aprovadoPor }: { projetoId?: string; faseId: string; aprovadoPor: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);

  const result = await ctx.dados!.servicos.projectOrchestrator.aprovarCheckpoint(faseId as FaseProjeto, aprovadoPor);
  auditoria.registrarToolCall('agentmap_orquestracao_aprovar_checkpoint', projeto, { projetoId, faseId, aprovadoPor }, result);
  if (!result.sucesso) return mcpError(result);

  const saida = { sucesso: true, dados: { sucesso: true, fase: faseId, status: 'approved' } };
  return toMcpStructured(saida.dados);
});

registerTracedTool(mcpServer, 'agentmap_orquestracao_listar_handoffs', {
  title: 'Listar Handoffs',
  description: 'Lista handoffs do projeto aberto.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    handoffs: z.array(z.object({
      id: z.string(),
      origem: z.string(),
      destino: z.string(),
      estado: z.string(),
      resumo: z.string().nullable()
    }))
  }).passthrough(),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);

  const handoffsResult = ctx.dados!.servicos.handoff.listar();
  const handoffs = handoffsResult.sucesso && handoffsResult.dados ? handoffsResult.dados : [];
  const dados = {
    handoffs: handoffs.map((h: any) => ({
      id: h.id,
      origem: h.origem,
      destino: h.destino,
      estado: h.estado,
      resumo: h.resumo || null
    }))
  };

  auditoria.registrarToolCall('agentmap_orquestracao_listar_handoffs', projeto, {}, { sucesso: true, dados });
  return toMcpStructured(dados);
});
