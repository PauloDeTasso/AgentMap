import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { KiloState, KiloSession, KiloSessaoStatus, ReconcilacaoResultado, ResultadoOperacao } from '../tipos';
import { KiloDiscoveryService } from './KiloDiscoveryService';

export class KiloReconciliationService {
  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator,
    private projetoPath: string
  ) {}

  async reconciliar(): Promise<ResultadoOperacao<ReconcilacaoResultado>> {
    const discovery = new KiloDiscoveryService(this.fs, this.auditoria, this.projetoPath);
    const kiloResult = await discovery.descobrir();
    if (!kiloResult.sucesso || !kiloResult.dados) {
      return { sucesso: false, erro: kiloResult.erro || 'Erro na descoberta Kilo', codigoErro: kiloResult.codigoErro || 'KILO_DISCOVERY_FAILED' };
    }

    const kiloState = kiloResult.dados;
    const sessoesAgentMap = await this.carregarSessoesAgentMap();

    const sessoesAgentMapIds = new Set(sessoesAgentMap.map(s => s.id));
    const sessoesKiloIds = new Set(kiloState.sessoes.map(s => s.id));

    const sessoesNovas: KiloSession[] = [];
    const sessoesDesconhecidas: KiloSession[] = [];
    const sessoesAgenteMapSemKilo: string[] = [];

    for (const sessao of kiloState.sessoes) {
      if (!sessoesAgentMapIds.has(sessao.id)) {
        sessoesDesconhecidas.push(sessao);
      }
    }

    for (const sessao of sessoesAgentMap) {
      if (!sessoesKiloIds.has(sessao.id)) {
        sessoesAgenteMapSemKilo.push(sessao.id);
      }
    }

    for (const sessao of sessoesDesconhecidas) {
      this.auditoria.registrar('KILO_SESSION_DESCONHECIDA', `Sessão Kilo desconhecida detectada: ${sessao.id}`, {
        sessaoId: sessao.id,
        nome: sessao.nome,
        agenteId: sessao.agenteId,
        worktreeId: sessao.worktreeId
      });
    }

    for (const sessaoId of sessoesAgenteMapSemKilo) {
      this.auditoria.registrar('KILO_SESSION_DESCONHECIDA', `Sessão AgentMap sem correspondência Kilo: ${sessaoId}`, {
        sessaoId,
        status: 'OFFLINE'
      });
    }

    const resultado: ReconcilacaoResultado = {
      sessoesNovas,
      sessoesDesconhecidas,
      sessoesAgenteMapSemKilo
    };

    this.auditoria.registrar('KILO_RECONCILIADO', `Reconciliação Kilo concluída: ${sessoesDesconhecidas.length} desconhecidas, ${sessoesAgenteMapSemKilo.length} offline.`, {
      sessoesDesconhecidas: sessoesDesconhecidas.length,
      sessoesAgenteMapSemKilo: sessoesAgenteMapSemKilo.length
    });

    return { sucesso: true, dados: resultado };
  }

  async obterEstadoKilo(): Promise<ResultadoOperacao<KiloState>> {
    const discovery = new KiloDiscoveryService(this.fs, this.auditoria, this.projetoPath);
    return discovery.descobrir();
  }

  private async carregarSessoesAgentMap(): Promise<Array<{ id: string }>> {
    const registryPath = path.win32.join('.ia', 'sessoes', 'sessoes.json');
    const result = this.fs.lerJson<{ sessoes: Array<{ id: string }> }>(registryPath);
    if (!result.sucesso || !result.dados) {
      return [];
    }
    return result.dados.sessoes || [];
  }
}
