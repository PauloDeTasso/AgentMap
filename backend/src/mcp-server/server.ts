import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { ProjetoService } from '../servicios/ProjetoService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { loadSettings, GERENCIADOR_DIR } from '../config';
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

try {
  const gerenciadorResolvido = path.resolve(GERENCIADOR_DIR);
  const registro = projetoService.listarProjetos().dados || [];
  const projetoAtualId = (projetoService as any).registro?.projetoAtual;

  if (projetoAtualId) {
    const projetoAtual = registro.find((p: any) => p.id === projetoAtualId);
    if (projetoAtual) {
      const resultado = projetoService.abrirProjeto(projetoAtualId);
      if (resultado.sucesso) {
        console.error(`[MCP] Projeto atual restaurado: ${resultado.dados?.nome || projetoAtualId}`);
      } else {
        console.error('[MCP] Falha ao restaurar projeto atual:', resultado.erro);
      }
    } else {
      console.error('[MCP] Projeto atual registrado não encontrado, abrindo AgentMap...');
      const agentMapComoProjeto = registro.find((p: any) => p.caminhoRaiz === gerenciadorResolvido);
      if (!agentMapComoProjeto) {
        const resultado = projetoService.abrirProjeto(gerenciadorResolvido);
        if (resultado.sucesso) {
          console.error('[MCP] AgentMap auto-aberto como projeto atual.');
        } else if (resultado.codigoErro !== 'IA_NOT_FOUND') {
          console.error('[MCP] Falha ao auto-abrir AgentMap:', resultado.erro);
        }
      } else {
        projetoService.abrirProjeto(agentMapComoProjeto.id);
      }
    }
  } else {
    const agentMapComoProjeto = registro.find((p: any) => p.caminhoRaiz === gerenciadorResolvido);
    if (!agentMapComoProjeto) {
      const resultado = projetoService.abrirProjeto(gerenciadorResolvido);
      if (resultado.sucesso) {
        console.error('[MCP] AgentMap auto-aberto como projeto atual.');
      } else if (resultado.codigoErro !== 'IA_NOT_FOUND') {
        console.error('[MCP] Falha ao auto-abrir AgentMap:', resultado.erro);
      }
    } else {
      projetoService.abrirProjeto(agentMapComoProjeto.id);
    }
  }
} catch (e) {
  console.error('[MCP] Erro na inicializacao do projeto AgentMap:', e);
}

