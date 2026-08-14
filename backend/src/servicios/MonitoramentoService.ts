import * as path from 'path';
import { EventEmitter } from 'events';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { KiloDispatcherService } from './KiloDispatcherService';
import { ResultadoOperacao } from '../tipos';

export type ModoOperacao = 'AUTOMATICO' | 'HIBRIDO' | 'MANUAL';
export type StatusAgente = 'ATIVO' | 'AGUARDANDO' | 'ERRO' | 'OFFLINE' | 'DISPONIVEL';

export interface MensagemMonitoramento {
  id: string;
  timestamp: string;
  tipo: string;
  emissor: string;
  agenteId?: string;
  tarefaId?: string;
  conteudo: string;
  progresso?: number;
  dados?: any;
  acoes?: Array<{ label: string; comando: string; estilo?: string }>;
  modo?: ModoOperacao;
}

export interface StatusAgenteMonitoramento {
  id: string;
  nome: string;
  status: StatusAgente;
  modo: ModoOperacao;
  tarefaAtualId?: string;
  tarefaAtualTitulo?: string;
  ultimaAtividade: string;
  sessionId?: string;
  autoApprove: boolean;
}

export interface ConfigMonitoramento {
  modoGlobal: ModoOperacao;
  ultimaAtualizacao: string;
}

export class MonitoramentoService extends EventEmitter {
  private statusPath = '.ia/contexto/status';
  private configPath = '.ia/configuracao/monitoramento.json';
  private mensagensPath = '.ia/contexto/mensagens-monitoramento.json';
  private logsLimit = 500;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator,
    private dispatcher: KiloDispatcherService
  ) {
    super();
    this.setMaxListeners(100);
    this.carregarConfig();
    this.carregarMensagens();
  }

  private sanitizarConteudo(conteudo: string): string {
    if (!conteudo) return '';
    return conteudo
      .replace(/<environment_details\b[^>]*>[\s\S]*?<\/environment_details>/gi, '')
      .replace(/<environment_details\b[^>]*\/>/gi, '')
      .replace(/Current time:[\s\S]*?Workspace root folder:[\s\S]*/gi, '')
      .replace(/\s*\n\s*/g, '\n')
      .trim();
  }

  private carregarConfig(): ConfigMonitoramento {
    const result = this.fs.lerJson<ConfigMonitoramento>(this.configPath);
    if (!result.sucesso || !result.dados) {
      return {
        modoGlobal: 'AUTOMATICO',
        ultimaAtualizacao: new Date().toISOString()
      };
    }
    return result.dados;
  }

  private salvarConfig(): ResultadoOperacao<string> {
    const config = this.carregarConfig();
    config.ultimaAtualizacao = new Date().toISOString();
    return this.fs.escreverJson(this.configPath, config);
  }

  private carregarMensagens(): MensagemMonitoramento[] {
    const result = this.fs.lerJson<MensagemMonitoramento[]>(this.mensagensPath);
    if (!result.sucesso || !result.dados) {
      return [];
    }
    return result.dados;
  }

  private salvarMensagens(mensagens: MensagemMonitoramento[]): ResultadoOperacao<string> {
    if (mensagens.length > this.logsLimit) {
      mensagens = mensagens.slice(-this.logsLimit);
    }
    return this.fs.escreverJson(this.mensagensPath, mensagens);
  }

  obterModo(): { modoGlobal: ModoOperacao } {
    const config = this.carregarConfig();
    return { modoGlobal: config.modoGlobal };
  }

  alterarModo(
    modo: ModoOperacao,
    escopo: 'GLOBAL' | 'AGENTE',
    agenteId?: string
  ): ResultadoOperacao<ConfigMonitoramento> {
    if (escopo === 'GLOBAL') {
      const config: ConfigMonitoramento = {
        modoGlobal: modo,
        ultimaAtualizacao: new Date().toISOString()
      };
      const result = this.fs.escreverJson(this.configPath, config);
      if (!result.sucesso) {
        return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
      }
      this.broadcast({
        id: `MSG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        tipo: 'MODO_ALTERADO',
        emissor: 'sistema',
        conteudo: `Modo alterado para ${modo} (global)`,
        modo
      });
      this.auditoria.registrar('MODO_GLOBAL_ALTERADO', `Modo global alterado para ${modo}`, { modo, escopo: 'GLOBAL' });
      return { sucesso: true, dados: config };
    }

    if (escopo === 'AGENTE' && agenteId) {
      const statusPath = path.win32.join(this.statusPath, `${agenteId}.json`);
      const result = this.fs.lerJson<StatusAgenteMonitoramento>(statusPath);
      const config = this.carregarConfig();

      if (result.sucesso && result.dados) {
        result.dados.modo = modo;
      } else {
        const defaultConfig: Partial<StatusAgenteMonitoramento> = {
          id: agenteId,
          nome: agenteId,
          status: 'DISPONIVEL' as StatusAgente,
          modo,
          ultimaAtividade: new Date().toISOString()
        };
        this.fs.escreverJson(statusPath, defaultConfig);
      }

      this.broadcast({
        id: `MSG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        tipo: 'MODO_ALTERADO',
        emissor: 'sistema',
        agenteId,
        conteudo: `Modo alterado para ${modo} (agente: ${agenteId})`,
        modo
      });
      this.auditoria.registrar('MODO_AGENTE_ALTERADO', `Modo de ${agenteId} alterado para ${modo}`, { modo, agenteId, escopo: 'AGENTE' });
      return { sucesso: true, dados: { ...config } };
    }

    return { sucesso: false, erro: 'escopo inválido', codigoErro: 'INVALID_SCOPE' };
  }

  atualizarStatusAgente(
    agenteId: string,
    status: StatusAgente,
    dados?: {
      tarefaId?: string;
      tarefaTitulo?: string;
      sessionId?: string;
      autoApprove?: boolean;
      conteudo?: string;
      tipo?: string;
      progresso?: number;
      acoes?: Array<{ label: string; comando: string; estilo?: string }>;
      motivo?: string;
    }
  ): ResultadoOperacao<string> {
    const config = this.carregarConfig();
    const statusPath = path.win32.join(this.statusPath, `${agenteId}.json`);

    let info: StatusAgenteMonitoramento = {
      id: agenteId,
      nome: agenteId,
      status,
      modo: dados?.autoApprove ? 'AUTOMATICO' : (status === 'ERRO' ? 'HIBRIDO' : config.modoGlobal),
      ultimaAtividade: new Date().toISOString(),
      sessionId: dados?.sessionId,
      autoApprove: dados?.autoApprove ?? false,
      tarefaAtualId: dados?.tarefaId,
      tarefaAtualTitulo: dados?.tarefaTitulo
    };

    const resultExistente = this.fs.lerJson<StatusAgenteMonitoramento>(statusPath);
    if (resultExistente.sucesso && resultExistente.dados) {
      info = { ...resultExistente.dados, ...info };
    }

    const writeResult = this.fs.escreverJson(statusPath, info);
    if (!writeResult.sucesso) {
      return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    }

    if (dados?.conteudo || dados?.tipo) {
      const msg: MensagemMonitoramento = {
        id: `MSG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        tipo: dados?.tipo || 'ATUALIZAR_STATUS',
        emissor: agenteId,
        agenteId,
        tarefaId: dados?.tarefaId,
        conteudo: dados?.conteudo || `Status atualizado para ${status}`,
        progresso: dados?.progresso,
        acoes: dados?.acoes,
        dados: dados
      };
      this.adicionarMensagem(msg);
    }

    const msgStatus: MensagemMonitoramento = {
      id: `MSG-${Date.now()}-${agenteId}`,
      timestamp: new Date().toISOString(),
      tipo: 'AGENTE_STATUS_ALTERADO',
      emissor: 'sistema',
      agenteId,
      conteudo: `Agente ${agenteId} agora está ${status}`,
      dados: dados?.motivo
    };
    this.broadcast(msgStatus);

    this.auditoria.registrar('STATUS_AGENTE_ATUALIZADO', `Status de ${agenteId} atualizado para ${status}`, { agenteId, status });
    return { sucesso: true };
  }

  listarAgentes(): StatusAgenteMonitoramento[] {
    const agentesResult = this.fs.listar('.ia/agentes');
    const agentes: StatusAgenteMonitoramento[] = [];

    if (agentesResult.sucesso && agentesResult.dados) {
      for (const agente of agentesResult.dados) {
        const statusPath = path.win32.join(this.statusPath, `${agente.nome}.json`);
        const result = this.fs.lerJson<StatusAgenteMonitoramento>(statusPath);

        const config = this.carregarConfig();
        const info: StatusAgenteMonitoramento = result.sucesso && result.dados ? result.dados : {
          id: agente.nome,
          nome: agente.nome,
          status: 'DISPONIVEL' as StatusAgente,
          modo: config.modoGlobal,
          ultimaAtividade: new Date().toISOString(),
          autoApprove: false
        };
        agentes.push(info);
      }
    }

    return agentes;
  }

  listarMensagens(limite = 100): MensagemMonitoramento[] {
    const msgs = this.carregarMensagens();
    const sanitizadas = msgs.map(msg => ({
      ...msg,
      conteudo: this.sanitizarConteudo(msg.conteudo || '')
    }));
    return sanitizadas.slice(-limite).reverse();
  }

  adicionarMensagem(msg: MensagemMonitoramento): ResultadoOperacao<string> {
    const msgs = this.carregarMensagens();
    const sanitizado = { ...msg, conteudo: this.sanitizarConteudo(msg.conteudo || '') };
    msgs.push(sanitizado);
    const result = this.salvarMensagens(msgs);
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    this.broadcast(sanitizado);
    return { sucesso: true };
  }

  broadcast(mensagem: MensagemMonitoramento): void {
    this.emit('mensagem', mensagem);
  }

  async executarIntervencao(
    comando: string,
    payload: Record<string, unknown>
  ): Promise<ResultadoOperacao<any>> {
    const comandosValidos = ['PAUSAR_TAREFA', 'CANCELAR_AGENTE', 'REDIRECIONAR_TAREFA', 'APROVAR', 'REJEITAR'];

    if (!comandosValidos.includes(comando)) {
      return { sucesso: false, erro: `Comando inválido: ${comando}`, codigoErro: 'INVALID_COMMAND' };
    }

    this.auditoria.registrar('INTERVENCAO_MANUAL', `Intervenção: ${comando}`, payload);

    const msg: MensagemMonitoramento = {
      id: `MSG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      tipo: 'INTERVENCAO_USUARIO',
      emissor: 'usuario',
      conteudo: `Comando: ${comando}`,
      dados: payload
    };
    this.adicionarMensagem(msg);

    return { sucesso: true, dados: { comando, payload, timestamp: msg.timestamp } };
  }

  listarPendentesDispatcher(agenteId?: string) {
    return this.dispatcher.listarPendentes(agenteId);
  }

  async executarPendenteDispatcher(agenteId: string) {
    const result = await this.dispatcher.executarPendente(agenteId);
    if (!result.sucesso || !result.dados) {
      return result;
    }

    const log = result.dados;
    const msg: MensagemMonitoramento = {
      id: `MSG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      tipo: 'DISPATCH_EXECUTADO',
      emissor: 'dispatcher',
      agenteId,
      tarefaId: log.tarefaId,
      conteudo: `Dispatch ${log.status} para ${agenteId}`,
      progresso: log.status === 'SUCESSO' ? 100 : 0,
      dados: {
        comando: log.comando,
        status: log.status,
        exitCode: log.exitCode,
        duracaoMs: log.duracaoMs,
        sessionId: log.sessionId
      }
    };
    this.adicionarMensagem(msg);
    return result;
  }

  listarLogsDispatcher(limite = 100) {
    return this.dispatcher.listarLogs(limite);
  }
}

