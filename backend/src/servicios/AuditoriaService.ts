import * as fs from 'fs';
import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { EventoAuditoria } from '../tipos';
import { v4 as uuid } from 'uuid';

export type TipoEvento =
  | 'PROJETO_CRIADO'
  | 'PROJETO_ABERTO'
  | 'AGENTE_CRIADO'
  | 'AGENTE_ATUALIZADO'
  | 'AGENTE_EXCLUIDO'
  | 'TAREFA_CRIADA'
  | 'TAREFA_ATRIBUIDA'
  | 'TAREFA_INICIADA'
  | 'TAREFA_CONCLUIDA'
  | 'TAREFA_CANCELADA'
  | 'TAREFA_BLOQUEADA'
  | 'TAREFA_DESBLOQUEADA'
  | 'TAREFA_ESTADO_ALTERADO'
  | 'TAREFA_EXCLUIDA'
  | 'CONTRATO_CRIADO'
  | 'CONTRATO_ALTERADO'
  | 'CONTRATO_EXCLUIDO'
  | 'ARQUIVO_ALTERADO'
  | 'ARQUIVO_EXCLUIDO'
  | 'TESTE_EXECUTADO'
  | 'REVISAO_REALIZADA'
  | 'APROVACAO_SOLICITADA'
  | 'APROVACAO_CONCEDIDA'
  | 'APROVACAO_REJEITADA'
  | 'IMPLANTACAO_REALIZADA'
  | 'CONFLITO_DETECTADO'
  | 'SEGURANCA_VIOLACAO'
  | 'BACKUP_CRIADO'
  | 'SOLICITACAO_CRIADA'
  | 'SOLICITACAO_ALTERADA'
  | 'SOLICITACAO_EXCLUIDA'
  | 'SOLICITACAO_APROVADA'
  | 'SOLICITACAO_REJEITADA'
  | 'CRITERIO_CRIADO'
  | 'RESULTADO_REGISTRADO'
  | 'ARTEFATO_CRIADO'
  | 'HANDOFF_CRIADO'
  | 'VALIDACAO_INICIADA'
  | 'VALIDACAO_CONCLUIDA'
  | 'BLOQUEIO_CRIADO'
  | 'BLOQUEIO_RESOLVIDO'
  | 'CONFLITO_CRIADO'
  | 'CONFLITO_RESOLVIDO'
  | 'RISCO_CRIADO'
  | 'RISCO_ATUALIZADO'
  | 'RESPONSABILIDADE_REGISTRADA'
  | 'RESERVA_CRIADA'
  | 'RESERVA_LIBERADA'
  | 'SESSAO_INICIADA'
  | 'SESSAO_FINALIZADA'
  | 'CHECKPOINT_CRIADO'
  | 'APRENDIZADO_REGISTRADO'
  | 'PENDENCIA_CRIADA'
  | 'PENDENCIA_RESOLVIDA'
  | 'DEPENDENCIA_CRIADA'
  | 'DECISAO_CRIADA'
  | 'DECISAO_ATUALIZADA'
  | 'INTEGRIDADE_VERIFICADA'
  | 'INTEGRIDADE_FALHA'
  | 'REGRAS_RESPEITADAS'
  | 'CONTATO_CRIADO'
  | 'CONTATO_ATUALIZADO'
  | 'CONTATO_EXCLUIDO'
  | 'TAREFA_PAUSADA'
  | 'SESSAO_CANCELADA'
  | 'TAREFA_REDIRECIONADA'
  | 'TAREFA_APROVADA'
  | 'TAREFA_REJEITADA';

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
