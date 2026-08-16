import { spawn } from 'child_process';
import http from 'http';
import { EventEmitter } from 'events';

const isWin = process.platform === 'win32';
const MCP_SERVER_CMD = isWin ? 'npx.cmd' : 'npx';
const MCP_SERVER_ARGS = ['tsx', 'src/mcp-server/index.ts'];
const MSG_TIMEOUT = 10_000;
const TEST_TIMEOUT = 15_000;
const API_BASE = 'http://localhost:3150';
const API_KEY = '66c8fdbf4b21125643a54aa0796b65f0725ceb9e867af13adef4ceb30b7b20f1';

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

function sendMessage(
  child: ReturnType<typeof spawn>,
  msg: JsonRpcMessage,
  signal: AbortSignal
): Promise<JsonRpcMessage> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('Aborted'));
      return;
    }

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

    signal.addEventListener('abort', () => {
      cleanup();
      clearTimeout(timer);
      reject(new Error('Aborted'));
    });

    child.stdout!.on('data', onData);
    child.on('error', onError);

    const payload = JSON.stringify(msg) + '\n';
    child.stdin!.write(payload);
  });
}

function request(method: string, path: string, body?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          Origin: url.origin,
          Referer: url.origin + '/',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
        }
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString();
          try {
            resolve(JSON.parse(text));
          } catch {
            resolve(text);
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

describe('MCP notifications e2e', () => {
  let child: ReturnType<typeof spawn> | undefined;
  let abortController: AbortController | undefined;

  const spawnOpts: Record<string, unknown> = {
    stdio: ['pipe', 'pipe', 'pipe']
  };
  if (isWin) spawnOpts.shell = true;

  beforeEach(() => {
    child = spawn(MCP_SERVER_CMD, MCP_SERVER_ARGS, spawnOpts);
    abortController = new AbortController();
  });

  afterEach(async () => {
    if (abortController) abortController.abort();
    if (child) {
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }
      await new Promise<void>((resolve) => {
        const onExit = () => {
          if (child) {
            child.off('exit', onExit);
            child.off('error', onError);
          }
          resolve();
        };
        const onError = () => {
          if (child) {
            child.off('exit', onExit);
            child.off('error', onError);
          }
          resolve();
        };
        if (child) {
          child.on('exit', onExit);
          child.on('error', onError);
        }
        setTimeout(resolve, 3000);
      });
      child = undefined;
    }
  });

  test.skip('receives resource updated notification on handoff creation', async () => {
    const health = await request('GET', '/api/status') as any;
    if (health?.sucesso !== true) {
      pending('Backend não está rodando em http://localhost:3150 — pulando e2e');
    }

    if (!child || !abortController) throw new Error('Setup failed');

    const notificationPromise = new Promise<JsonRpcMessage | null>((resolve) => {
      const handler = (chunk: Buffer) => {
        const parsed = parseMessage(chunk);
        if (parsed && parsed.method === 'notifications/resources/updated') {
          resolve(parsed);
        }
      };
      child!.stdout!.on('data', handler);
      setTimeout(() => {
        child!.stdout!.off('data', handler);
        resolve(null);
      }, 1000);
    });

    const initMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'final-test', version: '1.0' }
      }
    };

    const initResp = await sendMessage(child!, initMsg, abortController.signal);
    expect('result' in initResp).toBe(true);
    expect('error' in initResp).toBe(false);

    const initNotif: JsonRpcMessage = {
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    };
    child!.stdin!.write(JSON.stringify(initNotif) + '\n');

    const openResult = (await request('POST', '/api/projetos/be207475-5c3b-44ed-8073-a04b92fcf2d4/abrir', {})) as Record<string, unknown>;
    expect(openResult.sucesso).toBe(true);

    const subMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 2,
      method: 'resources/subscribe',
      params: { uri: 'agentmap://handoffs/frontend' }
    };

    const subResp = await sendMessage(child!, subMsg, abortController.signal);
    expect('result' in subResp).toBe(true);
    expect('error' in subResp).toBe(false);

    const createResult = (await request('POST', '/api/handoffs', {
      id: 'HOF-2026-00001',
      origem: 'backend',
      destino: 'frontend',
      tarefaId: null,
      resumo: 'E2E test handoff',
      concluido: [],
      pendente: [],
      artefatos: [],
      decisoes: [],
      alteracoes: [],
      riscos: [],
      bloqueios: [],
      observacoes: null,
      estado: 'PENDENTE',
      datas: { criadaEm: '2026-08-15T19:35:00.000Z', aceitaEm: null, concluidaEm: null }
    })) as Record<string, unknown>;

    expect(createResult.sucesso).toBe(true);

    const notification = await notificationPromise;
    expect(notification).not.toBeNull();
    expect(notification?.method).toBe('notifications/resources/updated');
    expect(notification?.params).toBeDefined();

    const readMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 3,
      method: 'resources/read',
      params: { uri: 'agentmap://handoffs/frontend' }
    };

    const readResp = await sendMessage(child!, readMsg, abortController.signal);
    expect('result' in readResp).toBe(true);
    expect('error' in readResp).toBe(false);

    const readResult = readResp.result as Record<string, unknown> | undefined;
    const contents = readResult?.contents as Array<Record<string, unknown>> | undefined;
    const text = contents?.[0]?.text as string | undefined;
    let parsed: Record<string, unknown> | null = null;
    if (text) {
      try { parsed = JSON.parse(text); } catch { parsed = null; }
    }
    expect(parsed?.sucesso).toBe(true);
    const dados = parsed?.dados as Array<Record<string, unknown>> | undefined;
    expect(dados?.length).toBeGreaterThanOrEqual(1);
    const exists = dados?.some((h) => h.destino === 'frontend' && h.resumo === 'E2E test handoff');
    expect(exists).toBe(true);

    const unsubMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 4,
      method: 'resources/unsubscribe',
      params: { uri: 'agentmap://handoffs/frontend' }
    };

    const unsubResp = await sendMessage(child!, unsubMsg, abortController.signal);
    expect('result' in unsubResp).toBe(true);
    expect('error' in unsubResp).toBe(false);

    const shutdownMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      method: 'shutdown'
    };
    child!.stdin!.write(JSON.stringify(shutdownMsg) + '\n');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, TEST_TIMEOUT);
});

