import { Router, Request, Response } from 'express';
import * as path from 'path';
import { ProjetoService } from '../servicios/ProjetoService';
import { MonitoramentoService } from '../servicios/MonitoramentoService';
import { TempCleanupService } from '../servicios/TempCleanupService';
import { projectMiddleware, asyncHandler, responder } from './middleware';
import { criarProjetoRouter } from './projetos';
import { criarAgenteRouter } from './agentes';
import { criarTarefaRouter } from './tarefas';
import { criarArquivoRouter } from './arquivos';
import { criarContratoRouter } from './contratos';
import { criarContratosValidacaoRouter } from './contratos-validacao';
import { criarSolicitacaoRouter } from './solicitacoes';
import { criarCriterioRouter } from './criterios';
import { criarResultadoRouter } from './resultados';
import { criarArtefatoRouter } from './artefatos';
import { criarHandoffRouter } from './handoffs';
import { criarPendenciaRouter } from './pendencias';
import { criarValidacaoRouter } from './validacoes';
import { criarConflitoRouter } from './conflitos';
import { criarReservaRouter } from './reservas';
import { criarSessaoRouter } from './sessoes';
import { criarCheckpointRouter } from './checkpoints';
import { criarAprendizadoRouter } from './aprendizados';
import { criarDependenciaRouter } from './dependencias';
import { criarResponsabilidadeRouter } from './responsabilidades';
import { criarDecisaoRouter } from './decisoes';
import { criarRiscoRouter } from './riscos';
import { criarBloqueioRouter } from './bloqueios';
import { criarEventoRouter } from './eventos';
import { criarContatoRouter } from './contatos';
import { criarAdminRouter } from './admin';
import { criarHealthRouter } from './health';
import { criarHandoffsCentraisRouter } from './handoffs-centrais';
import { criarMonitoramentoRouter } from './monitoramento';
import { criarGerenciadorAgentesRouter } from './gerenciador-agentes';
import { criarInstanciaRouter } from './instancias';
import { criarOrquestradorRouter } from './orquestrador';
import { criarObservabilidadeRouter } from './observabilidade';
import { criarTempRouter } from './temp';
import { GERENCIADOR_DIR } from '../config';

export function setupRotas(projetoService: ProjetoService, monitoramento: MonitoramentoService, cleanupService: TempCleanupService): Router {
  const router = Router();

  router.get('/api/status', (_req: Request, res: Response) => {
    res.status(200).json({ sucesso: true, dados: { status: 'online', versao: '1.0.0', gerenciadorDir: GERENCIADOR_DIR } });
  });

  router.use('/api/monitoramento', criarMonitoramentoRouter(monitoramento));

  router.use('/api/temp', criarTempRouter(cleanupService));

  router.use('/api/projetos', criarProjetoRouter(projetoService));

  router.use('/api/observabilidade', criarObservabilidadeRouter());

  router.use('/api/*', projectMiddleware(projetoService));

  router.use('/api/gerenciador-agentes', criarGerenciadorAgentesRouter());

  router.get('/api/estado', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.projeto.fileService.lerJson(
      path.win32.join('.ia', 'estado', 'estado-atual.json')
    ));
  }));

  router.get('/api/auditoria', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, { sucesso: true, dados: req.servicos!.auditoria.listar(200) });
  }));

  router.post('/api/auditoria', asyncHandler(async (req: Request, res: Response) => {
    const dados = req.body || {};
    if (!dados.descricao) {
      return responder(res, { sucesso: false, erro: 'Descrição é obrigatória', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const evento = req.servicos!.auditoria.criar(dados);
    return responder(res, { sucesso: true, dados: evento }, 201);
  }));

  router.put('/api/auditoria/:id', asyncHandler(async (req: Request, res: Response) => {
    const resultado = req.servicos!.auditoria.atualizar(req.params.id, req.body || {});
    if (!resultado) {
      return responder(res, { sucesso: false, erro: 'Evento de auditoria não encontrado', codigoErro: 'NOT_FOUND' }, 404);
    }
    return responder(res, { sucesso: true, dados: resultado });
  }));

  router.delete('/api/auditoria/:id', asyncHandler(async (req: Request, res: Response) => {
    const excluido = req.servicos!.auditoria.excluir(req.params.id);
    if (!excluido) {
      return responder(res, { sucesso: false, erro: 'Evento de auditoria não encontrado', codigoErro: 'NOT_FOUND' }, 404);
    }
    return responder(res, { sucesso: true, dados: true });
  }));

  router.delete('/api/auditoria', asyncHandler(async (req: Request, res: Response) => {
    const total = req.servicos!.auditoria.limpar();
    return responder(res, { sucesso: true, dados: total });
  }));

  router.use('/api/agentes', criarAgenteRouter());
  router.use('/api/tarefas', criarTarefaRouter());
  router.use('/api/arquivos', criarArquivoRouter());
  router.use('/api/contratos', criarContratosValidacaoRouter());
  router.use('/api/contratos', criarContratoRouter());
  router.use('/api/solicitacoes', criarSolicitacaoRouter());
  router.use('/api/criterios', criarCriterioRouter());
  router.use('/api/resultados', criarResultadoRouter());
  router.use('/api/artefatos', criarArtefatoRouter());
  router.use('/api/handoffs', criarHandoffRouter());
  router.use('/api/pendencias', criarPendenciaRouter());
  router.use('/api/validacoes', criarValidacaoRouter());
  router.use('/api/conflitos', criarConflitoRouter());
  router.use('/api/reservas', criarReservaRouter());
  router.use('/api/sessoes', criarSessaoRouter());
  router.use('/api/checkpoints', criarCheckpointRouter());
  router.use('/api/aprendizados', criarAprendizadoRouter());
  router.use('/api/dependencias', criarDependenciaRouter());
  router.use('/api/responsabilidades', criarResponsabilidadeRouter());
  router.use('/api/decisoes', criarDecisaoRouter());
  router.use('/api/riscos', criarRiscoRouter());
  router.use('/api/bloqueios', criarBloqueioRouter());
  router.use('/api/eventos', criarEventoRouter());
  router.use('/api/contatos', criarContatoRouter());
  router.use('/api/admin', criarAdminRouter());
  router.use('/api/health', criarHealthRouter());
  router.use('/api/handoffs-centrais', criarHandoffsCentraisRouter());
  router.use('/api/instancias', criarInstanciaRouter());
  router.use('/api/orquestrador', criarOrquestradorRouter());

  router.get('/api/estado-projeto', asyncHandler(async (req: Request, res: Response) => {
    const result = req.servicos!.integridade.calcularEstadoProjeto(req.servicos!.projeto.id);
    return responder(res, result);
  }));

  router.get('/api/monitor', asyncHandler(async (req: Request, res: Response) => {
    const servicos = req.servicos!;
    const [estadoProjeto, sessoesRes, auditoriaRes, handoffsRes, bloqueiosRes, riscosRes, agentesRes, tarefasRes, mensagensRes] = await Promise.all([
      servicos.integridade.calcularEstadoProjeto(servicos.projeto.id),
      servicos.sessao.listar(),
      servicos.auditoria.listar(20),
      servicos.handoff.listar(),
      servicos.bloqueio.listar(),
      servicos.risco.listar(),
      servicos.agente.listar(),
      servicos.tarefa.listar(),
      Promise.resolve({ sucesso: true, dados: monitoramento.listarMensagens(20) })
    ]);

    const sessoesAtivas = sessoesRes.sucesso && sessoesRes.dados ? sessoesRes.dados.filter((s: any) => !s.datas?.fim) : [];
    const handoffsPendentes = handoffsRes.sucesso && handoffsRes.dados ? handoffsRes.dados.filter((h: any) => h.estado === 'PENDENTE') : [];
    const bloqueiosAtivos = bloqueiosRes.sucesso && bloqueiosRes.dados ? bloqueiosRes.dados.filter((b: any) => b.estado === 'ATIVO') : [];
    const riscosCriticos = riscosRes.sucesso && riscosRes.dados ? riscosRes.dados.filter((r: any) => r.gravidade === 'CRITICA' && r.estado === 'ATIVO') : [];
    const agentesMap = new Map((agentesRes.sucesso && agentesRes.dados ? agentesRes.dados : []).map((a: any) => [a.id, a.nome]));
    const tarefasMap = new Map((tarefasRes.sucesso && tarefasRes.dados ? tarefasRes.dados : []).map((t: any) => [t.id, t.titulo]));

    const monitor = {
      projeto: servicos.projeto.config,
      estado: estadoProjeto.sucesso ? estadoProjeto.dados : null,
      sessoesAtivas: sessoesAtivas.map((s: any) => ({
        id: s.id,
        agenteId: s.agenteId,
        agenteNome: agentesMap.get(s.agenteId) || s.agenteId,
        tarefaId: s.tarefaId,
        tarefaTitulo: tarefasMap.get(s.tarefaId) || s.tarefaId || null,
        inicio: s.datas?.inicio,
        contextoConsultado: s.contextoConsultado
      })),
      eventosRecentes: Array.isArray(auditoriaRes) ? auditoriaRes.slice(0, 20) : [],
      mensagensRecentes: mensagensRes.sucesso && Array.isArray(mensagensRes.dados) ? mensagensRes.dados.slice(0, 20) : [],
      alertas: {
        handoffsPendentes: handoffsPendentes.length,
        bloqueiosAtivos: bloqueiosAtivos.length,
        riscosCriticos: riscosCriticos.length,
        detalhes: {
          handoffs: handoffsPendentes.slice(0, 5).map((h: any) => ({ id: h.id, origem: h.origem, destino: h.destino, tarefaId: h.tarefaId, resumo: h.resumo })),
          bloqueios: bloqueiosAtivos.slice(0, 5).map((b: any) => ({ id: b.id, tarefaId: b.tarefaId, tipo: b.tipo, gravidade: b.gravidade, descricao: b.descricao })),
          riscos: riscosCriticos.slice(0, 5).map((r: any) => ({ id: r.id, titulo: r.titulo, gravidade: r.gravidade, descricao: r.descricao }))
        }
      },
      timestamp: new Date().toISOString()
    };

    return responder(res, { sucesso: true, dados: monitor });
  }));

  router.get('/api/integridade', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.integridade.verificar(req.servicos!.projeto.id);
    return responder(res, result);
  }));

  return router;
}
