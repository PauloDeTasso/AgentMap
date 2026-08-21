import { mcpServer, projetoService } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import { KiloIdempotencyService } from '../../servicios/KiloIdempotencyService';
import * as z from 'zod';

registerTracedTool(mcpServer, 'kilohub_receive_chat_message', {
  title: 'Receber Mensagem Chat',
  description: 'Busca respostas/mensagens direcionadas a um agente Kilo no monitoramento do AgentMap.',
  inputSchema: z.object({
    agenteId: z.string().optional(),
    tarefaId: z.string().optional(),
    messageId: z.string().optional(),
    limite: z.number().int().positive().max(100).default(20)
  }),
  annotations: {
    readOnlyHint: true
  }
}, async ({ agenteId, tarefaId, messageId, limite = 20 }: { agenteId?: string; tarefaId?: string; messageId?: string; limite?: number }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);

  const mensagensPath = '.ia/contexto/mensagens-monitoramento.json';
  const result = projeto.fileService.lerJson<any[]>(mensagensPath);
  if (!result.sucesso || !result.dados) {
    const resultado = { sucesso: false, erro: 'Erro ao ler mensagens', codigoErro: 'MESSAGES_READ_ERROR' };
    auditoria.registrarToolCall('kilohub_receive_chat_message', projeto, { agenteId, tarefaId, messageId, limite }, resultado);
    return mcpError(resultado);
  }

  const tiposPermitidos = new Set(['KILO_CHAT', 'KILO_REPLY', 'KILO_RESULT', 'KILO_CHAT_REPLY']);
  let mensagens = result.dados.filter(m => tiposPermitidos.has(m.tipo));
  if (messageId) {
    mensagens = mensagens.filter(m => m.dados?.replyTo === messageId || m.dados?.messageId === messageId);
  }

  if (agenteId) {
    mensagens = mensagens.filter(m => m.agenteId === agenteId || m.emissor === agenteId);
  }
  if (tarefaId) {
    mensagens = mensagens.filter(m => m.tarefaId === tarefaId);
  }

  mensagens = mensagens.slice(-limite);

  const dados = {
    total: mensagens.length,
    mensagens: mensagens.map(m => ({
      messageId: m.id || m.dados?.messageId,
      tipo: m.tipo,
      emissor: m.emissor,
      agenteId: m.agenteId,
      tarefaId: m.tarefaId,
      conteudo: m.conteudo,
      timestamp: m.timestamp,
      dados: m.dados
    }))
  };

  console.log(`[KILO][CHAT_LIST] agenteId=${agenteId || '*'} total=${dados.total}`);
  auditoria.registrar('KILO_MENSAGENS_LIDAS', `${mensagens.length} mensagens Kilo lidas`, { agenteId, tarefaId, total: mensagens.length });
  auditoria.registrarToolCall('kilohub_receive_chat_message', projeto, { agenteId, tarefaId, messageId, limite }, { sucesso: true, dados });
  return toMcpStructured(dados);
});
