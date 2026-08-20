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
  'HANDOFF_CRIADO',
  'HANDOFF_ACEITO',
  'HANDOFF_CONCLUIDO',
  'SOLICITACAO_CRIADA',
  'SOLICITACAO_APROVADA',
  'SOLICITACAO_REJEITADA',
  'SOLICITACAO_EXCLUIDA',
  'SOLICITACAO_ALTERADA',
  'TAREFA_CRIADA',
  'TAREFA_ATRIBUIDA',
  'TAREFA_INICIADA',
  'TAREFA_CONCLUIDA',
  'TAREFA_CANCELADA',
  'TAREFA_BLOQUEADA',
  'TAREFA_DESBLOQUEADA',
  'TAREFA_ESTADO_ALTERADO',
  'TAREFA_EXCLUIDA',
  'TAREFA_RECONCILIADA',
  'BLOQUEIO_CRIADO',
  'BLOQUEIO_RESOLVIDO',
  'CONFLITO_CRIADO',
  'CONFLITO_RESOLVIDO',
  'RESULTADO_REGISTRADO',
  'ARTEFATO_CRIADO',
  'VALIDACAO_INICIADA',
  'VALIDACAO_CONCLUIDA',
  'RESERVA_CRIADA',
  'RESERVA_LIBERADA',
  'SESSAO_INICIADA',
  'SESSAO_FINALIZADA',
  'CHECKPOINT_CRIADO',
  'APRENDIZADO_REGISTRADO',
  'PENDENCIA_CRIADA',
  'PENDENCIA_RESOLVIDA',
  'DEPENDENCIA_CRIADA',
  'DECISAO_CRIADA',
  'DECISAO_ATUALIZADA',
  'RISCO_CRIADO',
  'RISCO_ATUALIZADO',
  'RESPONSABILIDADE_REGISTRADA',
  'ARQUIVO_ALTERADO',
  'ARQUIVO_EXCLUIDO',
  'APROVACAO_SOLICITADA',
  'APROVACAO_CONCEDIDA',
  'APROVACAO_REJEITADA',
  'IMPLANTACAO_REALIZADA',
  'SEGURANCA_VIOLACAO',
  'BACKUP_CRIADO',
  'CONTRATO_CRIADO',
  'CONTRATO_ALTERADO',
  'CONTRATO_EXCLUIDO',
  'CONTRATO_VALIDADO',
  'CONTRATO_INVALIDO',
  'TESTE_EXECUTADO',
  'REVISAO_REALIZADA',
  'MODO_GLOBAL_ALTERADO',
  'MODO_AGENTE_ALTERADO',
  'STATUS_AGENTE_ATUALIZADO',
  'MODO_AUTONOMIA_ALTERADO',
  'INSTANCIA_REGISTRADA',
  'INSTANCIA_CONECTADA',
  'INSTANCIA_DESCONECTADA',
  'INSTANCIA_ERRO',
  'INSTANCIA_ATUALIZADA',
  'INSTANCIA_EXCLUIDA',
  'PROJETO_CRIADO',
  'PROJETO_ABERTO',
  'AGENTE_CRIADO',
  'AGENTE_ATUALIZADO',
  'AGENTE_EXCLUIDO',
  'INTERVENCAO_MANUAL',
  'REGRAS_RESPEITADAS',
  'CONTATO_CRIADO',
  'CONTATO_ATUALIZADO',
  'CONTATO_EXCLUIDO',
  'EVENTO_CRIADO',
  'EVENTO_CONSUMIDO',
  'BROADCAST_ANUNCIO',
  'INTEGRIDADE_VERIFICADA',
  'INTEGRIDADE_FALHA',
  'COMANDO_USUARIO',
  'INTERVENCAO_USUARIO',
  'MODO_ALTERADO',
  'AGENTE_STATUS_ALTERADO',
  'ATUALIZAR_STATUS',
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
      mensagens: relevantes.slice(0, limite),
      ultimoEventSequence: relevantes.length > 0 ? (relevantes[0].eventSequence || 0) : 0
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
