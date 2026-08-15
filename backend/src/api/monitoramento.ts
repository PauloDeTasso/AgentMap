import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';

export function criarMonitoramentoRouter(): Router {
  const router = Router();

  router.get('/mensagens', asyncHandler(async (req: Request, res: Response) => {
    const monitoramento = (req as any).servicos?.monitoramento;
    if (!monitoramento) {
      return responder(res, { sucesso: false, erro: 'MonitoramentoService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    const limite = req.query.limite ? Number(req.query.limite) : 100;
    const agenteId = req.query.agenteId as string | undefined;
    const tipo = req.query.tipo as string | undefined;

    let msgs = monitoramento.listarMensagens(limite);
    if (agenteId) {
      msgs = msgs.filter((m: any) => m.agenteId === agenteId || m.emissor === agenteId);
    }
    if (tipo) {
      msgs = msgs.filter((m: any) => m.tipo === tipo);
    }

    return responder(res, { sucesso: true, dados: msgs });
  }));

  router.post('/mensagens', asyncHandler(async (req: Request, res: Response) => {
    const monitoramento = (req as any).servicos?.monitoramento;
    if (!monitoramento) {
      return responder(res, { sucesso: false, erro: 'MonitoramentoService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    const { tipo, emissor, agenteId, tarefaId, conteudo, dados, acoes } = req.body;
    if (!tipo || !emissor || !conteudo) {
      return responder(res, { sucesso: false, erro: 'tipo, emissor e conteudo são obrigatórios', codigoErro: 'MISSING_FIELDS' }, 400);
    }

    const msg = {
      id: `MSG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      tipo,
      emissor,
      agenteId,
      tarefaId,
      conteudo,
      dados,
      acoes
    };

    const result = monitoramento.adicionarMensagem(msg);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.get('/agentes', asyncHandler(async (req: Request, res: Response) => {
    const monitoramento = (req as any).servicos?.monitoramento;
    if (!monitoramento) {
      return responder(res, { sucesso: false, erro: 'MonitoramentoService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    const agentes = monitoramento.listarAgentes();
    return responder(res, { sucesso: true, dados: agentes });
  }));

  router.get('/modo', asyncHandler(async (req: Request, res: Response) => {
    const monitoramento = (req as any).servicos?.monitoramento;
    if (!monitoramento) {
      return responder(res, { sucesso: false, erro: 'MonitoramentoService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    return responder(res, { sucesso: true, dados: monitoramento.obterModo() });
  }));

  router.post('/modo', asyncHandler(async (req: Request, res: Response) => {
    const monitoramento = (req as any).servicos?.monitoramento;
    if (!monitoramento) {
      return responder(res, { sucesso: false, erro: 'MonitoramentoService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    const { modo, escopo, agenteId } = req.body;
    if (!modo || !escopo) {
      return responder(res, { sucesso: false, erro: 'modo e escopo são obrigatórios', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = monitoramento.alterarModo(modo, escopo, agenteId);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.post('/intervir', asyncHandler(async (req: Request, res: Response) => {
    const monitoramento = (req as any).servicos?.monitoramento;
    if (!monitoramento) {
      return responder(res, { sucesso: false, erro: 'MonitoramentoService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    const { comando, payload } = req.body;
    if (!comando) {
      return responder(res, { sucesso: false, erro: 'comando é obrigatório', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = await monitoramento.executarIntervencao(comando, payload || {});
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.put('/agente/:agenteId/status', asyncHandler(async (req: Request, res: Response) => {
    const monitoramento = (req as any).servicos?.monitoramento;
    if (!monitoramento) {
      return responder(res, { sucesso: false, erro: 'MonitoramentoService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    const { agenteId } = req.params;
    const { status, ...dados } = req.body;
    if (!status) {
      return responder(res, { sucesso: false, erro: 'status é obrigatório', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = monitoramento.atualizarStatusAgente(agenteId, status, dados);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.get('/dispatcher/pendentes', asyncHandler(async (req: Request, res: Response) => {
    const monitoramento = (req as any).servicos?.monitoramento;
    if (!monitoramento) {
      return responder(res, { sucesso: false, erro: 'MonitoramentoService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    const agenteId = req.query.agenteId as string | undefined;
    const dados = monitoramento.listarPendentesDispatcher(agenteId);
    return responder(res, { sucesso: true, dados });
  }));

  router.post('/dispatcher/executar', asyncHandler(async (req: Request, res: Response) => {
    const monitoramento = (req as any).servicos?.monitoramento;
    if (!monitoramento) {
      return responder(res, { sucesso: false, erro: 'MonitoramentoService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    const { agenteId } = req.body;
    if (!agenteId) {
      return responder(res, { sucesso: false, erro: 'agenteId é obrigatório', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = await monitoramento.executarPendenteDispatcher(agenteId);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.get('/dispatcher/logs', asyncHandler(async (req: Request, res: Response) => {
    const monitoramento = (req as any).servicos?.monitoramento;
    if (!monitoramento) {
      return responder(res, { sucesso: false, erro: 'MonitoramentoService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    const limite = req.query.limite ? Number(req.query.limite) : 100;
    const dados = monitoramento.listarLogsDispatcher(limite);
    return responder(res, { sucesso: true, dados });
  }));

  return router;
}
