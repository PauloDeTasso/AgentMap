import { mcpServer, projetoService } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

registerTracedTool(mcpServer, 'agentmap_temp_listar_arquivos', {
  title: 'Listar Arquivos Temporários',
  description: 'Lista arquivos temporários do projeto.',
  inputSchema: z.object({ olderThanDays: z.number().optional() }),
  annotations: { readOnlyHint: true }
}, async ({ olderThanDays }: { olderThanDays?: number }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const servicos = (ctx.dados as any).servicos;
  const cleanupService = servicos?.tempCleanup || new (require('../../servicios/TempCleanupService').TempCleanupService)(projeto.caminhoRaiz);
  const files = cleanupService.listTempFiles(olderThanDays);
  const totalSize = files.reduce((sum: number, f: any) => sum + f.size, 0);
  const resultado = { sucesso: true, dados: {
    arquivos: files,
    totalArquivos: files.length,
    tamanhoTotalBytes: totalSize
  }};
  auditoria.registrarToolCall('agentmap_temp_listar_arquivos', projeto, { olderThanDays }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_temp_limpar', {
  title: 'Limpar Arquivos Temporários',
  description: 'Limpa arquivos temporários do projeto.',
  inputSchema: z.object({ olderThanDays: z.number().optional() }),
  annotations: { destructiveHint: true }
}, async ({ olderThanDays }: { olderThanDays?: number }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const servicos = (ctx.dados as any).servicos;
  const cleanupService = servicos?.tempCleanup || new (require('../../servicios/TempCleanupService').TempCleanupService)(projeto.caminhoRaiz);
  const result = cleanupService.cleanupTempFiles(olderThanDays);
  const resultado = { sucesso: true, dados: result};
  auditoria.registrarToolCall('agentmap_temp_limpar', projeto, { olderThanDays }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
