import { mcpServer, toMcpResult, toMcpData, projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { SchemaObterAgente } from '../schemas/validacao';
import { mapearAgente } from '../mapper/mapeadores';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import * as z from 'zod';

registerTracedTool(mcpServer, 'agentmap_obter_agente', {
  description:
      'Obtém o perfil completo de um agente pelo ID, incluindo permissões, conhecimentos, domínios, diretrizes e datas.',
    inputSchema: SchemaObterAgente,
  },
  async (args) => {
    const { id } = args as { id: string };
    const ctx = carregarContexto(projetoService);
    if (!ctx.sucesso || !ctx.dados) {
      return toMcpResult(ctx);
    }

    const { projeto, servicos } = ctx.dados;
    const auditoria = createMcpAuditoria(projeto.auditoria);

    const resultado = await servicos.agente.obter(String(id || ''));
    auditoria.registrarToolCall('agentmap_obter_agente', projeto, { id }, resultado);

    if (!resultado.sucesso || !resultado.dados) {
      return toMcpResult(resultado);
    }

    return toMcpData(mapearAgente(resultado.dados as any));
  }
);