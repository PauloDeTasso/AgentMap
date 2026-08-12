import * as z from 'zod';

export const SchemaObterContextoProjeto = z.object({
  projetoId: z.string().optional(),
});

export const SchemaObterArquitetura = z.object({
  projetoId: z.string().optional(),
});

export const SchemaObterAgente = z.object({
  id: z.string(),
});

export const SchemaRecomendarAgente = z.object({
  tarefaId: z.string(),
  criterios: z.record(z.string(), z.unknown()).optional(),
});

export const SchemaLerTrechoArquivo = z.object({
  caminho: z.string(),
  linhaInicio: z.number().int().positive().optional(),
  linhaFim: z.number().int().positive().optional(),
  limite: z.number().int().positive().optional(),
});

export const SchemaBuscarSimbolo = z.object({
  simbolo: z.string().min(1),
  tipo: z.enum(['funcao', 'classe', 'variavel', 'constante', 'interface', 'todos']).optional(),
  diretorio: z.string().optional(),
  limite: z.number().int().positive().optional(),
});

export const SchemaBuscarReferencias = z.object({
  simbolo: z.string().min(2),
  diretorio: z.string().optional(),
  limite: z.number().int().positive().optional(),
});

export const SchemaBuscarConhecimento = z.object({
  termo: z.string().min(2),
  limite: z.number().int().positive().optional(),
  incluirProjetos: z.boolean().optional(),
});

export const SchemaObterContextoTarefa = z.object({
  id: z.string(),
});

export const SchemaContatoCriar = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  telefone: z.string().min(8),
});

export const SchemaContatoAtualizar = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  telefone: z.string().min(8).optional(),
});

export const SchemaContatoObter = z.object({
  id: z.string(),
});

export const SchemaContatoExcluir = z.object({
  id: z.string(),
});
