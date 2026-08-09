import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Bloqueio, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';
import { TRANSICOES_ESTADO_BLOQUEIO, validarTransicao } from '../tipos';
import { EventoService } from './EventoService';
import { bloqueiosUri } from '../mcp-server/resources/uri-factory';
import { EventBus } from '../mcp-server/events/event-bus';

export class BloqueioService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator,
    private eventoService?: EventoService,
    private eventBus?: EventBus
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.win32.join('.ia', 'estado', 'bloqueios.json');
  }
  private carregarRegistry(): ResultadoOperacao<{ bloqueios: Bloqueio[] }> {
    const result = this.fs.lerJson<{ bloqueios: Bloqueio[] }>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) return { sucesso: true, dados: { bloqueios: [] } };
    return result;
  }
  private salvarRegistry(registry: { bloqueios: Bloqueio[] }): void {
    this.fs.escreverJson(this.getRegistryPath(), registry);
  }

  listar(): ResultadoOperacao<Bloqueio[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    return { sucesso: true, dados: result.dados.bloqueios };
  }

  obter(id: string): ResultadoOperacao<Bloqueio> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: 'Bloqueio não encontrado', codigoErro: 'NOT_FOUND' };
    const bloqueio = result.dados.bloqueios.find((b) => b.id === id);
    if (!bloqueio) return { sucesso: false, erro: 'Bloqueio não encontrado', codigoErro: 'NOT_FOUND' };
    return { sucesso: true, dados: bloqueio };
  }

  async criar(dados: Partial<Bloqueio>, projetoId?: string): Promise<ResultadoOperacao<Bloqueio>> {
    if (!dados.tarefaId) {
      return { sucesso: false, erro: 'tarefaId é obrigatório', codigoErro: 'VALIDATION_ERROR' };
    }
    if (!dados.tipo) {
      return { sucesso: false, erro: 'tipo é obrigatório', codigoErro: 'VALIDATION_ERROR' };
    }
    if (!dados.gravidade) {
      return { sucesso: false, erro: 'gravidade é obrigatória', codigoErro: 'VALIDATION_ERROR' };
    }
    if (!dados.descricao) {
      return { sucesso: false, erro: 'descricao é obrigatória', codigoErro: 'VALIDATION_ERROR' };
    }
    if (!dados.origem) {
      return { sucesso: false, erro: 'origem é obrigatória', codigoErro: 'VALIDATION_ERROR' };
    }
    if (!dados.responsavelResolucao) {
      return { sucesso: false, erro: 'responsavelResolucao é obrigatório', codigoErro: 'VALIDATION_ERROR' };
    }

    const bloqueio: Bloqueio = {
      id: dados.id || this.idGenerator.gerarId('BLOQ', this.getRegistryPath(), 'bloqueios'),
      tarefaId: dados.tarefaId,
      tipo: dados.tipo,
      gravidade: dados.gravidade,
      descricao: dados.descricao,
      origem: dados.origem,
      responsavelResolucao: dados.responsavelResolucao,
      estado: dados.estado || 'ATIVO',
      criadoEm: dados.criadoEm || new Date().toISOString(),
      resolvidoEm: dados.resolvidoEm || null
    };

    const validation = this.validator.validar('bloqueio', bloqueio);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };

    if (registryResult.dados.bloqueios.find((b) => b.id === bloqueio.id)) return { sucesso: false, erro: `ID '${bloqueio.id}' já existe`, codigoErro: 'DUPLICATE_ID' };
    registryResult.dados.bloqueios.push(bloqueio);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('BLOQUEIO_CRIADO', `Bloqueio '${bloqueio.id}' para tarefa '${bloqueio.tarefaId}'.`, { bloqueioId: bloqueio.id, tarefaId: bloqueio.tarefaId });
    if (this.eventBus && projetoId) {
      this.eventBus.publish({ uri: bloqueiosUri(projetoId), timestamp: Date.now(), reason: 'bloqueio_criado' });
    }
    return { sucesso: true, dados: bloqueio };
  }

  async resolver(id: string, resolucao: string, projetoId?: string): Promise<ResultadoOperacao<Bloqueio>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    const idx = registryResult.dados.bloqueios.findIndex((b) => b.id === id);
    if (idx === -1) return { sucesso: false, erro: 'Bloqueio não encontrado', codigoErro: 'NOT_FOUND' };

    const bloqueio = registryResult.dados.bloqueios[idx];
    if (!validarTransicao(TRANSICOES_ESTADO_BLOQUEIO, bloqueio.estado as any, 'RESOLVIDO')) {
      return { sucesso: false, erro: `Transição inválida: ${bloqueio.estado} → RESOLVIDO`, codigoErro: 'INVALID_TRANSITION' };
    }

    registryResult.dados.bloqueios[idx].estado = 'RESOLVIDO';
    registryResult.dados.bloqueios[idx].resolvidoEm = new Date().toISOString();
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('BLOQUEIO_RESOLVIDO', `Bloqueio '${id}' resolvido. ${resolucao}`, { bloqueioId: id, resolucao });
    if (this.eventBus && projetoId) {
      this.eventBus.publish({ uri: bloqueiosUri(projetoId), timestamp: Date.now(), reason: 'bloqueio_resolvido' });
    }
    return { sucesso: true, dados: registryResult.dados.bloqueios[idx] };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    registryResult.dados.bloqueios = registryResult.dados.bloqueios.filter((b) => b.id !== id);
    this.salvarRegistry(registryResult.dados);
    return { sucesso: true, dados: true };
  }
}

