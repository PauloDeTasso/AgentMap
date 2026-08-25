import * as path from 'path';
import { EventEmitter } from 'events';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { ModoAutonomia, KiloState, KiloSession } from '../tipos';
import { ResultadoOperacao } from '../tipos';
import { globalEventBus } from '../mcp-server/events/event-bus';

export type ModoOperacao = ModoAutonomia;
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
  eventSequence?: number;
}

export interface StatusAgenteMonitoramento {
  id: string;
  nome: string;
  status: StatusAgente;
  modo: ModoOperacao;
  tarefaAtualId?: string;
  tarefaAtualTitulo?: string;
  ultimaAtividade: string;
  ultimoHeartbeat: string;
  sessionId?: string;
}

export interface ConfigMonitoramento {
  modoGlobal: ModoOperacao;
  ultimaAtualizacao: string;
  timeoutHeartbeat: number;
}

export interface AlertaMonitoramento {
  id: string;
  nome: string;
  descricao: string;
  tipo: 'LIMIAR' | 'EVENTO' | 'CONDICAO';
  condicao: string;
  acao: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface RegraMonitoramento {
  id: string;
  nome: string;
  descricao: string;
  gatilho: string;
  acao: string;
  parametros: Record<string, unknown>;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export class MonitoramentoService extends EventEmitter {
  private statusPath = '.ia/contexto/status';
  private configPath = '.ia/configuracao/monitoramento.json';
  private mensagensPath = '.ia/contexto/mensagens-monitoramento.json';
  private sequencePath = '.ia/contexto/monitoramento-sequence.json';
  private alertasPath = '.ia/contexto/monitoramento-alertas.json';
  private regrasPath = '.ia/contexto/monitoramento-regras.json';
  private logsLimit = 500;
  private ultimoSequence: number = 0;
  private sequenceLock: Promise<unknown> = Promise.resolve();

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    super();
    this.setMaxListeners(100);
    this.carregarConfig();
    this.carregarMensagens();
    this.carregarSequence();
  }

  private carregarSequence(): void {
    const result = this.fs.lerJson<{ ultimoSequence: number }>(this.sequencePath);
    if (result.sucesso && result.dados && typeof result.dados.ultimoSequence === 'number') {
      this.ultimoSequence = result.dados.ultimoSequence;
    } else {
      const msgs = this.carregarMensagens();
      const maxSeq = msgs.reduce((max, m) => Math.max(max, (m as any).eventSequence || 0), 0);
      this.ultimoSequence = maxSeq;
      this.salvarSequence();
    }
  }

  private salvarSequence(): ResultadoOperacao<string> {
    return this.fs.escreverJson(this.sequencePath, { ultimoSequence: this.ultimoSequence });
  }

  private proximoSequence(): number {
    this.ultimoSequence += 1;
    return this.ultimoSequence;
  }

  private comLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.sequenceLock.then(() => fn()).catch((err) => {
      this.sequenceLock = Promise.resolve();
      throw err;
    });
    this.sequenceLock = next.catch(() => {});
    return next;
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
        modoGlobal: 'MANUAL',
        ultimaAtualizacao: new Date().toISOString(),
        timeoutHeartbeat: 300000
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

  listarMensagensApos(after: number, limite = 100): { mensagens: MensagemMonitoramento[]; ultimoEventSequence: number } {
    const msgs = this.carregarMensagens();
    const sanitizadas = msgs
      .filter((m: any) => after === 0 || (typeof m.eventSequence === 'number' && m.eventSequence > after))
      .map(msg => ({
        ...msg,
        conteudo: this.sanitizarConteudo(msg.conteudo || '')
      }));
    const sliced = sanitizadas.slice(-limite);
    return { mensagens: sliced, ultimoEventSequence: this.ultimoSequence };
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
      const configAtual = this.carregarConfig();
      const config: ConfigMonitoramento = {
        modoGlobal: modo,
        ultimaAtualizacao: new Date().toISOString(),
        timeoutHeartbeat: configAtual.timeoutHeartbeat
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
      const statusPath = path.join(this.statusPath, `${agenteId}.json`);
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
          ultimaAtividade: new Date().toISOString(),
          ultimoHeartbeat: new Date().toISOString()
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

  async atualizarStatusAgente(
    agenteId: string,
    status: StatusAgente,
    dados?: {
      tarefaId?: string;
      tarefaTitulo?: string;
      sessionId?: string;
      conteudo?: string;
      tipo?: string;
      progresso?: number;
      acoes?: Array<{ label: string; comando: string; estilo?: string }>;
      motivo?: string;
    }
  ): Promise<ResultadoOperacao<string>> {
    const config = this.carregarConfig();
    const statusPath = path.join(this.statusPath, `${agenteId}.json`);

    let info: StatusAgenteMonitoramento = {
      id: agenteId,
      nome: agenteId,
      status,
      modo: config.modoGlobal,
      ultimaAtividade: new Date().toISOString(),
      ultimoHeartbeat: new Date().toISOString(),
      sessionId: dados?.sessionId,
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
      await this.adicionarMensagem(msg);
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
    const agentes: StatusAgenteMonitoramento[] = [];
    const registryResult = this.fs.lerJson<{ agentes: Array<{ id: string; nome: string; arquivoPerfil: string }> }>('.ia/agentes/agentes.json');

    if (registryResult.sucesso && registryResult.dados?.agentes) {
      const config = this.carregarConfig();
      for (const agente of registryResult.dados.agentes) {
        const statusPath = path.join(this.statusPath, `${agente.id}.json`);
        const result = this.fs.lerJson<StatusAgenteMonitoramento>(statusPath);
        const info: StatusAgenteMonitoramento = result.sucesso && result.dados ? result.dados : {
          id: agente.id,
          nome: agente.nome,
          status: 'DISPONIVEL' as StatusAgente,
          modo: config.modoGlobal,
          ultimaAtividade: new Date().toISOString(),
          ultimoHeartbeat: new Date().toISOString()
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

  async adicionarMensagem(msg: MensagemMonitoramento): Promise<ResultadoOperacao<{ id: string }>> {
    return this.comLock(async () => {
      const msgs = this.carregarMensagens();
      const sanitizado = { ...msg, conteudo: this.sanitizarConteudo(msg.conteudo || '') };
      sanitizado.eventSequence = this.proximoSequence();
      msgs.push(sanitizado);
      const result = this.salvarMensagens(msgs);
      if (!result.sucesso) {
        return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
      }

      const seqResult = this.salvarSequence();
      if (!seqResult.sucesso) {
        console.error(`[Monitoramento] Falha ao salvar sequence: ${seqResult.erro}`);
      }

      this.broadcast(sanitizado);
      globalEventBus.publish({ uri: 'agentmap://monitoramento/mensagens', timestamp: Date.now(), reason: 'nova_mensagem' });
      return { sucesso: true, dados: { id: sanitizado.id } };
    });
  }

  broadcast(mensagem: MensagemMonitoramento): void {
    this.emit('mensagem', mensagem);
  }

  registrarHeartbeat(agenteId: string): ResultadoOperacao<string> {
    const statusPath = path.join(this.statusPath, `${agenteId}.json`);
    const result = this.fs.lerJson<StatusAgenteMonitoramento>(statusPath);
    const config = this.carregarConfig();

    let info: StatusAgenteMonitoramento;
    if (result.sucesso && result.dados) {
      info = { ...result.dados, ultimoHeartbeat: new Date().toISOString() };
    } else {
      info = {
        id: agenteId,
        nome: agenteId,
        status: 'DISPONIVEL' as StatusAgente,
        modo: config.modoGlobal,
        ultimaAtividade: new Date().toISOString(),
        ultimoHeartbeat: new Date().toISOString()
      };
    }

    const writeResult = this.fs.escreverJson(statusPath, info);
    if (!writeResult.sucesso) {
      return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    }

    return { sucesso: true };
  }

  verificarOrfaos(): ResultadoOperacao<string[]> {
    const config = this.carregarConfig();
    const agora = Date.now();
    const timeout = config.timeoutHeartbeat || 300000;
    const agentesResult = this.fs.listar('.ia/agentes');
    const orfaos: string[] = [];

    if (!agentesResult.sucesso || !agentesResult.dados) {
      return { sucesso: true, dados: orfaos };
    }

    for (const agente of agentesResult.dados) {
      const statusPath = path.join(this.statusPath, `${agente.nome}.json`);
      const result = this.fs.lerJson<StatusAgenteMonitoramento>(statusPath);
      if (!result.sucesso || !result.dados) continue;

      const ultimoHb = new Date(result.dados.ultimoHeartbeat).getTime();
      if (agora - ultimoHb > timeout) {
        orfaos.push(agente.nome);
      }
    }

    this.auditoria.registrar('AGENTES_ORFAOS', `${orfaos.length} agentes órfãos detectados`, { orfaos });
    return { sucesso: true, dados: orfaos };
  }

  marcarOrfaos(): ResultadoOperacao<string[]> {
    const config = this.carregarConfig();
    const agora = Date.now();
    const timeout = config.timeoutHeartbeat || 300000;
    const agentesResult = this.fs.listar('.ia/agentes');
    const orfaos: string[] = [];

    if (!agentesResult.sucesso || !agentesResult.dados) {
      return { sucesso: true, dados: orfaos };
    }

    for (const agente of agentesResult.dados) {
      const statusPath = path.join(this.statusPath, `${agente.nome}.json`);
      const result = this.fs.lerJson<StatusAgenteMonitoramento>(statusPath);
      if (!result.sucesso || !result.dados) continue;

      const ultimoHb = new Date(result.dados.ultimoHeartbeat).getTime();
      if (agora - ultimoHb > timeout) {
        orfaos.push(agente.nome);
        this.fs.escreverJson(statusPath, { ...result.dados, status: 'ORFA' as StatusAgente });
      }
    }

    this.auditoria.registrar('AGENTES_ORFAOS_MARCADOS', `${orfaos.length} agentes órfãos marcados`, { orfaos });
    return { sucesso: true, dados: orfaos };
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
    await this.adicionarMensagem(msg);

    return { sucesso: true, dados: { comando, payload, timestamp: msg.timestamp } };
  }

  listarPendentesDispatcher(_agenteId?: string) {
    return { sucesso: true, dados: [] };
  }

  async executarPendenteDispatcher(_agenteId: string) {
    return { sucesso: false, erro: 'Dispatcher depreciado. Use Agent Manager worktrees.', codigoErro: 'NOT_IMPLEMENTED' };
  }

  listarLogsDispatcher(_limite = 100) {
    return { sucesso: true, dados: [] };
  }

  private getKiloStatePath(): string {
    return path.join('.ia', 'contexto', 'kilo-state.json');
  }

  async registrarKiloState(estado: KiloState): Promise<ResultadoOperacao<string>> {
    const result = this.fs.escreverJson(this.getKiloStatePath(), estado);
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }

    const msg: MensagemMonitoramento = {
      id: `MSG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      tipo: 'KILO_DESCOBERTO',
      emissor: 'sistema',
      conteudo: `Estado Kilo atualizado: ${estado.worktrees.length} worktrees, ${estado.sessoes.length} sessoes, ${estado.agentes.length} agentes.`,
      dados: estado
    };
    this.broadcast(msg);

    return { sucesso: true, dados: this.getKiloStatePath() };
  }

  async obterKiloState(): Promise<ResultadoOperacao<KiloState>> {
    const result = this.fs.lerJson<KiloState>(this.getKiloStatePath());
    if (!result.sucesso || !result.dados) {
      return { sucesso: true, dados: {
        descobertoEm: new Date().toISOString(),
        worktrees: [],
        sessoes: [],
        agentes: []
      }};
    }
    return result;
  }

  broadcastKiloEvent(tipo: 'KILO_DESCOBERTO' | 'KILO_RECONCILIADO' | 'KILO_SESSION_DESCONHECIDA', dados: Record<string, unknown>): void {
    const msg: MensagemMonitoramento = {
      id: `MSG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      tipo,
      emissor: 'sistema',
      conteudo: (dados.mensagem as string) || `Evento Kilo: ${tipo}`,
      dados
    };
    this.broadcast(msg);
  }

  limparAgentes(): ResultadoOperacao<string> {
    const statusResult = this.fs.listar(this.statusPath);
    if (statusResult.sucesso && statusResult.dados) {
      for (const file of statusResult.dados) {
        this.fs.excluir(path.join(this.statusPath, file.nome), { backup: false });
      }
    }

    const agentesResult = this.fs.listar('.ia/agentes');
    if (agentesResult.sucesso && agentesResult.dados) {
      for (const entry of agentesResult.dados) {
        if (entry.nome === 'agentes.json') continue;
        this.fs.excluir(path.join('.ia', 'agentes', entry.nome), { backup: false });
      }
    }

    this.fs.escreverJson('.ia/agentes/agentes.json', { agentes: [] });
    this.auditoria.registrar('AGENTES_MONITORAMENTO_LIMPAR', 'Agentes do monitoramento limpos', {});
    return { sucesso: true };
  }

  excluirAgente(agenteId: string): ResultadoOperacao<string> {
    const registryResult = this.fs.lerJson<{ agentes: Array<{ id: string; nome: string; arquivoPerfil: string }> }>('.ia/agentes/agentes.json');
    if (!registryResult.sucesso || !registryResult.dados?.agentes) {
      return { sucesso: false, erro: 'Agente não encontrado', codigoErro: 'NOT_FOUND' };
    }

    const agente = registryResult.dados.agentes.find(a => a.id === agenteId);
    if (!agente) {
      return { sucesso: false, erro: 'Agente não encontrado', codigoErro: 'NOT_FOUND' };
    }

    this.fs.excluir(path.join('.ia', 'agentes', agente.arquivoPerfil), { backup: false });
    this.fs.excluir(path.join(this.statusPath, `${agenteId}.json`), { backup: false });

    const atualizados = registryResult.dados.agentes.filter(a => a.id !== agenteId);
    this.fs.escreverJson('.ia/agentes/agentes.json', { agentes: atualizados });
    this.auditoria.registrar('AGENTE_MONITORAMENTO_EXCLUIDO', `Agente ${agenteId} excluído do monitoramento`, { agenteId });
    return { sucesso: true };
  }

  excluirMensagem(id: string): ResultadoOperacao<string> {
    const msgs = this.carregarMensagens();
    const filtradas = msgs.filter((m: any) => m.id !== id);
    const result = this.salvarMensagens(filtradas);
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    this.auditoria.registrar('MENSAGEM_MONITORAMENTO_EXCLUIDA', `Mensagem ${id} excluída`, { id });
    return { sucesso: true };
  }

  limparMensagens(): ResultadoOperacao<string> {
    const result = this.salvarMensagens([]);
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    this.auditoria.registrar('MENSAGENS_MONITORAMENTO_LIMPAR', 'Todas as mensagens de monitoramento foram limpas', {});
    return { sucesso: true };
  }

  private carregarAlertas(): AlertaMonitoramento[] {
    const result = this.fs.lerJson<AlertaMonitoramento[]>(this.alertasPath);
    if (!result.sucesso || !result.dados) {
      return [];
    }
    return result.dados;
  }

  private salvarAlertas(alertas: AlertaMonitoramento[]): ResultadoOperacao<string> {
    return this.fs.escreverJson(this.alertasPath, alertas, { backup: true });
  }

  listarAlertas(): AlertaMonitoramento[] {
    return this.carregarAlertas();
  }

  obterAlerta(id: string): AlertaMonitoramento | null {
    const alertas = this.carregarAlertas();
    return alertas.find(a => a.id === id) || null;
  }

  criarAlerta(dados: Omit<AlertaMonitoramento, 'id' | 'criadoEm' | 'atualizadoEm'>): ResultadoOperacao<AlertaMonitoramento> {
    if (!dados.nome || !dados.condicao || !dados.acao) {
      return { sucesso: false, erro: 'nome, condicao e acao são obrigatórios', codigoErro: 'MISSING_FIELDS' };
    }
    const alertas = this.carregarAlertas();
    const agora = new Date().toISOString();
    const alerta: AlertaMonitoramento = {
      ...dados,
      id: `ALERTA-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      criadoEm: agora,
      atualizadoEm: agora
    };
    alertas.push(alerta);
    const result = this.salvarAlertas(alertas);
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    this.auditoria.registrar('ALERTA_CRIADO', `Alerta "${alerta.nome}" criado`, { id: alerta.id });
    return { sucesso: true, dados: alerta };
  }

  atualizarAlerta(id: string, dados: Partial<Omit<AlertaMonitoramento, 'id' | 'criadoEm'>>): ResultadoOperacao<AlertaMonitoramento> {
    const alertas = this.carregarAlertas();
    const idx = alertas.findIndex(a => a.id === id);
    if (idx === -1) {
      return { sucesso: false, erro: 'Alerta não encontrado', codigoErro: 'NOT_FOUND' };
    }
    alertas[idx] = { ...alertas[idx], ...dados, atualizadoEm: new Date().toISOString() };
    const result = this.salvarAlertas(alertas);
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    this.auditoria.registrar('ALERTA_ATUALIZADO', `Alerta "${alertas[idx].nome}" atualizado`, { id });
    return { sucesso: true, dados: alertas[idx] };
  }

  excluirAlerta(id: string): ResultadoOperacao<string> {
    const alertas = this.carregarAlertas();
    const filtrados = alertas.filter(a => a.id !== id);
    if (filtrados.length === alertas.length) {
      return { sucesso: false, erro: 'Alerta não encontrado', codigoErro: 'NOT_FOUND' };
    }
    const result = this.salvarAlertas(filtrados);
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    this.auditoria.registrar('ALERTA_EXCLUIDO', `Alerta ${id} excluído`, { id });
    return { sucesso: true };
  }

  private carregarRegras(): RegraMonitoramento[] {
    const result = this.fs.lerJson<RegraMonitoramento[]>(this.regrasPath);
    if (!result.sucesso || !result.dados) {
      return [];
    }
    return result.dados;
  }

  private salvarRegras(regras: RegraMonitoramento[]): ResultadoOperacao<string> {
    return this.fs.escreverJson(this.regrasPath, regras, { backup: true });
  }

  listarRegras(): RegraMonitoramento[] {
    return this.carregarRegras();
  }

  obterRegra(id: string): RegraMonitoramento | null {
    const regras = this.carregarRegras();
    return regras.find(r => r.id === id) || null;
  }

  criarRegra(dados: Omit<RegraMonitoramento, 'id' | 'criadoEm' | 'atualizadoEm'>): ResultadoOperacao<RegraMonitoramento> {
    if (!dados.nome || !dados.gatilho || !dados.acao) {
      return { sucesso: false, erro: 'nome, gatilho e acao são obrigatórios', codigoErro: 'MISSING_FIELDS' };
    }
    const regras = this.carregarRegras();
    const agora = new Date().toISOString();
    const regra: RegraMonitoramento = {
      ...dados,
      id: `REGRA-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      criadoEm: agora,
      atualizadoEm: agora
    };
    regras.push(regra);
    const result = this.salvarRegras(regras);
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    this.auditoria.registrar('REGRA_CRIADA', `Regra "${regra.nome}" criada`, { id: regra.id });
    return { sucesso: true, dados: regra };
  }

  atualizarRegra(id: string, dados: Partial<Omit<RegraMonitoramento, 'id' | 'criadoEm'>>): ResultadoOperacao<RegraMonitoramento> {
    const regras = this.carregarRegras();
    const idx = regras.findIndex(r => r.id === id);
    if (idx === -1) {
      return { sucesso: false, erro: 'Regra não encontrada', codigoErro: 'NOT_FOUND' };
    }
    regras[idx] = { ...regras[idx], ...dados, atualizadoEm: new Date().toISOString() };
    const result = this.salvarRegras(regras);
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    this.auditoria.registrar('REGRA_ATUALIZADA', `Regra "${regras[idx].nome}" atualizada`, { id });
    return { sucesso: true, dados: regras[idx] };
  }

  excluirRegra(id: string): ResultadoOperacao<string> {
    const regras = this.carregarRegras();
    const filtradas = regras.filter(r => r.id !== id);
    if (filtradas.length === regras.length) {
      return { sucesso: false, erro: 'Regra não encontrada', codigoErro: 'NOT_FOUND' };
    }
    const result = this.salvarRegras(filtradas);
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    this.auditoria.registrar('REGRA_EXCLUIDA', `Regra ${id} excluída`, { id });
    return { sucesso: true };
  }

  atualizarConfiguracao(config: Partial<ConfigMonitoramento>): ResultadoOperacao<ConfigMonitoramento> {
    const configAtual = this.carregarConfig();
    const novaConfig = { ...configAtual, ...config, ultimaAtualizacao: new Date().toISOString() };
    const result = this.fs.escreverJson(this.configPath, novaConfig);
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    this.auditoria.registrar('CONFIG_MONITORAMENTO_ATUALIZADA', 'Configuração de monitoramento atualizada', config);
    return { sucesso: true, dados: novaConfig };
  }

  obterConfiguracao(): ConfigMonitoramento {
    return this.carregarConfig();
  }
}
