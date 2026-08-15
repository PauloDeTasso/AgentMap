import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { ResultadoOperacao } from '../tipos';

export class MonitoramentoService {
  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService
  ) {}

  verificarOrfaos(projetoId: string): ResultadoOperacao<string[]> {
    const tarefasRes = this.fs.lerJson<{ tarefas: any[] }>(
      path.win32.join('.ia', 'tarefas', 'tarefas.json')
    );
    if (!tarefasRes.sucesso || !tarefasRes.dados) {
      return { sucesso: true, dados: [] };
    }

    const sessoesRes = this.fs.lerJson<{ sessoes: any[] }>(
      path.win32.join('.ia', 'sessoes', 'sessoes.json')
    );
    const sessoes = (sessoesRes.sucesso && sessoesRes.dados?.sessoes) || [];

    const orfaos: string[] = [];
    for (const tarefa of tarefasRes.dados.tarefas) {
      if (tarefa.estado !== 'EM_EXECUCAO') continue;

      const hasActiveSession = sessoes.some(
        (s) => s.tarefaId === tarefa.id && s.agenteId === tarefa.agenteResponsavel && s.datas?.fim === null
      );

      if (!hasActiveSession) {
        orfaos.push(tarefa.id);
      }
    }

    this.auditoria.registrar(
      'INTEGRIDADE_VERIFICADA',
      `Verificação de órfãos: ${orfaos.length} tarefas órfãs detectadas.`,
      { projetoId, orfaos: orfaos.length }
    );
    return { sucesso: true, dados: orfaos };
  }
}
