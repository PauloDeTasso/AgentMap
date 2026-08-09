import { FileService } from '../src/arquivos/FileService';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { KiloDiscoveryService } from '../src/servicios/KiloDiscoveryService';

jest.mock('../src/arquivos/FileService');
jest.mock('../src/servicios/AuditoriaService');

const mockedFs = FileService as jest.MockedClass<typeof FileService>;

describe('KiloDiscoveryService', () => {
  let fsInstance: jest.Mocked<FileService>;
  let service: KiloDiscoveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    fsInstance = {
      lerJson: jest.fn(() => ({ sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' })),
      escreverJson: jest.fn(() => ({ sucesso: true, dados: '' })),
      listar: jest.fn(() => ({ sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' })),
      criarDiretorio: jest.fn(() => ({ sucesso: true, dados: '' })),
      existe: jest.fn(() => false),
      ler: jest.fn(() => ({ sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' })),
      escrever: jest.fn(() => ({ sucesso: true, dados: '' })),
      excluir: jest.fn(() => ({ sucesso: true, dados: '' }))
    } as any;
    const mockAuditoria = { registrar: jest.fn(() => ({ id: 'audit-1', tipo: '', descricao: '', dados: {}, data: new Date().toISOString() })) };
    service = new KiloDiscoveryService(fsInstance, mockAuditoria as any, '/projeto');
  });

  test('descobrir retorna estado vazio quando agent-manager.json não existe', async () => {
    (fsInstance.existe as jest.Mock).mockReturnValue(false);
    const result = await service.descobrir();
    expect(result.sucesso).toBe(true);
    expect(result.dados?.worktrees).toHaveLength(0);
    expect(result.dados?.sessoes).toHaveLength(0);
    expect(result.dados?.agentes).toHaveLength(0);
  });

  test('descobrir retorna erro quando falha ao ler agent-manager.json', async () => {
    (fsInstance.existe as jest.Mock).mockReturnValue(true);
    (fsInstance.lerJson as jest.Mock).mockReturnValue({
      sucesso: false,
      erro: 'JSON inválido',
      codigoErro: 'INVALID_JSON'
    });
    const result = await service.descobrir();
    expect(result.sucesso).toBe(false);
    expect(result.codigoErro).toBe('INVALID_JSON');
  });

  test('descobrir retorna estado com worktrees e sessoes', async () => {
    (fsInstance.existe as jest.Mock).mockReturnValue(true);
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('agent-manager.json')) {
        return {
          sucesso: true,
          dados: {
            worktrees: { 'wt-1': { branch: 'feat-1', sessionId: 'ses-1', agentId: 'agente-1', tarefaId: 'TAR-001' } },
            sessions: {
              'ses-1': { name: 'Sessao 1', type: 'local', agentId: 'agente-1', worktreeId: 'wt-1', state: 'ativo', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }
            }
          }
        };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    (fsInstance.listar as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('worktrees')) {
        return { sucesso: true, dados: [{ nome: 'wt-1', tipo: 'diretorio' }] };
      }
      if (path.includes('agent')) {
        return { sucesso: true, dados: [{ nome: 'agente-1.md', tipo: 'arquivo' }] };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    (fsInstance.ler as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('README.md')) {
        return { sucesso: true, dados: '# TAR-001\n\nDescricao' };
      }
      if (path.includes('agente-1.md')) {
        return { sucesso: true, dados: '---\ndescription: Agente 1\nmode: primary\ncolor: "#FF0000"\n---\n' };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });

    const result = await service.descobrir();
    expect(result.sucesso).toBe(true);
    expect(result.dados?.worktrees).toHaveLength(1);
    expect(result.dados?.worktrees[0].nome).toBe('wt-1');
    expect(result.dados?.worktrees[0].branch).toBe('feat-1');
    expect(result.dados?.sessoes).toHaveLength(1);
    expect(result.dados?.sessoes[0].id).toBe('ses-1');
    expect(result.dados?.agentes).toHaveLength(1);
    expect(result.dados?.agentes[0].nome).toBe('Agente 1');
    expect(result.dados?.agentes[0].cor).toBe('#FF0000');
  });

  test('descobrirWorktrees extrai tarefaId do README', async () => {
    (fsInstance.listar as jest.Mock).mockReturnValue({
      sucesso: true,
      dados: [{ nome: 'wt-1', tipo: 'diretorio' }]
    });
    (fsInstance.ler as jest.Mock).mockReturnValue({
      sucesso: true,
      dados: '# TAR-123\n\nTeste'
    });
    const worktrees = await (service as any).descobrirWorktrees('.kilo', { worktrees: {} });
    expect(worktrees).toHaveLength(1);
    expect(worktrees[0].tarefaId).toBe('TAR-123');
  });

  test('descobrirSessoes mapeia estados corretamente', () => {
    const sessoes = (service as any).descobrirSessoes(
      {
        sessions: {
          'ses-ativo': { state: 'ativo' },
          'ses-pausado': { state: 'idle' },
          'ses-finalizado': { state: 'end' },
          'ses-erro': { state: 'error' }
        }
      },
      []
    );
    expect(sessoes).toHaveLength(4);
    expect(sessoes[0].estado).toBe('ativo');
    expect(sessoes[1].estado).toBe('pausado');
    expect(sessoes[2].estado).toBe('finalizado');
    expect(sessoes[3].estado).toBe('erro');
  });

  test('descobrirSessoes mapeia worktree por nome ou sessaoId', () => {
    const worktrees = [
      { nome: 'wt-1', sessaoId: 'ses-1', agenteId: 'agente-1' }
    ];
    const sessoes = (service as any).descobrirSessoes(
      {
        sessions: {
          'ses-1': { name: 'S1', worktreeId: 'wt-1', state: 'ativo' }
        }
      },
      worktrees
    );
    expect(sessoes[0].agenteId).toBe('agente-1');
  });

  test('extrairFrontmatter retorna objeto vazio quando não há frontmatter', () => {
    const result = (service as any).extrairFrontmatter('sem frontmatter aqui');
    expect(result).toEqual({});
  });

  test('extrairFrontmatter extrai campos corretamente', () => {
    const md = '---\ndescription: Teste\nmode: subagent\ncolor: "#00FF00"\n---\n';
    const result = (service as any).extrairFrontmatter(md);
    expect(result.description).toBe('Teste');
    expect(result.mode).toBe('subagent');
    expect(result.color).toBe('#00FF00');
  });

  test('extrairFrontmatter remove aspas dos valores', () => {
    const md = '---\ndescription: "Teste com aspas"\n---\n';
    const result = (service as any).extrairFrontmatter(md);
    expect(result.description).toBe('Teste com aspas');
  });

  test('mapearEstadoSessao retorna ativo para estado desconhecido', () => {
    expect((service as any).mapearEstadoSessao('desconhecido')).toBe('ativo');
  });

  test('obterEstadoKilo chama descobrir', async () => {
    (fsInstance.existe as jest.Mock).mockReturnValue(false);
    const result = await service.obterEstadoKilo();
    expect(result.sucesso).toBe(true);
  });
});
