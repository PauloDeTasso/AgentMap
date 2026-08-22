import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const tarefaSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  objetivo: z.string(),
  tipo: z.string(),
  estado: z.string(),
  prioridade: z.string(),
  agenteResponsavel: z.string(),
  dominio: z.string(),
  ambiente: z.string(),
  dependencias: z.array(z.string()),
  contratosObrigatorios: z.array(z.string()),
  procedimentosObrigatorios: z.array(z.string()),
  arquivosPermitidos: z.array(z.string()),
  arquivosProibidos: z.array(z.string()),
  contextoNecessario: z.array(z.string()),
  criteriosAceitacao: z.array(z.string()),
  testesObrigatorios: z.array(z.string()),
  riscos: z.array(z.string()),
  restricoes: z.array(z.string()),
  condicoesDeParada: z.array(z.string()),
  criteriosConclusao: z.array(z.string()),
  estimativaHoras: z.number().optional(),
  dataLimite: z.string().optional(),
  tags: z.array(z.string()).optional(),
  resultado: z.object({
    resumo: z.string(),
    arquivosAlterados: z.array(z.string()),
    testesExecutados: z.array(z.string()),
    testesAprovados: z.array(z.string()),
    riscosEncontrados: z.array(z.string()),
    pendencias: z.array(z.string()),
    observacoes: z.string(),
    commit: z.string()
  }),
  aprovacao: z.object({
    necessaria: z.boolean(),
    estado: z.string(),
    aprovador: z.string(),
    dataAprovacao: z.string().optional()
  })
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_tarefas_listar', {
  title: 'Listar Tarefas',
  description: 'Lista todas as tarefas do projeto aberto.',
  inputSchema: z.object({}),
  annotations: {
    readOnlyHint: true
  }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.tarefa.listar();
  auditoria.registrarToolCall('agentmap_tarefas_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_tarefas_obter', {
  title: 'Obter Tarefa',
  description: 'Obtém uma tarefa pelo ID.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: tarefaSchema,
  annotations: {
    readOnlyHint: true
  }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.tarefa.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_tarefas_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_tarefas_criar', {
  title: 'Criar Tarefa',
  description: 'Cria uma nova tarefa no projeto.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: tarefaSchema
}, async (dados: Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.tarefa.criar(dados as any);
  auditoria.registrarToolCall('agentmap_tarefas_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_tarefas_atualizar', {
  title: 'Atualizar Tarefa',
  description: 'Atualiza uma tarefa existente.',
  inputSchema: z.object({ id: z.string() }).passthrough(),
  outputSchema: tarefaSchema,
  annotations: {
    idempotentHint: true
  }
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.tarefa.atualizar(String(id || ''), dados);
  auditoria.registrarToolCall('agentmap_tarefas_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_tarefas_alterar_estado', {
  title: 'Alterar Estado da Tarefa',
  description: 'Altera o estado de uma tarefa (respeitando transições válidas).',
  inputSchema: z.object({ id: z.string(), novoEstado: z.string() }),
  outputSchema: tarefaSchema,
  annotations: {
    idempotentHint: true
  }
}, async ({ id, novoEstado }: { id: string, novoEstado: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.tarefa.alterarEstado(String(id || ''), String(novoEstado || '') as any);
  auditoria.registrarToolCall('agentmap_tarefas_alterar_estado', projeto, { id, novoEstado }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_tarefas_excluir', {
  title: 'Excluir Tarefa',
  description: 'Exclui uma tarefa do projeto.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: {
    destructiveHint: true
  }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.tarefa.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_tarefas_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_tarefas_excluir_todos', {
  title: 'Excluir Todas as Tarefas',
  description: 'Exclui todas as tarefas do projeto.',
  inputSchema: z.object({}),
  outputSchema: z.number(),
  annotations: {
    destructiveHint: true
  }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.tarefa.excluirTodos();
  auditoria.registrarToolCall('agentmap_tarefas_excluir_todos', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_tarefas_contexto', {
  title: 'Contexto da Tarefa',
  description: 'Monta o pacote de contexto completo para uma tarefa.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.object({
    identidade: z.object({
      projetoId: z.string(),
      nome: z.string(),
      versao: z.string()
    }),
    contratos: z.array(z.unknown()),
    tarefa: z.unknown(),
    estado: z.unknown(),
    dependencias: z.array(z.unknown()),
    arquivosRelevantes: z.array(z.object({
      caminho: z.string(),
      conteudo: z.string()
    })),
    decisoes: z.array(z.unknown()),
    restricoes: z.array(z.string()),
    criteriosAceitacao: z.array(z.string()),
    agente: z.unknown().nullable()
  }).passthrough(),
  annotations: {
    readOnlyHint: true
  }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.tarefa.montarContexto(String(id || ''));
  auditoria.registrarToolCall('agentmap_tarefas_contexto', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
