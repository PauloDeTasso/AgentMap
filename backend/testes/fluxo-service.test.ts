import { FileService } from '../src/arquivos/FileService';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { FluxoService, ChecklistFluxo } from '../src/servicios/FluxoService';

jest.mock('../src/arquivos/FileService');
jest.mock('../src/servicios/AuditoriaService');

const mockedFs = FileService as jest.MockedClass<typeof FileService>;

describe('FluxoService', () => {
  let fsInstance: jest.Mocked<FileService>;
  let service: FluxoService;

  beforeEach(() => {
    jest.clearAllMocks();
    fsInstance = {
      lerJson: jest.fn(() => ({ sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' })),
      escreverJson: jest.fn(() => ({ sucesso: true, dados: '' })),
      listar: jest.fn(() => ({ sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' })),
      criarDiretorio: jest.fn(() => ({ sucesso: true, dados: '' })),
      existe: jest.fn(() => false),
      ler: jest.fn(() => ({ sucesso: true, dados: '{}' })),
      escrever: jest.fn(() => ({ sucesso: true, dados: '' })),
      excluir: jest.fn(() => ({ sucesso: true, dados: '' }))
    } as any;
    service = new FluxoService(fsInstance, {} as any);
  });

  test('validarChecklist retorna pendente quando faltam pastas', () => {
    (fsInstance.listar as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('contratos')) return { sucesso: true, dados: [] };
      if (path.includes('tarefas')) return { sucesso: true, dados: [] };
      if (path.includes('dependencias')) return { sucesso: true, dados: [] };
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    (fsInstance.ler as jest.Mock).mockReturnValue({ sucesso: true, dados: '# fluxo' });
    const result = service.validarChecklist();
    expect(result.sucesso).toBe(false);
    expect(result.dados).toBeDefined();
  });

  test('validarChecklist retorna OK quando estrutura completa', () => {
    (fsInstance.listar as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('contratos')) return { sucesso: true, dados: [{ nome: 'c1.json', tipo: 'arquivo' }] };
      if (path.includes('tarefas')) return { sucesso: true, dados: [] };
      if (path.includes('dependencias')) return { sucesso: true, dados: [] };
      return { sucesso: true, dados: [] };
    });
    (fsInstance.ler as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('fluxo-trabalho.md')) return { sucesso: true, dados: '# fluxo' };
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('tarefas/tarefas.json')) {
        return { sucesso: true, dados: { tarefas: [{ id: 'TAR-001' }] } };
      }
      if (path.includes('dependencias/dependencias.json')) {
        return { sucesso: true, dados: { dependencias: [] } };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });

    const result = service.validarChecklist();
    expect(result.sucesso).toBe(true);
    expect(result.dados?.fluxoTrabalhoExiste).toBe(true);
    expect(result.dados?.pastaContratosExiste).toBe(true);
    expect(result.dados?.peloMenosUmContrato).toBe(true);
    expect(result.dados?.peloMenosUmaTarefa).toBe(true);
    expect(result.dados?.tarefasSemDependenciasCirculares).toBe(true);
  });

  test('obterPendentes retorna lista correta', () => {
    const checklist: ChecklistFluxo = {
      fluxoTrabalhoExiste: true,
      pastaContratosExiste: false,
      pastaTarefasExiste: true,
      pastaDependenciasExiste: true,
      peloMenosUmContrato: false,
      peloMenosUmaTarefa: true,
      tarefasSemDependenciasCirculares: true
    };
    const pendentes = service.obterPendentes(checklist);
    expect(pendentes).toContain('Pasta .ia/contratos não encontrada');
    expect(pendentes).toContain('Nenhum contrato registrado');
    expect(pendentes).not.toContain('Pasta .ia/tarefas não encontrada');
  });

  test('validarChecklist detecta dependencias circulares', () => {
    (fsInstance.listar as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('contratos')) return { sucesso: true, dados: [{ nome: 'c1.json', tipo: 'arquivo' }] };
      if (path.includes('tarefas')) return { sucesso: true, dados: [] };
      if (path.includes('dependencias')) return { sucesso: true, dados: [] };
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    (fsInstance.ler as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('fluxo-trabalho.md')) return { sucesso: true, dados: '# fluxo' };
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('tarefas/tarefas.json')) {
        return { sucesso: true, dados: { tarefas: [{ id: 'TAR-001' }] } };
      }
      if (path.includes('dependencias/dependencias.json')) {
        return {
          sucesso: true,
          dados: {
            dependencias: [
              { fonteId: 'TAR-001', destinoId: 'TAR-002' },
              { fonteId: 'TAR-002', destinoId: 'TAR-001' }
            ]
          }
        };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });

    const result = service.validarChecklist();
    expect(result.sucesso).toBe(false);
    expect(result.dados?.tarefasSemDependenciasCirculares).toBe(false);
    expect(service.obterPendentes(result.dados)).toContain('Dependências circulares detectadas');
  });

  test('validarChecklist sem dependencias nao detecta circulares', () => {
    (fsInstance.listar as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('contratos')) return { sucesso: true, dados: [{ nome: 'c1.json', tipo: 'arquivo' }] };
      if (path.includes('tarefas')) return { sucesso: true, dados: [] };
      if (path.includes('dependencias')) return { sucesso: true, dados: [] };
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    (fsInstance.ler as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('fluxo-trabalho.md')) return { sucesso: true, dados: '# fluxo' };
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('tarefas/tarefas.json')) {
        return { sucesso: true, dados: { tarefas: [{ id: 'TAR-001' }] } };
      }
      if (path.includes('dependencias/dependencias.json')) {
        return { sucesso: true, dados: { dependencias: [] } };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });

    const result = service.validarChecklist();
    expect(result.sucesso).toBe(true);
    expect(result.dados?.tarefasSemDependenciasCirculares).toBe(true);
  });

  test('contemTarefas retorna false quando JSON nao tem tarefas', () => {
    (fsInstance.lerJson as jest.Mock).mockReturnValue({ sucesso: true, dados: { tarefas: [] } });
    const result = (service as any).contemTarefas();
    expect(result).toBe(false);
  });

  test('contemTarefas retorna true quando ha tarefas', () => {
    (fsInstance.lerJson as jest.Mock).mockReturnValue({ sucesso: true, dados: { tarefas: [{ id: 'TAR-001' }] } });
    const result = (service as any).contemTarefas();
    expect(result).toBe(true);
  });
});
