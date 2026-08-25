import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { asyncHandler, responder } from './middleware';
import { corsService } from '../servicios/CorsService';

export function criarAdminRouter(): Router {
  const router = Router();

  router.get('/transicoes', asyncHandler(async (req: Request, res: Response) => {
    const stateMachine = (req as any).servicos?.stateMachine;
    if (!stateMachine) {
      return responder(res, { sucesso: false, erro: 'StateMachineService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    return responder(res, { sucesso: true, dados: stateMachine.listarTransicoes() });
  }));

  router.put('/transicoes/:origem', asyncHandler(async (req: Request, res: Response) => {
    const stateMachine = (req as any).servicos?.stateMachine;
    if (!stateMachine) {
      return responder(res, { sucesso: false, erro: 'StateMachineService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    const { origem } = req.params;
    const { destinos } = req.body;
    if (!destinos || !Array.isArray(destinos)) {
      return responder(res, { sucesso: false, erro: 'destinos deve ser um array', codigoErro: 'INVALID_BODY' }, 400);
    }
    const result = stateMachine.atualizarTransicao(origem as any, destinos);
    return responder(res, result, result.sucesso ? 200 : 400);
  }));

  router.get('/transicoes/validar', asyncHandler(async (req: Request, res: Response) => {
    const stateMachine = (req as any).servicos?.stateMachine;
    if (!stateMachine) {
      return responder(res, { sucesso: false, erro: 'StateMachineService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    const { origem, destino } = req.query;
    if (!origem || !destino) {
      return responder(res, { sucesso: false, erro: 'origem e destino são obrigatórios', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = stateMachine.validarTransicao(origem as any, destino as any);
    return responder(res, result);
  }));

  router.get('/cors', asyncHandler(async (_req: Request, res: Response) => {
    return responder(res, { sucesso: true, dados: corsService.getConfig() });
  }));

  router.put('/cors', asyncHandler(async (req: Request, res: Response) => {
    const { origins, methods, allowedHeaders, credentials } = req.body;
    const update: any = {};
    if (Array.isArray(origins)) update.origins = origins;
    if (Array.isArray(methods)) update.methods = methods;
    if (Array.isArray(allowedHeaders)) update.allowedHeaders = allowedHeaders;
    if (typeof credentials === 'boolean') update.credentials = credentials;

    if (Object.keys(update).length === 0) {
      return responder(res, { sucesso: false, erro: 'Nenhuma configuração CORS fornecida', codigoErro: 'INVALID_BODY' }, 400);
    }

    corsService.updateConfig(update);
    return responder(res, { sucesso: true, dados: corsService.getConfig() });
  }));

  router.get('/metricas', asyncHandler(async (req: Request, res: Response) => {
    const servicos = (req as any).servicos;
    return responder(res, {
      sucesso: true,
      dados: {
        timestamp: new Date().toISOString(),
        backend: 'gerenciador-agentes-ia-backend',
        versao: '1.0.0',
        ambiente: process.env.NODE_ENV || 'development',
        endpoints: {
          admin: '/api/admin',
          health: '/api/health',
          transicoes: '/api/admin/transicoes',
          cors: '/api/admin/cors'
        },
        services: servicos ? {
          stateMachine: !!servicos.stateMachine,
          auditoria: !!servicos.auditoria,
          contractValidator: !!servicos.contractValidator,
          backup: !!servicos.backup,
          fileSystem: true
        } : null
      }
    });
  }));

  router.post('/backup', asyncHandler(async (req: Request, res: Response) => {
    const backup = (req as any).servicos?.backup;
    if (!backup) {
      return responder(res, { sucesso: false, erro: 'BackupService não disponível', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }
    const result = backup.criarBackup();
    return responder(res, result, result.sucesso ? 200 : 500);
  }));

  router.get('/readiness', asyncHandler(async (_req: Request, res: Response) => {
    return responder(res, {
      sucesso: true,
      dados: {
        ready: true,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    });
  }));

  router.post('/limpar-obsoletos', asyncHandler(async (req: Request, res: Response) => {
    const servicos = (req as any).servicos;
    if (!servicos) {
      return responder(res, { sucesso: false, erro: 'Serviços não disponíveis', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }

    const projeto = servicos.projeto;
    const filePath = (rel: string) => path.win32.join(projeto.caminhoRaiz, '.ia', rel);

    const pastasParaLimpar = ['handoffs', 'tarefas', 'docs', 'estado', 'contratos', 'dependencias', 'auditoria', '.backups', 'contexto'];
    const arquivosParaLimpar = ['contexto/mensagens-monitoramento.json', 'contexto/monitoramento-sequence.json', 'contexto/kilo-state.json'];

    const resultado = {
      pastasRemovidas: [] as string[],
      arquivosRemovidos: [] as string[],
      erros: [] as string[],
    };

    for (const pasta of pastasParaLimpar) {
      const fullPath = filePath(pasta);
      try {
        if (fs.existsSync(fullPath)) {
          fs.rmSync(fullPath, { recursive: true, force: true });
          resultado.pastasRemovidas.push(pasta);
        }
      } catch (err: any) {
        resultado.erros.push(`Falha ao remover ${pasta}: ${err.message}`);
      }
    }

    for (const arquivo of arquivosParaLimpar) {
      const fullPath = filePath(arquivo);
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          resultado.arquivosRemovidos.push(arquivo);
        }
      } catch (err: any) {
        resultado.erros.push(`Falha ao remover ${arquivo}: ${err.message}`);
      }
    }

    servicos.auditoria.registrar({
      tipo: 'ADMIN_LIMPEZA_OBSOLETOS',
      descricao: `Limpeza de dados obsoletos: ${resultado.pastasRemovidas.length} pastas, ${resultado.arquivosRemovidos.length} arquivos removidos`,
      projetoId: projeto.id,
    });

    return responder(res, { sucesso: true, dados: resultado });
  }));

  router.get('/estado-projeto', asyncHandler(async (req: Request, res: Response) => {
    const servicos = (req as any).servicos;
    if (!servicos) {
      return responder(res, { sucesso: false, erro: 'Serviços não disponíveis', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }

    try {
      const estadoProjeto = servicos.integridade.calcularEstadoProjeto(servicos.projeto.id);
      const gitRes = Promise.resolve(servicos.projeto.fileService.lerJson(path.win32.join('.ia', 'git', 'estado-git.json'))).catch(() => ({ sucesso: false, dados: null }));
      const agentesRes = servicos.agente.listar();
      const tarefasRes = servicos.tarefa.listar();

      const [estadoIntegridade, gitResultado, agentesResultado, tarefasResultado] = await Promise.all([
        estadoProjeto,
        gitRes,
        agentesRes,
        tarefasRes
      ]);

      const estado = {
        projeto: {
          id: servicos.projeto.id,
          nome: servicos.projeto.config.nome,
          estado: servicos.projeto.config.estado
        },
        integridade: estadoIntegridade.sucesso && estadoIntegridade.dados ? estadoIntegridade.dados : null,
        git: gitResultado.sucesso && gitResultado.dados ? gitResultado.dados : null,
        agentes: agentesResultado.sucesso && agentesResultado.dados ? agentesResultado.dados : [],
        tarefas: tarefasResultado.sucesso && tarefasResultado.dados ? tarefasResultado.dados : []
      };

      return responder(res, { sucesso: true, dados: estado });
    } catch (error: any) {
      return responder(res, {
        sucesso: false,
        erro: 'Estado do projeto indisponível',
        codigoErro: 'PROJECT_STATE_UNAVAILABLE'
      }, 500);
    }
  }));

  return router;
}
