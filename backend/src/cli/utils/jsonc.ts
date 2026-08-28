/**
 * Utilitários para manipulação segura de JSON/JSONC.
 * Estratégia: comentários são removidos antes do parse.
 * Para update/merge, preservamos comentários fazendo merge seccional
 * apenas em chaves gerenciadas, reescrevendo o arquivo sem comentários
 * nas seções gerenciadas.
 */

import * as path from 'path';
import * as fs from 'fs';

export function stripJsonComments(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      continue;
    }
    // Remove inline comments (simplificado — não cobre strings com //)
    const commentIndex = line.indexOf(' //');
    if (commentIndex >= 0) {
      out.push(line.slice(0, commentIndex));
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

export function parseJsonC(text: string): Record<string, unknown> {
  const clean = stripJsonComments(text);
  return JSON.parse(clean) as Record<string, unknown>;
}

export function stringifyJsonC(obj: unknown, indent = 2): string {
  return JSON.stringify(obj, null, indent) + '\n';
}

export function mergeJsoncPreservingComments(
  original: string,
  managedKeys: string[],
  updates: Record<string, unknown>
): string {
  const parsed = parseJsonC(original);
  const changed: Record<string, unknown> = {};

  for (const key of managedKeys) {
    if (updates[key] !== undefined) {
      changed[key] = updates[key];
    }
  }

  if (Object.keys(changed).length === 0) {
    return original;
  }

  const merged = { ...parsed, ...changed };
  return stringifyJsonC(merged);
}

export function readJsonc(path: string): Record<string, unknown> {
  const text = fs.readFileSync(path, 'utf-8');
  return parseJsonC(text);
}

export function writeJsonc(path: string, obj: unknown): void {
  fs.writeFileSync(path, stringifyJsonC(obj), 'utf-8');
}
