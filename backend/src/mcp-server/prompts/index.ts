import { mcpServer } from '../server';

mcpServer.registerPrompt(
  'agentmap-iniciar-trabalho',
  {
    description: 'Ciclo completo para iniciar trabalho: sessao → mapa → pendencias → contexto → trabalho.',
    argsSchema: {
      agenteId: { type: 'string', description: 'ID do agente que inicia o trabalho' },
      tarefaId: { type: 'string', description: 'ID da tarefa a ser trabalhada' }
    }
  } as any,
  async ({ agenteId, tarefaId }: Record<string, string>) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Inicie o trabalho para o agente '${agenteId || ''}' na tarefa '${tarefaId || ''}'. Use as tools agentmap_workflows_iniciar_trabalho para obter o contexto completo, depois execute o trabalho seguindo os contratos e critérios de aceitação. Antes de iniciar, consulte eventos pendentes com agentmap_eventos_pendentes({ agenteId: '${agenteId || ''}' }) para verificar se há coordenação pendente.`
          }
        }
      ]
    };
  }
);

mcpServer.registerPrompt(
  'agentmap-finalizar-trabalho',
  {
    description: 'Ciclo completo para finalizar trabalho: resultado → artefatos → handoff → validação → liberação.',
    argsSchema: {
      sessaoId: { type: 'string', description: 'ID da sessão a finalizar' },
      tarefaId: { type: 'string', description: 'ID da tarefa' },
      agenteId: { type: 'string', description: 'ID do agente' },
      resumo: { type: 'string', description: 'Resumo do trabalho executado' }
    }
  } as any,
  async ({ sessaoId, tarefaId, agenteId, resumo }: Record<string, string>) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Finalize o trabalho da sessão '${sessaoId || ''}'. Registre o resultado, crie artefatos, gere handoff e libere reservas usando agentmap_workflows_finalizar_trabalho. Resumo: ${resumo || ''}`
          }
        }
      ]
    };
  }
);

mcpServer.registerPrompt(
  'agentmap-processar-handoff',
  {
    description: 'Receber handoff, consultar contexto, executar, registrar resultado.',
    argsSchema: {
      handoffId: { type: 'string', description: 'ID do handoff a processar' }
    }
  } as any,
  async ({ handoffId }: Record<string, string>) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Processe o handoff '${handoffId || ''}'. Use agentmap_handoffs_obter para consultar o contexto, execute as ações pendentes e registre o resultado.`
          }
        }
      ]
    };
  }
);

mcpServer.registerPrompt(
  'agentmap-processar-solicitacao',
  {
    description: 'Consultar solicitação, verificar dependências, executar alteração.',
    argsSchema: {
      solicitacaoId: { type: 'string', description: 'ID da solicitação a processar' }
    }
  } as any,
  async ({ solicitacaoId }: Record<string, string>) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Processe a solicitação '${solicitacaoId || ''}'. Use agentmap_solicitacoes_obter para consultar detalhes, verifique dependências e execute a alteração solicitada.`
          }
        }
      ]
    };
  }
);
