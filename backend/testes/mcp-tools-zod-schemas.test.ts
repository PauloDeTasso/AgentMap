import * as z from 'zod';

const projectSchema = z.object({ nome: z.string(), caminhoParental: z.string(), descricao: z.string() });

describe('MCP tools Zod schemas - projetos', () => {
  test('agentmap_projetos_criar input válido', () => {
    const input = { nome: 'P1', caminhoParental: '/tmp', descricao: 'd' };
    expect(() => projectSchema.parse(input)).not.toThrow();
  });

  test('agentmap_projetos_criar input inválido - nome faltando', () => {
    const input = { caminhoParental: '/tmp', descricao: 'd' };
    expect(() => projectSchema.parse(input)).toThrow();
  });

  test('agentmap_projetos_criar input inválido - tipos errados', () => {
    const input = { nome: 123, caminhoParental: '/tmp', descricao: 'd' };
    expect(() => projectSchema.parse(input)).toThrow();
  });
});

const taskSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  objetivo: z.string(),
  tipo: z.string(),
  estado: z.string(),
  prioridade: z.string(),
  agenteResponsavel: z.string(),
  dominio: z.string(),
  ambiente: z.string(),
  dependencias: z.array(z.string()),
  contratosObrigatorios: z.array(z.string()),
  procedimentosObrigatorios: z.array(z.string()),
  arquivosPermitidos: z.array(z.string()),
  arquivosProibidos: z.array(z.string()),
  contextoNecessario: z.array(z.string()),
  criteriosAceitacao: z.array(z.string()),
  testesObrigatorios: z.array(z.string()),
  riscos: z.array(z.string()),
  restricoes: z.array(z.string()),
  condicoesDeParada: z.array(z.string()),
  criteriosConclusao: z.array(z.string()),
  estimativaHoras: z.number().optional(),
  dataLimite: z.string().optional(),
  tags: z.array(z.string()).optional(),
  resultado: z.object({
    resumo: z.string(),
    arquivosAlterados: z.array(z.string()),
    testesExecutados: z.array(z.string()),
    testesAprovados: z.array(z.string()),
    riscosEncontrados: z.array(z.string()),
    pendencias: z.array(z.string()),
    observacoes: z.string(),
    commit: z.string()
  }),
  aprovacao: z.object({
    necessaria: z.boolean(),
    estado: z.string(),
    aprovador: z.string(),
    dataAprovacao: z.string().optional()
  })
}).passthrough();

describe('MCP tools Zod schemas - tarefas', () => {
  test('agentmap_tarefas_obter output schema - válido', () => {
    const output = {
      id: 'T-1',
      titulo: 'T1',
      descricao: 'd',
      objetivo: 'o',
      tipo: 'dev',
      estado: 'RASCUNHO',
      prioridade: 'MEDIA',
      agenteResponsavel: 'ag',
      dominio: 'fe',
      ambiente: 'dev',
      dependencias: [],
      contratosObrigatorios: [],
      procedimentosObrigatorios: [],
      arquivosPermitidos: [],
      arquivosProibidos: [],
      contextoNecessario: [],
      criteriosAceitacao: [],
      testesObrigatorios: [],
      riscos: [],
      restricoes: [],
      condicoesDeParada: [],
      criteriosConclusao: [],
      estimativaHoras: 1,
      dataLimite: '2026-01-01',
      tags: ['a'],
      resultado: { resumo: '', arquivosAlterados: [], testesExecutados: [], testesAprovados: [], riscosEncontrados: [], pendencias: [], observacoes: '', commit: '' },
      aprovacao: { necessaria: true, estado: 'PENDENTE', aprovador: 'r', dataAprovacao: '2026-01-01' }
    };
    expect(() => taskSchema.parse(output)).not.toThrow();
  });

  test('agentmap_tarefas_obter output schema - campo extra permitido (passthrough)', () => {
    const output = {
      id: 'T-1',
      titulo: 'T1',
      descricao: 'd',
      objetivo: 'o',
      tipo: 'dev',
      estado: 'RASCUNHO',
      prioridade: 'MEDIA',
      agenteResponsavel: 'ag',
      dominio: 'fe',
      ambiente: 'dev',
      dependencias: [],
      contratosObrigatorios: [],
      procedimentosObrigatorios: [],
      arquivosPermitidos: [],
      arquivosProibidos: [],
      contextoNecessario: [],
      criteriosAceitacao: [],
      testesObrigatorios: [],
      riscos: [],
      restricoes: [],
      condicoesDeParada: [],
      criteriosConclusao: [],
      estimativaHoras: 1,
      dataLimite: '2026-01-01',
      tags: ['a'],
      resultado: { resumo: '', arquivosAlterados: [], testesExecutados: [], testesAprovados: [], riscosEncontrados: [], pendencias: [], observacoes: '', commit: '' },
      aprovacao: { necessaria: true, estado: 'PENDENTE', aprovador: 'r', dataAprovacao: '2026-01-01' },
      campoExtra: 'permitido'
    };
    expect(() => taskSchema.parse(output)).not.toThrow();
  });

  test('agentmap_tarefas_obter output schema - tipo errado', () => {
    const output = {
      id: 123,
      titulo: 'T1',
      descricao: 'd',
      objetivo: 'o',
      tipo: 'dev',
      estado: 'RASCUNHO',
      prioridade: 'MEDIA',
      agenteResponsavel: 'ag',
      dominio: 'fe',
      ambiente: 'dev',
      dependencias: [],
      contratosObrigatorios: [],
      procedimentosObrigatorios: [],
      arquivosPermitidos: [],
      arquivosProibidos: [],
      contextoNecessario: [],
      criteriosAceitacao: [],
      testesObrigatorios: [],
      riscos: [],
      restricoes: [],
      condicoesDeParada: [],
      criteriosConclusao: []
    };
    expect(() => taskSchema.parse(output)).toThrow();
  });
});

const solicitacaoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  agenteSolicitante: z.object({ id: z.string() }),
  agenteResponsavel: z.object({ id: z.string().nullable() }),
  alvo: z.object({
    tipo: z.string(),
    nome: z.string(),
    identificador: z.string().nullable(),
    localizacao: z.string().nullable()
  }),
  alteracao: z.object({
    tipo: z.string(),
    descricao: z.string(),
    motivo: z.string(),
    arquivosAfetados: z.array(z.string())
  }),
  impactos: z.array(z.string()),
  dependencias: z.array(z.string()),
  prioridade: z.string(),
  status: z.string(),
  requerAprovacao: z.boolean(),
  aprovacao: z.object({
    status: z.string(),
    agenteId: z.string().nullable(),
    data: z.string().nullable(),
    observacao: z.string().nullable()
  }),
  tarefaOrigem: z.object({ id: z.string() }).nullable(),
  datas: z.object({
    criadaEm: z.string().nullable(),
    atualizadaEm: z.string().nullable(),
    concluidaEm: z.string().nullable()
  }),
  observacoes: z.string().nullable()
}).passthrough();

describe('MCP tools Zod schemas - solicitacoes', () => {
  test('agentmap_solicitacoes_obter output schema - válido', () => {
    const output = {
      id: 'SOL-1',
      titulo: 'S1',
      descricao: 'd',
      agenteSolicitante: { id: 'ag1' },
      agenteResponsavel: { id: null },
      alvo: { tipo: 't', nome: 'n', identificador: null, localizacao: null },
      alteracao: { tipo: 't', descricao: 'd', motivo: 'm', arquivosAfetados: [] },
      impactos: [],
      dependencias: [],
      prioridade: 'ALTA',
      status: 'PENDENTE',
      requerAprovacao: true,
      aprovacao: { status: 'PENDENTE', agenteId: null, data: null, observacao: null },
      tarefaOrigem: { id: 'T-1' },
      datas: { criadaEm: '2026-01-01', atualizadaEm: null, concluidaEm: null },
      observacoes: null
    };
    expect(() => solicitacaoSchema.parse(output)).not.toThrow();
  });

  test('agentmap_solicitacoes_obter output schema - nulls permitidos', () => {
    const output = {
      id: 'SOL-1',
      titulo: 'S1',
      descricao: 'd',
      agenteSolicitante: { id: 'ag1' },
      agenteResponsavel: { id: null },
      alvo: { tipo: 't', nome: 'n', identificador: null, localizacao: null },
      alteracao: { tipo: 't', descricao: 'd', motivo: 'm', arquivosAfetados: [] },
      impactos: [],
      dependencias: [],
      prioridade: 'ALTA',
      status: 'PENDENTE',
      requerAprovacao: true,
      aprovacao: { status: 'PENDENTE', agenteId: null, data: null, observacao: null },
      tarefaOrigem: null,
      datas: { criadaEm: null, atualizadaEm: null, concluidaEm: null },
      observacoes: null
    };
    expect(() => solicitacaoSchema.parse(output)).not.toThrow();
  });

  test('agentmap_solicitacoes_obter output schema - tipo errado em campo obrigatório', () => {
    const output = {
      id: 'SOL-1',
      titulo: 123,
      descricao: 'd',
      agenteSolicitante: { id: 'ag1' },
      agenteResponsavel: { id: null },
      alvo: { tipo: 't', nome: 'n', identificador: null, localizacao: null },
      alteracao: { tipo: 't', descricao: 'd', motivo: 'm', arquivosAfetados: [] },
      impactos: [],
      dependencias: [],
      prioridade: 'ALTA',
      status: 'PENDENTE',
      requerAprovacao: true,
      aprovacao: { status: 'PENDENTE', agenteId: null, data: null, observacao: null },
      tarefaOrigem: { id: 'T-1' },
      datas: { criadaEm: '2026-01-01', atualizadaEm: null, concluidaEm: null },
      observacoes: null
    };
    expect(() => solicitacaoSchema.parse(output)).toThrow();
  });
});

const handoffSchema = z.object({
  id: z.string(),
  origem: z.string(),
  destino: z.string(),
  tarefaId: z.string().nullable(),
  resumo: z.string(),
  concluido: z.array(z.string()),
  pendente: z.array(z.string()),
  artefatos: z.array(z.string()),
  decisoes: z.array(z.string()),
  alteracoes: z.array(z.string()),
  riscos: z.array(z.string()),
  bloqueios: z.array(z.string()),
  observacoes: z.string().nullable(),
  estado: z.string(),
  datas: z.object({
    criadaEm: z.string().nullable(),
    criacao: z.string().nullable(),
    aceitaEm: z.string().nullable(),
    concluidaEm: z.string().nullable()
  })
}).passthrough();

describe('MCP tools Zod schemas - handoffs', () => {
  test('agentmap_handoffs_obter output schema - válido', () => {
    const output = {
      id: 'HOF-1',
      origem: 'backend',
      destino: 'frontend',
      tarefaId: null,
      resumo: 'r',
      concluido: [],
      pendente: [],
      artefatos: [],
      decisoes: [],
      alteracoes: [],
      riscos: [],
      bloqueios: [],
      observacoes: null,
      estado: 'PENDENTE',
      datas: { criadaEm: null, criacao: null, aceitaEm: null, concluidaEm: null }
    };
    expect(() => handoffSchema.parse(output)).not.toThrow();
  });

  test('agentmap_handoffs_obter output schema - array vazio permitido', () => {
    const output = {
      id: 'HOF-1',
      origem: 'backend',
      destino: 'frontend',
      tarefaId: 'T-1',
      resumo: 'r',
      concluido: ['item'],
      pendente: [],
      artefatos: ['a'],
      decisoes: [],
      alteracoes: ['alt'],
      riscos: ['r'],
      bloqueios: [],
      observacoes: 'obs',
      estado: 'PENDENTE',
      datas: { criadaEm: '2026-01-01', criacao: '2026-01-01', aceitaEm: null, concluidaEm: null }
    };
    expect(() => handoffSchema.parse(output)).not.toThrow();
  });

  test('agentmap_handoffs_obter output schema - string onde array esperado', () => {
    const output = {
      id: 'HOF-1',
      origem: 'backend',
      destino: 'frontend',
      tarefaId: null,
      resumo: 'r',
      concluido: 'nao-eh-array',
      pendente: [],
      artefatos: [],
      decisoes: [],
      alteracoes: [],
      riscos: [],
      bloqueios: [],
      observacoes: null,
      estado: 'PENDENTE',
      datas: { criadaEm: null, criacao: null, aceitaEm: null, concluidaEm: null }
    };
    expect(() => handoffSchema.parse(output)).toThrow();
  });
});

const agenteSchema = z.object({
  id: z.string(),
  nome: z.string(),
  funcao: z.string(),
  descricao: z.string(),
  estado: z.string(),
  responsabilidades: z.array(z.string()).optional(),
  objetivos: z.array(z.string()).optional(),
  conhecimentos: z.array(z.string()).optional(),
  dominios: z.array(z.string()).optional(),
  diretoriosPermitidos: z.array(z.string()),
  diretoriosProibidos: z.array(z.string()),
  contratosObrigatorios: z.array(z.string()),
  procedimentosObrigatorios: z.array(z.string()).optional(),
  permissoes: z.object({
    ler: z.boolean(),
    criar: z.boolean(),
    alterar: z.boolean(),
    excluir: z.boolean(),
    executar: z.boolean(),
    testar: z.boolean(),
    revisar: z.boolean(),
    aprovar: z.boolean(),
    implantar: z.boolean()
  }),
  ferramentasPermitidas: z.array(z.string()).optional(),
  comandosPermitidos: z.array(z.string()).optional(),
  comandosProibidos: z.array(z.string()).optional(),
  ambientesPermitidos: z.array(z.string()),
  requerAprovacaoPara: z.array(z.string()).optional(),
  condicoesDeParada: z.array(z.string()).optional(),
  criteriosDeQualidade: z.array(z.string()).optional(),
  criteriosDeConclusao: z.array(z.string()).optional(),
  protocoloDeEntrega: z.object({
    exigeResumo: z.boolean(),
    exigeArquivosAlterados: z.boolean(),
    exigeTestes: z.boolean(),
    exigeRiscos: z.boolean(),
    exigePendencias: z.boolean()
  }).optional(),
  linguagemPreferida: z.string().optional(),
  modelo: z.object({
    provedor: z.string(),
    nome: z.string(),
    modo: z.string(),
    limiteContexto: z.number()
  }).optional(),
  datas: z.object({
    criacao: z.string().nullable(),
    ultimaAtualizacao: z.string().nullable()
  })
}).passthrough();

describe('MCP tools Zod schemas - agentes', () => {
  test('agentmap_agentes_obter output schema - válido', () => {
    const output = {
      id: 'ag1',
      nome: 'Ag1',
      funcao: 'dev',
      descricao: 'd',
      estado: 'ativo',
      diretoriosPermitidos: ['/a/**'],
      diretoriosProibidos: ['/b/**'],
      contratosObrigatorios: ['c1'],
      permissoes: { ler: true, criar: true, alterar: true, excluir: true, executar: true, testar: true, revisar: false, aprovar: false, implantar: false },
      ambientesPermitidos: ['dev'],
      datas: { criacao: '2026-01-01', ultimaAtualizacao: '2026-01-01' }
    };
    expect(() => agenteSchema.parse(output)).not.toThrow();
  });

  test('agentmap_agentes_obter output schema - campos opcionais ausentes', () => {
    const output = {
      id: 'ag1',
      nome: 'Ag1',
      funcao: 'dev',
      descricao: 'd',
      estado: 'ativo',
      diretoriosPermitidos: ['/a/**'],
      diretoriosProibidos: ['/b/**'],
      contratosObrigatorios: ['c1'],
      permissoes: { ler: true, criar: true, alterar: true, excluir: true, executar: true, testar: true, revisar: false, aprovar: false, implantar: false },
      ambientesPermitidos: ['dev'],
      datas: { criacao: '2026-01-01', ultimaAtualizacao: '2026-01-01' }
    };
    expect(() => agenteSchema.parse(output)).not.toThrow();
  });

  test('agentmap_agentes_obter output schema - boolean onde number esperado', () => {
    const output = {
      id: 'ag1',
      nome: 'Ag1',
      funcao: 'dev',
      descricao: 'd',
      estado: 'ativo',
      diretoriosPermitidos: ['/a/**'],
      diretoriosProibidos: ['/b/**'],
      contratosObrigatorios: ['c1'],
      permissoes: { ler: true, criar: true, alterar: true, excluir: true, executar: true, testar: true, revisar: false, aprovar: false, implantar: false },
      ambientesPermitidos: ['dev'],
      datas: { criacao: '2026-01-01', ultimaAtualizacao: '2026-01-01' },
      modelo: { provedor: 'p', nome: 'n', modo: 'm', limiteContexto: 'texto' }
    };
    expect(() => agenteSchema.parse(output)).toThrow();
  });
});

const eventoSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  origem: z.string(),
  destino: z.string(),
  referenciaTipo: z.string(),
  referenciaId: z.string(),
  mensagem: z.string(),
  estado: z.string(),
  datas: z.object({
    criadoEm: z.string().nullable(),
    criacao: z.string().nullable(),
    consumidoEm: z.string().nullable()
  })
}).passthrough();

describe('MCP tools Zod schemas - eventos', () => {
  test('agentmap_eventos_confirmar output schema - válido', () => {
    const output = {
      id: 'EVT-1',
      tipo: 'HANDOFF_CRIADO',
      origem: 'backend',
      destino: 'frontend',
      referenciaTipo: 'handoff',
      referenciaId: 'HOF-1',
      mensagem: 'm',
      estado: 'PENDENTE',
      datas: { criadoEm: '2026-01-01', criacao: '2026-01-01', consumidoEm: null }
    };
    expect(() => eventoSchema.parse(output)).not.toThrow();
  });

  test('agentmap_eventos_confirmar output schema - null em datas', () => {
    const output = {
      id: 'EVT-1',
      tipo: 'HANDOFF_CRIADO',
      origem: 'backend',
      destino: 'frontend',
      referenciaTipo: 'handoff',
      referenciaId: 'HOF-1',
      mensagem: 'm',
      estado: 'PENDENTE',
      datas: { criadoEm: null, criacao: null, consumidoEm: null }
    };
    expect(() => eventoSchema.parse(output)).not.toThrow();
  });
});

const bloqueioSchema = z.object({
  id: z.string(),
  tarefaId: z.string(),
  tipo: z.string(),
  gravidade: z.string(),
  descricao: z.string(),
  origem: z.string(),
  responsavelResolucao: z.string(),
  estado: z.string(),
  criadoEm: z.string(),
  resolvidoEm: z.string().nullable()
}).passthrough();

describe('MCP tools Zod schemas - bloqueios', () => {
  test('agentmap_bloqueios_obter output schema - válido', () => {
    const output = {
      id: 'BLK-1',
      tarefaId: 'T-1',
      tipo: 't',
      gravidade: 'ALTA',
      descricao: 'd',
      origem: 'backend',
      responsavelResolucao: 'r',
      estado: 'ABERTO',
      criadoEm: '2026-01-01',
      resolvidoEm: null
    };
    expect(() => bloqueioSchema.parse(output)).not.toThrow();
  });

  test('agentmap_bloqueios_obter output schema - resolvidoEm preenchido', () => {
    const output = {
      id: 'BLK-1',
      tarefaId: 'T-1',
      tipo: 't',
      gravidade: 'ALTA',
      descricao: 'd',
      origem: 'backend',
      responsavelResolucao: 'r',
      estado: 'RESOLVIDO',
      criadoEm: '2026-01-01',
      resolvidoEm: '2026-01-02'
    };
    expect(() => bloqueioSchema.parse(output)).not.toThrow();
  });
});

const monitoramentoSchema = z.object({
  temNovidades: z.boolean(),
  ultimoEventSequence: z.number().int().nonnegative(),
  mensagens: z.array(z.object({
    id: z.string(),
    eventSequence: z.number().int().nonnegative(),
    tipo: z.string(),
    emissor: z.string(),
    agenteId: z.string().nullable(),
    tarefaId: z.string().nullable(),
    conteudo: z.string(),
    timestamp: z.string()
  }))
}).passthrough();

describe('MCP tools Zod schemas - monitoramento', () => {
  test('agentmap_monitoramento_verificar_pendentes output schema - válido', () => {
    const output = {
      temNovidades: true,
      ultimoEventSequence: 0,
      mensagens: []
    };
    expect(() => monitoramentoSchema.parse(output)).not.toThrow();
  });

  test('agentmap_monitoramento_verificar_pendentes output schema - mensagens preenchidas', () => {
    const output = {
      temNovidades: true,
      ultimoEventSequence: 5,
      mensagens: [
        {
          id: 'MSG-1',
          eventSequence: 5,
          tipo: 'KILO_CHAT',
          emissor: 'backend',
          agenteId: 'ag1',
          tarefaId: null,
          conteudo: 'hello',
          timestamp: '2026-01-01T00:00:00.000Z'
        }
      ]
    };
    expect(() => monitoramentoSchema.parse(output)).not.toThrow();
  });

  test('agentmap_monitoramento_verificar_pendentes output schema - eventSequence negativo inválido', () => {
    const output = {
      temNovidades: false,
      ultimoEventSequence: -1,
      mensagens: []
    };
    expect(() => monitoramentoSchema.parse(output)).toThrow();
  });

  test('agentmap_monitoramento_verificar_pendentes input schema - limite inválido', () => {
    const inputSchema = z.object({
      aposEventSequence: z.number().int().nonnegative().optional(),
      limite: z.number().int().positive().max(100).optional()
    });
    expect(() => inputSchema.parse({ aposEventSequence: -1 })).toThrow();
    expect(() => inputSchema.parse({ limite: 0 })).toThrow();
    expect(() => inputSchema.parse({ limite: 101 })).toThrow();
    expect(() => inputSchema.parse({})).not.toThrow();
  });
});

const workflowSchema = z.object({
  pendencias: z.array(z.unknown()),
  handoffs: z.array(z.unknown()),
  validacoes: z.array(z.unknown()),
  bloqueios: z.array(z.unknown())
}).passthrough();

describe('MCP tools Zod schemas - workflows', () => {
  test('agentmap_workflows_consultar_pendencias output schema - válido', () => {
    const output = {
      pendencias: [],
      handoffs: [],
      validacoes: [],
      bloqueios: []
    };
    expect(() => workflowSchema.parse(output)).not.toThrow();
  });

  test('agentmap_workflows_consultar_pendencias output schema - objetos preenchidos', () => {
    const output = {
      pendencias: [{ id: 'P-1' }],
      handoffs: [{ id: 'H-1' }],
      validacoes: [{ id: 'V-1' }],
      bloqueios: [{ id: 'B-1' }]
    };
    expect(() => workflowSchema.parse(output)).not.toThrow();
  });

  test('agentmap_workflows_consultar_pendencias output schema - tipo errado', () => {
    const output = {
      pendencias: 'nao-eh-array',
      handoffs: [],
      validacoes: [],
      bloqueios: []
    };
    expect(() => workflowSchema.parse(output)).toThrow();
  });
});

const arquivoSchema = z.object({
  caminho: z.string(),
  nome: z.string(),
  tipo: z.string(),
  tamanho: z.number(),
  modificadoEm: z.string(),
  extensao: z.string()
}).passthrough();

describe('MCP tools Zod schemas - arquivos', () => {
  test('agentmap_arquivos_listar output schema - válido', () => {
    const output = {
      caminho: '/a/b',
      nome: 'f.txt',
      tipo: 'file',
      tamanho: 100,
      modificadoEm: '2026-01-01',
      extensao: 'txt'
    };
    expect(() => arquivoSchema.parse(output)).not.toThrow();
  });

  test('agentmap_arquivos_listar output schema - número negativo permitido pelo schema (z.number)', () => {
    const output = {
      caminho: '/a/b',
      nome: 'f.txt',
      tipo: 'file',
      tamanho: -1,
      modificadoEm: '2026-01-01',
      extensao: 'txt'
    };
    expect(() => arquivoSchema.parse(output)).not.toThrow();
  });

  test('agentmap_arquivos_listar output schema - string vazia permitida pelo schema (z.string)', () => {
    const output = {
      caminho: '/a/b',
      nome: '',
      tipo: 'file',
      tamanho: 100,
      modificadoEm: '2026-01-01',
      extensao: 'txt'
    };
    expect(() => arquivoSchema.parse(output)).not.toThrow();
  });
});

const contextoProjetoSchema = z.object({
  identidade: z.object({
    projetoId: z.string(),
    nome: z.string(),
    versao: z.string()
  }),
  contratos: z.array(z.unknown()),
  tarefa: z.unknown(),
  estado: z.unknown(),
  dependencias: z.array(z.unknown()),
  arquivosRelevantes: z.array(z.object({
    caminho: z.string(),
    conteudo: z.string()
  })),
  decisoes: z.array(z.unknown()),
  restricoes: z.array(z.string()),
  criteriosAceitacao: z.array(z.string()),
  agente: z.unknown().nullable()
}).passthrough();

describe('MCP tools Zod schemas - contexto', () => {
  test('agentmap_tarefas_contexto output schema - válido', () => {
    const output = {
      identidade: { projetoId: 'P1', nome: 'P1', versao: '1.0.0' },
      contratos: [],
      tarefa: {},
      estado: {},
      dependencias: [],
      arquivosRelevantes: [],
      decisoes: [],
      restricoes: [],
      criteriosAceitacao: [],
      agente: null
    };
    expect(() => contextoProjetoSchema.parse(output)).not.toThrow();
  });

  test('agentmap_tarefas_contexto output schema - arquivosRelevantes preenchidos', () => {
    const output = {
      identidade: { projetoId: 'P1', nome: 'P1', versao: '1.0.0' },
      contratos: [],
      tarefa: {},
      estado: {},
      dependencias: [],
      arquivosRelevantes: [{ caminho: '/a/b', conteudo: 'hello' }],
      decisoes: [],
      restricoes: ['r'],
      criteriosAceitacao: ['c'],
      agente: { id: 'ag1' }
    };
    expect(() => contextoProjetoSchema.parse(output)).not.toThrow();
  });

  test('agentmap_tarefas_contexto output schema - campo extra permitido', () => {
    const output = {
      identidade: { projetoId: 'P1', nome: 'P1', versao: '1.0.0' },
      contratos: [],
      tarefa: {},
      estado: {},
      dependencias: [],
      arquivosRelevantes: [],
      decisoes: [],
      restricoes: [],
      criteriosAceitacao: [],
      agente: null,
      extra: 'ok'
    };
    expect(() => contextoProjetoSchema.parse(output)).not.toThrow();
  });
});

const mapaProjetoSchema = z.object({
  projeto: z.record(z.string(), z.unknown()),
  agentes: z.array(z.unknown()),
  tarefas: z.array(z.unknown()),
  estado: z.unknown().nullable(),
  decisoes: z.array(z.unknown()),
  contratos: z.unknown().nullable(),
  permissoes: z.unknown().nullable()
}).passthrough();

describe('MCP tools Zod schemas - mapa projeto', () => {
  test('agentmap_workflows_obter_mapa_projeto output schema - válido', () => {
    const output = {
      projeto: {},
      agentes: [],
      tarefas: [],
      estado: null,
      decisoes: [],
      contratos: null,
      permissoes: null
    };
    expect(() => mapaProjetoSchema.parse(output)).not.toThrow();
  });

  test('agentmap_workflows_obter_mapa_projeto output schema - objetos complexos permitidos', () => {
    const output = {
      projeto: { nome: 'P1' },
      agentes: [{ id: 'ag1' }],
      tarefas: [{ id: 'T-1' }],
      estado: { atual: 'EM_DESENVOLVIMENTO' },
      decisoes: [{ id: 'D-1' }],
      contratos: { id: 'C-1' },
      permissoes: { admin: true }
    };
    expect(() => mapaProjetoSchema.parse(output)).not.toThrow();
  });
});
