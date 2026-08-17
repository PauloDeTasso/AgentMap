import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const eventoAuditoriaSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  origem: z.string(),
  agenteId: z.string().nullable(),
  usuarioId: z.string().nullable(),
  tarefaId: z.string().nullable(),
  descricao: z.string(),
  dados: z.record(z.string(), z.unknown()),
  resultado: z.string(),
  data: z.string()
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_auditoria_listar', {
  title: 'Listar Auditoria',
  description: 'Lista os ultimos eventos de auditoria.',
  inputSchema: z.object({ limite: z.number() }),
  outputSchema: z.array(eventoAuditoriaSchema),
  annotations: { readOnlyHint: true }
}, async ({ limite }: { limite: number }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const lim = Number(limite || 50);
  const lista = ctx.dados!.servicos.auditoria.listar(lim);
  const resultado = { sucesso: true, dados: lista };
  auditoria.registrarToolCall('agentmap_auditoria_listar', projeto, { limite }, resultado);
  return toMcpStructured(lista);
});
