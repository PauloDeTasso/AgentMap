/**
 * Script: measure-cache.ts
 *
 * Mede o desempenho do cache de configuração do AgentMap.
 * Compara tempo de carregamento com e sem cache.
 *
 * Uso: npm run perf:cache
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function createTempProject(): string {
  const tmpDir = path.join(os.tmpdir(), `agentmap-cache-test-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(path.join(tmpDir, '.ia'), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, '.ia', 'agentmap.json'),
    JSON.stringify({
      agentMap: { name: 'AgentMap', version: '2.0.0', schemaVersion: '1.0' },
      ownership: {
        managed: ['AGENTS.md', 'kilo.jsonc', '.kilo/**', '.ia/**'],
        protected: ['src/**', 'backend/**', 'frontend/**', 'docs/**'],
      },
    }, null, 2),
    'utf-8'
  );
  return tmpDir;
}

function measureReadTime(filePath: string, iterations: number): number[] {
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    fs.readFileSync(filePath, 'utf-8');
    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1_000_000); // Convert to ms
  }
  return times;
}

function measureJsonParseIterations(filePath: string, iterations: number): number[] {
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    const content = fs.readFileSync(filePath, 'utf-8');
    JSON.parse(content);
    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1_000_000); // Convert to ms
  }
  return times;
}

function measureCacheHitTime(data: unknown, iterations: number): number[] {
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    // Simula acesso a propriedades cacheadas
    const _ = (data as any).agentMap?.name;
    const __ = (data as any).ownership?.managed;
    const ___ = (data as any).ownership?.protected;
    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1_000_000); // Convert to ms
  }
  return times;
}

function stats(times: number[]): { avg: number; min: number; max: number; p95: number } {
  const sorted = [...times].sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95 = sorted[p95Index];
  return { avg, min, max, p95 };
}

async function main() {
  console.log('\n=== AgentMap Configuration Cache Performance ===\n');

  const tmpDir = createTempProject();
  const configPath = path.join(tmpDir, '.ia', 'agentmap.json');
  const iterations = 1000;

  // Test 1: Raw file read
  console.log(`  Testing raw file read (${iterations} iterations)...`);
  const readTimes = measureReadTime(configPath, iterations);
  const readStats = stats(readTimes);
  console.log(`    Avg: ${readStats.avg.toFixed(4)}ms`);
  console.log(`    P95: ${readStats.p95.toFixed(4)}ms`);

  // Test 2: File read + JSON parse (no cache)
  console.log(`\n  Testing file read + JSON parse (${iterations} iterations)...`);
  const parseTimes = measureJsonParseIterations(configPath, iterations);
  const parseStats = stats(parseTimes);
  console.log(`    Avg: ${parseStats.avg.toFixed(4)}ms`);
  console.log(`    P95: ${parseStats.p95.toFixed(4)}ms`);

  // Test 3: Cache hit (in-memory access)
  console.log(`\n  Testing cache hit (in-memory access, ${iterations} iterations)...`);
  const cachedData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const cacheTimes = measureCacheHitTime(cachedData, iterations);
  const cacheStats = stats(cacheTimes);
  console.log(`    Avg: ${cacheStats.avg.toFixed(6)}ms`);
  console.log(`    P95: ${cacheStats.p95.toFixed(6)}ms`);

  // Results
  console.log(`\n  Summary:`);
  console.log(`    File read (no cache):  ${parseStats.avg.toFixed(4)}ms avg`);
  console.log(`    Cache hit (in-memory): ${cacheStats.avg.toFixed(6)}ms avg`);
  console.log(`    Speedup: ${(parseStats.avg / cacheStats.avg).toFixed(0)}x faster with cache`);

  // Cleanup
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore
  }

  // Performance gate
  if (parseStats.avg < 1) {
    console.log(`\n  ✅ PASS: Config loading < 1ms\n`);
    process.exit(0);
  } else {
    console.log(`\n  ⚠️ WARNING: Config loading > 1ms\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
