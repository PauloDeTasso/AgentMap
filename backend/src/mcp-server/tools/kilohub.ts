import { mcpServer, projetoService } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import { KiloIdempotencyService } from '../../servicios/KiloIdempotencyService';
import * as z from 'zod';

registerTracedTool(mcpServer, 'kilohub_report_status', {
  title: 'Reportar Status',
  description: 'Reporta o status de uma sessão Kilo de volta ao AgentMap.',
  inputSchema: z.object({
    messageId: z.string(),
    sessionId: z.string(),
    status: z.enum(['ativo', 'pausado', 'finalizado', 'erro']),
    message: z.string().optional()
  }),
  annotations: {
    readOnlyHint: false
  }
}, async ({ messageId, sessionId, status, message }: { messageId: string; sessionId: string; status: string; message?: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);

  const idempotency = new KiloIdempotencyService(projeto.fileService, projeto.auditoria);
  const jaProcessado = await idempotency.isProcessado(messageId);
  if (jaProcessado) {
    const resultado = { sucesso: false, erro: `Mensagem duplicada: ${messageId}`, codigoErro: 'DUPLICATE_MESSAGE' };
    auditoria.registrarToolCall('kilohub_report_status', projeto, { messageId, sessionId, status, message }, resultado);
    return mcpError(resultado);
  }

  const kiloStateResult = await ctx.dados!.servicos.kiloDiscovery.obterEstadoKilo();
  if (!kiloStateResult.sucesso || !kiloStateResult.dados) {
    const resultado = { sucesso: false, erro: kiloStateResult.erro || 'Erro ao obter estado Kilo', codigoErro: 'KILO_DISCOVERY_FAILED' };
    auditoria.registrarToolCall('kilohub_report_status', projeto, { messageId, sessionId, status, message }, resultado);
    return mcpError(resultado);
  }

  const sessaoEncontrada = kiloStateResult.dados.sessoes.find(s => s.id === sessionId);
  if (!sessaoEncontrada) {
    const resultado = {
      sucesso: false,
      erro: `Sessão ${sessionId} não encontrada no estado Kilo. Use uma sessão válida ou verifique se o Agent Manager está sincronizado.`,
      codigoErro: 'UNKNOWN_SESSION'
    };
    auditoria.registrarToolCall('kilohub_report_status', projeto, { messageId, sessionId, status, message }, resultado);
    return mcpError(resultado);
  }

  const monitoramento = projeto.fileService;
  const identificador = sessaoEncontrada.agenteId || sessionId || 'unknown';
  const statusPath = `.ia/contexto/status/${identificador}.json`;
  const existingResult = monitoramento.lerJson<Record<string, unknown>>(statusPath);
  const baseStatusData: Record<string, unknown> = existingResult.sucesso && existingResult.dados
    ? existingResult.dados
    : { id: sessaoEncontrada.agenteId || sessionId, nome: sessaoEncontrada.agenteId || sessionId, ultimaAtividade: new Date().toISOString(), ultimoHeartbeat: new Date().toISOString() };

  const statusData: Record<string, unknown> = {
    ...baseStatusData,
    status: status === 'ativo' ? 'ATIVO' : status === 'pausado' ? 'AGUARDANDO' : status === 'finalizado' ? 'DISPONIVEL' : status.toUpperCase(),
    sessionId,
    ultimaAtividade: new Date().toISOString(),
    ultimoHeartbeat: new Date().toISOString()
  };

  const writeResult = monitoramento.escreverJson(statusPath, statusData);
  if (!writeResult.sucesso) {
    const resultado = { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    auditoria.registrarToolCall('kilohub_report_status', projeto, { messageId, sessionId, status, message }, resultado);
    return mcpError(resultado);
  }

  await idempotency.marcarProcessado(messageId, 'kilohub_report_status', sessionId);

  const dados = {
    messageId,
    sessionId,
    status,
    message: message || `Status ${status} reportado para sessão ${sessionId}`,
    agenteId: sessaoEncontrada.agenteId,
    worktreeId: sessaoEncontrada.worktreeId
  };

  auditoria.registrar('KILO_STATUS_REPORTADO', `Status ${status} reportado para sessão ${sessionId}`, {
    messageId,
    sessionId,
    status,
    agenteId: sessaoEncontrada.agenteId
  });
  auditoria.registrarToolCall('kilohub_report_status', projeto, { messageId, sessionId, status, message }, { sucesso: true, dados });
  return toMcpStructured(dados);
});

registerTracedTool(mcpServer, 'kilohub_report_progress', {
  title: 'Reportar Progresso',
  description: 'Reporta o progresso de uma tarefa a partir de uma sessão Kilo.',
  inputSchema: z.object({
    messageId: z.string(),
    tarefaId: z.string(),
    progress: z.number().min(0).max(100),
    message: z.string().optional()
  }),
  annotations: {
    readOnlyHint: false
  }
}, async ({ messageId, tarefaId, progress, message }: { messageId: string; tarefaId: string; progress: number; message?: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);

  const idempotency = new KiloIdempotencyService(projeto.fileService, projeto.auditoria);
  const jaProcessado = await idempotency.isProcessado(messageId);
  if (jaProcessado) {
    const resultado = { sucesso: false, erro: `Mensagem duplicada: ${messageId}`, codigoErro: 'DUPLICATE_MESSAGE' };
    auditoria.registrarToolCall('kilohub_report_progress', projeto, { messageId, tarefaId, progress, message }, resultado);
    return mcpError(resultado);
  }

  const tarefaResult = ctx.dados!.servicos.tarefa.obter(tarefaId);
  if (!tarefaResult.sucesso || !tarefaResult.dados) {
    const resultado = { sucesso: false, erro: 'Tarefa não encontrada', codigoErro: 'TASK_NOT_FOUND' };
    auditoria.registrarToolCall('kilohub_report_progress', projeto, { messageId, tarefaId, progress, message }, resultado);
    return mcpError(resultado);
  }

  await idempotency.marcarProcessado(messageId, 'kilohub_report_progress', tarefaId);

  const dados = {
    messageId,
    tarefaId,
    progress,
    message: message || `Progresso ${progress}% reportado para tarefa ${tarefaId}`,
    titulo: tarefaResult.dados.titulo,
    estadoAtual: tarefaResult.dados.estado
  };

  auditoria.registrar('KILO_PROGRESSO_REPORTADO', `Progresso ${progress}% reportado para tarefa ${tarefaId}`, {
    messageId,
    tarefaId,
    progress,
    estado: tarefaResult.dados.estado
  });
  auditoria.registrarToolCall('kilohub_report_progress', projeto, { messageId, tarefaId, progress, message }, { sucesso: true, dados });
  return toMcpStructured(dados);
});

registerTracedTool(mcpServer, 'kilohub_report_result', {
  title: 'Reportar Resultado',
  description: 'Reporta o resultado final de uma tarefa executada por um agente Kilo.',
  inputSchema: z.object({
    messageId: z.string(),
    tarefaId: z.string(),
    resultado: z.object({
      resumo: z.string(),
      arquivosAlterados: z.array(z.string()).optional(),
      testesExecutados: z.array(z.string()).optional(),
      testesAprovados: z.array(z.string()).optional(),
      riscosEncontrados: z.array(z.string()).optional(),
      pendencias: z.array(z.string()).optional(),
      observacoes: z.string().optional(),
      commit: z.string().optional()
    })
  }),
  annotations: {
    readOnlyHint: false
  }
}, async ({ messageId, tarefaId, resultado }: { messageId: string; tarefaId: string; resultado: Record<string, unknown> }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);

  const idempotency = new KiloIdempotencyService(projeto.fileService, projeto.auditoria);
  const jaProcessado = await idempotency.isProcessado(messageId);
  if (jaProcessado) {
    const resultadoOp = { sucesso: false, erro: `Mensagem duplicada: ${messageId}`, codigoErro: 'DUPLICATE_MESSAGE' };
    auditoria.registrarToolCall('kilohub_report_result', projeto, { messageId, tarefaId, resultado }, resultadoOp);
    return mcpError(resultadoOp);
  }

  const tarefaResult = ctx.dados!.servicos.tarefa.obter(tarefaId);
  if (!tarefaResult.sucesso || !tarefaResult.dados) {
    const resultadoOp = { sucesso: false, erro: 'Tarefa não encontrada', codigoErro: 'TASK_NOT_FOUND' };
    auditoria.registrarToolCall('kilohub_report_result', projeto, { messageId, tarefaId, resultado }, resultadoOp);
    return mcpError(resultadoOp);
  }

  const tarefa = tarefaResult.dados;
  const resumo = String(resultado.resumo || '');
  const arquivosAlterados = Array.isArray(resultado.arquivosAlterados) ? resultado.arquivosAlterados : [];
  const testesExecutados = Array.isArray(resultado.testesExecutados) ? resultado.testesExecutados : [];
  const testesAprovados = Array.isArray(resultado.testesAprovados) ? resultado.testesAprovados : [];
  const riscosEncontrados = Array.isArray(resultado.riscosEncontrados) ? resultado.riscosEncontrados : [];
  const pendencias = Array.isArray(resultado.pendencias) ? resultado.pendencias : [];
  const observacoes = String(resultado.observacoes || '');
  const commit = String(resultado.commit || '');

  const atualizacao = {
    resultado: {
      resumo,
      arquivosAlterados,
      testesExecutados,
      testesAprovados,
      riscosEncontrados,
      pendencias,
      observacoes,
      commit
    }
  };

  const atualizarResult = await ctx.dados!.servicos.tarefa.atualizar(tarefaId, atualizacao);
  if (!atualizarResult.sucesso) {
    const resultadoOp = { sucesso: false, erro: atualizarResult.erro, codigoErro: atualizarResult.codigoErro };
    auditoria.registrarToolCall('kilohub_report_result', projeto, { messageId, tarefaId, resultado }, resultadoOp);
    return mcpError(resultadoOp);
  }

  ctx.dados!.servicos.orquestrador.handoffAutomatico(tarefaId, tarefa.agenteResponsavel).catch((err) => {
    console.warn('[KILO][HANDOFF] Falha no handoff automático:', err?.message || err);
  });

  await idempotency.marcarProcessado(messageId, 'kilohub_report_result', tarefaId);

  const estadoAtual = atualizarResult.dados?.estado ?? null;

  const dados = {
    messageId,
    tarefaId,
    resultado: {
      resumo,
      arquivosAlterados,
      testesExecutados,
      testesAprovados,
      riscosEncontrados,
      pendencias,
      observacoes,
      commit
    },
    estadoAtual
  };

  auditoria.registrar('KILO_RESULTADO_REPORTADO', `Resultado reportado para tarefa ${tarefaId}: ${resumo}`, {
    messageId,
    tarefaId,
    estado: estadoAtual
  });
  auditoria.registrarToolCall('kilohub_report_result', projeto, { messageId, tarefaId, resultado }, { sucesso: true, dados });
  return toMcpStructured(dados);
});
