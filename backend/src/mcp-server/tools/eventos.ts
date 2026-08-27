import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const eventoSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  origem: z.string(),
  destino: z.string(),
  referenciaTipo: z.string(),
  referenciaId: z.string(),
  mensagem: z.string(),
  estado: z.string(),
  datas: z.object({
    criadoEm: z.string().nullable(),
    criacao: z.string().nullable(),
    consumidoEm: z.string().nullable()
  })
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_eventos_pendentes', {
  title: 'Eventos Pendentes',
  description: 'Lista eventos pendentes para um agente.',
  inputSchema: z.object({ agenteId: z.string() }),
  outputSchema: z.array(eventoSchema),
  annotations: {
    readOnlyHint: true
  }
}, async ({ agenteId }: { agenteId: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.evento.listar({ destino: String(agenteId || ''), estado: 'PENDENTE' });
  auditoria.registrarToolCall('agentmap_eventos_pendentes', projeto, { agenteId }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_eventos_listar', {
  title: 'Listar Eventos',
  description: 'Lista eventos do projeto com filtros opcionais.',
  inputSchema: z.object({ filtros: z.object({ destino: z.string().optional(), estado: z.string().optional() }).optional() }),
  outputSchema: z.array(eventoSchema),
  annotations: {
    readOnlyHint: true
  }
}, async ({ filtros }: { filtros?: { destino?: string; estado?: string } }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.evento.listar(filtros);
  auditoria.registrarToolCall('agentmap_eventos_listar', projeto, { filtros }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_eventos_confirmar', {
  title: 'Confirmar Evento',
  description: 'Marca um evento como consumido.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: eventoSchema,
  annotations: { idempotentHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.evento.marcarConsumido(String(id || ''));
  auditoria.registrarToolCall('agentmap_eventos_confirmar', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});