import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Pendencia, PendenciasRegistry, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';

export class PendenciaService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.win32.join('.ia', 'pendencias', 'pendencias.json');
  }
  private getPendenciaPath(id: string): string {
    return path.win32.join('.ia', 'pendencias', `${id}.json`);
  }
  private gerarId(): string {
    return this.idGenerator.gerarId('PEN', this.getRegistryPath(), 'pendencias');
  }
  private carregarRegistry(): ResultadoOperacao<PendenciasRegistry> {
    const result = this.fs.lerJson<PendenciasRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro || 'Erro ao carregar registro', codigoErro: result.codigoErro || 'REGISTRY_ERROR' };
    }
    return result;
  }
  private salvarRegistry(registry: PendenciasRegistry): void {
    const result = this.fs.escreverJson(this.getRegistryPath(), registry);
    if (!result.sucesso) {
      throw new Error(result.erro || 'Erro ao salvar registro');
    }
  }

  listar(): ResultadoOperacao<Pendencia[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    return { sucesso: true, dados: result.dados.pendencias };
  }

  obter(id: string): ResultadoOperacao<Pendencia> {
    const result = this.fs.lerJson<Pendencia>(this.getPendenciaPath(id));
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: 'Pendência não encontrada', codigoErro: 'NOT_FOUND' };
    return { sucesso: true, dados: result.dados };
  }

  async criar(dados: Partial<Pendencia>): Promise<ResultadoOperacao<Pendencia>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };
    }

    const id = dados.id || this.gerarId();
    if (registryResult.dados.pendencias.find((p) => p.id === id)) {
      return { sucesso: false, erro: `ID '${id}' já existe`, codigoErro: 'DUPLICATE_ID' };
    }

    const hoje = new Date().toISOString();
    const pendencia: Pendencia = {
      id,
      titulo: dados.titulo || '',
      descricao: dados.descricao || '',
      tarefaId: dados.tarefaId || null,
      agenteId: dados.agenteId || null,
      tipo: dados.tipo || 'IMPLEMENTACAO',
      prioridade: dados.prioridade || 'MEDIA',
      estado: dados.estado || 'PENDENTE',
      origem: dados.origem || 'MANUAL',
      referenciaId: dados.referenciaId || null,
      resolucao: dados.resolucao || null,
      datas: { criadaEm: hoje, atualizadaEm: hoje, resolvidaEm: null }
    };

    const validation = this.validator.validar('pendencia', pendencia);
    if (!validation.valido) {
      return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    const fileResult = this.fs.escreverJson(this.getPendenciaPath(id), pendencia, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    registryResult.dados.pendencias.push(pendencia);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('PENDENCIA_CRIADA', `Pendência '${id}' criada.`, { pendenciaId: id, tarefaId: pendencia.tarefaId });
    return { sucesso: true, dados: pendencia };
  }

  async resolver(id: string, resolucao: string): Promise<ResultadoOperacao<Pendencia>> {
    const result = await this.atualizar(id, { estado: 'RESOLVIDO', resolucao });
    if (result.sucesso) this.auditoria.registrar('PENDENCIA_RESOLVIDA', `Pendência '${id}' resolvida.`, { pendenciaId: id });
    return result;
  }

  async atualizar(id: string, dados: Partial<Pendencia>): Promise<ResultadoOperacao<Pendencia>> {
    const existente = this.obter(id);
    if (!existente.sucesso || !existente.dados) return { sucesso: false, erro: existente.erro, codigoErro: existente.codigoErro };

    const hoje = new Date().toISOString();
    const atualizado: Pendencia = { ...existente.dados, ...dados, datas: { ...existente.dados.datas, atualizadaEm: hoje } };

    const validation = this.validator.validar('pendencia', atualizado);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    const fileResult = this.fs.escreverJson(this.getPendenciaPath(id), atualizado, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    const registryResult = this.carregarRegistry();
    if (registryResult.sucesso && registryResult.dados) {
      registryResult.dados.pendencias = registryResult.dados.pendencias.map((p) => (p.id === id ? atualizado : p));
      this.salvarRegistry(registryResult.dados);
    }
    return { sucesso: true, dados: atualizado };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    registryResult.dados.pendencias = registryResult.dados.pendencias.filter((p) => p.id !== id);
    this.salvarRegistry(registryResult.dados);
    this.fs.excluir(this.getPendenciaPath(id), { backup: true });
    return { sucesso: true, dados: true };
  }
}

