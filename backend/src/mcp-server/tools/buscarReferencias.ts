import { mcpServer, toMcpResult, toMcpData, projetoService, getMcpConfig } from '../server';
import { carregarContexto } from '../contexto';
import { SchemaBuscarReferencias } from '../schemas/validacao';
import { buscarTermoEmArquivos, SearchHit } from '../utils/search';
import { PathValidator, createPathValidator, DEFAULT_PATH_VALIDATOR_OPTIONS } from '../security/pathValidator';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';

registerTracedTool(mcpServer, 'agentmap_buscar_referencias', {
  description:
      'Busca referências a um símbolo (nome) em arquivos do projeto, usando word-boundary matching.',
    inputSchema: SchemaBuscarReferencias,
  },
  async (args) => {
    const { simbolo, diretorio, limite } = args as {
      simbolo: string;
      diretorio?: string;
      limite?: number;
    };

    const ctx = carregarContexto(projetoService);
    if (!ctx.sucesso || !ctx.dados) {
      return toMcpResult(ctx);
    }

    const { projeto } = ctx.dados;
    const config = getMcpConfig();
    const searchDir = diretorio || '.';
    const searchLimite = limite || config.limites.maxSearchResults;
    const pathValidator = createPathValidator(projeto.caminhoRaiz, DEFAULT_PATH_VALIDATOR_OPTIONS);
    const auditoria = createMcpAuditoria(projeto.auditoria);

    try {
      const validated = pathValidator.validate(searchDir);

      if (!simbolo || simbolo.trim().length < 2) {
        const result = { sucesso: false, erro: 'simbolo deve ter pelo menos 2 caracteres', codigoErro: 'INVALID_INPUT' };
        auditoria.registrarToolCall('agentmap_buscar_referencias', projeto, { simbolo, diretorio, limite }, result);
        return toMcpResult(result);
      }

      const hits = await buscarTermoEmArquivos(
        projeto.fileService,
        validated.caminhoRelativo,
        simbolo,
        { limite: searchLimite, caseSensitive: false }
      );

      const dados = {
        simbolo: simbolo,
        diretorio: validated.caminhoRelativo,
        totalResultados: hits.length,
        resultados: hits,
      };

      return toMcpData(dados);
    } catch (e: any) {
      const result = { sucesso: false, erro: e.message || 'Diretório inválido', codigoErro: 'PATH_TRAVERSAL' };
      auditoria.registrarToolCall('agentmap_buscar_referencias', projeto, { simbolo, diretorio, limite }, result);
      return toMcpResult(result);
    }
  }
);