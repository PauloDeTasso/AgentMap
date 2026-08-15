import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { TarefaService } from './TarefaService';
import { SessaoService } from './SessaoService';
import { MonitoramentoService } from './MonitoramentoService';
import { ResultadoOperacao } from '../tipos';

export class OrquestradorService {
  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private tarefaService: TarefaService,
    private sessaoService: SessaoService,
    private monitoramento: MonitoramentoService
  ) {}

  async recuperarOrfaos(projetoId: string): Promise<ResultadoOperacao<{ recuperados: string[]; marcadosOrfaos: string[] }>> {
    if (!this.monitoramento) {
      return { sucesso: false, erro: 'MonitoramentoService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' };
    }

    const monitorResult = this.monitoramento.verificarOrfaos(projetoId);
    if (!monitorResult.sucesso) {
      return { sucesso: false, erro: monitorResult.erro || 'Falha ao verificar órfãos', codigoErro: monitorResult.codigoErro };
    }

    const orfaos = monitorResult.dados || [];
    const recuperados: string[] = [];
    const marcadosOrfaos: string[] = [];

    for (const tarefaId of orfaos) {
      const tarefaResult = this.tarefaService.obter(tarefaId);
      if (!tarefaResult.sucesso || !tarefaResult.dados) continue;

      const orfaResult = this.tarefaService.alterarEstado(tarefaId, 'ORFA');
      if (!orfaResult.sucesso) continue;
      marcadosOrfaos.push(tarefaId);

      this.auditoria.registrar(
        'TAREFA_MARCADA_ORFA',
        `Tarefa '${tarefaId}' marcada como órfã.`,
        { projetoId, tarefaId }
      );

      const recoveryTarget = this.determinarAlvoRecuperacao(tarefaId);

      const recuperandoResult = this.tarefaService.alterarEstado(tarefaId, 'RECUPERANDO');
      if (!recuperandoResult.sucesso) continue;

      const finalResult = this.tarefaService.alterarEstado(tarefaId, recoveryTarget);
      if (!finalResult.sucesso) continue;

      recuperados.push(tarefaId);
      this.auditoria.registrar(
        'TAREFA_RECUPERADA',
        `Tarefa '${tarefaId}' recuperada de órfã para ${recoveryTarget}.`,
        { projetoId, tarefaId, estadoFinal: recoveryTarget }
      );
    }

    return { sucesso: true, dados: { recuperados, marcadosOrfaos } };
  }

  private determinarAlvoRecuperacao(tarefaId: string): 'PRONTA' | 'CONCLUIDA' {
    const resultadosRes = this.fs.lerJson<{ resultados: any[] }>(
      path.win32.join('.ia', 'resultados', 'resultados.json')
    );
    const resultados = (resultadosRes.sucesso && resultadosRes.dados?.resultados) || [];

    const hasCompleto = resultados.some(
      (r) => r.tarefaId === tarefaId && r.estado === 'COMPLETO'
    );
    if (hasCompleto) return 'CONCLUIDA';

    const checkpointsRes = this.fs.lerJson<{ checkpoints: any[] }>(
      path.win32.join('.ia', 'checkpoints', 'checkpoints.json')
    );
    const checkpoints = (checkpointsRes.sucesso && checkpointsRes.dados?.checkpoints) || [];
    const hasCheckpoints = checkpoints.some((c) => c.tarefaId === tarefaId);
    if (hasCheckpoints) return 'PRONTA';

    const tarefaResult = this.tarefaService.obter(tarefaId);
    if (tarefaResult.sucesso && tarefaResult.dados) {
      const t = tarefaResult.dados;
      if (t.resultado.resumo || t.resultado.arquivosAlterados.length > 0) {
        return 'PRONTA';
      }
    }

    return 'PRONTA';
  }
}
