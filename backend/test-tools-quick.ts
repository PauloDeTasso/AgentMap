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

function callTool(name: string, args: any = {}, timeout = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = requestId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('timeout'));
    }, timeout);
    pending.set(id, (msg) => {
      clearTimeout(timer);
      resolve(msg);
    });
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', params: { name, arguments: args }, id }) + '\n');
  });
}

async function main() {
  await callTool('agentmap_projetos_listar', {}, 2000);
  await callTool('agentmap_projetos_abrir', { caminhoOuId: 'G:\\PROJETOS\\AgenteMap_Projetos\\Projeto-Alpha' }, 2000);
  await callTool('agentmap_projetos_atual', {}, 2000);
  await callTool('agentmap_agentes_listar', {}, 2000);
  await callTool('agentmap_tarefas_listar', {}, 2000);
  await callTool('agentmap_arquivos_listar', { caminho: '.' }, 2000);
  await callTool('agentmap_workflows_obter_mapa_projeto', {}, 2000);
  await callTool('agentmap_obter_contexto_projeto', {}, 2000);
  server.kill();
  console.log('Test complete');
}

main().catch(e => {
  console.error('Fatal:', e);
  server.kill();
  process.exit(1);
});
