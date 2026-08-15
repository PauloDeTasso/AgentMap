import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import * as z from 'zod';

const agenteRegistroSchema = z.object({
  id: z.string(),
  nome: z.string(),
  funcao: z.string(),
  estado: z.string(),
  arquivoPerfil: z.string()
});

const agentePerfilSchema = z.object({
  id: z.string(),
  nome: z.string(),
  funcao: z.string(),
  descricao: z.string(),
  estado: z.string(),
  responsabilidades: z.array(z.string()).optional(),
  objetivos: z.array(z.string()).optional(),
  conhecimentos: z.array(z.string()).optional(),
  dominios: z.array(z.string()).optional(),
  diretoriosPermitidos: z.array(z.string()),
  diretoriosProibidos: z.array(z.string()),
  contratosObrigatorios: z.array(z.string()),
  procedimentosObrigatorios: z.array(z.string()).optional(),
  permissoes: z.object({
    ler: z.boolean(),
    criar: z.boolean(),
    alterar: z.boolean(),
    excluir: z.boolean(),
    executar: z.boolean(),
    testar: z.boolean(),
    revisar: z.boolean(),
    aprovar: z.boolean(),
    implantar: z.boolean()
  }),
  ferramentasPermitidas: z.array(z.string()).optional(),
  comandosPermitidos: z.array(z.string()).optional(),
  comandosProibidos: z.array(z.string()).optional(),
  ambientesPermitidos: z.array(z.string()),
  requerAprovacaoPara: z.array(z.string()).optional(),
  condicoesDeParada: z.array(z.string()).optional(),
  criteriosDeQualidade: z.array(z.string()).optional(),
  criteriosDeConclusao: z.array(z.string()).optional(),
  protocoloDeEntrega: z.object({
    exigeResumo: z.boolean(),
    exigeArquivosAlterados: z.boolean(),
    exigeTestes: z.boolean(),
    exigeRiscos: z.boolean(),
    exigePendencias: z.boolean()
  }).optional(),
  linguagemPreferida: z.string().optional(),
  modelo: z.object({
    provedor: z.string(),
    nome: z.string(),
    modo: z.string(),
    limiteContexto: z.number()
  }).optional(),
  datas: z.object({
    criacao: z.string().nullable(),
    ultimaAtualizacao: z.string().nullable()
  })
}).passthrough();

mcpServer.registerTool('agentmap_agentes_listar', {
  title: 'Listar Agentes',
  description: 'Lista todos os agentes do projeto aberto.',
  inputSchema: z.object({}),
  annotations: {
    readOnlyHint: true
  }
}, async () => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.agente.listar();
  auditoria.registrarToolCall('agentmap_agentes_listar', projeto, {}, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

mcpServer.registerTool('agentmap_agentes_obter', {
  title: 'Obter Agente',
  description: 'Obtém um agente pelo ID, incluindo perfil e registro.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: agentePerfilSchema.and(agenteRegistroSchema),
  annotations: {
    readOnlyHint: true
  }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.agente.obter(String(id || ''));
  auditoria.registrarToolCall('agentmap_agentes_obter', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

mcpServer.registerTool('agentmap_agentes_criar', {
  title: 'Criar Agente',
  description: 'Cria um novo agente no projeto.',
  inputSchema: z.object({ dados: z.record(z.string(), z.unknown()) }),
  outputSchema: agentePerfilSchema
}, async ({ dados }: { dados: Record<string, unknown> }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.agente.criar(dados as any);
  auditoria.registrarToolCall('agentmap_agentes_criar', projeto, { dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

mcpServer.registerTool('agentmap_agentes_atualizar', {
  title: 'Atualizar Agente',
  description: 'Atualiza um agente existente.',
  inputSchema: z.object({ id: z.string() }).passthrough(),
  outputSchema: agentePerfilSchema,
  annotations: {
    idempotentHint: true
  }
}, async ({ id, ...dados }: { id: string } & Record<string, unknown>) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = ctx.dados!.servicos.agente.atualizar(String(id || ''), dados);
  auditoria.registrarToolCall('agentmap_agentes_atualizar', projeto, { id, ...dados }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});

mcpServer.registerTool('agentmap_agentes_excluir', {
  title: 'Excluir Agente',
  description: 'Exclui um agente do projeto.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.boolean(),
  annotations: {
    destructiveHint: true
  }
}, async ({ id }: { id: string }) => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);
  const resultado = await ctx.dados!.servicos.agente.excluir(String(id || ''));
  auditoria.registrarToolCall('agentmap_agentes_excluir', projeto, { id }, resultado);
  if (!resultado.sucesso) return mcpError(resultado);
  return toMcpStructured(resultado.dados);
});
