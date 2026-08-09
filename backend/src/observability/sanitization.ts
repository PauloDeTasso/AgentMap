const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /credential/i,
  /private[_-]?key/i,
  /bearer/i,
];

export function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(value)) {
        return '[REDACTED]';
      }
    }
    return value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  const sanitized: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (SECRET_PATTERNS.some((p) => p.test(key))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeValue((value as Record<string, unknown>)[key]);
    }
  }
  return sanitized;
}

export function sanitizeToolArguments(args: unknown): unknown {
  return sanitizeValue(args);
}

export function getErrorType(error: unknown): string {
  if (error instanceof Error) {
    return error.constructor.name || 'Error';
  }
  if (typeof error === 'object' && error !== null && 'constructor' in error) {
    return (error as any).constructor?.name || 'Error';
  }
  return 'Unknown';
}
