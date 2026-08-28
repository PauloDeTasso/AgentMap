/**
 * Script: measure-cold-start.ts
 *
 * Mede o tempo de cold start do MCP Server.
 * Executa o servidor via stdio e mede o tempo até a primeira resposta.
 *
 * Uso: npm run perf:coldstart
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const MCP_SERVER_PATH = path.resolve(__dirname, '..', 'src', 'mcp-server', 'index.ts');
const TSX_PATH = path.resolve(__dirname, '..', 'node_modules', '.bin', 'tsx');

interface JsonRpcRequest {
  jsonrpc: string;
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string };
}

function createTempProject(): string {
  const tmpDir = path.join(os.tmpdir(), `agentmap-perf-test-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(path.join(tmpDir, '.ia'), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, '.ia', 'agentmap.json'),
    JSON.stringify({ agentMap: { name: 'AgentMap', version: '2.0.0', schemaVersion: '1.0' } }, null, 2),
    'utf-8'
  );
  return tmpDir;
}

function measureColdStart(): Promise<{ startTime: number; initTime: number; totalTime: number }> {
  return new Promise((resolve, reject) => {
    const tmpDir = createTempProject();
    const startTime = Date.now();

    const proc = spawn('node', ['--import', TSX_PATH, MCP_SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test', AGENTMAP_PROJECT_ROOT: tmpDir },
    });

    let initTime = 0;
    let responseReceived = false;

    const rl = require('readline').createInterface({
      input: proc.stdout,
      terminal: false,
    });

    rl.on('line', (line: string) => {
      if (!line.trim()) return;
      try {
        const response = JSON.parse(line) as JsonRpcResponse;
        if (response.id === 1 && !responseReceived) {
          responseReceived = true;
          initTime = Date.now() - startTime;

          // Envia SIGTERM para encerrar
          proc.kill('SIGTERM');

          // Cleanup
          try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
          } catch {
            // ignore
          }

          resolve({
            startTime: 0,
            initTime,
            totalTime: initTime,
          });
        }
      } catch {
        // ignore non-JSON lines
      }
    });

    // Envia initialize request
    const initRequest: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'perf-test', version: '1.0.0' },
      },
    };

    proc.stdin.write(JSON.stringify(initRequest) + '\n');

    // Timeout de 10s
    setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('Cold start timeout exceeded 10s'));
    }, 10000);
  });
}

async function main() {
  console.log('\n=== AgentMap MCP Cold Start Performance ===\n');

  const iterations = 5;
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    try {
      const result = await measureColdStart();
      times.push(result.initTime);
      console.log(`  Iteration ${i + 1}: ${result.initTime}ms`);
    } catch (err) {
      console.error(`  Iteration ${i + 1}: FAILED - ${err instanceof Error ? err.message : String(err)}`);
    }

    // Pequena pausa entre iterações
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (times.length > 0) {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    console.log(`\n  Results (${times.length} iterations):`);
    console.log(`    Average: ${avg.toFixed(0)}ms`);
    console.log(`    Min:     ${min}ms`);
    console.log(`    Max:     ${max}ms`);

    if (avg < 2000) {
      console.log(`\n  ✅ PASS: Cold start < 2s target\n`);
      process.exit(0);
    } else if (avg < 5000) {
      console.log(`\n  ⚠️ WARNING: Cold start > 2s but < 5s\n`);
      process.exit(0);
    } else {
      console.log(`\n  ❌ FAIL: Cold start > 5s\n`);
      process.exit(1);
    }
  } else {
    console.log('\n  ❌ FAIL: No successful iterations\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
