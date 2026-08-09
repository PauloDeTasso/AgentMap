import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { metricsStore } from '../observability/metrics-store';

export function criarObservabilidadeRouter(): Router {
  const router = Router();

  router.get('/metricas', asyncHandler(async (_req: Request, res: Response) => {
    const summary = metricsStore.getSummary();

    const tools = summary
      .filter((m: any) => m.name.startsWith('agentmap.tool.'))
      .map((m: any) => {
        if (m.name === 'agentmap.tool.executions') {
          return {
            toolName: m.labels['tool.name'],
            totalExecucoes: m.count,
            duracaoMediaMs: m.avg,
            taxaErro: m.labels.status === 'ERROR'
              ? 1
              : 0,
          };
        }
        if (m.name === 'agentmap.tool.errors') {
          return {
            toolName: m.labels['tool.name'],
            totalExecucoes: 0,
            duracaoMediaMs: 0,
            taxaErro: 1,
          };
        }
        return null;
      })
      .filter(Boolean);

    const uniqueTools = new Map<string, any>();
    for (const t of tools) {
      const existing = uniqueTools.get((t as any).toolName);
      if (existing) {
        existing.totalExecucoes += (t as any).totalExecucoes;
        if ((t as any).taxaErro > existing.taxaErro) {
          existing.taxaErro = (t as any).taxaErro;
        }
      } else {
        uniqueTools.set((t as any).toolName, t);
      }
    }

    const agentEntries = summary
      .filter((m: any) => m.name.startsWith('agentmap.agent.'))
      .reduce((acc: any[], m: any) => {
        const agentId = m.labels['agent.id'];
        if (!agentId) return acc;
        const existing = acc.find((a) => a.agentId === agentId);
        if (m.name === 'agentmap.agent.executions') {
          if (existing) {
            existing.totalExecucoes += m.count;
          } else {
            acc.push({ agentId, totalExecucoes: m.count });
          }
        }
        return acc;
      }, []);

    const now = new Date();
    const periodo = {
      inicio: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      fim: now.toISOString(),
    };

    return responder(res, {
      sucesso: true,
      dados: {
        periodo,
        agentes: agentEntries,
        tools: Array.from(uniqueTools.values()),
      },
    });
  }));

  return router;
}
