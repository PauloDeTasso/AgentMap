import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Checkpoint, CheckpointsRegistry, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';

export class CheckpointService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.win32.join('.ia', 'checkpoints', 'checkpoints.json');
  }
  private getCheckpointPath(id: string): string {
    return path.win32.join('.ia', 'checkpoints', `${id}.json`);
  }
  private gerarId(): string {
    return this.idGenerator.gerarId('CHK', this.getRegistryPath(), 'checkpoints');
  }
  private carregarRegistry(): ResultadoOperacao<CheckpointsRegistry> {
    const result = this.fs.lerJson<CheckpointsRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) return { sucesso: true, dados: { checkpoints: [] } };
    return result;
  }
  private salvarRegistry(registry: CheckpointsRegistry): void {
    this.fs.escreverJson(this.getRegistryPath(), registry);
  }

  listar(): ResultadoOperacao<Checkpoint[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    return { sucesso: true, dados: result.dados.checkpoints };
  }

  listarPorTarefa(tarefaId: string): ResultadoOperacao<Checkpoint[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    const filtered = result.dados.checkpoints.filter((c) => c.tarefaId === tarefaId);
    return { sucesso: true, dados: filtered };
  }

  obter(id: string): ResultadoOperacao<Checkpoint> {
    const result = this.fs.lerJson<Checkpoint>(this.getCheckpointPath(id));
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: 'Checkpoint não encontrado', codigoErro: 'NOT_FOUND' };
    return { sucesso: true, dados: result.dados };
  }

  async criar(dados: Partial<Checkpoint>): Promise<ResultadoOperacao<Checkpoint>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };

    const id = dados.id || this.gerarId();
    if (registryResult.dados.checkpoints.find((c) => c.id === id)) return { sucesso: false, erro: `ID '${id}' já existe`, codigoErro: 'DUPLICATE_ID' };

    const hoje = new Date().toISOString();
    const checkpoint: Checkpoint = {
      id,
      tarefaId: dados.tarefaId || '',
      agenteId: dados.agenteId || '',
      tipo: dados.tipo || 'INTERMEDIARIO',
      titulo: dados.titulo || '',
      descricao: dados.descricao || '',
      artefatos: dados.artefatos || [],
      alteracoes: dados.alteracoes || [],
      riscos: dados.riscos || [],
      pendencias: dados.pendencias || [],
      observacoes: dados.observacoes || null,
      dados: dados.dados || null,
      datas: { criadaEm: hoje, atualizadaEm: hoje }
    };

    const validation = this.validator.validar('checkpoint', checkpoint);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    const fileResult = this.fs.escreverJson(this.getCheckpointPath(id), checkpoint, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    registryResult.dados.checkpoints.push(checkpoint);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('CHECKPOINT_CRIADO', `Checkpoint '${id}' para tarefa '${checkpoint.tarefaId}'.`, { checkpointId: id, tarefaId: checkpoint.tarefaId });
    return { sucesso: true, dados: checkpoint };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    registryResult.dados.checkpoints = registryResult.dados.checkpoints.filter((c) => c.id !== id);
    this.salvarRegistry(registryResult.dados);
    this.fs.excluir(this.getCheckpointPath(id), { backup: true });
    return { sucesso: true, dados: true };
  }
}

