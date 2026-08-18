import { FileService } from '../src/arquivos/FileService';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { KiloReconciliationService } from '../src/servicios/KiloReconciliationService';

jest.mock('../src/arquivos/FileService');
jest.mock('../src/servicios/AuditoriaService');
jest.mock('../src/validacao/SchemaValidator');
jest.mock('../src/servicios/KiloDiscoveryService');

const mockedFs = FileService as jest.MockedClass<typeof FileService>;

describe('KiloReconciliationService', () => {
  let fsInstance: jest.Mocked<FileService>;
  let service: KiloReconciliationService;

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
    service = new KiloReconciliationService(fsInstance, {} as any, {} as any, '/projeto');
  });

  test('reconciliar retorna erro quando discovery falha', async () => {
    const KiloDiscoveryServiceMock = require('../src/servicios/KiloDiscoveryService').KiloDiscoveryService as jest.MockedClass<any>;
    KiloDiscoveryServiceMock.prototype.descobrir = jest.fn().mockResolvedValue({
      sucesso: false,
      erro: 'Falha',
      codigoErro: 'DISCOVERY_FAILED'
    });
    const result = await service.reconciliar();
    expect(result.sucesso).toBe(false);
    expect(result.codigoErro).toBe('KILO_DISCOVERY_FAILED');
  });

  test('reconciliar detecta sessoes desconhecidas', async () => {
    const KiloDiscoveryServiceMock = require('../src/servicios/KiloDiscoveryService').KiloDiscoveryService as jest.MockedClass<any>;
    KiloDiscoveryServiceMock.prototype.descobrir = jest.fn().mockResolvedValue({
      sucesso: true,
      dados: {
        descobertoEm: new Date().toISOString(),
        worktrees: [],
        sessoes: [
          { id: 'ses-nova', nome: 'Nova', tipo: 'local', estado: 'ativo', criadoEm: '2024-01-01T00:00:00.000Z', atualizadoEm: '2024-01-01T00:00:00.000Z' }
        ],
        agentes: []
      }
    });
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('sessoes.json')) {
        return { sucesso: true, dados: { sessoes: [] } };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });

    const result = await service.reconciliar();
    expect(result.sucesso).toBe(true);
    expect(result.dados?.sessoesDesconhecidas).toHaveLength(1);
    expect(result.dados?.sessoesDesconhecidas[0].id).toBe('ses-nova');
    expect(result.dados?.sessoesNovas).toHaveLength(0);
    expect(result.dados?.sessoesAgenteMapSemKilo).toHaveLength(0);
  });

  test('reconciliar detecta sessoes AgentMap sem Kilo', async () => {
    const KiloDiscoveryServiceMock = require('../src/servicios/KiloDiscoveryService').KiloDiscoveryService as jest.MockedClass<any>;
    KiloDiscoveryServiceMock.prototype.descobrir = jest.fn().mockResolvedValue({
      sucesso: true,
      dados: {
        descobertoEm: new Date().toISOString(),
        worktrees: [],
        sessoes: [],
        agentes: []
      }
    });
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('sessoes.json')) {
        return { sucesso: true, dados: { sessoes: [{ id: 'ses-antiga' }] } };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });

    const result = await service.reconciliar();
    expect(result.sucesso).toBe(true);
    expect(result.dados?.sessoesAgenteMapSemKilo).toContain('ses-antiga');
  });

  test('reconciliar registra eventos de auditoria para sessoes desconhecidas', async () => {
    const KiloDiscoveryServiceMock = require('../src/servicios/KiloDiscoveryService').KiloDiscoveryService as jest.MockedClass<any>;
    const mockAuditoria = { registrar: jest.fn() };
    const svc = new KiloReconciliationService(fsInstance, mockAuditoria as any, {} as any, '/projeto');

    KiloDiscoveryServiceMock.prototype.descobrir = jest.fn().mockResolvedValue({
      sucesso: true,
      dados: {
        descobertoEm: new Date().toISOString(),
        worktrees: [],
        sessoes: [
          { id: 'ses-1', nome: 'S1', tipo: 'local', estado: 'ativo', criadoEm: '2024-01-01T00:00:00.000Z', atualizadoEm: '2024-01-01T00:00:00.000Z' }
        ],
        agentes: []
      }
    });
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('sessoes.json')) {
        return { sucesso: true, dados: { sessoes: [] } };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });

    await svc.reconciliar();
    expect(mockAuditoria.registrar).toHaveBeenCalledWith(
      'KILO_SESSION_DESCONHECIDA',
      expect.stringContaining('ses-1'),
      expect.objectContaining({ sessaoId: 'ses-1' })
    );
  });

  test('reconciliar registra evento de reconciliacao final', async () => {
    const KiloDiscoveryServiceMock = require('../src/servicios/KiloDiscoveryService').KiloDiscoveryService as jest.MockedClass<any>;
    const mockAuditoria = { registrar: jest.fn() };
    const svc = new KiloReconciliationService(fsInstance, mockAuditoria as any, {} as any, '/projeto');

    KiloDiscoveryServiceMock.prototype.descobrir = jest.fn().mockResolvedValue({
      sucesso: true,
      dados: {
        descobertoEm: new Date().toISOString(),
        worktrees: [],
        sessoes: [],
        agentes: []
      }
    });
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('sessoes.json')) {
        return { sucesso: true, dados: { sessoes: [] } };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });

    await svc.reconciliar();
    expect(mockAuditoria.registrar).toHaveBeenCalledWith(
      'KILO_RECONCILIADO',
      expect.any(String),
      expect.objectContaining({
        sessoesDesconhecidas: 0,
        sessoesAgenteMapSemKilo: 0
      })
    );
  });

  test('reconciliar com sessoesAgentMapSemKilo registra evento OFFLINE', async () => {
    const KiloDiscoveryServiceMock = require('../src/servicios/KiloDiscoveryService').KiloDiscoveryService as jest.MockedClass<any>;
    const mockAuditoria = { registrar: jest.fn() };
    const svc = new KiloReconciliationService(fsInstance, mockAuditoria as any, {} as any, '/projeto');

    KiloDiscoveryServiceMock.prototype.descobrir = jest.fn().mockResolvedValue({
      sucesso: true,
      dados: {
        descobertoEm: new Date().toISOString(),
        worktrees: [],
        sessoes: [],
        agentes: []
      }
    });
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('sessoes.json')) {
        return { sucesso: true, dados: { sessoes: [{ id: 'ses-offline' }] } };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });

    await svc.reconciliar();
    expect(mockAuditoria.registrar).toHaveBeenCalledWith(
      'KILO_SESSION_DESCONHECIDA',
      expect.stringContaining('ses-offline'),
      expect.objectContaining({ sessaoId: 'ses-offline', status: 'OFFLINE' })
    );
  });

  test('obterEstadoKilo retorna estado do discovery', async () => {
    const KiloDiscoveryServiceMock = require('../src/servicios/KiloDiscoveryService').KiloDiscoveryService as jest.MockedClass<any>;
    KiloDiscoveryServiceMock.prototype.descobrir = jest.fn().mockResolvedValue({
      sucesso: true,
      dados: {
        descobertoEm: new Date().toISOString(),
        worktrees: [],
        sessoes: [],
        agentes: []
      }
    });
    const result = await service.obterEstadoKilo();
    expect(result.sucesso).toBe(true);
  });
});
