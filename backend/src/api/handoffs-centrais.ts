import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';

export function criarHandoffsCentraisRouter(): Router {
  const router = Router();

  router.get('/pendentes', asyncHandler(async (req: Request, res: Response) => {
    const servicos = (req as any).servicos;
    if (!servicos?.handoff) {
      return responder(res, { sucesso: false, erro: 'HandoffService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }

    const result = servicos.handoff.listar();
    if (!result.sucesso || !result.dados) {
      return responder(res, result, 500);
    }

    const pendentes = result.dados
      .filter((h: any) => h.estado === 'PENDENTE')
      .sort((a: any, b: any) => {
        const dateA = new Date(a.datas?.criadaEm || 0).getTime();
        const dateB = new Date(b.datas?.criadaEm || 0).getTime();
        return dateA - dateB;
      })
      .map((h: any) => ({
        id: h.id,
        origem: h.origem,
        destino: h.destino,
        tarefaId: h.tarefaId,
        resumo: h.resumo,
        criadaEm: h.datas?.criadaEm,
        pendente: Array.isArray(h.pendente) ? h.pendente.length : 0,
        prioridade: calcularPrioridade(h)
      }));

    return responder(res, { sucesso: true, dados: pendentes });
  }));

  router.get('/priorizados', asyncHandler(async (req: Request, res: Response) => {
    const servicos = (req as any).servicos;
    if (!servicos?.handoff) {
      return responder(res, { sucesso: false, erro: 'HandoffService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }

    const result = servicos.handoff.listar();
    if (!result.sucesso || !result.dados) {
      return responder(res, result, 500);
    }

    const pendentes = result.dados
      .filter((h: any) => h.estado === 'PENDENTE')
      .sort((a: any, b: any) => {
        const priorityA = calcularPrioridade(a);
        const priorityB = calcularPrioridade(b);
        if (priorityB !== priorityA) {
          return priorityB - priorityA;
        }
        const dateA = new Date(a.datas?.criadaEm || 0).getTime();
        const dateB = new Date(b.datas?.criadaEm || 0).getTime();
        return dateA - dateB;
      });

    return responder(res, { sucesso: true, dados: pendentes });
  }));

  return router;
}

function calcularPrioridade(handoff: any): number {
  if (!handoff.pendente || !Array.isArray(handoff.pendente)) return 3;
  const count = handoff.pendente.length;
  if (count === 0) return 1;
  if (count <= 2) return 2;
  return 3;
}
