import { spawn } from 'child_process';
import { readFileSync } from 'fs';

const server = spawn('cmd', ['/c', 'npx', 'tsx', 'src/mcp-server/index.ts'], {
  cwd: 'G:\\PROJETOS\\WEB\\AgentMap\\backend',
  stdio: ['pipe', 'pipe', 'inherit']
});

let buffer = '';
let requestId = 1;

function send(msg: any) {
  const payload = JSON.stringify({ ...msg, id: requestId++ });
  server.stdin.write(payload + '\n');
  return payload;
}

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      console.log('RECV:', JSON.stringify(msg, null, 2));
      if (msg.id === 1) {
        send({ jsonrpc: '2.0', method: 'initialized', params: {} });
        send({ jsonrpc: '2.0', method: 'tools/list', params: {} });
      } else if (msg.id === 2) {
        console.log('\n=== TOOLS ===');
        console.log(JSON.stringify(msg.result?.tools, null, 2));
        send({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'agentmap_projetos_listar', arguments: {} } });
      } else if (msg.id === 3) {
        console.log('\n=== PROJETOS_LISTAR RESULT ===');
        console.log(JSON.stringify(msg.result, null, 2));
        server.kill();
        process.exit(0);
      }
    } catch (e) {
      // ignore partial lines
    }
  }
});

send({ jsonrpc: '2.0', method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } } });

setTimeout(() => {
  console.log('Timeout waiting for response');
  process.exit(1);
}, 10000);
