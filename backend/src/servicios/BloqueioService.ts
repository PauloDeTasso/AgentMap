import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Bloqueio, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';
import { TRANSICOES_ESTADO_BLOQUEIO, validarTransicao } from '../tipos';
import { EventoService } from './EventoService';

export class BloqueioService {
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

  async criar(dados: Partial<Bloqueio>): Promise<ResultadoOperacao<Bloqueio>> {
    const bloqueio: Bloqueio = { ...dados } as Bloqueio;

    if (!bloqueio.id) {
      bloqueio.id = this.idGenerator.gerarId('BLOQ', this.getRegistryPath(), 'bloqueios');
    }

    const validation = this.validator.validar('bloqueio', bloqueio);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };

    if (registryResult.dados.bloqueios.find((b) => b.id === bloqueio.id)) return { sucesso: false, erro: `ID '${bloqueio.id}' já existe`, codigoErro: 'DUPLICATE_ID' };
    registryResult.dados.bloqueios.push(bloqueio);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('BLOQUEIO_CRIADO', `Bloqueio '${bloqueio.id}' para tarefa '${bloqueio.tarefaId}'.`, { bloqueioId: bloqueio.id, tarefaId: bloqueio.tarefaId });
    return { sucesso: true, dados: bloqueio };
  }

  async resolver(id: string, resolucao: string): Promise<ResultadoOperacao<Bloqueio>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    const idx = registryResult.dados.bloqueios.findIndex((b) => b.id === id);
    if (idx === -1) return { sucesso: false, erro: 'Bloqueio não encontrado', codigoErro: 'NOT_FOUND' };

    const bloqueio = registryResult.dados.bloqueios[idx];
    if (!validarTransicao(TRANSICOES_ESTADO_BLOQUEIO, bloqueio.estado as any, 'RESOLVIDO')) {
      return { sucesso: false, erro: `Transição inválida: ${bloqueio.estado} → RESOLVIDO`, codigoErro: 'INVALID_TRANSITION' };
    }

    registryResult.dados.bloqueios[idx].estado = 'RESOLVIDO';
    registryResult.dados.bloqueios[idx].resolvidoEm = resolucao;
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('BLOQUEIO_RESOLVIDO', `Bloqueio '${id}' resolvido.`, { bloqueioId: id });
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
