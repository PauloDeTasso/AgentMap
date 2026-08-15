import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { TarefaService } from './TarefaService';
import { ResultadoService } from './ResultadoService';
import { Execucao, EstadoExecucao, ResultadoOperacao } from '../tipos';

export interface OrquestrarExecucaoPayload {
  tarefaId: string;
  agenteId: string;
  mensagem?: string;
}

export interface OrquestradorStatus {
  execucoesAtivas: number;
  execucoesPendentes: number;
  execucoesConcluidas: number;
}

export class OrquestradorService {
  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator,
    private tarefaService: TarefaService,
    private resultadoService: ResultadoService
  ) {}

  async iniciarExecucao(payload: OrquestrarExecucaoPayload): Promise<ResultadoOperacao<Execucao>> {
    const tarefaResult = this.tarefaService.obter(payload.tarefaId);
    if (!tarefaResult.sucesso || !tarefaResult.dados) {
      return { sucesso: false, erro: 'Tarefa não encontrada', codigoErro: 'TASK_NOT_FOUND' };
    }
    const tarefa = tarefaResult.dados;
    if (tarefa.estado !== 'PRONTA' && tarefa.estado !== 'EM_EXECUCAO') {
      return { sucesso: false, erro: `Tarefa não está em estado executável: ${tarefa.estado}`, codigoErro: 'INVALID_TASK_STATE' };
    }
    const execucaoResult = this.tarefaService.criarExecucao(payload.tarefaId, payload.agenteId);
    if (!execucaoResult.sucesso || !execucaoResult.dados) {
      return { sucesso: false, erro: execucaoResult.erro, codigoErro: execucaoResult.codigoErro };
    }
    const execucao = execucaoResult.dados;
    const atualizarTarefaResult = this.tarefaService.atualizar(payload.tarefaId, { estado: 'EM_EXECUCAO' });
    if (!atualizarTarefaResult.sucesso) {
      return { sucesso: false, erro: atualizarTarefaResult.erro, codigoErro: atualizarTarefaResult.codigoErro };
    }
    const iniciarExecResult = this.tarefaService.atualizarEstadoExecucao(payload.tarefaId, execucao.execucaoId, 'EM_EXECUCAO');
    if (!iniciarExecResult.sucesso) {
      return { sucesso: false, erro: iniciarExecResult.erro, codigoErro: iniciarExecResult.codigoErro };
    }
    this.auditoria.registrar('EXECUCAO_INICIADA', `Execução ${execucao.execucaoId} iniciada para tarefa ${payload.tarefaId}.`, { tarefaId: payload.tarefaId, execucaoId: execucao.execucaoId, agenteId: payload.agenteId });
    return { sucesso: true, dados: iniciarExecResult.dados };
  }

  async concluirExecucao(tarefaId: string, execucaoId: number, sucesso: boolean, observacoes?: string): Promise<ResultadoOperacao<Execucao>> {
    const execucaoResult = this.tarefaService.obterExecucao(tarefaId, execucaoId);
    if (!execucaoResult.sucesso || !execucaoResult.dados) {
      return { sucesso: false, erro: 'Execução não encontrada', codigoErro: 'EXECUCAO_NOT_FOUND' };
    }
    const novoEstado: EstadoExecucao = sucesso ? 'SUCESSO' : 'FALHA';
    const atualizarExecResult = this.tarefaService.atualizarEstadoExecucao(tarefaId, execucaoId, novoEstado);
    if (!atualizarExecResult.sucesso || !atualizarExecResult.dados) {
      return { sucesso: false, erro: atualizarExecResult.erro, codigoErro: atualizarExecResult.codigoErro };
    }
    const execucao = atualizarExecResult.dados;
    if (observacoes) {
      execucao.observacoes = observacoes;
      this.tarefaService.atualizarExecucaoObs(tarefaId, execucaoId, observacoes);
    }
    if (sucesso) {
      const tarefaResult = this.tarefaService.obter(tarefaId);
      if (tarefaResult.sucesso && tarefaResult.dados) {
        this.tarefaService.atualizar(tarefaId, { estado: 'CONCLUIDA' });
      }
    } else {
      const tarefaResult = this.tarefaService.obter(tarefaId);
      if (tarefaResult.sucesso && tarefaResult.dados) {
        this.tarefaService.atualizar(tarefaId, { estado: 'BLOQUEADA' });
      }
    }
    this.auditoria.registrar('EXECUCAO_CONCLUIDA', `Execução ${execucaoId} da tarefa ${tarefaId} concluída como ${novoEstado}.`, { tarefaId, execucaoId, estado: novoEstado });
    return { sucesso: true, dados: execucao };
  }

  async status(tarefaId?: string): Promise<ResultadoOperacao<OrquestradorStatus>> {
    const execucoesResult = this.tarefaService.listarExecucoes(tarefaId || '');
    if (!execucoesResult.sucesso || !execucoesResult.dados) {
      return { sucesso: true, dados: { execucoesAtivas: 0, execucoesPendentes: 0, execucoesConcluidas: 0 } };
    }
    const execucoes = tarefaId ? execucoesResult.dados : execucoesResult.dados;
    const status: OrquestradorStatus = {
      execucoesAtivas: execucoes.filter((e) => e.estado === 'EM_EXECUCAO').length,
      execucoesPendentes: execucoes.filter((e) => e.estado === 'PENDENTE').length,
      execucoesConcluidas: execucoes.filter((e) => e.estado === 'SUCESSO' || e.estado === 'FALHA' || e.estado === 'CANCELADA').length
    };
    return { sucesso: true, dados: status };
  }
}
