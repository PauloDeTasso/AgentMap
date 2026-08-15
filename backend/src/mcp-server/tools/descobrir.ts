import { mcpServer, projetoService, getMcpConfig } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import * as z from 'zod';
import * as fs from 'fs';
import * as path from 'path';

const AGENTMAP_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const docsPaths = [
  path.join(AGENTMAP_ROOT, 'README.md'),
  path.join(AGENTMAP_ROOT, 'docs', 'protocolo-mcp.md'),
  path.join(AGENTMAP_ROOT, 'docs', 'arquitetura-mcp.md'),
  path.join(AGENTMAP_ROOT, 'docs', 'guia-agente-mcp.md'),
];

const cliCommands = [
  { comando: 'npm run dev', descricao: 'Inicia backend + frontend na porta 3150' },
  { comando: 'npm run mcp', descricao: 'Inicia MCP Server via stdio' },
  { comando: 'npm test', descricao: 'Roda suite Jest completa' },
  { comando: 'npm run lint', descricao: 'TypeScript typecheck (tsc --noEmit)' },
  { comando: 'npm run build', descricao: 'Compila TypeScript' },
];

mcpServer.registerTool('agentmap_descobrir', {
  title: 'Descobrir AgentMap',
  description: 'Lista capabilities, agents, docs, CLI, worktree e onboarding do AgentMap.',
  inputSchema: z.object({}),
  annotations: {
    readOnlyHint: true
  }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);

  const docsDisponiveis = docsPaths
    .filter((p) => fs.existsSync(p))
    .map((p) => ({
      nome: path.basename(p),
      caminho: p.replace(AGENTMAP_ROOT, '').replace(/\\/g, '/'),
      existe: true
    }));

  const agents = ctx.dados!.servicos.agente.listar();
  const agentsList = agents.sucesso ? agents.dados : [];

  const resultado = {
    onboarding: {
      resource: 'agentmap://onboarding',
      prompt: 'agentmap-onboarding',
      initializeInstructions: 'Use tools para gerenciar projetos, tarefas, agentes, solicitacoes, handoffs, sessoes e demais entidades do AgentMap.'
    },
    capabilities: {
      tools: Object.keys((mcpServer as any)._registeredTools || {}),
      resources: ['agentmap://status', 'agentmap://manifest', 'agentmap://projeto', 'agentmap://onboarding', 'agentmap://solicitacoes/{agenteId}', 'agentmap://handoffs/{agenteId}', 'agentmap://bloqueios/{projetoId}'],
      prompts: ['agentmap-iniciar-trabalho', 'agentmap-finalizar-trabalho', 'agentmap-processar-handoff', 'agentmap-processar-solicitacao', 'agentmap-onboarding'],
      subscriptions: ['resources/subscribe (2025)', 'subscriptions/listen (2026)']
    },
    agents: (agentsList ?? []).map((a: any) => ({
      id: a.id,
      nome: a.nome,
      funcao: a.funcao,
      estado: a.estado
    })),
    projeto: projeto ? { id: projeto.id, nome: projeto.nome, caminhoRaiz: projeto.caminhoRaiz } : null,
    docs: docsDisponiveis,
    cli: cliCommands,
    worktree: {
      comando: 'git worktree list',
      descricao: 'Lista worktrees ativos para paralelismo real por agente'
    },
    agentManager: {
      comando: 'Agent Manager (extensão VS Code)',
      descricao: 'Painel de paralelismo real: worktrees isolados por agente'
    },
    mcp: {
      iniciar: 'npx tsx src/mcp-server/index.ts',
      transporte: 'stdio',
      protocolo: '2025-03-26 / 2026-07-28'
    }
  };

  auditoria.registrarToolCall('agentmap_descobrir', projeto, {}, { sucesso: true, dados: resultado });
  return toMcpStructured(resultado);
});
