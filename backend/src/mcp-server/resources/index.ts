import { mcpServer } from '../server';
import { projetoService } from '../server';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp';
import { solicitacoesUri, handoffsUri, bloqueiosUri, parseSolicitacoesUri, parseHandoffsUri, parseBloqueiosUri, getResourceType } from './uri-factory';
import { authorizeResourceAccess } from './authorization';
import { globalEventBus } from '../events/event-bus';
import { subscriptionManager } from '../subscriptions/subscription-manager';
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
  async (uri, _variables, extra) => {
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
  async (uri, _variables, extra) => {
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
  async (uri, _variables, extra) => {
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

mcpServer.server.setRequestHandler(
  SubscribeRequestSchema,
  async (request: any, extra: any) => {
    const uri = request.params.uri;
    const sessionId = extra.sessionId || extra.requestInfo?.sessionId || 'stdio-session';

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
    const sessionId = extra.sessionId || extra.requestInfo?.sessionId || 'stdio-session';

    subscriptionManager.unsubscribe(sessionId, uri);
    console.error(`[MCP] Unsubscribe: session=${sessionId} uri=${uri}`);
    return { content: [{ type: 'text', text: JSON.stringify({ sucesso: true }) }] };
  }
);

globalEventBus.subscribe((event) => {
  const subscribers = subscriptionManager.getSubscribers(event.uri);
  if (subscribers.length > 0) {
    mcpServer.server.sendResourceUpdated({ uri: event.uri }).catch((err) => {
      console.error(`[MCP] Falha ao enviar notificação para ${event.uri}:`, err);
      for (const sessionId of subscribers) {
        subscriptionManager.unsubscribeAll(sessionId);
      }
    });
  }
});
