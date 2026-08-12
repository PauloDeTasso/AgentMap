import { spawn } from 'child_process';

const server = spawn('cmd', ['/c', 'npx', 'tsx', 'src/mcp-server/index.ts'], {
  cwd: 'G:\\PROJETOS\\WEB\\AgentMap\\backend',
  stdio: ['pipe', 'pipe', 'inherit']
});

let buffer = '';
let requestId = 1;
const results: any = {};

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
      if (msg.id && results[msg.id]) {
        results[msg.id](msg);
        delete results[msg.id];
      }
    } catch (e) {
      // ignore
    }
  }
});

function callTool(name: string, args: any = {}): Promise<any> {
  return new Promise((resolve) => {
    const id = requestId;
    results[id] = resolve;
    send({ jsonrpc: '2.0', method: 'tools/call', params: { name, arguments: args } });
  });
}

async function main() {
  send({ jsonrpc: '2.0', method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } } });
  await new Promise(r => setTimeout(r, 500));
  send({ jsonrpc: '2.0', method: 'initialized', params: {} });
  await new Promise(r => setTimeout(r, 200));

  const toolsToTest = [
    { name: 'agentmap_projetos_listar', args: {} },
    { name: 'agentmap_projetos_abrir', args: { caminhoOuId: 'G:\\PROJETOS\\AgenteMap_Projetos\\Projeto-Alpha' } },
    { name: 'agentmap_projetos_atual', args: {} },
    { name: 'agentmap_agentes_listar', args: {} },
    { name: 'agentmap_tarefas_listar', args: {} },
    { name: 'agentmap_obter_contexto_projeto', args: {} },
    { name: 'agentmap_arquivos_listar', args: { caminho: '.' } },
    { name: 'agentmap_workflows_obter_mapa_projeto', args: {} }
  ];

  for (const tool of toolsToTest) {
    console.log(`\n=== Testing ${tool.name} ===`);
    try {
      const result = await callTool(tool.name, tool.args);
      const text = result.result?.content?.[0]?.text || JSON.stringify(result.result);
      console.log(`SUCCESS: ${text.slice(0, 200)}`);
    } catch (e: any) {
      console.log(`ERROR: ${e.message || JSON.stringify(e)}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  server.kill();
  process.exit(0);
}

main();
