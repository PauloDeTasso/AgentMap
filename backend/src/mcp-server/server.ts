import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { ProjetoService } from '../servicios/ProjetoService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { loadSettings, ProjectRootResolver } from '../config';
import { ResultadoOperacao } from '../tipos';
import * as path from 'path';
import { toMcpStructured, mcpError } from './utils/helpers';

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

export { toMcpStructured, mcpError, McpContent } from './utils/helpers';

export { projetoService, validator, settings, esquemasPath };

// Inicializa projeto raiz automaticamente
try {
  const projectRoot = ProjectRootResolver.resolve();
  const resultado = projetoService.abrirProjetoRaiz();

  if (resultado.sucesso && resultado.dados) {
    console.error(`[MCP] Projeto raiz carregado: ${resultado.dados.nome} (${resultado.dados.id})`);
  } else {
    console.error('[MCP] Falha ao carregar projeto raiz:', resultado.erro);
    console.error('[MCP] Verifique se .ia/ existe em:', projectRoot);
  }
} catch (e) {
  console.error('[MCP] Erro na inicializacao do projeto:', e);
}
