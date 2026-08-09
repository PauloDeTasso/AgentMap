import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Conflito, ConflitosRegistry, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';
import { TRANSICOES_ESTADO_CONFLITO, validarTransicao } from '../tipos';
import { EventoService } from './EventoService';

export class ConflitoService {
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
    return path.win32.join('.ia', 'conflitos', 'conflitos.json');
  }
  private getConflitoPath(id: string): string {
    return path.win32.join('.ia', 'conflitos', `${id}.json`);
  }
  private gerarId(): string {
    return this.idGenerator.gerarId('CON', this.getRegistryPath(), 'conflitos');
  }
  private carregarRegistry(): ResultadoOperacao<ConflitosRegistry> {
    const result = this.fs.lerJson<ConflitosRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) return { sucesso: true, dados: { conflitos: [] } };
    return result;
  }
  private salvarRegistry(registry: ConflitosRegistry): void {
    this.fs.escreverJson(this.getRegistryPath(), registry);
  }

  listar(): ResultadoOperacao<Conflito[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    return { sucesso: true, dados: result.dados.conflitos };
  }

  obter(id: string): ResultadoOperacao<Conflito> {
    const result = this.fs.lerJson<Conflito>(this.getConflitoPath(id));
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: 'Conflito não encontrado', codigoErro: 'NOT_FOUND' };
    return { sucesso: true, dados: result.dados };
  }

  async criar(dados: Partial<Conflito>): Promise<ResultadoOperacao<Conflito>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };

    const id = dados.id || this.gerarId();
    if (registryResult.dados.conflitos.find((c) => c.id === id)) return { sucesso: false, erro: `ID '${id}' já existe`, codigoErro: 'DUPLICATE_ID' };

    const hoje = new Date().toISOString();
    const conflito: Conflito = {
      id,
      titulo: dados.titulo || '',
      descricao: dados.descricao || '',
      tipo: dados.tipo || 'RECURSO_DUPLICADO',
      severidade: dados.severidade || 'MEDIA',
      tarefaId: dados.tarefaId || null,
      agenteId: dados.agenteId || null,
      referencias: dados.referencias || [],
      origem: dados.origem || null,
      resolucao: dados.resolucao || null,
      estado: dados.estado || 'ABERTO',
      datas: { criadaEm: hoje, atualizadaEm: hoje, resolvidaEm: null }
    };

    const validation = this.validator.validar('conflito', conflito);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    const fileResult = this.fs.escreverJson(this.getConflitoPath(id), conflito, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    registryResult.dados.conflitos.push(conflito);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('CONFLITO_CRIADO', `Conflito '${id}' registrado.`, { conflitoId: id, tipo: conflito.tipo });
    return { sucesso: true, dados: conflito };
  }

  async resolver(id: string, resolucao: string): Promise<ResultadoOperacao<Conflito>> {
    const result = await this.atualizar(id, { estado: 'RESOLVIDO', resolucao });
    if (result.sucesso) this.auditoria.registrar('CONFLITO_RESOLVIDO', `Conflito '${id}' resolvido.`, { conflitoId: id });
    return result;
  }

  async atualizar(id: string, dados: Partial<Conflito>): Promise<ResultadoOperacao<Conflito>> {
    const existente = this.obter(id);
    if (!existente.sucesso || !existente.dados) return { sucesso: false, erro: existente.erro, codigoErro: existente.codigoErro };

    const hoje = new Date().toISOString();
    const atualizado: Conflito = { ...existente.dados, ...dados, datas: { ...existente.dados.datas, atualizadaEm: hoje } };

    const validation = this.validator.validar('conflito', atualizado);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    if (dados.estado && dados.estado !== existente.dados.estado) {
      if (!validarTransicao(TRANSICOES_ESTADO_CONFLITO, existente.dados.estado, dados.estado)) {
        return { sucesso: false, erro: `Transição inválida: ${existente.dados.estado} → ${dados.estado}`, codigoErro: 'INVALID_TRANSITION' };
      }
    }

    const fileResult = this.fs.escreverJson(this.getConflitoPath(id), atualizado, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    const registryResult = this.carregarRegistry();
    if (registryResult.sucesso && registryResult.dados) {
      registryResult.dados.conflitos = registryResult.dados.conflitos.map((c) => (c.id === id ? atualizado : c));
      this.salvarRegistry(registryResult.dados);
    }
    return { sucesso: true, dados: atualizado };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    registryResult.dados.conflitos = registryResult.dados.conflitos.filter((c) => c.id !== id);
    this.salvarRegistry(registryResult.dados);
    this.fs.excluir(this.getConflitoPath(id), { backup: true });
    return { sucesso: true, dados: true };
  }
}

