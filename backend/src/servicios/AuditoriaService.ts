import * as fs from 'fs';
import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { EventoAuditoria, TipoEvento, ResultadoOperacao } from '../tipos';
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

    const result = this.fs.lerJson<{ eventos: EventoAuditoria[] }>(auditoriaPath);
    const eventos = (result.sucesso && result.dados?.eventos) ? result.dados.eventos : [];
    eventos.push(evento);

    this.fs.escrever(auditoriaPath, JSON.stringify({ eventos }, null, 2), { backup: true });
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

  obter(id: string): ResultadoOperacao<EventoAuditoria> {
    const eventos = this.listar(1000);
    const evento = eventos.find((e) => e.id === id);
    if (!evento) return { sucesso: false, erro: 'Evento não encontrado', codigoErro: 'NOT_FOUND' };
    return { sucesso: true, dados: evento };
  }

  async criar(dados: Partial<EventoAuditoria>): Promise<ResultadoOperacao<EventoAuditoria>> {
    const evento: EventoAuditoria = {
      id: dados.id || uuid(),
      tipo: dados.tipo || 'MANUAL',
      origem: dados.origem || 'gerenciador',
      agenteId: dados.agenteId || null,
      usuarioId: dados.usuarioId || null,
      tarefaId: dados.tarefaId || null,
      descricao: dados.descricao || '',
      dados: dados.dados || {},
      resultado: dados.resultado || 'sucesso',
      data: dados.data || new Date().toISOString()
    };
    this.appendEvento(evento);
    return { sucesso: true, dados: evento };
  }

  async atualizar(id: string, dados: Partial<EventoAuditoria>): Promise<ResultadoOperacao<EventoAuditoria>> {
    const auditoriaPath = path.win32.join('.ia', 'auditoria', 'eventos.json');
    const result = this.fs.lerJson<{ eventos: EventoAuditoria[] }>(auditoriaPath);
    if (!result.sucesso || !result.dados?.eventos) return { sucesso: false, erro: result.erro || 'Erro ao ler auditoria', codigoErro: 'READ_ERROR' };
    const idx = result.dados.eventos.findIndex((e) => e.id === id);
    if (idx < 0) return { sucesso: false, erro: 'Evento não encontrado', codigoErro: 'NOT_FOUND' };
    const atualizado: EventoAuditoria = { ...result.dados.eventos[idx], ...dados, id: result.dados.eventos[idx].id };
    result.dados.eventos[idx] = atualizado;
    const writeResult = this.fs.escreverJson(auditoriaPath, result.dados, { backup: true });
    if (!writeResult.sucesso) return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    return { sucesso: true, dados: atualizado };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const auditoriaPath = path.win32.join('.ia', 'auditoria', 'eventos.json');
    const result = this.fs.lerJson<{ eventos: EventoAuditoria[] }>(auditoriaPath);
    if (!result.sucesso || !result.dados?.eventos) return { sucesso: false, erro: result.erro || 'Erro ao ler auditoria', codigoErro: 'READ_ERROR' };
    const originalLength = result.dados.eventos.length;
    result.dados.eventos = result.dados.eventos.filter((e) => e.id !== id);
    if (result.dados.eventos.length === originalLength) return { sucesso: false, erro: 'Evento não encontrado', codigoErro: 'NOT_FOUND' };
    const writeResult = this.fs.escreverJson(auditoriaPath, result.dados, { backup: true });
    if (!writeResult.sucesso) return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    return { sucesso: true, dados: true };
  }

  async excluirTodos(): Promise<ResultadoOperacao<number>> {
    const auditoriaPath = path.win32.join('.ia', 'auditoria', 'eventos.json');
    const result = this.fs.escreverJson(auditoriaPath, { eventos: [] }, { backup: true });
    if (!result.sucesso) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    return { sucesso: true, dados: 0 };
  }
}

