import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Aprendizado, AprendizadosRegistry, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';

export class AprendizadoService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.join('.ia', 'aprendizados', 'aprendizados.json');
  }
  private getAprendizadoPath(id: string): string {
    return path.join('.ia', 'aprendizados', `${id}.json`);
  }
  private gerarId(): string {
    return this.idGenerator.gerarId('APR', this.getRegistryPath(), 'aprendizados');
  }
  private carregarRegistry(): ResultadoOperacao<AprendizadosRegistry> {
    const result = this.fs.lerJson<AprendizadosRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) return { sucesso: true, dados: { aprendizados: [] } };
    return result;
  }
  private salvarRegistry(registry: AprendizadosRegistry): void {
    this.fs.escreverJson(this.getRegistryPath(), registry);
  }

  listar(): ResultadoOperacao<Aprendizado[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    return { sucesso: true, dados: result.dados.aprendizados };
  }

  obter(id: string): ResultadoOperacao<Aprendizado> {
    const result = this.fs.lerJson<Aprendizado>(this.getAprendizadoPath(id));
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: 'Aprendizado não encontrado', codigoErro: 'NOT_FOUND' };
    return { sucesso: true, dados: result.dados };
  }

  async criar(dados: Partial<Aprendizado>): Promise<ResultadoOperacao<Aprendizado>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };

    const id = dados.id || this.gerarId();
    if (registryResult.dados.aprendizados.find((a) => a.id === id)) return { sucesso: false, erro: `ID '${id}' já existe`, codigoErro: 'DUPLICATE_ID' };

    const hoje = new Date().toISOString();
    const aprendizado: Aprendizado = {
      id,
      titulo: dados.titulo || '',
      descricao: dados.descricao || '',
      categoria: dados.categoria || '',
      tarefaId: dados.tarefaId || null,
      agenteId: dados.agenteId || null,
      origem: dados.origem || null,
      dados: dados.dados || null,
      utilidade: dados.utilidade || 'MEDIA',
      estado: dados.estado || 'ATIVO',
      datas: { criadaEm: hoje, atualizadaEm: hoje, promovidaEm: null }
    };

    const validation = this.validator.validar('aprendizado', aprendizado);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    const fileResult = this.fs.escreverJson(this.getAprendizadoPath(id), aprendizado, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    registryResult.dados.aprendizados.push(aprendizado);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('APRENDIZADO_REGISTRADO', `Aprendizado '${id}' registrado.`, { aprendizadoId: id, categoria: aprendizado.categoria });
    return { sucesso: true, dados: aprendizado };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    registryResult.dados.aprendizados = registryResult.dados.aprendizados.filter((a) => a.id !== id);
    this.salvarRegistry(registryResult.dados);
    this.fs.excluir(this.getAprendizadoPath(id), { backup: true });
    return { sucesso: true, dados: true };
  }

  async atualizar(id: string, dados: Partial<Aprendizado>): Promise<ResultadoOperacao<Aprendizado>> {
    const result = this.obter(id);
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    const atual: Aprendizado = result.dados;
    const { id: _id, ...resto } = dados as Partial<Aprendizado> & { id?: string };
    const atualizado: Aprendizado = {
      ...atual,
      ...resto,
      id: atual.id,
      datas: { ...atual.datas, atualizadaEm: new Date().toISOString() }
    };

    const validation = this.validator.validar('aprendizado', atualizado);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    const fileResult = this.fs.escreverJson(this.getAprendizadoPath(id), atualizado, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    const registryResult = this.carregarRegistry();
    if (registryResult.sucesso && registryResult.dados) {
      const idx = registryResult.dados.aprendizados.findIndex((a) => a.id === id);
      if (idx >= 0) {
        registryResult.dados.aprendizados[idx] = atualizado;
        this.salvarRegistry(registryResult.dados);
      }
    }

    this.auditoria.registrar('APRENDIZADO_ATUALIZADO', `Aprendizado '${id}' atualizado.`, { aprendizadoId: id });
    return { sucesso: true, dados: atualizado };
  }

  async excluirTodos(): Promise<ResultadoOperacao<number>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    const aprendizados = registryResult.dados.aprendizados;
    let removidos = 0;
    for (const a of aprendizados) {
      this.fs.excluir(this.getAprendizadoPath(a.id), { backup: true });
      removidos++;
    }
    this.salvarRegistry({ aprendizados: [] });
    this.auditoria.registrar('APRENDIZADOS_EXCLUIDOS', `Todos os aprendizados (${removidos}) foram removidos.`, { removidos });
    return { sucesso: true, dados: removidos };
  }
}

