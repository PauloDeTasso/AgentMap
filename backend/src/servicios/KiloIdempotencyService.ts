import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { ResultadoOperacao } from '../tipos';

interface ProcessedMessage {
  messageId: string;
  processedAt: string;
  tool: string;
  sessionId?: string;
}

interface ProcessedRegistry {
  mensagens: ProcessedMessage[];
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class KiloIdempotencyService {
  private registryPath: string;
  private ttlMs: number;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    ttlMs = DEFAULT_TTL_MS
  ) {
    this.registryPath = path.win32.join('.ia', 'contexto', 'kilohub-processed.json');
    this.ttlMs = ttlMs;
  }

  async isProcessado(messageId: string): Promise<boolean> {
    const result = this.fs.lerJson<ProcessedRegistry>(this.registryPath);
    if (!result.sucesso || !result.dados) return false;

    const cutoff = Date.now() - this.ttlMs;
    const registry = result.dados;
    const entry = registry.mensagens.find(m => m.messageId === messageId);
    if (!entry) return false;

    const processedAt = new Date(entry.processedAt).getTime();
    if (processedAt < cutoff) {
      this.removerEntrada(messageId).catch(() => {});
      return false;
    }

    return true;
  }

  async marcarProcessado(messageId: string, tool: string, sessionId?: string): Promise<ResultadoOperacao<void>> {
    const result = this.fs.lerJson<ProcessedRegistry>(this.registryPath);
    const registry: ProcessedRegistry = result.sucesso && result.dados
      ? result.dados
      : { mensagens: [] };

    const cutoff = Date.now() - this.ttlMs;
    registry.mensagens = registry.mensagens.filter(m => {
      const processedAt = new Date(m.processedAt).getTime();
      return processedAt >= cutoff;
    });

    registry.mensagens.push({
      messageId,
      processedAt: new Date().toISOString(),
      tool,
      sessionId
    });

    const writeResult = this.fs.escreverJson(this.registryPath, registry);
    if (!writeResult.sucesso) {
      return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    }

    return { sucesso: true };
  }

  async limparExpirados(): Promise<ResultadoOperacao<number>> {
    const result = this.fs.lerJson<ProcessedRegistry>(this.registryPath);
    if (!result.sucesso || !result.dados) {
      return { sucesso: true, dados: 0 };
    }

    const cutoff = Date.now() - this.ttlMs;
    const antes = result.dados.mensagens.length;
    result.dados.mensagens = result.dados.mensagens.filter(m => {
      const processedAt = new Date(m.processedAt).getTime();
      return processedAt >= cutoff;
    });
    const removidos = antes - result.dados.mensagens.length;

    if (removidos > 0) {
      this.fs.escreverJson(this.registryPath, result.dados);
    }

    return { sucesso: true, dados: removidos };
  }

  private async removerEntrada(messageId: string): Promise<void> {
    const result = this.fs.lerJson<ProcessedRegistry>(this.registryPath);
    if (!result.sucesso || !result.dados) return;

    result.dados.mensagens = result.dados.mensagens.filter(m => m.messageId !== messageId);
    this.fs.escreverJson(this.registryPath, result.dados);
  }
}
