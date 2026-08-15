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
      playbook: 'agentmap://playbook',
      initializeInstructions: 'Use tools para gerenciar projetos, tarefas, agentes, solicitacoes, handoffs, sessoes e demais entidades do AgentMap.'
    },
    capabilities: {
      tools: Object.keys((mcpServer as any)._registeredTools || {}),
      resources: ['agentmap://status', 'agentmap://manifest', 'agentmap://projeto', 'agentmap://onboarding', 'agentmap://playbook', 'agentmap://solicitacoes/{agenteId}', 'agentmap://handoffs/{agenteId}', 'agentmap://bloqueios/{projetoId}'],
      prompts: ['agentmap-iniciar-trabalho', 'agentmap-finalizar-trabalho', 'agentmap-processar-handoff', 'agentmap-processar-solicitacao', 'agentmap-onboarding'],
      subscriptions: {
        legacy: 'resources/subscribe (2025)',
        modern: 'subscriptions/listen (2026-07-28)',
        cancelamento: 'notifications/cancelled',
        acknowledged: 'notifications/subscriptions/acknowledged',
        updated: 'notifications/resources/updated',
        recursos: [
          'agentmap://solicitacoes/{agenteId}',
          'agentmap://handoffs/{agenteId}',
          'agentmap://bloqueios/{projetoId}'
        ],
        coalescencia: '100ms por URI',
        reconnect: 'cliente deve re-listen após reconexão stdio'
      }
    },
    mcp: {
      iniciar: 'npx tsx src/mcp-server/index.ts',
      transporte: 'stdio',
      protocolo: '2025-03-26 / 2026-07-28',
      sdk: '@modelcontextprotocol/sdk v1.30.0',
      tools: Object.keys((mcpServer as any)._registeredTools || {}).length,
      resources: 8,
      prompts: 5
    },
    subscriptions: {
      legacy: {
        metodo: 'resources/subscribe',
        cancelamento: 'resources/unsubscribe',
        notificacao: 'notifications/resources/updated',
        como_usar: 'Inscreva-se em um URI, receba notificacoes, leia o recurso'
      },
      modern: {
        metodo: 'subscriptions/listen',
        cancelamento: 'notifications/cancelled',
        acknowledged: 'notifications/subscriptions/acknowledged',
        notificacao: 'notifications/resources/updated',
        subscriptionId: '_meta["io.modelcontextprotocol/subscriptionId"]',
        como_usar: 'Envie filtro com resourceSubscriptions, receba acknowledged, receba updates com subscriptionId, re-listen apos reconnect'
      }
    },
    changeNotifications: {
      o_que_e: 'Notificacoes automaticas quando recursos mudam',
      como_funciona: 'EventBus publica mudanca -> coalesce por URI (100ms) -> notifica subscribers',
      tipos: ['notifications/resources/updated', 'notifications/subscriptions/acknowledged', 'notifications/cancelled'],
      exemplo_fluxo: 'Criar solicitacao -> EventBus.publish -> sendResourceUpdated -> cliente recebe notificacao -> cliente le resources/read'
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
      o_que_e: 'Isolamento de diretorio por agente para trabalho paralelo',
      comando: 'git worktree list',
      descricao: 'Lista worktrees ativos',
      como_usar: 'Cada agente trabalha em seu proprio worktree isolado, evitando conflitos de arquivos',
      integration: 'Agent Manager (extensao VS Code) cria worktrees automaticamente'
    },
    agentManager: {
      o_que_e: 'Extensao VS Code para gerenciar worktrees e sessoes paralelas',
      comando: 'Agent Manager (extensao VS Code)',
      descricao: 'Painel de paralelismo real: worktrees isolados por agente',
      como_usar: 'Crie sessoes, atribua secoes, execute agentes em paralelo',
      integracao: 'Usa git worktrees para isolamento real'
    },
    seguranca: {
      apiKey: 'Header x-api-key obrigatorio para API REST',
      csrf: 'Middleware CSRF ativo para metodos nao-GET',
      cors: 'CORS configurado para origins locais de desenvolvimento',
      pathTraversal: 'Protecao contra path traversal em todos os caminhos de arquivo',
      autorizacao: 'authorizeResourceAccess() valida acesso a recursos por projeto'
    },
    estrutura: {
      projetos: 'Pasta base de projetos (configuravel por projeto)',
      ia: '.ia/ dentro de cada projeto com contratos, tarefas, handoffs, etc.',
      fluxo: '.ia/fluxo-trabalho.md obrigatorio',
      checklist: '.ia/fluxo-trabalho.md + pastas .ia/contratos, .ia/tarefas, .ia/dependencias + pelo menos 1 contrato e 1 tarefa'
    },
    eventos: {
      o_que_e: 'Eventos assincronos para coordenacao entre agentes',
      tipos: ['HANDOFF_CRIADO', 'HANDOFF_ACEITO', 'HANDOFF_CONCLUIDO', 'SOLICITACAO_CRIADA'],
      consumo: 'agentmap_eventos_pendentes + agentmap_eventos_confirmar',
      custom: 'POST /api/eventos/custom para eventos genericos'
    },
    api: {
      base: 'http://localhost:3150/api',
      endpoints: [
        'GET /api/auth/key',
        'POST /api/auth/verify',
        'POST /api/auth/login',
        'POST /api/auth/logout',
        'GET /api/status',
        'GET /api/health',
        'GET /api/projetos',
        'POST /api/projetos',
        'POST /api/projetos/:id/abrir',
        'POST /api/projetos/:id/fechar',
        'GET /api/eventos',
        'POST /api/eventos/custom',
        'PUT /api/eventos/:id/consumir'
      ]
    },
    websocket: {
      endpoint: 'ws://localhost:3150/ws/monitoramento',
      descricao: 'Monitoramento em tempo real do estado do projeto'
    }
  };

  auditoria.registrarToolCall('agentmap_descobrir', projeto, {}, { sucesso: true, dados: resultado });
  return toMcpStructured(resultado);
});
