import { AuditoriaService } from './AuditoriaService';
import { FileService } from '../arquivos/FileService';
import { ResultadoOperacao } from '../tipos';

export type FaseProjeto =
  | 'fase-1-planejamento'
  | 'fase-2-viabilidade'
  | 'fase-3-requisitos'
  | 'fase-4-design-contratos'
  | 'fase-5-design-uxui'
  | 'fase-6-banco-dados'
  | 'fase-7-implementacao'
  | 'fase-8-testes'
  | 'fase-9-devsecops'
  | 'fase-10-deploy'
  | 'fase-11-documentacao';

export interface DefinicaoFase {
  ordem: number;
  nome: string;
  responsavel: string;
  descricao: string;
  entrada: FaseProjeto[];
  saida: FaseProjeto[];
  criteriosEntrada: string[];
  criteriosSaida: string[];
}

export interface EstadoFase {
  faseAtual: FaseProjeto;
  status: FaseStatus;
  historico: { fase: FaseProjeto; status: FaseStatus; inicio: string; fim?: string; aprovadoPor?: string; handoff?: string }[];
  bloqueada: boolean;
  motivoBloqueio?: string;
}

export type FaseStatus =
  | 'pending'
  | 'active'
  | 'checkpoint'
  | 'approved'
  | 'completed'
  | 'failed'
  | 'blocked';

export const FASES: DefinicaoFase[] = [
  {
    ordem: 1,
    nome: 'Planejamento de Projeto',
    responsavel: 'planejador',
    descricao: 'Definir objetivo, escopo, cronograma, riscos e RACI.',
    entrada: [],
    saida: ['fase-2-viabilidade'],
    criteriosEntrada: [],
    criteriosSaida: ['project-charter-aprovado', 'cronograma-definido', 'riscos-mapeados']
  },
  {
    ordem: 2,
    nome: 'Analise de Viabilidade',
    responsavel: 'viabilidade',
    descricao: 'Avaliar viabilidade tecnica, economica e operacional.',
    entrada: ['fase-1-planejamento'],
    saida: ['fase-3-requisitos'],
    criteriosEntrada: ['project-charter-aprovado', 'cronograma-definido'],
    criteriosSaida: ['viabilidade-tecnica-aprovada', 'viabilidade-economica-aprovada', 'decisao-go-no-go']
  },
  {
    ordem: 3,
    nome: 'Requisitos',
    responsavel: 'requisitos',
    descricao: 'Levantar, documentar e validar requisitos funcionais e nao-funcionais.',
    entrada: ['fase-2-viabilidade'],
    saida: ['fase-4-design-contratos'],
    criteriosEntrada: ['decisao-go-no-go'],
    criteriosSaida: ['srs-aprovado', 'user-stories-prontas', 'acceptance-criteria-definidos']
  },
  {
    ordem: 4,
    nome: 'Design e Contratos',
    responsavel: 'designcontratos',
    descricao: 'Definir arquitetura, HLD, LLD, contratos e schemas.',
    entrada: ['fase-3-requisitos'],
    saida: ['fase-5-design-uxui', 'fase-6-banco-dados'],
    criteriosEntrada: ['srs-aprovado'],
    criteriosSaida: ['hld-aprovado', 'lld-aprovado', 'contratos-versionados']
  },
  {
    ordem: 5,
    nome: 'Design UX/UI',
    responsavel: 'uxui',
    descricao: 'Criar design system, wireframes, mockups e prototipos.',
    entrada: ['fase-4-design-contratos'],
    saida: ['fase-6-banco-dados'],
    criteriosEntrada: ['hld-aprovado'],
    criteriosSaida: ['design-system-definido', 'wireframes-aprovados', 'protopipos-validados']
  },
  {
    ordem: 6,
    nome: 'Banco de Dados',
    responsavel: 'bancodados',
    descricao: 'Modelar dados, criar scripts DDL e validar schema.',
    entrada: ['fase-4-design-contratos', 'fase-5-design-uxui'],
    saida: ['fase-7-implementacao'],
    criteriosEntrada: ['hld-aprovado', 'design-system-definido'],
    criteriosSaida: ['modelo-conceitual-aprovado', 'modelo-logico-aprovado', 'scripts-ddl-prontos']
  },
  {
    ordem: 7,
    nome: 'Arquitetura e Implementacao',
    responsavel: 'arquiteturaimpl',
    descricao: 'Implementar codigo, revisar e garantir CI passing.',
    entrada: ['fase-6-banco-dados'],
    saida: ['fase-8-testes'],
    criteriosEntrada: ['scripts-ddl-prontos'],
    criteriosSaida: ['codigo-revisado', 'ci-passing', 'code-review-aprovado']
  },
  {
    ordem: 8,
    nome: 'Testes e Qualidade',
    responsavel: 'testesqualidade',
    descricao: 'Executar testes automatizados, UAT e validar qualidade.',
    entrada: ['fase-7-implementacao'],
    saida: ['fase-9-devsecops'],
    criteriosEntrada: ['code-review-aprovado', 'ci-passing'],
    criteriosSaida: ['testes-passing', 'uat-signoff', 'sem-bugs-criticos']
  },
  {
    ordem: 9,
    nome: 'DevSecOps / Seguranca',
    responsavel: 'devsecops',
    descricao: 'Aplicar SAST/DAST, threat model e security sign-off.',
    entrada: ['fase-8-testes'],
    saida: ['fase-10-deploy'],
    criteriosEntrada: ['testes-passing'],
    criteriosSaida: ['sast-dast-clean', 'threat-model-aprovado', 'security-signoff']
  },
  {
    ordem: 10,
    nome: 'Deploy e Infraestrutura',
    responsavel: 'deployinfra',
    descricao: 'Preparar deploy, pipelines, rollback e monitoring.',
    entrada: ['fase-9-devsecops'],
    saida: ['fase-11-documentacao'],
    criteriosEntrada: ['security-signoff'],
    criteriosSaida: ['deploy-producao', 'monitoring-ativo', 'rollback-testado']
  },
  {
    ordem: 11,
    nome: 'Documentacao e Manutencao',
    responsavel: 'docsmantencao',
    descricao: 'Documentar ADRs, OpenAPI, runbooks e BC plan.',
    entrada: ['fase-10-deploy'],
    saida: [],
    criteriosEntrada: ['deploy-producao'],
    criteriosSaida: ['adrs-escritos', 'openapi-atualizado', 'runbooks-disponiveis', 'bc-plan-definido']
  }
];

const FASES_MAP = new Map<FaseProjeto, DefinicaoFase>();
for (const fase of FASES) {
  FASES_MAP.set(fase.nome.toLowerCase() as FaseProjeto, fase);
}

export class PhaseStateMachine {
  private estadoPath: string;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    readonly projetoId: string,
    readonly projetoNome: string
  ) {
    this.estadoPath = '.ia/estado/estado-fases.json';
    this.recarregar();
  }

  private transicoes: Record<FaseProjeto, FaseProjeto[]> = {
    'fase-1-planejamento': ['fase-2-viabilidade'],
    'fase-2-viabilidade': ['fase-3-requisitos'],
    'fase-3-requisitos': ['fase-4-design-contratos'],
    'fase-4-design-contratos': ['fase-5-design-uxui', 'fase-6-banco-dados'],
    'fase-5-design-uxui': ['fase-6-banco-dados'],
    'fase-6-banco-dados': ['fase-7-implementacao'],
    'fase-7-implementacao': ['fase-8-testes'],
    'fase-8-testes': ['fase-9-devsecops'],
    'fase-9-devsecops': ['fase-10-deploy'],
    'fase-10-deploy': ['fase-11-documentacao'],
    'fase-11-documentacao': []
  };

  private recarregar(): void {
    const result = this.fs.lerJson<{ transicoes?: Record<FaseProjeto, FaseProjeto[]> }>(this.estadoPath);
    if (result.sucesso && result.dados?.transicoes) {
      this.transicoes = result.dados.transicoes;
    }
  }

  carregarEstado(): ResultadoOperacao<EstadoFase> {
    const result = this.fs.lerJson<EstadoFase>(this.estadoPath);
    if (result.sucesso && result.dados) {
      return { sucesso: true, dados: result.dados };
    }

    const estadoInicial: EstadoFase = {
      faseAtual: 'fase-1-planejamento',
      status: 'pending',
      historico: [{ fase: 'fase-1-planejamento', status: 'pending', inicio: new Date().toISOString() }],
      bloqueada: false
    };

    const writeResult = this.fs.escreverJson(this.estadoPath, estadoInicial, { backup: true });
    if (!writeResult.sucesso) {
      return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    }

    this.auditoria.registrar('FASE_CRIADA', `Estado de fases inicializado para projeto ${this.projetoNome}`, {
      projetoId: this.projetoId,
      fase: 'fase-1-planejamento'
    });

    return { sucesso: true, dados: estadoInicial };
  }

  obterDefinicao(fase: FaseProjeto): DefinicaoFase | undefined {
    return FASES_MAP.get(fase);
  }

  obterFaseAtual(): ResultadoOperacao<FaseProjeto> {
    const estadoResult = this.carregarEstado();
    if (!estadoResult.sucesso || !estadoResult.dados) {
      return { sucesso: false, erro: estadoResult.erro || 'Erro ao ler estado de fases', codigoErro: estadoResult.codigoErro };
    }
    return { sucesso: true, dados: estadoResult.dados.faseAtual };
  }

  avancar(criteriosSaidaCumpridos: string[] = []): ResultadoOperacao<EstadoFase> {
    const estadoResult = this.carregarEstado();
    if (!estadoResult.sucesso || !estadoResult.dados) {
      return { sucesso: false, erro: estadoResult.erro || 'Erro ao ler estado de fases', codigoErro: estadoResult.codigoErro };
    }

    const estado = estadoResult.dados;

    if (estado.bloqueada) {
      return {
        sucesso: false,
        erro: `Fase bloqueada: ${estado.motivoBloqueio || 'motivo desconhecido'}`,
        codigoErro: 'PHASE_BLOCKED'
      };
    }

    const definicao = FASES_MAP.get(estado.faseAtual);
    if (!definicao) {
      return { sucesso: false, erro: `Definição não encontrada para fase ${estado.faseAtual}`, codigoErro: 'PHASE_DEFINITION_NOT_FOUND' };
    }

    if (definicao.saida.length === 0) {
      return {
        sucesso: false,
        erro: `Fase ${estado.faseAtual} não possui próxima fase definida`,
        codigoErro: 'PHASE_ALREADY_FINAL'
      };
    }

    const faltando = definicao.criteriosSaida.filter((c) => !criteriosSaidaCumpridos.includes(c));
    if (faltando.length > 0) {
      return {
        sucesso: false,
        erro: `Critérios de saída não cumpridos: ${faltando.join(', ')}`,
        codigoErro: 'PHASE_EXIT_CRITERIA_NOT_MET'
      };
    }

    const proximaFase = definicao.saida[0];
    const agora = new Date().toISOString();
    estado.faseAtual = proximaFase;
    estado.status = 'active';
    estado.historico.push({ fase: proximaFase, status: 'active', inicio: agora });

    const writeResult = this.fs.escreverJson(this.estadoPath, estado, { backup: true });
    if (!writeResult.sucesso) {
      return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    }

    this.auditoria.registrar('FASE_AVANCADA', `Fase avançada: ${definicao.nome} -> ${FASES_MAP.get(proximaFase)?.nome || proximaFase}`, {
      projetoId: this.projetoId,
      faseAnterior: definicao.nome,
      faseNova: proximaFase,
      criteriosSaida: criteriosSaidaCumpridos
    });

    return { sucesso: true, dados: estado };
  }

  bloquear(motivo: string): ResultadoOperacao<EstadoFase> {
    const estadoResult = this.carregarEstado();
    if (!estadoResult.sucesso || !estadoResult.dados) {
      return { sucesso: false, erro: estadoResult.erro || 'Erro ao ler estado de fases', codigoErro: estadoResult.codigoErro };
    }

    const estado = estadoResult.dados;
    estado.bloqueada = true;
    estado.motivoBloqueio = motivo;

    const writeResult = this.fs.escreverJson(this.estadoPath, estado, { backup: true });
    if (!writeResult.sucesso) {
      return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    }

    this.auditoria.registrar('FASE_BLOQUEADA', `Fase bloqueada: ${estado.faseAtual}`, {
      projetoId: this.projetoId,
      fase: estado.faseAtual,
      motivo
    });

    return { sucesso: true, dados: estado };
  }

  desbloquear(): ResultadoOperacao<EstadoFase> {
    const estadoResult = this.carregarEstado();
    if (!estadoResult.sucesso || !estadoResult.dados) {
      return { sucesso: false, erro: estadoResult.erro || 'Erro ao ler estado de fases', codigoErro: estadoResult.codigoErro };
    }

    const estado = estadoResult.dados;
    estado.bloqueada = false;
    estado.motivoBloqueio = undefined;

    const writeResult = this.fs.escreverJson(this.estadoPath, estado, { backup: true });
    if (!writeResult.sucesso) {
      return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    }

    this.auditoria.registrar('FASE_DESBLOQUEADA', `Fase desbloqueada: ${estado.faseAtual}`, {
      projetoId: this.projetoId,
      fase: estado.faseAtual
    });

    return { sucesso: true, dados: estado };
  }

  listarFases(): DefinicaoFase[] {
    return FASES;
  }
}
