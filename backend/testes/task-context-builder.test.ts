import { FileService } from '../src/arquivos/FileService';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { KiloAgentGeneratorService, TaskContext } from '../src/servicios/KiloAgentGeneratorService';
import { TaskContextBuilder } from '../src/servicios/TaskContextBuilder';

jest.mock('../src/arquivos/FileService');
jest.mock('../src/servicios/AuditoriaService');
jest.mock('../src/validacao/SchemaValidator');

const mockedFs = FileService as jest.MockedClass<typeof FileService>;

describe('TaskContextBuilder', () => {
  let fsInstance: jest.Mocked<FileService>;
  let service: TaskContextBuilder;

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
    service = new TaskContextBuilder(fsInstance, {} as any, {} as any);
  });

  test('construirPacote retorna erro quando tarefas nao existem', async () => {
    const result = await service.construirPacote('TAR-999');
    expect(result.sucesso).toBe(false);
    expect(result.codigoErro).toBe('TASK_LOAD_ERROR');
  });

  test('construirPacote retorna erro quando tarefa nao encontrada', async () => {
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('tarefas/tarefas.json')) {
        return { sucesso: true, dados: { tarefas: [{ id: 'TAR-001', titulo: 'Outra' }] } };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const result = await service.construirPacote('TAR-999');
    expect(result.sucesso).toBe(false);
    expect(result.codigoErro).toBe('TASK_NOT_FOUND');
  });

  test('construirPacote carrega contratos corretamente', async () => {
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('tarefas/tarefas.json')) {
        return {
          sucesso: true,
          dados: {
            tarefas: [{
              id: 'TAR-001',
              titulo: 'Tarefa',
              objetivo: 'Obj',
              contratosObrigatorios: ['CONTRATO-1'],
              arquivosPermitidos: [],
              dependencias: [],
              restricoes: [],
              criteriosAceitacao: []
            }]
          }
        };
      }
      if (path.includes('contratos/CONTRATO-1.json')) {
        return { sucesso: true, dados: { nome: 'Contrato 1' } };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const result = await service.construirPacote('TAR-001');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.contrato).toBe('Contrato 1');
  });

  test('construirPacote carrega decisoes relacionadas aos contratos', async () => {
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('tarefas/tarefas.json')) {
        return {
          sucesso: true,
          dados: {
            tarefas: [{
              id: 'TAR-001',
              titulo: 'Tarefa',
              objetivo: 'Obj',
              contratosObrigatorios: ['CONTRATO-1'],
              arquivosPermitidos: [],
              dependencias: [],
              restricoes: [],
              criteriosAceitacao: []
            }]
          }
        };
      }
      if (path.includes('decisoes/decisoes.json')) {
        return {
          sucesso: true,
          dados: {
            decisoes: [
              { titulo: 'Decisao sobre CONTRATO-1' },
              { titulo: 'Decisao sobre OUTRO' }
            ]
          }
        };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const result = await service.construirPacote('TAR-001');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.decisoes).toContain('Decisao sobre CONTRATO-1');
    expect(result.dados?.decisoes).not.toContain('Decisao sobre OUTRO');
  });

  test('construirPacote inclui arquivos permitidos validos', async () => {
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('tarefas/tarefas.json')) {
        return {
          sucesso: true,
          dados: {
            tarefas: [{
              id: 'TAR-001',
              titulo: 'Tarefa',
              objetivo: 'Obj',
              contratosObrigatorios: [],
              arquivosPermitidos: ['/backend/**', '/docs/**'],
              dependencias: [],
              restricoes: [],
              criteriosAceitacao: []
            }]
          }
        };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    (fsInstance.ler as jest.Mock).mockReturnValue({ sucesso: true, dados: 'conteudo arquivo' });
    const result = await service.construirPacote('TAR-001');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.arquivosRelevantes).toHaveLength(2);
    expect(result.dados?.arquivosRelevantes[0].caminho).toBe('backend/');
    expect(result.dados?.arquivosRelevantes[0].conteudo).toBe('conteudo arquivo');
  });

  test('construirPacote ignora padrao /** e caminhos com ..', async () => {
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('tarefas/tarefas.json')) {
        return {
          sucesso: true,
          dados: {
            tarefas: [{
              id: 'TAR-001',
              titulo: 'Tarefa',
              objetivo: 'Obj',
              contratosObrigatorios: [],
              arquivosPermitidos: ['/**', '/segredo/../../etc/passwd'],
              dependencias: [],
              restricoes: [],
              criteriosAceitacao: []
            }]
          }
        };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const result = await service.construirPacote('TAR-001');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.arquivosRelevantes).toHaveLength(0);
  });

  test('gerarMarkdownContexto gera arquivo e registra auditoria', async () => {
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('tarefas/tarefas.json')) {
        return {
          sucesso: true,
          dados: {
            tarefas: [{
              id: 'TAR-001',
              titulo: 'Tarefa',
              objetivo: 'Obj',
              contratosObrigatorios: [],
              arquivosPermitidos: [],
              dependencias: [],
              restricoes: [],
              criteriosAceitacao: []
            }]
          }
        };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const mockAuditoria = { registrar: jest.fn() };
    const svc = new TaskContextBuilder(fsInstance, mockAuditoria as any, {} as any);
    const result = await svc.gerarMarkdownContexto('TAR-001');
    expect(result.sucesso).toBe(true);
    expect(fsInstance.escrever).toHaveBeenCalledWith(
      '.kilo/agent/task-TAR-001-context.md',
      expect.any(String)
    );
    expect(mockAuditoria.registrar).toHaveBeenCalledWith(
      'TAREFA_CONTEXTO_GERADO',
      expect.stringContaining('TAR-001'),
      expect.objectContaining({ tarefaId: 'TAR-001' })
    );
  });
});
