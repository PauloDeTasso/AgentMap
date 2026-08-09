import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerWorkflowTool } from '../../observability/agent-tracing';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

registerWorkflowTool(mcpServer, 'agentmap_workflows_iniciar_trabalho', {
  title: 'Iniciar Trabalho',
  description: 'Inicia trabalho: valida agente + tarefa e monta contexto completo.',
  inputSchema: z.object({ agenteId: z.string(), tarefaId: z.string() }),
  outputSchema: z.object({
    agente: z.unknown(),
    tarefa: z.unknown(),
    contexto: z.unknown(),
    sessao: z.unknown()
  }).passthrough(),
  annotations: {
    readOnlyHint: false
  }
}, async ({ agenteId, tarefaId }: { agenteId: string, tarefaId: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const agenteResult = ctx.dados!.servicos.agente.obter(String(agenteId || ''));
  if (!agenteResult.sucesso) {
    auditoria.registrarToolCall('agentmap_workflows_iniciar_trabalho', projeto, { agenteId, tarefaId }, agenteResult);
    return mcpError(agenteResult);
  }
  const tarefaResult = ctx.dados!.servicos.tarefa.obter(String(tarefaId || ''));
  if (!tarefaResult.sucesso) {
    auditoria.registrarToolCall('agentmap_workflows_iniciar_trabalho', projeto, { agenteId, tarefaId }, tarefaResult);
    return mcpError(tarefaResult);
  }
  const contextoResult = await ctx.dados!.servicos.tarefa.montarContexto(String(tarefaId || ''));
  if (!contextoResult.sucesso) {
    auditoria.registrarToolCall('agentmap_workflows_iniciar_trabalho', projeto, { agenteId, tarefaId }, contextoResult);
    return mcpError(contextoResult);
  }
  const sessaoResult = await ctx.dados!.servicos.sessao.iniciar({
    agenteId: String(agenteId || ''),
    tarefaId: String(tarefaId || ''),
    projetoId: ctx.dados!.projetoId,
    contextoConsultado: { pacoteContexto: contextoResult.dados }
  });
  const resultado = { sucesso: true, dados: { agente: agenteResult.dados, tarefa: tarefaResult.dados, contexto: contextoResult.dados, sessao: sessaoResult.dados } };
  auditoria.registrarToolCall('agentmap_workflows_iniciar_trabalho', projeto, { agenteId, tarefaId }, resultado);
  return toMcpStructured(resultado.dados);
}, { extractAgentId: (input: { agenteId?: string }) => input.agenteId });

registerWorkflowTool(mcpServer, 'agentmap_workflows_finalizar_trabalho', {
  title: 'Finalizar Trabalho',
  description: 'Finaliza trabalho: registra resultado, artefatos, handoff, validacao e libera reservas.',
  inputSchema: z.object({
    sessaoId: z.string().optional(),
    tarefaId: z.string(),
    agenteId: z.string(),
    resumo: z.string().optional(),
    estado: z.string().optional()
  }).passthrough(),
  outputSchema: z.object({
    resultado: z.unknown(),
    handoff: z.unknown()
  }).passthrough()
}, async (dados: Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const { sessaoId, tarefaId, agenteId, ...resultadoDados } = dados;
  const resultado = await ctx.dados!.servicos.resultado.criar({
    tarefaId: String(tarefaId || ''),
    agenteId: String(agenteId || ''),
    ...resultadoDados
  });
  if (!resultado.sucesso) {
    auditoria.registrarToolCall('agentmap_workflows_finalizar_trabalho', projeto, dados, resultado);
    return mcpError(resultado);
  }
  const handoff = await ctx.dados!.servicos.handoff.criar({
    origem: String(agenteId || ''),
    destino: '',
    tarefaId: String(tarefaId || ''),
    resumo: String(dados.resumo || ''),
    estado: 'PENDENTE'
  });
  if (sessaoId) {
    const sessaoResult = await ctx.dados!.servicos.sessao.finalizar(String(sessaoId), { estadoFinal: String(dados.estado || 'CONCLUIDA') });
    if (!sessaoResult.sucesso) {
      auditoria.registrarToolCall('agentmap_workflows_finalizar_trabalho', projeto, dados, sessaoResult);
      return mcpError(sessaoResult);
    }
  }
  const finalResult = { sucesso: true, dados: { resultado: resultado.dados, handoff: handoff.dados } };
  auditoria.registrarToolCall('agentmap_workflows_finalizar_trabalho', projeto, dados, finalResult);
  return toMcpStructured(finalResult.dados);
}, { extractAgentId: (input: { agenteId?: string }) => input.agenteId });

registerTracedTool(mcpServer, 'agentmap_workflows_consultar_pendencias', {
  title: 'Consultar Pendencias',
  description: 'Consulta pendencias, handoffs, validacoes e bloqueios por agente.',
  inputSchema: z.object({ agenteId: z.string() }),
  outputSchema: z.object({
    pendencias: z.array(z.unknown()),
    handoffs: z.array(z.unknown()),
    validacoes: z.array(z.unknown()),
    bloqueios: z.array(z.unknown())
  }).passthrough(),
  annotations: {
    readOnlyHint: true
  }
}, async ({ agenteId }: { agenteId: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const aid = String(agenteId || '');
  const pendencias = ctx.dados!.servicos.pendencia.listar();
  const handoffs = ctx.dados!.servicos.handoff.listarPorDestino(aid);
  const validacoes = ctx.dados!.servicos.validacao.listar();
  const bloqueios = ctx.dados!.servicos.bloqueio.listar();
  const resultado = {
    sucesso: true,
    dados: {
      pendencias: pendencias.sucesso ? pendencias.dados : [],
      handoffs: handoffs.sucesso ? handoffs.dados : [],
      validacoes: validacoes.sucesso ? validacoes.dados : [],
      bloqueios: bloqueios.sucesso ? bloqueios.dados : []
    }
  };
  auditoria.registrarToolCall('agentmap_workflows_consultar_pendencias', projeto, { agenteId }, resultado);
  return toMcpStructured(resultado.dados);
}, { extractAgentId: (input: { agenteId?: string }) => input.agenteId });

registerTracedTool(mcpServer, 'agentmap_workflows_obter_mapa_projeto', {
  title: 'Mapa do Projeto',
  description: 'Obtem o mapa completo do projeto.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    projeto: z.record(z.string(), z.unknown()),
    agentes: z.array(z.unknown()),
    tarefas: z.array(z.unknown()),
    estado: z.unknown().nullable(),
    decisoes: z.array(z.unknown()),
    contratos: z.unknown().nullable(),
    permissoes: z.unknown().nullable()
  }).passthrough(),
  annotations: {
    readOnlyHint: true
  }
  }, async () => {
    const ctx = carregarContexto(projetoService);
    if (!ctx.sucesso) return mcpError(ctx);
    const { projeto } = ctx.dados!;
    const auditoria = createMcpAuditoria(projeto.auditoria);
    let agentes, tarefas, estado, decisoes, contratos, permissoes;
    try {
      [agentes, tarefas, estado, decisoes, contratos, permissoes] = await Promise.all([
        ctx.dados!.servicos.agente.listar(),
        ctx.dados!.servicos.tarefa.listar(),
        ctx.dados!.projeto.fileService.lerJson<any>('.ia/estado/estado-atual.json'),
        ctx.dados!.servicos.decisao.listar(),
        ctx.dados!.projeto.fileService.lerJson<any>('.ia/contratos/contratos.json'),
        ctx.dados!.projeto.fileService.lerJson<any>('.ia/configuracao/permissoes.json')
      ]);
    } catch (e: any) {
      const result = { sucesso: false, erro: e.message || 'Erro ao carregar mapa do projeto', codigoErro: 'MAP_LOAD_ERROR' };
      auditoria.registrarToolCall('agentmap_workflows_obter_mapa_projeto', projeto, {}, result);
      return mcpError(result);
    }
    const resultado = {
      sucesso: true,
      dados: {
        projeto: ctx.dados!.projeto.config,
        agentes: agentes.sucesso ? agentes.dados : [],
        tarefas: tarefas.sucesso ? tarefas.dados : [],
        estado: estado.sucesso && estado.dados ? estado.dados : null,
        decisoes: decisoes.sucesso ? decisoes.dados : [],
        contratos: contratos.sucesso && contratos.dados ? contratos.dados : null,
        permissoes: permissoes.sucesso && permissoes.dados ? permissoes.dados : null
      }
    };
    auditoria.registrarToolCall('agentmap_workflows_obter_mapa_projeto', projeto, {}, resultado);
    return toMcpStructured(resultado.dados);
  }, { extractAgentId: () => undefined });
