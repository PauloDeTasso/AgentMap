/**
 * Utilitários de descoberta de projeto e proteção contra path traversal.
 */

import * as path from 'path';
import * as fs from 'fs';

export function resolveAgentMapRoot(startCwd: string): string {
  let current = path.resolve(startCwd);
  while (true) {
    if (fs.existsSync(path.join(current, '.ia', 'agentmap.json'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return startCwd;
    }
    current = parent;
  }
}

export function resolveProjectRoot(startCwd: string): string {
  let current = path.resolve(startCwd);
  while (true) {
    if (fs.existsSync(path.join(current, '.ia'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return startCwd;
    }
    current = parent;
  }
}

export function ensureUnder(base: string, target: string): void {
  const resolvedBase = path.resolve(base);
  const resolvedTarget = path.resolve(target);
  if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
    throw new Error(`Path traversal detectado: ${target} não está dentro de ${base}`);
  }
}

export function existsSync(target: string): boolean {
  return fs.existsSync(target);
}

export function mkdirSync(target: string): void {
  fs.mkdirSync(target, { recursive: true });
}

export function readFileSync(target: string): string {
  return fs.readFileSync(target, 'utf-8');
}

export function writeFileSync(target: string, content: string): void {
  fs.writeFileSync(target, content, 'utf-8');
}
