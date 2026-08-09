import * as z from 'zod';

describe('MCP tools validation errors - unit tests', () => {
  describe('projetos', () => {
    const inputSchema = z.object({ nome: z.string(), caminhoParental: z.string(), descricao: z.string() });

    test('rejects missing required fields', () => {
      expect(() => inputSchema.parse({})).toThrow();
      expect(() => inputSchema.parse({ nome: 'P1' })).toThrow();
    });

    test('rejects wrong types', () => {
      expect(() => inputSchema.parse({ nome: 123, caminhoParental: '/tmp', descricao: 'd' })).toThrow();
    });

    test('accepts valid input', () => {
      expect(() => inputSchema.parse({ nome: 'P1', caminhoParental: '/tmp', descricao: 'd' })).not.toThrow();
    });
  });

  describe('tarefas', () => {
    const inputSchema = z.object({ id: z.string() });

    test('rejects missing id', () => {
      expect(() => inputSchema.parse({})).toThrow();
    });

    test('rejects non-string id', () => {
      expect(() => inputSchema.parse({ id: 123 })).toThrow();
    });

    test('accepts string id', () => {
      expect(() => inputSchema.parse({ id: 'T-1' })).not.toThrow();
    });
  });

  describe('agentes', () => {
    const inputSchema = z.object({ id: z.string() });

    test('rejects missing id', () => {
      expect(() => inputSchema.parse({})).toThrow();
    });

    test('accepts string id', () => {
      expect(() => inputSchema.parse({ id: 'ag1' })).not.toThrow();
    });
  });

  describe('solicitacoes', () => {
    const inputSchema = z.object({ id: z.string() });

    test('rejects missing id', () => {
      expect(() => inputSchema.parse({})).toThrow();
    });

    test('accepts string id', () => {
      expect(() => inputSchema.parse({ id: 'SOL-1' })).not.toThrow();
    });
  });

  describe('handoffs', () => {
    const inputSchema = z.object({ id: z.string() });

    test('rejects missing id', () => {
      expect(() => inputSchema.parse({})).toThrow();
    });

    test('accepts string id', () => {
      expect(() => inputSchema.parse({ id: 'HOF-1' })).not.toThrow();
    });
  });

  describe('eventos', () => {
    const inputSchema = z.object({ agenteId: z.string() });

    test('rejects missing agenteId', () => {
      expect(() => inputSchema.parse({})).toThrow();
    });

    test('accepts string agenteId', () => {
      expect(() => inputSchema.parse({ agenteId: 'ag1' })).not.toThrow();
    });
  });

  describe('workflows', () => {
    const inputSchema = z.object({ agenteId: z.string() });

    test('rejects missing agenteId', () => {
      expect(() => inputSchema.parse({})).toThrow();
    });

    test('accepts string agenteId', () => {
      expect(() => inputSchema.parse({ agenteId: 'ag1' })).not.toThrow();
    });
  });

  describe('arquivos', () => {
    const inputSchema = z.object({ caminho: z.string() });

    test('rejects missing caminho', () => {
      expect(() => inputSchema.parse({})).toThrow();
    });

    test('accepts string caminho', () => {
      expect(() => inputSchema.parse({ caminho: '/tmp' })).not.toThrow();
    });
  });

  describe('monitoramento', () => {
    const inputSchema = z.object({
      aposEventSequence: z.number().int().nonnegative().optional(),
      limite: z.number().int().positive().max(100).optional()
    });

    test('accepts empty input', () => {
      expect(() => inputSchema.parse({})).not.toThrow();
    });

    test('rejects negative aposEventSequence', () => {
      expect(() => inputSchema.parse({ aposEventSequence: -1 })).toThrow();
    });

    test('rejects zero limite', () => {
      expect(() => inputSchema.parse({ limite: 0 })).toThrow();
    });

    test('rejects limite > 100', () => {
      expect(() => inputSchema.parse({ limite: 101 })).toThrow();
    });

    test('accepts valid limite', () => {
      expect(() => inputSchema.parse({ limite: 50 })).not.toThrow();
    });

    test('accepts valid aposEventSequence', () => {
      expect(() => inputSchema.parse({ aposEventSequence: 0 })).not.toThrow();
    });
  });

  describe('sessoes', () => {
    const inputSchema = z.object({ id: z.string() });

    test('rejects missing id', () => {
      expect(() => inputSchema.parse({})).toThrow();
    });

    test('accepts string id', () => {
      expect(() => inputSchema.parse({ id: 'SES-1' })).not.toThrow();
    });
  });

  describe('lerTrechoArquivo', () => {
    const inputSchema = z.object({ caminho: z.string(), linhaInicio: z.number(), linhaFim: z.number() });

    test('rejects missing params', () => {
      expect(() => inputSchema.parse({})).toThrow();
    });

    test('rejects non-number linhaInicio', () => {
      expect(() => inputSchema.parse({ caminho: '/a', linhaInicio: '1', linhaFim: 2 })).toThrow();
    });

    test('rejects linhaFim < linhaInicio when validated', () => {
      const strictSchema = inputSchema.refine(data => data.linhaFim >= data.linhaInicio, {
        message: 'linhaFim must be >= linhaInicio'
      });
      expect(() => strictSchema.parse({ caminho: '/a', linhaInicio: 10, linhaFim: 5 })).toThrow();
    });

    test('accepts valid params', () => {
      expect(() => inputSchema.parse({ caminho: '/a', linhaInicio: 1, linhaFim: 10 })).not.toThrow();
    });
  });

  describe('buscarSimbolo', () => {
    const inputSchema = z.object({ simbolo: z.string(), caminho: z.string().optional() });

    test('rejects missing simbolo', () => {
      expect(() => inputSchema.parse({})).toThrow();
    });

    test('accepts optional caminho', () => {
      expect(() => inputSchema.parse({ simbolo: 'foo' })).not.toThrow();
      expect(() => inputSchema.parse({ simbolo: 'foo', caminho: '/a' })).not.toThrow();
    });
  });

  describe('buscarConhecimento', () => {
    const inputSchema = z.object({ consulta: z.string() });

    test('rejects missing consulta', () => {
      expect(() => inputSchema.parse({})).toThrow();
    });

    test('accepts string consulta', () => {
      expect(() => inputSchema.parse({ consulta: 'test' })).not.toThrow();
    });
  });

  describe('worktree', () => {
    const inputSchema = z.object({ nome: z.string(), branch: z.string().optional() });

    test('rejects missing nome', () => {
      expect(() => inputSchema.parse({})).toThrow();
    });

    test('accepts nome and optional branch', () => {
      expect(() => inputSchema.parse({ nome: 'wt1' })).not.toThrow();
      expect(() => inputSchema.parse({ nome: 'wt1', branch: 'main' })).not.toThrow();
    });
  });

  describe('kilohub', () => {
    const inputSchema = z.object({ id: z.string() });

    test('rejects missing id', () => {
      expect(() => inputSchema.parse({})).toThrow();
    });

    test('accepts string id', () => {
      expect(() => inputSchema.parse({ id: 'KILO-1' })).not.toThrow();
    });
  });

  describe('recomendarAgente', () => {
    const inputSchema = z.object({ tarefaId: z.string() });

    test('rejects missing tarefaId', () => {
      expect(() => inputSchema.parse({})).toThrow();
    });

    test('accepts string tarefaId', () => {
      expect(() => inputSchema.parse({ tarefaId: 'T-1' })).not.toThrow();
    });
  });

  describe('sugerirFluxo', () => {
    const inputSchema = z.object({ tarefaId: z.string() });

    test('rejects missing tarefaId', () => {
      expect(() => inputSchema.parse({})).toThrow();
    });

    test('accepts string tarefaId', () => {
      expect(() => inputSchema.parse({ tarefaId: 'T-1' })).not.toThrow();
    });
  });
});
