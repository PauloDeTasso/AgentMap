import { spawn } from 'child_process';

const server = spawn('cmd', ['/c', 'npx', 'tsx', 'src/mcp-server/index.ts'], {
  cwd: 'G:\\PROJETOS\\WEB\\AgentMap\\backend',
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';
let requestId = 1;
const pending = new Map<number, (msg: any) => void>();

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)!(msg);
        pending.delete(msg.id);
      }
    } catch {}
  }
});

server.stderr.on('data', (data) => {
  process.stderr.write(data);
});

function call(method: string, params: any = {}, timeout = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = requestId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`timeout on ${method}`));
    }, timeout);
    pending.set(id, (msg) => {
      clearTimeout(timer);
      resolve(msg);
    });
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params, id }) + '\n');
  });
}

async function main() {
  await call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } });
  await call('initialized', {});

  const openResult = await call('tools/call', { name: 'agentmap_projetos_abrir', arguments: { caminhoOuId: 'G:\\PROJETOS\\AgenteMap_Projetos\\Projeto-Alpha' } });
  console.log('OPEN:', openResult.result.content[0].text.slice(0, 200));

  const atualResult = await call('tools/call', { name: 'agentmap_projetos_atual', arguments: {} });
  console.log('ATUAL:', atualResult.result.content[0].text);

  const closeResult = await call('tools/call', { name: 'agentmap_projetos_fechar', arguments: { id: '0b8d5570-aa05-4f4b-8562-a9cd7d8a15b7' } });
  console.log('CLOSE:', closeResult.result.content[0].text);

  server.kill();
}

main().catch(e => {
  console.error(e);
  server.kill();
  process.exit(1);
});
