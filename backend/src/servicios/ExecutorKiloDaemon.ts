import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { DaemonManager, DaemonWorkspaceMapping } from './DaemonManager';
import { DispatchEventoKilo, ModoAutonomia, DispatchLog } from '../tipos';
import { ResultadoOperacao } from '../tipos';

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
  }

  async dispatch(opts: ExecutorDispatchOptions): Promise<ResultadoOperacao<DispatchLog>> {
    return { sucesso: false, erro: 'not implemented', codigoErro: 'NOT_IMPLEMENTED' };
  }

  listarLogs(limit: number): DispatchLog[] {
    return [];
  }

  atualizarInstanciaId(logId: string, instanciaId: string): void {}
}
