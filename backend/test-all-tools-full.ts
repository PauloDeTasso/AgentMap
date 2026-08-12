import { spawn } from 'child_process';

const server = spawn('cmd', ['/c', 'npx', 'tsx', 'src/mcp-server/index.ts'], {
  cwd: 'G:\\PROJETOS\\WEB\\AgentMap\\backend',
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';
let requestId = 1;
const pending = new Map<number, (msg: any) => void>();
const results: any[] = [];

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
  const toolsResp = await call('tools/list', {});
  const tools = toolsResp.result?.tools || [];
  console.log(`Total tools: ${tools.length}`);

  for (const tool of tools) {
    const name = tool.name;
    const schema = tool.inputSchema || {};
    const required = schema.required || [];
    const props = schema.properties || {};
    const args: any = {};
    for (const key of required) {
      if (key === 'id' || key === 'tarefaId' || key === 'agenteId') {
        args[key] = 'test-id';
      } else if (key === 'caminhoOuId') {
        args[key] = 'G:\\PROJETOS\\AgenteMap_Projetos\\Projeto-Alpha';
      } else if (key === 'caminho') {
        args[key] = '.';
      } else if (key === 'nome') {
        args[key] = 'Test';
      } else if (key === 'email') {
        args[key] = 'test@example.com';
      } else if (key === 'telefone') {
        args[key] = '12345678';
      } else if (key === 'descricao') {
        args[key] = 'test';
      } else if (key === 'caminhoParental') {
        args[key] = 'G:\\PROJETOS\\AgenteMap_Projetos';
      } else if (key === 'resumo') {
        args[key] = 'test';
      } else if (key === 'dados') {
        args[key] = {};
      } else if (key === 'agenteId' && name === 'agentmap_solicitacoes_aprovar') {
        args[key] = 'test-id';
        args.observacao = 'test';
      } else if (key === 'motivo') {
        args[key] = 'test';
      } else if (key === 'resolucao') {
        args[key] = 'test';
      } else if (key === 'estadoFinal') {
        args[key] = 'CONCLUIDA';
      } else if (key === 'novoEstado') {
        args[key] = 'CONCLUIDA';
      } else if (key === 'termo') {
        args[key] = 'test';
      } else if (key === 'simbolo') {
        args[key] = 'test';
      } else if (key === 'diretorio') {
        args[key] = '.';
      } else if (key === 'limite') {
        args[key] = 10;
      } else if (key === 'projetoId') {
        args[key] = '0b8d5570-aa05-4f4b-8562-a9cd7d8a15b7';
      } else if (key === 'tarefaId') {
        args[key] = 'test-tarefa';
      } else if (key === 'criterios') {
        args[key] = {};
      } else if (key === 'sessaoId') {
        args[key] = 'test-sessao';
      } else if (key === 'dominio') {
        args[key] = 'test';
      } else if (key === 'conhecimentos') {
        args[key] = [];
      } else if (key === 'incluirProjetos') {
        args[key] = false;
      } else if (key === 'linhaInicio') {
        args[key] = 1;
      } else if (key === 'linhaFim') {
        args[key] = 10;
      } else if (props[key]?.type === 'string') {
        args[key] = 'test';
      } else if (props[key]?.type === 'boolean') {
        args[key] = false;
      } else if (props[key]?.type === 'number') {
        args[key] = 1;
      } else if (props[key]?.type === 'object') {
        args[key] = {};
      } else if (props[key]?.type === 'array') {
        args[key] = [];
      } else {
        args[key] = 'test';
      }
    }

    try {
      const result = await call('tools/call', { name, arguments: args }, 5000);
      const text = result.result?.content?.[0]?.text || JSON.stringify(result.result);
      const parsed = JSON.parse(text);
      const status = parsed.sucesso === false ? 'FAIL' : 'OK';
      results.push({ name, status, error: parsed.mensagem || parsed.codigo || null });
      console.log(`[${status}] ${name}${parsed.mensagem ? `: ${parsed.mensagem}` : ''}`);
    } catch (e: any) {
      results.push({ name, status: 'ERROR', error: e.message });
      console.log(`[ERROR] ${name}: ${e.message}`);
    }
  }

  const failed = results.filter(r => r.status !== 'OK');
  console.log(`\nTotal: ${results.length}, OK: ${results.length - failed.length}, Failed: ${failed.length}`);
  if (failed.length > 0) {
    console.log('Failed tools:', failed.map(f => f.name).join(', '));
  }

  server.kill();
}

main().catch(e => {
  console.error('Fatal:', e);
  server.kill();
  process.exit(1);
});
