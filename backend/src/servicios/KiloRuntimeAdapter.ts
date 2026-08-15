export interface KiloRuntimeAdapter {
  detectar(): Promise<{ disponivel: boolean; versao?: string; erro?: string }>;
  verificarVersao(): Promise<{ versao: string; compativel: boolean }>;
  modoDisponivel(): Promise<{ manual: boolean; assistida: boolean; autonoma: boolean }>;
  iniciar(): Promise<{ sucesso: boolean; pid?: number; porta?: number; url?: string; erro?: string }>;
  executar(prompt: string, opts: { agenteId?: string; workspacePath?: string; sessionId?: string; modoAutonomia?: string }): Promise<{ sucesso: boolean; sessionId?: string; saida?: string; erro?: string; codigoErro?: string }>;
  interromper(sessionId: string): Promise<{ sucesso: boolean; erro?: string }>;
  status(sessionId?: string): Promise<{ sucesso: boolean; dados?: any; erro?: string }>;
  diagnostico(): Promise<{ disponivel: boolean;verso?: string; motivo?: string }>;
}
