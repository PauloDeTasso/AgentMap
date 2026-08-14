import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Responsabilidade, ResponsabilidadesRegistry, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';

export class ResponsabilidadeService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.win32.join('.ia', 'responsabilidades', 'responsabilidades.json');
  }
  private getResponsabilidadePath(id: string): string {
    return path.win32.join('.ia', 'responsabilidades', `${id}.json`);
  }
  private gerarId(): string {
    return this.idGenerator.gerarId('RESP', this.getRegistryPath(), 'responsabilidades');
  }
  private carregarRegistry(): ResultadoOperacao<ResponsabilidadesRegistry> {
    const result = this.fs.lerJson<ResponsabilidadesRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) return { sucesso: true, dados: { responsabilidades: [] } };
    return result;
  }
  private salvarRegistry(registry: ResponsabilidadesRegistry): void {
    this.fs.escreverJson(this.getRegistryPath(), registry);
  }

  listar(): ResultadoOperacao<Responsabilidade[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    return { sucesso: true, dados: result.dados.responsabilidades };
  }

  listarPorAgente(agenteId: string): ResultadoOperacao<Responsabilidade[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    const filtered = result.dados.responsabilidades.filter((r) => r.agenteId === agenteId);
    return { sucesso: true, dados: filtered };
  }

  listarPorAlvo(alvoId: string): ResultadoOperacao<Responsabilidade[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    const filtered = result.dados.responsabilidades.filter((r) => r.alvoId === alvoId);
    return { sucesso: true, dados: filtered };
  }

  obter(id: string): ResultadoOperacao<Responsabilidade> {
    const result = this.fs.lerJson<Responsabilidade>(this.getResponsabilidadePath(id));
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: 'Responsabilidade não encontrada', codigoErro: 'NOT_FOUND' };
    return { sucesso: true, dados: result.dados };
  }

  async criar(dados: Partial<Responsabilidade>): Promise<ResultadoOperacao<Responsabilidade>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };

    const id = dados.id || this.gerarId();
    if (registryResult.dados.responsabilidades.find((r) => r.id === id)) return { sucesso: false, erro: `ID '${id}' já existe`, codigoErro: 'DUPLICATE_ID' };

    const hoje = new Date().toISOString();
    const responsabilidade: Responsabilidade = {
      id,
      agenteId: dados.agenteId || '',
      alvoId: dados.alvoId || '',
      alvoTipo: dados.alvoTipo || '',
      nivel: dados.nivel || 'RESPONSAVEL',
      datas: { criadaEm: hoje, atualizadaEm: hoje }
    };

    const validation = this.validator.validar('responsabilidade', responsabilidade);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    const fileResult = this.fs.escreverJson(this.getResponsabilidadePath(id), responsabilidade, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    registryResult.dados.responsabilidades.push(responsabilidade);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('RESPONSABILIDADE_REGISTRADA', `Responsabilidade '${id}': '${responsabilidade.agenteId}' → '${responsabilidade.alvoId}'.`, { responsabilidadeId: id, agenteId: responsabilidade.agenteId });
    return { sucesso: true, dados: responsabilidade };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    registryResult.dados.responsabilidades = registryResult.dados.responsabilidades.filter((r) => r.id !== id);
    this.salvarRegistry(registryResult.dados);
    this.fs.excluir(this.getResponsabilidadePath(id), { backup: true });
    return { sucesso: true, dados: true };
  }
}

