import { EventEmitter } from 'events';
import { FileService } from '../src/arquivos/FileService';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { MonitoramentoService } from '../src/servicios/MonitoramentoService';

jest.mock('../src/arquivos/FileService');
jest.mock('../src/servicios/AuditoriaService');
jest.mock('../src/validacao/SchemaValidator');

const mockedFs = FileService as jest.MockedClass<typeof FileService>;

describe('MonitoramentoService — eventSequence', () => {
  let fsInstance: jest.Mocked<FileService>;
  let service: MonitoramentoService;
  let mensagensStore: any[];
  let sequenceStore: { ultimoSequence: number };

  beforeEach(() => {
    jest.clearAllMocks();
    mensagensStore = [];
    sequenceStore = { ultimoSequence: 0 };

    fsInstance = {
      lerJson: jest.fn((path: string) => {
        if (path.includes('monitoramento-sequence.json')) {
          return { sucesso: true, dados: { ...sequenceStore } };
        }
        if (path.includes('mensagens-monitoramento.json')) {
          return { sucesso: true, dados: [...mensagensStore] };
        }
        return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
      }),
      escreverJson: jest.fn((path: string, dados: any) => {
        if (path.includes('monitoramento-sequence.json')) {
          sequenceStore = { ...(dados as any) };
          return { sucesso: true, dados: path };
        }
        if (path.includes('mensagens-monitoramento.json')) {
          mensagensStore = [...(dados as any[])];
          return { sucesso: true, dados: path };
        }
        return { sucesso: true, dados: path };
      }),
      listar: jest.fn(() => ({ sucesso: true, dados: [] })),
      criarDiretorio: jest.fn(() => ({ sucesso: true, dados: '' })),
      existe: jest.fn(() => true),
      ler: jest.fn(() => ({ sucesso: true, dados: '{}' })),
      escrever: jest.fn(() => ({ sucesso: true, dados: '' })),
      excluir: jest.fn(() => ({ sucesso: true, dados: '' }))
    } as any;

    service = new MonitoramentoService(fsInstance, {} as any, {} as any);
  });

  test('incrementa eventSequence a cada mensagem', () => {
    service.adicionarMensagem({
      id: 'MSG-1',
      timestamp: new Date().toISOString(),
      tipo: 'KILO_CHAT_REPLY',
      emissor: 'filho',
      conteudo: 'msg1'
    });
    service.adicionarMensagem({
      id: 'MSG-2',
      timestamp: new Date().toISOString(),
      tipo: 'KILO_CHAT_REPLY',
      emissor: 'filho',
      conteudo: 'msg2'
    });

    const msgs = service.listarMensagens(10);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].eventSequence).toBe(2);
    expect(msgs[1].eventSequence).toBe(1);
  });

  test('listarMensagensApos retorna apenas mensagens novas', () => {
    service.adicionarMensagem({
      id: 'MSG-1',
      timestamp: new Date().toISOString(),
      tipo: 'KILO_CHAT_REPLY',
      emissor: 'filho',
      conteudo: 'msg1'
    });
    service.adicionarMensagem({
      id: 'MSG-2',
      timestamp: new Date().toISOString(),
      tipo: 'KILO_CHAT_REPLY',
      emissor: 'filho',
      conteudo: 'msg2'
    });
    service.adicionarMensagem({
      id: 'MSG-3',
      timestamp: new Date().toISOString(),
      tipo: 'KILO_CHAT_REPLY',
      emissor: 'filho',
      conteudo: 'msg3'
    });

    const result = service.listarMensagensApos(1, 10);
    expect(result.mensagens).toHaveLength(2);
    expect(result.mensagens[0].conteudo).toBe('msg2');
    expect(result.mensagens[1].conteudo).toBe('msg3');
    expect(result.ultimoEventSequence).toBe(3);
  });

  test('listarMensagensApos com after maior que ultimo retorna vazio', () => {
    service.adicionarMensagem({
      id: 'MSG-1',
      timestamp: new Date().toISOString(),
      tipo: 'KILO_CHAT_REPLY',
      emissor: 'filho',
      conteudo: 'msg1'
    });

    const result = service.listarMensagensApos(10, 10);
    expect(result.mensagens).toHaveLength(0);
    expect(result.ultimoEventSequence).toBe(1);
  });

  test('persiste sequence em arquivo', () => {
    service.adicionarMensagem({
      id: 'MSG-1',
      timestamp: new Date().toISOString(),
      tipo: 'KILO_CHAT_REPLY',
      emissor: 'filho',
      conteudo: 'msg1'
    });

    expect(fsInstance.escreverJson).toHaveBeenCalledWith(
      '.ia/contexto/monitoramento-sequence.json',
      { ultimoSequence: 1 }
    );
  });

  test('carrega sequence existente do arquivo', () => {
    sequenceStore = { ultimoSequence: 42 };
    mensagensStore = [];

    const svc = new MonitoramentoService(fsInstance, {} as any, {} as any);
    svc.adicionarMensagem({
      id: 'MSG-1',
      timestamp: new Date().toISOString(),
      tipo: 'KILO_CHAT_REPLY',
      emissor: 'filho',
      conteudo: 'msg1'
    });

    const msgs = svc.listarMensagens(10);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].eventSequence).toBe(43);
  });
});
