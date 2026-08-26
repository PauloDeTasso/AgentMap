import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { ResultadoOperacao } from '../tipos';

export interface ChecklistSaidaFaseItem {
  id: string;
  descricao: string;
  obrigatorio: boolean;
  satisfeito: boolean;
}

export interface ChecklistSaidaFase {
  faseId: string;
  faseNome: string;
  itens: ChecklistSaidaFaseItem[];
  aprovado: boolean;
  aprovadoPor?: string;
  dataAprovacao?: string;
}

export interface ChecklistSaidaFaseResultado {
  valido: boolean;
  erros: string[];
  warnings: string[];
  checklist: ChecklistSaidaFase;
}

export class CheckpointValidator {
  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {}

  validarChecklistSaidaFase(checklist: unknown): ResultadoOperacao<ChecklistSaidaFaseResultado> {
    const erros: string[] = [];
    const warnings: string[] = [];

    if (!checklist || typeof checklist !== 'object') {
      erros.push('Checklist de saída de fase inválido: objeto esperado');
      return {
        sucesso: false,
        erro: 'Checklist inválido',
        codigoErro: 'INVALID_CHECKLIST',
        dados: { valido: false, erros, warnings, checklist: {} as ChecklistSaidaFase }
      };
    }

    const raw = checklist as Record<string, unknown>;

    const faseId = typeof raw.faseId === 'string' ? raw.faseId : '';
    const faseNome = typeof raw.faseNome === 'string' ? raw.faseNome : '';
    const aprovado = typeof raw.aprovado === 'boolean' ? raw.aprovado : false;
    const aprovadoPor = typeof raw.aprovadoPor === 'string' ? raw.aprovadoPor : undefined;
    const dataAprovacao = typeof raw.dataAprovacao === 'string' ? raw.dataAprovacao : undefined;

    if (!faseId) erros.push("Campo obrigatório 'faseId' ausente ou inválido");
    if (!faseNome) erros.push("Campo obrigatório 'faseNome' ausente ou inválido");

    const itens: ChecklistSaidaFaseItem[] = [];
    if (!Array.isArray(raw.itens)) {
      erros.push("Campo 'itens' deve ser um array");
    } else {
      for (let i = 0; i < raw.itens.length; i++) {
        const item = raw.itens[i] as Record<string, unknown>;
        const id = typeof item.id === 'string' ? item.id : '';
        const descricao = typeof item.descricao === 'string' ? item.descricao : '';
        const obrigatorio = typeof item.obrigatorio === 'boolean' ? item.obrigatorio : false;
        const satisfeito = typeof item.satisfeito === 'boolean' ? item.satisfeito : false;

        if (!id) erros.push(`Item ${i}: 'id' obrigatório`);
        if (!descricao) erros.push(`Item ${i} (${id || 'sem id'}): 'descricao' obrigatória`);

        if (obrigatorio && !satisfeito) {
          erros.push(`Item ${i} (${id}): item obrigatório não satisfeito`);
        }

        if (!satisfeito) {
          warnings.push(`Item ${i} (${id}): não satisfeito`);
        }

        itens.push({ id, descricao, obrigatorio, satisfeito });
      }
    }

    if (aprovado && !aprovadoPor) {
      warnings.push("Checklist aprovado sem identificação de quem aprovou ('aprovadoPor')");
    }

    const valido = erros.length === 0;
    const checklistSaida: ChecklistSaidaFase = {
      faseId,
      faseNome,
      itens,
      aprovado,
      aprovadoPor,
      dataAprovacao
    };

    this.auditoria.registrar(
      valido ? 'CHECKLIST_SAIDA_FASE_VALIDADO' : 'CHECKLIST_SAIDA_FASE_INVALIDO',
      `Checklist de saída da fase '${faseNome}' (${faseId}) validado: ${valido ? 'válido' : 'inválido'}`,
      {
        faseId,
        faseNome,
        aprovado,
        totalItens: itens.length,
        itensSatisfeitos: itens.filter((it) => it.satisfeito).length,
        erros
      },
      'gerenciador',
      valido ? 'sucesso' : 'falha'
    );

    return {
      sucesso: true,
      dados: { valido, erros, warnings, checklist: checklistSaida }
    };
  }

  async validarChecklistPorArquivo(caminhoRelativo: string): Promise<ResultadoOperacao<ChecklistSaidaFaseResultado>> {
    const result = this.fs.lerJson<unknown>(caminhoRelativo);
    if (!result.sucesso || !result.dados) {
      return {
        sucesso: false,
        erro: result.erro || 'Arquivo de checklist não encontrado',
        codigoErro: result.codigoErro || 'FILE_NOT_FOUND',
        dados: {
          valido: false,
          erros: [result.erro || 'Arquivo não encontrado'],
          warnings: [],
          checklist: {} as ChecklistSaidaFase
        }
      };
    }

    const validacao = this.validarChecklistSaidaFase(result.dados);
    if (!validacao.sucesso || !validacao.dados) {
      return validacao;
    }

    return {
      sucesso: true,
      dados: validacao.dados
    };
  }
}
