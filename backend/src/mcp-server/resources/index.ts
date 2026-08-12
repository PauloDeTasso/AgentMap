import { mcpServer } from '../server';
import { projetoService } from '../server';

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
