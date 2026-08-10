import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { CriterioAceitacao, CriteriosRegistry, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';

export class CriterioService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.win32.join('.ia', 'criterios', 'criterios.json');
  }

  private getCriterioPath(id: string): string {
    return path.win32.join('.ia', 'criterios', `${id}.json`);
  }

  private carregarRegistry(): ResultadoOperacao<CriteriosRegistry> {
    const result = this.fs.lerJson<CriteriosRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) {
      return { sucesso: true, dados: { criterios: [] } };
    }
    return result;
  }

  private salvarRegistry(registry: CriteriosRegistry): void {
    this.fs.escreverJson(this.getRegistryPath(), registry);
  }

  listar(): ResultadoOperacao<CriterioAceitacao[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    return { sucesso: true, dados: result.dados.criterios };
  }

  listarPorTarefa(tarefaId: string): ResultadoOperacao<CriterioAceitacao[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    const filtered = result.dados.criterios.filter((c) => c.tarefaId === tarefaId);
    return { sucesso: true, dados: filtered };
  }

  obter(id: string): ResultadoOperacao<CriterioAceitacao> {
    const result = this.fs.lerJson<CriterioAceitacao>(this.getCriterioPath(id));
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: 'Critério não encontrado', codigoErro: 'NOT_FOUND' };
    }
    return { sucesso: true, dados: result.dados };
  }

  async criar(dados: Partial<CriterioAceitacao>): Promise<ResultadoOperacao<CriterioAceitacao>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };
    }

    const exists = registryResult.dados.criterios.find((c) => c.id === dados.id);
    if (exists) {
      return { sucesso: false, erro: `ID '${dados.id}' já existe`, codigoErro: 'DUPLICATE_ID' };
    }

    const criterio: CriterioAceitacao = {
      id: dados.id || this.idGenerator.gerarId('ACE', this.getRegistryPath(), 'criterios'),
      tarefaId: dados.tarefaId || '',
      descricao: dados.descricao || '',
      tipo: dados.tipo || 'FUNCIONAL',
      obrigatorio: dados.obrigatorio ?? true,
      estado: dados.estado || 'PENDENTE',
      dados: dados.dados || null
    };

    const validation = this.validator.validar('criterio-aceitacao', criterio);
    if (!validation.valido) {
      return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    const fileResult = this.fs.escreverJson(this.getCriterioPath(criterio.id), criterio, { backup: true });
    if (!fileResult.sucesso) {
      return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };
    }

    registryResult.dados.criterios.push(criterio);
    this.salvarRegistry(registryResult.dados);

    this.auditoria.registrar('REGRAS_RESPEITADAS', `Critério '${criterio.id}' criado para tarefa '${criterio.tarefaId}'.`, { criterioId: criterio.id, tarefaId: criterio.tarefaId });
    return { sucesso: true, dados: criterio };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    }
    registryResult.dados.criterios = registryResult.dados.criterios.filter((c) => c.id !== id);
    this.salvarRegistry(registryResult.dados);
    this.fs.excluir(this.getCriterioPath(id), { backup: true });
    return { sucesso: true, dados: true };
  }
}
