import { FileService } from '../src/arquivos/FileService';
import { KiloAgentGeneratorService, TaskContext } from '../src/servicios/KiloAgentGeneratorService';

jest.mock('../src/arquivos/FileService');

const mockedFs = FileService as jest.MockedClass<typeof FileService>;

describe('KiloAgentGeneratorService', () => {
  let fsInstance: jest.Mocked<FileService>;
  let service: KiloAgentGeneratorService;

  beforeEach(() => {
    jest.clearAllMocks();
    fsInstance = {
      lerJson: jest.fn(() => ({ sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' })),
      escreverJson: jest.fn(() => ({ sucesso: true, dados: '' })),
      listar: jest.fn(() => ({ sucesso: true, dados: [] })),
      criarDiretorio: jest.fn(() => ({ sucesso: true, dados: '' })),
      existe: jest.fn(() => false),
      ler: jest.fn(() => ({ sucesso: true, dados: '{}' })),
      escrever: jest.fn(() => ({ sucesso: true, dados: '' })),
      excluir: jest.fn(() => ({ sucesso: true, dados: '' }))
    } as any;
    service = new KiloAgentGeneratorService(fsInstance);
  });

  const tarefaMock = {
    id: 'TAR-001',
    titulo: 'Tarefa Teste',
    objetivo: 'Objetivo teste',
    tipo: 'desenvolvimento',
    prioridade: 'ALTA',
    agenteResponsavel: 'backend',
    dominio: 'backend',
    ambiente: 'desenvolvimento',
    dependencias: ['TAR-000'],
    contratosObrigatorios: ['CONTRATO-1'],
    procedimentosObrigatorios: [],
    arquivosPermitidos: ['/backend/**'],
    arquivosProibidos: ['/segredo/**'],
    contextoNecessario: [],
    criteriosAceitacao: ['C1', 'C2'],
    testesObrigatorios: [],
    riscos: ['R1'],
    restricoes: ['Rest1'],
    condicoesDeParada: ['Parada1'],
    criteriosConclusao: ['Conclusao1'],
    resultado: { resumo: '', arquivosAlterados: [], testesExecutados: [], testesAprovados: [], riscosEncontrados: [], pendencias: [], observacoes: '', commit: '' },
    aprovacao: { necessaria: false, estado: 'PENDENTE', aprovador: '', data: null, observacao: '' },
    datas: { criacao: null, criadoEm: null, inicio: null, ultimaAtualizacao: null, atualizadaEm: null, conclusao: null }
  };

  test('gerarContextoTarefa escreve arquivo markdown', async () => {
    const result = await service.gerarContextoTarefa(tarefaMock as any, 'agente-1');
    expect(result.sucesso).toBe(true);
    expect(fsInstance.escrever).toHaveBeenCalledWith(
      '.kilo/agent/task-TAR-001-context.md',
      expect.stringContaining('# Contexto da Tarefa TAR-001')
    );
  });

  test('montarContextoMarkdown inclui todas as secoes', () => {
    const contexto: TaskContext = {
      objetivo: 'Objetivo teste',
      contrato: 'CONTRATO-1',
      dependencias: ['TAR-000'],
      decisoes: [],
      restricoes: ['Rest1'],
      criteriosAceitacao: ['C1', 'C2'],
      arquivosRelevantes: []
    };
    const md = service.montarContextoMarkdown(tarefaMock as any, contexto);
    expect(md).toContain('# Contexto da Tarefa TAR-001');
    expect(md).toContain('**Título:** Tarefa Teste');
    expect(md).toContain('## Objetivo');
    expect(md).toContain('Objetivo teste');
    expect(md).toContain('## Contratos Obrigatórios');
    expect(md).toContain('CONTRATO-1');
    expect(md).toContain('## Dependências');
    expect(md).toContain('- TAR-000');
    expect(md).toContain('## Restrições');
    expect(md).toContain('- Rest1');
    expect(md).toContain('## Critérios de Aceitação');
    expect(md).toContain('- [ ] C1');
    expect(md).toContain('- [ ] C2');
    expect(md).toContain('## Condições de Parada');
    expect(md).toContain('- Parada1');
    expect(md).toContain('## Riscos');
    expect(md).toContain('- R1');
    expect(md).toContain('## Protocolo de Entrega');
  });

  test('montarContextoMarkdown omite secoes vazias', () => {
    const contexto: TaskContext = {
      objetivo: 'Obj',
      contrato: 'Nenhum contrato obrigatório',
      dependencias: [],
      decisoes: [],
      restricoes: [],
      criteriosAceitacao: [],
      arquivosRelevantes: []
    };
    const tarefaVazia = { ...tarefaMock, condicoesDeParada: [], riscos: [] };
    const md = service.montarContextoMarkdown(tarefaVazia as any, contexto);
    expect(md).not.toContain('## Dependências');
    expect(md).not.toContain('## Restrições');
    expect(md).not.toContain('## Riscos');
    expect(md).not.toContain('## Condições de Parada');
  });

  test('mapearPermissoes retorna permissoes padrao', () => {
    const perms = (service as any).mapearPermissoes(
      { ler: true, criar: true, alterar: true, excluir: true, executar: true, testar: true, revisar: true, aprovar: true, implantar: true },
      [],
      []
    );
    expect(perms.read).toBe('allow');
    expect(perms.edit).toBe('allow');
    expect(perms.bash).toBe('allow');
    expect(perms.glob).toBe('allow');
  });

  test('mapearPermissoes com permitidos restringe read e edit', () => {
    const perms = (service as any).mapearPermissoes(
      { ler: true, criar: true, alterar: true, excluir: true, executar: true, testar: true, revisar: true, aprovar: true, implantar: true },
      ['/frontend/**'],
      []
    );
    expect(perms.read).toContain('/frontend/**');
    expect(perms.edit).toContain('/frontend/**');
  });

  test('mapearPermissoes com proibidos adiciona regras deny', () => {
    const perms = (service as any).mapearPermissoes(
      { ler: true, criar: true, alterar: true, excluir: true, executar: true, testar: true, revisar: true, aprovar: true, implantar: true },
      [],
      ['/segredo/**']
    );
    expect(perms.edit).toContain('"*": deny');
    expect(perms.read).toContain('"*": deny');
  });

  test('combinarEditPerm gera regras corretas', () => {
    const result = (service as any).combinarEditPerm(['/frontend/**'], ['/segredo/**']);
    expect(result).toContain('"/frontend/**": allow');
    expect(result).toContain('"/segredo/**": deny');
    expect(result).toContain('"*": deny');
  });

  test('combinarReadPerm gera regras corretas', () => {
    const result = (service as any).combinarReadPerm(['/frontend/**'], ['/segredo/**']);
    expect(result).toContain('"/frontend/**": allow');
    expect(result).toContain('"/segredo/**": deny');
    expect(result).toContain('"*": deny');
  });

  test('gerarPromptPremium inclui todas as secoes', () => {
    const md = (service as any).gerarPromptPremium(
      'id-1', 'Nome Agente', 'funcao_teste',
      ['conhecimento1'], ['resp1'], ['permitido1'], ['proibido1'],
      ['contrato1'], ['parada1'], ['aprovacao1'],
      { exigeResumo: true, exigeArquivosAlterados: true, exigeTestes: true, exigeRiscos: true, exigePendencias: true }
    );
    expect(md).toContain('# Nome Agente — Especialista Premium');
    expect(md).toContain('## Identidade Profissional');
    expect(md).toContain('- **Funcao:** funcao_teste.');
    expect(md).toContain('## Responsabilidades Estrategicas');
    expect(md).toContain('1. resp1');
    expect(md).toContain('## Expertise Tecnica');
    expect(md).toContain('Dominio avancado em: conhecimento1');
    expect(md).toContain('## Dominios e Acesso');
    expect(md).toContain('- **Diretorios permitidos:** permitido1');
    expect(md).toContain('- **Diretorios proibidos:** proibido1');
    expect(md).toContain('- **Contratos obrigatorios:** contrato1');
    expect(md).toContain('## Padroes de Excelencia');
    expect(md).toContain('**Condicoes de parada:** parada1');
    expect(md).toContain('**Requer aprovacao para:** aprovacao1');
    expect(md).toContain('## Protocolo de Entrega Premium');
    expect(md).toContain('## Comportamento e Tom');
  });

  test('gerarPromptPremium omite secoes opcionais vazias', () => {
    const md = (service as any).gerarPromptPremium(
      'id-1', 'Nome', 'funcao',
      [], [], [], [],
      [], [], [],
      undefined
    );
    expect(md).not.toContain('## Responsabilidades Estrategicas');
    expect(md).not.toContain('## Expertise Tecnica');
    expect(md).toContain('## Protocolo de Entrega Premium');
  });

  test('corPorFuncao retorna cor correta para funcoes conhecidas', () => {
    expect((service as any).corPorFuncao('desenvolvimento_backend')).toBe('#FF6D00');
    expect((service as any).corPorFuncao('desenvolvimento_frontend')).toBe('#2979FF');
    expect((service as any).corPorFuncao('planejamento')).toBe('#00BFA5');
  });

  test('corPorFuncao retorna cor padrao para funcao desconhecida', () => {
    expect((service as any).corPorFuncao('funcao_desconhecida')).toBe('#607D8B');
  });

  test('montarMarkdown gera frontmatter YAML valido', () => {
    const config = {
      description: 'Agente teste',
      mode: 'primary' as const,
      steps: 5,
      hidden: false,
      color: '#FF0000',
      permission: { read: 'allow', edit: 'allow' }
    };
    const systemPrompt = 'System prompt teste';
    const md = (service as any).montarMarkdown(config, systemPrompt);
    expect(md).toContain('---');
    expect(md).toContain('description: Agente teste');
    expect(md).toContain('mode: primary');
    expect(md).toContain('steps: 5');
    expect(md).toContain('hidden: false');
    expect(md).toContain('color: "#FF0000"');
    expect(md).toContain('read: allow');
    expect(md).toContain('edit: allow');
    expect(md).toContain(systemPrompt);
  });

  test('formatarPermissao trata valores simples e objetos', () => {
    const lines = (service as any).formatarPermissao({
      read: 'allow',
      edit: '{"rule": "allow"}',
      custom: 'valor simples'
    });
    expect(lines).toContain('  read: allow');
    expect(lines).toContain('  edit: {"rule": "allow"}');
    expect(lines).toContain('  custom: "valor simples"');
  });
});
