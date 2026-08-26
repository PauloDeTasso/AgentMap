import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { HandoffService } from './HandoffService';
import { EventoService } from './EventoService';
import { MonitoramentoService } from './MonitoramentoService';
import { Handoff, ResultadoOperacao } from '../tipos';

export interface HandoffFaseSchema {
  faseOrigem: string;
  faseDestino: string;
  handoffId?: string;
  dadosExtras?: Record<string, unknown>;
}

export interface HandoffFaseResultado {
  handoff: Handoff;
  schemaValido: boolean;
  errosSchema: string[];
}

export class HandoffManager {
  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator,
    private handoffService: HandoffService,
    private eventoService?: EventoService,
    private monitoramento?: MonitoramentoService
  ) {}

  validarSchemaHandoffFase(schema: unknown): ResultadoOperacao<{ valido: boolean; erros: string[] }> {
    const erros: string[] = [];

    if (!schema || typeof schema !== 'object') {
      erros.push('Schema de handoff de fase inválido: objeto esperado');
      return { sucesso: true, dados: { valido: false, erros } };
    }

    const raw = schema as Record<string, unknown>;

    const faseOrigem = typeof raw.faseOrigem === 'string' ? raw.faseOrigem : '';
    const faseDestino = typeof raw.faseDestino === 'string' ? raw.faseDestino : '';
    const handoffId = typeof raw.handoffId === 'string' ? raw.handoffId : undefined;
    const dadosExtras = raw.dadosExtras && typeof raw.dadosExtras === 'object' ? raw.dadosExtras : undefined;

    if (!faseOrigem) erros.push("Campo 'faseOrigem' obrigatório e deve ser string");
    if (!faseDestino) erros.push("Campo 'faseDestino' obrigatório e deve ser string");
    if (faseOrigem === faseDestino) erros.push("'faseOrigem' e 'faseDestino' não podem ser iguais");

    if (handoffId !== undefined && !handoffId) {
      erros.push("'handoffId' deve ser string não vazia quando informado");
    }

    if (dadosExtras !== undefined) {
      try {
        JSON.stringify(dadosExtras);
      } catch {
        erros.push("'dadosExtras' deve ser um objeto JSON serializável");
      }
    }

    return { sucesso: true, dados: { valido: erros.length === 0, erros } };
  }

  async criarHandoffFase(dados: Partial<Handoff>, schema: HandoffFaseSchema): Promise<ResultadoOperacao<HandoffFaseResultado>> {
    const schemaValidation = this.validarSchemaHandoffFase(schema);
    if (!schemaValidation.sucesso || !schemaValidation.dados?.valido) {
      const erros = schemaValidation.sucesso && schemaValidation.dados ? schemaValidation.dados.erros : ['Schema inválido'];
      return {
        sucesso: false,
        erro: `Schema inválido: ${erros.join(', ')}`,
        codigoErro: 'INVALID_SCHEMA'
      };
    }

    const origem = dados.origem || schema.faseOrigem;
    const destino = dados.destino || schema.faseDestino;

    if (!origem || !destino) {
      return {
        sucesso: false,
        erro: "Origem e destino do handoff são obrigatórios",
        codigoErro: 'MISSING_ORIGIN_DESTINATION'
      };
    }

    const handoffResult = await this.handoffService.criar({
      ...dados,
      origem,
      destino
    });

    if (!handoffResult.sucesso || !handoffResult.dados) {
      return {
        sucesso: false,
        erro: handoffResult.erro || 'Erro ao criar handoff',
        codigoErro: handoffResult.codigoErro || 'HANDOFF_CREATE_ERROR'
      };
    }

    const resultado: HandoffFaseResultado = {
      handoff: handoffResult.dados,
      schemaValido: true,
      errosSchema: []
    };

    this.auditoria.registrar(
      'HANDOFF_FASE_CRIADO',
      `Handoff de fase criado: ${schema.faseOrigem} -> ${schema.faseDestino} (${handoffResult.dados.id})`,
      {
        handoffId: handoffResult.dados.id,
        faseOrigem: schema.faseOrigem,
        faseDestino: schema.faseDestino,
        origem,
        destino,
        dadosExtras: schema.dadosExtras
      }
    );

    if (this.eventoService) {
      this.eventoService.registrar({
        tipo: 'HANDOFF_CRIADO',
        origem,
        destino,
        referenciaTipo: 'handoff',
        referenciaId: handoffResult.dados.id,
        mensagem: `Handoff de fase criado: ${schema.faseOrigem} -> ${schema.faseDestino}`
      });
    }

    if (this.monitoramento) {
      this.monitoramento.adicionarMensagem({
        id: `MSG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        tipo: 'HANDOFF_CRIADO',
        emissor: origem,
        agenteId: origem,
        conteudo: `Handoff de fase criado: ${schema.faseOrigem} -> ${schema.faseDestino}: ${handoffResult.dados.resumo || handoffResult.dados.id}`,
        dados: { handoffId: handoffResult.dados.id, faseOrigem: schema.faseOrigem, faseDestino: schema.faseDestino }
      }).catch(() => {});
    }

    return { sucesso: true, dados: resultado };
  }

  async atualizarHandoffFase(id: string, dados: Partial<Handoff>, schema: HandoffFaseSchema): Promise<ResultadoOperacao<HandoffFaseResultado>> {
    const schemaValidation = this.validarSchemaHandoffFase(schema);
    if (!schemaValidation.sucesso || !schemaValidation.dados?.valido) {
      const erros = schemaValidation.sucesso && schemaValidation.dados ? schemaValidation.dados.erros : ['Schema inválido'];
      return {
        sucesso: false,
        erro: `Schema inválido: ${erros.join(', ')}`,
        codigoErro: 'INVALID_SCHEMA'
      };
    }

    const existente = this.handoffService.obter(id);
    if (!existente.sucesso || !existente.dados) {
      return {
        sucesso: false,
        erro: existente.erro || 'Handoff não encontrado',
        codigoErro: existente.codigoErro || 'NOT_FOUND'
      };
    }

    const atualizado = await this.handoffService.atualizar(id, dados);
    if (!atualizado.sucesso || !atualizado.dados) {
      return {
        sucesso: false,
        erro: atualizado.erro || 'Erro ao atualizar handoff',
        codigoErro: atualizado.codigoErro || 'HANDOFF_UPDATE_ERROR'
      };
    }

    const resultado: HandoffFaseResultado = {
      handoff: atualizado.dados,
      schemaValido: true,
      errosSchema: []
    };

    this.auditoria.registrar(
      'HANDOFF_FASE_ATUALIZADO',
      `Handoff de fase atualizado: ${schema.faseOrigem} -> ${schema.faseDestino} (${id})`,
      {
        handoffId: id,
        faseOrigem: schema.faseOrigem,
        faseDestino: schema.faseDestino,
        estado: atualizado.dados.estado,
        dadosExtras: schema.dadosExtras
      }
    );

    return { sucesso: true, dados: resultado };
  }

  async obterHandoffFase(id: string): Promise<ResultadoOperacao<HandoffFaseResultado>> {
    const existente = this.handoffService.obter(id);
    if (!existente.sucesso || !existente.dados) {
      return {
        sucesso: false,
        erro: existente.erro || 'Handoff não encontrado',
        codigoErro: existente.codigoErro || 'NOT_FOUND'
      };
    }

    return {
      sucesso: true,
      dados: {
        handoff: existente.dados,
        schemaValido: true,
        errosSchema: []
      }
    };
  }

  listarHandoffsPorFase(faseOrigem: string, faseDestino?: string): ResultadoOperacao<HandoffFaseResultado[]> {
    const listarResult = this.handoffService.listar();
    if (!listarResult.sucesso || !listarResult.dados) {
      return {
        sucesso: false,
        erro: listarResult.erro || 'Erro ao listar handoffs',
        codigoErro: listarResult.codigoErro || 'LIST_ERROR'
      };
    }

    const filtrados = listarResult.dados.filter((h) => {
      if (faseDestino) {
        return h.origem === faseOrigem && h.destino === faseDestino;
      }
      return h.origem === faseOrigem || h.destino === faseOrigem;
    });

    const resultados: HandoffFaseResultado[] = filtrados.map((handoff) => ({
      handoff,
      schemaValido: true,
      errosSchema: []
    }));

    return { sucesso: true, dados: resultados };
  }
}
