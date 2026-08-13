import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AgentePerfil, AgenteRegistro } from '../tipos';

export interface KiloAgentConfig {
  description: string;
  mode: 'primary' | 'subagent' | 'all';
  steps: number;
  hidden: boolean;
  color: string;
  permission: Record<string, string>;
}

export class KiloAgentGeneratorService {
  constructor(private fs: FileService) {}

  gerarAgentes(agentes: (AgentePerfil & { registro: AgenteRegistro })[]): void {
    const kiloAgentDir = path.join('.kilo', 'agent');

    this.fs.criarDiretorio(kiloAgentDir);

    for (const agente of agentes) {
      const agentId = agente.registro.id || agente.id;
      const nome = agente.nome;
      const funcao = agente.funcao;
      const estado = agente.estado;
      const permissoes = agente.permissoes;
      const diretoriosPermitidos = agente.diretoriosPermitidos || [];
      const diretoriosProibidos = agente.diretoriosProibidos || [];
      const contratosObrigatorios = agente.contratosObrigatorios || [];
      const conhecimentos = agente.conhecimentos || [];
      const responsabilidades = agente.responsabilidades || [];
      const condicoesDeParada = agente.condicoesDeParada || [];
      const requerAprovacaoPara = agente.requerAprovacaoPara || [];
      const protocolo = agente.protocoloDeEntrega;

      const mode = estado === 'ativo' ? 'primary' : estado === 'disponivel' ? 'subagent' : 'primary';
      const permission = this.mapearPermissoes(permissoes, diretoriosPermitidos, diretoriosProibidos);

      const systemPrompt = this.gerarSystemPrompt(
        agentId,
        nome,
        funcao,
        conhecimentos,
        responsabilidades,
        diretoriosPermitidos,
        diretoriosProibidos,
        contratosObrigatorios,
        condicoesDeParada,
        requerAprovacaoPara,
        protocolo
      );

      const frontmatter: KiloAgentConfig = {
        description: `${nome} — ${funcao}`,
        mode,
        steps: 25,
        hidden: false,
        color: this.corPorFuncao(funcao),
        permission
      };

      const md = this.montarMarkdown(frontmatter, systemPrompt);
      const caminhoRelativo = path.join('.kilo', 'agent', `${agentId}.md`).replace(/\\/g, '/');
      this.fs.escrever(caminhoRelativo, md);
    }
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
