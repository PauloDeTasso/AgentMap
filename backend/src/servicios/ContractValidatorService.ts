import * as path from 'path';
import * as fs from 'fs';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { ResultadoOperacao } from '../tipos';

export interface ValidacaoContratoResultado {
  contratoId: string;
  valido: boolean;
  erros: string[];
  warnings: string[];
}

export class ContractValidatorService {
  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {}

  validarContrato(contratoId: string): ResultadoOperacao<ValidacaoContratoResultado> {
    const caminho = path.join('.ia', 'contratos', `${contratoId}.json`);
    const result = this.fs.lerJson(caminho);
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro || 'Contrato não encontrado', codigoErro: result.codigoErro || 'NOT_FOUND' };
    }

    const validation = this.validator.validar('contrato', result.dados);
    const erros: string[] = [];
    const warnings: string[] = [];

    if (!validation.valido && validation.erros) {
      erros.push(...validation.erros);
    }

    if (erros.length === 0) {
      this.auditoria.registrar('CONTRATO_VALIDADO', `Contrato '${contratoId}' validado com sucesso.`, { contratoId });
      return { sucesso: true, dados: { contratoId, valido: true, erros: [], warnings } };
    }

    this.auditoria.registrar('CONTRATO_INVALIDO', `Contrato '${contratoId}' inválido: ${erros.join(', ')}`, { contratoId, erros });
    return { sucesso: true, dados: { contratoId, valido: false, erros, warnings } };
  }

  validarTodosContratos(): ResultadoOperacao<ValidacaoContratoResultado[]> {
    const contratosPath = '.ia/contratos';
    const listResult = this.fs.listar(contratosPath);
    if (!listResult.sucesso || !listResult.dados) {
      return { sucesso: false, erro: listResult.erro || 'Não foi possível listar contratos', codigoErro: listResult.codigoErro || 'LIST_ERROR' };
    }

    const arquivosContratos = listResult.dados.filter((f: any) => f.tipo === 'arquivo' && f.nome.endsWith('.json'));
    const resultados: ValidacaoContratoResultado[] = [];

    for (const arquivo of arquivosContratos) {
      const contratoId = path.win32.basename(arquivo.nome, '.json');
      const validacao = this.validarContrato(contratoId);
      if (validacao.sucesso && validacao.dados) {
        resultados.push(validacao.dados);
      }
    }

    return { sucesso: true, dados: resultados };
  }
}

