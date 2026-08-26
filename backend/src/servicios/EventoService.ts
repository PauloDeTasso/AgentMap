import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Evento, EventosRegistry, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';

export class EventoService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.win32.join('.ia', 'eventos', 'eventos.json');
  }

  private getEventoPath(id: string): string {
    return path.win32.join('.ia', 'eventos', `${id}.json`);
  }

  private gerarId(): string {
    return this.idGenerator.gerarId('EVT', this.getRegistryPath(), 'eventos');
  }

  private carregarRegistry(): ResultadoOperacao<EventosRegistry> {
    const result = this.fs.lerJson<EventosRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) {
      return { sucesso: true, dados: { eventos: [] } };
    }
    return result;
  }

  private salvarRegistry(registry: EventosRegistry): void {
    const result = this.fs.escreverJson(this.getRegistryPath(), registry);
    if (!result.sucesso) {
      throw new Error(result.erro || 'Erro ao salvar registro');
    }
  }

  listar(filtros?: { destino?: string; estado?: string }): ResultadoOperacao<Evento[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    let eventos = result.dados.eventos;
    if (filtros?.destino) {
      eventos = eventos.filter((e) => e.destino === filtros.destino);
    }
    if (filtros?.estado) {
      eventos = eventos.filter((e) => e.estado === filtros.estado);
    }
    return { sucesso: true, dados: eventos };
  }

  obter(id: string): ResultadoOperacao<Evento> {
    const result = this.fs.lerJson<Evento>(this.getEventoPath(id));
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: 'Evento não encontrado', codigoErro: 'NOT_FOUND' };
    }
    return { sucesso: true, dados: result.dados };
  }

  registrar(dados: Partial<Evento>): ResultadoOperacao<Evento> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: 'Erro ao carregar registro de eventos', codigoErro: 'REGISTRY_ERROR' };
    }

    const id = dados.id || this.gerarId();
    if (registryResult.dados.eventos.find((e) => e.id === id)) {
      return { sucesso: false, erro: `ID '${id}' já existe`, codigoErro: 'DUPLICATE_ID' };
    }

    const hoje = new Date().toISOString();
    const evento: Evento = {
      id,
      tipo: dados.tipo || 'SOLICITACAO_CRIADA',
      origem: dados.origem || '',
      destino: dados.destino || '',
      referenciaTipo: dados.referenciaTipo || '',
      referenciaId: dados.referenciaId || '',
      mensagem: dados.mensagem || '',
      estado: dados.estado || 'PENDENTE',
      datas: { criadoEm: hoje, criacao: hoje, consumidoEm: null }
    };

    const validation = this.validator.validar('evento', evento);
    if (!validation.valido) {
      return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    const fileResult = this.fs.escreverJson(this.getEventoPath(id), evento, { backup: true });
    if (!fileResult.sucesso) {
      return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };
    }

    registryResult.dados.eventos.push(evento);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('EVENTO_CRIADO', `Evento '${id}' criado: ${evento.mensagem}`, { eventoId: id, tipo: evento.tipo, origem: evento.origem, destino: evento.destino });

    return { sucesso: true, dados: evento };
  }

  marcarConsumido(id: string): ResultadoOperacao<Evento> {
    const eventoResult = this.obter(id);
    if (!eventoResult.sucesso || !eventoResult.dados) {
      return { sucesso: false, erro: eventoResult.erro, codigoErro: eventoResult.codigoErro };
    }

    const evento = eventoResult.dados;
    if (evento.estado === 'CONSUMIDO') {
      return { sucesso: true, dados: evento };
    }

    const hoje = new Date().toISOString();
    evento.estado = 'CONSUMIDO';
    evento.datas.consumidoEm = hoje;

    const fileResult = this.fs.escreverJson(this.getEventoPath(id), evento, { backup: true });
    if (!fileResult.sucesso) {
      return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };
    }

    const registryResult = this.carregarRegistry();
    if (registryResult.sucesso && registryResult.dados) {
      registryResult.dados.eventos = registryResult.dados.eventos.map((e) => (e.id === id ? evento : e));
      this.salvarRegistry(registryResult.dados);
    }

    this.auditoria.registrar('EVENTO_CONSUMIDO', `Evento '${id}' marcado como consumido.`, { eventoId: id });
    return { sucesso: true, dados: evento };
  }
}
