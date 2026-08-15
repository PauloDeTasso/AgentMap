/**
 * @deprecated ExecutorKiloDaemon depende de CLI `kilo` inexistente.
 * O paralelismo real é via Agent Manager worktrees.
 * Mantido apenas para referência histórica.
 */
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';
import { DispatchEventoKilo, ModoAutonomia, DispatchLog } from '../tipos';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { ResultadoOperacao } from '../tipos';
import { DaemonManager, DaemonWorkspaceMapping } from './DaemonManager';

const KILO_CMD = process.platform === 'win32'
  ? process.env.KILO_CMD || 'kilo'
  : 'kilo';

export interface ExecutorDispatchOptions {
  tarefaId?: string;
  mensagem: string;
  modoAutonomia: ModoAutonomia;
  sessionId?: string;
  autoApprove?: boolean;
  agent?: string;
  dir?: string;
  title?: string;
  timeoutMs?: number;
}

export class ExecutorKiloDaemon {
  private logPath = path.join('.ia', 'contexto', 'dispatch-log.json');
  private logs: DispatchLog[] = [];
  private projetoPath: string;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator,
    private daemonManager: DaemonManager,
    projetoPath: string = process.cwd()
  ) {
    this.projetoPath = path.resolve(projetoPath);
    this.logs = this.carregarLogs();
  }

  private validarWorkspace(workspacePath: string): { ok: boolean; resolved: string } {
    const resolved = path.resolve(workspacePath);
    if (resolved !== this.projetoPath && !resolved.startsWith(this.projetoPath + path.sep)) {
      return { ok: false, resolved };
    }
    return { ok: true, resolved };
  }

  private carregarLogs(): DispatchLog[] {
    try {
      const result = this.fs.lerJson<DispatchLog[]>(this.logPath);
      if (!result.sucesso || !result.dados) return [];
      return result.dados;
    } catch {
      return [];
    }
  }

  private salvarLogs(): void {
    this.fs.escreverJson(this.logPath, this.logs, { backup: true });
  }

  private adicionarLog(log: DispatchLog): void {
    this.logs.push(log);
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500);
    }
    this.salvarLogs();
  }

  async dispatch(opts: ExecutorDispatchOptions): Promise<ResultadoOperacao<DispatchLog>> {
    const workspacePath = opts.dir || this.fs.getCaminhoAbsoluto('.');
    const mapping = this.daemonManager.obterMapping(workspacePath);

    let daemonReady = mapping && mapping.healthy;
    if (!daemonReady) {
      const startResult = await this.daemonManager.start(workspacePath);
      if (!startResult.sucesso) {
        return { sucesso: false, erro: `Falha ao iniciar daemon: ${startResult.erro}`, codigoErro: 'DAEMON_START_FAILED' };
      }
      daemonReady = true;
    }

    const finalMapping = this.daemonManager.obterMapping(workspacePath);
    if (!finalMapping || !finalMapping.url) {
      return { sucesso: false, erro: 'URL do daemon não disponível', codigoErro: 'DAEMON_URL_MISSING' };
    }

    const log: DispatchLog = {
      id: `DSP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      instanciaId: '',
      tarefaId: opts.tarefaId,
      comando: '',
      status: 'PENDENTE'
    };

    const inicio = Date.now();
    const args: string[] = ['run'];
    if (opts.agent) args.push('--agent', opts.agent);
    if (opts.dir) args.push('--dir', opts.dir);
    if (opts.sessionId) {
      args.push('--session', opts.sessionId);
      args.push('--continue');
    }
    if (opts.modoAutonomia === 'AUTONOMA' || opts.autoApprove) {
      args.push('--auto');
    }
    args.push('--format', 'json');
    if (opts.title) args.push('--title', opts.title);
    args.push(opts.mensagem);

    const comandoStr = `${KILO_CMD} ${args.join(' ')}`;
    log.comando = comandoStr;

    this.auditoria.registrar('DISPATCH_INICIADO', `Executando kilocli em ${workspacePath}`, { comando: comandoStr, tarefaId: opts.tarefaId });

    let attempt = 0;
    const maxAttempts = 2;
    let lastResult: ResultadoOperacao<DispatchLog> = { sucesso: false, erro: 'Não executado', codigoErro: 'NOT_RUN' };

    console.log('[EXECUTOR][DISPATCH] iniciando', JSON.stringify({ tarefaId: opts.tarefaId, agenteId: opts.agent, dir: opts.dir, title: opts.title, modoAutonomia: opts.modoAutonomia, comando: comandoStr, maxAttempts }));

    while (attempt < maxAttempts) {
      attempt++;
      const tentativaLabel = attempt > 1 ? ` (tentativa ${attempt}/${maxAttempts})` : '';
      this.auditoria.registrar('DISPATCH_INICIADO', `Executando kilocli em ${workspacePath}${tentativaLabel}`, { comando: comandoStr, tarefaId: opts.tarefaId, attempt });
      console.log('[EXECUTOR][DISPATCH] tentativa', attempt, JSON.stringify({ tarefaId: opts.tarefaId, comando: comandoStr, dir: opts.dir }));

      try {
        let finalArgs: string[];
        if (process.platform === 'win32') {
          finalArgs = ['/c', KILO_CMD, ...args];
        } else {
          finalArgs = args;
        }
        const cwdPath = opts.dir || workspacePath;
        const cwdValidacao = this.validarWorkspace(cwdPath);
        if (!cwdValidacao.ok) {
          return { sucesso: false, erro: 'Diretório de trabalho fora do projeto permitido', codigoErro: 'INVALID_WORKSPACE' };
        }
        const result = spawnSync(process.platform === 'win32' ? 'cmd.exe' : KILO_CMD, finalArgs, {
          cwd: cwdValidacao.resolved,
          timeout: opts.timeoutMs || 300000,
          encoding: 'utf-8',
          shell: false
        });

        const duracaoMs = Date.now() - inicio;
        const stdout = result.stdout || '';
        const stderr = result.stderr || '';
        const exitCode = result.status ?? 1;
        const stdoutLines = stdout.split('\n').filter((l) => l.trim());
        const eventos: DispatchEventoKilo[] = [];
        for (const line of stdoutLines) {
          try {
            const parsed = JSON.parse(line) as DispatchEventoKilo;
            eventos.push(parsed);
          } catch {
            // ignore non-JSON lines
          }
        }

        log.stdout = stdout;
        log.stderr = stderr;
        log.exitCode = exitCode;
        log.status = result.error ? 'ERRO' : (exitCode === 0 ? 'SUCESSO' : 'ERRO');
        log.duracaoMs = duracaoMs;
        log.eventos = eventos;

        const sessionId = this.extrairSessionId(eventos);
        if (sessionId) log.sessionId = sessionId;

        this.adicionarLog(log);

        if (!result.error && exitCode === 0) {
          this.auditoria.registrar('DISPATCH_SUCESSO', `Dispatch concluído para ${workspacePath}`, { tarefaId: opts.tarefaId, sessionId: log.sessionId, duracaoMs, eventosCount: eventos.length });
          return { sucesso: true, dados: log };
        }

        const hasStepFinish = eventos.some((e) => e.type === 'step_finish');
        if (hasStepFinish) {
          log.status = 'SUCESSO';
          this.auditoria.registrar('DISPATCH_SUCESSO', `Dispatch concluído com step_finish para ${workspacePath}`, { tarefaId: opts.tarefaId, sessionId: log.sessionId, duracaoMs, eventosCount: eventos.length });
          return { sucesso: true, dados: log };
        }

        lastResult = { sucesso: false, erro: stderr || `Processo finalizado com código ${exitCode}`, codigoErro: 'DISPATCH_FAILED', dados: log };

        if (result.error && attempt < maxAttempts) {
          continue;
        }

        this.auditoria.registrar('DISPATCH_ERRO', `Dispatch falhou para ${workspacePath}: ${lastResult.erro}`, { tarefaId: opts.tarefaId, exitCode, attempt });
        return lastResult;
      } catch (error: any) {
        const duracaoMs = Date.now() - inicio;
        log.stderr = error?.message || String(error);
        log.exitCode = error?.status || 1;
        log.status = 'ERRO';
        log.duracaoMs = duracaoMs;
        this.adicionarLog(log);
        lastResult = { sucesso: false, erro: error?.message || String(error), codigoErro: 'DISPATCH_FAILED', dados: log };

        if (attempt < maxAttempts) {
          continue;
        }

        this.auditoria.registrar('DISPATCH_ERRO', `Dispatch falhou para ${workspacePath}: ${error?.message || error}`, { tarefaId: opts.tarefaId, exitCode: log.exitCode, attempt });
        return lastResult;
      }
    }

    return lastResult;
  }

  listarLogs(limite = 100): DispatchLog[] {
    return this.logs.slice(-limite);
  }

  atualizarInstanciaId(logId: string, instanciaId: string): void {
    const log = this.logs.find((l) => l.id === logId);
    if (log) {
      log.instanciaId = instanciaId;
      this.salvarLogs();
    }
  }

  private extrairSessionId(eventos: DispatchEventoKilo[]): string | undefined {
    for (const evt of eventos) {
      if (evt.type === 'step_start' && evt.sessionID) {
        return evt.sessionID;
      }
    }
    return undefined;
  }
}


