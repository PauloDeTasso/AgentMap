import { mcpServer } from '../server';
import { toMcpResult, toMcpData } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import * as z from 'zod';

mcpServer.registerTool('agentmap_auditoria_listar', {
  description: 'Lista os ultimos eventos de auditoria.',
  inputSchema: z.object({ limite: z.number() })
}, async ({ limite }: { limite: number }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const lim = Number(limite || 50);
  const lista = ctx.dados!.servicos.auditoria.listar(lim);
  const resultado = { sucesso: true, dados: lista };
  auditoria.registrarToolCall('agentmap_auditoria_listar', projeto, { limite }, resultado);
  return toMcpData(resultado.dados);
});
