import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { InstanciaService } from './InstanciaService';
import { EventoService } from './EventoService';
import { HandoffService } from './HandoffService';
import { TarefaService } from './TarefaService';
import { DependenciaService } from './DependenciaService';
import { ModoAutonomia, EstadoTarefa } from '../tipos';
import { ResultadoOperacao } from '../tipos';

export class OrquestradorService {
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
          const estadosParaExecucao: EstadoTarefa[] = ['PENDENTE', 'PLANEJADA', 'PRONTA'];
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

  async status(): Promise<ResultadoOperacao<{ daemonMappings: any[]; logsRecentes: any[] }>> {
    return {
      sucesso: true,
      dados: {
        daemonMappings: [],
        logsRecentes: []
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
}

