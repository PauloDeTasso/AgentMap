/**
 * Tipos compartilhados do CLI do AgentMap.
 */

export interface CliContext {
  cwd: string;
  agentMapRoot: string;
  dryRun: boolean;
  force: boolean;
}

export interface InitOptions {
  force?: boolean;
  skipMcp?: boolean;
}

export interface UpdateOptions {
  dryRun?: boolean;
  force?: boolean;
}

export interface StatusOptions {
  json?: boolean;
}

export interface DoctorOptions {
  json?: boolean;
  repair?: boolean;
}

export interface GeneratorResult {
  success: boolean;
  path: string;
  action: 'created' | 'updated' | 'skipped' | 'unchanged';
  message?: string;
}

export interface DoctorIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
  fix?: string;
}
