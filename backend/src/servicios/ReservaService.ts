import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Reserva, ReservasRegistry, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';
import { TRANSICOES_ESTADO_RESERVA, validarTransicao } from '../tipos';

export class ReservaService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.join('.ia', 'reservas', 'reservas.json');
  }
  private getReservaPath(id: string): string {
    return path.join('.ia', 'reservas', `${id}.json`);
  }
  private gerarId(): string {
    return this.idGenerator.gerarId('RESV', this.getRegistryPath(), 'reservas');
  }
  private carregarRegistry(): ResultadoOperacao<ReservasRegistry> {
    const result = this.fs.lerJson<ReservasRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) return { sucesso: true, dados: { reservas: [] } };
    return result;
  }
  private salvarRegistry(registry: ReservasRegistry): void {
    this.fs.escreverJson(this.getRegistryPath(), registry);
  }

  listar(): ResultadoOperacao<Reserva[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    return { sucesso: true, dados: result.dados.reservas };
  }

  listarPorAgente(agenteId: string): ResultadoOperacao<Reserva[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    const filtered = result.dados.reservas.filter((r) => r.agenteId === agenteId && r.estado === 'ATIVA');
    return { sucesso: true, dados: filtered };
  }

  obter(id: string): ResultadoOperacao<Reserva> {
    const result = this.fs.lerJson<Reserva>(this.getReservaPath(id));
    if (!result.sucesso || !result.dados) return { sucesso: false, erro: 'Reserva não encontrada', codigoErro: 'NOT_FOUND' };
    return { sucesso: true, dados: result.dados };
  }

  async criar(dados: Partial<Reserva>): Promise<ResultadoOperacao<Reserva>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };

    const id = dados.id || this.gerarId();
    if (registryResult.dados.reservas.find((r) => r.id === id)) return { sucesso: false, erro: `ID '${id}' já existe`, codigoErro: 'DUPLICATE_ID' };

    const hoje = new Date().toISOString();
    const reserva: Reserva = {
      id,
      alvo: dados.alvo || '',
      tipoAlvo: dados.tipoAlvo || 'ARQUIVO',
      agenteId: dados.agenteId || '',
      tarefaId: dados.tarefaId || null,
      estado: dados.estado || 'ATIVA',
      observacoes: dados.observacoes || null,
      datas: { criadaEm: hoje, atualizadaEm: hoje, expiradaEm: null }
    };

    const validation = this.validator.validar('reserva', reserva);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    const fileResult = this.fs.escreverJson(this.getReservaPath(id), reserva, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    registryResult.dados.reservas.push(reserva);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('RESERVA_CRIADA', `Reserva '${id}' para '${reserva.alvo}' por '${reserva.agenteId}'.`, { reservaId: id, alvo: reserva.alvo });
    return { sucesso: true, dados: reserva };
  }

  async liberar(id: string): Promise<ResultadoOperacao<Reserva>> {
    const result = await this.atualizar(id, { estado: 'CANCELADA' });
    if (result.sucesso) this.auditoria.registrar('RESERVA_LIBERADA', `Reserva '${id}' liberada.`, { reservaId: id });
    return result;
  }

  async atualizar(id: string, dados: Partial<Reserva>): Promise<ResultadoOperacao<Reserva>> {
    const existente = this.obter(id);
    if (!existente.sucesso || !existente.dados) return { sucesso: false, erro: existente.erro, codigoErro: existente.codigoErro };

    const hoje = new Date().toISOString();
    const atualizado: Reserva = { ...existente.dados, ...dados, datas: { ...existente.dados.datas, atualizadaEm: hoje } };

    const validation = this.validator.validar('reserva', atualizado);
    if (!validation.valido) return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };

    if (dados.estado && dados.estado !== existente.dados.estado) {
      if (!validarTransicao(TRANSICOES_ESTADO_RESERVA, existente.dados.estado, dados.estado)) {
        return { sucesso: false, erro: `Transição inválida: ${existente.dados.estado} → ${dados.estado}`, codigoErro: 'INVALID_TRANSITION' };
      }
    }

    const fileResult = this.fs.escreverJson(this.getReservaPath(id), atualizado, { backup: true });
    if (!fileResult.sucesso) return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };

    const registryResult = this.carregarRegistry();
    if (registryResult.sucesso && registryResult.dados) {
      registryResult.dados.reservas = registryResult.dados.reservas.map((r) => (r.id === id ? atualizado : r));
      this.salvarRegistry(registryResult.dados);
    }
    return { sucesso: true, dados: atualizado };
  }

  async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    registryResult.dados.reservas = registryResult.dados.reservas.filter((r) => r.id !== id);
    this.salvarRegistry(registryResult.dados);
    this.fs.excluir(this.getReservaPath(id), { backup: true });
    return { sucesso: true, dados: true };
  }

  async excluirTodos(): Promise<ResultadoOperacao<boolean>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    }
    const itens = registryResult.dados.reservas;
    for (const item of itens) {
      this.fs.excluir(this.getReservaPath(item.id), { backup: true });
    }
    this.salvarRegistry({ reservas: [] });
    this.auditoria.registrar('RESERVAS_EXCLUIDAS', `${itens.length} reserva(s) excluída(s).`, { quantidade: itens.length });
    return { sucesso: true, dados: true };
  }
}

