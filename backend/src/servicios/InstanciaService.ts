import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Instancia, InstanciasRegistry, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';

export class InstanciaService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.win32.join('.ia', 'instancias', 'instancias.json');
  }

  private getInstanciaPath(id: string): string {
    return path.win32.join('.ia', 'instancias', `${id}.json`);
  }

  private gerarId(): string {
    return this.idGenerator.gerarId('INS', this.getRegistryPath(), 'instancias');
  }

  private carregarRegistry(): ResultadoOperacao<InstanciasRegistry> {
    const result = this.fs.lerJson<InstanciasRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) return { sucesso: true, dados: { instancias: [] } };
    return result;
  }

  private salvarRegistry(registry: InstanciasRegistry): void {
    this.fs.escreverJson(this.getRegistryPath(), registry);
  }

  listar(filtros?: { agenteId?: string; projetoId?: string; workspacePath?: string; status?: string }): ResultadoOperacao<Instancia[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };

    let instancias = result.dados.instancias;
    if (filtros?.agenteId) instancias = instancias.filter((i) => i.agenteId === filtros.agenteId);
    if (filtros?.projetoId) instancias = instancias.filter((i) => i.projetoId === filtros.projetoId);
    if (filtros?.workspacePath) instancias = instancias.filter((i) => i.workspacePath === filtros.workspacePath);
    if (filtros?.status) instancias = instancias.filter((i) => i.status === filtros.status);

    console.log('[INSTANCIA][LISTAR] filtros aplicados', JSON.stringify({ filtros, count: instancias.length }));
    return { sucesso: true, dados: instancias };
  }

  obter(id: string): ResultadoOperacao<Instancia> {
    const result = this.fs.lerJson<Instancia>(this.getInstanciaPath(id));
    if (!result.sucesso || !result.dados) {
      console.warn('[INSTANCIA][OBTER] nao encontrada', JSON.stringify({ id, erro: result.erro, codigo: result.codigoErro }));
      return { sucesso: false, erro: 'Instância não encontrada', codigoErro: 'NOT_FOUND' };
    }
    return { sucesso: true, dados: result.dados };
  }

  obterPorInstanciaId(instanciaId: string): ResultadoOperacao<Instancia> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) {
      console.warn('[INSTANCIA][OBTER_POR_INSTANCIA_ID] erro ao carregar registry', JSON.stringify({ instanciaId, erro: registryResult.erro, codigo: registryResult.codigoErro }));
      return { sucesso: false, erro: 'Registro não encontrado', codigoErro: 'REGISTRY_ERROR' };
    }
    const instancia = registryResult.dados.instancias.find((i) => i.instanciaId === instanciaId);
    if (!instancia) {
      console.warn('[INSTANCIA][OBTER_POR_INSTANCIA_ID] nao encontrada', JSON.stringify({ instanciaId, count: registryResult.dados.instancias.length }));
      return { sucesso: false, erro: 'Instância não encontrada', codigoErro: 'NOT_FOUND' };
    }
    return { sucesso: true, dados: instancia };
  }

  async criar(dados: Partial<Instancia>): Promise<ResultadoOperacao<Instancia>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) {
      console.error('[INSTANCIA][CRIAR] erro ao carregar registry', JSON.stringify({ erro: registryResult.erro, codigo: registryResult.codigoErro }));
      return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };
    }

    const instanciaId = dados.instanciaId || this.gerarId();
    if (registryResult.dados.instancias.find((i) => i.instanciaId === instanciaId)) {
      console.warn('[INSTANCIA][CRIAR] ID duplicado', JSON.stringify({ instanciaId }));
      return { sucesso: false, erro: `ID '${instanciaId}' já existe`, codigoErro: 'DUPLICATE_ID' };
    }

    const hoje = new Date().toISOString();
    const instancia: Instancia = {
      id: this.gerarId(),
      instanciaId,
      agenteId: dados.agenteId || '',
      projetoId: dados.projetoId || '',
      workspaceId: dados.workspaceId || '',
      workspacePath: dados.workspacePath || '',
      tipoInstancia: dados.tipoInstancia || 'EXECUTOR',
      sessaoId: dados.sessaoId || null,
      status: dados.status || 'REGISTRADA',
      modoAutonomia: dados.modoAutonomia || 'MANUAL',
      ultimaAtividade: dados.ultimaAtividade || null,
      versaoKilo: dados.versaoKilo || null,
      capabilities: dados.capabilities || [],
      porta: dados.porta || null,
      pid: dados.pid || null,
      datas: { criacao: hoje, atualizacao: hoje, ultimaConexao: null }
    };

    const validation = this.validator.validar('instancia', instancia);
    if (!validation.valido) {
      console.error('[INSTANCIA][CRIAR] validacao falhou', JSON.stringify({ instanciaId, erros: validation.erros }));
      return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    const fileResult = this.fs.escreverJson(this.getInstanciaPath(instancia.id), instancia, { backup: true });
    if (!fileResult.sucesso) {
      console.error('[INSTANCIA][CRIAR] erro ao escrever arquivo', JSON.stringify({ instanciaId, erro: fileResult.erro, codigo: fileResult.codigoErro }));
      return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };
    }

    registryResult.dados.instancias.push(instancia);
    this.salvarRegistry(registryResult.dados);
    console.log('[INSTANCIA][CRIAR] instancia registrada', JSON.stringify({ id: instancia.id, instanciaId, agenteId: instancia.agenteId, projetoId: instancia.projetoId, workspacePath: instancia.workspacePath, status: instancia.status, modoAutonomia: instancia.modoAutonomia }));
    this.auditoria.registrar('INSTANCIA_REGISTRADA', `Instância '${instanciaId}' registrada.`, { instanciaId, agenteId: instancia.agenteId, workspacePath: instancia.workspacePath });

    return { sucesso: true, dados: instancia };
  }

  async atualizar(id: string, dados: Partial<Instancia>): Promise<ResultadoOperacao<Instancia>> {
    const existenteResult = this.obter(id);
    if (!existenteResult.sucesso || !existenteResult.dados) {
      console.warn('[INSTANCIA][ATUALIZAR] instancia nao encontrada', JSON.stringify({ id, erro: existenteResult.erro, codigo: existenteResult.codigoErro }));
      return { sucesso: false, erro: existenteResult.erro, codigoErro: existenteResult.codigoErro };
    }

    const atualizado: Instancia = {
      ...existenteResult.dados,
      ...dados,
      id: existenteResult.dados.id,
      instanciaId: dados.instanciaId || existenteResult.dados.instanciaId,
      datas: { ...existenteResult.dados.datas, atualizacao: new Date().toISOString() }
    };

    if (dados.status === 'CONECTADA') {
      atualizado.datas.ultimaConexao = new Date().toISOString();
    }

    const validation = this.validator.validar('instancia', atualizado);
    if (!validation.valido) {
      console.error('[INSTANCIA][ATUALIZAR] validacao falhou', JSON.stringify({ id, erros: validation.erros }));
      return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    const fileResult = this.fs.escreverJson(this.getInstanciaPath(id), atualizado, { backup: true });
    if (!fileResult.sucesso) {
      console.error('[INSTANCIA][ATUALIZAR] erro ao escrever arquivo', JSON.stringify({ id, erro: fileResult.erro, codigo: fileResult.codigoErro }));
      return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };
    }

    const registryResult = this.carregarRegistry();
    if (registryResult.sucesso && registryResult.dados) {
      registryResult.dados.instancias = registryResult.dados.instancias.map((i) => (i.id === id ? atualizado : i));
      this.salvarRegistry(registryResult.dados);
    }

    console.log('[INSTANCIA][ATUALIZAR] instancia atualizada', JSON.stringify({ id, instanciaId: atualizado.instanciaId, status: atualizado.status, sessaoId: atualizado.sessaoId }));
    this.auditoria.registrar('INSTANCIA_ATUALIZADA', `Instância '${atualizado.instanciaId}' atualizada para ${atualizado.status}.`, { instanciaId: atualizado.instanciaId, status: atualizado.status });
    return { sucesso: true, dados: atualizado };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) {
      console.error('[INSTANCIA][EXCLUIR] erro ao carregar registry', JSON.stringify({ id, erro: registryResult.erro, codigo: registryResult.codigoErro }));
      return { sucesso: false, erro: registryResult.erro, codigoErro: 'REGISTRY_ERROR' };
    }

    const instancia = registryResult.dados.instancias.find((i) => i.id === id);
    if (!instancia) {
      console.warn('[INSTANCIA][EXCLUIR] nao encontrada', JSON.stringify({ id }));
      return { sucesso: false, erro: 'Instância não encontrada', codigoErro: 'NOT_FOUND' };
    }

    registryResult.dados.instancias = registryResult.dados.instancias.filter((i) => i.id !== id);
    this.salvarRegistry(registryResult.dados);
    this.fs.excluir(this.getInstanciaPath(id), { backup: true });

    console.log('[INSTANCIA][EXCLUIR] instancia excluida', JSON.stringify({ id, instanciaId: instancia.instanciaId, agenteId: instancia.agenteId }));
    this.auditoria.registrar('INSTANCIA_EXCLUIDA', `Instância '${instancia.instanciaId}' excluída.`, { instanciaId: instancia.instanciaId });
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
    this.auditoria.registrar('INSTANCIAS_EXCLUIDAS', `Todas as instâncias foram removidas. Total: ${count}`, { total: count });
    return { sucesso: true, dados: count };
  }
}


