import { mcpServer, toMcpResult, toMcpData, projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { SchemaObterContextoProjeto } from '../schemas/validacao';
import { mapearProjeto, mapearAgenteRegistro } from '../mapper/mapeadores';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { registerTracedTool } from '../../observability/tool-tracing';
import { PathValidator, createPathValidator, DEFAULT_PATH_VALIDATOR_OPTIONS } from '../security/pathValidator';
import * as z from 'zod';
import * as path from 'path';

registerTracedTool(mcpServer, 'agentmap_obter_contexto_projeto', {
  description:
      'Retorna o contexto completo do projeto aberto: configuração, tecnologias, agentes, contratos, decisões, estado atual e resumo de tarefas.',
    inputSchema: SchemaObterContextoProjeto,
  },
  async () => {
    const ctx = carregarContexto(projetoService);
    if (!ctx.sucesso || !ctx.dados) {
      return toMcpResult(ctx);
    }

    const { projeto, servicos } = ctx.dados;
    const auditoria = createMcpAuditoria(projeto.auditoria);
    const pathValidator = createPathValidator(projeto.caminhoRaiz, DEFAULT_PATH_VALIDATOR_OPTIONS);

    const agentesResult = servicos.agente.listar();
    const contratosPath = path.posix.join('.ia', 'contratos', 'contratos.json');
    const decisoesPath = path.posix.join('.ia', 'decisoes', 'decisoes.json');
    const estadoPath = path.posix.join('.ia', 'estado', 'estado-atual.json');
    const conhecimentoPath = path.posix.join('.ia', 'conhecimento', 'conhecimento.json');
    const contratosValidated = pathValidator.validate(contratosPath);
    const decisoesValidated = pathValidator.validate(decisoesPath);
    const estadoValidated = pathValidator.validate(estadoPath);
    const conhecimentoValidated = pathValidator.validate(conhecimentoPath);
    const contratosResult = projeto.fileService.lerJson<{ contratos: unknown[] }>(contratosValidated.caminhoRelativo);
    const decisoesResult = projeto.fileService.lerJson<{ decisoes: unknown[] }>(decisoesValidated.caminhoRelativo);
    const estadoResult = projeto.fileService.lerJson<unknown>(estadoValidated.caminhoRelativo);
    const conhecimentoResult = projeto.fileService.lerJson<{ conhecimento: unknown[] }>(conhecimentoValidated.caminhoRelativo);
    const tarefasResult = servicos.tarefa.listar();

    const agentes = agentesResult.sucesso && agentesResult.dados
      ? agentesResult.dados.map(mapearAgenteRegistro)
      : [];

    const contratos = contratosResult.sucesso && contratosResult.dados
      ? contratosResult.dados.contratos
      : [];

    const decisoesRecentes = decisoesResult.sucesso && decisoesResult.dados
      ? decisoesResult.dados.decisoes.slice(0, 10)
      : [];

    const estado = estadoResult.sucesso && estadoResult.dados ? estadoResult.dados : null;

    const conhecimentoCount = conhecimentoResult.sucesso && conhecimentoResult.dados
      ? conhecimentoResult.dados.conhecimento.length
      : 0;

    const tarefas = tarefasResult.sucesso && tarefasResult.dados
      ? tarefasResult.dados
      : [];

    const tarefasResumo = {
      total: tarefas.length,
      porEstado: tarefas.reduce(
        (acc: Record<string, number>, t) => {
          acc[t.estado] = (acc[t.estado] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };

    const dados = {
      projeto: mapearProjeto(projeto),
      agentes,
      contratos,
      decisoesRecentes,
      estado,
      resumoConhecimento: { totalItens: conhecimentoCount },
      resumoTarefas: tarefasResumo,
      kilo: await servicos.kiloDiscovery.obterEstadoKilo()
    };

    auditoria.registrarToolCall('agentmap_obter_contexto_projeto', projeto, {}, { sucesso: true, dados });
    return toMcpData(dados);
  }
);