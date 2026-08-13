import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import {
  SolicitacaoAlteracao,
  SolicitacoesRegistry,
  ResultadoOperacao,
  EstadoSolicitacao,
  PrioridadeSolicitacao,
  TipoAlteracao,
  TipoAlvo,
  ImpactoArea,
  EventoHistoricoSolicitacao,
  HistoricoSolicitacoes,
  TRANSICOES_ESTADO_SOLICITACAO
} from '../tipos';
import { validarTransicao } from '../tipos';
import { v4 as uuid } from 'uuid';

import { IdGenerator } from '../arquivos/IdGenerator';
import { EventoService } from './EventoService';

export class SolicitacaoService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator,
    private eventoService?: EventoService
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.win32.join('.ia', 'solicitacoes', 'solicitacoes.json');
  }

  private getHistoricoPath(): string {
    return path.win32.join('.ia', 'solicitacoes', 'historico-alteracoes.json');
  }

  private getSolicitacaoPath(id: string): string {
    return path.win32.join('.ia', 'solicitacoes', `${id}.json`);
  }

  private gerarId(ano: string = new Date().getFullYear().toString()): string {
    return this.idGenerator.gerarId('ALT', this.getRegistryPath(), 'solicitacoes');
  }

  private obterProximoNumero(ano: string): number {
    const result = this.fs.lerJson<SolicitacoesRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) {
      return 1;
    }
    const maxSeq = result.dados.solicitacoes
      .filter((s) => s.id.startsWith(`ALT-${ano}-`))
      .map((s) => parseInt(s.id.split('-')[2] || '0', 10))
      .reduce((max, n) => Math.max(max, n), 0);
    return maxSeq + 1;
  }

  private carregarRegistry(): ResultadoOperacao<SolicitacoesRegistry> {
    const result = this.fs.lerJson<SolicitacoesRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) {
      return { sucesso: true, dados: { solicitacoes: [] } };
    }
    return result;
  }

  private salvarRegistry(registry: SolicitacoesRegistry): void {
    this.fs.escreverJson(this.getRegistryPath(), registry);
  }

  private registrarHistorico(
    solicitacaoId: string,
    tipo: string,
    agenteId: string | null = null,
    observacao: string | null = null
  ): void {
    const historicoResult = this.fs.lerJson<HistoricoSolicitacoes>(this.getHistoricoPath());
    const historico: HistoricoSolicitacoes = historicoResult.sucesso && historicoResult.dados
      ? historicoResult.dados
      : { eventos: [] };

    const evento: EventoHistoricoSolicitacao = {
      id: uuid(),
      solicitacaoId,
      tipo,
      data: new Date().toISOString(),
      agenteId,
      observacao
    };
    historico.eventos.push(evento);
    this.fs.escreverJson(this.getHistoricoPath(), historico);
  }

  listar(): ResultadoOperacao<SolicitacaoAlteracao[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    console.log('[SolicitacaoService.listar] solicitacoes encontradas:', result.dados.solicitacoes.length);
    return { sucesso: true, dados: result.dados.solicitacoes };
  }

  obter(id: string): ResultadoOperacao<SolicitacaoAlteracao> {
    console.log('[SolicitacaoService.obter] buscando:', id);
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    }
    const registro = registryResult.dados.solicitacoes.find((s) => s.id === id);
    if (!registro) {
      console.error('[SolicitacaoService.obter] nao encontrada:', id);
      return { sucesso: false, erro: 'Solicitação não encontrada', codigoErro: 'NOT_FOUND' };
    }

    const fileResult = this.fs.lerJson<SolicitacaoAlteracao>(this.getSolicitacaoPath(id));
    if (!fileResult.sucesso || !fileResult.dados) {
      return { sucesso: false, erro: 'Não foi possível ler a solicitação', codigoErro: 'READ_ERROR' };
    }
    console.log('[SolicitacaoService.obter] encontrada:', id, '| titulo=' + fileResult.dados.titulo);
    return { sucesso: true, dados: fileResult.dados };
  }

  async criar(dados: Partial<SolicitacaoAlteracao>): Promise<ResultadoOperacao<SolicitacaoAlteracao>> {
    console.log('[SolicitacaoService.criar] iniciando...');

    const hoje = new Date().toISOString();
    const id = dados.id || this.gerarId();

    if (dados.id) {
      const exists = this.obter(dados.id);
      if (exists.sucesso) {
        return { sucesso: false, erro: `ID '${dados.id}' já existe`, codigoErro: 'DUPLICATE_ID' };
      }
    }

    const solicitacao: SolicitacaoAlteracao = {
      id,
      titulo: dados.titulo || '',
      descricao: dados.descricao || '',
      agenteSolicitante: dados.agenteSolicitante || { id: '' },
      agenteResponsavel: dados.agenteResponsavel || { id: null },
      alvo: dados.alvo || { tipo: 'ARQUIVO', nome: '' },
      alteracao: dados.alteracao || { tipo: 'ADICAO', descricao: '', motivo: '', arquivosAfetados: [] },
      impactos: dados.impactos || [],
      dependencias: dados.dependencias || [],
      prioridade: dados.prioridade || 'MEDIA',
      status: dados.status || 'PENDENTE',
      requerAprovacao: dados.requerAprovacao ?? true,
      aprovacao: dados.aprovacao || { status: 'PENDENTE', agenteId: null, data: null, observacao: null },
      tarefaOrigem: dados.tarefaOrigem || null,
      datas: {
        criadaEm: hoje,
        atualizadaEm: hoje,
        concluidaEm: null
      },
      observacoes: dados.observacoes || null
    };

    const validation = this.validator.validar('solicitacao-alteracao', solicitacao);
    if (!validation.valido) {
      console.error('[SolicitacaoService.criar] validacao falhou:', validation.erros?.join(', '));
      return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    const fileResult = this.fs.escreverJson(this.getSolicitacaoPath(id), solicitacao, { backup: true });
    if (!fileResult.sucesso) {
      return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };
    }

    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };
    }
    registryResult.dados.solicitacoes.push(solicitacao);
    this.salvarRegistry(registryResult.dados);
    this.registrarHistorico(id, 'SOLICITACAO_CRIADA', solicitacao.agenteSolicitante.id);

    this.auditoria.registrar(
      'SOLICITACAO_CRIADA',
      `Solicitação '${id}' criada: ${solicitacao.titulo}`,
      { solicitacaoId: id, prioridade: solicitacao.prioridade, alvoTipo: solicitacao.alvo.tipo }
    );
    if (this.eventoService && solicitacao.agenteResponsavel.id) {
      this.eventoService.registrar({ tipo: 'SOLICITACAO_CRIADA', origem: solicitacao.agenteSolicitante.id, destino: solicitacao.agenteResponsavel.id, referenciaTipo: 'solicitacao', referenciaId: id, mensagem: `Nova solicitação de ${solicitacao.agenteSolicitante.id} para ${solicitacao.agenteResponsavel.id}: ${solicitacao.titulo}` });
    }
    console.log('[SolicitacaoService.criar] SUCESSO - id=' + id);
    return { sucesso: true, dados: solicitacao };
  }

  async atualizar(id: string, dados: Partial<SolicitacaoAlteracao>): Promise<ResultadoOperacao<SolicitacaoAlteracao>> {
    console.log('[SolicitacaoService.atualizar] id=' + id);

    const existente = this.obter(id);
    if (!existente.sucesso || !existente.dados) {
      return { sucesso: false, erro: existente.erro, codigoErro: existente.codigoErro };
    }

    const hoje = new Date().toISOString();
    const atualizada: SolicitacaoAlteracao = { ...existente.dados, ...dados, datas: { ...existente.dados.datas, atualizadaEm: hoje } };

    const validation = this.validator.validar('solicitacao-alteracao', atualizada);
    if (!validation.valido) {
      return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    if (dados.status && dados.status !== existente.dados.status) {
      if (!validarTransicao(TRANSICOES_ESTADO_SOLICITACAO, existente.dados.status, dados.status)) {
        return { sucesso: false, erro: `Transição inválida: ${existente.dados.status} → ${dados.status}`, codigoErro: 'INVALID_TRANSITION' };
      }
    }

    const fileResult = this.fs.escreverJson(this.getSolicitacaoPath(id), atualizada, { backup: true });
    if (!fileResult.sucesso) {
      return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };
    }

    const registryResult = this.carregarRegistry();
    if (registryResult.sucesso && registryResult.dados) {
      registryResult.dados.solicitacoes = registryResult.dados.solicitacoes.map((s) =>
        s.id === id ? atualizada : s
      );
      this.salvarRegistry(registryResult.dados);
    }
    this.registrarHistorico(id, 'SOLICITACAO_ALTERADA');

    this.auditoria.registrar(
      'SOLICITACAO_ALTERADA',
      `Solicitação '${id}' atualizada. Status: ${atualizada.status}`,
      { solicitacaoId: id }
    );
    console.log('[SolicitacaoService.atualizar] SUCESSO');
    return { sucesso: true, dados: atualizada };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    console.log('[SolicitacaoService.excluir] id=' + id);

    const existente = this.obter(id);
    if (!existente.sucesso || !existente.dados) {
      return { sucesso: false, erro: existente.erro, codigoErro: existente.codigoErro };
    }

    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    }
    registryResult.dados.solicitacoes = registryResult.dados.solicitacoes.filter((s) => s.id !== id);
    this.salvarRegistry(registryResult.dados);
    this.fs.excluir(this.getSolicitacaoPath(id), { backup: true });
    this.registrarHistorico(id, 'SOLICITACAO_EXCLUIDA');

    this.auditoria.registrar('SOLICITACAO_EXCLUIDA', `Solicitação '${id}' excluída.`, { solicitacaoId: id });
    console.log('[SolicitacaoService.excluir] SUCESSO');
    return { sucesso: true, dados: true };
  }

  async aprovar(id: string, agenteId: string, observacao?: string): Promise<ResultadoOperacao<SolicitacaoAlteracao>> {
    const result = await this.atualizar(id, {
      status: 'APROVADA',
      aprovacao: { status: 'APROVADA', agenteId, data: new Date().toISOString(), observacao: observacao || null }
    });
    if (result.sucesso) {
      this.registrarHistorico(id, 'SOLICITACAO_APROVADA', agenteId, observacao || null);
      this.auditoria.registrar('SOLICITACAO_APROVADA', `Solicitação '${id}' aprovada por '${agenteId}'.`, { solicitacaoId: id, agenteAprovador: agenteId });
    }
    return result;
  }

  async rejeitar(id: string, agenteId: string, motivo: string): Promise<ResultadoOperacao<SolicitacaoAlteracao>> {
    const result = await this.atualizar(id, {
      status: 'REJEITADA',
      aprovacao: { status: 'REJEITADA', agenteId, data: new Date().toISOString(), observacao: motivo }
    });
    if (result.sucesso) {
      this.registrarHistorico(id, 'SOLICITACAO_REJEITADA', agenteId, motivo);
      this.auditoria.registrar('SOLICITACAO_REJEITADA', `Solicitação '${id}' rejeitada por '${agenteId}'.`, { solicitacaoId: id, agenteRejeitor: agenteId });
    }
    return result;
  }

  listarHistorico(id: string): ResultadoOperacao<EventoHistoricoSolicitacao[]> {
    const result = this.fs.lerJson<HistoricoSolicitacoes>(this.getHistoricoPath());
    if (!result.sucesso || !result.dados) {
      return { sucesso: true, dados: [] };
    }
    const eventos = result.dados.eventos.filter((e) => e.solicitacaoId === id);
    console.log('[SolicitacaoService.listarHistorico] eventos para ' + id + ':', eventos.length);
    return { sucesso: true, dados: eventos };
  }
}
