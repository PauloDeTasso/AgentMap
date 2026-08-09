import * as path from 'path';
import * as fs from 'fs';
import Ajv, { Schema, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { ResultadoOperacao } from '../tipos';

export interface ValidacaoResultado {
  valido: boolean;
  erros?: string[];
  dados?: unknown;
}

export class SchemaValidator {
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction>;
  private schemataDir: string;

  constructor(schemataDir?: string) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
    this.validators = new Map();
    this.schemataDir = schemataDir || path.resolve(__dirname, '..', '..', '..', 'esquemas');
    this.carregarEsquemas();
  }

  private carregarEsquemas(): void {
    if (!fs.existsSync(this.schemataDir)) {
      return;
    }
    const files = this.listarSchemas(this.schemataDir);
    for (const file of files) {
      try {
        const raw = fs.readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw) as Schema & { id?: string; $id?: string };
      const key = parsed.$id || parsed.id || path.basename(file, '.json');
      this.ajv.addSchema(parsed, key as string);
        const validate = this.ajv.getSchema(key as string);
        if (validate) {
          this.validators.set(key as string, validate as ValidateFunction);
        }
      } catch {
        // ignore schemata que nao carregam
      }
    }
  }

  private listarSchemas(dir: string, acc: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.listarSchemas(full, acc);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        acc.push(full);
      }
    }
    return acc;
  }

  validar(schemaId: string, dados: unknown): ValidacaoResultado {
    const validate = this.validators.get(schemaId);
    if (!validate) {
      return { valido: false, erros: [`Schema '${schemaId}' não encontrado`] };
    }
    const valido = validate(dados) as boolean;
    if (valido) {
      return { valido: true, dados };
    }
    const erros = (validate.errors || []).map((e: any) => {
      const path = e.instancePath || '(root)';
      return `${path}: ${e.message || 'validação falhou'}`;
    });
    return { valido: false, erros };
  }

  validarJson(dados: unknown): ValidarJsonResultado {
    try {
      JSON.parse(typeof dados === 'string' ? dados : JSON.stringify(dados));
      return { valido: true };
    } catch (e) {
      return { valido: false, erros: [(e as Error).message] };
    }
  }

  registrarSchema(schemaId: string, schema: Schema): void {
    this.ajv.addSchema(schema, schemaId);
    const validate = this.ajv.getSchema(schemaId);
    if (validate) {
      this.validators.set(schemaId, validate as ValidateFunction);
    }
  }
}

interface ValidarJsonResultado {
  valido: boolean;
  erros?: string[];
}

export function createValidator(schemataDir?: string): SchemaValidator {
  return new SchemaValidator(schemataDir);
}
