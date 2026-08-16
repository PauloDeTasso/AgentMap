import { mcpServer } from '../server';
import { toMcpStructured, mcpError, safeStringify } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

registerTracedTool(mcpServer, 'agentmap_projetos_listar', {
  title: 'Listar Projetos',
  description: 'Lista todos os projetos registrados no AgentMap.',
  inputSchema: z.object({}),
  annotations: {
    readOnlyHint: true
  }
}, async () => {
  const resultado = projetoService.listarProjetos();
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_projetos_criar', {
  title: 'Criar Projeto',
  description: 'Cria um novo projeto no AgentMap.',
  inputSchema: z.object({
    nome: z.string(),
    caminhoParental: z.string(),
    descricao: z.string()
  }),
  outputSchema: z.string()
}, async ({ nome, caminhoParental, descricao }: { nome: string; caminhoParental: string; descricao: string }) => {
  const resultado = projetoService.criarProjeto(nome, caminhoParental, descricao);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_projetos_abrir', {
  title: 'Abrir Projeto',
  description: 'Abre um projeto existente pelo caminho ou ID.',
  inputSchema: z.object({
    caminhoOuId: z.string()
  }),
  outputSchema: z.object({
    id: z.string(),
    nome: z.string(),
    caminhoRaiz: z.string(),
    config: z.record(z.string(), z.unknown())
  })
}, async ({ caminhoOuId }: { caminhoOuId: string }) => {
  const resultado = projetoService.abrirProjeto(caminhoOuId);
  if (resultado.sucesso && resultado.dados) {
    const { id, nome, caminhoRaiz, config } = resultado.dados;
    return toMcpStructured({ id, nome, caminhoRaiz, config });
  }
  return mcpError(resultado);
});

registerTracedTool(mcpServer, 'agentmap_projetos_fechar', {
  title: 'Fechar Projeto',
  description: 'Fecha o projeto atualmente aberto.',
  inputSchema: z.object({
    id: z.string()
  }),
  outputSchema: z.boolean(),
  annotations: {
    destructiveHint: true
  }
}, async ({ id }: { id: string }) => {
  const resultado = projetoService.fecharProjeto(id);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

registerTracedTool(mcpServer, 'agentmap_projetos_atual', {
  title: 'Projeto Atual',
  description: 'Retorna o projeto atualmente aberto.',
  inputSchema: z.object({}),
  annotations: {
    readOnlyHint: true
  }
}, async () => {
  const resultado = projetoService.getProjetoAtual();
  if (resultado.sucesso && resultado.dados) {
    const { id, nome, caminhoRaiz } = resultado.dados;
    return toMcpStructured({ id, nome, caminhoRaiz });
  }
  if (resultado.sucesso) {
    return {
      content: [{ type: 'text', text: safeStringify({ sucesso: true, dados: null }) }]
    };
  }
  return mcpError(resultado);
});

registerTracedTool(mcpServer, 'agentmap_integridade_verificar', {
  title: 'Verificar Integridade',
  description: 'Verifica a integridade do projeto aberto.',
  inputSchema: z.object({
    projetoId: z.string().optional()
  }),
  outputSchema: z.object({
    inconsistencias: z.array(z.string()),
    estado: z.string()
  }),
  annotations: {
    readOnlyHint: true
  }
}, async ({ projetoId }: { projetoId?: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.integridade.verificar(projetoId || ctx.dados!.projetoId);
  auditoria.registrarToolCall('agentmap_integridade_verificar', projeto, { projetoId }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
