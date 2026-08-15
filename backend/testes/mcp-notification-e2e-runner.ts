import { spawn } from 'child_process';
import http from 'http';

const isWin = process.platform === 'win32';
const MCP_SERVER_CMD = isWin ? 'npx.cmd' : 'npx';
const MCP_SERVER_ARGS = ['tsx', 'src/mcp-server/index.ts'];
const MSG_TIMEOUT = 10000;

function parseMessage(data: Buffer) {
  const text = data.toString();
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { return JSON.parse(trimmed); } catch { continue; }
  }
  return null;
}

function sendMessage(child: ReturnType<typeof spawn>, msg: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.stdout!.off('data', onData);
      child.off('error', onError);
      reject(new Error('Timeout'));
    }, MSG_TIMEOUT);
    let buffer = Buffer.alloc(0);
    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      const parsed = parseMessage(buffer);
      if (parsed && parsed.id !== undefined) {
        clearTimeout(timer);
        child.stdout!.off('data', onData);
        child.off('error', onError);
        resolve(parsed);
      }
    };
    const onError = (err: Error) => {
      clearTimeout(timer);
      child.stdout!.off('data', onData);
      child.off('error', onError);
      reject(err);
    };
    child.stdout!.on('data', onData);
    child.on('error', onError);
    child.stdin!.write(JSON.stringify(msg) + '\n');
  });
}

function request(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request({
      hostname: 'localhost', port: 3150, path, method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '66c8fdbf4b21125643a54aa0796b65f0725ceb9e867af13adef4ceb30b7b20f1',
        Origin: 'http://localhost:3150',
        Referer: 'http://localhost:3150/',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        try { resolve(JSON.parse(text)); } catch { resolve(text); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const spawnOpts: any = { stdio: ['pipe', 'pipe', 'pipe'] };
  if (isWin) spawnOpts.shell = true;
  const child = spawn(MCP_SERVER_CMD, MCP_SERVER_ARGS, spawnOpts);
  child.stderr!.pipe(process.stderr);

  try {
    const openResult = await request('POST', '/api/projetos/be207475-5c3b-44ed-8073-a04b92fcf2d4/abrir', {});
    if ((openResult as any).sucesso !== true) throw new Error('Failed to open project');

    const notificationPromise = new Promise<any>((resolve) => {
      let notifBuffer = Buffer.alloc(0);
      const handler = (chunk: Buffer) => {
        notifBuffer = Buffer.concat([notifBuffer, chunk]);
        const parsed = parseMessage(notifBuffer);
        console.error('[DEBUG] notification chunk:', chunk.toString());
        console.error('[DEBUG] notification parsed:', parsed);
        if (parsed && parsed.method === 'notifications/resources/updated') {
          resolve(parsed);
        }
      };
      child.stdout!.on('data', handler);
      setTimeout(() => {
        child.stdout!.off('data', handler);
        resolve(null);
      }, 1000);
    });

    const initResp = await sendMessage(child, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'final-test', version: '1.0' } } });
    if (!('result' in initResp) || 'error' in initResp) throw new Error('initialize failed');

    child.stdin!.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

    const subResp = await sendMessage(child, { jsonrpc: '2.0', id: 2, method: 'resources/subscribe', params: { uri: 'agentmap://handoffs/frontend' } });
    if (!('result' in subResp) || 'error' in subResp) throw new Error('subscribe failed');

    const handoffId = 'HOF-2026-' + Date.now();
    const createResp = await sendMessage(child, {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'agentmap_handoffs_criar',
        arguments: {
          dados: {
            id: handoffId,
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
            datas: { criadaEm: new Date().toISOString(), aceitaEm: null, concluidaEm: null }
          }
        }
      }
    });
    console.error('[DEBUG] createResp:', JSON.stringify(createResp));
    if (!('result' in createResp) || 'error' in createResp) throw new Error('handoff creation failed');

    const notification = await notificationPromise;
    if (!notification) throw new Error('No notification received within 1s');

    const readResp = await sendMessage(child, { jsonrpc: '2.0', id: 3, method: 'resources/read', params: { uri: 'agentmap://handoffs/frontend' } });
    if (!('result' in readResp) || 'error' in readResp) throw new Error('read failed');

    const readResult = (readResp as any).result;
    const contents = readResult?.contents;
    const text = contents?.[0]?.text;
    let parsed: any = null;
    if (text) { try { parsed = JSON.parse(text); } catch { parsed = null; } }
    if (parsed?.sucesso !== true) throw new Error('read JSON sucesso != true');
    const dados = parsed?.dados;
    if (!dados?.some((h: any) => h.destino === 'frontend' && h.resumo === 'E2E test handoff')) {
      throw new Error('handoff not found in resource read');
    }

    const unsubResp = await sendMessage(child, { jsonrpc: '2.0', id: 4, method: 'resources/unsubscribe', params: { uri: 'agentmap://handoffs/frontend' } });
    if (!('result' in unsubResp) || 'error' in unsubResp) throw new Error('unsubscribe failed');

    child.stdin!.write(JSON.stringify({ jsonrpc: '2.0', method: 'shutdown' }) + '\n');
    console.log('E2E TEST PASSED');
    process.exit(0);
  } catch (err) {
    console.error('E2E TEST FAILED:', err instanceof Error ? err.message : String(err));
    child.kill('SIGTERM');
    process.exit(1);
  }
}

main();
