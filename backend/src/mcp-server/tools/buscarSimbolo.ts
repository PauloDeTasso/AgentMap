import { mcpServer, toMcpResult, toMcpData, projetoService, getMcpConfig } from '../server';
import { carregarContexto } from '../contexto';
import { SchemaBuscarSimbolo } from '../schemas/validacao';
import { buscarSimboloDefinicoes, SearchHit } from '../utils/search';
import { PathValidator, createPathValidator, DEFAULT_PATH_VALIDATOR_OPTIONS } from '../security/pathValidator';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import * as z from 'zod';

mcpServer.registerTool(
  'agentmap_buscar_simbolo',
  {
    description:
      'Busca definições de símbolos (funções, classes, variáveis, constantes, interfaces) em arquivos do projeto.',
    inputSchema: SchemaBuscarSimbolo,
  },
  async (args) => {
    const { simbolo, tipo, diretorio, limite } = args as {
      simbolo: string;
      tipo?: 'funcao' | 'classe' | 'variavel' | 'constante' | 'interface' | 'todos';
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

    try {
      const validated = pathValidator.validate(searchDir);
      const hits = await buscarSimboloDefinicoes(
        projeto.fileService,
        validated.caminhoRelativo,
        simbolo || '',
        tipo || 'todos',
        searchLimite
      );

      const dados = {
        simbolo: simbolo,
        tipo: tipo || 'todos',
        diretorio: validated.caminhoRelativo,
        totalResultados: hits.length,
        resultados: hits,
      };

      return toMcpData(dados);
    } catch (e: any) {
      const result = { sucesso: false, erro: e.message || 'Diretório inválido', codigoErro: 'PATH_TRAVERSAL' };
      const auditoria = createMcpAuditoria(projeto.auditoria);
      auditoria.registrarToolCall('agentmap_buscar_simbolo', projeto, { simbolo, tipo, diretorio, limite }, result);
      return toMcpResult(result);
    }
  }
);