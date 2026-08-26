import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { CheckpointService } from './CheckpointService';
import { HandoffService } from './HandoffService';
import { OrquestradorService } from './OrquestradorService';
import { KiloAgentConfig } from './KiloAgentGeneratorService';
import { ResultadoOperacao } from '../tipos';

export interface SubagentDefinition {
  id: string;
  nome: string;
  fase: string;
  descricao: string;
  cor: string;
  permissoes: Record<string, string>;
  arquivo: string;
  status: string;
}

const FASES = [
  'fase-1-planejamento',
  'fase-2-viabilidade',
  'fase-3-requisitos',
  'fase-4-design-contratos',
  'fase-5-design-uxui',
  'fase-6-banco-dados',
  'fase-7-implementacao',
  'fase-8-testes',
  'fase-9-devsecops',
  'fase-10-deploy',
  'fase-11-documentacao'
] as const;

const COR_POR_FASE: Record<string, string> = {
  'fase-1-planejamento': '#4a90d9',
  'fase-2-viabilidade': '#6c5ce7',
  'fase-3-requisitos': '#00b894',
  'fase-4-design-contratos': '#fd79a8',
  'fase-5-design-uxui': '#e17055',
  'fase-6-banco-dados': '#00cec9',
  'fase-7-implementacao': '#fdcb6e',
  'fase-8-testes': '#a29bfe',
  'fase-9-devsecops': '#55a3e8',
  'fase-10-deploy': '#00b4d8',
  'fase-11-documentacao': '#ff9f43'
};

const NOME_POR_FASE: Record<string, string> = {
  'fase-1-planejamento': 'Planejamento',
  'fase-2-viabilidade': 'Viabilidade',
  'fase-3-requisitos': 'Requisitos',
  'fase-4-design-contratos': 'DesignContratos',
  'fase-5-design-uxui': 'UXUI',
  'fase-6-banco-dados': 'BancoDados',
  'fase-7-implementacao': 'ArquiteturaImpl',
  'fase-8-testes': 'TestesQualidade',
  'fase-9-devsecops': 'DevSecOps',
  'fase-10-deploy': 'DeployInfra',
  'fase-11-documentacao': 'DocsManutencao'
};

const DESCRICAO_POR_FASE: Record<string, string> = {
  'fase-1-planejamento': 'Subagente para fase de planejamento de projeto.',
  'fase-2-viabilidade': 'Subagente para fase de análise de viabilidade.',
  'fase-3-requisitos': 'Subagente para fase de requisitos.',
  'fase-4-design-contratos': 'Subagente para fase de design e contratos.',
  'fase-5-design-uxui': 'Subagente para fase de design UX/UI.',
  'fase-6-banco-dados': 'Subagente para fase de banco de dados.',
  'fase-7-implementacao': 'Subagente para fase de implementação.',
  'fase-8-testes': 'Subagente para fase de testes e qualidade.',
  'fase-9-devsecops': 'Subagente para fase de DevSecOps.',
  'fase-10-deploy': 'Subagente para fase de deploy e infraestrutura.',
  'fase-11-documentacao': 'Subagente para fase de documentação e manutenção.'
};

const RESPONSABILIDADES_POR_FASE: Record<string, string[]> = {
  'fase-1-planejamento': [
    'Definir objetivo, escopo, cronograma, riscos e RACI',
    'Alinhar stakeholders e aprovar project charter',
    'Registrar entregas via RES e handoffs'
  ],
  'fase-2-viabilidade': [
    'Avaliar viabilidade técnica, econômica e operacional',
    'Produzir estudo de viabilidade e decisão go/no-go',
    'Registrar entregas via RES e handoffs'
  ],
  'fase-3-requisitos': [
    'Elicitar, documentar e validar requisitos funcionais e não-funcionais',
    'Entregar SRS aprovado, user stories e acceptance criteria',
    'Registrar entregas via RES e handoffs'
  ],
  'fase-4-design-contratos': [
    'Definir HLD, LLD, contratos e schemas',
    'Validar contratos versionados e arquitetura aprovada',
    'Registrar entregas via RES e handoffs'
  ],
  'fase-5-design-uxui': [
    'Criar design system, wireframes, mockups e protótipos',
    'Validar acessibilidade e responsividade',
    'Registrar entregas via RES e handoffs'
  ],
  'fase-6-banco-dados': [
    'Modelar dados e criar scripts DDL',
    'Validar schema aprovado e constraints',
    'Registrar entregas via RES e handoffs'
  ],
  'fase-7-implementacao': [
    'Implementar código respeitando contratos e padrões',
    'Garantir CI passing e code review aprovado',
    'Registrar entregas via RES e handoffs'
  ],
  'fase-8-testes': [
    'Executar testes automatizados e manuais',
    'Entregar UAT sign-off e relatórios de qualidade',
    'Registrar entregas via RES e handoffs'
  ],
  'fase-9-devsecops': [
    'Aplicar SAST/DAST e threat model',
    'Entregar security sign-off e compliance validado',
    'Registrar entregas via RES e handoffs'
  ],
  'fase-10-deploy': [
    'Preparar deploy, pipelines e rollback',
    'Entregar deploy em produção e monitoring ativo',
    'Registrar entregas via RES e handoffs'
  ],
  'fase-11-documentacao': [
    'Documentar ADRs, OpenAPI, runbooks e BC plan',
    'Entregar documentação completa e onboarding atualizado',
    'Registrar entregas via RES e handoffs'
  ]
};

const PERMISSOES_POR_FASE: Record<string, Record<string, string>> = {
  'fase-1-planejamento': {
    read: 'allow',
    edit: 'allow',
    bash: 'deny',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    'agentmap_*': 'allow'
  },
  'fase-2-viabilidade': {
    read: 'allow',
    edit: 'allow',
    bash: 'deny',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    'agentmap_*': 'allow'
  },
  'fase-3-requisitos': {
    read: 'allow',
    edit: 'allow',
    bash: 'deny',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    'agentmap_*': 'allow'
  },
  'fase-4-design-contratos': {
    read: 'allow',
    edit: 'allow',
    bash: 'deny',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    'agentmap_*': 'allow'
  },
  'fase-5-design-uxui': {
    read: 'allow',
    edit: 'allow',
    bash: 'deny',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    'agentmap_*': 'allow'
  },
  'fase-6-banco-dados': {
    read: 'allow',
    edit: 'allow',
    bash: 'allow',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    'agentmap_*': 'allow'
  },
  'fase-7-implementacao': {
    read: 'allow',
    edit: 'allow',
    bash: 'allow',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    'agentmap_*': 'allow'
  },
  'fase-8-testes': {
    read: 'allow',
    edit: 'allow',
    bash: 'allow',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    'agentmap_*': 'allow'
  },
  'fase-9-devsecops': {
    read: 'allow',
    edit: 'allow',
    bash: 'allow',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    'agentmap_*': 'allow'
  },
  'fase-10-deploy': {
    read: 'allow',
    edit: 'allow',
    bash: 'allow',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    'agentmap_*': 'allow'
  },
  'fase-11-documentacao': {
    read: 'allow',
    edit: 'allow',
    bash: 'deny',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    'agentmap_*': 'allow'
  }
};

export class AgentGenerator {
  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator,
    private checkpointService: CheckpointService,
    private handoffService: HandoffService,
    private orquestradorService: OrquestradorService
  ) {
  }

  async gerarSubagentes(projetoId: string): Promise<ResultadoOperacao<SubagentDefinition[]>> {
    const definicoes: SubagentDefinition[] = [];

    for (const fase of FASES) {
      const def = await this.gerarSubagenteParaFase(projetoId, fase);
      if (!def.sucesso) {
        return { sucesso: false, erro: def.erro || 'Erro ao gerar subagente', codigoErro: def.codigoErro || 'SUBAGENT_ERROR' };
      }
      definicoes.push(def.dados!);
    }

    this.auditoria.registrar(
      'SUBAGENTES_GERADOS',
      `Subagentes gerados para projeto ${projetoId}`,
      { projetoId, total: definicoes.length }
    );

    return { sucesso: true, dados: definicoes };
  }

  async gerarSubagenteParaFase(projetoId: string, fase: string): Promise<ResultadoOperacao<SubagentDefinition>> {
    if (!FASES.includes(fase as any)) {
      return { sucesso: false, erro: `Fase inválida: ${fase}`, codigoErro: 'INVALID_PHASE' };
    }

    const id = `SUB-${fase}`;
    const nome = NOME_POR_FASE[fase];
    const descricao = DESCRICAO_POR_FASE[fase];
    const cor = COR_POR_FASE[fase];
    const permissoes = { ...PERMISSOES_POR_FASE[fase] };

    const contextoFase = await this.construirContextoFase(projetoId, fase);
    const responsabilidades = [...RESPONSABILIDADES_POR_FASE[fase]];
    if (contextoFase.checkpoints.length > 0) {
      responsabilidades.push(`Retomar work a partir de ${contextoFase.checkpoints.length} checkpoint(s) existente(s)`);
    }
    if (contextoFase.handoffs.length > 0) {
      responsabilidades.push(`Processar ${contextoFase.handoffs.length} handoff(s) pendente(s)`);
    }

    const config: KiloAgentConfig = {
      description: descricao,
      mode: 'subagent',
      steps: 10,
      hidden: false,
      color: cor,
      permission: permissoes
    };

    const prompt = this.gerarPromptFase(id, nome, fase.toLowerCase().replace(/_/g, ' '), responsabilidades);

    const md = this.montarMarkdown(config, prompt);
    const arquivo = path.join('.kilo', 'agent', `subagent-${fase.toLowerCase()}.md`).replace(/\\/g, '/');

    const writeResult = this.fs.escrever(arquivo, md);
    if (!writeResult.sucesso) {
      return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    }

    const definicao: SubagentDefinition = {
      id,
      nome,
      fase,
      descricao,
      cor,
      permissoes,
      arquivo,
      status: 'ativo'
    };

    this.auditoria.registrar(
      'SUBAGENTE_GERADO',
      `Subagente '${id}' gerado para fase '${fase}' do projeto ${projetoId}`,
      { projetoId, subagenteId: id, fase, arquivo }
    );

    return { sucesso: true, dados: definicao };
  }

  private async construirContextoFase(projetoId: string, fase: string): Promise<{
    checkpoints: any[];
    handoffs: any[];
    status: any;
  }> {
    let checkpoints: any[] = [];
    let handoffs: any[] = [];
    let status: any = null;

    try {
      const checkpointsResult = this.checkpointService.listar();
      if (checkpointsResult.sucesso && checkpointsResult.dados) {
        checkpoints = checkpointsResult.dados.filter((c: any) => c.tarefaId && c.tarefaId.includes(fase));
      }
    } catch {
      checkpoints = [];
    }

    try {
      const handoffsResult = this.handoffService.listar();
      if (handoffsResult.sucesso && handoffsResult.dados) {
        handoffs = handoffsResult.dados.filter((h: any) => h.estado === 'PENDENTE');
      }
    } catch {
      handoffs = [];
    }

    try {
      const statusResult = await this.orquestradorService.status();
      if (statusResult.sucesso && statusResult.dados) {
        status = statusResult.dados;
      }
    } catch {
      status = null;
    }

    return { checkpoints, handoffs, status };
  }

  private gerarPromptFase(id: string, nome: string, funcao: string, responsabilidades: string[]): string {
    const linhas: string[] = [];

    linhas.push(`# ${nome} — Especialista Premium`);
    linhas.push('');
    linhas.push(`Voce e um especialista premium de ${nome} no AgentMap.`);
    linhas.push('');
    linhas.push('## Identidade Profissional');
    linhas.push(`- **Funcao:** ${funcao}.`);
    linhas.push(`- **Perfil:** Profissional senior com mais de 10 anos de experiencia em ${funcao.replace(/_/g, ' ')}, com historico comprovado em projetos de grande escala e alta complexidade.`);
    linhas.push(`- **Postura:** Consultivo, preciso, executivo. Voce nao apenas executa, mas orienta, previne riscos e eleva o padrao do projeto.`);
    linhas.push('');

    if (responsabilidades.length > 0) {
      linhas.push('## Responsabilidades Estrategicas');
      responsabilidades.forEach((r, i) => {
        linhas.push(`${i + 1}. ${r}`);
      });
      linhas.push('');
    }

    linhas.push('## Padroes de Excelencia');
    linhas.push('- Sempre respeitar contratos e dominios dos agentes.');
    linhas.push('- Nunca expor segredos/chaves/tokens.');
    linhas.push('- Sempre registrar entregas via RES e handoffs.');
    linhas.push('- Priorize qualidade, seguranca, desempenho e manutenibilidade.');
    linhas.push('- Antecipe riscos e proponha solucoes antes que problemas ocorram.');
    linhas.push('- Documente decisoes tecnicas relevantes.');
    linhas.push('- Sempre usar as tools do AgentMap para reportar progresso e entregas.');
    linhas.push('');

    linhas.push('## Protocolo de Entrega Premium');
    linhas.push('- Exige resumo, alteracoes, testes, riscos e pendencias.');
    linhas.push('');

    linhas.push('## Comportamento e Tom');
    linhas.push('- Seja direto, tecnico e objetivo.');
    linhas.push('- Nao faca perguntas retoricas desnecessarias.');
    linhas.push('- Antecipe necessidades e proponha melhorias.');
    linhas.push('- Mantenha foco no dominio permitido e respeite os limites.');
    linhas.push('- Quando nao puder avancar, informe claramente o bloqueio e a acao necessaria.');

    return linhas.join('\n');
  }

  private montarMarkdown(config: KiloAgentConfig, systemPrompt: string): string {
    const yaml = [
      '---',
      `description: ${config.description}`,
      `mode: ${config.mode}`,
      `steps: ${config.steps}`,
      `hidden: ${config.hidden}`,
      `color: "${config.color}"`,
      'permission:',
      ...this.formatarPermissao(config.permission),
      '---',
      systemPrompt
    ].join('\n');

    return yaml;
  }

  private formatarPermissao(permission: Record<string, string>): string[] {
    const linhas: string[] = [];
    for (const [chave, valor] of Object.entries(permission)) {
      if (valor.startsWith('{') && valor.endsWith('}')) {
        linhas.push(`  ${chave}: ${valor}`);
      } else if (valor === 'allow' || valor === 'deny') {
        linhas.push(`  ${chave}: ${valor}`);
      } else {
        linhas.push(`  ${chave}: "${valor}"`);
      }
    }
    return linhas;
  }
}
