import { mcpServer, toMcpResult, toMcpData, projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { SchemaObterContextoTarefa } from '../schemas/validacao';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import * as z from 'zod';

mcpServer.registerTool(
  'agentmap_obter_contexto_tarefa',
  {
    description:
      'Monta o pacote de contexto completo para uma tarefa: identidade do projeto, contratos, dependências, decisões, arquivos relevantes e perfil do agente responsável.',
    inputSchema: SchemaObterContextoTarefa,
  },
  async (args) => {
    const { tarefaId } = args as { tarefaId: string };

    const ctx = carregarContexto(projetoService);
    if (!ctx.sucesso || !ctx.dados) {
      return toMcpResult(ctx);
    }

    const { projeto, servicos } = ctx.dados;
    const auditoria = createMcpAuditoria(projeto.auditoria);

    const resultado = await servicos.tarefa.montarContexto(tarefaId || '');
    auditoria.registrarToolCall('agentmap_obter_contexto_tarefa', projeto, { tarefaId }, resultado);

    return toMcpResult(resultado);
  }
);