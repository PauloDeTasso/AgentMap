/**
 * Testes unitários para ConfigCache.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigCache, getConfigCache, resetConfigCache, loadJsonCached } from '../src/config-cache';

describe('ConfigCache', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `agentmap-cache-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    resetConfigCache();
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    resetConfigCache();
  });

  test('deve carregar dados na primeira chamada (cache miss)', () => {
    const cache = new ConfigCache();
    const loader = jest.fn().mockReturnValue({ value: 42 });

    const result = cache.getOrLoad('key1', loader);

    expect(result).toEqual({ value: 42 });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(cache.getMetrics().misses).toBe(1);
    expect(cache.getMetrics().hits).toBe(0);
  });

  test('deve retornar dados do cache em chamadas subsequentes (cache hit)', () => {
    const cache = new ConfigCache();
    const loader = jest.fn().mockReturnValue({ value: 42 });

    cache.getOrLoad('key1', loader);
    const result = cache.getOrLoad('key1', loader);

    expect(result).toEqual({ value: 42 });
    expect(loader).toHaveBeenCalledTimes(1); // Loader só chamado uma vez
    expect(cache.getMetrics().hits).toBe(1);
  });

  test('deve respeitar TTL', () => {
    const cache = new ConfigCache(100); // 100ms TTL
    const loader = jest.fn().mockReturnValue({ value: 42 });

    cache.getOrLoad('key1', loader);
    expect(cache.getMetrics().misses).toBe(1);

    // Aguarda TTL expirar
    return new Promise((resolve) => {
      setTimeout(() => {
        cache.getOrLoad('key1', loader);
        expect(loader).toHaveBeenCalledTimes(2); // Loader chamado novamente
        expect(cache.getMetrics().misses).toBe(2);
        resolve(undefined);
      }, 150);
    });
  });

  test('deve invalidar entrada específica', () => {
    const cache = new ConfigCache();
    const loader = jest.fn().mockReturnValue({ value: 42 });

    cache.getOrLoad('key1', loader);
    cache.getOrLoad('key2', loader);

    expect(cache.invalidate('key1')).toBe(true);
    expect(cache.invalidate('key1')).toBe(false); // Já invalidado

    cache.getOrLoad('key1', loader);
    expect(loader).toHaveBeenCalledTimes(3); // key1 recarregado
  });

  test('deve invalidar todas as entradas', () => {
    const cache = new ConfigCache();
    const loader = jest.fn().mockReturnValue({ value: 42 });

    cache.getOrLoad('key1', loader);
    cache.getOrLoad('key2', loader);
    cache.getOrLoad('key3', loader);

    cache.invalidateAll();

    cache.getOrLoad('key1', loader);
    expect(loader).toHaveBeenCalledTimes(4); // Todas recarregadas
  });

  test('deve invalidar por padrão (pattern)', () => {
    const cache = new ConfigCache();
    const loader = jest.fn().mockReturnValue({ value: 42 });

    cache.getOrLoad('config:a', loader);
    cache.getOrLoad('config:b', loader);
    cache.getOrLoad('other:c', loader);

    const invalidated = cache.invalidatePattern(/^config:/);

    expect(invalidated).toBe(2);
    expect(cache.getMetrics().size).toBe(1); // Só sobrou other:c
  });

  test('deve respeitar maxSize e evict oldest', () => {
    const cache = new ConfigCache(30000, 2); // maxSize = 2
    const loader = jest.fn().mockReturnValue({ value: 42 });

    cache.getOrLoad('key1', loader);
    cache.getOrLoad('key2', loader);
    cache.getOrLoad('key3', loader); // Deve evict key1

    expect(cache.getMetrics().size).toBe(2);
    expect(cache.getMetrics().evictions).toBe(1);
  });

  test('deve calcular hit rate corretamente', () => {
    const cache = new ConfigCache();
    const loader = jest.fn().mockReturnValue({ value: 42 });

    cache.getOrLoad('key1', loader); // miss
    cache.getOrLoad('key1', loader); // hit
    cache.getOrLoad('key1', loader); // hit
    cache.getOrLoad('key2', loader); // miss

    expect(cache.getHitRate()).toBeCloseTo(0.5); // 2 hits / 4 total
  });

  test('deve pré-carregar entradas', () => {
    const cache = new ConfigCache();

    cache.preload([
      { key: 'key1', loader: () => ({ a: 1 }) },
      { key: 'key2', loader: () => ({ b: 2 }) },
    ]);

    expect(cache.getMetrics().size).toBe(2);
    expect(cache.get('key1')).toEqual({ a: 1 });
    expect(cache.get('key2')).toEqual({ b: 2 });
  });

  test('deve retornar undefined para chave inexistente', () => {
    const cache = new ConfigCache();
    expect(cache.get('nonexistent')).toBeUndefined();
  });
});

describe('loadJsonCached', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `agentmap-json-cache-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    resetConfigCache();
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    resetConfigCache();
  });

  test('deve carregar JSON do arquivo com cache', () => {
    const filePath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(filePath, JSON.stringify({ name: 'test', version: '1.0.0' }), 'utf-8');

    const result1 = loadJsonCached<{ name: string; version: string }>(filePath);
    const result2 = loadJsonCached<{ name: string; version: string }>(filePath);

    expect(result1).toEqual({ name: 'test', version: '1.0.0' });
    expect(result2).toEqual({ name: 'test', version: '1.0.0' });
  });

  test('deve usar cache para leituras subsequentes', () => {
    const filePath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(filePath, JSON.stringify({ value: 1 }), 'utf-8');

    const cache = getConfigCache();

    loadJsonCached(filePath, cache);
    loadJsonCached(filePath, cache);
    loadJsonCached(filePath, cache);

    // Verifica que o cache tem a entrada
    expect(cache.get(filePath)).toEqual({ value: 1 });
    // Verifica que o hit rate é > 0 (indicando que cache está funcionando)
    expect(cache.getHitRate()).toBeGreaterThan(0);
    // Verifica que houve pelo menos 1 hit
    expect(cache.getMetrics().hits).toBeGreaterThanOrEqual(1);
  });
});

describe('getConfigCache (singleton)', () => {
  beforeEach(() => {
    resetConfigCache();
  });

  afterEach(() => {
    resetConfigCache();
  });

  test('deve retornar mesma instância', () => {
    const cache1 = getConfigCache();
    const cache2 = getConfigCache();
    expect(cache1).toBe(cache2);
  });

  test('resetConfigCache deve criar nova instância', () => {
    const cache1 = getConfigCache();
    resetConfigCache();
    const cache2 = getConfigCache();
    expect(cache1).not.toBe(cache2);
  });
});
