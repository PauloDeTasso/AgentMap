import { spawn } from 'child_process';
import { once } from 'events';

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

    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      const parsed = parseMessage(buffer);
      if (parsed && parsed.id !== undefined) {
        cleanup();
        clearTimeout(timer);
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
    console.log(`[SEND] ${JSON.stringify(msg)}`);
  });
}

async function main() {
  console.log('Starting MCP server stdio test...');
  const spawnOpts: Record<string, unknown> = {
    stdio: ['pipe', 'pipe', 'pipe']
  };
  if (isWin) spawnOpts.shell = true;
  const child = spawn(MCP_SERVER_CMD, MCP_SERVER_ARGS, spawnOpts);

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    if (text.trim()) {
      console.log(`[SERVER STDERR] ${text.trim()}`);
    }
  });

  let failed = false;

  const check = (label: string, condition: boolean) => {
    if (condition) {
      console.log(`[PASS] ${label}`);
    } else {
      console.log(`[FAIL] ${label}`);
      failed = true;
    }
  };

  try {
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

    const initResp = await sendMessage(child, initMsg);
    console.log(`[RECV] ${JSON.stringify(initResp)}`);

    check('initialize has result', 'result' in initResp && !('error' in initResp));

    const caps = (initResp.result as Record<string, unknown> | undefined)?.capabilities as Record<string, unknown> | undefined;
    check('capabilities exists', !!caps);
    check('resources.subscribe capability present', !!(caps && (caps['resources.subscribe'] || caps['resources'])));

    const initNotif: JsonRpcMessage = {
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    };
    child.stdin!.write(JSON.stringify(initNotif) + '\n');
    console.log(`[SEND] ${JSON.stringify(initNotif)}`);

    const subMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 2,
      method: 'resources/subscribe',
      params: { uri: 'agentmap://solicitacoes/backend' }
    };

    const subResp = await sendMessage(child, subMsg);
    console.log(`[RECV] ${JSON.stringify(subResp)}`);
    check('subscribe has result', 'result' in subResp && !('error' in subResp));

    const readMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 3,
      method: 'resources/read',
      params: { uri: 'agentmap://solicitacoes/backend' }
    };

    const readResp = await sendMessage(child, readMsg);
    console.log(`[RECV] ${JSON.stringify(readResp)}`);
    check('resources/read has result', 'result' in readResp && !('error' in readResp));

    const readResult = readResp.result as Record<string, unknown> | undefined;
    const contents = readResult?.contents as Array<Record<string, unknown>> | undefined;
    const text = contents?.[0]?.text as string | undefined;
    let parsedText: Record<string, unknown> | null = null;
    if (text) {
      try {
        parsedText = JSON.parse(text);
      } catch {
        parsedText = null;
      }
    }
    check('resources/read JSON has sucesso: true', parsedText?.sucesso === true);

    const unsubMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 4,
      method: 'resources/unsubscribe',
      params: { uri: 'agentmap://solicitacoes/backend' }
    };

    const unsubResp = await sendMessage(child, unsubMsg);
    console.log(`[RECV] ${JSON.stringify(unsubResp)}`);
    check('unsubscribe has result', 'result' in unsubResp && !('error' in unsubResp));

    const shutdownMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      method: 'shutdown'
    };

    child.stdin!.write(JSON.stringify(shutdownMsg) + '\n');
    console.log(`[SEND] ${JSON.stringify(shutdownMsg)}`);

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        resolve();
      }, MSG_TIMEOUT);
      child.on('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });

    console.log(failed ? 'Test FAILED' : 'Test PASSED');
    process.exit(failed ? 1 : 0);
  } catch (err) {
    console.log(`[ERROR] ${err instanceof Error ? err.message : String(err)}`);
    child.kill('SIGTERM');
    process.exit(1);
  }
}

main();
