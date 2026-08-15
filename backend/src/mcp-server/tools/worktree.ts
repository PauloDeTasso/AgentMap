import { mcpServer } from '../server';
import { toMcpResult, toMcpData } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import * as z from 'zod';
import { EstadoTarefa } from '../../tipos';

const ESTADOS_TERMINAIS: EstadoTarefa[] = ['CONCLUIDA', 'CANCELADA', 'REJEITADA'];

function isTerminal(estado: EstadoTarefa): boolean {
  return ESTADOS_TERMINAIS.includes(estado);
}

mcpServer.registerTool('agentmap_tarefas_prontas_para_worktree', {
  description: 'Retorna apenas tarefas sem dependência pendente, prontas para worktree.',
  inputSchema: z.object({})
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const tarefasResult = ctx.dados!.servicos.tarefa.listar();
  if (!tarefasResult.sucesso || !tarefasResult.dados) {
    auditoria.registrarToolCall('agentmap_tarefas_prontas_para_worktree', projeto, {}, tarefasResult);
    return toMcpResult(tarefasResult);
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
  return toMcpData(prontas);
});

mcpServer.registerTool('agentmap_verificar_dependencias_pendentes', {
  description: 'Verifica se uma tarefa tem dependências pendentes. Bloqueia se houver dependência não concluída.',
  inputSchema: z.object({ tarefaId: z.string() })
}, async ({ tarefaId }: { tarefaId: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);

  const tarefasResult = ctx.dados!.servicos.tarefa.listar();
  if (!tarefasResult.sucesso || !tarefasResult.dados) {
    auditoria.registrarToolCall('agentmap_verificar_dependencias_pendentes', projeto, { tarefaId }, tarefasResult);
    return toMcpResult(tarefasResult);
  }

  const tarefa = tarefasResult.dados.find((t) => t.id === tarefaId);
  if (!tarefa) {
    const resultado = { sucesso: false, erro: 'Tarefa não encontrada', codigoErro: 'NOT_FOUND' };
    auditoria.registrarToolCall('agentmap_verificar_dependencias_pendentes', projeto, { tarefaId }, resultado);
    return toMcpResult(resultado);
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
  return toMcpData(resultado.dados);
});

mcpServer.registerTool('agentmap_abrir_worktree', {
  description: 'Integra com Agent Manager para criar worktree automaticamente para uma tarefa.',
  inputSchema: z.object({ tarefaId: z.string() })
}, async ({ tarefaId }: { tarefaId: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);

  const tarefaResult = ctx.dados!.servicos.tarefa.obter(tarefaId);
  if (!tarefaResult.sucesso || !tarefaResult.dados) {
    const resultado = { sucesso: false, erro: 'Tarefa não encontrada', codigoErro: 'NOT_FOUND' };
    auditoria.registrarToolCall('agentmap_abrir_worktree', projeto, { tarefaId }, resultado);
    return toMcpResult(resultado);
  }

  const tarefa = tarefaResult.dados;
  const branchName = `task/${tarefaId}`;

  const resultado = {
    sucesso: true,
    dados: {
      tarefaId,
      titulo: tarefa.titulo,
      branchName,
      mensagem: `Worktree deve ser criado via Agent Manager para branch ${branchName}. Integração com extensão VS Code necessária.`
    }
  };
  auditoria.registrarToolCall('agentmap_abrir_worktree', projeto, { tarefaId }, resultado);
  return toMcpData(resultado.dados);
});
