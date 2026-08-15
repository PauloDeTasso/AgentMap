import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { TarefaService } from './TarefaService';
import { SessaoService } from './SessaoService';
import { ResultadoOperacao } from '../tipos';

export type TipoIntervencao = 'PAUSAR_TAREFA' | 'CANCELAR_AGENTE' | 'REDIRECIONAR_TAREFA' | 'APROVAR' | 'REJEITAR';

export interface DadosIntervencao {
  agenteId?: string;
  motivo?: string;
}

export class MonitoramentoService {
  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private tarefaService: TarefaService,
    private sessaoService: SessaoService
  ) {}

  async executarIntervencao(projetoId: string, tarefaId: string, tipo: TipoIntervencao, dados?: DadosIntervencao): Promise<ResultadoOperacao<unknown>> {
    switch (tipo) {
      case 'PAUSAR_TAREFA':
        return this.pausarTarefa(tarefaId, dados?.motivo);
      case 'CANCELAR_AGENTE':
        return this.cancelarAgente(tarefaId, dados?.agenteId);
      case 'REDIRECIONAR_TAREFA':
        return this.redirecionarTarefa(tarefaId, dados?.agenteId);
      case 'APROVAR':
        return this.aprovarTarefa(tarefaId);
      case 'REJEITAR':
        return this.rejeitarTarefa(tarefaId);
      default:
        return { sucesso: false, erro: `Tipo de intervenção desconhecido: ${tipo}`, codigoErro: 'UNKNOWN_INTERVENTION' };
    }
  }

  private pausarTarefa(tarefaId: string, motivo?: string): ResultadoOperacao<unknown> {
    const pausa = {
      tarefaId,
      pausada: true,
      data: new Date().toISOString(),
      motivo: motivo || 'Intervenção manual'
    };
    const result = this.fs.escreverJson(path.win32.join('.ia', 'contexto', 'pausa.json'), pausa);
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    this.auditoria.registrar('TAREFA_PAUSADA', `Tarefa '${tarefaId}' pausada.`, { tarefaId, motivo });
    return { sucesso: true, dados: pausa };
  }

  private async cancelarAgente(tarefaId: string, agenteId?: string): Promise<ResultadoOperacao<unknown>> {
    if (!agenteId) {
      return { sucesso: false, erro: 'agenteId é obrigatório para cancelar agente', codigoErro: 'MISSING_AGENT_ID' };
    }

    const sessoesResult = this.sessaoService.listar();
    if (!sessoesResult.sucesso || !sessoesResult.dados) {
      return { sucesso: false, erro: sessoesResult.erro, codigoErro: sessoesResult.codigoErro };
    }

    const sessaoAtiva = sessoesResult.dados.find(s => s.agenteId === agenteId && s.tarefaId === tarefaId && !s.datas.fim);
    if (!sessaoAtiva) {
      return { sucesso: false, erro: 'Sessão ativa não encontrada para o agente/tarefa', codigoErro: 'NO_ACTIVE_SESSION' };
    }

    const atualizada = await this.sessaoService.atualizar(sessaoAtiva.id, {
      estadoFinal: 'CANCELADA',
      datas: { ...sessaoAtiva.datas, fim: new Date().toISOString() }
    });

    if (!atualizada.sucesso) {
      return { sucesso: false, erro: atualizada.erro, codigoErro: atualizada.codigoErro };
    }

    this.auditoria.registrar('SESSAO_CANCELADA', `Sessão '${sessaoAtiva.id}' do agente '${agenteId}' cancelada.`, { sessaoId: sessaoAtiva.id, agenteId, tarefaId });

    const tarefaResult = this.tarefaService.alterarEstado(tarefaId, 'CANCELADA');
    if (!tarefaResult.sucesso) {
      return { sucesso: false, erro: tarefaResult.erro, codigoErro: tarefaResult.codigoErro };
    }

    return { sucesso: true, dados: { sessaoId: sessaoAtiva.id, tarefa: tarefaResult.dados } };
  }

  private redirecionarTarefa(tarefaId: string, agenteId?: string): ResultadoOperacao<unknown> {
    if (!agenteId) {
      return { sucesso: false, erro: 'agenteId é obrigatório para redirecionar tarefa', codigoErro: 'MISSING_AGENT_ID' };
    }
    const result = this.tarefaService.atualizar(tarefaId, { agenteResponsavel: agenteId });
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    this.auditoria.registrar('TAREFA_REDIRECIONADA', `Tarefa '${tarefaId}' redirecionada para agente '${agenteId}'.`, { tarefaId, agenteId });
    return { sucesso: true, dados: result.dados };
  }

  private aprovarTarefa(tarefaId: string): ResultadoOperacao<unknown> {
    const result = this.tarefaService.alterarEstado(tarefaId, 'CONCLUIDA');
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    this.auditoria.registrar('TAREFA_APROVADA', `Tarefa '${tarefaId}' aprovada.`, { tarefaId });
    return { sucesso: true, dados: result.dados };
  }

  private rejeitarTarefa(tarefaId: string): ResultadoOperacao<unknown> {
    const result = this.tarefaService.alterarEstado(tarefaId, 'REJEITADA');
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    this.auditoria.registrar('TAREFA_REJEITADA', `Tarefa '${tarefaId}' rejeitada.`, { tarefaId });
    return { sucesso: true, dados: result.dados };
  }
}
