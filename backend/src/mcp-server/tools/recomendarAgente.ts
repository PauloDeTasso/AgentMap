import { mcpServer, toMcpResult, toMcpData, projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { SchemaRecomendarAgente } from '../schemas/validacao';
import { mapearAgente, mapearAgenteRegistro } from '../mapper/mapeadores';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { Tarefa } from '../../tipos';
import * as z from 'zod';

interface AgenteRecomendacao {
  agente: {
    id: string;
    nome: string;
    funcao: string;
    estado: string;
  };
  pontuacao: number;
  motivos: string[];
  atual: boolean;
}

mcpServer.registerTool(
  'agentmap_recomendar_agente',
  {
    description:
      'Recomenda agentes para uma tarefa com base em domínio e conhecimentos. Forneça tarefaId para extrair requisitos automaticamente, ou dominio + conhecimentos manualmente.',
    inputSchema: SchemaRecomendarAgente,
  },
  async (args) => {
    const { tarefaId, dominio, conhecimentos } = args as { tarefaId?: string; dominio?: string; conhecimentos?: string[] };

    const ctx = carregarContexto(projetoService);
    if (!ctx.sucesso || !ctx.dados) {
      return toMcpResult(ctx);
    }

    const { projeto, servicos } = ctx.dados;
    const auditoria = createMcpAuditoria(projeto.auditoria);

    let targetDominio: string = dominio || '';
    let targetConhecimentos: string[] = conhecimentos || [];
    let agenteAtual: string | null = null;

    if (tarefaId) {
      const tarefaResult = servicos.tarefa.obter(tarefaId || '');
      if (!tarefaResult.sucesso || !tarefaResult.dados) {
        const result = tarefaResult;
        auditoria.registrarToolCall('agentmap_recomendar_agente', projeto, { tarefaId }, result);
        return toMcpResult(result);
      }
      const tarefa: Tarefa = tarefaResult.dados;
      targetDominio = tarefa.dominio || dominio || '';
      agenteAtual = tarefa.agenteResponsavel || null;
      if (!targetConhecimentos.length && tarefa.contextoNecessario) {
        targetConhecimentos = tarefa.contextoNecessario;
      }
    }

    if (!targetDominio && !targetConhecimentos.length) {
      return toMcpData({
        sucesso: false,
        codigo: 'MISSING_FIELDS',
        mensagem: 'Forneça tarefaId, ou dominio + conhecimentos',
      });
    }

    const agentesResult = servicos.agente.listar();
    if (!agentesResult.sucesso || !agentesResult.dados) {
      const result = agentesResult;
      auditoria.registrarToolCall('agentmap_recomendar_agente', projeto, { tarefaId, dominio, conhecimentos }, result);
      return toMcpResult(result);
    }

    const recomendacoes: AgenteRecomendacao[] = [];

    for (const registro of agentesResult.dados) {
      const perfilResult = servicos.agente.obter(registro.id);
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

    auditoria.registrarToolCall('agentmap_recomendar_agente', projeto, { tarefaId, dominio, conhecimentos }, { sucesso: true, dados });
    return toMcpData(dados);
  }
);