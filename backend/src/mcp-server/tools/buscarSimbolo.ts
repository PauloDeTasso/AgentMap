import { mcpServer, projetoService, getMcpConfig } from '../server';
import { carregarContexto } from '../contexto';
import { SchemaBuscarSimbolo } from '../schemas/validacao';
import { buscarSimboloDefinicoes, SearchHit } from '../utils/search';
import { PathValidator, createPathValidator, DEFAULT_PATH_VALIDATOR_OPTIONS } from '../security/pathValidator';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import { toMcpStructured, mcpError } from '../utils/helpers';
import * as z from 'zod';

registerTracedTool(mcpServer, 'agentmap_buscar_simbolo', {
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
      return mcpError(ctx);
    }

    if (!simbolo || simbolo.trim().length < 1) {
      const result = { sucesso: false, erro: 'simbolo deve ter pelo menos 1 caractere', codigoErro: 'INVALID_INPUT' };
      const auditoria = createMcpAuditoria(ctx.dados.projeto.auditoria);
      auditoria.registrarToolCall('agentmap_buscar_simbolo', ctx.dados.projeto, { simbolo, tipo, diretorio, limite }, result);
      return mcpError(result);
    }

    const { projeto } = ctx.dados;
    const config = getMcpConfig();
    const searchDir = diretorio || '.';
    const searchLimite = limite || config.limites.maxSearchResults;
    const pathValidator = createPathValidator(projeto.caminhoRaiz, DEFAULT_PATH_VALIDATOR_OPTIONS);
    const auditoria = createMcpAuditoria(projeto.auditoria);

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

      auditoria.registrarToolCall('agentmap_buscar_simbolo', projeto, { simbolo, tipo, diretorio, limite }, { sucesso: true, dados });
      return toMcpStructured(dados);
    } catch (e: any) {
      const result = { sucesso: false, erro: e.message || 'Diretório inválido', codigoErro: 'PATH_TRAVERSAL' };
      const auditoria = createMcpAuditoria(projeto.auditoria);
      auditoria.registrarToolCall('agentmap_buscar_simbolo', projeto, { simbolo, tipo, diretorio, limite }, result);
      return mcpError(result);
    }
  }
);