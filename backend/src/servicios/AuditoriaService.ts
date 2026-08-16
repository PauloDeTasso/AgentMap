import * as fs from 'fs';
import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { EventoAuditoria, TipoEvento } from '../tipos';
import { v4 as uuid } from 'uuid';

export class AuditoriaService {
  constructor(private fs: FileService) {}

  registrar(
    tipo: string,
    descricao: string,
    dados: Record<string, unknown> = {},
    origem = 'gerenciador',
    resultado: 'sucesso' | 'falha' | 'bloqueado' = 'sucesso'
  ): EventoAuditoria {
    const evento: EventoAuditoria = {
      id: uuid(),
      tipo,
      origem,
      agenteId: dados.agenteId as string | null,
      usuarioId: dados.usuarioId as string | null,
      tarefaId: dados.tarefaId as string | null,
      descricao,
      dados,
      resultado,
      data: new Date().toISOString()
    };
    this.appendEvento(evento);
    return evento;
  }

  private appendEvento(evento: EventoAuditoria): void {
    const auditoriaPath = path.win32.join('.ia', 'auditoria', 'eventos.json');
    const lockPath = auditoriaPath + '.lock';

    let retries = 5;
    while (retries > 0) {
      try {
        if (!fs.existsSync(lockPath)) {
          fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
        }
      } catch (e: any) {
        if (e.code === 'EEXIST') {
          retries--;
          if (retries === 0) {
            console.error('[AuditoriaService] lock timeout');
            return;
          }
          const wait = 50;
          for (let i = 0; i < wait; i++) {
            try {
              if (!fs.existsSync(lockPath)) break;
            } catch {}
          }
          continue;
        }
        throw e;
      }

      try {
        const result = this.fs.lerJson<{ eventos: EventoAuditoria[] }>(auditoriaPath);
        const eventos = (result.sucesso && result.dados?.eventos) ? result.dados.eventos : [];
        eventos.push(evento);

        const tmpPath = auditoriaPath + '.tmp-' + Date.now() + '-' + Math.random().toString(16).slice(2);
        fs.writeFileSync(tmpPath, JSON.stringify({ eventos }, null, 2), 'utf-8');
        fs.renameSync(tmpPath, auditoriaPath);
        return;
      } finally {
        try { fs.unlinkSync(lockPath); } catch {}
      }
    }
  }

  listar(limite = 100): EventoAuditoria[] {
    const result = this.fs.lerJson<{ eventos: EventoAuditoria[] }>(
      path.win32.join('.ia', 'auditoria', 'eventos.json')
    );
    if (!result.sucesso || !result.dados) return [];
    return result.dados.eventos.slice(-limite).reverse();
  }

  buscar(tipo?: string, agenteId?: string): EventoAuditoria[] {
    const eventos = this.listar(1000);
    return eventos.filter((e) => {
      if (tipo && e.tipo !== tipo) return false;
      if (agenteId && e.agenteId !== agenteId) return false;
      return true;
    });
  }
}

