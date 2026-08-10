import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Risco, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';
import { TRANSICOES_ESTADO_RISCO, validarTransicao } from '../tipos';

export class RiscoService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.win32.join('.ia', 'riscos', 'riscos.json');
  }
  private getRiscoPath(id: string): string {
    return path.win32.join('.ia', 'riscos', `${id}.json`);
  }
  private carregarRegistry(): ResultadoOperacao<{ riscos: Risco[] }> {
    const result = this.fs.lerJson<{ riscos: Risco[] }>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) return { sucesso: true, dados: { riscos: [] } };
    return result;
  }
  private salvarRegistry(registry: { riscos: Risco[] }): void {
    this.fs.escreverJson(this.getRegistryPath(), registry);
  }

  listar(): ResultadoOperacao<Risco[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    return { sucesso: true, dados: result.dados.riscos };
  }

  obter(id: string): ResultadoOperacao<Risco> {
    const result = this.fs.lerJson<Risco>(this.getRiscoPath(id));
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: 'Risco não encontrado', codigoErro: 'NOT_FOUND' };
    return { sucesso: true, dados: result.dados };
  }

  async criar(dados: Partial<Risco>): Promise<ResultadoOperacao<Risco>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };

    if (registryResult.dados.riscos.find((r) => r.id === dados.id)) return { sucesso: false, erro: `ID '${dados.id}' já existe`, codigoErro: 'DUPLICATE_ID' };

    const risco: Risco = { ...dados, id: dados.id || this.idGenerator.gerarId('RIS', this.getRegistryPath(), 'riscos') } as Risco;

    const validation = this.validator.validar('risco', risco);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    const fileResult = this.fs.escreverJson(this.getRiscoPath(risco.id), risco, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    registryResult.dados.riscos.push(risco);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('RISCO_CRIADO', `Risco '${risco.id}' criado.`, { riscoId: risco.id, gravidade: risco.gravidade });
    return { sucesso: true, dados: risco };
  }

  async atualizar(id: string, dados: Partial<Risco>): Promise<ResultadoOperacao<Risco>> {
    const existente = this.obter(id);
    if (!existente.sucesso || !existente.dados) return { sucesso: false, erro: existente.erro, codigoErro: existente.codigoErro };
    const validation = this.validator.validar('risco', { ...existente.dados, ...dados });
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    if (dados.estado && dados.estado !== existente.dados.estado) {
      if (!validarTransicao(TRANSICOES_ESTADO_RISCO, existente.dados.estado, dados.estado)) {
        return { sucesso: false, erro: `Transição inválida: ${existente.dados.estado} → ${dados.estado}`, codigoErro: 'INVALID_TRANSITION' };
      }
    }

    const atualizado: Risco = { ...existente.dados, ...dados };
    const fileResult = this.fs.escreverJson(this.getRiscoPath(id), atualizado, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    const registryResult = this.carregarRegistry();
    if (registryResult.sucesso && registryResult.dados) {
      registryResult.dados.riscos = registryResult.dados.riscos.map((r) => (r.id === id ? atualizado : r));
      this.salvarRegistry(registryResult.dados);
    }
    this.auditoria.registrar('RISCO_ATUALIZADO', `Risco '${id}' atualizado.`, { riscoId: id });
    return { sucesso: true, dados: atualizado };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    registryResult.dados.riscos = registryResult.dados.riscos.filter((r) => r.id !== id);
    this.salvarRegistry(registryResult.dados);
    this.fs.excluir(this.getRiscoPath(id), { backup: true });
    return { sucesso: true, dados: true };
  }
}
