import { mcpServer, projetoService } from '../server';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate';
import { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types';
import { solicitacoesUri, handoffsUri, bloqueiosUri, parseSolicitacoesUri, parseHandoffsUri, parseBloqueiosUri } from './uri-factory';
import { globalEventBus } from '../events/event-bus';
import { subscriptionManager, ListenSubscription } from '../subscriptions/subscription-manager';
import { carregarContexto } from '../contexto';
import { SolicitacaoAlteracao } from 'tipos';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

const SubscribeRequestSchema = z.object({
  method: z.literal('resources/subscribe'),
  params: z.object({
    uri: z.string()
  })
});

const UnsubscribeRequestSchema = z.object({
  method: z.literal('resources/unsubscribe'),
  params: z.object({
    uri: z.string()
  })
});

mcpServer.registerResource(
  'agentmap-status',
  'agentmap://status',
  {
    description: 'Status do servidor MCP do AgentMap.',
    mimeType: 'application/json'
  },
  async () => {
    return {
      contents: [{
        uri: 'agentmap://status',
        mimeType: 'application/json',
        text: JSON.stringify({
          status: 'online',
          versao: '1.0.0',
          transporte: 'stdio',
          protocolo: '1.0'
        })
      }]
    };
  }
);

mcpServer.registerResource(
  'agentmap-manifest',
  'agentmap://manifest',
  {
    description: 'Manifesto do AgentMap (capacidades, regras, versão).',
    mimeType: 'application/json'
  },
  async () => {
    return {
      contents: [{
        uri: 'agentmap://manifest',
        mimeType: 'application/json',
        text: JSON.stringify({
          nome: 'AgentMap',
          versao: '1.0.0',
          protocolo: '1.0',
          capacidades: ['projetos', 'agentes', 'tarefas', 'solicitacoes', 'handoffs', 'sessoes', 'checkpoints', 'riscos', 'bloqueios', 'pendencias', 'reservas', 'decisoes', 'dependencias', 'responsabilidades', 'artefatos', 'resultados', 'criterios', 'aprendizados', 'validacoes', 'arquivos', 'auditoria', 'workflows'],
          regras: {
            leituraObrigatoriaAntesDoTrabalho: true,
            resultadoObrigatorio: true,
            handoffQuandoNecessario: true,
            validacaoSeparadaDaConclusao: true
          },
          workspace: 'por-projeto',
          transporte: 'stdio'
        })
      }]
    };
  }
);

mcpServer.registerResource(
  'agentmap-projeto',
  'agentmap://projeto',
  {
    description: 'Config do projeto atual.',
    mimeType: 'application/json'
  },
  async () => {
    const resultado = projetoService.getProjetoAtual();
    if (!resultado.sucesso || !resultado.dados) {
      return {
        contents: [{
          uri: 'agentmap://projeto',
          mimeType: 'application/json',
          text: JSON.stringify({ sucesso: false, erro: 'Nenhum projeto aberto', codigoErro: 'NO_PROJECT_OPEN' })
        }]
      };
    }
    return {
      contents: [{
        uri: 'agentmap://projeto',
        mimeType: 'application/json',
        text: JSON.stringify({ sucesso: true, dados: resultado.dados.config })
      }]
    };
  }
);

mcpServer.registerResource(
  'agentmap-onboarding',
  'agentmap://onboarding',
  {
    description: 'Guia de descoberta do AgentMap: capabilities, tools, agents, CLI, docs e worktree.',
    mimeType: 'text/markdown'
  },
  async () => {
    const ctx = carregarContexto(projetoService);
    const projetoAberto = ctx.sucesso && ctx.dados;
    const agents = projetoAberto ? ctx.dados!.servicos.agente.listar() : { sucesso: false, dados: [] };
    const agentsList = agents.sucesso ? agents.dados : [];

    const markdown = `# 🗺️ AgentMap — Onboarding

Bem-vindo ao **AgentMap**. Este é um sistema local de coordenação, memória operacional e rastreabilidade para projetos desenvolvidos por múltiplos agentes de IA.

## 🚀 Comece aqui

1. **Descubra o sistema:** use a tool \`agentmap_descobrir\` para listar capabilities, agents, docs, CLI, worktree e mais.
2. **Abra um projeto:** use \`agentmap_projetos_abrir\` com o caminho ou ID do projeto.
3. **Consulte agentes:** use \`agentmap_agentes_listar\` para ver quem está ativo.
4. **Obtenha contexto:** use \`agentmap_obter_contexto_projeto\` para entender o estado atual.
5. **Use workflows:** \`agentmap_workflows_iniciar_trabalho\` para começar uma tarefa com contexto completo.

## 📚 Playbook & Guia de Eficácia

Use o resource \`agentmap://playbook\` para ver fluxos prontos:
- Ciclo de trabalho completo
- Handoff entre agentes
- Processamento de solicitação
- Diagnóstico de bloqueios
- Auditoria e compliance

Use o resource \`agentmap://guia-eficacia\` para entender **quando, por que e como** usar cada ferramenta em cenários reais:
- Planejamento, codificação, testes, debug, code review
- Workflows por domínio (backend, frontend, banco, android)
- Combinações poderosas de ferramentas
- Erros fatais e como evitá-los
- Níveis de maestria

## 📡 Subscriptions (notificações em tempo real)

- **2025:** \`resources/subscribe\` + \`resources/unsubscribe\`
- **2026:** \`subscriptions/listen\` + \`notifications/cancelled\`

Recursos assináveis:
- \`agentmap://solicitacoes/{agenteId}\`
- \`agentmap://handoffs/{agenteId}\`
- \`agentmap://bloqueios/{projetoId}\`

## 🛠️ CLI

- \`npm run dev\` — Backend + frontend na porta 3150
- \`npm run mcp\` — MCP Server via stdio
- \`npm test\` — Testes
- \`npm run lint\` — Typecheck

## 📚 Documentação

- \`README.md\` — Visão geral
- \`docs/protocolo-mcp.md\` — Protocolo MCP
- \`docs/arquitetura-mcp.md\` — Arquitetura
- \`docs/guia-agente-mcp.md\` — Guia do agente

## 🤖 Agentes ativos

${(agentsList ?? []).length > 0 ? (agentsList as any[]).map((a: any) => '- **' + a.nome + '** (`' + a.id + '`) — ' + a.funcao).join('\n') : '- Nenhum projeto aberto. Abra um projeto primeiro.'}

## 📡 MCP Subscriptions & Change Notifications

O AgentMap suporta notificacoes em tempo real via dois modos:

**2025 (legacy):**
- \`resources/subscribe\` + \`resources/unsubscribe\`
- Notificacao: \`notifications/resources/updated\`

**2026 (moderno):**
- \`subscriptions/listen\` com filtro \`resourceSubscriptions\`
- Notificacao: \`notifications/subscriptions/acknowledged\` + \`notifications/resources/updated\` com \`_meta['io.modelcontextprotocol-subscriptionId']\`
- Cancelamento: \`notifications/cancelled\`
- Apos reconexao stdio, o cliente deve re-listen

**Recursos assinaveis:**
- \`agentmap://solicitacoes/{agenteId}\`
- \`agentmap://handoffs/{agenteId}\`
- \`agentmap://bloqueios/{projetoId}\`

**Coalescencia:** EventBus agrupa notificacoes do mesmo URI em janela de 100ms.

## 🛠️ CLI & Worktree

**CLI:**
- \`npm run dev\` — Backend + frontend na porta 3150
- \`npm run mcp\` — MCP Server via stdio
- \`npm test\` — Testes
- \`npm run lint\` — Typecheck

**Worktree (paralelismo real):**
- \`git worktree list\` — Lista worktrees ativos
- Cada agente trabalha em seu proprio worktree isolado
- Agent Manager (extensao VS Code) cria worktrees automaticamente

## 🤖 Agent Manager

- Painel de paralelismo real para VS Code
- Gerencia worktrees isolados por agente
- Cria sessoes, atribui secoes, executa agentes em paralelo

## 🔐 Seguranca

- **API Key:** Header \`x-api-key\` obrigatorio para API REST
- **CSRF:** Middleware ativo para metodos nao-GET
- **CORS:** Configurado para origins locais de desenvolvimento
- **Path Traversal:** Protecao em todos os caminhos de arquivo
- **Autorizacao:** \`authorizeResourceAccess()\` valida acesso por projeto

## 📁 Estrutura & Fluxo

- Projetos vivem em pasta configuravel (ex: \`G:\\PROJETOS\\AgenteMap_Projetos\\\`)
- Cada projeto tem pasta \`.ia/\` com contratos, tarefas, dependencias, etc.
- \`.ia/fluxo-trabalho.md\` e obrigatorio
- Checklist automatico valida estrutura minima

## 📡 Eventos & WebSocket

- **Eventos assincronos:** \`agentmap_eventos_pendentes\` + \`agentmap_eventos_confirmar\`
- **Eventos custom:** \`POST /api/eventos/custom\`
- **WebSocket:** \`ws://localhost:3150/ws/monitoramento\` para monitoramento em tempo real

## 💡 Dicas

- Use \`agentmap_descobrir\` para ver todas as capabilities disponiveis
- Use \`agentmap_sugerir_fluxo\` para recomendacoes de tools por objetivo
- Consulte \`agentmap://playbook\` para padroes de uso detalhados
- Use \`agentmap_obter_contexto_projeto\` para ver contratos, decisoes e estado
- Use \`agentmap_eventos_pendentes\` antes de iniciar trabalho
- Use \`agentmap_handoffs_criar\` para transferir contexto entre agentes
- Use subscriptions para receber notificacoes automaticas

> **Nota:** este resource é somente leitura e não requer projeto aberto.
`;
    return {
      contents: [{
        uri: 'agentmap://onboarding',
        mimeType: 'text/markdown',
        text: markdown
      }]
    };
  }
);

mcpServer.registerResource(
  'agentmap-playbook',
  'agentmap://playbook',
  {
    description: 'Playbook do AgentMap: padrões de uso recomendados para cada operação.',
    mimeType: 'text/markdown'
  },
  async () => {
    const markdown = `# 📚 AgentMap — Playbook

Este playbook contém os padrões de uso recomendados para operar o AgentMap de forma eficaz.

## Ciclo 1: Primeiro contato (onboarding)

1. \`agentmap_descobrir\` — Descubra capabilities, agents, docs e CLI
2. \`agentmap_projetos_abrir\` — Abra um projeto existente
3. \`agentmap_agentes_listar\` — Veja os agentes ativos
4. \`agentmap_obter_contexto_projeto\` — Entenda o estado atual

## Ciclo 2: Iniciar trabalho

1. \`agentmap_eventos_pendentes\` — Verifique eventos pendentes
2. \`agentmap_verificar_dependencias_pendentes\` — Confira dependências da tarefa
3. \`agentmap_workflows_iniciar_trabalho\` — Inicie com contexto completo
4. \`agentmap_obter_contexto_tarefa\` — Leia contratos e critérios
5. Execute o trabalho respeitando diretórios permitidos
6. \`agentmap_workflows_finalizar_trabalho\` — Registre resultado e handoff

## Ciclo 3: Processar handoff

1. \`agentmap_handoffs_listar\` — Liste handoffs pendentes
2. \`agentmap_handoffs_obter\` — Obtenha contexto completo
3. Execute as ações pendentes
4. \`agentmap_handoffs_atualizar\` — Atualize estado para ACEITO/CONCLUIDO
5. \`agentmap_resultados_criar\` — Registre resultado

## Ciclo 4: Processar solicitação

1. \`agentmap_solicitacoes_listar\` — Liste solicitações pendentes
2. \`agentmap_solicitacoes_obter\` — Obtenha detalhes
3. \`agentmap_verificar_dependencias_pendentes\` — Verifique dependências
4. Execute a alteração solicitada
5. \`agentmap_solicitacoes_aprovar\` ou \`rejeitar\` conforme resultado

## Ciclo 5: Monitoramento contínuo

1. \`resources/subscribe\` ou \`subscriptions/listen\` — Inscreva-se em recursos
2. \`notifications/resources/updated\` — Receba notificações
3. \`resources/read\` — Leia o recurso atualizado
4. \`agentmap_obter_mapa_projeto\` — Visão completa do projeto

## Regras obrigatórias

1. **Leitura obrigatória antes do trabalho:** sempre consulte o contexto da tarefa antes de executar
2. **Resultado obrigatório:** toda tarefa deve ter resultado registrado
3. **Handoff quando necessário:** se o trabalho crossing de domínio, gere handoff
4. **Validação separada da conclusão:** não conclua tarefa sem validação quando aplicável
5. **Coordenação entre agentes:** consulte eventos pendentes antes de iniciar trabalho

> **Nota:** este resource é somente leitura e não requer projeto aberto.
`;
    return {
      contents: [{
        uri: 'agentmap://playbook',
        mimeType: 'text/markdown',
        text: markdown
      }]
    };
  }
);

mcpServer.registerResource(
  'agentmap-guia-eficacia',
  'agentmap://guia-eficacia',
  {
    description: 'Guia de eficácia do AgentMap: quando, por que e como usar cada ferramenta em cenários reais.',
    mimeType: 'text/markdown'
  },
  async () => {
    const markdown = fs.readFileSync(path.join(__dirname, '..', 'resources', 'guia-eficacia.md'), 'utf-8');
    return {
      contents: [{
        uri: 'agentmap://guia-eficacia',
        mimeType: 'text/markdown',
        text: markdown
      }]
    };
  }
);

const solicitacoesTemplate = new ResourceTemplate('agentmap://solicitacoes/{agenteId}', {
  list: undefined,
  complete: {
    agenteId: async () => []
  }
});

mcpServer.registerResource(
  'agentmap-solicitacoes',
  solicitacoesTemplate,
  {
    description: 'Solicitações de alteração de um agente.',
    mimeType: 'application/json'
  },
  async (uri: URL, _variables: Variables, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
    const agenteId = parseSolicitacoesUri(uri.toString());
    if (!agenteId) {
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({ sucesso: false, erro: 'URI inválida', codigoErro: 'INVALID_URI' })
        }]
      };
    }

    const projetoResult = projetoService.getProjetoAtual();
    if (!projetoResult.sucesso || !projetoResult.dados) {
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({ sucesso: false, erro: 'Nenhum projeto aberto', codigoErro: 'NO_PROJECT_OPEN' })
        }]
      };
    }

    const ctx = carregarContexto(projetoService);
    if (!ctx.sucesso) {
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(ctx)
        }]
      };
    }

    const todas = ctx.dados!.servicos.solicitacao.listar();
    if (!todas.sucesso) {
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(todas)
        }]
      };
    }

    const filtradas = (todas.dados || []).filter(
      (s: SolicitacaoAlteracao) => s.agenteResponsavel.id === agenteId || s.agenteSolicitante.id === agenteId
    );

    return {
      contents: [{
        uri: uri.toString(),
        mimeType: 'application/json',
        text: JSON.stringify({ sucesso: true, dados: filtradas })
      }]
    };
  }
);

const handoffsTemplate = new ResourceTemplate('agentmap://handoffs/{agenteId}', {
  list: undefined,
  complete: {
    agenteId: async () => []
  }
});

mcpServer.registerResource(
  'agentmap-handoffs',
  handoffsTemplate,
  {
    description: 'Handoffs de um agente.',
    mimeType: 'application/json'
  },
  async (uri: URL, _variables: Variables, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
    const agenteId = parseHandoffsUri(uri.toString());
    if (!agenteId) {
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({ sucesso: false, erro: 'URI inválida', codigoErro: 'INVALID_URI' })
        }]
      };
    }

    const projetoResult = projetoService.getProjetoAtual();
    if (!projetoResult.sucesso || !projetoResult.dados) {
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({ sucesso: false, erro: 'Nenhum projeto aberto', codigoErro: 'NO_PROJECT_OPEN' })
        }]
      };
    }

    const ctx = carregarContexto(projetoService);
    if (!ctx.sucesso) {
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(ctx)
        }]
      };
    }

    const resultado = ctx.dados!.servicos.handoff.listarPorDestino(agenteId);
    return {
      contents: [{
        uri: uri.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(resultado)
      }]
    };
  }
);

const bloqueiosTemplate = new ResourceTemplate('agentmap://bloqueios/{projetoId}', {
  list: undefined,
  complete: {
    projetoId: async () => []
  }
});

mcpServer.registerResource(
  'agentmap-bloqueios',
  bloqueiosTemplate,
  {
    description: 'Bloqueios do projeto.',
    mimeType: 'application/json'
  },
  async (uri: URL, _variables: Variables, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
    const projetoId = parseBloqueiosUri(uri.toString());
    if (!projetoId) {
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({ sucesso: false, erro: 'URI inválida', codigoErro: 'INVALID_URI' })
        }]
      };
    }

    const projetoResult = projetoService.getProjetoAtual();
    if (!projetoResult.sucesso || !projetoResult.dados) {
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({ sucesso: false, erro: 'Nenhum projeto aberto', codigoErro: 'NO_PROJECT_OPEN' })
        }]
      };
    }

    const ctx = carregarContexto(projetoService);
    if (!ctx.sucesso) {
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(ctx)
        }]
      };
    }

    const resultado = ctx.dados!.servicos.bloqueio.listar();
    return {
      contents: [{
        uri: uri.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(resultado)
      }]
    };
  }
);

const ListenRequestSchema = z.object({
  method: z.literal('subscriptions/listen'),
  params: z.object({
    notifications: z.object({
      resourceSubscriptions: z.array(z.string()).optional(),
      toolsListChanged: z.boolean().optional(),
      promptsListChanged: z.boolean().optional(),
      resourcesListChanged: z.boolean().optional()
    })
  })
});

const CancelledNotificationSchema = z.object({
  method: z.literal('notifications/cancelled'),
  params: z.object({
    requestId: z.string(),
    reason: z.string().optional()
  })
});

function getSessionId(extra: any): string {
  return extra.sessionId || extra.requestInfo?.sessionId || 'stdio-session';
}

async function sendAcknowledged(subscriptionId: string): Promise<void> {
  await mcpServer.server.notification({
    method: 'notifications/subscriptions/acknowledged',
    params: {
      _meta: {
        'io.modelcontextprotocol/subscriptionId': subscriptionId
      }
    }
  } as any);
}

async function sendResourceUpdatedForListen(uri: string, subscriptionId: string): Promise<void> {
  await mcpServer.server.notification({
    method: 'notifications/resources/updated',
    params: {
      uri,
      _meta: {
        'io.modelcontextprotocol/subscriptionId': subscriptionId
      }
    }
  } as any);
}

mcpServer.server.setRequestHandler(
  SubscribeRequestSchema,
  async (request: any, extra: any) => {
    const uri = request.params.uri;
    const sessionId = getSessionId(extra);

    const projetoResult = projetoService.getProjetoAtual();
    if (!projetoResult.sucesso || !projetoResult.dados) {
      return { content: [{ type: 'text', text: JSON.stringify({ sucesso: false, erro: 'Nenhum projeto aberto', codigoErro: 'NO_PROJECT_OPEN' }) }] };
    }

    subscriptionManager.subscribe(sessionId, uri);
    console.error(`[MCP] Subscribe: session=${sessionId} uri=${uri}`);
    return { content: [{ type: 'text', text: JSON.stringify({ sucesso: true }) }] };
  }
);

mcpServer.server.setRequestHandler(
  UnsubscribeRequestSchema,
  async (request: any, extra: any) => {
    const uri = request.params.uri;
    const sessionId = getSessionId(extra);

    subscriptionManager.unsubscribe(sessionId, uri);
    console.error(`[MCP] Unsubscribe: session=${sessionId} uri=${uri}`);
    return { content: [{ type: 'text', text: JSON.stringify({ sucesso: true }) }] };
  }
);

mcpServer.server.setRequestHandler(
  ListenRequestSchema,
  async (request: any, extra: any) => {
    const filter = request.params.notifications || {};
    const sessionId = getSessionId(extra);
    const subscriptionId = String(request.id);

    const urisToAuthorize = filter.resourceSubscriptions || [];
    const projetoResult = projetoService.getProjetoAtual();
    if (!projetoResult.sucesso || !projetoResult.dados) {
      return { content: [{ type: 'text', text: JSON.stringify({ sucesso: false, erro: 'Nenhum projeto aberto', codigoErro: 'NO_PROJECT_OPEN' }) }] };
    }

    const subscription: ListenSubscription = {
      subscriptionId,
      filter: {
        resourceSubscriptions: urisToAuthorize,
        toolsListChanged: filter.toolsListChanged,
        promptsListChanged: filter.promptsListChanged,
        resourcesListChanged: filter.resourcesListChanged
      },
      sessionId,
      active: true,
      resolve: () => {}
    };

    subscriptionManager.addListenSubscription(subscription);

    console.error(`[MCP] Listen: session=${sessionId} subscriptionId=${subscriptionId} uris=${urisToAuthorize.join(',')}`);

    sendAcknowledged(subscriptionId).catch((err) => {
      console.error(`[MCP] Falha ao enviar acknowledged para ${subscriptionId}:`, err);
    });

    return new Promise((resolve) => {
      subscription.resolve = resolve;

      extra.signal.addEventListener('abort', () => {
        console.error(`[MCP] Listen aborted: subscriptionId=${subscriptionId}`);
        subscriptionManager.removeListenSubscription(subscriptionId);
        resolve({});
      });
    });
  }
);

mcpServer.server.setNotificationHandler(
  CancelledNotificationSchema,
  async (notification: any) => {
    const requestId = notification.params?.requestId;
    if (!requestId) return;

    const sub = subscriptionManager.getListenSubscription(requestId);
    if (sub && sub.active) {
      console.error(`[MCP] Listen cancelled by client: subscriptionId=${requestId}`);
      subscriptionManager.removeListenSubscription(requestId);
    }
  }
);

globalEventBus.subscribe((event) => {
  console.error('[E2E-DEBUG] EventBus handler fired', JSON.stringify(event));

  const legacySubscribers = subscriptionManager.getSubscribers(event.uri);
  if (legacySubscribers.length > 0) {
    console.error('[E2E-DEBUG] sendResourceUpdated called for legacy');
    mcpServer.server.sendResourceUpdated({ uri: event.uri }).catch((err) => {
      console.error(`[MCP] Falha ao enviar notificação legacy para ${event.uri}:`, err);
      for (const sessionId of legacySubscribers) {
        subscriptionManager.unsubscribeAll(sessionId);
      }
    });
  }

  const listenSubscriberIds = subscriptionManager.getListenSubscribersForUri(event.uri);
  if (listenSubscriberIds.length > 0) {
    console.error('[E2E-DEBUG] sendResourceUpdated called for listen', JSON.stringify(listenSubscriberIds));
    for (const subscriptionId of listenSubscriberIds) {
      sendResourceUpdatedForListen(event.uri, subscriptionId).catch((err) => {
        console.error(`[MCP] Falha ao enviar notificação listen para ${event.uri} (${subscriptionId}):`, err);
        subscriptionManager.removeListenSubscription(subscriptionId);
      });
    }
  }
});


