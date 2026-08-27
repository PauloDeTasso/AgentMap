import { mcpServer, projetoService } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const estadoNotaSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  conteudo: z.string(),
  categoria: z.string(),
  prioridade: z.string(),
  estado: z.string(),
  datas: z.object({
    criacao: z.string(),
    ultimaAtualizacao: z.string()
  })
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_estado_listar_notas', {
  title: 'Listar Notas de Estado',
  description: 'Lista notas de estado do projeto.',
  inputSchema: z.object({}),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.estado.listar();
  auditoria.registrarToolCall('agentmap_estado_listar_notas', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_estado_obter_nota', {
  title: 'Obter Nota de Estado',
  description: 'Obtém uma nota de estado pelo ID.',
  inputSchema: z.object({ id: z.string() }),
  annotations: { readOnlyHint: true }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.estado.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_estado_obter_nota', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
