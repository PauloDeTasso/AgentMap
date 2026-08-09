import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import { mapearAgente } from '../mapper/mapeadores';
import * as z from 'zod';

const agenteResumidoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  funcao: z.string(),
  estado: z.string(),
  conhecimentos: z.array(z.string()),
  permissoes: z.record(z.string(), z.unknown()),
  dominios: z.array(z.string()),
  diretrizes: z.array(z.string()),
  dataCriacao: z.string().nullable(),
  dataAtualizacao: z.string().nullable()
});

registerTracedTool(mcpServer, 'agentmap_obter_agente', {
  title: 'Obter Agente',
  description: 'Obtém o perfil completo de um agente pelo ID, incluindo permissões, conhecimentos, domínios, diretrizes e datas.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: agenteResumidoSchema,
  annotations: {
    readOnlyHint: true
  }
}, async ({ id }: { id: string }): Promise<any> => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);

  const resultado = await ctx.dados!.servicos.agente.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_obter_agente', projeto, { id }, resultado);

  if (!resultado.sucesso || !resultado.dados) {
    return mcpError(resultado);
  }

  return toMcpStructured(mapearAgente(resultado.dados as any));
});
