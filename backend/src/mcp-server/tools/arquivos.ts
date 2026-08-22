import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { PathValidator, createPathValidator, DEFAULT_PATH_VALIDATOR_OPTIONS } from '../security/pathValidator';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

const arquivoInfoSchema = z.object({
  caminho: z.string(),
  nome: z.string(),
  tipo: z.string(),
  tamanho: z.number(),
  modificadoEm: z.string(),
  extensao: z.string()
}).passthrough();

registerTracedTool(mcpServer, 'agentmap_arquivos_listar', {
  title: 'Listar Arquivos',
  description: 'Lista arquivos em um diretorio do projeto.',
  inputSchema: z.object({ caminho: z.string() }),
  outputSchema: z.array(arquivoInfoSchema),
  annotations: { readOnlyHint: true }
}, async ({ caminho }: { caminho: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const pathValidator = createPathValidator(projeto.caminhoRaiz, DEFAULT_PATH_VALIDATOR_OPTIONS);
  const rel = String(caminho || '.');
  try {
    const validated = pathValidator.validate(rel);
    const resultado = ctx.dados!.projeto.fileService.listar(validated.caminhoRelativo);
    auditoria.registrarToolCall('agentmap_arquivos_listar', projeto, { caminho }, resultado);
    if (!resultado.sucesso) return mcpError(resultado);
    return toMcpStructured(resultado.dados);
  } catch (e: any) {
    const result = { sucesso: false, erro: e.message || 'Caminho invalido', codigoErro: 'PATH_TRAVERSAL' };
    auditoria.registrarToolCall('agentmap_arquivos_listar', projeto, { caminho }, result);
    return mcpError(result);
  }
});

registerTracedTool(mcpServer, 'agentmap_arquivos_ler', {
  title: 'Ler Arquivo',
  description: 'Le o conteudo de um arquivo do projeto.',
  inputSchema: z.object({ caminho: z.string() }),
  outputSchema: z.string(),
  annotations: { readOnlyHint: true }
}, async ({ caminho }: { caminho: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const pathValidator = createPathValidator(projeto.caminhoRaiz, DEFAULT_PATH_VALIDATOR_OPTIONS);
  const rel = String(caminho || '');
  try {
    const validated = pathValidator.validate(rel);
    const resultado = ctx.dados!.projeto.fileService.ler(validated.caminhoRelativo);
    auditoria.registrarToolCall('agentmap_arquivos_ler', projeto, { caminho }, resultado);
    if (!resultado.sucesso) return mcpError(resultado);
    return toMcpStructured(resultado.dados);
  } catch (e: any) {
    const result = { sucesso: false, erro: e.message || 'Caminho invalido', codigoErro: 'PATH_TRAVERSAL' };
    auditoria.registrarToolCall('agentmap_arquivos_ler', projeto, { caminho }, result);
    return mcpError(result);
  }
});

registerTracedTool(mcpServer, 'agentmap_arquivos_excluir', {
  title: 'Excluir Arquivo',
  description: 'Exclui um arquivo ou diretorio do projeto.',
  inputSchema: z.object({ caminho: z.string() }),
  outputSchema: z.string(),
  annotations: { destructiveHint: true }
}, async ({ caminho }: { caminho: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const pathValidator = createPathValidator(projeto.caminhoRaiz, DEFAULT_PATH_VALIDATOR_OPTIONS);
  const rel = String(caminho || '');
  try {
    const validated = pathValidator.validate(rel);
    const resultado = ctx.dados!.projeto.fileService.excluir(validated.caminhoRelativo, { backup: true });
    auditoria.registrarToolCall('agentmap_arquivos_excluir', projeto, { caminho }, resultado);
    if (!resultado.sucesso) return mcpError(resultado);
    return toMcpStructured(resultado.dados);
  } catch (e: any) {
    const result = { sucesso: false, erro: e.message || 'Caminho invalido', codigoErro: 'PATH_TRAVERSAL' };
    auditoria.registrarToolCall('agentmap_arquivos_excluir', projeto, { caminho }, result);
    return mcpError(result);
  }
});

registerTracedTool(mcpServer, 'agentmap_arquivos_excluir_todos', {
  title: 'Excluir Todos os Arquivos',
  description: 'Exclui todos os arquivos de um diretorio do projeto.',
  inputSchema: z.object({ caminho: z.string().optional() }),
  outputSchema: z.string(),
  annotations: { destructiveHint: true }
}, async ({ caminho }: { caminho?: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const pathValidator = createPathValidator(projeto.caminhoRaiz, DEFAULT_PATH_VALIDATOR_OPTIONS);
  const rel = String(caminho || '.');
  try {
    const validated = pathValidator.validate(rel);
    const resultado = ctx.dados!.projeto.fileService.excluir(validated.caminhoRelativo, { backup: true });
    auditoria.registrarToolCall('agentmap_arquivos_excluir_todos', projeto, { caminho }, resultado);
    if (!resultado.sucesso) return mcpError(resultado);
    return toMcpStructured(resultado.dados);
  } catch (e: any) {
    const result = { sucesso: false, erro: e.message || 'Caminho invalido', codigoErro: 'PATH_TRAVERSAL' };
    auditoria.registrarToolCall('agentmap_arquivos_excluir_todos', projeto, { caminho }, result);
    return mcpError(result);
  }
});
