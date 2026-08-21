import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const isWin = process.platform === 'win32';
const MCP_SERVER_CMD = isWin ? 'npx.cmd' : 'npx';
const MCP_SERVER_ARGS = ['tsx', 'src/mcp-server/index.ts'];
const MSG_TIMEOUT = 15_000;

interface JsonRpcMessage {
  jsonrpc?: string;
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { message?: string; code?: number };
}

function parseMessage(data: Buffer): JsonRpcMessage | null {
  const text = data.toString();
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      return JSON.parse(trimmed) as JsonRpcMessage;
    } catch {
      continue;
    }
  }
  return null;
}

async function sendMessage(child: ReturnType<typeof spawn>, msg: JsonRpcMessage): Promise<JsonRpcMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for response to message id=${msg.id}`));
    }, MSG_TIMEOUT);

    let buffer = Buffer.alloc(0);
    let resolved = false;

    const onData = (chunk: Buffer) => {
      if (resolved) return;
      buffer = Buffer.concat([buffer, chunk]);
      const parsed = parseMessage(buffer);
      if (parsed && parsed.id !== undefined) {
        cleanup();
        clearTimeout(timer);
        resolved = true;
        resolve(parsed);
      }
    };

    const onError = (err: Error) => {
      cleanup();
      clearTimeout(timer);
      reject(err);
    };

    const cleanup = () => {
      child.stdout!.off('data', onData);
      child.off('error', onError);
    };

    child.stdout!.on('data', onData);
    child.on('error', onError);

    const payload = JSON.stringify(msg) + '\n';
    child.stdin!.write(payload);
  });
}

function criarProjetoTemporario(): { tmpDir: string; projetoId: string; cleanup: () => void } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentmap-mcp-externo-test-'));
  const iaDir = path.join(tmpDir, '.ia');

  const dirs = [
    'contratos', 'tarefas', 'dependencias', 'solicitacoes', 'handoffs',
    'estado', 'auditoria', 'monitoramento', 'configuracao', 'eventos', 'contexto',
    'procedimentos', 'agentes', 'conhecimento', 'decisoes', 'riscos', 'bloqueios',
    'reservas', 'sessoes', 'checkpoints', 'aprendizados', 'validacoes', 'contatos',
    'artefatos', 'resultados', 'criterios'
  ];
  for (const d of dirs) {
    fs.mkdirSync(path.join(iaDir, d), { recursive: true });
  }

  fs.writeFileSync(path.join(iaDir, 'fluxo-trabalho.md'), '# Fluxo\n');

  const projetoId = 'PROJ-EXT-' + Date.now();
  const config = {
    id: projetoId,
    nome: 'Projeto Externo Teste',
    descricao: 'Projeto temporário para validação MCP externa',
    versao: '1.0.0',
    estado: 'ativo',
    idioma: 'pt-BR',
    fusoHorario: 'America/Sao_Paulo',
    proprietario: { tipo: 'humano', nome: 'Frontend Tester' },
    objetivos: ['Validar tools MCP para projetos externos'],
    escopo: { incluso: ['teste mcp'], excluido: [] },
    tecnologias: { frontend: [], backend: [], android: [], bancoDeDados: [], infraestrutura: [], testes: [] },
    ambiente: 'desenvolvimento',
    arquiteturas: [],
    padroes: [],
    diretorios: {},
    configuracaoIa: { diretorio: '/.ia', contratoPrincipal: '/.ia/contratos/contrato-projeto.json', estadoAtual: '/.ia/estado/estado-atual.json' },
    datas: { criacao: new Date().toISOString(), ultimaAtualizacao: new Date().toISOString() }
  };
  fs.writeFileSync(path.join(iaDir, 'configuracao', 'projeto.json'), JSON.stringify(config, null, 2), 'utf-8');
  fs.writeFileSync(path.join(iaDir, 'auditoria', 'eventos.json'), JSON.stringify({ eventos: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(iaDir, 'contratos', 'contratos.json'), JSON.stringify({ contratos: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(iaDir, 'tarefas', 'tarefas.json'), JSON.stringify({ tarefas: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(iaDir, 'dependencias', 'dependencias.json'), JSON.stringify({ dependencias: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(iaDir, 'estado', 'estado-atual.json'), JSON.stringify({ projetoId }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(iaDir, 'agentes', 'agentes.json'), JSON.stringify({ agentes: [] }, null, 2), 'utf-8');

  return {
    tmpDir,
    projetoId,
    cleanup: () => {
      try {
        const localDir = path.join(__dirname, '..', '.local');
        const registroPath = path.join(localDir, 'registro-projetos.json');
        if (fs.existsSync(registroPath)) {
          const registro = JSON.parse(fs.readFileSync(registroPath, 'utf-8'));
          registro.projetos = registro.projetos.filter((p: any) => p.id !== projetoId && p.caminhoRaiz !== tmpDir);
          if (registro.projetoAtual === projetoId) {
            registro.projetoAtual = null;
          }
          fs.writeFileSync(registroPath, JSON.stringify(registro, null, 2), 'utf-8');
        }
      } catch (e) {
        console.warn('Cleanup warning:', e);
      }
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('Cleanup warning:', e);
      }
    }
  };
}

describe('MCP tools integration - external project validation', () => {
  jest.setTimeout(30000);
  let child: ReturnType<typeof spawn> | undefined;
  let initialized = false;

  const spawnOpts: Record<string, unknown> = {
    stdio: ['pipe', 'pipe', 'pipe']
  };
  if (isWin) spawnOpts.shell = true;

  async function ensureInitialized() {
    if (initialized) return;
    child = spawn(MCP_SERVER_CMD, MCP_SERVER_ARGS, spawnOpts);

    const initMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test-client-externo', version: '1.0' }
      }
    };

    const initResp = await sendMessage(child, initMsg);
    expect('result' in initResp).toBe(true);
    expect('error' in initResp).toBe(false);

    const initNotif: JsonRpcMessage = {
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    };
    child.stdin!.write(JSON.stringify(initNotif) + '\n');
    initialized = true;
  }

  afterAll(async () => {
    if (child) {
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }
    }
  });

  test('abre projeto externo e valida tools MCP', async () => {
    const projeto = criarProjetoTemporario();
    try {
      await ensureInitialized();
      if (!child) throw new Error('Server not started');

      const abrirMsg: JsonRpcMessage = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'agentmap_projetos_abrir',
          arguments: { caminhoOuId: projeto.tmpDir }
        }
      };

      const abrirResp = await sendMessage(child, abrirMsg);
      expect('error' in abrirResp).toBe(false);
      expect('result' in abrirResp).toBe(true);

      const abrirResult = (abrirResp as any).result;
      const abrirText = abrirResult.content[0].text;
      let abrirData: any;
      try { abrirData = JSON.parse(abrirText); } catch { abrirData = abrirText; }

      expect(abrirData.nome).toBe('Projeto Externo Teste');
      expect(abrirData.caminhoRaiz).toBe(projeto.tmpDir);

      const ctxMsg: JsonRpcMessage = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'agentmap_obter_contexto_projeto',
          arguments: {}
        }
      };

      const ctxResp = await sendMessage(child, ctxMsg);
      expect('error' in ctxResp).toBe(false);
      expect('result' in ctxResp).toBe(true);

      const ctxResult = (ctxResp as any).result;
      const ctxText = ctxResult.content[0].text;
      let ctxData: any;
      try { ctxData = JSON.parse(ctxText); } catch { ctxData = ctxText; }

      expect(ctxData.projeto.nome).toBe('Projeto Externo Teste');

      const agentesMsg: JsonRpcMessage = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'agentmap_agentes_listar',
          arguments: {}
        }
      };

      const agentesResp = await sendMessage(child, agentesMsg);
      expect('error' in agentesResp).toBe(false);
      expect('result' in agentesResp).toBe(true);

      const agentesResult = (agentesResp as any).result;
      const agentesText = agentesResult.content[0].text;
      let agentesData: any;
      try { agentesData = JSON.parse(agentesText); } catch { agentesData = agentesText; }

      expect(Array.isArray(agentesData)).toBe(true);

      const tarefasMsg: JsonRpcMessage = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'agentmap_tarefas_listar',
          arguments: {}
        }
      };

      const tarefasResp = await sendMessage(child, tarefasMsg);
      expect('error' in tarefasResp).toBe(false);
      expect('result' in tarefasResp).toBe(true);

      const tarefasResult = (tarefasResp as any).result;
      const tarefasText = tarefasResult.content[0].text;
      let tarefasData: any;
      try { tarefasData = JSON.parse(tarefasText); } catch { tarefasData = tarefasText; }

      expect(Array.isArray(tarefasData)).toBe(true);
    } finally {
      projeto.cleanup();
    }
  });
});
