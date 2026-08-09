import { mcpServer, projetoService } from '../server';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate';
import { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types';
import { carregarContexto } from '../contexto';
import { MonitoramentoService, MensagemMonitoramento } from 'servicios/MonitoramentoService';

const monitoramentoTemplate = new ResourceTemplate('agentmap://monitoramento/mensagens/{projetoId?}', {
  list: undefined,
  complete: {
    projetoId: async () => []
  }
});

function parseProjetoId(uri: string): string | null {
  const match = uri.match(/^agentmap:\/\/monitoramento\/mensagens\/([^?#]*)$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

mcpServer.registerResource(
  'agentmap-monitoramento-mensagens',
  monitoramentoTemplate,
  {
    description: 'Mensagens de monitoramento do projeto. Assinável para receber notificações em tempo real.',
    mimeType: 'application/json'
  },
  async (uri: URL, _variables: Variables, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
    const projetoId = parseProjetoId(uri.toString());

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

    const resolvedProjetoId = projetoId || projetoResult.dados.id;

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

    const monitoramento = ctx.dados!.servicos.monitoramento;
    const mensagens = monitoramento.listarMensagens(100);

    const tiposRelevantes = new Set(['KILO_CHAT_REPLY', 'AGENTE_FILHO_RESULTADO', 'WAKEUP_PARENT', 'KILO_CHAT', 'KILO_REPLY', 'KILO_RESULT']);

    const relevantes = mensagens.filter((m: MensagemMonitoramento) => tiposRelevantes.has(m.tipo));

    return {
      contents: [{
        uri: uri.toString(),
        mimeType: 'application/json',
        text: JSON.stringify({
          sucesso: true,
          dados: {
            projetoId: resolvedProjetoId,
            mensagens: relevantes,
            total: relevantes.length
          }
        })
      }]
    };
  }
);
