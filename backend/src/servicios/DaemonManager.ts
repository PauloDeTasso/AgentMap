import { ResultadoOperacao } from '../tipos';

export interface DaemonWorkspaceMapping {
  workspacePath: string;
  pid: number | null;
  porta: number | null;
  url: string | null;
  versaoKilo: string | null;
  healthy: boolean;
  startedAt: string | null;
  ultimaVerificacao: string;
}

export class DaemonManager {
  private mappings = new Map<string, DaemonWorkspaceMapping>();

  constructor(private projetoPath: string) {}

  listarMappings(): DaemonWorkspaceMapping[] {
    return [];
  }

  async status(workspacePath: string): Promise<ResultadoOperacao<any>> {
    return { sucesso: true, dados: { healthy: true } };
  }

  obterMapping(workspacePath: string): DaemonWorkspaceMapping | undefined {
    return undefined;
  }

  async start(workspacePath: string, porta?: number): Promise<ResultadoOperacao<DaemonWorkspaceMapping>> {
    return { sucesso: true, dados: {} as DaemonWorkspaceMapping };
  }
}
