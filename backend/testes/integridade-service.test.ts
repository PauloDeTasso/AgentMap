import { FileService } from '../src/arquivos/FileService';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { FluxoService } from '../src/servicios/FluxoService';
import { IntegridadeService } from '../src/servicios/IntegridadeService';

jest.mock('../src/arquivos/FileService');
jest.mock('../src/servicios/AuditoriaService');
jest.mock('../src/validacao/SchemaValidator');
jest.mock('../src/servicios/FluxoService');

const mockedFs = FileService as jest.MockedClass<typeof FileService>;

describe('IntegridadeService', () => {
  let fsInstance: jest.Mocked<FileService>;
  let service: IntegridadeService;

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
  });

  test('verificar retorna erro quando arquivo de agentes nao existe', async () => {
    service = new IntegridadeService(fsInstance, {} as any, {} as any);
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('agentes/agentes.json')) {
        return { sucesso: true, dados: { agentes: [] } };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const result = await service.verificar('proj-1');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.estado).toBe('OK');
  });

  test('verificar detecta agenteResponsavel inexistente em tarefa', async () => {
    service = new IntegridadeService(fsInstance, {} as any, {} as any);
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('agentes/agentes.json')) {
        return { sucesso: true, dados: { agentes: [{ id: 'agente-1' }] } };
      }
      if (path.includes('tarefas/tarefas.json')) {
        return {
          sucesso: true,
          dados: {
            tarefas: [{
              id: 'TAR-001',
              agenteResponsavel: 'agente-inexistente',
              dependencias: [],
              contratosObrigatorios: []
            }]
          }
        };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const result = await service.verificar('proj-1');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.inconsistencias).toContain(expect.stringContaining('agenteResponsavel'));
  });

  test('verificar detecta dependencia inexistente em tarefa', async () => {
    service = new IntegridadeService(fsInstance, {} as any, {} as any);
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('agentes/agentes.json')) {
        return { sucesso: true, dados: { agentes: [] } };
      }
      if (path.includes('tarefas/tarefas.json')) {
        return {
          sucesso: true,
          dados: {
            tarefas: [{
              id: 'TAR-001',
              agenteResponsavel: '',
              dependencias: ['TAR-999'],
              contratosObrigatorios: []
            }]
          }
        };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const result = await service.verificar('proj-1');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.inconsistencias).toContain(expect.stringContaining("TAR-001': dependência 'TAR-999' não existe"));
  });

  test('verificar detecta contrato obrigatorio inexistente', async () => {
    service = new IntegridadeService(fsInstance, {} as any, {} as any);
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('agentes/agentes.json')) {
        return { sucesso: true, dados: { agentes: [] } };
      }
      if (path.includes('tarefas/tarefas.json')) {
        return {
          sucesso: true,
          dados: {
            tarefas: [{
              id: 'TAR-001',
              agenteResponsavel: '',
              dependencias: [],
              contratosObrigatorios: ['CONTRATO-999']
            }]
          }
        };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const result = await service.verificar('proj-1');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.inconsistencias).toContain(expect.stringContaining("contrato obrigatório 'CONTRATO-999'"));
  });

  test('verificar detecta inconsistencia em handoff', async () => {
    service = new IntegridadeService(fsInstance, {} as any, {} as any);
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('agentes/agentes.json')) {
        return { sucesso: true, dados: { agentes: [] } };
      }
      if (path.includes('handoffs/handoffs.json')) {
        return {
          sucesso: true,
          dados: {
            handoffs: [
              { id: 'H-001', origem: 'agente-1', destino: 'agente-2', tarefaId: 'TAR-001' }
            ]
          }
        };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const result = await service.verificar('proj-1');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.inconsistencias.some(i => i.includes('origem') && i.includes('agente-1'))).toBe(true);
    expect(result.dados?.inconsistencias.some(i => i.includes('destino') && i.includes('agente-2'))).toBe(true);
  });

  test('verificar detecta inconsistencia em bloqueio', async () => {
    service = new IntegridadeService(fsInstance, {} as any, {} as any);
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('agentes/agentes.json')) {
        return { sucesso: true, dados: { agentes: [] } };
      }
      if (path.includes('estado/bloqueios.json')) {
        return {
          sucesso: true,
          dados: {
            bloqueios: [
              { id: 'B-001', tarefaId: 'TAR-001', responsavelResolucao: 'agente-x' }
            ]
          }
        };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const result = await service.verificar('proj-1');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.inconsistencias.some(i => i.includes('B-001') && i.includes('responsavelResolucao'))).toBe(true);
  });

  test('verificar registra evento de auditoria', async () => {
    service = new IntegridadeService(fsInstance, {} as any, {} as any);
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('agentes/agentes.json')) {
        return { sucesso: true, dados: { agentes: [] } };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const mockAuditoria = { registrar: jest.fn() };
    const svc = new IntegridadeService(fsInstance, mockAuditoria as any, {} as any);
    await svc.verificar('proj-1');
    expect(mockAuditoria.registrar).toHaveBeenCalledWith(
      'INTEGRIDADE_VERIFICADA',
      expect.any(String),
      expect.objectContaining({ projetoId: 'proj-1' })
    );
  });

  test('calcularEstadoProjeto retorna estado com estatisticas', async () => {
    service = new IntegridadeService(fsInstance, {} as any, {} as any);
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('tarefas/tarefas.json')) {
        return {
          sucesso: true,
          dados: {
            tarefas: [
              { id: 'TAR-001', estado: 'CONCLUIDA' },
              { id: 'TAR-002', estado: 'EM_EXECUCAO' },
              { id: 'TAR-003', estado: 'BLOQUEADA' }
            ]
          }
        };
      }
      if (path.includes('solicitacoes/solicitacoes.json')) {
        return { sucesso: true, dados: { solicitacoes: [] } };
      }
      return { sucesso: true, dados: {} };
    });
    const result = await service.calcularEstadoProjeto('proj-1');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.tarefas.total).toBe(3);
    expect(result.dados?.tarefas.concluidas).toBe(1);
    expect(result.dados?.tarefas.emExecucao).toBe(1);
    expect(result.dados?.tarefas.bloqueadas).toBe(1);
  });

  test('verificar com FluxoService pendente adiciona inconsistencia', async () => {
    const mockFluxo = { validarChecklist: jest.fn(() => ({ sucesso: true, dados: { pendentes: ['Falta pasta'] } })), obterPendentes: jest.fn(() => ['Falta pasta']) };
    service = new IntegridadeService(fsInstance, {} as any, {} as any, mockFluxo as any);
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('agentes/agentes.json')) {
        return { sucesso: true, dados: { agentes: [] } };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const result = await service.verificar('proj-1');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.inconsistencias.some(i => i.includes('Checklist de fluxo pendente'))).toBe(true);
  });
});
