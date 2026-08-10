import { ProjetoConfig, GerenciadorConfig, AmbienteConfig, AmbienteDef, Proprietario } from '../../tipos';
import { AGENTES_INICIAIS, ESTADOS_TAREFA } from '../../tipos';

export function criarProjetoConfig(
  id: string,
  nome: string,
  descricao: string,
  tecnologias: Partial<NonNullable<ProjetoConfig['tecnologias']>> = {}
): ProjetoConfig {
  const hoje = new Date().toISOString();
  return {
    id,
    nome,
    descricao: descricao || `Projeto ${nome}`,
    versao: '1.0.0',
    estado: 'em_desenvolvimento',
    idioma: 'pt-BR',
    fusoHorario: 'America/Sao_Paulo',
    proprietario: { tipo: 'humano', nome: 'Proprietário do Projeto' },
    objetivos: ['Objetivo principal do projeto.'],
    escopo: { incluso: [], excluido: [] },
    tecnologias: {
      frontend: tecnologias.frontend || [],
      backend: tecnologias.backend || [],
      android: tecnologias.android || [],
      bancoDeDados: tecnologias.bancoDeDados || [],
      infraestrutura: tecnologias.infraestrutura || [],
      testes: tecnologias.testes || []
    },
    arquiteturas: ['DDD', 'Arquitetura Limpa', 'Arquitetura em Camadas'],
    padroes: ['SOLID', 'GRASP', 'Padrões de Projeto'],
    diretorios: {
      frontend: '/frontend',
      backend: '/backend',
      android: '/android',
      banco: '/banco',
      infraestrutura: '/infraestrutura',
      implantacao: '/implantacao',
      testes: '/testes',
      documentacao: '/docs'
    },
    configuracaoIa: {
      diretorio: '/.ia',
      contratoPrincipal: '/.ia/contratos/contrato-projeto.json',
      estadoAtual: '/.ia/estado/estado-atual.json'
    },
    datas: { criacao: hoje, ultimaAtualizacao: hoje }
  };
}

export function criarGerenciadorConfig(): GerenciadorConfig {
  return {
    nome: 'Gerenciador Local de Projetos para Agentes',
    versao: '1.0.0',
    modo: 'local',
    idioma: 'pt-BR',
    formatoDados: 'json',
    controleVersao: 'git',
    requerAprovacaoHumana: true,
    registroAuditoria: true,
    controlePermissoes: true,
    controleContexto: true,
    controleDependencias: true,
    controleConflitos: true,
    controleContratos: true,
    controleQualidade: true,
    controleSeguranca: true,
    ambientes: ['desenvolvimento', 'teste', 'homologacao', 'producao'],
    estadosTarefa: ESTADOS_TAREFA
  };
}

export function criarAmbienteConfig(): AmbienteConfig {
  const ambientes: AmbienteDef[] = [
    { id: 'desenvolvimento', nome: 'Desenvolvimento', tipo: 'local', permitirAlteracaoCodigo: true, permitirTestes: true, permitirImplantacao: false, permitirAcessoProducao: false },
    { id: 'teste', nome: 'Teste', tipo: 'local', permitirAlteracaoCodigo: false, permitirTestes: true, permitirImplantacao: false, permitirAcessoProducao: false },
    { id: 'homologacao', nome: 'Homologação', tipo: 'remoto', permitirAlteracaoCodigo: false, permitirTestes: true, permitirImplantacao: true, permitirAcessoProducao: false },
    { id: 'producao', nome: 'Produção', tipo: 'remoto', permitirAlteracaoCodigo: false, permitirTestes: false, permitirImplantacao: true, permitirAcessoProducao: true, requerAprovacaoHumana: true }
  ];
  return { ambientes };
}

export const CONFIGURACAO_MARKDOWN = `# Configuração do Projeto

Este diretório contém todos os arquivos de configuração do gerenciador.

## Arquivos

- **projeto.json** — Identidade do projeto, tecnologias, diretórios, proprietário.
- **ambiente.json** — Definição de ambientes (desenvolvimento, teste, homologação, produção).
- **gerenciador.json** — Configuração do gerenciador (versão, controles ativos, estados de tarefa).

## Convenção

Edite estes arquivos com cuidado. O projeto.json é a constituição técnica do projeto.
`;
