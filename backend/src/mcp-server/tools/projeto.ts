import { mcpServer } from '../server';
import { toMcpResult, toMcpData } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import * as z from 'zod';

mcpServer.registerTool('agentmap_projetos_listar', {
  description: 'Lista todos os projetos registrados no AgentMap.',
  inputSchema: z.object({})
}, async () => {
  const resultado = projetoService.listarProjetos();
  return toMcpData(resultado.sucesso ? resultado.dados : { sucesso: resultado.sucesso, codigo: resultado.codigoErro, mensagem: resultado.erro });
});

mcpServer.registerTool('agentmap_projetos_criar', {
  description: 'Cria um novo projeto no AgentMap.',
  inputSchema: z.object({
    nome: z.string(),
    caminhoParental: z.string(),
    descricao: z.string()
  })
}, async ({ nome, caminhoParental, descricao }: { nome: string; caminhoParental: string; descricao: string }) => {
  const resultado = projetoService.criarProjeto(nome, caminhoParental, descricao);
  return toMcpData(resultado.sucesso ? resultado.dados : { sucesso: resultado.sucesso, codigo: resultado.codigoErro, mensagem: resultado.erro });
});

mcpServer.registerTool('agentmap_projetos_abrir', {
  description: 'Abre um projeto existente pelo caminho ou ID.',
  inputSchema: z.object({
    caminhoOuId: z.string()
  })
  }, async ({ caminhoOuId }: { caminhoOuId: string }) => {
  const resultado = projetoService.abrirProjeto(caminhoOuId);
  if (resultado.sucesso && resultado.dados) {
    const { id, nome, caminhoRaiz, config } = resultado.dados;
    return toMcpData({ id, nome, caminhoRaiz, config });
  }
  return toMcpData({ sucesso: resultado.sucesso, codigo: resultado.codigoErro, mensagem: resultado.erro });
});

mcpServer.registerTool('agentmap_projetos_fechar', {
  description: 'Fecha o projeto atualmente aberto.',
  inputSchema: z.object({
    id: z.string()
  })
}, async ({ id }: { id: string }) => {
  const resultado = projetoService.fecharProjeto(id);
  return toMcpData(resultado.sucesso ? resultado.dados : { sucesso: resultado.sucesso, codigo: resultado.codigoErro, mensagem: resultado.erro });
});

mcpServer.registerTool('agentmap_projetos_atual', {
  description: 'Retorna o projeto atualmente aberto.',
  inputSchema: z.object({})
  }, async () => {
  const resultado = projetoService.getProjetoAtual();
  if (resultado.sucesso && resultado.dados) {
    const { id, nome, caminhoRaiz } = resultado.dados;
    return toMcpData({ id, nome, caminhoRaiz });
  }
  return toMcpData({ sucesso: resultado.sucesso, codigo: resultado.codigoErro, mensagem: resultado.erro });
});

mcpServer.registerTool('agentmap_integridade_verificar', {
  description: 'Verifica a integridade do projeto aberto.',
  inputSchema: z.object({
    projetoId: z.string().optional()
  })
}, async ({ projetoId }: { projetoId?: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.integridade.verificar(projetoId || ctx.dados!.projetoId);
  auditoria.registrarToolCall('agentmap_integridade_verificar', projeto, { projetoId }, resultado);
  if (!resultado.sucesso) return toMcpResult(resultado);
  return toMcpData(resultado.dados);
});
