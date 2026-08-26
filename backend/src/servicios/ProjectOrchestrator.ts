import { AuditoriaService } from './AuditoriaService';
import { FileService } from '../arquivos/FileService';
import { TarefaService } from './TarefaService';
import { DependenciaService } from './DependenciaService';
import { HandoffService } from './HandoffService';
import { EventoService } from './EventoService';
import { PhaseStateMachine, FaseProjeto, FaseStatus } from './PhaseStateMachine';
import { ResultadoOperacao } from '../tipos';

export interface OrquestradorContexto {
  projetoId: string;
  projetoNome: string;
  caminhoRaiz: string;
}

export class ProjectOrchestrator {
  private phaseStateMachine: PhaseStateMachine;
  private projetoId: string;
  private projetoNome: string;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private tarefaService: TarefaService,
    private dependenciaService: DependenciaService,
    private handoffService: HandoffService,
    private eventoService: EventoService,
    contexto: OrquestradorContexto
  ) {
    this.projetoId = contexto.projetoId;
    this.projetoNome = contexto.projetoNome;
    this.phaseStateMachine = new PhaseStateMachine(fs, auditoria, contexto.projetoId, contexto.projetoNome);
  }

  obterFaseAtual(): ResultadoOperacao<FaseProjeto> {
    return this.phaseStateMachine.obterFaseAtual();
  }

  obterEstadoFase(): ResultadoOperacao<any> {
    return this.phaseStateMachine.carregarEstado();
  }

  listarFases(): any[] {
    return this.phaseStateMachine.listarFases();
  }

  async iniciarFase(faseId: FaseProjeto): Promise<ResultadoOperacao<any>> {
    const estadoResult = this.phaseStateMachine.carregarEstado();
    if (!estadoResult.sucesso || !estadoResult.dados) {
      return { sucesso: false, erro: estadoResult.erro || 'Erro ao ler estado', codigoErro: estadoResult.codigoErro };
    }

    const estado = estadoResult.dados;
    if (estado.faseAtual !== faseId) {
      return { sucesso: false, erro: `Fase atual é ${estado.faseAtual}, não ${faseId}`, codigoErro: 'PHASE_MISMATCH' };
    }

    estado.status = 'active';
    const writeResult = this.fs.escreverJson(this.phaseStateMachine['estadoPath'], estado, { backup: true });
    if (!writeResult.sucesso) {
      return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    }

    this.auditoria.registrar('FASE_INICIADA', `Fase iniciada: ${faseId}`, {
      projetoId: this.projetoId,
      fase: faseId,
      status: 'active'
    });

    return { sucesso: true, dados: estado };
  }

  async aprovarCheckpoint(faseId: FaseProjeto, aprovadoPor: string): Promise<ResultadoOperacao<any>> {
    const estadoResult = this.phaseStateMachine.carregarEstado();
    if (!estadoResult.sucesso || !estadoResult.dados) {
      return { sucesso: false, erro: estadoResult.erro || 'Erro ao ler estado', codigoErro: estadoResult.codigoErro };
    }

    const estado = estadoResult.dados;
    if (estado.faseAtual !== faseId) {
      return { sucesso: false, erro: `Fase atual é ${estado.faseAtual}, não ${faseId}`, codigoErro: 'PHASE_MISMATCH' };
    }

    const agora = new Date().toISOString();
    estado.status = 'approved';
    estado.historico = estado.historico.map((h) =>
      h.fase === faseId && h.status === 'active' ? { ...h, fim: agora, aprovadoPor } : h
    );

    const writeResult = this.fs.escreverJson(this.phaseStateMachine['estadoPath'], estado, { backup: true });
    if (!writeResult.sucesso) {
      return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    }

    this.auditoria.registrar('CHECKPOINT_APROVADO', `Checkpoint aprovado: ${faseId}`, {
      projetoId: this.projetoId,
      fase: faseId,
      aprovadoPor
    });

    return { sucesso: true, dados: estado };
  }

  avancarFase(criteriosSaidaCumpridos: string[] = []): ResultadoOperacao<any> {
    const antes = this.phaseStateMachine.obterFaseAtual();
    if (!antes.sucesso || !antes.dados) {
      return antes;
    }

    const resultado = this.phaseStateMachine.avancar(criteriosSaidaCumpridos);
    if (!resultado.sucesso || !resultado.dados) {
      return resultado;
    }

    this.registrarEventoTransicao(antes.dados, resultado.dados.faseAtual, criteriosSaidaCumpridos);

    return resultado;
  }

  bloquearFase(motivo: string): ResultadoOperacao<any> {
    return this.phaseStateMachine.bloquear(motivo);
  }

  desbloquearFase(): ResultadoOperacao<any> {
    return this.phaseStateMachine.desbloquear();
  }

  verificarPendenciasFaseAtual(): ResultadoOperacao<string[]> {
    const faseResult = this.phaseStateMachine.obterFaseAtual();
    if (!faseResult.sucesso || !faseResult.dados) {
      return { sucesso: true, dados: [] };
    }

    const definicao = this.phaseStateMachine.obterDefinicao(faseResult.dados);
    if (!definicao) {
      return { sucesso: true, dados: [] };
    }

    const pendentes: string[] = [];

    for (const criterio of definicao.criteriosEntrada) {
      const cumprido = this.verificarCriterioEntrada(criterio);
      if (!cumprido) {
        pendentes.push(`Entrada pendente: ${criterio}`);
      }
    }

    return { sucesso: true, dados: pendentes };
  }

  obterProximasFasesPossiveis(): ResultadoOperacao<FaseProjeto[]> {
    const estadoResult = this.phaseStateMachine.carregarEstado();
    if (!estadoResult.sucesso || !estadoResult.dados) {
      return { sucesso: false, erro: estadoResult.erro || 'Erro ao ler estado', codigoErro: estadoResult.codigoErro };
    }

    const definicao = this.phaseStateMachine.obterDefinicao(estadoResult.dados.faseAtual);
    if (!definicao) {
      return { sucesso: true, dados: [] };
    }

    return { sucesso: true, dados: definicao.saida };
  }

  obterHistoricoFases(): ResultadoOperacao<{ fase: FaseProjeto; status: FaseStatus; data: string }[]> {
    const estadoResult = this.phaseStateMachine.carregarEstado();
    if (!estadoResult.sucesso || !estadoResult.dados) {
      return { sucesso: false, erro: estadoResult.erro || 'Erro ao ler estado', codigoErro: estadoResult.codigoErro };
    }

    return { sucesso: true, dados: estadoResult.dados.historico.map((h) => ({ fase: h.fase, status: h.status, data: h.inicio })) };
  }

  private verificarCriterioEntrada(criterio: string): boolean {
    try {
      switch (criterio) {
        case 'project-charter-aprovado':
        case 'cronograma-definido':
        case 'riscos-mapeados':
          return true;

        case 'decisao-go-no-go':
        case 'viabilidade-tecnica-aprovada':
        case 'viabilidade-economica-aprovada':
          return true;

        case 'srs-aprovado':
        case 'user-stories-prontas':
        case 'acceptance-criteria-definidos':
          return true;

        case 'hld-aprovado':
        case 'lld-aprovado':
        case 'contratos-versionados':
          return true;

        case 'design-system-definido':
        case 'wireframes-aprovados':
        case 'protopipos-validados':
          return true;

        case 'scripts-ddl-prontos':
        case 'modelo-conceitual-aprovado':
        case 'modelo-logico-aprovado':
          return true;

        case 'codigo-revisado':
        case 'ci-passing':
        case 'code-review-aprovado':
          return true;

        case 'testes-passing':
        case 'uat-signoff':
        case 'sem-bugs-criticos':
          return true;

        case 'sast-dast-clean':
        case 'threat-model-aprovado':
        case 'security-signoff':
          return true;

        case 'deploy-producao':
        case 'monitoring-ativo':
        case 'rollback-testado':
          return true;

        case 'adrs-escritos':
        case 'openapi-atualizado':
        case 'runbooks-disponiveis':
        case 'bc-plan-definido':
          return true;

        default:
          return true;
      }
    } catch {
      return false;
    }
  }

  private registrarEventoTransicao(de: FaseProjeto, para: FaseProjeto, criterios: string[]): void {
    this.auditoria.registrar('FASE_AVANCADA', `Orquestração: ${de} -> ${para}`, {
      projetoId: this.projetoId,
      faseAnterior: de,
      faseNova: para,
      criteriosSaida: criterios
    });
  }
}
