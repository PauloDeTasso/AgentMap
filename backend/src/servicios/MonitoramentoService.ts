export class MonitoramentoService {
  private heartbeats: Map<string, number> = new Map();
  private readonly timeoutOrfaosMs: number;

  constructor(timeoutOrfaosMs: number = 60000) {
    this.timeoutOrfaosMs = timeoutOrfaosMs;
  }

  registrarHeartbeat(agenteId: string): void {
    this.heartbeats.set(agenteId, Date.now());
  }

  verificarOrfaos(): string[] {
    const agora = Date.now();
    const orfaos: string[] = [];
    for (const [agenteId, ultimoHeartbeat] of this.heartbeats.entries()) {
      if (agora - ultimoHeartbeat > this.timeoutOrfaosMs) {
        orfaos.push(agenteId);
      }
    }
    return orfaos;
  }

  obterAgentesConhecidos(): string[] {
    return Array.from(this.heartbeats.keys());
  }
}
