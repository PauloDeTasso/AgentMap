import { FileService } from '../src/arquivos/FileService';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { KiloIdempotencyService } from '../src/servicios/KiloIdempotencyService';

jest.mock('../src/arquivos/FileService');
jest.mock('../src/servicios/AuditoriaService');

const mockedFs = FileService as jest.MockedClass<typeof FileService>;

describe('KiloIdempotencyService', () => {
  let fsInstance: jest.Mocked<FileService>;
  let service: KiloIdempotencyService;
  let registryStore: { mensagens: any[] };

  beforeEach(() => {
    jest.clearAllMocks();
    registryStore = { mensagens: [] };
    fsInstance = {
      lerJson: jest.fn(() => ({ sucesso: true, dados: { ...registryStore } })),
      escreverJson: jest.fn(() => ({ sucesso: true, dados: '' })),
      listar: jest.fn(() => ({ sucesso: true, dados: [] })),
      criarDiretorio: jest.fn(() => ({ sucesso: true, dados: '' })),
      existe: jest.fn(() => true),
      ler: jest.fn(() => ({ sucesso: true, dados: '{}' })),
      escrever: jest.fn(() => ({ sucesso: true, dados: '' })),
      excluir: jest.fn(() => ({ sucesso: true, dados: '' }))
    } as any;
    service = new KiloIdempotencyService(fsInstance, {} as any);
  });

  test('isProcessado retorna false para mensagem nunca vista', async () => {
    const result = await service.isProcessado('msg-1');
    expect(result).toBe(false);
  });

  test('isProcessado retorna true para mensagem recente', async () => {
    registryStore.mensagens = [
      { messageId: 'msg-1', processedAt: new Date().toISOString(), tool: 'tool-1' }
    ];
    (fsInstance.lerJson as jest.Mock).mockReturnValue({ sucesso: true, dados: { ...registryStore } });
    const result = await service.isProcessado('msg-1');
    expect(result).toBe(true);
  });

  test('isProcessado retorna false para mensagem expirada', async () => {
    const expiredAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    registryStore.mensagens = [
      { messageId: 'msg-1', processedAt: expiredAt, tool: 'tool-1' }
    ];
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('kilohub-processed.json')) {
        return { sucesso: true, dados: { mensagens: [{ messageId: 'msg-1', processedAt: expiredAt, tool: 'tool-1' }] } };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const result = await service.isProcessado('msg-1');
    expect(result).toBe(false);
  });

  test('marcarProcessado adiciona entrada ao registry', async () => {
    const result = await service.marcarProcessado('msg-1', 'tool-1', 'ses-1');
    expect(result.sucesso).toBe(true);
    expect(fsInstance.escreverJson).toHaveBeenCalled();
  });

  test('marcarProcessado remove entradas expiradas antes de adicionar', async () => {
    const expiredAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('kilohub-processed.json')) {
        return {
          sucesso: true,
          dados: {
            mensagens: [
              { messageId: 'msg-antiga', processedAt: expiredAt, tool: 'tool-1' },
              { messageId: 'msg-recente', processedAt: new Date().toISOString(), tool: 'tool-2' }
            ]
          }
        };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    await service.marcarProcessado('msg-nova', 'tool-3', 'ses-1');
    const writeCall = (fsInstance.escreverJson as jest.Mock).mock.calls.find(
      (c: any) => c[0].includes('kilohub-processed.json')
    );
    const registry = writeCall[1];
    expect(registry.mensagens.find((m: any) => m.messageId === 'msg-antiga')).toBeUndefined();
    expect(registry.mensagens.find((m: any) => m.messageId === 'msg-recente')).toBeDefined();
    expect(registry.mensagens.find((m: any) => m.messageId === 'msg-nova')).toBeDefined();
  });

  test('limparExpirados retorna 0 quando registry não existe', async () => {
    (fsInstance.lerJson as jest.Mock).mockReturnValue({ sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' });
    const result = await service.limparExpirados();
    expect(result.sucesso).toBe(true);
    expect(result.dados).toBe(0);
  });

  test('limparExpirados remove entradas expiradas', async () => {
    const expiredAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const recentAt = new Date().toISOString();
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('kilohub-processed.json')) {
        return {
          sucesso: true,
          dados: {
            mensagens: [
              { messageId: 'msg-antiga', processedAt: expiredAt, tool: 'tool-1' },
              { messageId: 'msg-recente', processedAt: recentAt, tool: 'tool-2' }
            ]
          }
        };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const result = await service.limparExpirados();
    expect(result.sucesso).toBe(true);
    expect(result.dados).toBe(1);
    expect(fsInstance.escreverJson).toHaveBeenCalled();
  });

  test('limparExpirados nao escreve quando nada é removido', async () => {
    const recentAt = new Date().toISOString();
    (fsInstance.lerJson as jest.Mock).mockReturnValue({
      sucesso: true,
      dados: { mensagens: [{ messageId: 'msg-1', processedAt: recentAt, tool: 'tool-1' }] }
    });
    jest.clearAllMocks();
    const result = await service.limparExpirados();
    expect(result.sucesso).toBe(true);
    expect(result.dados).toBe(0);
    expect(fsInstance.escreverJson).not.toHaveBeenCalled();
  });

  test('TTL customizado é respeitado', async () => {
    const customService = new KiloIdempotencyService(fsInstance, {} as any, 1000);
    const expiredAt = new Date(Date.now() - 2000).toISOString();
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('kilohub-processed.json')) {
        return { sucesso: true, dados: { mensagens: [{ messageId: 'msg-1', processedAt: expiredAt, tool: 'tool-1' }] } };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const result = await customService.isProcessado('msg-1');
    expect(result).toBe(false);
  });
});
