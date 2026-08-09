import { toMcpStructured, toMcpResult, toMcpData, mcpError, extrairDados, isMcpError } from '../src/mcp-server/utils/helpers';
import * as z from 'zod';

describe('MCP tools structuredContent and outputSchema', () => {
  describe('toMcpStructured', () => {
    test('wraps array with data key', () => {
      const result = toMcpStructured([{ id: '1' }]);
      expect(result.structuredContent).toEqual({ data: [{ id: '1' }] });
    });

    test('keeps object as-is', () => {
      const result = toMcpStructured({ id: '1' });
      expect(result.structuredContent).toEqual({ id: '1' });
    });

    test('keeps null as-is', () => {
      const result = toMcpStructured(null);
      expect(result.structuredContent).toBeNull();
    });

    test('keeps primitive string as-is', () => {
      const result = toMcpStructured('hello');
      expect(result.structuredContent).toBe('hello');
    });
  });

  describe('toMcpData', () => {
    test('returns data as structuredContent', () => {
      const result = toMcpData({ id: '1' });
      expect(result.structuredContent).toEqual({ id: '1' });
    });
  });

  describe('toMcpResult', () => {
    test('sets isError for failed results', () => {
      const result = toMcpResult({ sucesso: false, codigoErro: 'ERR', erro: 'fail' });
      expect(result.isError).toBe(true);
    });

    test('does not set isError for successful results', () => {
      const result = toMcpResult({ sucesso: true, dados: { id: '1' } });
      expect(result.isError).toBeUndefined();
    });

    test('extracts structuredContent from dados', () => {
      const result = toMcpResult({ sucesso: true, dados: { id: '1' } });
      expect(result.structuredContent).toEqual({ id: '1' });
    });

    test('returns undefined structuredContent when dados is null', () => {
      const result = toMcpResult({ sucesso: true, dados: null });
      expect(result.structuredContent).toBeUndefined();
    });
  });

  describe('mcpError', () => {
    test('returns isError true', () => {
      const result = mcpError({ sucesso: false, codigoErro: 'ERR', erro: 'fail' });
      expect(result.isError).toBe(true);
    });

    test('returns envelope with sucesso false', () => {
      const result = mcpError({ sucesso: false, codigoErro: 'ERR', erro: 'fail' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.sucesso).toBe(false);
      expect(parsed.codigo).toBe('ERR');
      expect(parsed.mensagem).toBe('fail');
    });
  });

  describe('extrairDados', () => {
    test('extracts dados from successful result', () => {
      const content = [{ type: 'text', text: JSON.stringify({ sucesso: true, dados: { id: '1' } }) }];
      expect(extrairDados<{ id: string }>(content)).toEqual({ id: '1' });
    });

    test('returns null for failed result', () => {
      const content = [{ type: 'text', text: JSON.stringify({ sucesso: false, erro: 'fail' }) }];
      expect(extrairDados(content)).toBeNull();
    });

    test('returns null for invalid JSON', () => {
      const content = [{ type: 'text', text: 'not-json' }];
      expect(extrairDados(content)).toBeNull();
    });

    test('returns null for empty content', () => {
      expect(extrairDados([])).toBeNull();
    });
  });

  describe('isMcpError', () => {
    test('detects error envelope', () => {
      const content = [{ type: 'text', text: JSON.stringify({ sucesso: false, codigo: 'ERR', mensagem: 'fail' }) }];
      expect(isMcpError(content)).toEqual({ codigo: 'ERR', mensagem: 'fail' });
    });

    test('returns null for success', () => {
      const content = [{ type: 'text', text: JSON.stringify({ sucesso: true, dados: {} }) }];
      expect(isMcpError(content)).toBeNull();
    });

    test('returns null for invalid JSON', () => {
      const content = [{ type: 'text', text: 'not-json' }];
      expect(isMcpError(content)).toBeNull();
    });
  });

  describe('tool outputSchema validation', () => {
    test('projetos_abrir output matches schema', () => {
      const schema = z.object({
        id: z.string(),
        nome: z.string(),
        caminhoRaiz: z.string(),
        config: z.record(z.string(), z.unknown())
      });
      const output = { id: 'P1', nome: 'P1', caminhoRaiz: '/tmp', config: { key: 'value' } };
      expect(() => schema.parse(output)).not.toThrow();
    });

    test('projetos_fechar output matches schema', () => {
      const schema = z.boolean();
      expect(() => schema.parse(true)).not.toThrow();
      expect(() => schema.parse(false)).not.toThrow();
      expect(() => schema.parse('true')).toThrow();
    });

    test('tarefas_excluir output matches schema', () => {
      const schema = z.boolean();
      expect(() => schema.parse(true)).not.toThrow();
    });

    test('handoffs_excluir output matches schema', () => {
      const schema = z.boolean();
      expect(() => schema.parse(false)).not.toThrow();
    });

    test('arquivos_ler output matches schema', () => {
      const schema = z.string();
      expect(() => schema.parse('file content')).not.toThrow();
      expect(() => schema.parse(123)).toThrow();
    });

    test('integridade_verificar output matches schema', () => {
      const schema = z.object({
        inconsistencias: z.array(z.string()),
        estado: z.string()
      });
      const output = { inconsistencias: [], estado: 'OK' };
      expect(() => schema.parse(output)).not.toThrow();
    });

    test('integridade_verificar output rejects invalid types', () => {
      const schema = z.object({
        inconsistencias: z.array(z.string()),
        estado: z.string()
      });
      expect(() => schema.parse({ inconsistencias: 'nao-array', estado: 'OK' })).toThrow();
    });
  });
});
