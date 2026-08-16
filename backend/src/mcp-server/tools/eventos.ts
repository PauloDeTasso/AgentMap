import { mcpServer } from '../server';
import { toMcpResult, toMcpData } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

registerTracedTool(mcpServer, 'agentmap_eventos_pendentes', {
  description: 'Lista eventos pendentes para um agente.',
  inputSchema: z.object({ agenteId: z.string() })
}, async ({ agenteId }: { agenteId: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.evento.listar({ destino: String(agenteId || ''), estado: 'PENDENTE' });
  auditoria.registrarToolCall('agentmap_eventos_pendentes', projeto, { agenteId }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_eventos_listar', {
  description: 'Lista eventos do projeto com filtros opcionais.',
  inputSchema: z.object({ filtros: z.object({ destino: z.string().optional(), estado: z.string().optional() }).optional() })
}, async ({ filtros }: { filtros?: { destino?: string; estado?: string } }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.evento.listar(filtros);
  auditoria.registrarToolCall('agentmap_eventos_listar', projeto, { filtros }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_eventos_confirmar', {
  description: 'Marca um evento como consumido.',
  inputSchema: z.object({ id: z.string() })
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.evento.marcarConsumido(String(id || ''));
  auditoria.registrarToolCall('agentmap_eventos_confirmar', projeto, { id }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});