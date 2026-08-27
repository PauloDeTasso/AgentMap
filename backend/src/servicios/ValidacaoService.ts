import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Validacao, ValidacoesRegistry, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';
import { TRANSICOES_ESTADO_VALIDACAO, validarTransicao } from '../tipos';

export class ValidacaoService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.join('.ia', 'validacoes', 'validacoes.json');
  }
  private getValidacaoPath(id: string): string {
    return path.join('.ia', 'validacoes', `${id}.json`);
  }
  private gerarId(): string {
    return this.idGenerator.gerarId('VAL', this.getRegistryPath(), 'validacoes');
  }
  private carregarRegistry(): ResultadoOperacao<ValidacoesRegistry> {
    const result = this.fs.lerJson<ValidacoesRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) return { sucesso: true, dados: { validacoes: [] } };
    return result;
  }
  private salvarRegistry(registry: ValidacoesRegistry): void {
    this.fs.escreverJson(this.getRegistryPath(), registry);
  }

  listar(): ResultadoOperacao<Validacao[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    return { sucesso: true, dados: result.dados.validacoes };
  }

  obter(id: string): ResultadoOperacao<Validacao> {
    const result = this.fs.lerJson<Validacao>(this.getValidacaoPath(id));
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: 'Validação não encontrada', codigoErro: 'NOT_FOUND' };
    return { sucesso: true, dados: result.dados };
  }

  async criar(dados: Partial<Validacao>): Promise<ResultadoOperacao<Validacao>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };

    const id = dados.id || this.gerarId();
    if (registryResult.dados.validacoes.find((v) => v.id === id)) return { sucesso: false, erro: `ID '${id}' já existe`, codigoErro: 'DUPLICATE_ID' };

    const hoje = new Date().toISOString();
    const validacao: Validacao = {
      id,
      alvoTipo: dados.alvoTipo || '',
      alvoId: dados.alvoId || '',
      tarefaId: dados.tarefaId || null,
      criterios: dados.criterios || [],
      responsavel: dados.responsavel || '',
      estado: dados.estado || 'PENDENTE',
      evidencias: dados.evidencias || [],
      observacoes: dados.observacoes || null,
      datas: { criadaEm: hoje, atualizadaEm: hoje, concluidaEm: null }
    };

    const validation = this.validator.validar('validacao', validacao);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    const fileResult = this.fs.escreverJson(this.getValidacaoPath(id), validacao, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    registryResult.dados.validacoes.push(validacao);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('VALIDACAO_INICIADA', `Validação '${id}' iniciada.`, { validacaoId: id, alvoTipo: validacao.alvoTipo });
    return { sucesso: true, dados: validacao };
  }

  async aprovar(id: string): Promise<ResultadoOperacao<Validacao>> {
    const result = await this.atualizar(id, { estado: 'APROVADO' });
    if (result.sucesso) this.auditoria.registrar('VALIDACAO_CONCLUIDA', `Validação '${id}' aprovada.`, { validacaoId: id });
    return result;
  }

  async rejeitar(id: string): Promise<ResultadoOperacao<Validacao>> {
    const result = await this.atualizar(id, { estado: 'REPROVADO' });
    if (result.sucesso) this.auditoria.registrar('VALIDACAO_CONCLUIDA', `Validação '${id}' reprovada.`, { validacaoId: id });
    return result;
  }

  async atualizar(id: string, dados: Partial<Validacao>): Promise<ResultadoOperacao<Validacao>> {
    const existente = this.obter(id);
    if (!existente.sucesso || !existente.dados) return { sucesso: false, erro: existente.erro, codigoErro: existente.codigoErro };

    const hoje = new Date().toISOString();
    const atualizado: Validacao = { ...existente.dados, ...dados, datas: { ...existente.dados.datas, atualizadaEm: hoje } };

    const validation = this.validator.validar('validacao', atualizado);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    if (dados.estado && dados.estado !== existente.dados.estado) {
      if (!validarTransicao(TRANSICOES_ESTADO_VALIDACAO, existente.dados.estado, dados.estado)) {
        return { sucesso: false, erro: `Transição inválida: ${existente.dados.estado} → ${dados.estado}`, codigoErro: 'INVALID_TRANSITION' };
      }
    }

    const fileResult = this.fs.escreverJson(this.getValidacaoPath(id), atualizado, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    const registryResult = this.carregarRegistry();
    if (registryResult.sucesso && registryResult.dados) {
      registryResult.dados.validacoes = registryResult.dados.validacoes.map((v) => (v.id === id ? atualizado : v));
      this.salvarRegistry(registryResult.dados);
    }
    return { sucesso: true, dados: atualizado };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    registryResult.dados.validacoes = registryResult.dados.validacoes.filter((v) => v.id !== id);
    this.salvarRegistry(registryResult.dados);
    this.fs.excluir(this.getValidacaoPath(id), { backup: true });
    return { sucesso: true, dados: true };
  }

  async excluirTodos(): Promise<ResultadoOperacao<number>> {
    const listResult = this.listar();
    if (!listResult.sucesso || !listResult.dados) return { sucesso: false, erro: listResult.erro, codigoErro: listResult.codigoErro };
    let count = 0;
    for (const item of listResult.dados) {
      const result = await this.excluir(item.id);
      if (result.sucesso) count++;
    }
    this.auditoria.registrar('VALIDACOES_EXCLUIDAS', `Todas as validações foram removidas. Total: ${count}`, { total: count });
    return { sucesso: true, dados: count };
  }
}

