import { mcpServer } from '../server';
import { toMcpResult, toMcpData } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { PathValidator, createPathValidator, DEFAULT_PATH_VALIDATOR_OPTIONS } from '../security/pathValidator';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

registerTracedTool(mcpServer, 'agentmap_arquivos_listar', {
  description: 'Lista arquivos em um diretorio do projeto.',
  inputSchema: z.object({ caminho: z.string() })
}, async ({ caminho }: { caminho: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const pathValidator = createPathValidator(projeto.caminhoRaiz, DEFAULT_PATH_VALIDATOR_OPTIONS);
  const rel = String(caminho || '.');
  try {
    const validated = pathValidator.validate(rel);
    const resultado = ctx.dados!.projeto.fileService.listar(validated.caminhoRelativo);
    auditoria.registrarToolCall('agentmap_arquivos_listar', projeto, { caminho }, resultado);
    if (!resultado.sucesso) return toMcpResult(resultado);
    return toMcpData(resultado.dados);
  } catch (e: any) {
    const result = { sucesso: false, erro: e.message || 'Caminho invalido', codigoErro: 'PATH_TRAVERSAL' };
    auditoria.registrarToolCall('agentmap_arquivos_listar', projeto, { caminho }, result);
    return toMcpResult(result);
  }
});

registerTracedTool(mcpServer, 'agentmap_arquivos_ler', {
  description: 'Le o conteudo de um arquivo do projeto.',
  inputSchema: z.object({ caminho: z.string() })
}, async ({ caminho }: { caminho: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const pathValidator = createPathValidator(projeto.caminhoRaiz, DEFAULT_PATH_VALIDATOR_OPTIONS);
  const rel = String(caminho || '');
  try {
    const validated = pathValidator.validate(rel);
    const resultado = ctx.dados!.projeto.fileService.ler(validated.caminhoRelativo);
    auditoria.registrarToolCall('agentmap_arquivos_ler', projeto, { caminho }, resultado);
    if (!resultado.sucesso) return toMcpResult(resultado);
    return toMcpData(resultado.dados);
  } catch (e: any) {
    const result = { sucesso: false, erro: e.message || 'Caminho invalido', codigoErro: 'PATH_TRAVERSAL' };
    auditoria.registrarToolCall('agentmap_arquivos_ler', projeto, { caminho }, result);
    return toMcpResult(result);
  }
});

registerTracedTool(mcpServer, 'agentmap_arquivos_excluir', {
  description: 'Exclui um arquivo ou diretorio do projeto.',
  inputSchema: z.object({ caminho: z.string() })
}, async ({ caminho }: { caminho: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return toMcpResult(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const pathValidator = createPathValidator(projeto.caminhoRaiz, DEFAULT_PATH_VALIDATOR_OPTIONS);
  const rel = String(caminho || '');
  try {
    const validated = pathValidator.validate(rel);
    const resultado = ctx.dados!.projeto.fileService.excluir(validated.caminhoRelativo, { backup: true });
    auditoria.registrarToolCall('agentmap_arquivos_excluir', projeto, { caminho }, resultado);
    if (!resultado.sucesso) return toMcpResult(resultado);
    return toMcpData(resultado.dados);
  } catch (e: any) {
    const result = { sucesso: false, erro: e.message || 'Caminho invalido', codigoErro: 'PATH_TRAVERSAL' };
    auditoria.registrarToolCall('agentmap_arquivos_excluir', projeto, { caminho }, result);
    return toMcpResult(result);
  }
});
