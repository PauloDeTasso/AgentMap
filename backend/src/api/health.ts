import { Router, Request, Response } from 'express';
import * as path from 'path';
import { asyncHandler, responder } from './middleware';

export function criarHealthRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const servicos = (req as any).servicos;
    if (!servicos) {
      return responder(res, {
        sucesso: true,
        dados: {
          status: 'ok',
          timestamp: new Date().toISOString(),
          projectRoot: process.cwd()
        }
      });
    }

    try {
      const agentesPromise = servicos.agente?.listar ? servicos.agente.listar() : Promise.resolve({ sucesso: false, erro: 'indisponivel' });
      const tarefasPromise = servicos.tarefa?.listar ? servicos.tarefa.listar() : Promise.resolve({ sucesso: false, erro: 'indisponivel' });
      const gitPromise = Promise.resolve(servicos.projeto.fileService.lerJson(path.win32.join('.ia', 'git', 'estado-git.json'))).catch(() => ({ sucesso: false, dados: null }));

      const [agentesRes, tarefasRes, gitRes] = await Promise.all([
        agentesPromise,
        tarefasPromise,
        gitPromise
      ]);

      const agentes = agentesRes.sucesso && agentesRes.dados ? agentesRes.dados : [];
      const tarefas = tarefasRes.sucesso && tarefasRes.dados ? tarefasRes.dados : [];
      const git = gitRes.sucesso && gitRes.dados ? gitRes.dados : null;

      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        project: {
          id: servicos.projeto.id,
          name: servicos.projeto.config.nome,
          estado: servicos.projeto.config.estado
        },
        agents: agentes.map((a: any) => ({
          id: a.id,
          nome: a.nome,
          funcao: a.funcao,
          estado: a.estado
        })),
        counts: {
          agents: agentes.length,
          tasks: tarefas.length,
          tasksByState: tarefas.reduce((acc: any, t: any) => {
            acc[t.estado] = (acc[t.estado] || 0) + 1;
            return acc;
          }, {})
        },
        git: git ? {
          estado: git.repositorio?.estado || null,
          ramoAtual: git.repositorio?.ramoAtual || null,
          ultimoCommit: git.repositorio?.ultimoCommit || null
        } : null,
        services: {
          stateMachine: !!servicos.stateMachine,
          auditoria: !!servicos.auditoria,
          contractValidator: !!servicos.contractValidator,
          backup: !!servicos.backup,
          fileSystem: true
        }
      };

      return responder(res, { sucesso: true, dados: health });
    } catch (error: any) {
      console.error('Health check error:', error);
      return responder(res, {
        sucesso: false,
        erro: 'Health check failed: ' + (error?.message || error),
        codigoErro: 'HEALTH_CHECK_FAILED'
      }, 500);
    }
  }));

  return router;
}
