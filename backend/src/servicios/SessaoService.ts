import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Sessao, SessoesRegistry, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';

export class SessaoService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.win32.join('.ia', 'sessoes', 'sessoes.json');
  }
  private getSessaoPath(id: string): string {
    return path.win32.join('.ia', 'sessoes', `${id}.json`);
  }
  private gerarId(): string {
    return this.idGenerator.gerarId('SES', this.getRegistryPath(), 'sessoes');
  }
  private carregarRegistry(): ResultadoOperacao<SessoesRegistry> {
    const result = this.fs.lerJson<SessoesRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) return { sucesso: true, dados: { sessoes: [] } };
    return result;
  }
  private salvarRegistry(registry: SessoesRegistry): void {
    this.fs.escreverJson(this.getRegistryPath(), registry);
  }

  listar(): ResultadoOperacao<Sessao[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    return { sucesso: true, dados: result.dados.sessoes };
  }

  obter(id: string): ResultadoOperacao<Sessao> {
    const result = this.fs.lerJson<Sessao>(this.getSessaoPath(id));
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: 'Sessão não encontrada', codigoErro: 'NOT_FOUND' };
    return { sucesso: true, dados: result.dados };
  }

  async iniciar(dados: Partial<Sessao>): Promise<ResultadoOperacao<Sessao>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };

    const id = dados.id || this.gerarId();
    if (registryResult.dados.sessoes.find((s) => s.id === id)) return { sucesso: false, erro: `ID '${id}' já existe`, codigoErro: 'DUPLICATE_ID' };

    const hoje = new Date().toISOString();
    const sessao: Sessao = {
      id,
      agenteId: dados.agenteId || '',
      tarefaId: dados.tarefaId || null,
      projetoId: dados.projetoId || '',
      contextoConsultado: dados.contextoConsultado || {},
      registrosProduzidos: dados.registrosProduzidos || [],
      estadoFinal: dados.estadoFinal || '',
      datas: { inicio: hoje, criadoEm: hoje, fim: null }
    };

    const validation = this.validator.validar('sessao', sessao);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    const fileResult = this.fs.escreverJson(this.getSessaoPath(id), sessao, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    registryResult.dados.sessoes.push(sessao);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('SESSAO_INICIADA', `Sessão '${id}' iniciada.`, { sessaoId: id, agenteId: sessao.agenteId });
    return { sucesso: true, dados: sessao };
  }

  async finalizar(id: string, dados: Partial<Sessao>): Promise<ResultadoOperacao<Sessao>> {
    const result = await this.atualizar(id, { ...dados, estadoFinal: dados.estadoFinal || 'CONCLUIDA' });
    if (result.sucesso) {
      const sessao = result.dados!;
      sessao.datas.fim = new Date().toISOString();
      this.fs.escreverJson(this.getSessaoPath(id), sessao, { backup: true });
      const registryResult = this.carregarRegistry();
      if (registryResult.sucesso && registryResult.dados) {
        registryResult.dados.sessoes = registryResult.dados.sessoes.map((s) => (s.id === id ? sessao : s));
        this.salvarRegistry(registryResult.dados);
      }
      this.auditoria.registrar('SESSAO_FINALIZADA', `Sessão '${id}' finalizada.`, { sessaoId: id });
    }
    return result;
  }

  async atualizar(id: string, dados: Partial<Sessao>): Promise<ResultadoOperacao<Sessao>> {
    const existente = this.obter(id);
    if (!existente.sucesso || !existente.dados) return { sucesso: false, erro: existente.erro, codigoErro: existente.codigoErro };

    const atualizado: Sessao = { ...existente.dados, ...dados };

    const fileResult = this.fs.escreverJson(this.getSessaoPath(id), atualizado, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    const registryResult = this.carregarRegistry();
    if (registryResult.sucesso && registryResult.dados) {
      registryResult.dados.sessoes = registryResult.dados.sessoes.map((s) => (s.id === id ? atualizado : s));
      this.salvarRegistry(registryResult.dados);
    }
    return { sucesso: true, dados: atualizado };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    registryResult.dados.sessoes = registryResult.dados.sessoes.filter((s) => s.id !== id);
    this.salvarRegistry(registryResult.dados);
    this.fs.excluir(this.getSessaoPath(id), { backup: true });
    return { sucesso: true, dados: true };
  }

  async excluirTodos(): Promise<ResultadoOperacao<number>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    const sessoes = registryResult.dados.sessoes;
    let removidos = 0;
    for (const s of sessoes) {
      this.fs.excluir(this.getSessaoPath(s.id), { backup: true });
      removidos++;
    }
    this.salvarRegistry({ sessoes: [] });
    this.auditoria.registrar('SESSOES_EXCLUIDAS', `Todas as sessões (${removidos}) foram removidas.`, { removidos });
    return { sucesso: true, dados: removidos };
  }
}

