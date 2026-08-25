import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { MonitoramentoService } from '../servicios/MonitoramentoService';

export function criarMonitoramentoRouter(monitoramento: MonitoramentoService): Router {
  const router = Router();

  router.get('/mensagens', asyncHandler(async (req: Request, res: Response) => {
    let limite = req.query.limite ? Number(req.query.limite) : 100;
    if (!Number.isFinite(limite) || limite <= 0) limite = 100;
    if (limite > 500) limite = 500;

    let after = req.query.after ? Number(req.query.after) : 0;
    if (!Number.isFinite(after) || after < 0) after = 0;

    const agenteId = typeof req.query.agenteId === 'string' ? req.query.agenteId.trim() : undefined;
    const tipo = typeof req.query.tipo === 'string' ? req.query.tipo.trim() : undefined;

    let msgs: any[];
    if (after > 0) {
      const result = monitoramento.listarMensagensApos(after, limite);
      msgs = result.mensagens;
    } else {
      msgs = monitoramento.listarMensagens(limite);
    }

    if (agenteId) {
      msgs = msgs.filter((m: any) => m.agenteId === agenteId || m.emissor === agenteId);
    }
    if (tipo) {
      msgs = msgs.filter((m: any) => m.tipo === tipo);
    }

    return responder(res, { sucesso: true, dados: msgs });
  }));

  router.post('/mensagens', asyncHandler(async (req: Request, res: Response) => {
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

    if (tipo === 'KILO_CHAT' || tipo === 'KILO_REPLY' || tipo === 'KILO_RESULT' || tipo === 'KILO_CHAT_REPLY') {
      console.log(`[KILO][HTTP_IN] tipo=${tipo} agenteId=${agenteId || emissor} tarefaId=${tarefaId}`);
    }

    const result = await monitoramento.adicionarMensagem(msg);
    if (!result.sucesso) {
      if (tipo === 'KILO_CHAT' || tipo === 'KILO_REPLY' || tipo === 'KILO_RESULT' || tipo === 'KILO_CHAT_REPLY') {
        console.error(`[KILO][HTTP_FAIL] tipo=${tipo} erro=${result.erro}`);
      }
      return responder(res, result, result.sucesso ? 201 : 400);
    }

    if (tipo === 'KILO_CHAT' || tipo === 'KILO_REPLY' || tipo === 'KILO_RESULT' || tipo === 'KILO_CHAT_REPLY') {
      console.log(`[KILO][HTTP_OK] id=${msg.id} tipo=${tipo}`);
    }

    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.get('/agentes', asyncHandler(async (req: Request, res: Response) => {
    const agentes = monitoramento.listarAgentes();
    return responder(res, { sucesso: true, dados: agentes });
  }));

  router.get('/modo', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, { sucesso: true, dados: monitoramento.obterModo() });
  }));

  router.post('/modo', asyncHandler(async (req: Request, res: Response) => {
    const { modo, escopo, agenteId } = req.body;
    if (!modo || !escopo) {
      return responder(res, { sucesso: false, erro: 'modo e escopo são obrigatórios', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = monitoramento.alterarModo(modo, escopo, agenteId);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.post('/intervir', asyncHandler(async (req: Request, res: Response) => {
    const { comando, payload } = req.body;
    if (!comando) {
      return responder(res, { sucesso: false, erro: 'comando é obrigatório', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = await monitoramento.executarIntervencao(comando, payload || {});
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.put('/agente/:agenteId/status', asyncHandler(async (req: Request, res: Response) => {
    const { agenteId } = req.params;
    const { status, ...dados } = req.body;
    if (!status) {
      return responder(res, { sucesso: false, erro: 'status é obrigatório', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = await monitoramento.atualizarStatusAgente(agenteId, status, dados);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.get('/dispatcher/pendentes', asyncHandler(async (req: Request, res: Response) => {
    const agenteId = req.query.agenteId as string | undefined;
    const dados = monitoramento.listarPendentesDispatcher(agenteId);
    return responder(res, { sucesso: true, dados });
  }));

  router.post('/dispatcher/executar', asyncHandler(async (req: Request, res: Response) => {
    const { agenteId } = req.body;
    if (!agenteId) {
      return responder(res, { sucesso: false, erro: 'agenteId é obrigatório', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = await monitoramento.executarPendenteDispatcher(agenteId);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.get('/dispatcher/logs', asyncHandler(async (req: Request, res: Response) => {
    const limite = req.query.limite ? Number(req.query.limite) : 100;
    const dados = monitoramento.listarLogsDispatcher(limite);
    return responder(res, { sucesso: true, dados });
  }));

  router.get('/kilo/receive-chat', asyncHandler(async (req: Request, res: Response) => {
    const agenteId = typeof req.query.agenteId === 'string' ? req.query.agenteId.trim() : undefined;
    const tarefaId = typeof req.query.tarefaId === 'string' ? req.query.tarefaId.trim() : undefined;
    const messageId = typeof req.query.messageId === 'string' ? req.query.messageId.trim() : undefined;
    let limite = req.query.limite ? Number(req.query.limite) : 20;
    if (!Number.isFinite(limite) || limite <= 0) limite = 20;
    if (limite > 200) limite = 200;

    const mensagens = monitoramento.listarMensagens(limite * 5);
    const tiposPermitidos = new Set(['KILO_CHAT', 'KILO_REPLY', 'KILO_RESULT', 'KILO_CHAT_REPLY']);

    let resultado = (mensagens || []).filter((m: any) => tiposPermitidos.has(m.tipo));

    if (messageId) {
      resultado = resultado.filter((m: any) => m.dados?.replyTo === messageId || m.dados?.messageId === messageId);
    }
    if (agenteId) {
      resultado = resultado.filter((m: any) => m.agenteId === agenteId || m.emissor === agenteId);
    }
    if (tarefaId) {
      resultado = resultado.filter((m: any) => m.tarefaId === tarefaId);
    }

    const dados = {
      total: resultado.length,
      mensagens: resultado.slice(-limite).map((m: any) => ({
        messageId: m.id || m.dados?.messageId,
        tipo: m.tipo,
        emissor: m.emissor,
        agenteId: m.agenteId,
        tarefaId: m.tarefaId,
        conteudo: m.conteudo,
        timestamp: m.timestamp,
        dados: m.dados
      }))
    };

    console.log(`[KILO][HTTP_LIST] agenteId=${agenteId || '*'} total=${dados.total}`);
    return responder(res, { sucesso: true, dados });
  }));

  router.delete('/mensagens/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = monitoramento.excluirMensagem(id);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.delete('/mensagens', asyncHandler(async (req: Request, res: Response) => {
    const result = monitoramento.limparMensagens();
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.delete('/agentes', asyncHandler(async (req: Request, res: Response) => {
    const result = monitoramento.limparAgentes();
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.delete('/agentes/:agenteId', asyncHandler(async (req: Request, res: Response) => {
    const { agenteId } = req.params;
    const result = monitoramento.excluirAgente(agenteId);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.get('/alertas', asyncHandler(async (req: Request, res: Response) => {
    const alertas = monitoramento.listarAlertas();
    return responder(res, { sucesso: true, dados: alertas });
  }));

  router.get('/alertas/:id', asyncHandler(async (req: Request, res: Response) => {
    const alerta = monitoramento.obterAlerta(req.params.id);
    if (!alerta) {
      return responder(res, { sucesso: false, erro: 'Alerta não encontrado', codigoErro: 'NOT_FOUND' }, 404);
    }
    return responder(res, { sucesso: true, dados: alerta });
  }));

  router.post('/alertas', asyncHandler(async (req: Request, res: Response) => {
    const result = monitoramento.criarAlerta(req.body);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/alertas/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = monitoramento.atualizarAlerta(req.params.id, req.body);
    return responder(res, result, result.sucesso ? 200 : 404);
  }));

  router.delete('/alertas/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = monitoramento.excluirAlerta(req.params.id);
    return responder(res, result, result.sucesso ? 200 : 404);
  }));

  router.get('/regras', asyncHandler(async (req: Request, res: Response) => {
    const regras = monitoramento.listarRegras();
    return responder(res, { sucesso: true, dados: regras });
  }));

  router.get('/regras/:id', asyncHandler(async (req: Request, res: Response) => {
    const regra = monitoramento.obterRegra(req.params.id);
    if (!regra) {
      return responder(res, { sucesso: false, erro: 'Regra não encontrada', codigoErro: 'NOT_FOUND' }, 404);
    }
    return responder(res, { sucesso: true, dados: regra });
  }));

  router.post('/regras', asyncHandler(async (req: Request, res: Response) => {
    const result = monitoramento.criarRegra(req.body);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/regras/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = monitoramento.atualizarRegra(req.params.id, req.body);
    return responder(res, result, result.sucesso ? 200 : 404);
  }));

  router.delete('/regras/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = monitoramento.excluirRegra(req.params.id);
    return responder(res, result, result.sucesso ? 200 : 404);
  }));

  router.get('/configuracao', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, { sucesso: true, dados: monitoramento.obterConfiguracao() });
  }));

  router.put('/configuracao', asyncHandler(async (req: Request, res: Response) => {
    const result = monitoramento.atualizarConfiguracao(req.body);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  return router;
}
