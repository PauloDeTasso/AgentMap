import { mcpServer, projetoService } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const regraIntegridadeSchema = z.object({
  id: z.string(),
  nome: z.string(),
  descricao: z.string(),
  entidade: z.string(),
  severidade: z.string(),
  ativo: z.boolean(),
  criadoEm: z.string(),
  atualizadoEm: z.string().nullable()
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_integridade_verificar', {
  title: 'Verificar Integridade',
  description: 'Executa verificação de integridade do projeto.',
  inputSchema: z.object({}),
  annotations: { readOnlyHint: true }
}, async () => {
    const ctx = carregarContexto(projetoService);
    if (!ctx.sucesso) return mcpError(ctx);
    const { projeto } = ctx.dados!;
    const auditoria = createMcpAuditoria(projeto.auditoria);
    const resultado = await ctx.dados!.servicos.integridade.verificar(projeto.id);
    auditoria.registrarToolCall('agentmap_integridade_verificar', projeto, {}, resultado);
    if (!resultado.sucesso) return mcpError(resultado);
    return toMcpStructured(resultado.dados);
  });

registerTracedTool(mcpServer, 'agentmap_integridade_listar_regras', {
  title: 'Listar Regras de Integridade',
  description: 'Lista regras de integridade do projeto.',
  inputSchema: z.object({}),
  outputSchema: z.array(regraIntegridadeSchema),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.integridade.listarRegras();
  auditoria.registrarToolCall('agentmap_integridade_listar_regras', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
