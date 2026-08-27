import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Dependencia, DependenciasRegistry, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';

export class DependenciaService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.join('.ia', 'dependencias', 'dependencias.json');
  }
  private getDependenciaPath(id: string): string {
    return path.join('.ia', 'dependencias', `${id}.json`);
  }
  private gerarId(): string {
    return this.idGenerator.gerarId('DEP', this.getRegistryPath(), 'dependencias');
  }
  private carregarRegistry(): ResultadoOperacao<DependenciasRegistry> {
    const result = this.fs.lerJson<DependenciasRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) {
      return { sucesso: true, dados: { dependencias: [] } };
    }
    return result;
  }
  private salvarRegistry(registry: DependenciasRegistry): void {
    const result = this.fs.escreverJson(this.getRegistryPath(), registry);
    if (!result.sucesso) {
      throw new Error(result.erro || 'Erro ao salvar registro');
    }
  }

  listar(): ResultadoOperacao<Dependencia[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    return { sucesso: true, dados: result.dados.dependencias };
  }

  listarPorFonte(fonteId: string): ResultadoOperacao<Dependencia[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    const filtered = result.dados.dependencias.filter((d) => d.fonteId === fonteId);
    return { sucesso: true, dados: filtered };
  }

  listarPorDestino(destinoId: string): ResultadoOperacao<Dependencia[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    const filtered = result.dados.dependencias.filter((d) => d.destinoId === destinoId);
    return { sucesso: true, dados: filtered };
  }

  obter(id: string): ResultadoOperacao<Dependencia> {
    const result = this.fs.lerJson<Dependencia>(this.getDependenciaPath(id));
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: 'Dependência não encontrada', codigoErro: 'NOT_FOUND' };
    return { sucesso: true, dados: result.dados };
  }

  async criar(dados: Partial<Dependencia>): Promise<ResultadoOperacao<Dependencia>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };

    const id = dados.id || this.gerarId();
    if (registryResult.dados.dependencias.find((d) => d.id === id)) return { sucesso: false, erro: `ID '${id}' já existe`, codigoErro: 'DUPLICATE_ID' };

    if (dados.fonteId === dados.destinoId) {
      return { sucesso: false, erro: 'Fonte e destino não podem ser iguais', codigoErro: 'SELF_REFERENCE' };
    }

    const hoje = new Date().toISOString();
    const dependencia: Dependencia = {
      id,
      fonteId: dados.fonteId || '',
      fonteTipo: dados.fonteTipo || '',
      destinoId: dados.destinoId || '',
      destinoTipo: dados.destinoTipo || '',
      tipo: dados.tipo || 'FIM_INICIO',
      estado: 'ATIVA',
      datas: { criadaEm: hoje, atualizadaEm: hoje }
    };

    const validation = this.validator.validar('dependencia', dependencia);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    if (await this.verificarCircular(dependencia)) {
      dependencia.estado = 'CIRCULAR';
    }

    const fileResult = this.fs.escreverJson(this.getDependenciaPath(id), dependencia, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    registryResult.dados.dependencias.push(dependencia);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('DEPENDENCIA_CRIADA', `Dependência '${id}': '${dependencia.fonteId}' → '${dependencia.destinoId}'.`, { dependenciaId: id, fonteId: dependencia.fonteId, destinoId: dependencia.destinoId });
    return { sucesso: true, dados: dependencia };
  }

  private async verificarCircular(dep: Dependencia): Promise<boolean> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return false;
    const deps = registryResult.dados.dependencias;
    const visited = new Set<string>();
    const stack: string[] = [dep.destinoId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === dep.fonteId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      const next = deps.filter((d) => d.fonteId === current).map((d) => d.destinoId);
      stack.push(...next);
    }
    return false;
  }

  private inconsistencias: string[] = [];

  async atualizar(id: string, dados: Partial<Dependencia>): Promise<ResultadoOperacao<Dependencia>> {
    const existente = this.obter(id);
    if (!existente.sucesso || !existente.dados) return { sucesso: false, erro: existente.erro, codigoErro: existente.codigoErro };
    const hoje = new Date().toISOString();
    const atualizado: Dependencia = { ...existente.dados, ...dados, datas: { ...existente.dados.datas, atualizadaEm: hoje } };

    const fileResult = this.fs.escreverJson(this.getDependenciaPath(id), atualizado, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    const registryResult = this.carregarRegistry();
    if (registryResult.sucesso && registryResult.dados) {
      registryResult.dados.dependencias = registryResult.dados.dependencias.map((d) => (d.id === id ? atualizado : d));
      this.salvarRegistry(registryResult.dados);
    }
    return { sucesso: true, dados: atualizado };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    registryResult.dados.dependencias = registryResult.dados.dependencias.filter((d) => d.id !== id);
    this.salvarRegistry(registryResult.dados);
    this.fs.excluir(this.getDependenciaPath(id), { backup: true });
    return { sucesso: true, dados: true };
  }

  async excluirTodos(): Promise<ResultadoOperacao<number>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    const dependencias = registryResult.dados.dependencias;
    let removidos = 0;
    for (const d of dependencias) {
      this.fs.excluir(this.getDependenciaPath(d.id), { backup: true });
      removidos++;
    }
    this.salvarRegistry({ dependencias: [] });
    this.auditoria.registrar('DEPENDENCIAS_EXCLUIDAS', `Todas as dependências (${removidos}) foram removidas.`, { removidos });
    return { sucesso: true, dados: removidos };
  }
}

