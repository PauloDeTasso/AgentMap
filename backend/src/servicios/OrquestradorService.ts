import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { DaemonManager } from './DaemonManager';
import { ExecutorKiloDaemon } from './ExecutorKiloDaemon';
import { InstanciaService } from './InstanciaService';
import { EventoService } from './EventoService';
import { HandoffService } from './HandoffService';
import { TarefaService } from './TarefaService';
import { DependenciaService } from './DependenciaService';
import { DispatchLog, ModoAutonomia, EstadoTarefa } from '../tipos';
import { ResultadoOperacao } from '../tipos';

export interface OrquestradorDispatchPayload {
  tarefaId: string;
  agenteId: string;
  mensagem: string;
  modoAutonomia?: ModoAutonomia;
  sessionId?: string;
  autoApprove?: boolean;
  dir?: string;
  title?: string;
}

export interface OrquestradorStatus {
  daemonMappings: ReturnType<DaemonManager['listarMappings']>;
  logsRecentes: DispatchLog[];
}

export class OrquestradorService {
  private daemonManager: DaemonManager;
  private executor: ExecutorKiloDaemon;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator,
    private projetoPath: string,
    private projetoId: string,
    private instanciaService: InstanciaService,
    private eventoService: EventoService,
    private handoffService: HandoffService,
    private tarefaService: TarefaService,
    private dependenciaService: DependenciaService
  ) {
    this.daemonManager = new DaemonManager(projetoPath);
    this.executor = new ExecutorKiloDaemon(fs, auditoria, validator, this.daemonManager);
  }

  async dispatch(payload: OrquestradorDispatchPayload): Promise<ResultadoOperacao<DispatchLog>> {
    console.log('[ORQUESTRADOR][DISPATCH] iniciando dispatch', JSON.stringify({ tarefaId: payload.tarefaId, agenteId: payload.agenteId, modoAutonomia: payload.modoAutonomia, dir: payload.dir, title: payload.title }));
    const tarefaResult = this.tarefaService.obter(payload.tarefaId);
    if (!tarefaResult.sucesso || !tarefaResult.dados) {
      console.error('[ORQUESTRADOR][DISPATCH] tarefa nao encontrada', JSON.stringify({ tarefaId: payload.tarefaId, erro: tarefaResult.erro, codigo: tarefaResult.codigoErro }));
      return { sucesso: false, erro: 'Tarefa não encontrada', codigoErro: 'TASK_NOT_FOUND' };
    }

    const tarefa = tarefaResult.dados;
    const agenteId = payload.agenteId || tarefa.agenteResponsavel;
    const modoAutonomia = payload.modoAutonomia || 'MANUAL';
    const dir = payload.dir || path.resolve(this.projetoPath);
    console.log('[ORQUESTRADOR][DISPATCH] tarefa encontrada', JSON.stringify({ tarefaId: tarefa.id, titulo: tarefa.titulo, estado: tarefa.estado, agenteResponsavel: tarefa.agenteResponsavel, agenteIdResolvido: agenteId }));

    const instanciaResult = await this.instanciaService.criar({
      agenteId,
      projetoId: this.projetoId,
      workspaceId: path.basename(dir),
      workspacePath: dir,
      tipoInstancia: 'EXECUTOR',
      status: 'CONECTADA',
      modoAutonomia,
      sessaoId: payload.sessionId || null,
      ultimaAtividade: new Date().toISOString(),
      versaoKilo: '7.4.21',
      capabilities: ['kilo-run', 'json-stream'],
      porta: null,
      pid: null
    });

    if (!instanciaResult.sucesso) {
      console.error('[ORQUESTRADOR][DISPATCH] falha ao criar instancia', JSON.stringify({ tarefaId: payload.tarefaId, agenteId, erro: instanciaResult.erro, codigo: instanciaResult.codigoErro }));
      return { sucesso: false, erro: `Falha ao registrar instância: ${instanciaResult.erro}`, codigoErro: 'INSTANCIA_CREATE_FAILED' };
    }

    const instancia = instanciaResult.dados!;
    console.log('[ORQUESTRADOR][DISPATCH] instancia criada', JSON.stringify({ instanciaId: instancia.id, agenteId, tarefaId: payload.tarefaId }));

    const dispatchResult = await this.executor.dispatch({
      tarefaId: payload.tarefaId,
      mensagem: payload.mensagem,
      modoAutonomia,
      sessionId: payload.sessionId,
      autoApprove: payload.autoApprove,
      agent: agenteId,
      dir,
      title: payload.title
    });

    if (dispatchResult.sucesso && dispatchResult.dados) {
      const log = dispatchResult.dados;
      console.log('[ORQUESTRADOR][DISPATCH] dispatch executado', JSON.stringify({ dispatchId: log.id, status: log.status, exitCode: log.exitCode, duracaoMs: log.duracaoMs, eventosCount: log.eventos?.length || 0, sessionId: log.sessionId }));
      this.executor.atualizarInstanciaId(log.id, instancia.id);

      await this.instanciaService.atualizar(instancia.id, {
        status: 'CONECTADA',
        sessaoId: log.sessionId || instancia.sessaoId,
        ultimaAtividade: new Date().toISOString()
      });

      this.eventoService.registrar({
        tipo: 'DISPATCH_INICIADO',
        origem: 'orquestrador',
        destino: agenteId,
        referenciaTipo: 'tarefa',
        referenciaId: payload.tarefaId,
        mensagem: `Dispatch iniciado para tarefa ${payload.tarefaId}`,
        estado: 'PENDENTE'
      });

      if (log.status === 'SUCESSO' && log.eventos && log.eventos.length > 0) {
        const finishEvt = log.eventos.find((e) => e.type === 'step_finish');
        if (finishEvt) {
          console.log('[ORQUESTRADOR][DISPATCH] step_finish encontrado, criando handoff e concluindo tarefa', JSON.stringify({ tarefaId: payload.tarefaId, agenteId, sessionId: log.sessionId }));
          const handoffResult = await this.handoffAutomatico(payload.tarefaId, agenteId);
          console.log('[ORQUESTRADOR][DISPATCH] handoff automatico executado', JSON.stringify({ tarefaId: payload.tarefaId, sucesso: handoffResult.sucesso, erro: handoffResult.erro, codigo: handoffResult.codigoErro }));
          await this.tarefaService.alterarEstado(payload.tarefaId, 'CONCLUIDA' as EstadoTarefa);
          this.eventoService.registrar({
            tipo: 'TAREFA_CONCLUIDA',
            origem: 'orquestrador',
            destino: agenteId,
            referenciaTipo: 'tarefa',
            referenciaId: payload.tarefaId,
            mensagem: `Dispatch concluído para tarefa ${payload.tarefaId}`,
            estado: 'CONSUMIDO'
          });
        } else {
          console.warn('[ORQUESTRADOR][DISPATCH] dispatch SUCESSO mas sem step_finish', JSON.stringify({ tarefaId: payload.tarefaId, eventos: log.eventos.map((e) => e.type) }));
          this.eventoService.registrar({
            tipo: 'DISPATCH_SUCESSO',
            origem: 'orquestrador',
            destino: agenteId,
            referenciaTipo: 'tarefa',
            referenciaId: payload.tarefaId,
            mensagem: `Dispatch concluído para tarefa ${payload.tarefaId} (sem step_finish)`,
            estado: 'CONSUMIDO'
          });
        }
      } else {
        console.warn('[ORQUESTRADOR][DISPATCH] dispatch sem sucesso ou sem eventos', JSON.stringify({ tarefaId: payload.tarefaId, status: log.status, eventosCount: log.eventos?.length || 0 }));
        this.eventoService.registrar({
          tipo: 'DISPATCH_ERRO',
          origem: 'orquestrador',
          destino: agenteId,
          referenciaTipo: 'tarefa',
          referenciaId: payload.tarefaId,
          mensagem: `Dispatch falhou para tarefa ${payload.tarefaId}: ${log.status}`,
          estado: 'PENDENTE'
        });
      }
    } else {
      console.error('[ORQUESTRADOR][DISPATCH] dispatch falhou', JSON.stringify({ tarefaId: payload.tarefaId, sucesso: dispatchResult.sucesso, erro: dispatchResult.erro, codigo: dispatchResult.codigoErro }));
    }

    return dispatchResult;
  }

  async handoffAutomatico(tarefaId: string, agenteOrigemId: string): Promise<ResultadoOperacao<void>> {
    console.log('[ORQUESTRADOR][HANDOFF] iniciando handoff automatico', JSON.stringify({ tarefaId, agenteOrigemId }));
    const dependenciasResult = this.dependenciaService.listarPorDestino(tarefaId);
    if (!dependenciasResult.sucesso || !dependenciasResult.dados) {
      console.warn('[ORQUESTRADOR][HANDOFF] falha ao listar dependencias', JSON.stringify({ tarefaId, erro: dependenciasResult.erro, codigo: dependenciasResult.codigoErro }));
      return { sucesso: true };
    }

    const dependencias = dependenciasResult.dados.filter((d) => d.estado === 'ATIVA');
    console.log('[ORQUESTRADOR][HANDOFF] dependencias ativas encontradas', JSON.stringify({ tarefaId, count: dependencias.length, dependencias: dependencias.map((d) => ({ id: d.id, fonteId: d.fonteId, destinoId: d.destinoId, tipo: d.tipo })) }));
    if (dependencias.length === 0) {
      return { sucesso: true };
    }

    for (const dep of dependencias) {
      try {
        await this.dependenciaService.atualizar(dep.id, { estado: 'RESOLVIDA' });
        const tarefaDepResult = this.tarefaService.obter(dep.destinoId);
        if (tarefaDepResult.sucesso && tarefaDepResult.dados) {
          const tarefaDep = tarefaDepResult.dados;
          const estadosParaExecucao: EstadoTarefa[] = ['PLANEJADA', 'PRONTA'];
          if (estadosParaExecucao.includes(tarefaDep.estado)) {
            await this.tarefaService.alterarEstado(tarefaDep.id, 'PRONTA' as EstadoTarefa);
          }

          await this.handoffService.criar({
            origem: agenteOrigemId,
            destino: tarefaDep.agenteResponsavel,
            tarefaId: tarefaDep.id,
            resumo: `Handoff automático: tarefa ${tarefaId} concluída`,
            concluido: [],
            pendente: [],
            artefatos: [],
            decisoes: [],
            alteracoes: [],
            riscos: [],
            bloqueios: []
          });

          console.log('[ORQUESTRADOR][HANDOFF] handoff criado', JSON.stringify({ tarefaId: tarefaDep.id, origem: agenteOrigemId, destino: tarefaDep.agenteResponsavel, dependenciaId: dep.id }));
          this.auditoria.registrar('HANDOFF_CRIADO', `Handoff automático criado para tarefa ${tarefaDep.id}`, { tarefaId: tarefaDep.id, origem: agenteOrigemId, destino: tarefaDep.agenteResponsavel });
        }
      } catch (error: any) {
        console.error('[ORQUESTRADOR][HANDOFF] erro ao processar dependencia', JSON.stringify({ tarefaId, dependenciaId: dep.id, erro: error?.message || String(error) }));
      }
    }

    return { sucesso: true };
  }

  async status(): Promise<ResultadoOperacao<OrquestradorStatus>> {
    const mappings = this.daemonManager.listarMappings();
    const logs = this.executor.listarLogs(20);
    return {
      sucesso: true,
      dados: {
        daemonMappings: mappings,
        logsRecentes: logs
      }
    };
  }

  async alterarModoAutonomia(instanciaId: string, modo: ModoAutonomia): Promise<ResultadoOperacao<void>> {
    const instanciaResult = await this.instanciaService.obter(instanciaId);
    if (!instanciaResult.sucesso || !instanciaResult.dados) {
      return { sucesso: false, erro: 'Instância não encontrada', codigoErro: 'NOT_FOUND' };
    }

    await this.instanciaService.atualizar(instanciaId, { modoAutonomia: modo });
    this.auditoria.registrar('MODO_AUTONOMIA_ALTERADO', `Modo de autonomia alterado para ${modo}`, { instanciaId, modo });
    return { sucesso: true };
  }

  async recuperarEstado(): Promise<ResultadoOperacao<{ daemonsVerificados: number; tarefasOrfas: number; reconciliadas: number }>> {
    console.log('[ORQUESTRADOR][RECUPERAR] iniciando recuperacao de estado');
    let daemonsVerificados = 0;
    let tarefasOrfas = 0;
    let reconciliadas = 0;

    const mappings = this.daemonManager.listarMappings();
    console.log('[ORQUESTRADOR][RECUPERAR] mapeamentos de daemon', JSON.stringify({ count: mappings.length, mappings: mappings.map((m) => ({ workspacePath: m.workspacePath, healthy: m.healthy, pid: m.pid, porta: m.porta })) }));
    for (const mapping of mappings) {
      const statusResult = await this.daemonManager.status(mapping.workspacePath);
      if (statusResult.sucesso && statusResult.dados) {
        daemonsVerificados++;
        if (!statusResult.dados.healthy) {
          console.warn('[ORQUESTRADOR][RECUPERAR] daemon nao saudavel', JSON.stringify({ workspacePath: mapping.workspacePath, healthy: statusResult.dados.healthy, pid: statusResult.dados.pid, porta: statusResult.dados.porta }));
          const instancias = await this.instanciaService.listar({ workspacePath: mapping.workspacePath });
          if (instancias.sucesso && instancias.dados) {
            for (const instancia of instancias.dados) {
              if (instancia.status === 'CONECTADA') {
                await this.instanciaService.atualizar(instancia.id, { status: 'DESCONECTADA' });
                console.log('[ORQUESTRADOR][RECUPERAR] instancia marcada como DESCONECTADA', JSON.stringify({ instanciaId: instancia.instanciaId, workspacePath: mapping.workspacePath }));
                this.auditoria.registrar('INSTANCIA_DESCONECTADA', `Instância ${instancia.instanciaId} marcada como DESCONECTADA (daemon não healthy)`, { instanciaId: instancia.instanciaId, workspacePath: mapping.workspacePath });
              }
            }
          }
        }
      } else {
        console.error('[ORQUESTRADOR][RECUPERAR] falha ao verificar status do daemon', JSON.stringify({ workspacePath: mapping.workspacePath, erro: statusResult.erro, codigo: statusResult.codigoErro }));
      }
    }

    const tarefasResult = this.tarefaService.listar();
    if (tarefasResult.sucesso && tarefasResult.dados) {
      const tarefasEmExecucao = tarefasResult.dados.filter((t: any) => t.estado === 'EM_EXECUCAO');
      console.log('[ORQUESTRADOR][RECUPERAR] tarefas em execucao encontradas', JSON.stringify({ count: tarefasEmExecucao.length, tarefas: tarefasEmExecucao.map((t) => ({ id: t.id, agenteResponsavel: t.agenteResponsavel, estado: t.estado })) }));
      for (const tarefa of tarefasEmExecucao) {
        const instanciaResult = await this.instanciaService.listar({ projetoId: this.projetoId });
        if (instanciaResult.sucesso && instanciaResult.dados) {
          const temInstanciaAtiva = instanciaResult.dados.some((i) => i.status === 'CONECTADA' && i.agenteId === tarefa.agenteResponsavel);
          if (!temInstanciaAtiva) {
            tarefasOrfas++;
            await this.tarefaService.alterarEstado(tarefa.id, 'PRONTA' as EstadoTarefa);
            reconciliadas++;
            console.log('[ORQUESTRADOR][RECUPERAR] tarefa orfa reconciliada', JSON.stringify({ tarefaId: tarefa.id, agenteId: tarefa.agenteResponsavel }));
            this.auditoria.registrar('TAREFA_RECONCILIADA', `Tarefa órfã ${tarefa.id} reconciliada para PRONTA`, { tarefaId: tarefa.id, agenteId: tarefa.agenteResponsavel });
          }
        } else {
          console.error('[ORQUESTRADOR][RECUPERAR] falha ao listar instancias', JSON.stringify({ tarefaId: tarefa.id, erro: instanciaResult.erro, codigo: instanciaResult.codigoErro }));
        }
      }
    } else {
      console.error('[ORQUESTRADOR][RECUPERAR] falha ao listar tarefas', JSON.stringify({ erro: tarefasResult.erro, codigo: tarefasResult.codigoErro }));
    }

    const resultadoFinal = { daemonsVerificados, tarefasOrfas, reconciliadas };
    console.log('[ORQUESTRADOR][RECUPERAR] recuperacao concluida', JSON.stringify(resultadoFinal));
    return { sucesso: true, dados: resultadoFinal };
  }
}


