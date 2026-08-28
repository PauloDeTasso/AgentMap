/**
 * ConfigCache — Cache de configuração para otimização de performance.
 *
 * Carrega e cacheia arquivos de configuração (.ia/agentmap.json, etc.)
 * para evitar leituras repetidas do filesystem.
 *
 * Características:
 * - TTL configurável (padrão: 30s)
 * - Invalidação manual
 * - Thread-safe (single-threaded Node.js)
 * - Métricas de hit/miss
 */

import * as fs from 'fs';
import * as path from 'path';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

export class ConfigCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private metrics = { hits: 0, misses: 0, evictions: 0 };

  constructor(
    private defaultTtlMs: number = 30000,
    private maxSize: number = 100
  ) {}

  /**
   * Obtém valor do cache ou carrega do filesystem.
   */
  getOrLoad(key: string, loader: () => T, ttlMs?: number): T {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (entry && now - entry.timestamp < entry.ttl) {
      this.metrics.hits++;
      entry.hits++;
      return entry.data;
    }

    // Cache miss — carrega
    this.metrics.misses++;
    const data = loader();

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: ttlMs ?? this.defaultTtlMs,
      hits: 0,
    });

    return data;
  }

  /**
   * Obtém valor do cache sem carregar.
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (now - entry.timestamp >= entry.ttl) {
      this.cache.delete(key);
      this.metrics.evictions++;
      return undefined;
    }

    this.metrics.hits++;
    entry.hits++;
    return entry.data;
  }

  /**
   * Define valor no cache.
   */
  set(key: string, data: T, ttlMs?: number): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs ?? this.defaultTtlMs,
      hits: 0,
    });
  }

  /**
   * Invalida entrada específica.
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalida todas as entradas.
   */
  invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Invalida entradas que correspondem ao padrão.
   */
  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Retorna métricas do cache.
   */
  getMetrics(): CacheMetrics {
    return {
      ...this.metrics,
      size: this.cache.size,
    };
  }

  /**
   * Retorna hit rate (0-1).
   */
  getHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? this.metrics.hits / total : 0;
  }

  /**
   * Pré-carrega múltiplas entradas.
   */
  preload(entries: Array<{ key: string; loader: () => T; ttlMs?: number }>): void {
    for (const { key, loader, ttlMs } of entries) {
      if (!this.cache.has(key)) {
        const data = loader();
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          ttl: ttlMs ?? this.defaultTtlMs,
          hits: 0,
        });
      }
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.metrics.evictions++;
    }
  }
}

/**
 * Cache singleton para configuração do AgentMap.
 */
let globalConfigCache: ConfigCache | null = null;

export function getConfigCache(): ConfigCache {
  if (!globalConfigCache) {
    globalConfigCache = new ConfigCache(30000, 50);
  }
  return globalConfigCache;
}

export function resetConfigCache(): void {
  globalConfigCache = null;
}

/**
 * Helper: carrega JSON do filesystem com cache.
 */
export function loadJsonCached<T>(filePath: string, cache: ConfigCache = getConfigCache()): T {
  return cache.getOrLoad(filePath, () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  }) as T;
}

/**
 * Helper: carrega texto do filesystem com cache.
 */
export function loadTextCached(filePath: string, cache: ConfigCache = getConfigCache()): string {
  return cache.getOrLoad(filePath, () => {
    return fs.readFileSync(filePath, 'utf-8');
  }) as string;
}

/**
 * Helper: verifica se arquivo existe (com cache de stat).
 */
export function fileExistsCached(filePath: string, cache: ConfigCache = getConfigCache()): boolean {
  const key = `exists:${filePath}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached as boolean;
  }

  const exists = fs.existsSync(filePath);
  // Cache existence check for shorter TTL
  cache.set(key, exists, 5000);
  return exists;
}

/**
 * Helper: lista diretório com cache.
 */
export function listDirCached(dirPath: string, cache: ConfigCache = getConfigCache()): string[] {
  return cache.getOrLoad(`dir:${dirPath}`, () => {
    return fs.readdirSync(dirPath);
  }) as string[];
}
