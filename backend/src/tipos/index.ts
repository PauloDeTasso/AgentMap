export type EstadoTarefa =
  | 'RASCUNHO'
  | 'PENDENTE'
  | 'PLANEJADA'
  | 'PRONTA'
  | 'PREPARANDO'
  | 'EM_EXECUCAO'
  | 'PAUSANDO'
  | 'CANCELANDO'
  | 'EM_TESTE'
  | 'EM_REVISAO'
  | 'AGUARDANDO_APROVACAO'
  | 'CONCLUIDA'
  | 'BLOQUEADA'
  | 'TIMEOUT'
  | 'ORFA'
  | 'RECUPERANDO'
  | 'CANCELADA'
  | 'REJEITADA';

export type EstadoEntidade = 'ativo' | 'inativo' | 'arquivado' | 'disponivel' | 'rascunho';

export interface Permissoes {
  ler: boolean;
  criar: boolean;
  alterar: boolean;
  excluir: boolean;
  executar: boolean;
  testar: boolean;
  revisar: boolean;
  aprovar: boolean;
  implantar: boolean;
}

export interface Proprietario {
  tipo: 'humano' | 'equipe' | 'empresa';
  nome: string;
}

export interface ProjetoConfig {
  id: string;
  nome: string;
  descricao: string;
  versao: string;
  estado: string;
  idioma: string;
  fusoHorario: string;
  proprietario: Proprietario;
  objetivos: string[];
  escopo: { incluso: string[]; excluido: string[] };
  tecnologias: {
    frontend: string[];
    backend: string[];
    android: string[];
    bancoDeDados: string[];
    infraestrutura: string[];
    testes: string[];
  };
  arquiteturas: string[];
  padroes: string[];
  diretorios: Record<string, string>;
  configuracaoIa: {
    diretorio: string;
    contratoPrincipal: string;
    estadoAtual: string;
  };
  ambiente: string;
  datas: { criacao: string | null; ultimaAtualizacao: string | null };
}

export interface GerenciadorConfig {
  nome: string;
  versao: string;
  modo: string;
  idioma: string;
  formatoDados: string;
  controleVersao: string;
  requerAprovacaoHumana: boolean;
  registroAuditoria: boolean;
  controlePermissoes: boolean;
  controleContexto: boolean;
  controleDependencias: boolean;
  controleConflitos: boolean;
  controleContratos: boolean;
  controleQualidade: boolean;
  controleSeguranca: boolean;
  ambientes: string[];
  estadosTarefa: string[];
}

export interface AmbienteDef {
  id: string;
  nome: string;
  tipo: 'local' | 'remoto';
  permitirAlteracaoCodigo: boolean;
  permitirTestes: boolean;
  permitirImplantacao: boolean;
  permitirAcessoProducao: boolean;
  requerAprovacaoHumana?: boolean;
}

export interface AmbienteConfig {
  ambientes: AmbienteDef[];
}

export interface AgenteRegistro {
  id: string;
  nome: string;
  funcao: string;
  estado: EstadoEntidade;
  arquivoPerfil: string;
}

export interface AgentesRegistry {
  agentes: AgenteRegistro[];
}

export interface AgentePerfil {
  id: string;
  nome: string;
  funcao: string;
  descricao: string;
  estado: EstadoEntidade;
  responsabilidades?: string[];
  objetivos?: string[];
  conhecimentos?: string[];
  dominios?: string[];
  diretoriosPermitidos: string[];
  diretoriosProibidos: string[];
  contratosObrigatorios: string[];
  procedimentosObrigatorios?: string[];
  permissoes: Permissoes;
  ferramentasPermitidas?: string[];
  comandosPermitidos?: string[];
  comandosProibidos?: string[];
  ambientesPermitidos: string[];
  requerAprovacaoPara?: string[];
  condicoesDeParada?: string[];
  criteriosDeQualidade?: string[];
  criteriosDeConclusao?: string[];
  protocoloDeEntrega?: {
    exigeResumo: boolean;
    exigeArquivosAlterados: boolean;
    exigeTestes: boolean;
    exigeRiscos: boolean;
    exigePendencias: boolean;
  };
  linguagemPreferida?: string;
  modelo?: {
    provedor: string;
    nome: string;
    modo: string;
    limiteContexto: number;
  };
  datas: { criacao: string | null; ultimaAtualizacao: string | null };
}

export interface ModeloAgente {
  id: string;
  nome: string;
  funcao: string;
  descricao: string;
  estado: string;
  responsabilidades: string[];
  objetivos: string[];
  conhecimentos: string[];
  dominios: string[];
  diretoriosPermitidos: string[];
  diretoriosProibidos: string[];
  contratosObrigatorios: string[];
  procedimentosObrigatorios: string[];
  permissoes: Permissoes;
  ferramentasPermitidas: string[];
  comandosPermitidos: string[];
  comandosProibidos: string[];
  ambientesPermitidos: string[];
  requerAprovacaoPara: string[];
  condicoesDeParada: string[];
  criteriosDeQualidade: string[];
  criteriosDeConclusao: string[];
  protocoloDeEntrega: {
    exigeResumo: boolean;
    exigeArquivosAlterados: boolean;
    exigeTestes: boolean;
    exigeRiscos: boolean;
    exigePendencias: boolean;
  };
  modelo: {
    provedor: string;
    nome: string;
    modo: string;
    limiteContexto: number;
  };
  datas: { criacao: string | null; ultimaAtualizacao: string | null };
}

export interface ContratoBase {
  id: string;
  nome: string;
  descricao?: string;
  versao: string;
  estado: string;
  obrigatorio?: boolean;
  aplicavelA?: string[];
  objetivo?: string;
  escopo?: string[];
  regras?: string[];
  restricoes?: string[];
  padroesObrigatorios?: string[];
  padroesProibidos?: string[];
  dependencias?: string[];
  criteriosValidacao?: string[];
  condicoesDeExcecao?: string[];
  requerAprovacaoPara?: string[];
  historico?: { versao: string; data: string | null; alteracao: string }[];
}

export interface ContratoRegistro {
  id: string;
  nome: string;
  arquivo: string;
  versao: string;
  estado: string;
  obrigatorio: boolean;
}

export interface ContratosRegistry {
  contratos: ContratoRegistro[];
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  objetivo: string;
  tipo: string;
  estado: EstadoTarefa;
  prioridade: string;
  agenteResponsavel: string;
  dominio: string;
  ambiente: string;
  dependencias: string[];
  contratosObrigatorios: string[];
  procedimentosObrigatorios: string[];
  arquivosPermitidos: string[];
  arquivosProibidos: string[];
  contextoNecessario: string[];
  criteriosAceitacao: string[];
  testesObrigatorios: string[];
  riscos: string[];
  restricoes: string[];
  condicoesDeParada: string[];
  criteriosConclusao: string[];
  estimativaHoras?: number;
  dataLimite?: string;
  tags?: string[];
  resultado: {
    resumo: string;
    arquivosAlterados: string[];
    testesExecutados: string[];
    testesAprovados: string[];
    riscosEncontrados: string[];
    pendencias: string[];
    observacoes: string;
    commit: string;
  };
  aprovacao: {
    necessaria: boolean;
    estado: string;
    aprovador: string;
    data: string | null;
    observacao: string;
  };
  datas: {
    criacao: string | null;
    criadoEm: string | null;
    inicio: string | null;
    ultimaAtualizacao: string | null;
    atualizadaEm: string | null;
    conclusao: string | null;
  };
}

export interface TarefasRegistry {
  tarefas: Tarefa[];
  estatisticas: Record<string, number>;
}

export interface EstadoAtual {
  projetoId: string;
  estado: string;
  fase: string;
  versao: string;
  agentesAtivos: number;
  tarefasAtivas: number;
  tarefasBloqueadas: number;
  ultimasAlteracoes: string[];
  problemasConhecidos: number;
  riscosAtivos: number;
  decisoesRecentes: number;
  contratosAlterados: number;
  testes: { total: number; aprovados: number; reprovados: number };
  qualidade: { percentual: number; pendenciasCriticas: number };
  seguranca: { estado: string; riscosCriticos: number; riscosAltos: number };
}

export interface Bloqueio {
  id: string;
  tarefaId: string;
  tipo: string;
  gravidade: string;
  descricao: string;
  origem: string;
  responsavelResolucao: string;
  estado: EstadoBloqueio;
  criadoEm: string;
  resolvidoEm: string | null;
}

export interface Decisao {
  id: string;
  titulo: string;
  estado: EstadoDecisao;
  data: string;
  problema: string;
  contexto: string;
  alternativas: string[];
  decisao: string;
  justificativa: string;
  impactos: string[];
  consequencias: string[];
  tarefasRelacionadas: string[];
  contratosAfetados: string[];
  aprovacao: {
    necessaria: boolean;
    estado: string;
    aprovador: string;
    data: string | null;
    observacao: string;
  };
}

export interface Risco {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  probabilidade: string;
  impacto: string;
  gravidade: string;
  causa: string;
  consequencias: string[];
  mitigacao: string;
  responsavel: string;
  tarefasRelacionadas: string[];
  estado: EstadoRisco;
  criadoEm: string;
  resolvidoEm: string | null;
}

export interface Problema {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  gravidade: string;
  impacto: string;
  estado: EstadoProblema;
  naoCorrigirAutomaticamente: boolean;
  responsavel: string;
  tarefasRelacionadas: string[];
  solucaoConhecida: string;
  criadoEm: string;
  resolvidoEm: string | null;
}

export interface EventoAuditoria {
  id: string;
  tipo: string;
  origem: string;
  agenteId: string | null;
  usuarioId: string | null;
  tarefaId: string | null;
  descricao: string;
  dados: Record<string, unknown>;
  resultado: 'sucesso' | 'falha' | 'bloqueado';
  data: string;
}

export interface EstadoGit {
  repositorio: {
    caminho: string;
    ramoAtual: string | null;
    estado: string;
    ultimoCommit: {
      identificador: string | null;
      mensagem: string | null;
      autor: string | null;
      data: string | null;
    };
  };
  alteracoes: {
    modificados: string[];
    criados: string[];
    excluidos: string[];
  };
  conflitos: string[];
  tarefasRelacionadas: string[];
  ultimaVerificacao: string;
}

export interface ArquivoInfo {
  caminho: string;
  nome: string;
  tipo: 'arquivo' | 'diretorio';
  tamanho: number;
  modificadoEm: string;
  extensao: string;
}

export interface ProjetoRegistro {
  id: string;
  nome: string;
  caminhoRaiz: string;
  ativo: boolean;
  ultimaAbertura: string | null;
}

export interface RegistroProjetos {
  projetos: ProjetoRegistro[];
  projetoAtual: string | null;
}

export interface ResultadoOperacao<T = unknown> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
  codigoErro?: string;
}

export type EstadoSolicitacao =
  | 'PENDENTE'
  | 'EM_ANALISE'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADA'
  | 'REJEITADA'
  | 'EM_EXECUCAO'
  | 'AGUARDANDO_VALIDACAO'
  | 'CONCLUIDA'
  | 'CANCELADA'
  | 'BLOQUEADA';

export type PrioridadeSolicitacao = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type TipoAlteracao =
  | 'ADICAO'
  | 'ALTERACAO'
  | 'REMOCAO'
  | 'CORRECAO'
  | 'MIGRACAO'
  | 'SUBSTITUICAO'
  | 'REESTRUTURACAO';

export type TipoAlvo =
  | 'BANCO_DADOS'
  | 'TABELA'
  | 'COLUNA'
  | 'INDICE'
  | 'CONTRATO_API'
  | 'ARQUIVO'
  | 'CLASSE'
  | 'METODO'
  | 'MODULO'
  | 'COMPONENTE'
  | 'PROJETO'
  | 'CONFIGURACAO'
  | 'DEPENDENCIA'
  | 'INFRAESTRUTURA'
  | 'DOCUMENTACAO'
  | 'SEGURANCA'
  | 'ARQUITETURA'

export type ImpactoArea =
  | 'BACKEND'
  | 'FRONTEND'
  | 'API'
  | 'BANCO_DADOS'
  | 'SEGURANCA'
  | 'INFRAESTRUTURA'
  | 'DOCUMENTACAO'
  | 'TESTES'
  | 'ARQUITETURA'
  | 'CONFIGURACAO'

export interface AgenteRef {
  id: string;
}

export interface AgenteResponsavelRef {
  id: string | null;
}

export interface AlvoSolicitacao {
  tipo: TipoAlvo;
  nome: string;
  identificador?: string | null;
  localizacao?: string | null;
}

export interface AlteracaoSolicitacao {
  tipo: TipoAlteracao;
  descricao: string;
  motivo: string;
  arquivosAfetados: string[];
}

export interface AprovacaoSolicitacao {
  status: 'PENDENTE' | 'APROVADA' | 'REJEITADA';
  agenteId: string | null;
  data: string | null;
  observacao: string | null;
}

export interface TarefaOrigem {
  id: string;
}

export interface DatasSolicitacao {
  criadaEm: string | null;
  atualizadaEm: string | null;
  concluidaEm: string | null;
}

export interface SolicitacaoAlteracao {
  id: string;
  titulo: string;
  descricao: string;
  agenteSolicitante: AgenteRef;
  agenteResponsavel: AgenteResponsavelRef;
  alvo: AlvoSolicitacao;
  alteracao: AlteracaoSolicitacao;
  impactos: ImpactoArea[];
  dependencias: string[];
  prioridade: PrioridadeSolicitacao;
  status: EstadoSolicitacao;
  requerAprovacao: boolean;
  aprovacao: AprovacaoSolicitacao;
  tarefaOrigem: TarefaOrigem | null;
  datas: DatasSolicitacao;
  observacoes: string | null;
}

export interface SolicitacoesRegistry {
  solicitacoes: SolicitacaoAlteracao[];
}

export interface EventoHistoricoSolicitacao {
  id: string;
  solicitacaoId: string;
  tipo: string;
  data: string;
  agenteId: string | null;
  observacao: string | null;
}

export interface HistoricoSolicitacoes {
  eventos: EventoHistoricoSolicitacao[];
}

export const ESTADOS_SOLICITACAO: EstadoSolicitacao[] = [
  'PENDENTE', 'EM_ANALISE', 'AGUARDANDO_APROVACAO', 'APROVADA', 'REJEITADA',
  'EM_EXECUCAO', 'AGUARDANDO_VALIDACAO', 'CONCLUIDA', 'CANCELADA', 'BLOQUEADA'
];

export const PRIORIDADES_SOLICITACAO: PrioridadeSolicitacao[] = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];

export const TIPOS_ALTERACAO: TipoAlteracao[] = ['ADICAO', 'ALTERACAO', 'REMOCAO', 'CORRECAO', 'MIGRACAO', 'SUBSTITUICAO', 'REESTRUTURACAO'];

export const TIPOS_ALVO: TipoAlvo[] = ['BANCO_DADOS', 'TABELA', 'COLUNA', 'INDICE', 'CONTRATO_API', 'ARQUIVO', 'CLASSE', 'METODO', 'MODULO', 'COMPONENTE', 'PROJETO', 'CONFIGURACAO', 'DEPENDENCIA', 'INFRAESTRUTURA', 'DOCUMENTACAO', 'SEGURANCA', 'ARQUITETURA'];

export const IMPACTOS_SOLICITACAO: ImpactoArea[] = ['BACKEND', 'FRONTEND', 'API', 'BANCO_DADOS', 'SEGURANCA', 'INFRAESTRUTURA', 'DOCUMENTACAO', 'TESTES', 'ARQUITETURA', 'CONFIGURACAO'];

export const DIRETORIOS_PERMITIDOS_ARQUIVOS = ['frontend', 'backend', 'android', 'banco', 'infraestrutura', 'implantacao', 'testes', 'docs'] as const;

export const AGENTES_INICIAIS: { id: string; nome: string; funcao: string; subpasta: string; perfilId: string }[] = [
  { id: 'planejador-arquiteto', nome: 'Planejador / Arquiteto', funcao: 'planejamento', subpasta: 'planejador', perfilId: 'planejador' },
  { id: 'frontend', nome: 'Frontend', funcao: 'desenvolvimento_frontend', subpasta: 'frontend', perfilId: 'frontend' },
  { id: 'backend', nome: 'Backend', funcao: 'desenvolvimento_backend', subpasta: 'backend', perfilId: 'backend' },
  { id: 'banco', nome: 'Banco de Dados', funcao: 'banco_de_dados', subpasta: 'banco', perfilId: 'banco' },
  { id: 'android', nome: 'Android', funcao: 'desenvolvimento_android', subpasta: 'android', perfilId: 'android' },
  { id: 'infraestrutura', nome: 'Infraestrutura', funcao: 'infraestrutura_implantacao', subpasta: 'infraestrutura', perfilId: 'infraestrutura' },
  { id: 'testes', nome: 'Qualidade e Testes', funcao: 'qualidade_testes', subpasta: 'testes', perfilId: 'testes' },
  { id: 'seguranca', nome: 'Segurança', funcao: 'seguranca', subpasta: 'seguranca', perfilId: 'seguranca' },
  { id: 'revisor', nome: 'Revisor de Código', funcao: 'revisao', subpasta: 'revisor', perfilId: 'revisor' },
  { id: 'documentacao', nome: 'Documentação', funcao: 'documentacao', subpasta: 'documentacao', perfilId: 'documentacao' },
  { id: 'observabilidade', nome: 'Observabilidade', funcao: 'observabilidade', subpasta: 'observabilidade', perfilId: 'observabilidade' },
  { id: 'desempenho', nome: 'Desempenho', funcao: 'desempenho', subpasta: 'desempenho', perfilId: 'desempenho' }
];

export const ESTADOS_TAREFA: EstadoTarefa[] = [
  'RASCUNHO',
  'PENDENTE',
  'PLANEJADA',
  'PRONTA',
  'PREPARANDO',
  'EM_EXECUCAO',
  'PAUSANDO',
  'CANCELANDO',
  'EM_TESTE',
  'EM_REVISAO',
  'AGUARDANDO_APROVACAO',
  'CONCLUIDA',
  'BLOQUEADA',
  'TIMEOUT',
  'ORFA',
  'RECUPERANDO',
  'CANCELADA',
  'REJEITADA'
];

export const TRANSICOES_ESTADO_TAREFA: Record<EstadoTarefa, EstadoTarefa[]> = {
  RASCUNHO: ['PLANEJADA', 'CANCELADA', 'EM_EXECUCAO', 'EM_REVISAO', 'CONCLUIDA', 'PREPARANDO'],
  PENDENTE: ['EM_EXECUCAO', 'PLANEJADA', 'CANCELADA', 'CONCLUIDA', 'PREPARANDO'],
  PLANEJADA: ['PRONTA', 'RASCUNHO', 'BLOQUEADA', 'CANCELADA', 'PREPARANDO'],
  PRONTA: ['EM_EXECUCAO', 'PLANEJADA', 'BLOQUEADA', 'PREPARANDO'],
  PREPARANDO: ['PRONTA', 'BLOQUEADA', 'CANCELANDO'],
  EM_EXECUCAO: ['EM_TESTE', 'EM_REVISAO', 'BLOQUEADA', 'CANCELADA', 'CONCLUIDA', 'PAUSANDO', 'TIMEOUT'],
  PAUSANDO: ['EM_EXECUCAO', 'CANCELANDO'],
  CANCELANDO: ['CANCELADA'],
  EM_TESTE: ['EM_REVISAO', 'EM_EXECUCAO', 'BLOQUEADA'],
  EM_REVISAO: ['AGUARDANDO_APROVACAO', 'EM_TESTE', 'EM_EXECUCAO', 'REJEITADA', 'CONCLUIDA'],
  AGUARDANDO_APROVACAO: ['CONCLUIDA', 'REJEITADA', 'EM_REVISAO'],
  CONCLUIDA: [],
  BLOQUEADA: ['RASCUNHO', 'PENDENTE', 'PLANEJADA', 'PRONTA', 'PREPARANDO', 'EM_EXECUCAO', 'PAUSANDO', 'EM_TESTE', 'EM_REVISAO', 'AGUARDANDO_APROVACAO', 'CANCELADA', 'RECUPERANDO', 'ORFA'],
  TIMEOUT: ['PRONTA', 'BLOQUEADA', 'CANCELADA', 'RECUPERANDO'],
  ORFA: ['RECUPERANDO', 'CANCELADA'],
  RECUPERANDO: ['PRONTA', 'EM_EXECUCAO', 'BLOQUEADA'],
  CANCELADA: [],
  REJEITADA: ['RASCUNHO', 'PENDENTE', 'PLANEJADA', 'PRONTA', 'EM_EXECUCAO']
};

export const TRANSICOES_ESTADO_SOLICITACAO: Record<EstadoSolicitacao, EstadoSolicitacao[]> = {
  PENDENTE: ['EM_ANALISE', 'CANCELADA'],
  EM_ANALISE: ['AGUARDANDO_APROVACAO', 'PENDENTE', 'CANCELADA'],
  AGUARDANDO_APROVACAO: ['APROVADA', 'REJEITADA', 'EM_ANALISE'],
  APROVADA: ['EM_EXECUCAO', 'CANCELADA'],
  REJEITADA: ['PENDENTE', 'CANCELADA'],
  EM_EXECUCAO: ['AGUARDANDO_VALIDACAO', 'CANCELADA', 'BLOQUEADA'],
  AGUARDANDO_VALIDACAO: ['CONCLUIDA', 'EM_EXECUCAO', 'BLOQUEADA'],
  CONCLUIDA: [],
  CANCELADA: [],
  BLOQUEADA: ['EM_EXECUCAO', 'CANCELADA']
};

export const TRANSICOES_ESTADO_BLOQUEIO: Record<EstadoBloqueio, EstadoBloqueio[]> = {
  ATIVO: ['RESOLVIDO', 'CANCELADO'],
  RESOLVIDO: [],
  CANCELADO: []
};

export const TRANSICOES_ESTADO_VALIDACAO: Record<EstadoValidacao, EstadoValidacao[]> = {
  PENDENTE: ['APROVADO', 'REPROVADO', 'APROVADO_COM_RESSALVAS'],
  APROVADO: [],
  REPROVADO: [],
  APROVADO_COM_RESSALVAS: []
};

export const TRANSICOES_ESTADO_CONFLITO: Record<Conflito['estado'], Conflito['estado'][]> = {
  ABERTO: ['EM_RESOLUCAO', 'RESOLVIDO', 'CANCELADO'],
  EM_RESOLUCAO: ['RESOLVIDO', 'CANCELADO'],
  RESOLVIDO: [],
  CANCELADO: []
};

export const TRANSICOES_ESTADO_HANDOFF: Record<EstadoHandoff, EstadoHandoff[]> = {
  PENDENTE: ['ACEITO', 'RECUSADO'],
  ACEITO: ['CONCLUIDO', 'RECUSADO'],
  RECUSADO: [],
  CONCLUIDO: []
};

export const TRANSICOES_ESTADO_RESERVA: Record<EstadoReserva, EstadoReserva[]> = {
  ATIVA: ['CONCLUIDA', 'CANCELADA'],
  CANCELADA: [],
  CONCLUIDA: []
};

export const TRANSICOES_ESTADO_RESULTADO: Record<ResultadoEntity['estado'], ResultadoEntity['estado'][]> = {
  COMPLETO: [],
  PARCIAL: ['COMPLETO', 'INCOMPLETO'],
  INCOMPLETO: ['PARCIAL']
};

export const TRANSICOES_ESTADO_ARTEFATO: Record<EstadoArtefato, EstadoArtefato[]> = {
  ATIVO: ['ARQUIVADO', 'OBSOLETO'],
  ARQUIVADO: [],
  OBSOLETO: [],
  EXCLUIDO: []
};

export const TRANSICOES_ESTADO_RISCO: Record<EstadoRisco, EstadoRisco[]> = {
  ATIVO: ['RESOLVIDO', 'CANCELADO', 'MITIGADO'],
  MITIGADO: ['RESOLVIDO', 'CANCELADO', 'ATIVO'],
  RESOLVIDO: [],
  CANCELADO: []
};

export function validarTransicao<T extends string | number | symbol>(transicoes: Record<T, T[]>, estadoAtual: T, estadoNovo: T): boolean {
  const permitidas = transicoes[estadoAtual] || [];
  return permitidas.includes(estadoNovo);
}

export type EstadoProblema = 'ABERTO' | 'EM_ANALISE' | 'RESOLVIDO' | 'CANCELADO';
export type EstadoBloqueio = 'ATIVO' | 'RESOLVIDO' | 'CANCELADO';
export type EstadoArtefato = 'ATIVO' | 'ARQUIVADO' | 'OBSOLETO' | 'EXCLUIDO';
export type EstadoHandoff = 'PENDENTE' | 'ACEITO' | 'RECUSADO' | 'CONCLUIDO';
export type EstadoSessao = 'ATIVA' | 'FINALIZADA' | 'CANCELADA';
export type EstadoAprendizado = 'ATIVO' | 'ARQUIVADO';
export type EstadoRisco = 'ATIVO' | 'MITIGADO' | 'RESOLVIDO' | 'CANCELADO';
export type EstadoDecisao = 'ATIVA' | 'ARQUIVADA' | 'RESPALDADA' | 'CANCELADA';
export type EstadoDependencia = 'ATIVA' | 'CIRCULAR' | 'RESOLVIDA' | 'CANCELADA';

export const ESTADOS_BLOQUEIO: EstadoBloqueio[] = ['ATIVO', 'RESOLVIDO', 'CANCELADO'];
export const ESTADOS_ARTEFATO: EstadoArtefato[] = ['ATIVO', 'ARQUIVADO', 'OBSOLETO', 'EXCLUIDO'];
export const ESTADOS_HANDOFF: EstadoHandoff[] = ['PENDENTE', 'ACEITO', 'RECUSADO', 'CONCLUIDO'];
export const ESTADOS_SESSAO: EstadoSessao[] = ['ATIVA', 'FINALIZADA', 'CANCELADA'];
export const ESTADOS_APRENDIZADO: EstadoAprendizado[] = ['ATIVO', 'ARQUIVADO'];
export const ESTADOS_RISCO: EstadoRisco[] = ['ATIVO', 'MITIGADO', 'RESOLVIDO', 'CANCELADO'];
export const ESTADOS_DECISAO: EstadoDecisao[] = ['ATIVA', 'ARQUIVADA', 'RESPALDADA', 'CANCELADA'];
export const ESTADOS_DEPENDENCIA: EstadoDependencia[] = ['ATIVA', 'CIRCULAR', 'RESOLVIDA', 'CANCELADA'];

export type EstadoCritico = 'PENDENTE' | 'ATIVO' | 'RESOLVIDO' | 'CANCELADO';
export type EstadoValidacao = 'PENDENTE' | 'APROVADO' | 'REPROVADO' | 'APROVADO_COM_RESSALVAS';
export type EstadoReserva = 'ATIVA' | 'CANCELADA' | 'CONCLUIDA';
export type TipoConflito = 'RECURSO_DUPLICADO' | 'DECISAO_INCOMPATIVEL' | 'VERSAO_INCOMPATIVEL' | 'CONTRATO_INCOMPATIVEL' | 'TAREFA_INCOMPATIVEL';
export type SeveridadeRisco = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type TipoArtefato = 'ARQUIVO' | 'CLASSE' | 'METODO' | 'MODULO' | 'CONTRATO' | 'MIGRACAO' | 'TESTE' | 'DOCUMENTACAO' | 'CONFIGURACAO' | 'SCRIPT' | 'DIAGRAMA';
export type TipoHandoff = 'PADRAO' | 'EMERGENCIAL' | 'FINAL';
export type TipoPendencia = 'IMPLEMENTACAO' | 'VALIDACAO' | 'CORRECAO' | 'COMPLETUDE';
export type TipoCheckpoint = 'INTERMEDIARIO' | 'DECISAO' | 'ENTREGA';
export type TipoHistoricoCoordenacao =
  | 'TAREFA_CRIADA'
  | 'TAREFA_ATRIBUIDA'
  | 'TAREFA_INICIADA'
  | 'TAREFA_CONCLUIDA'
  | 'TAREFA_CANCELADA'
  | 'TAREFA_BLOQUEADA'
  | 'TAREFA_DESBLOQUEADA'
  | 'SOLICITACAO_CRIADA'
  | 'SOLICITACAO_APROVADA'
  | 'SOLICITACAO_REJEITADA'
  | 'SOLICITACAO_CONCLUIDA'
  | 'BLOQUEIO_CRIADO'
  | 'BLOQUEIO_RESOLVIDO'
  | 'HANDOFF_CRIADO'
  | 'VALIDACAO_INICIADA'
  | 'VALIDACAO_CONCLUIDA'
  | 'CONFLITO_CRIADO'
  | 'CONFLITO_RESOLVIDO'
  | 'RESULTADO_REGISTRADO'
  | 'ARTEFATO_CRIADO'
  | 'RESERVA_CRIADA'
  | 'RESERVA_LIBERADA'
  | 'SESSAO_INICIADA'
  | 'SESSAO_FINALIZADA'
  | 'CHECKPOINT_CRIADO'
  | 'APRENDIZADO_REGISTRADO'
  | 'DECISAO_CRIADA'
  | 'DECISAO_ATUALIZADA'
  | 'RISCO_CRIADO'
  | 'RISCO_ATUALIZADO'
  | 'PENDENCIA_CRIADA'
  | 'PENDENCIA_RESOLVIDA'
  | 'ARQUIVO_ALTERADO'
  | 'ARQUIVO_EXCLUIDO'
  | 'APROVACAO_SOLICITADA'
  | 'APROVACAO_CONCEDIDA'
  | 'APROVACAO_REJEITADA';

export interface CriterioAceitacao {
  id: string;
  tarefaId: string;
  descricao: string;
  tipo: 'FUNCIONAL' | 'NEFUNCIONAL' | 'DESIGUALDADE' | 'REGRA_NEGOCIO';
  obrigatorio: boolean;
  estado: 'PENDENTE' | 'SATISFEITO' | 'INSATISFEITO';
  dados?: string | null;
}

export interface CriteriosRegistry {
  criterios: CriterioAceitacao[];
}

export type EstadoExecucao = 'PENDENTE' | 'EM_EXECUCAO' | 'SUCESSO' | 'FALHA' | 'CANCELADA';

export interface Execucao {
  execucaoId: number;
  tarefaId: string;
  estado: EstadoExecucao;
  agenteId: string;
  inicio: string | null;
  fim: string | null;
  resultadoId: string | null;
  observacoes: string;
  datas: { criadaEm: string | null; atualizadaEm: string | null };
}

export interface ExecucoesRegistry {
  execucoes: Execucao[];
}

export interface ResultadoEntity {
  id: string;
  tarefaId: string;
  execucaoId: number;
  agenteId: string;
  resumo: string;
  estado: 'COMPLETO' | 'PARCIAL' | 'INCOMPLETO';
  arquivosAlterados: string[];
  artefatos: string[];
  testesExecutados: string[];
  testesAprovados: string[];
  riscosEncontrados: string[];
  pendencias: string[];
  alteracoesSolicitadas: string[];
  observacoes: string | null;
  datas: { criadaEm: string | null; atualizadaEm: string | null; concluidaEm: string | null };
}

export interface ResultadosRegistry {
  resultados: ResultadoEntity[];
}

export interface Artefato {
  id: string;
  nome: string;
  tipo: TipoArtefato;
  descricao: string;
  tarefaId: string | null;
  localizacao: string | null;
  agenteId: string;
  versaoId: string | null;
  dados: Record<string, unknown> | null;
  estado: EstadoArtefato;
  datas: { criadaEm: string | null; atualizadaEm: string | null; excluidaEm: string | null };
}

export interface ArtefatosRegistry {
  artefatos: Artefato[];
}

export interface VersaoArtefato {
  id: string;
  artefatoId: string;
  versao: string;
  estado: 'ATIVA' | 'ARQUIVADA' | 'OBSOLETO';
  commit: string | null;
  dados: Record<string, unknown> | null;
  data: string;
}

export interface Handoff {
  id: string;
  origem: string;
  destino: string;
  tarefaId: string | null;
  resumo: string;
  concluido: string[];
  pendente: string[];
  artefatos: string[];
  decisoes: string[];
  alteracoes: string[];
  riscos: string[];
  bloqueios: string[];
  observacoes: string | null;
  estado: EstadoHandoff;
  datas: { criadaEm: string | null; criacao: string | null; aceitaEm: string | null; concluidaEm: string | null };
}

export interface HandoffsRegistry {
  handoffs: Handoff[];
}

export interface Pendencia {
  id: string;
  titulo: string;
  descricao: string;
  tarefaId: string | null;
  agenteId: string | null;
  tipo: TipoPendencia;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  estado: EstadoCritico;
  origem: 'TAREFA' | 'SOLICITACAO' | 'VALIDACAO' | 'MANUAL';
  referenciaId: string | null;
  resolucao: string | null;
  datas: { criadaEm: string | null; atualizadaEm: string | null; resolvidaEm: string | null };
}

export interface PendenciasRegistry {
  pendencias: Pendencia[];
}

export interface Validacao {
  id: string;
  alvoTipo: string;
  alvoId: string;
  tarefaId: string | null;
  criterios: string[];
  responsavel: string;
  estado: EstadoValidacao;
  evidencias: string[];
  observacoes: string | null;
  datas: { criadaEm: string | null; atualizadaEm: string | null; concluidaEm: string | null };
}

export interface ValidacoesRegistry {
  validacoes: Validacao[];
}

export interface Conflito {
  id: string;
  titulo: string;
  descricao: string;
  tipo: TipoConflito;
  severidade: SeveridadeRisco;
  tarefaId: string | null;
  agenteId: string | null;
  referencias: string[];
  origem: string | null;
  resolucao: string | null;
  estado: 'ABERTO' | 'EM_RESOLUCAO' | 'RESOLVIDO' | 'CANCELADO';
  datas: { criadaEm: string | null; atualizadaEm: string | null; resolvidaEm: string | null };
}

export interface ConflitosRegistry {
  conflitos: Conflito[];
}

export interface Reserva {
  id: string;
  alvo: string;
  tipoAlvo: TipoAlvo;
  agenteId: string;
  tarefaId: string | null;
  estado: EstadoReserva;
  observacoes: string | null;
  datas: { criadaEm: string | null; atualizadaEm: string | null; expiradaEm: string | null };
}

export interface ReservasRegistry {
  reservas: Reserva[];
}

export interface Sessao {
  id: string;
  agenteId: string;
  tarefaId: string | null;
  projetoId: string;
  contextoConsultado: Record<string, unknown>;
  registrosProduzidos: string[];
  estadoFinal: string;
  datas: { inicio: string | null; criadoEm: string | null; fim: string | null };
}

export interface SessoesRegistry {
  sessoes: Sessao[];
}

export interface Checkpoint {
  id: string;
  tarefaId: string;
  agenteId: string;
  tipo: TipoCheckpoint;
  titulo: string;
  descricao: string;
  artefatos: string[];
  alteracoes: string[];
  riscos: string[];
  pendencias: string[];
  observacoes: string | null;
  dados: Record<string, unknown> | null;
  datas: { criadaEm: string | null; atualizadaEm: string | null };
}

export interface CheckpointsRegistry {
  checkpoints: Checkpoint[];
}

export interface Aprendizado {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  tarefaId: string | null;
  agenteId: string | null;
  origem: string | null;
  dados: Record<string, unknown> | null;
  utilidade: 'BAIXA' | 'MEDIA' | 'ALTA';
  estado: EstadoAprendizado;
  datas: { criadaEm: string | null; atualizadaEm: string | null; promovidaEm: string | null };
}

export interface AprendizadosRegistry {
  aprendizados: Aprendizado[];
}

export interface Dependencia {
  id: string;
  fonteId: string;
  fonteTipo: string;
  destinoId: string;
  destinoTipo: string;
  tipo: 'FIM_INICIO' | 'FIM_INICIO_PINSTARTER' | 'INICIO_INICIO';
  estado: EstadoDependencia;
  datas: { criadaEm: string | null; atualizadaEm: string | null };
}

export interface DependenciasRegistry {
  dependencias: Dependencia[];
}

export interface Responsabilidade {
  id: string;
  agenteId: string;
  alvoId: string;
  alvoTipo: string;
  nivel: 'RESPONSAVEL' | 'CONSULTADO' | 'INFORMADO' | 'APROVADOR';
  datas: { criadaEm: string | null; atualizadaEm: string | null };
}

export interface ResponsabilidadesRegistry {
  responsabilidades: Responsabilidade[];
}

export interface Evento {
  id: string;
  tipo: TipoEvento;
  origem: string;
  destino: string;
  referenciaTipo: string;
  referenciaId: string;
  mensagem: string;
  estado: EstadoEvento;
  datas: { criadoEm: string | null; criacao: string | null; consumidoEm: string | null };
}

export interface EventosRegistry {
  eventos: Evento[];
}

export type EstadoEvento = 'PENDENTE' | 'CONSUMIDO';

export type TipoEvento = 'HANDOFF_CRIADO' | 'HANDOFF_ACEITO' | 'HANDOFF_CONCLUIDO' | 'TAREFA_CONCLUIDA' | 'BLOQUEIO_CRIADO' | 'CONFLITO_DETECTADO' | 'SOLICITACAO_CRIADA' | 'TRANSIÇÃO_ATUALIZADA' | 'DISPATCH_INICIADO' | 'DISPATCH_SUCESSO' | 'DISPATCH_ERRO' | 'CONFIG_DISPATCH_ATUALIZADA' | 'DISPATCH_FALHA_PERMANENTE' | 'MODO_GLOBAL_ALTERADO' | 'MODO_AGENTE_ALTERADO' | 'STATUS_AGENTE_ATUALIZADO' | 'INTERVENCAO_MANUAL' | 'INSTANCIA_REGISTRADA' | 'INSTANCIA_CONECTADA' | 'INSTANCIA_DESCONECTADA' | 'INSTANCIA_ERRO' | 'INSTANCIA_ATUALIZADA' | 'INSTANCIA_EXCLUIDA' | 'MODO_AUTONOMIA_ALTERADO' | 'TAREFA_RECONCILIADA' | 'PROJETO_CRIADO' | 'PROJETO_ABERTO' | 'AGENTE_CRIADO' | 'AGENTE_ATUALIZADO' | 'AGENTE_EXCLUIDO' | 'TAREFA_CRIADA' | 'TAREFA_ATRIBUIDA' | 'TAREFA_INICIADA' | 'TAREFA_CANCELADA' | 'TAREFA_BLOQUEADA' | 'TAREFA_DESBLOQUEADA' | 'TAREFA_ESTADO_ALTERADO' | 'TAREFA_EXCLUIDA' | 'CONTRATO_CRIADO' | 'CONTRATO_ALTERADO' | 'CONTRATO_EXCLUIDO' | 'CONTRATO_VALIDADO' | 'CONTRATO_INVALIDO' | 'ARQUIVO_ALTERADO' | 'ARQUIVO_EXCLUIDO' | 'TESTE_EXECUTADO' | 'REVISAO_REALIZADA' | 'APROVACAO_SOLICITADA' | 'APROVACAO_CONCEDIDA' | 'APROVACAO_REJEITADA' | 'IMPLANTACAO_REALIZADA' | 'SEGURANCA_VIOLACAO' | 'BACKUP_CRIADO' | 'SOLICITACAO_ALTERADA' | 'SOLICITACAO_APROVADA' | 'SOLICITACAO_REJEITADA' | 'SOLICITACAO_EXCLUIDA' | 'CRITERIO_CRIADO' | 'RESULTADO_REGISTRADO' | 'ARTEFATO_CRIADO' | 'VALIDACAO_INICIADA' | 'VALIDACAO_CONCLUIDA' | 'BLOQUEIO_RESOLVIDO' | 'CONFLITO_CRIADO' | 'CONFLITO_RESOLVIDO' | 'RISCO_CRIADO' | 'RISCO_ATUALIZADO' | 'RESPONSABILIDADE_REGISTRADA' | 'RESERVA_CRIADA' | 'RESERVA_LIBERADA' | 'SESSAO_INICIADA' | 'SESSAO_FINALIZADA' | 'CHECKPOINT_CRIADO' | 'APRENDIZADO_REGISTRADO' | 'PENDENCIA_CRIADA' | 'PENDENCIA_RESOLVIDA' | 'DEPENDENCIA_CRIADA' | 'DECISAO_CRIADA' | 'DECISAO_ATUALIZADA' | 'INTEGRIDADE_VERIFICADA' | 'INTEGRIDADE_FALHA' | 'REGRAS_RESPEITADAS' | 'CONTATO_CRIADO' | 'CONTATO_ATUALIZADO' | 'CONTATO_EXCLUIDO' | 'EVENTO_CRIADO' | 'EVENTO_CONSUMIDO' | 'BROADCAST_ANUNCIO' | 'CHECKLIST_FLUXO_VERIFICADO' | 'AGENTES_ORFAOS' | 'KILO_DESCOBERTO' | 'KILO_RECONCILIADO' | 'KILO_SESSION_DESCONHECIDA' | 'KILO_STATUS_REPORTADO' | 'KILO_PROGRESSO_REPORTADO' | 'KILO_RESULTADO_REPORTADO' | 'TAREFA_PROGRESSO' | 'TAREFA_FALHA';

export interface EventoHistorico {
  id: string;
  tipo: TipoHistoricoCoordenacao;
  tarefaId: string | null;
  agenteId: string | null;
  dados: Record<string, unknown>;
  data: string;
}

export interface HistoricoCoordenacao {
  eventos: EventoHistorico[];
}

export interface EstadoProjeto {
  projetoId: string;
  versao: string;
  estado: 'NAVEGACAO' | 'EXPLORACAO' | 'IMPLEMENTACAO' | 'REVISAO' | 'IMPLANTACAO' | 'ARQUIVADO';
  resumo: string;
  tarefas: { total: number; concluidas: number; emExecucao: number; bloqueadas: number; pendentes: number };
  solicitacoes: { total: number; pendentes: number; aprovadas: number; rejeitadas: number; concluidas: number };
  artefatos: { total: number; ativos: number };
  handoffs: { total: number; pendentes: number; concluidos: number };
  bloqueios: number;
  conflitos: { total: number; abertos: number };
  riscos: { total: number; ativos: number; criticos: number };
  validacoes: { total: number; pendentes: number; aprovadas: number; reprovadas: number };
  reservas: { total: number; ativas: number };
  checkpoints: { total: number; recentes: number };
  sessoes: { total: number; ativas: number };
  aprendizados: { total: number; ativos: number };
  integridade: { ultimaVerificacao: string | null; inconsistencias: number };
  datas: { atualizadaEm: string | null };
}

export const PRIORIDADES_SIMPLES = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'] as const;
export const SEVERIDADES_RISCO: SeveridadeRisco[] = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
export const ESTADOS_CRITICOS: EstadoCritico[] = ['PENDENTE', 'ATIVO', 'RESOLVIDO', 'CANCELADO'];
export const ESTADOS_VALIDACAO: EstadoValidacao[] = ['PENDENTE', 'APROVADO', 'REPROVADO', 'APROVADO_COM_RESSALVAS'];
export const ESTADOS_RESERVA: EstadoReserva[] = ['ATIVA', 'CANCELADA', 'CONCLUIDA'];
export const ESTADOS_EXECUCAO: EstadoExecucao[] = ['PENDENTE', 'EM_EXECUCAO', 'SUCESSO', 'FALHA', 'CANCELADA'];
export const TIPOS_CONFLITO: TipoConflito[] = ['RECURSO_DUPLICADO', 'DECISAO_INCOMPATIVEL', 'VERSAO_INCOMPATIVEL', 'CONTRATO_INCOMPATIVEL', 'TAREFA_INCOMPATIVEL'];
export const TIPOS_ARTEFATO: TipoArtefato[] = ['ARQUIVO', 'CLASSE', 'METODO', 'MODULO', 'CONTRATO', 'MIGRACAO', 'TESTE', 'DOCUMENTACAO', 'CONFIGURACAO', 'SCRIPT', 'DIAGRAMA'];
export const TIPOS_PENDENCIA: TipoPendencia[] = ['IMPLEMENTACAO', 'VALIDACAO', 'CORRECAO', 'COMPLETUDE'];

export interface KiloDaemonState {
  running: boolean;
  stale: boolean;
  state: {
    pid: number;
    hostname: string;
    port: number;
    url: string;
    urls: Record<string, string>;
    username: string;
    version: string;
    startedAt: string;
    log: string;
  };
  health: {
    healthy: boolean;
    version: string;
  };
  file: string;
  started: boolean;
  reused: boolean;
}

export type EstadoInstancia = 'REGISTRADA' | 'CONECTADA' | 'DESCONECTADA' | 'ERRO';
export type ModoAutonomia = 'MANUAL' | 'ASSISTIDA' | 'AUTONOMA';

export interface Instancia {
  id: string;
  instanciaId: string;
  agenteId: string;
  projetoId: string;
  workspaceId: string;
  workspacePath: string;
  tipoInstancia: 'EXECUTOR' | 'GERENTE';
  sessaoId: string | null;
  status: EstadoInstancia;
  modoAutonomia: ModoAutonomia;
  ultimaAtividade: string | null;
  versaoKilo: string | null;
  capabilities: string[];
  porta: number | null;
  pid: number | null;
  datas: { criacao: string | null; atualizacao: string | null; ultimaConexao: string | null };
}

export interface InstanciasRegistry {
  instancias: Instancia[];
}

export const ESTADOS_INSTANCIA: EstadoInstancia[] = ['REGISTRADA', 'CONECTADA', 'DESCONECTADA', 'ERRO'];

export interface DispatchEventoKilo {
  type: 'step_start' | 'text' | 'step_finish' | 'error' | 'permission' | 'system';
  timestamp: number;
  sessionID: string;
  part?: {
    id: string;
    sessionID: string;
    messageID: string;
    type: string;
    text?: string;
    reason?: string;
    model?: { providerID: string; modelID: string };
    metrics?: { generation: number; source: string };
    time?: { start: number; end: number; elapsed: number };
    cost?: number;
    tokens?: { total: number; input: number; output: number; reasoning: number; cache: { read: number; write: number } };
  };
}

export interface DispatchLog {
  id: string;
  timestamp: string;
  instanciaId: string;
  tarefaId?: string;
  comando: string;
  status: 'SUCESSO' | 'ERRO' | 'PENDENTE';
  sessionId?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  duracaoMs?: number;
  eventos?: DispatchEventoKilo[];
}

export interface KiloWorktree {
  nome: string;
  caminho: string;
  branch: string;
  sessaoId?: string;
  agenteId?: string;
  tarefaId?: string;
}

export interface KiloSession {
  id: string;
  nome: string;
  tipo: string;
  agenteId?: string;
  worktreeId?: string;
  estado: 'ativo' | 'pausado' | 'finalizado' | 'erro';
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface KiloAgentDef {
  id: string;
  nome: string;
  descricao: string;
  mode: string;
  cor: string;
}

export interface KiloState {
  descobertoEm: string;
  worktrees: KiloWorktree[];
  sessoes: KiloSession[];
  agentes: KiloAgentDef[];
}

export type KiloSessaoStatus = 'ATIVA' | 'OFFLINE' | 'UNKNOWN_SESSION';

export interface ReconcilacaoResultado {
  sessoesNovas: KiloSession[];
  sessoesDesconhecidas: KiloSession[];
  sessoesAgenteMapSemKilo: string[];
}
