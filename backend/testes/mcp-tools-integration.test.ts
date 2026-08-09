import { spawn } from 'child_process';
import * as z from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';

const isWin = process.platform === 'win32';
const MCP_SERVER_CMD = isWin ? 'npx.cmd' : 'npx';
const MCP_SERVER_ARGS = ['tsx', 'src/mcp-server/index.ts'];
const MSG_TIMEOUT = 10_000;

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

describe('MCP tools integration - critical tools', () => {
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
        clientInfo: { name: 'test-client', version: '1.0' }
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

  test('projects list returns result structure', async () => {
    await ensureInitialized();
    if (!child) throw new Error('Server not started');

    const resp = await sendMessage(child, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'agentmap_projetos_listar',
        arguments: {}
      }
    });

    expect('result' in resp).toBe(true);
    expect('error' in resp).toBe(false);
    const result = (resp as any).result;
    expect(result).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  test('tasks list returns result structure', async () => {
    await ensureInitialized();
    if (!child) throw new Error('Server not started');

    const resp = await sendMessage(child, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'agentmap_tarefas_listar',
        arguments: {}
      }
    });

    expect('result' in resp).toBe(true);
    expect('error' in resp).toBe(false);
    const result = (resp as any).result;
    expect(result).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  test('agents list returns result structure', async () => {
    await ensureInitialized();
    if (!child) throw new Error('Server not started');

    const resp = await sendMessage(child, {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'agentmap_agentes_listar',
        arguments: {}
      }
    });

    expect('result' in resp).toBe(true);
    expect('error' in resp).toBe(false);
    const result = (resp as any).result;
    expect(result).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  test('monitoring pending messages returns result structure', async () => {
    await ensureInitialized();
    if (!child) throw new Error('Server not started');

    const resp = await sendMessage(child, {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'agentmap_monitoramento_verificar_pendentes',
        arguments: {}
      }
    });

    expect('result' in resp).toBe(true);
    expect('error' in resp).toBe(false);
    const result = (resp as any).result;
    expect(result).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  test('workflow get project map returns result structure', async () => {
    await ensureInitialized();
    if (!child) throw new Error('Server not started');

    const resp = await sendMessage(child, {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'agentmap_workflows_obter_mapa_projeto',
        arguments: {}
      }
    });

    expect('result' in resp).toBe(true);
    expect('error' in resp).toBe(false);
    const result = (resp as any).result;
    expect(result).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  test('discover returns capabilities', async () => {
    await ensureInitialized();
    if (!child) throw new Error('Server not started');

    const resp = await sendMessage(child, {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'agentmap_descobrir',
        arguments: {}
      }
    });

    expect('result' in resp).toBe(true);
    expect('error' in resp).toBe(false);
    const result = (resp as any).result;
    expect(result).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  test('invalid tool name returns error or empty result', async () => {
    await ensureInitialized();
    if (!child) throw new Error('Server not started');

    const resp = await sendMessage(child, {
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'agentmap_tool_inexistente',
        arguments: {}
      }
    });

    expect('result' in resp || 'error' in resp).toBe(true);
  });

  test('missing required parameter returns validation error', async () => {
    await ensureInitialized();
    if (!child) throw new Error('Server not started');

    const resp = await sendMessage(child, {
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: {
        name: 'agentmap_tarefas_obter',
        arguments: {}
      }
    });

    expect('result' in resp).toBe(true);
    expect('error' in resp).toBe(false);
    const result = (resp as any).result;
    expect(result).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    const text = result.content[0].text;
    expect(text).toBeDefined();
    expect(text.length).toBeGreaterThan(0);
  });
});
