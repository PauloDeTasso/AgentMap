import { mcpServer, projetoService } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

registerTracedTool(mcpServer, 'agentmap_admin_metricas', {
  title: 'Métricas Admin',
  description: 'Obtém métricas do backend.',
  inputSchema: z.object({}),
  annotations: { readOnlyHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const servicos = (ctx.dados as any).servicos;
  const result = { sucesso: true, dados: {
    timestamp: new Date().toISOString(),
    backend: 'gerenciador-agentes-ia-backend',
    versao: '1.0.0',
    ambiente: process.env.NODE_ENV || 'development',
    services: servicos ? {
      stateMachine: !!servicos.stateMachine,
      auditoria: !!servicos.auditoria,
      contractValidator: !!servicos.contractValidator,
      backup: !!servicos.backup,
      fileSystem: true
    } : null
  }};
  auditoria.registrarToolCall('agentmap_admin_metricas', projeto, {}, result);
  return toMcpStructured(result.dados);
});

registerTracedTool(mcpServer, 'agentmap_admin_backup', {
  title: 'Criar Backup',
  description: 'Cria um backup do projeto.',
  inputSchema: z.object({}),
  annotations: { idempotentHint: true }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const servicos = (ctx.dados as any).servicos;
  const backup = servicos?.backup;
  if (!backup) {
    return mcpError({ sucesso: false, erro: 'BackupService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' });
  }
  const result = backup.criarBackup();
  auditoria.registrarToolCall('agentmap_admin_backup', projeto, {}, result);
  if (!result.sucesso) return mcpError(result);
  return toMcpStructured(result.dados);
});
