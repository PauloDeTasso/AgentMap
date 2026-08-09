import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { Tarefa, ResultadoOperacao } from '../tipos';

export interface KiloAgentConfig {
  description: string;
  mode: 'primary' | 'subagent' | 'all';
  steps: number;
  hidden: boolean;
  color: string;
  permission: Record<string, string>;
}

export interface TaskContext {
  objetivo: string;
  contrato: string;
  dependencias: string[];
  decisoes: string[];
  restricoes: string[];
  criteriosAceitacao: string[];
  arquivosRelevantes: { caminho: string; conteudo: string }[];
}

export class KiloAgentGeneratorService {
  constructor(private fs: FileService) {}

  async gerarContextoTarefa(tarefa: Tarefa, agenteId?: string): Promise<ResultadoOperacao<string>> {
    const contexto: TaskContext = {
      objetivo: tarefa.objetivo || tarefa.titulo,
      contrato: tarefa.contratosObrigatorios.join(', ') || 'Nenhum contrato obrigatório',
      dependencias: tarefa.dependencias || [],
      decisoes: [],
      restricoes: tarefa.restricoes || [],
      criteriosAceitacao: tarefa.criteriosAceitacao || [],
      arquivosRelevantes: []
    };

    const contextoPath = path.join('.kilo', 'agent', `task-${tarefa.id}-context.md`).replace(/\\/g, '/');
    const md = this.montarContextoMarkdown(tarefa, contexto);
    return this.fs.escrever(contextoPath, md);
  }

  montarContextoMarkdown(tarefa: Tarefa, contexto: TaskContext): string {
    const linhas: string[] = [];

    linhas.push(`# Contexto da Tarefa ${tarefa.id}`);
    linhas.push('');
    linhas.push(`**Título:** ${tarefa.titulo}`);
    linhas.push(`**Tipo:** ${tarefa.tipo}`);
    linhas.push(`**Prioridade:** ${tarefa.prioridade}`);
    linhas.push(`**Agente Responsável:** ${tarefa.agenteResponsavel}`);
    linhas.push(`**Domínio:** ${tarefa.dominio}`);
    linhas.push(`**Ambiente:** ${tarefa.ambiente}`);
    linhas.push('');

    linhas.push('## Objetivo');
    linhas.push(contexto.objetivo);
    linhas.push('');

    linhas.push('## Contratos Obrigatórios');
    linhas.push(contexto.contrato);
    linhas.push('');

    if (contexto.dependencias.length > 0) {
      linhas.push('## Dependências');
      for (const dep of contexto.dependencias) {
        linhas.push(`- ${dep}`);
      }
      linhas.push('');
    }

    if (contexto.restricoes.length > 0) {
      linhas.push('## Restrições');
      for (const r of contexto.restricoes) {
        linhas.push(`- ${r}`);
      }
      linhas.push('');
    }

    if (contexto.criteriosAceitacao.length > 0) {
      linhas.push('## Critérios de Aceitação');
      for (const c of contexto.criteriosAceitacao) {
        linhas.push(`- [ ] ${c}`);
      }
      linhas.push('');
    }

    if (tarefa.condicoesDeParada.length > 0) {
      linhas.push('## Condições de Parada');
      for (const c of tarefa.condicoesDeParada) {
        linhas.push(`- ${c}`);
      }
      linhas.push('');
    }

    if (tarefa.riscos.length > 0) {
      linhas.push('## Riscos');
      for (const r of tarefa.riscos) {
        linhas.push(`- ${r}`);
      }
      linhas.push('');
    }

    linhas.push('## Protocolo de Entrega');
    linhas.push('- Sempre reportar progresso via `kilohub_report_status`');
    linhas.push('- Ao concluir, usar `kilohub_report_result` com resumo, arquivos alterados e testes');
    linhas.push('- Nunca expor segredos, chaves ou tokens');
    linhas.push('- Respeitar contratos e domínios definidos');
    linhas.push('');

    return linhas.join('\n');
  }

  private mapearPermissoes(permissoes: { ler: boolean; criar: boolean; alterar: boolean; excluir: boolean; executar: boolean; testar: boolean; revisar: boolean; aprovar: boolean; implantar: boolean }, permitidos: string[], proibidos: string[]): Record<string, string> {
    const perm: Record<string, string> = {
      read: permissoes.ler ? 'allow' : 'deny',
      edit: permissoes.alterar || permissoes.criar ? 'allow' : 'deny',
      bash: permissoes.executar ? 'allow' : 'deny',
      glob: 'allow',
      grep: 'allow',
      list: 'allow',
      'agentmap_*': 'allow'
    };

    if (permitidos.length > 0) {
      perm.edit = JSON.stringify(permitidos) as unknown as string;
      perm.read = JSON.stringify(permitidos) as unknown as string;
    }

    if (proibidos.length > 0) {
      perm.edit = this.combinarEditPerm(permitidos, proibidos);
      perm.read = this.combinarReadPerm(permitidos, proibidos);
    }

    return perm;
  }

  private combinarEditPerm(permitidos: string[], proibidos: string[]): string {
    const regras: string[] = [];
    for (const p of permitidos) {
      regras.push(`"${p}": allow`);
    }
    for (const p of proibidos) {
      regras.push(`"${p}": deny`);
    }
    regras.push('"*": deny');
    return `{${regras.join(', ')}}`;
  }

  private combinarReadPerm(permitidos: string[], proibidos: string[]): string {
    const regras: string[] = [];
    for (const p of permitidos) {
      regras.push(`"${p}": allow`);
    }
    for (const p of proibidos) {
      regras.push(`"${p}": deny`);
    }
    regras.push('"*": deny');
    return `{${regras.join(', ')}}`;
  }

  private gerarSystemPrompt(
    id: string,
    nome: string,
    funcao: string,
    conhecimentos: string[],
    responsabilidades: string[],
    permitidos: string[],
    proibidos: string[],
    contratos: string[],
    paradas: string[],
    aprovacoes: string[],
    protocolo: { exigeResumo: boolean; exigeArquivosAlterados: boolean; exigeTestes: boolean; exigeRiscos: boolean; exigePendencias: boolean } | undefined
  ): string {
    const premiumPrompt = this.gerarPromptPremium(id, nome, funcao, conhecimentos, responsabilidades, permitidos, proibidos, contratos, paradas, aprovacoes, protocolo);
    return premiumPrompt;
  }

  private gerarPromptPremium(
    id: string,
    nome: string,
    funcao: string,
    conhecimentos: string[],
    responsabilidades: string[],
    permitidos: string[],
    proibidos: string[],
    contratos: string[],
    paradas: string[],
    aprovacoes: string[],
    protocolo: { exigeResumo: boolean; exigeArquivosAlterados: boolean; exigeTestes: boolean; exigeRiscos: boolean; exigePendencias: boolean } | undefined
  ): string {
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

    if (conhecimentos.length > 0) {
      linhas.push('## Expertise Tecnica');
      linhas.push(`Dominio avancado em: ${conhecimentos.join(', ')}.`);
      linhas.push('Aplique as melhores praticas, padroes de mercado e abordagens state-of-the-art sempre que relevante.');
      linhas.push('');
    }

    linhas.push('## Dominios e Acesso');
    linhas.push(`- **Diretorios permitidos:** ${permitidos.map(p => p.replace(/\/\*\*/g, '/')).join(', ') || 'todos'}.`);
    linhas.push(`- **Diretorios proibidos:** ${proibidos.map(p => p.replace(/\/\*\*/g, '/')).join(', ') || 'nenhum'}.`);
    linhas.push(`- **Contratos obrigatorios:** ${contratos.join(', ') || 'nenhum'}.`);
    linhas.push('');

    linhas.push('## Padroes de Excelencia');
    linhas.push('- Sempre respeitar contratos e dominios dos agentes.');
    linhas.push('- Nunca expor segredos/chaves/tokens.');
    linhas.push('- Sempre registrar entregas via RES e handoffs.');
    linhas.push('- Priorize qualidade, seguranca, desempenho e manutenibilidade.');
    linhas.push('- Antecipe riscos e proponha solucoes antes que problemas ocorram.');
    linhas.push('- Documente decisoes tecnicas relevantes.');
    if (paradas.length > 0) {
      linhas.push(`- **Condicoes de parada:** ${paradas.join(', ')}.`);
    }
    if (aprovacoes.length > 0) {
      linhas.push(`- **Requer aprovacao para:** ${aprovacoes.join(', ')}.`);
    }
    linhas.push('- Sempre usar as tools do AgentMap para reportar progresso e entregas.');
    linhas.push('');

    linhas.push('## Protocolo de Entrega Premium');
    if (protocolo) {
      linhas.push(`- Exige resumo: ${protocolo.exigeResumo}`);
      linhas.push(`- Exibe alteracoes: ${protocolo.exigeArquivosAlterados}`);
      linhas.push(`- Exige testes: ${protocolo.exigeTestes}`);
      linhas.push(`- Exige riscos: ${protocolo.exigeRiscos}`);
      linhas.push(`- Exige pendencias: ${protocolo.exigePendencias}`);
    } else {
      linhas.push('- Exige resumo, alteracoes, testes, riscos e pendencias.');
    }
    linhas.push('');

    linhas.push('## Comportamento e Tom');
    linhas.push('- Seja direto, tecnico e objetivo.');
    linhas.push('- Nao faca perguntas retoricas desnecessarias.');
    linhas.push('- Antecipe necessidades e proponha melhorias.');
    linhas.push('- Mantenha foco no dominio permitido e respeite os limites.');
    linhas.push('- Quando nao puder avancar, informe claramente o bloqueio e a acao necessaria.');

    return linhas.join('\n');
  }

  private corPorFuncao(funcao: string): string {
    const cores: Record<string, string> = {
      gerenciamento_projeto: '#00C853',
      desenvolvimento_frontend: '#2979FF',
      desenvolvimento_backend: '#FF6D00',
      administracao_agentmap: '#AA00FF',
      administracao_banco_de_dados: '#DD2C00',
      planejamento: '#00BFA5',
      desenvolvimento_android: '#3D5AFE',
      infraestrutura_implantacao: '#FF6D00',
      qualidade_testes: '#00BFA5',
      seguranca: '#D50000',
      revisao: '#6200EA',
      documentacao: '#0288D1',
      observabilidade: '#00897B',
      desempenho: '#FF6D00'
    };
    return cores[funcao] || '#607D8B';
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

