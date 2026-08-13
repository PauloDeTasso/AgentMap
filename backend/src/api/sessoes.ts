import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { Sessao } from '../tipos';

export function criarSessaoRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const agenteId = req.query.agenteId as string | undefined;
    const servicos = (req as any).servicos;
    const allResult = servicos?.sessao?.listar ? servicos.sessao.listar() : { sucesso: false, dados: [] };
    if (!allResult.sucesso || !allResult.dados) {
      return responder(res, allResult);
    }

    let sessoes = allResult.dados;
    if (agenteId) {
      sessoes = sessoes.filter((s: any) => s.agenteId === agenteId && !s.datas?.fim);
    }

    const agentesRes = servicos?.agente?.listar ? servicos.agente.listar() : { sucesso: false, dados: [] };
    const tarefasRes = servicos?.tarefa?.listar ? servicos.tarefa.listar() : { sucesso: false, dados: [] };
    const agentesMap = new Map((agentesRes.sucesso && agentesRes.dados ? agentesRes.dados : []).map((a: any) => [a.id, a.nome]));
    const tarefasMap = new Map((tarefasRes.sucesso && tarefasRes.dados ? tarefasRes.dados : []).map((t: any) => [t.id, t.titulo]));

    const enriquecidas = sessoes.map((s: any) => ({
      ...s,
      agenteNome: agentesMap.get(s.agenteId) || s.agenteId,
      tarefaTitulo: tarefasMap.get(s.tarefaId) || s.tarefaId || null
    }));

    return responder(res, { sucesso: true, dados: enriquecidas });
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.sessao.obter(req.params.id));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const dados: Partial<Sessao> = req.body;
    const result = await req.servicos!.sessao.iniciar(dados);
    return responder(res, result, result.sucesso ? 201 : 400);
  }));

  router.put('/:id/finalizar', asyncHandler(async (req: Request, res: Response) => {
    const dados = req.body;
    const result = await req.servicos!.sessao.finalizar(req.params.id, dados);
    return responder(res, result);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.sessao.excluir(req.params.id);
    return responder(res, result);
  }));

  return router;
}
