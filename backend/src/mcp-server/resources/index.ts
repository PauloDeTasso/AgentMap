import { mcpServer, projetoService } from '../server';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate';
import { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types';
import { solicitacoesUri, handoffsUri, bloqueiosUri, parseSolicitacoesUri, parseHandoffsUri, parseBloqueiosUri, getResourceType } from './uri-factory';
import { authorizeResourceAccess } from './authorization';
import { globalEventBus } from '../events/event-bus';
import { subscriptionManager, ListenSubscription } from '../subscriptions/subscription-manager';
import { carregarContexto } from '../contexto';
import { SolicitacaoAlteracao } from 'tipos';
import { z } from 'zod';

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

    if (!authorizeResourceAccess(projetoResult.dados, uri.toString())) {
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({ sucesso: false, erro: 'Acesso não autorizado', codigoErro: 'UNAUTHORIZED' })
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

    if (!authorizeResourceAccess(projetoResult.dados, uri.toString())) {
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({ sucesso: false, erro: 'Acesso não autorizado', codigoErro: 'UNAUTHORIZED' })
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

    if (!authorizeResourceAccess(projetoResult.dados, uri.toString())) {
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({ sucesso: false, erro: 'Acesso não autorizado', codigoErro: 'UNAUTHORIZED' })
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

    if (!authorizeResourceAccess(projetoResult.dados, uri)) {
      return { content: [{ type: 'text', text: JSON.stringify({ sucesso: false, erro: 'Acesso não autorizado', codigoErro: 'UNAUTHORIZED' }) }] };
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

    for (const uri of urisToAuthorize) {
      if (!authorizeResourceAccess(projetoResult.dados, uri)) {
        return { content: [{ type: 'text', text: JSON.stringify({ sucesso: false, erro: `Acesso não autorizado para ${uri}`, codigoErro: 'UNAUTHORIZED' }) }] };
      }
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


