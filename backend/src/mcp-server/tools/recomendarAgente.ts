import { mcpServer } from '../server';
import { toMcpStructured, mcpError } from '../utils/helpers';
import { projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import { Tarefa } from '../../tipos';
import * as z from 'zod';

const recomendacaoSchema = z.object({
  agente: z.object({
    id: z.string(),
    nome: z.string(),
    funcao: z.string(),
    estado: z.string()
  }),
  pontuacao: z.number(),
  motivos: z.array(z.string()),
  atual: z.boolean()
});

const recomendacaoResultadoSchema = z.object({
  dominio: z.string(),
  conhecimentos: z.array(z.string()),
  agenteAtual: z.string().nullable(),
  recomendacoes: z.array(recomendacaoSchema)
});

registerTracedTool(mcpServer, 'agentmap_recomendar_agente', {
  title: 'Recomendar Agente',
  description: 'Recomenda agentes para uma tarefa com base em domínio e conhecimentos. Forneça tarefaId para extrair requisitos automaticamente, ou dominio + conhecimentos manualmente.',
  inputSchema: z.object({
    tarefaId: z.string().optional(),
    criterios: z.record(z.string(), z.unknown()).optional()
  }),
  outputSchema: recomendacaoResultadoSchema,
  annotations: {
    readOnlyHint: true
  }
}, async ({ tarefaId, criterios }: { tarefaId?: string; criterios?: Record<string, unknown> }): Promise<any> => {
  const ctx = carregarContexto(projetoService);
  if (!ctx.sucesso) return mcpError(ctx);
  const { projeto, servicos } = ctx.dados!;
  const auditoria = createMcpAuditoria(projeto.auditoria);

  let targetDominio: string = '';
  let targetConhecimentos: string[] = [];
  let agenteAtual: string | null = null;

  if (tarefaId) {
    const tarefaResult = servicos.tarefa.obter(tarefaId || '');
    if (!tarefaResult.sucesso || !tarefaResult.dados) {
      auditoria.registrarToolCall('agentmap_recomendar_agente', projeto, { tarefaId, criterios }, tarefaResult);
      return mcpError(tarefaResult);
    }
    const tarefa: Tarefa = tarefaResult.dados;
    targetDominio = tarefa.dominio || '';
    agenteAtual = tarefa.agenteResponsavel || null;
    if (!targetConhecimentos.length && tarefa.contextoNecessario) {
      targetConhecimentos = tarefa.contextoNecessario;
    }
  }

  if (criterios && typeof criterios === 'object') {
    const dominioCriterio = (criterios as any).dominio;
    const conhecimentosCriterio = (criterios as any).conhecimentos;
    if (typeof dominioCriterio === 'string') {
      targetDominio = dominioCriterio;
    }
    if (Array.isArray(conhecimentosCriterio)) {
      targetConhecimentos = conhecimentosCriterio.map((item: any) => String(item));
    }
  }

  if (!targetDominio && !targetConhecimentos.length) {
    return mcpError({
      sucesso: false,
      codigoErro: 'MISSING_FIELDS',
      erro: 'Forneça tarefaId, ou criterios com dominio/conhecimentos',
      dados: null
    });
  }

  const agentesResult = ctx.dados!.servicos.agente.listar();
  if (!agentesResult.sucesso || !agentesResult.dados) {
    auditoria.registrarToolCall('agentmap_recomendar_agente', projeto, { tarefaId, criterios }, agentesResult);
    return mcpError(agentesResult);
  }

  const recomendacoes: any[] = [];

  for (const registro of agentesResult.dados) {
    const perfilResult = ctx.dados!.servicos.agente.obter(registro.id);
    if (!perfilResult.sucesso || !perfilResult.dados) continue;
    const perfil = perfilResult.dados;

    let pontuacao = 0;
    const motivos: string[] = [];

    if (targetDominio) {
      const dominioLower = targetDominio.toLowerCase();
      const funcaoLower = perfil.funcao.toLowerCase();
      if (funcaoLower.includes(dominioLower)) {
        pontuacao += 50;
        motivos.push(`Função '${perfil.funcao}' contém o domínio '${targetDominio}'`);
      }
      const conhecimentosLower = (perfil.conhecimentos || []).map((c: string) => c.toLowerCase());
      if (conhecimentosLower.some((c: string) => c.includes(dominioLower))) {
        pontuacao += 15;
        motivos.push(`Conhecimentos contêm referência ao domínio '${targetDominio}'`);
      }
    }

    if (targetConhecimentos && targetConhecimentos.length > 0) {
      const agenteConhecimentos = (perfil.conhecimentos || []).map((c: string) => c.toLowerCase());
      let matchCount = 0;
      for (const conhecimento of targetConhecimentos) {
        const k = conhecimento.toLowerCase();
        if (agenteConhecimentos.some((ac: string) => ac === k || ac.includes(k))) {
          matchCount++;
        }
      }
      pontuacao += matchCount * 10;
      if (matchCount > 0) {
        motivos.push(`${matchCount} conhecimento(s) correspondente(s)`);
      }
    }

    if (perfil.estado === 'disponivel') {
      pontuacao += 5;
      motivos.push('Agente disponível');
    }

    if (agenteAtual === perfil.id) {
      pontuacao += 20;
      motivos.push('Agente atualmente responsável pela tarefa');
    }

    recomendacoes.push({
      agente: {
        id: perfil.id,
        nome: perfil.nome,
        funcao: perfil.funcao,
        estado: perfil.estado,
      },
      pontuacao,
      motivos,
      atual: agenteAtual === perfil.id,
    });
  }

  recomendacoes.sort((a, b) => b.pontuacao - a.pontuacao);

  const dados = {
    dominio: targetDominio,
    conhecimentos: targetConhecimentos,
    agenteAtual: agenteAtual,
    recomendacoes: recomendacoes.filter((r) => r.pontuacao > 0).slice(0, 5),
  };

  auditoria.registrarToolCall('agentmap_recomendar_agente', projeto, { tarefaId, criterios }, { sucesso: true, dados });
  return toMcpStructured(dados);
});
