import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import { KiloIdempotencyService } from '../../servicios/KiloIdempotencyService';
import * as z from 'zod';
import * as path from 'path';
import { EstadoTarefa } from '../../tipos';

const ESTADOS_TERMINAIS: EstadoTarefa[] = ['CONCLUIDA', 'CANCELADA', 'REJEITADA'];

function isTerminal(estado: EstadoTarefa): boolean {
  return ESTADOS_TERMINAIS.includes(estado);
}

registerTracedTool(mcpServer, 'agentmap_tarefas_prontas_para_worktree', {
  description: 'Retorna apenas tarefas sem dependência pendente, prontas para worktree.',
  inputSchema: z.object({})
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const tarefasResult = ctx.dados!.servicos.tarefa.listar();
  if (!tarefasResult.sucesso || !tarefasResult.dados) {
    auditoria.registrarToolCall('agentmap_tarefas_prontas_para_worktree', projeto, {}, tarefasResult);
    return mcpError(tarefasResult);
  }

  const prontas = tarefasResult.dados.filter((tarefa) => {
    if (!tarefa.dependencias || tarefa.dependencias.length === 0) return true;
    const todasTerminais = tarefa.dependencias.every((depId) => {
      const depTarefa = tarefasResult.dados!.find((t) => t.id === depId);
      return depTarefa ? isTerminal(depTarefa.estado) : true;
    });
    return todasTerminais;
  });

  const resultado = { sucesso: true, dados: prontas };
  auditoria.registrarToolCall('agentmap_tarefas_prontas_para_worktree', projeto, {}, resultado);
  return toMcpStructured(prontas);
});

registerTracedTool(mcpServer, 'agentmap_verificar_dependencias_pendentes', {
  description: 'Verifica se uma tarefa tem dependências pendentes. Bloqueia se houver dependência não concluída.',
  inputSchema: z.object({ tarefaId: z.string() })
}, async ({ tarefaId }: { tarefaId: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);

  const tarefasResult = ctx.dados!.servicos.tarefa.listar();
  if (!tarefasResult.sucesso || !tarefasResult.dados) {
    auditoria.registrarToolCall('agentmap_verificar_dependencias_pendentes', projeto, { tarefaId }, tarefasResult);
    return mcpError(tarefasResult);
  }

  const tarefa = tarefasResult.dados.find((t) => t.id === tarefaId);
  if (!tarefa) {
    const resultado = { sucesso: false, erro: 'Tarefa não encontrada', codigoErro: 'NOT_FOUND' };
    auditoria.registrarToolCall('agentmap_verificar_dependencias_pendentes', projeto, { tarefaId }, resultado);
    return mcpError(resultado);
  }

  const pendentes: string[] = [];
  if (tarefa.dependencias && tarefa.dependencias.length > 0) {
    for (const depId of tarefa.dependencias) {
      const depTarefa = tarefasResult.dados.find((t) => t.id === depId);
      if (depTarefa && !isTerminal(depTarefa.estado)) {
        pendentes.push(depId);
      }
    }
  }

  const bloqueada = pendentes.length > 0;
  const resultado = {
    sucesso: true,
    dados: {
      tarefaId,
      bloqueada,
      dependenciasPendentes: pendentes,
      totalDependencias: tarefa.dependencias?.length || 0
    }
  };
  auditoria.registrarToolCall('agentmap_verificar_dependencias_pendentes', projeto, { tarefaId }, resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_abrir_worktree', {
  description: 'Registra intenção de criação de worktree para uma tarefa e retorna instruções para o Agent Manager (VS Code) ou passos manuais.',
  inputSchema: z.object({
    messageId: z.string(),
    tarefaId: z.string()
  })
}, async ({ messageId, tarefaId }: { messageId: string; tarefaId: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);

  const idempotency = new KiloIdempotencyService(projeto.fileService, projeto.auditoria);
  const jaProcessado = await idempotency.isProcessado(messageId);
  if (jaProcessado) {
    const resultado = { sucesso: false, erro: `Mensagem duplicada: ${messageId}`, codigoErro: 'DUPLICATE_MESSAGE' };
    auditoria.registrarToolCall('agentmap_abrir_worktree', projeto, { messageId, tarefaId }, resultado);
    return mcpError(resultado);
  }

  const tarefaResult = ctx.dados!.servicos.tarefa.obter(tarefaId);
  if (!tarefaResult.sucesso || !tarefaResult.dados) {
    const resultado = { sucesso: false, erro: 'Tarefa não encontrada', codigoErro: 'NOT_FOUND' };
    auditoria.registrarToolCall('agentmap_abrir_worktree', projeto, { messageId, tarefaId }, resultado);
    return mcpError(resultado);
  }

  const tarefa = tarefaResult.dados;
  const branchName = sanitizarBranch(`task/${tarefaId}-${tarefa.titulo.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`);

  const contextResult = await ctx.dados!.servicos.taskContextBuilder.gerarMarkdownContexto(tarefaId);
  const contextoGerado = contextResult.sucesso && contextResult.dados;

  const isVsCode = detectarAmbienteVsCode();
  const agentManagerDisponivel = isVsCode && !!process.env['VSCODE_PID'];

  const worktreePath = path.join(projeto.caminhoRaiz, `.kilo/worktrees/${branchName.replace(/\//g, '-')}`);

  const intention = {
    messageId,
    tarefaId,
    branchName,
    worktreePath,
    agenteId: tarefa.agenteResponsavel,
    criadoEm: new Date().toISOString(),
    status: 'PENDENTE'
  };

  const intentionsPath = path.win32.join('.ia', 'contexto', 'worktree-intentions.json');
  const intentionsResult = projeto.fileService.lerJson<{ intencoes: typeof intention[] }>(intentionsPath);
  const intentionsData = intentionsResult.sucesso && intentionsResult.dados
    ? intentionsResult.dados
    : { intencoes: [] };

  const existente = intentionsData.intencoes.findIndex(i => i.tarefaId === tarefaId && i.status !== 'CANCELADO');
  if (existente >= 0) {
    intentionsData.intencoes[existente] = { ...intentionsData.intencoes[existente], ...intention };
  } else {
    intentionsData.intencoes.push(intention);
  }
  projeto.fileService.escreverJson(intentionsPath, intentionsData);

  await idempotency.marcarProcessado(messageId, 'agentmap_abrir_worktree', tarefaId);

  const dados = {
    messageId,
    tarefaId,
    titulo: tarefa.titulo,
    branchName,
    contextoGerado,
    agentManagerDisponivel,
    worktreePath,
    instrucaoAgenteManager: agentManagerDisponivel
      ? {
          mode: 'worktree' as const,
          prompt: `Executar tarefa ${tarefaId}: ${tarefa.titulo}`,
          branchName,
          taskId: tarefaId
        }
      : null,
    mensagem: agentManagerDisponivel
      ? `Chame agent_manager com mode="worktree", branchName="${branchName}" e prompt da tarefa. Contexto: ${contextoGerado || 'não gerado'}.`
      : `Crie o worktree manualmente: git worktree add -b ${branchName} ${worktreePath} HEAD. Contexto: ${contextoGerado || 'não gerado'}.`,
    passos: agentManagerDisponivel
      ? [
          'Chame agent_manager com mode="worktree"',
          `branchName: "${branchName}"`,
          `prompt: "Executar tarefa ${tarefaId}: ${tarefa.titulo}"`,
          'Após criação, reconciliação detectará o novo worktree/session automaticamente'
        ]
      : [
          'git worktree add -b ' + branchName + ' ' + worktreePath + ' HEAD',
          'Copie o contexto gerado para o worktree',
          'Inicie o agente no worktree'
        ]
  };

  const resultado = { sucesso: true, dados };
  auditoria.registrar('WORKTREE_INTENCAO_CRIADA', `Intenção de worktree registrada para tarefa ${tarefaId} na branch ${branchName}`, {
    messageId,
    tarefaId,
    branchName,
    worktreePath
  });
  auditoria.registrarToolCall('agentmap_abrir_worktree', projeto, { messageId, tarefaId }, resultado);
  return toMcpStructured(dados);
});

function sanitizarBranch(branch: string): string {
  return branch.replace(/[^a-zA-Z0-9/_\-]/g, '').replace(/\/+/g, '/').replace(/^\/|\/$/g, '').slice(0, 100);
}

function detectarAmbienteVsCode(): boolean {
  const indicadores = ['TERM_PROGRAM', 'VSCODE_PID', 'VSCODE_CWD', 'VSCODE_GIT_ASKPASS'];
  return indicadores.some(key => !!process.env[key]);
}
