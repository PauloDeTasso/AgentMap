import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { EstadoTarefa, ResultadoOperacao } from '../tipos';

export interface TransicoesConfig {
  versao: string;
  atualizadoEm: string;
  transicoes: Record<EstadoTarefa, EstadoTarefa[]>;
}

export class StateMachineService {
  private transicoes: Record<EstadoTarefa, EstadoTarefa[]>;
  private configPath: string;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.configPath = '.ia/configuracao/transicoes.json';
    this.transicoes = this.carregarTransicoes();
  }

  private carregarTransicoes(): Record<EstadoTarefa, EstadoTarefa[]> {
    const result = this.fs.lerJson<TransicoesConfig>(this.configPath);
    if (!result.sucesso || !result.dados || !result.dados.transicoes) {
      return this.getTransicoesPadrao();
    }
    return result.dados.transicoes;
  }

  private getTransicoesPadrao(): Record<EstadoTarefa, EstadoTarefa[]> {
    return {
      RASCUNHO: ['PLANEJADA', 'CANCELADA', 'EM_EXECUCAO', 'EM_REVISAO', 'CONCLUIDA'],
      PLANEJADA: ['PRONTA', 'RASCUNHO', 'BLOQUEADA', 'CANCELADA'],
      PRONTA: ['EM_EXECUCAO', 'PLANEJADA', 'BLOQUEADA'],
      EM_EXECUCAO: ['EM_TESTE', 'EM_REVISAO', 'BLOQUEADA', 'CANCELADA', 'CONCLUIDA'],
      EM_TESTE: ['EM_REVISAO', 'EM_EXECUCAO', 'BLOQUEADA'],
      EM_REVISAO: ['AGUARDANDO_APROVACAO', 'EM_TESTE', 'EM_EXECUCAO', 'REJEITADA', 'CONCLUIDA'],
      AGUARDANDO_APROVACAO: ['CONCLUIDA', 'REJEITADA', 'EM_REVISAO'],
      CONCLUIDA: [],
      BLOQUEADA: ['RASCUNHO', 'PLANEJADA', 'PRONTA', 'EM_EXECUCAO', 'EM_TESTE', 'EM_REVISAO', 'AGUARDANDO_APROVACAO', 'CANCELADA'],
      CANCELADA: [],
      REJEITADA: ['RASCUNHO', 'PLANEJADA', 'PRONTA', 'EM_EXECUCAO']
    };
  }

  private recarregar(): void {
    this.transicoes = this.carregarTransicoes();
  }

  listarTransicoes(): Record<EstadoTarefa, EstadoTarefa[]> {
    this.recarregar();
    return { ...this.transicoes };
  }

  validarTransicao(origem: EstadoTarefa, destino: EstadoTarefa): ResultadoOperacao<boolean> {
    this.recarregar();
    const transicoesOrigem = this.transicoes[origem] || [];
    const permitida = transicoesOrigem.includes(destino);
    if (!permitida) {
      return {
        sucesso: false,
        erro: `Transição inválida: ${origem} → ${destino}`,
        codigoErro: 'INVALID_TRANSITION'
      };
    }
    return { sucesso: true, dados: true };
  }

  atualizarTransicao(origem: EstadoTarefa, destinos: EstadoTarefa[]): ResultadoOperacao<Record<EstadoTarefa, EstadoTarefa[]>> {
    this.transicoes[origem] = destinos;
    const config: TransicoesConfig = {
      versao: '1.0.0',
      atualizadoEm: new Date().toISOString(),
      transicoes: this.transicoes
    };
    const result = this.fs.escreverJson(this.configPath, config, { backup: true });
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    this.auditoria.registrar('TAREFA_ESTADO_ALTERADO', `Transições de ${origem} atualizadas para: ${destinos.join(', ')}`, { origem });
    return { sucesso: true, dados: this.transicoes };
  }

  getTransicoes(): Record<EstadoTarefa, EstadoTarefa[]> {
    this.recarregar();
    return this.transicoes;
  }
}
