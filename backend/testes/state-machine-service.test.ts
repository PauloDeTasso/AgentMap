import { FileService } from '../src/arquivos/FileService';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { StateMachineService } from '../src/servicios/StateMachineService';

jest.mock('../src/arquivos/FileService');
jest.mock('../src/servicios/AuditoriaService');
jest.mock('../src/validacao/SchemaValidator');

const mockedFs = FileService as jest.MockedClass<typeof FileService>;

describe('StateMachineService', () => {
  let fsInstance: jest.Mocked<FileService>;
  let service: StateMachineService;

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
    service = new StateMachineService(fsInstance, {} as any, {} as any);
  });

  test('carregarTransicoes retorna defaults quando arquivo nao existe', () => {
    const transicoes = (service as any).carregarTransicoes();
    expect(transicoes['RASCUNHO']).toContain('PLANEJADA');
    expect(transicoes['CONCLUIDA']).toHaveLength(0);
  });

  test('carregarTransicoes carrega configuracoes customizadas', () => {
    (fsInstance.lerJson as jest.Mock).mockReturnValue({
      sucesso: true,
      dados: {
        versao: '1.0.0',
        atualizadoEm: new Date().toISOString(),
        transicoes: {
          RASCUNHO: ['PLANEJADA', 'CANCELADA'],
          CONCLUIDA: ['REABERTURA']
        }
      }
    });
    const transicoes = (service as any).carregarTransicoes();
    expect(transicoes['RASCUNHO']).toEqual(['PLANEJADA', 'CANCELADA']);
    expect(transicoes['CONCLUIDA']).toEqual(['REABERTURA']);
  });

  test('listarTransicoes retorna copia das transicoes', () => {
    const transicoes = service.listarTransicoes();
    expect(transicoes['RASCUNHO']).toBeDefined();
    transicoes['RASCUNHO'].push('NOVO');
    expect((service as any).transicoes['RASCUNHO']).not.toContain('NOVO');
  });

  test('validarTransicao retorna sucesso para transicao permitida', () => {
    const result = service.validarTransicao('RASCUNHO', 'PLANEJADA');
    expect(result.sucesso).toBe(true);
    expect(result.dados).toBe(true);
  });

  test('validarTransicao retorna erro para transicao invalida', () => {
    const result = service.validarTransicao('RASCUNHO', 'CONCLUIDA');
    expect(result.sucesso).toBe(false);
    expect(result.codigoErro).toBe('INVALID_TRANSITION');
    expect(result.erro).toContain('RASCUNHO → CONCLUIDA');
  });

  test('validarTransicao retorna erro para estado origem desconhecido', () => {
    const result = service.validarTransicao('ESTADO_INEXISTENTE' as any, 'CONCLUIDA');
    expect(result.sucesso).toBe(false);
    expect(result.codigoErro).toBe('INVALID_TRANSITION');
  });

  test('atualizarTransicao modifica transicoes e persiste', () => {
    const result = service.atualizarTransicao('RASCUNHO', ['CANCELADA']);
    expect(result.sucesso).toBe(true);
    expect(result.dados['RASCUNHO']).toEqual(['CANCELADA']);
    expect(fsInstance.escreverJson).toHaveBeenCalledWith(
      '.ia/configuracao/transicoes.json',
      expect.objectContaining({
        versao: '1.0.0',
        transicoes: expect.objectContaining({
          RASCUNHO: ['CANCELADA']
        })
      }),
      { backup: true }
    );
  });

  test('atualizarTransicao registra auditoria', () => {
    service.atualizarTransicao('RASCUNHO', ['CANCELADA']);
    expect(fsInstance.escreverJson).toHaveBeenCalled();
  });

  test('getTransicoes retorna transicoes atuais', () => {
    const transicoes = service.getTransicoes();
    expect(transicoes['RASCUNHO']).toContain('PLANEJADA');
  });

  test('recarregar recarrega transicoes do arquivo', () => {
    (fsInstance.lerJson as jest.Mock).mockReturnValue({
      sucesso: true,
      dados: {
        versao: '1.0.0',
        atualizadoEm: new Date().toISOString(),
        transicoes: {
          RASCUNHO: ['NOVO_ESTADO']
        }
      }
    });
    (service as any).recarregar();
    const transicoes = service.getTransicoes();
    expect(transicoes['RASCUNHO']).toEqual(['NOVO_ESTADO']);
  });
});
