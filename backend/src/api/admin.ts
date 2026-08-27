import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { asyncHandler, responder } from './middleware';
import { corsService } from '../servicios/CorsService';
import { loadRegistroProjetos } from '../config';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from '../servicios/AuditoriaService';

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

  router.post('/limpar-obsoletos', asyncHandler(async (req: Request, res: Response) => {
    const servicos = (req as any).servicos;
    if (!servicos) {
      return responder(res, { sucesso: false, erro: 'Serviços não disponíveis', codigoErro: 'SERVICE_UNAVAILABLE' }, 500);
    }

    const projetoId = req.body.projetoId as string | undefined;
    let projeto = servicos.projeto;

    const pastasParaLimpar = ['handoffs', 'tarefas', 'docs', 'estado', 'contratos', 'dependencias', 'auditoria', 'contexto'];
    const arquivosParaLimpar = ['contexto/mensagens-monitoramento.json', 'contexto/monitoramento-sequence.json', 'contexto/kilo-state.json'];

    const resultado = {
      pastasLimpas: [] as string[],
      arquivosLimpos: [] as string[],
      erros: [] as string[],
    };

    const registryVazioPorPasta: Record<string, string> = {
      handoffs: JSON.stringify({ handoffs: [] }, null, 2),
      tarefas: JSON.stringify({ tarefas: [], estatisticas: { total: 0 } }, null, 2),
      contratos: JSON.stringify({ contratos: [] }, null, 2),
      dependencias: JSON.stringify({ dependencias: [] }, null, 2),
      auditoria: JSON.stringify({ eventos: [] }, null, 2),
    };

    const garantirPastaVazia = (pastaPath: string, nomePasta: string) => {
      try {
        if (!fs.existsSync(pastaPath)) {
          fs.mkdirSync(pastaPath, { recursive: true });
        }
        const registryName = `${nomePasta}.json`;
        const registryPath = path.join(pastaPath, registryName);
        if (registryVazioPorPasta[nomePasta]) {
          fs.writeFileSync(registryPath, registryVazioPorPasta[nomePasta], 'utf-8');
        }
      } catch (err: any) {
        resultado.erros.push(`Falha ao garantir pasta ${pastaPath}: ${err.message}`);
      }
    };

    const limparConteudoArquivo = (fullPath: string) => {
      try {
        if (!fs.existsSync(fullPath)) return false;
        const conteudo = fs.readFileSync(fullPath, 'utf-8');
        let limpo: any;
        try {
          const parsed = JSON.parse(conteudo);
          if (Array.isArray(parsed)) {
            limpo = [];
          } else if (parsed && typeof parsed === 'object') {
            limpo = {};
            for (const key of Object.keys(parsed)) {
              if (Array.isArray(parsed[key])) {
                limpo[key] = [];
              } else if (typeof parsed[key] === 'object' && parsed[key] !== null) {
                limpo[key] = {};
              } else if (typeof parsed[key] === 'number') {
                limpo[key] = 0;
              } else {
                limpo[key] = '';
              }
            }
          } else {
            limpo = [];
          }
        } catch {
          limpo = [];
        }
        fs.writeFileSync(fullPath, JSON.stringify(limpo, null, 2), 'utf-8');
        return true;
      } catch (err: any) {
        resultado.erros.push(`Falha ao limpar ${fullPath}: ${err.message}`);
        return false;
      }
    };

    const limparPasta = (pastaPath: string) => {
      try {
        if (!fs.existsSync(pastaPath)) return;
        const entries = fs.readdirSync(pastaPath, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(pastaPath, entry.name);
          if (entry.isDirectory()) {
            limparPasta(entryPath);
          } else if (entry.isFile() && entry.name.endsWith('.json')) {
            if (limparConteudoArquivo(entryPath)) {
              resultado.arquivosLimpos.push(path.relative(path.join(projeto.caminhoRaiz, '.ia'), entryPath));
            }
          }
        }
      } catch (err: any) {
        resultado.erros.push(`Falha ao acessar ${pastaPath}: ${err.message}`);
      }
    };

    if (projetoId && projetoId !== projeto.id) {
      const registro = loadRegistroProjetos();
      const projRegistro = registro.projetos.find((p) => p.id === projetoId);
      if (!projRegistro || !projRegistro.caminhoRaiz) {
        return responder(res, { sucesso: false, erro: 'Projeto não encontrado no registro', codigoErro: 'PROJECT_NOT_FOUND' }, 404);
      }

      const getFilePath = (rel: string) => path.join(projRegistro.caminhoRaiz, '.ia', rel);

      for (const pasta of pastasParaLimpar) {
        const fullPath = getFilePath(pasta);
        garantirPastaVazia(fullPath, pasta);
        limparPasta(fullPath);
        resultado.pastasLimpas.push(pasta);
      }

      for (const arquivo of arquivosParaLimpar) {
        const fullPath = getFilePath(arquivo);
        if (limparConteudoArquivo(fullPath)) {
          resultado.arquivosLimpos.push(arquivo);
        }
      }

      const fsService = new FileService(projRegistro.caminhoRaiz);
      const auditoria = new AuditoriaService(fsService);
      auditoria.registrar(
        'ADMIN_LIMPEZA_OBSOLETOS',
        `Limpeza de dados: ${resultado.pastasLimpas.length} pastas, ${resultado.arquivosLimpos.length} arquivos limpos`,
        { projetoId: projetoId }
      );

      return responder(res, { sucesso: true, dados: resultado });
    }

      const getFilePath = (rel: string) => path.join(projeto.caminhoRaiz, '.ia', rel);

      for (const pasta of pastasParaLimpar) {
      const fullPath = getFilePath(pasta);
      garantirPastaVazia(fullPath, pasta);
      limparPasta(fullPath);
      resultado.pastasLimpas.push(pasta);
    }

    for (const arquivo of arquivosParaLimpar) {
      const fullPath = getFilePath(arquivo);
      if (limparConteudoArquivo(fullPath)) {
        resultado.arquivosLimpos.push(arquivo);
      }
    }

    servicos.auditoria.registrar({
      tipo: 'ADMIN_LIMPEZA_OBSOLETOS',
      descricao: `Limpeza de dados: ${resultado.pastasLimpas.length} pastas, ${resultado.arquivosLimpos.length} arquivos limpos`,
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
      const gitRes = Promise.resolve(servicos.projeto.fileService.lerJson(path.join('.ia', 'git', 'estado-git.json'))).catch(() => ({ sucesso: false, dados: null }));
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
