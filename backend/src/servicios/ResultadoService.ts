import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { ResultadoEntity, ResultadosRegistry, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';
import { TRANSICOES_ESTADO_RESULTADO, validarTransicao } from '../tipos';

export class ResultadoService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.win32.join('.ia', 'resultados', 'resultados.json');
  }

  private getResultadoPath(id: string): string {
    return path.win32.join('.ia', 'resultados', `${id}.json`);
  }

  private gerarId(): string {
    return this.idGenerator.gerarId('RES', this.getRegistryPath(), 'resultados');
  }

  private carregarRegistry(): ResultadoOperacao<ResultadosRegistry> {
    const result = this.fs.lerJson<ResultadosRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) {
      return { sucesso: true, dados: { resultados: [] } };
    }
    return result;
  }

  private salvarRegistry(registry: ResultadosRegistry): void {
    this.fs.escreverJson(this.getRegistryPath(), registry);
  }

  listar(): ResultadoOperacao<ResultadoEntity[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    return { sucesso: true, dados: result.dados.resultados };
  }

  listarPorTarefa(tarefaId: string): ResultadoOperacao<ResultadoEntity[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    const filtered = result.dados.resultados.filter((r) => r.tarefaId === tarefaId);
    return { sucesso: true, dados: filtered };
  }

  obter(id: string): ResultadoOperacao<ResultadoEntity> {
    const result = this.fs.lerJson<ResultadoEntity>(this.getResultadoPath(id));
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: 'Resultado não encontrado', codigoErro: 'NOT_FOUND' };
    }
    return { sucesso: true, dados: result.dados };
  }

  async criar(dados: Partial<ResultadoEntity>): Promise<ResultadoOperacao<ResultadoEntity>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };
    }

    const id = dados.id || this.gerarId();
    if (registryResult.dados.resultados.find((r) => r.id === id)) {
      return { sucesso: false, erro: `ID '${id}' já existe`, codigoErro: 'DUPLICATE_ID' };
    }

    const hoje = new Date().toISOString();
    const resultado: ResultadoEntity = {
      id,
      tarefaId: dados.tarefaId || '',
      execucaoId: dados.execucaoId || 0,
      agenteId: dados.agenteId || '',
      resumo: dados.resumo || '',
      estado: dados.estado || 'COMPLETO',
      arquivosAlterados: dados.arquivosAlterados || [],
      artefatos: dados.artefatos || [],
      testesExecutados: dados.testesExecutados || [],
      testesAprovados: dados.testesAprovados || [],
      riscosEncontrados: dados.riscosEncontrados || [],
      pendencias: dados.pendencias || [],
      alteracoesSolicitadas: dados.alteracoesSolicitadas || [],
      observacoes: dados.observacoes || null,
      datas: { criadaEm: hoje, atualizadaEm: hoje, concluidaEm: null }
    };

    const validation = this.validator.validar('resultado', resultado);
    if (!validation.valido) {
      return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    const fileResult = this.fs.escreverJson(this.getResultadoPath(id), resultado, { backup: true });
    if (!fileResult.sucesso) {
      return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };
    }

    registryResult.dados.resultados.push(resultado);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('RESULTADO_REGISTRADO', `Resultado '${id}' registrado para tarefa '${resultado.tarefaId}'.`, { resultadoId: id, tarefaId: resultado.tarefaId });
    return { sucesso: true, dados: resultado };
  }

  async atualizar(id: string, dados: Partial<ResultadoEntity>): Promise<ResultadoOperacao<ResultadoEntity>> {
    const existente = this.obter(id);
    if (!existente.sucesso || !existente.dados) {
      return { sucesso: false, erro: existente.erro, codigoErro: existente.codigoErro };
    }
    const hoje = new Date().toISOString();
    const atualizado: ResultadoEntity = { ...existente.dados, ...dados, datas: { ...existente.dados.datas, atualizadaEm: hoje } };

    const validation = this.validator.validar('resultado', atualizado);
    if (!validation.valido) {
      return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    if (dados.estado && dados.estado !== existente.dados.estado) {
      if (!validarTransicao(TRANSICOES_ESTADO_RESULTADO, existente.dados.estado, dados.estado)) {
        return { sucesso: false, erro: `Transição inválida: ${existente.dados.estado} → ${dados.estado}`, codigoErro: 'INVALID_TRANSITION' };
      }
    }

    const fileResult = this.fs.escreverJson(this.getResultadoPath(id), atualizado, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    const registryResult = this.carregarRegistry();
    if (registryResult.sucesso && registryResult.dados) {
      registryResult.dados.resultados = registryResult.dados.resultados.map((r) => (r.id === id ? atualizado : r));
      this.salvarRegistry(registryResult.dados);
    }
    return { sucesso: true, dados: atualizado };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    }
    registryResult.dados.resultados = registryResult.dados.resultados.filter((r) => r.id !== id);
    this.salvarRegistry(registryResult.dados);
    this.fs.excluir(this.getResultadoPath(id), { backup: true });
    return { sucesso: true, dados: true };
  }
}

