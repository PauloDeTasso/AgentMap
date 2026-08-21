import { mcpServer, projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { SchemaObterContextoTarefa } from '../schemas/validacao';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import { toMcpStructured, mcpError } from '../utils/helpers';
import * as z from 'zod';

registerTracedTool(mcpServer, 'agentmap_obter_contexto_tarefa', {
  description:
      'Monta o pacote de contexto completo para uma tarefa: identidade do projeto, contratos, dependências, decisões, arquivos relevantes e perfil do agente responsável.',
    inputSchema: SchemaObterContextoTarefa,
  },
  async (args: any) => {
    const tarefaId = String((args && (args as any).id) || '');

    const ctx = carregarContexto(projetoService);
    if (!ctx.sucesso || !ctx.dados) {
      return mcpError(ctx);
    }

    const { projeto, servicos } = ctx.dados;
    const auditoria = createMcpAuditoria(projeto.auditoria);

    const resultado = await servicos.tarefa.montarContexto(tarefaId || '');
    auditoria.registrarToolCall('agentmap_obter_contexto_tarefa', projeto, { id: tarefaId }, resultado);

    if (!resultado.sucesso) return mcpError(resultado);
    return toMcpStructured(resultado.dados);
  }
);