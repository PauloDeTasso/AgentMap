import { EventEmitter } from 'events';
import { FileService } from '../src/arquivos/FileService';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { MonitoramentoService } from '../src/servicios/MonitoramentoService';

jest.mock('../src/arquivos/FileService');
jest.mock('../src/servicios/AuditoriaService');
jest.mock('../src/validacao/SchemaValidator');

const mockedFs = FileService as jest.MockedClass<typeof FileService>;

describe('MonitoramentoService — completo', () => {
  let fsInstance: jest.Mocked<FileService>;
  let service: MonitoramentoService;
  let configStore: any;
  let statusStore: Record<string, any>;
  let mensagensStore: any[];
  let sequenceStore: { ultimoSequence: number };

  beforeEach(() => {
    jest.clearAllMocks();
    configStore = {
      modoGlobal: 'MANUAL',
      ultimaAtualizacao: new Date().toISOString(),
      timeoutHeartbeat: 300000
    };
    statusStore = {};
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
        if (path.includes('monitoramento.json')) {
          return { sucesso: true, dados: { ...configStore } };
        }
        if (path.includes('.ia/contexto/status/')) {
          const match = path.match(/\/([^\/]+)\.json$/);
          if (match && statusStore[match[1]]) {
            return { sucesso: true, dados: { ...statusStore[match[1]] } };
          }
          return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
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
        if (path.includes('monitoramento.json')) {
          configStore = { ...(dados as any) };
          return { sucesso: true, dados: path };
        }
        if (path.includes('.ia/contexto/status/')) {
          const match = path.match(/\/([^\/]+)\.json$/);
          if (match) {
            statusStore[match[1]] = { ...(dados as any) };
          }
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

  test('carregarConfig retorna defaults quando arquivo não existe', () => {
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('monitoramento.json')) {
        return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const svc = new MonitoramentoService(fsInstance, {} as any, {} as any);
    const config = (svc as any).carregarConfig();
    expect(config.modoGlobal).toBe('MANUAL');
    expect(config.timeoutHeartbeat).toBe(300000);
  });

  test('alterarModo GLOBAL atualiza config e broadcast', () => {
    const result = service.alterarModo('AUTONOMA', 'GLOBAL');
    expect(result.sucesso).toBe(true);
    expect(result.dados?.modoGlobal).toBe('AUTONOMA');
    expect(fsInstance.escreverJson).toHaveBeenCalledWith(
      '.ia/configuracao/monitoramento.json',
      expect.objectContaining({ modoGlobal: 'AUTONOMA' })
    );
  });

  test('alterarModo AGENTE cria status padrão se não existir', () => {
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('monitoramento.json')) {
        return { sucesso: true, dados: configStore };
      }
      if (path.includes('.ia/contexto/status/')) {
        return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const result = service.alterarModo('AUTONOMA', 'AGENTE', 'agente-1');
    expect(result.sucesso).toBe(true);
    expect(fsInstance.escreverJson).toHaveBeenCalledWith(
      expect.stringContaining('agente-1.json'),
      expect.objectContaining({ id: 'agente-1', modo: 'AUTONOMA', status: 'DISPONIVEL' })
    );
  });

  test('alterarModo AGENTE atualiza status existente', () => {
    statusStore['agente-1'] = {
      id: 'agente-1',
      nome: 'agente-1',
      status: 'ATIVO',
      modo: 'MANUAL',
      ultimaAtividade: new Date().toISOString(),
      ultimoHeartbeat: new Date().toISOString()
    };
    const result = service.alterarModo('AUTONOMA', 'AGENTE', 'agente-1');
    expect(result.sucesso).toBe(true);
    expect(statusStore['agente-1'].modo).toBe('AUTONOMA');
  });

  test('alterarModo escopo inválido retorna erro', () => {
    const result = service.alterarModo('AUTONOMA', 'INVALIDO' as any);
    expect(result.sucesso).toBe(false);
    expect(result.codigoErro).toBe('INVALID_SCOPE');
  });

  test('atualizarStatusAgente cria status com dados completos', () => {
    const result = service.atualizarStatusAgente('agente-1', 'ATIVO', {
      tarefaId: 'TAR-001',
      tarefaTitulo: 'Teste',
      sessionId: 'ses-1',
      conteudo: 'Progresso',
      tipo: 'ATUALIZAR',
      progresso: 50,
      acoes: [{ label: 'Ver', comando: 'ver' }]
    });
    expect(result.sucesso).toBe(true);
    expect(statusStore['agente-1'].status).toBe('ATIVO');
    expect(statusStore['agente-1'].tarefaAtualId).toBe('TAR-001');
    expect(statusStore['agente-1'].tarefaAtualTitulo).toBe('Teste');
    expect(statusStore['agente-1'].sessionId).toBe('ses-1');
  });

  test('atualizarStatusAgente com conteúdo gera mensagem', () => {
    service.atualizarStatusAgente('agente-1', 'ATIVO', {
      conteudo: 'Teste',
      tipo: 'ATUALIZAR'
    });
    expect(mensagensStore).toHaveLength(1);
    expect(mensagensStore[0].tipo).toBe('ATUALIZAR');
  });

  test('listarAgentes retorna status padrão para agentes sem arquivo', () => {
    (fsInstance.listar as jest.Mock).mockReturnValue({
      sucesso: true,
      dados: [{ nome: 'agente-1', tipo: 'diretorio' }]
    });
    const agentes = service.listarAgentes();
    expect(agentes).toHaveLength(1);
    expect(agentes[0].id).toBe('agente-1');
    expect(agentes[0].status).toBe('DISPONIVEL');
  });

  test('listarAgentes retorna status existente quando há arquivo', () => {
    statusStore['agente-1'] = {
      id: 'agente-1',
      nome: 'agente-1',
      status: 'ATIVO',
      modo: 'MANUAL',
      ultimaAtividade: new Date().toISOString(),
      ultimoHeartbeat: new Date().toISOString()
    };
    (fsInstance.listar as jest.Mock).mockReturnValue({
      sucesso: true,
      dados: [{ nome: 'agente-1', tipo: 'diretorio' }]
    });
    const agentes = service.listarAgentes();
    expect(agentes).toHaveLength(1);
    expect(agentes[0].status).toBe('ATIVO');
  });

  test('registrarHeartbeat atualiza ultimoHeartbeat', () => {
    statusStore['agente-1'] = {
      id: 'agente-1',
      nome: 'agente-1',
      status: 'ATIVO',
      modo: 'MANUAL',
      ultimaAtividade: '2024-01-01T00:00:00.000Z',
      ultimoHeartbeat: '2024-01-01T00:00:00.000Z'
    };
    const before = new Date().toISOString();
    const result = service.registrarHeartbeat('agente-1');
    expect(result.sucesso).toBe(true);
    expect(statusStore['agente-1'].ultimoHeartbeat).not.toBe('2024-01-01T00:00:00.000Z');
  });

  test('registrarHeartbeat cria status padrão se não existir', () => {
    const result = service.registrarHeartbeat('agente-1');
    expect(result.sucesso).toBe(true);
    expect(statusStore['agente-1'].status).toBe('DISPONIVEL');
  });

  test('verificarOrfaos retorna agentes com heartbeat expirado', () => {
    configStore.timeoutHeartbeat = 1000;
    statusStore['agente-1'] = {
      id: 'agente-1',
      nome: 'agente-1',
      status: 'ATIVO',
      modo: 'MANUAL',
      ultimaAtividade: new Date(Date.now() - 2000).toISOString(),
      ultimoHeartbeat: new Date(Date.now() - 2000).toISOString()
    };
    (fsInstance.listar as jest.Mock).mockReturnValue({
      sucesso: true,
      dados: [{ nome: 'agente-1', tipo: 'diretorio' }]
    });
    const result = service.verificarOrfaos();
    expect(result.sucesso).toBe(true);
    expect(result.dados).toContain('agente-1');
  });

  test('marcarOrfaos atualiza status para ORFA', () => {
    configStore.timeoutHeartbeat = 1000;
    statusStore['agente-1'] = {
      id: 'agente-1',
      nome: 'agente-1',
      status: 'ATIVO',
      modo: 'MANUAL',
      ultimaAtividade: new Date(Date.now() - 2000).toISOString(),
      ultimoHeartbeat: new Date(Date.now() - 2000).toISOString()
    };
    (fsInstance.listar as jest.Mock).mockReturnValue({
      sucesso: true,
      dados: [{ nome: 'agente-1', tipo: 'diretorio' }]
    });
    const result = service.marcarOrfaos();
    expect(result.sucesso).toBe(true);
    expect(result.dados).toContain('agente-1');
    expect(statusStore['agente-1'].status).toBe('ORFA');
  });

  test('executarIntervencao comando inválido retorna erro', async () => {
    const result = await service.executarIntervencao('CMD_INVALIDO', {});
    expect(result.sucesso).toBe(false);
    expect(result.codigoErro).toBe('INVALID_COMMAND');
  });

  test('executarIntervencao comando válido registra mensagem', async () => {
    const result = await service.executarIntervencao('PAUSAR_TAREFA', { tarefaId: 'TAR-001' });
    expect(result.sucesso).toBe(true);
    expect(mensagensStore).toHaveLength(1);
    expect(mensagensStore[0].tipo).toBe('INTERVENCAO_USUARIO');
  });

  test('sanitizarConteudo remove environment_details', () => {
    const sanitizado = (service as any).sanitizarConteudo('teste <environment_details>segredo</environment_details> fim');
    expect(sanitizado).not.toContain('environment_details');
    expect(sanitizado).not.toContain('segredo');
  });

  test('broadcast emite evento no EventEmitter', () => {
    const listener = jest.fn();
    service.on('mensagem', listener);
    service.broadcast({
      id: 'MSG-1',
      timestamp: new Date().toISOString(),
      tipo: 'TESTE',
      emissor: 'sistema',
      conteudo: 'teste'
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('registrarKiloState persiste estado e broadcast', async () => {
    const estado = {
      descobertoEm: new Date().toISOString(),
      worktrees: [{ nome: 'wt-1', caminho: '/wt-1', branch: 'main' }],
      sessoes: [],
      agentes: []
    };
    const result = await service.registrarKiloState(estado as any);
    expect(result.sucesso).toBe(true);
    expect(fsInstance.escreverJson).toHaveBeenCalledWith(
      '.ia/contexto/kilo-state.json',
      estado
    );
  });

  test('obterKiloState retorna estado vazio se não existe', async () => {
    (fsInstance.lerJson as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('kilo-state.json')) {
        return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
      }
      return { sucesso: false, erro: 'not found', codigoErro: 'NOT_FOUND' };
    });
    const result = await service.obterKiloState();
    expect(result.sucesso).toBe(true);
    expect(result.dados?.worktrees).toHaveLength(0);
    expect(result.dados?.sessoes).toHaveLength(0);
  });

  test('broadcastKiloEvent emite mensagem', () => {
    const listener = jest.fn();
    service.on('mensagem', listener);
    service.broadcastKiloEvent('KILO_DESCOBERTO', { mensagem: 'Kilo descoberto' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].tipo).toBe('KILO_DESCOBERTO');
  });
});
