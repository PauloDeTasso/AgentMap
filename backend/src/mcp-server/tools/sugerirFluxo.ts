import { mcpServer, projetoService } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import * as z from 'zod';

const fluxos = {
  onboarding: [
    'agentmap_descobrir',
    'agentmap_projetos_abrir',
    'agentmap_agentes_listar',
    'agentmap_obter_contexto_projeto'
  ],
  iniciar_trabalho: [
    'agentmap_eventos_pendentes',
    'agentmap_verificar_dependencias_pendentes',
    'agentmap_workflows_iniciar_trabalho',
    'agentmap_obter_contexto_tarefa'
  ],
  handoff: [
    'agentmap_handoffs_listar',
    'agentmap_handoffs_obter',
    'agentmap_handoffs_atualizar',
    'agentmap_resultados_criar'
  ],
  solicitacao: [
    'agentmap_solicitacoes_listar',
    'agentmap_solicitacoes_obter',
    'agentmap_verificar_dependencias_pendentes',
    'agentmap_solicitacoes_aprovar'
  ],
  monitoramento: [
    'resources/subscribe',
    'resources/read',
    'agentmap_obter_mapa_projeto',
    'agentmap_auditoria_listar'
  ],
  bloequeio: [
    'agentmap_bloqueios_listar',
    'agentmap_bloqueios_obter',
    'agentmap_bloqueios_resolver'
  ]
};

mcpServer.registerTool('agentmap_sugerir_fluxo', {
  title: 'Sugerir Fluxo',
  description: 'Recomenda sequência de tools baseada no objetivo do agente.',
  inputSchema: z.object({
    objetivo: z.string().describe('Objetivo desejado: onboarding, iniciar_trabalho, handoff, solicitacao, monitoramento, bloequeio'),
    contexto: z.string().optional().describe('Contexto adicional para refinar a sugestão')
  }),
  annotations: {
    readOnlyHint: true
  }
}, async ({ objetivo, contexto }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);

  const key = objetivo.toLowerCase().replace(/\s+/g, '_') as keyof typeof fluxos;
  const fluxo = fluxos[key] || fluxos.onboarding;

  const resultado = {
    objetivo,
    contexto,
    fluxo,
    dicas: [
      'Use agentmap_descobrir para ver todas as capabilities disponíveis',
      'Consulte agentmap://playbook para padrões de uso detalhados',
      'Use agentmap://onboarding para guia de primeiro contato'
    ],
    recursos: {
      onboarding: 'agentmap://onboarding',
      playbook: 'agentmap://playbook'
    }
  };

  auditoria.registrarToolCall('agentmap_sugerir_fluxo', projeto, { objetivo, contexto }, { sucesso: true, dados: resultado });
  return toMcpStructured(resultado);
});
