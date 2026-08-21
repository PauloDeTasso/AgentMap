import { mcpServer, projetoService, getMcpConfig } from '../server';
import { carregarContexto } from '../contexto';
import { SchemaLerTrechoArquivo } from '../schemas/validacao';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { PathValidator, createPathValidator, DEFAULT_PATH_VALIDATOR_OPTIONS } from '../security/pathValidator';
import { PathTraversalError } from '../../seguranca/paths';
import { registerTracedTool } from '../../observability/tool-tracing';
import { toMcpStructured, mcpError } from '../utils/helpers';
import * as z from 'zod';

interface ArquivoComLinhas {
  arquivo: string;
  totalLinhas: number;
  linhas: Array<{ numero: number; conteudo: string }>;
  truncado: boolean;
}

registerTracedTool(mcpServer, 'agentmap_ler_trecho_arquivo', {
  description:
      'Lê um trecho (ou o total) de um arquivo do projeto. Valida path traversal e aplica limite de linhas.',
    inputSchema: SchemaLerTrechoArquivo,
  },
  async (args) => {
    const { caminho, linhaInicio, linhaFim, limite } = args as {
      caminho: string;
      linhaInicio?: number;
      linhaFim?: number;
      limite?: number;
    };

    const ctx = carregarContexto(projetoService);
    if (!ctx.sucesso || !ctx.dados) {
      return mcpError(ctx);
    }

    const { projeto } = ctx.dados;
    const auditoria = createMcpAuditoria(projeto.auditoria);
    const config = getMcpConfig();
    const maxLines = limite || config.limites.maxSnippetLines;
    const pathValidator = createPathValidator(projeto.caminhoRaiz, DEFAULT_PATH_VALIDATOR_OPTIONS);

    try {
      const validated = pathValidator.validate(caminho);
      const readResult = projeto.fileService.ler(validated.caminhoRelativo);
      if (!readResult.sucesso || !readResult.dados) {
        const result = readResult;
        auditoria.registrarToolCall('agentmap_ler_trecho_arquivo', projeto, { caminho, linhaInicio, linhaFim, limite }, result);
        return mcpError(result);
      }

      const content = readResult.dados;
      const lines = content.split('\n');
      const totalLinhas = lines.length;

      let startIdx = 0;
      let endIdx = totalLinhas;

      if (linhaInicio !== undefined && linhaInicio !== null && linhaInicio > 0) {
        startIdx = linhaInicio - 1;
      }
      if (linhaFim !== undefined && linhaFim !== null && linhaFim > 0) {
        endIdx = Math.min(linhaFim, totalLinhas);
      }

      let selectedLines = lines.slice(startIdx, endIdx);
      let truncado = false;

      if (selectedLines.length > maxLines) {
        selectedLines = selectedLines.slice(0, maxLines);
        truncado = true;
      }

      const linhasComNumero = selectedLines.map((line, i) => ({
        numero: startIdx + i + 1,
        conteudo: line,
      }));

      const dados: ArquivoComLinhas = {
        arquivo: caminho,
        totalLinhas,
        linhas: linhasComNumero,
        truncado,
      };

      auditoria.registrarToolCall('agentmap_ler_trecho_arquivo', projeto, { caminho, linhaInicio, linhaFim, limite }, { sucesso: true, dados });
      return toMcpStructured(dados);
    } catch (e: any) {
      const result = { sucesso: false, erro: e.message || 'Caminho invalido', codigoErro: 'PATH_TRAVERSAL' };
      auditoria.registrarToolCall('agentmap_ler_trecho_arquivo', projeto, { caminho, linhaInicio, linhaFim, limite }, result);
      return mcpError(result);
    }
  }
);