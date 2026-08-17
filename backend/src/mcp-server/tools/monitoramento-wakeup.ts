import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const TIPOS_RELEVANTES = new Set([
  'KILO_CHAT_REPLY',
  'AGENTE_FILHO_RESULTADO',
  'WAKEUP_PARENT',
  'KILO_CHAT',
  'KILO_REPLY',
  'KILO_RESULT',
]);

registerTracedTool(mcpServer, 'agentmap_monitoramento_verificar_pendentes', {
  title: 'Verificar Mensagens Pendentes do Pai',
  description: 'Consulta mensagens novas no monitoramento do projeto atual, filtrando apenas tipos relevantes para o agente principal. Use quando receber notificacao resources/updated ou para checar manualmente se ha respostas de filhos.',
  inputSchema: z.object({
    aposEventSequence: z.number().int().nonnegative().optional().describe('Cursor opcional para polling incremental. Se omitido, retorna as ultimas mensagens relevantes.'),
    limite: z.number().int().positive().max(100).optional().describe('Limite de mensagens a retornar.')
  }),
  outputSchema: z.object({
    temNovidades: z.boolean(),
    ultimoEventSequence: z.number().int().nonnegative(),
    mensagens: z.array(z.object({
      id: z.string(),
      eventSequence: z.number().int().nonnegative(),
      tipo: z.string(),
      emissor: z.string(),
      agenteId: z.string().nullable(),
      tarefaId: z.string().nullable(),
      conteudo: z.string(),
      timestamp: z.string()
    }))
  }).passthrough(),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true
  }
}, async (input: { aposEventSequence?: number; limite?: number }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);

  const monitoramento = ctx.dados!.servicos.monitoramento;
  const limite = input.limite || 20;
  const after = input.aposEventSequence;

  let resultado;
  if (typeof after === 'number') {
    resultado = monitoramento.listarMensagensApos(after, limite);
  } else {
    const todas = monitoramento.listarMensagens(limite * 2);
    const relevantes = todas.filter((m: any) => TIPOS_RELEVANTES.has(m.tipo));
    resultado = {
      mensagens: relevantes.slice(-limite),
      ultimoEventSequence: todas.length > 0 ? (todas[todas.length - 1].eventSequence || 0) : 0
    };
  }

  const mensagens = resultado.mensagens.map((m: any) => ({
    id: m.id,
    eventSequence: m.eventSequence || 0,
    tipo: m.tipo,
    emissor: m.emissor,
    agenteId: m.agenteId || null,
    tarefaId: m.tarefaId || null,
    conteudo: m.conteudo,
    timestamp: m.timestamp
  }));

  return toMcpStructured({
    temNovidades: mensagens.length > 0,
    ultimoEventSequence: resultado.ultimoEventSequence,
    mensagens
  });
});
