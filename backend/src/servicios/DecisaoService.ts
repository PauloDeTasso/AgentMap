import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Decisao, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';

export class DecisaoService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.win32.join('.ia', 'decisoes', 'decisoes.json');
  }
  private getDecisaoPath(id: string): string {
    return path.win32.join('.ia', 'decisoes', `${id}.json`);
  }
  private carregarRegistry(): ResultadoOperacao<{ decisoes: Decisao[] }> {
    const result = this.fs.lerJson<{ decisoes: Decisao[] }>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) return { sucesso: true, dados: { decisoes: [] } };
    return result;
  }
  private salvarRegistry(registry: { decisoes: Decisao[] }): void {
    this.fs.escreverJson(this.getRegistryPath(), registry);
  }

  listar(): ResultadoOperacao<Decisao[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    return { sucesso: true, dados: result.dados.decisoes };
  }

  obter(id: string): ResultadoOperacao<Decisao> {
    const result = this.fs.lerJson<Decisao>(this.getDecisaoPath(id));
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: 'Decisão não encontrada', codigoErro: 'NOT_FOUND' };
    return { sucesso: true, dados: result.dados };
  }

  async criar(dados: Partial<Decisao>): Promise<ResultadoOperacao<Decisao>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };

    if (registryResult.dados.decisoes.find((d) => d.id === dados.id)) return { sucesso: false, erro: `ID '${dados.id}' já existe`, codigoErro: 'DUPLICATE_ID' };

    const decisao: Decisao = { ...dados, id: dados.id || this.idGenerator.gerarId('DEC', this.getRegistryPath(), 'decisoes') } as Decisao;

    const validation = this.validator.validar('decisao', decisao);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    const fileResult = this.fs.escreverJson(this.getDecisaoPath(decisao.id), decisao, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    registryResult.dados.decisoes.push(decisao);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('DECISAO_CRIADA', `Decisão '${decisao.id}' criada.`, { decisaoId: decisao.id });
    return { sucesso: true, dados: decisao };
  }

  async atualizar(id: string, dados: Partial<Decisao>): Promise<ResultadoOperacao<Decisao>> {
    const existente = this.obter(id);
    if (!existente.sucesso || !existente.dados) return { sucesso: false, erro: existente.erro, codigoErro: existente.codigoErro };
    const validation = this.validator.validar('decisao', { ...existente.dados, ...dados });
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    const atualizado: Decisao = { ...existente.dados, ...dados };
    const fileResult = this.fs.escreverJson(this.getDecisaoPath(id), atualizado, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    const registryResult = this.carregarRegistry();
    if (registryResult.sucesso && registryResult.dados) {
      registryResult.dados.decisoes = registryResult.dados.decisoes.map((d) => (d.id === id ? atualizado : d));
      this.salvarRegistry(registryResult.dados);
    }
    this.auditoria.registrar('DECISAO_ATUALIZADA', `Decisão '${id}' atualizada.`, { decisaoId: id });
    return { sucesso: true, dados: atualizado };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    registryResult.dados.decisoes = registryResult.dados.decisoes.filter((d) => d.id !== id);
    this.salvarRegistry(registryResult.dados);
    this.fs.excluir(this.getDecisaoPath(id), { backup: true });
    return { sucesso: true, dados: true };
  }
}
