import * as fs from 'fs';
import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { EventoAuditoria, TipoEvento } from '../tipos';
import { v4 as uuid } from 'uuid';

export class AuditoriaService {
  constructor(private fs: FileService) {}

  registrar(
    tipo: TipoEvento,
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
    const result = this.fs.lerJson<{ eventos: EventoAuditoria[] }>(
      path.win32.join('.ia', 'auditoria', 'eventos.json')
    );
    if (result.sucesso && result.dados) {
      result.dados.eventos.push(evento);
      this.fs.escreverJson(
        path.win32.join('.ia', 'auditoria', 'eventos.json'),
        result.dados
      );
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

