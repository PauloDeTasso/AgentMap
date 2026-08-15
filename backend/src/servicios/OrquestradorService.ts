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
import { CriterioService } from './CriterioService';
import { ValidacaoService } from './ValidacaoService';
import { ArtefatoService } from './ArtefatoService';
import { ResultadoService } from './ResultadoService';
import { DispatchLog, DispatchEventoKilo, ModoAutonomia, EstadoTarefa, ResultadoOperacao } from '../tipos';

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
  logsRecentes: ReturnType<ExecutorKiloDaemon['listarLogs']>;
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
    private dependenciaService: DependenciaService,
    private criterioService: CriterioService,
    private validacaoService: ValidacaoService,
    private artefatoService: ArtefatoService,
    private resultadoService: ResultadoService
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
        const finishEvt = log.eventos.find((e: DispatchEventoKilo) => e.type === 'step_finish');
        if (finishEvt) {
          console.log('[ORQUESTRADOR][DISPATCH] step_finish encontrado, iniciando pipeline de conclusão', JSON.stringify({ tarefaId: payload.tarefaId, agenteId, sessionId: log.sessionId }));
          const pipelineResult = await this.executarPipelineConclusao(payload.tarefaId, agenteId, log);
          if (!pipelineResult.sucesso) {
            console.warn('[ORQUESTRADOR][DISPATCH] pipeline de conclusão falhou', JSON.stringify({ tarefaId: payload.tarefaId, erro: pipelineResult.erro, codigo: pipelineResult.codigoErro }));
            this.eventoService.registrar({
              tipo: 'DISPATCH_ERRO',
              origem: 'orquestrador',
              destino: agenteId,
              referenciaTipo: 'tarefa',
              referenciaId: payload.tarefaId,
              mensagem: `Pipeline de conclusão falhou para tarefa ${payload.tarefaId}: ${pipelineResult.erro}`,
              estado: 'PENDENTE'
            });
            return { sucesso: false, erro: pipelineResult.erro, codigoErro: pipelineResult.codigoErro || 'PIPELINE_FAILED' };
          }

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
          console.warn('[ORQUESTRADOR][DISPATCH] dispatch SUCESSO mas sem step_finish', JSON.stringify({ tarefaId: payload.tarefaId, eventos: log.eventos.map((e: DispatchEventoKilo) => e.type) }));
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

  private async executarPipelineConclusao(tarefaId: string, agenteId: string, log: DispatchLog): Promise<ResultadoOperacao<void>> {
    console.log('[ORQUESTRADOR][PIPELINE] iniciando pipeline de conclusão', JSON.stringify({ tarefaId, agenteId, sessionId: log.sessionId }));

    const hoje = new Date().toISOString();
    const resumo = log.stdout ? log.stdout.substring(0, 500) : 'Execução concluída sem stdout';

    const resultadoCriado = await this.resultadoService.criar({
      tarefaId,
      agenteId,
      resumo,
      estado: 'COMPLETO',
      arquivosAlterados: [],
      artefatos: [],
      testesExecutados: [],
      testesAprovados: [],
      riscosEncontrados: [],
      pendencias: [],
      alteracoesSolicitadas: [],
      observacoes: `Duração: ${log.duracaoMs}ms | Exit code: ${log.exitCode}`
    });

    if (!resultadoCriado.sucesso) {
      return { sucesso: false, erro: `Falha ao registrar resultado: ${resultadoCriado.erro}`, codigoErro: resultadoCriado.codigoErro || 'RESULTADO_CRIAR_FAILED' };
    }

    console.log('[ORQUESTRADOR][PIPELINE] resultado capturado', JSON.stringify({ resultadoId: resultadoCriado.dados?.id }));

    const criteriosResult = await this.criterioService.listarPorTarefa(tarefaId);
    if (!criteriosResult.sucesso || !criteriosResult.dados) {
      return { sucesso: false, erro: 'Falha ao consultar critérios de aceitação', codigoErro: 'CRITERIOS_CONSULTA_FAILED' };
    }

    const criteriosInsatisfeitos = criteriosResult.dados.filter((c) => c.estado === 'INSATISFEITO' && c.obrigatorio);
    if (criteriosInsatisfeitos.length > 0) {
      const descricoes = criteriosInsatisfeitos.map((c) => c.descricao).join('; ');
      return { sucesso: false, erro: `Critérios de aceitação insatisfeitos: ${descricoes}`, codigoErro: 'CRITERIOS_NAO_SATISFEITOS' };
    }

    console.log('[ORQUESTRADOR][PIPELINE] critérios de aceitação verificados', JSON.stringify({ total: criteriosResult.dados.length, insatisfeitos: criteriosInsatisfeitos.length }));

    const validacaoCriada = await this.validacaoService.criar({
      alvoTipo: 'tarefa',
      alvoId: tarefaId,
      tarefaId,
      criterios: criteriosResult.dados.map((c) => c.id),
      responsavel: agenteId,
      estado: 'APROVADO',
      evidencias: [resultadoCriado.dados!.id],
      observacoes: 'Validação automática pós-execution via pipeline de conclusão'
    });

    if (!validacaoCriada.sucesso) {
      return { sucesso: false, erro: `Falha ao criar validação: ${validacaoCriada.erro}`, codigoErro: validacaoCriada.codigoErro || 'VALIDACAO_CRIAR_FAILED' };
    }

    console.log('[ORQUESTRADOR][PIPELINE] validação criada', JSON.stringify({ validacaoId: validacaoCriada.dados?.id }));

    const artefatosResult = await this.artefatoService.listar();
    if (!artefatosResult.sucesso || !artefatosResult.dados) {
      return { sucesso: false, erro: 'Falha ao consultar artefatos', codigoErro: 'ARTEFATOS_CONSULTA_FAILED' };
    }

    const artefatosTarefa = artefatosResult.dados.filter((a) => a.tarefaId === tarefaId);
    const artefatosInativos = artefatosTarefa.filter((a) => a.estado === 'EXCLUIDO' || a.estado === 'OBSOLETO');
    if (artefatosInativos.length > 0) {
      const nomes = artefatosInativos.map((a) => a.nome).join('; ');
      return { sucesso: false, erro: `Artefatos inválidos para a tarefa: ${nomes}`, codigoErro: 'ARTEFATOS_INVALIDOS' };
    }

    console.log('[ORQUESTRADOR][PIPELINE] artefatos conferidos', JSON.stringify({ total: artefatosTarefa.length, invalidos: artefatosInativos.length }));

    const contratosPath = path.win32.join('.ia', 'contratos', 'contratos.json');
    const contratosResult = this.fs.lerJson<{ contratos: { id: string; nome: string; arquivo: string; versao: string; estado: string; obrigatorio: boolean }[] }>(contratosPath);
    if (!contratosResult.sucesso || !contratosResult.dados) {
      return { sucesso: false, erro: 'Falha ao consultar contratos obrigatórios', codigoErro: 'CONTRATOS_CONSULTA_FAILED' };
    }

    const tarefa = (await this.tarefaService.obter(tarefaId)).dados;
    if (!tarefa) {
      return { sucesso: false, erro: 'Tarefa não encontrada para conferência de contratos', codigoErro: 'TASK_NOT_FOUND' };
    }

    const contratosObrigatorios = tarefa.contratosObrigatorios || [];
    const contratosRegistrados = contratosResult.dados.contratos.map((c) => c.id);
    const contratosAusentes = contratosObrigatorios.filter((cid) => !contratosRegistrados.includes(cid));
    if (contratosAusentes.length > 0) {
      return { sucesso: false, erro: `Contratos obrigatórios ausentes: ${contratosAusentes.join(', ')}`, codigoErro: 'CONTRATOS_AUSENTES' };
    }

    console.log('[ORQUESTRADOR][PIPELINE] contratos conferidos', JSON.stringify({ obrigatorios: contratosObrigatorios.length, ausentes: contratosAusentes.length }));

    console.log('[ORQUESTRADOR][PIPELINE] pipeline de conclusão finalizada com sucesso', JSON.stringify({ tarefaId, agenteId }));
    return { sucesso: true, dados: undefined };
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
    return { sucesso: true, dados: undefined };
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
