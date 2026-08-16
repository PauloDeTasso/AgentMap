import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { ProjetoService } from '../servicios/ProjetoService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { loadSettings, GERENCIADOR_DIR } from '../config';
import { ResultadoOperacao } from '../tipos';
import * as path from 'path';

const esquemasPath = path.resolve(__dirname, '..', '..', '..', 'esquemas');
const validator = new SchemaValidator(esquemasPath);
const projetoService = new ProjetoService(validator);

const settings = loadSettings();

export interface McpConfig {
  nome: string;
  versao: string;
  protocolo: string;
  transporte: 'stdio';
  workspace: 'por-projeto';
  modo: 'read-only' | 'full';
  limites: {
    maxResults: number;
    maxSnippetLines: number;
    maxContentBytes: number;
    maxSearchResults: number;
  };
}

const DEFAULT_MCP_CONFIG: McpConfig = {
  nome: 'AgentMap',
  versao: '1.0.0',
  protocolo: '1.0',
  transporte: 'stdio',
  workspace: 'por-projeto',
  modo: 'full',
  limites: {
    maxResults: 100,
    maxSnippetLines: 200,
    maxContentBytes: 100_000,
    maxSearchResults: 50,
  },
};

let cachedConfig: McpConfig | null = null;

export function loadMcpConfig(): McpConfig {
  if (cachedConfig) {
    return { ...cachedConfig };
  }
  const s = loadSettings();
  return {
    ...DEFAULT_MCP_CONFIG,
    limites: {
      ...DEFAULT_MCP_CONFIG.limites,
      ...(s.limitesMcp || {})
    }
  };
}

export function getMcpConfig(): McpConfig {
  if (!cachedConfig) {
    cachedConfig = loadMcpConfig();
  }
  return { ...cachedConfig };
}

export { DEFAULT_MCP_CONFIG };

export const mcpServer = new McpServer(
  {
    name: 'agentmap',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {},
      resources: {
        subscribe: true,
        listChanged: true
      },
      prompts: {}
    },
    instructions: 'AgentMap MCP Server. Onboarding: 1) leia agentmap://onboarding, 2) use agentmap_descobrir para listar capabilities, 3) abra um projeto com agentmap_projetos_abrir, 4) consulte agentmap_agentes_listar e agentmap_obter_contexto_projeto. Você tem acesso a tools, resources, prompts e subscriptions (2025/2026).'
  }
);

export type McpContent = { content: Array<{ type: 'text'; text: string }> };

export function toMcpResult<T>(result: ResultadoOperacao<T>): McpContent {
  if (!result.sucesso) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sucesso: false,
            codigo: result.codigoErro || 'UNKNOWN_ERROR',
            mensagem: result.erro || 'Erro desconhecido',
            detalhes: {}
          })
        }
      ]
    };
  }
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          sucesso: true,
          dados: result.dados
        })
      }
    ]
  };
}

export function toMcpData(dados: unknown): McpContent {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(dados)
      }
    ]
  };
}

export { projetoService, validator, settings, esquemasPath };

