import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Artefato, ArtefatosRegistry, VersaoArtefato, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';
import { v4 as uuid } from 'uuid';

export class ArtefatoService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.win32.join('.ia', 'artefatos', 'artefatos.json');
  }

  private getArtefatoPath(id: string): string {
    return path.win32.join('.ia', 'artefatos', `${id}.json`);
  }

  private getVersoesPath(artefatoId: string): string {
    return path.win32.join('.ia', 'artefatos', `${artefatoId}-versoes.json`);
  }

  private gerarId(): string {
    return this.idGenerator.gerarId('ART', this.getRegistryPath(), 'artefatos');
  }

  private carregarRegistry(): ResultadoOperacao<ArtefatosRegistry> {
    const result = this.fs.lerJson<ArtefatosRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) {
      return { sucesso: true, dados: { artefatos: [] } };
    }
    return result;
  }

  private salvarRegistry(registry: ArtefatosRegistry): void {
    this.fs.escreverJson(this.getRegistryPath(), registry);
  }

  listar(): ResultadoOperacao<Artefato[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    return { sucesso: true, dados: result.dados.artefatos };
  }

  listarPorTarefa(tarefaId: string): ResultadoOperacao<Artefato[]> {
    const todos = this.listar();
    if (!todos.sucesso || !todos.dados) {
      return todos;
    }
    return { sucesso: true, dados: todos.dados.filter((a) => a.tarefaId === tarefaId) };
  }

  obter(id: string): ResultadoOperacao<Artefato> {
    const result = this.fs.lerJson<Artefato>(this.getArtefatoPath(id));
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: 'Artefato não encontrado', codigoErro: 'NOT_FOUND' };
    }
    return { sucesso: true, dados: result.dados };
  }

  async criar(dados: Partial<Artefato>): Promise<ResultadoOperacao<Artefato>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };
    }

    const id = dados.id || this.gerarId();
    if (registryResult.dados.artefatos.find((a) => a.id === id)) {
      return { sucesso: false, erro: `ID '${id}' já existe`, codigoErro: 'DUPLICATE_ID' };
    }

    const hoje = new Date().toISOString();
    const artefato: Artefato = {
      id,
      nome: dados.nome || '',
      tipo: dados.tipo || 'ARQUIVO',
      descricao: dados.descricao || '',
      tarefaId: dados.tarefaId || null,
      localizacao: dados.localizacao || null,
      agenteId: dados.agenteId || '',
      versaoId: dados.versaoId || null,
      dados: dados.dados || null,
      estado: dados.estado || 'ATIVO',
      datas: { criadaEm: hoje, atualizadaEm: hoje, excluidaEm: null }
    };

    const validation = this.validator.validar('artefato', artefato);
    if (!validation.valido) {
      return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    const fileResult = this.fs.escreverJson(this.getArtefatoPath(id), artefato, { backup: true });
    if (!fileResult.sucesso) {
      return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };
    }

    registryResult.dados.artefatos.push(artefato);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('ARTEFATO_CRIADO', `Artefato '${id}' criado.`, { artefatoId: id, tipo: artefato.tipo });
    return { sucesso: true, dados: artefato };
  }

  listarVersoes(artefatoId: string): ResultadoOperacao<VersaoArtefato[]> {
    const result = this.fs.lerJson<{ versoes: VersaoArtefato[] }>(this.getVersoesPath(artefatoId));
    if (!result.sucesso || !result.dados) {
      return { sucesso: true, dados: [] };
    }
    return { sucesso: true, dados: result.dados.versoes };
  }

  async adicionarVersao(artefatoId: string, versao: string, commit?: string): Promise<ResultadoOperacao<VersaoArtefato>> {
    const result = this.fs.lerJson<{ versoes: VersaoArtefato[] }>(this.getVersoesPath(artefatoId));
    const versoes = result.sucesso && result.dados ? result.dados.versoes : [];

    const novaVersao: VersaoArtefato = {
      id: uuid(),
      artefatoId,
      versao,
      estado: 'ATIVA',
      commit: commit || null,
      dados: null,
      data: new Date().toISOString()
    };
    versoes.push(novaVersao);
    this.fs.escreverJson(this.getVersoesPath(artefatoId), { versoes });
    return { sucesso: true, dados: novaVersao };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    }
    registryResult.dados.artefatos = registryResult.dados.artefatos.filter((a) => a.id !== id);
    this.salvarRegistry(registryResult.dados);
    this.fs.excluir(this.getArtefatoPath(id), { backup: true });
    return { sucesso: true, dados: true };
  }
}

