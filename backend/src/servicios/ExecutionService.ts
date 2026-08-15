import { KiloRuntimeAdapter } from './KiloRuntimeAdapter';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { DispatchLog, ModoAutonomia } from '../tipos';
import { ResultadoOperacao } from '../tipos';

export interface ExecutionOptions {
  tarefaId?: string;
  agenteId: string;
  mensagem: string;
  modoAutonomia?: ModoAutonomia;
  sessionId?: string;
  workspacePath?: string;
  dir?: string;
  title?: string;
}

export interface ExecutionResult {
  sucesso: boolean;
  sessionId?: string;
  status?: string;
  saida?: string;
  erro?: string;
  codigoErro?: string;
  duracaoMs?: number;
  log?: DispatchLog;
}

export class ExecutionService {
  private logs: DispatchLog[] = [];

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator,
    private runtime: KiloRuntimeAdapter
  ) {}

  async executar(opts: ExecutionOptions): Promise<ExecutionResult> {
    const inicio = Date.now();
    const log: DispatchLog = {
      id: `DSP-${Date.now()}`,
      tarefaId: opts.tarefaId,
      instanciaId: '',
      comando: 'AgentManager worktree (CLI Kilo indisponível)',
      status: 'ERRO',
      exitCode: undefined,
      duracaoMs: 0,
      sessionId: opts.sessionId,
      timestamp: new Date().toISOString()
    };

    try {
      const disponivel = await this.runtime.detectar();
      if (!disponivel.disponivel) {
        log.status = 'ERRO';
        log.duracaoMs = Date.now() - inicio;
        this.logs.push(log);
        return {
          sucesso: false,
          sessionId: opts.sessionId,
          status: 'ERRO',
          erro: disponivel.erro || 'Runtime indisponível',
          codigoErro: 'RUNTIME_UNAVAILABLE',
          log
        };
      }

      const resultado = await this.runtime.executar(opts.mensagem, {
        agenteId: opts.agenteId,
        workspacePath: opts.workspacePath || opts.dir,
        sessionId: opts.sessionId,
        modoAutonomia: opts.modoAutonomia
      });

      log.status = resultado.sucesso ? 'SUCESSO' : 'ERRO';
      log.exitCode = resultado.sucesso ? 0 : 1;
      log.sessionId = resultado.sessionId;
      log.duracaoMs = Date.now() - inicio;
      this.logs.push(log);

      return {
        sucesso: resultado.sucesso,
        sessionId: resultado.sessionId,
        status: log.status,
        saida: resultado.saida,
        erro: resultado.erro,
        codigoErro: resultado.codigoErro,
        duracaoMs: log.duracaoMs,
        log
      };
    } catch (e: any) {
      log.status = 'ERRO';
      log.duracaoMs = Date.now() - inicio;
      this.logs.push(log);
      return {
        sucesso: false,
        sessionId: opts.sessionId,
        status: 'ERRO',
        erro: e?.message || String(e),
        codigoErro: 'EXECUTION_ERROR',
        log
      };
    }
  }

  async interromper(sessionId: string): Promise<ExecutionResult> {
    const inicio = Date.now();
    try {
      const resultado = await this.runtime.interromper(sessionId);
      return {
        sucesso: resultado.sucesso,
        status: resultado.sucesso ? 'INTERROMPIDO' : 'ERRO',
        erro: resultado.erro,
        codigoErro: resultado.sucesso ? undefined : 'INTERRUPT_FAILED',
        duracaoMs: Date.now() - inicio
      };
    } catch (e: any) {
      return {
        sucesso: false,
        status: 'ERRO',
        erro: e?.message || String(e),
        codigoErro: 'INTERRUPT_ERROR'
      };
    }
  }

  listarLogs(limite = 100): DispatchLog[] {
    return this.logs.slice(-limite);
  }
}
