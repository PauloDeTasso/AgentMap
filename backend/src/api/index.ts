import { Router, Request, Response } from 'express';
import * as path from 'path';
import { ProjetoService } from '../servicos/ProjetoService';
import { projectMiddleware, asyncHandler, responder } from './middleware';
import { criarProjetoRouter } from './projetos';
import { criarAgenteRouter } from './agentes';
import { criarTarefaRouter } from './tarefas';
import { criarArquivoRouter } from './arquivos';
import { criarContratoRouter } from './contratos';
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

export function setupRotas(projetoService: ProjetoService): Router {
  const router = Router();

  router.get('/api/status', (_req: Request, res: Response) => {
    res.status(200).json({ sucesso: true, dados: { status: 'online', versao: '1.0.0' } });
  });

  router.use('/api/projetos', criarProjetoRouter(projetoService));

  router.use('/api/*', projectMiddleware(projetoService));

  router.get('/api/estado', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, req.servicos!.projeto.fileService.lerJson(
      path.win32.join('.ia', 'estado', 'estado-atual.json')
    ));
  }));

  router.get('/api/auditoria', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, { sucesso: true, dados: req.servicos!.auditoria.listar(200) });
  }));

  router.use('/api/agentes', criarAgenteRouter());
  router.use('/api/tarefas', criarTarefaRouter());
  router.use('/api/arquivos', criarArquivoRouter());
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

  router.get('/api/estado-projeto', asyncHandler(async (req: Request, res: Response) => {
    const result = req.servicos!.integridade.calcularEstadoProjeto(req.servicos!.projeto.id);
    return responder(res, result);
  }));

  router.get('/api/integridade', asyncHandler(async (req: Request, res: Response) => {
    const result = await req.servicos!.integridade.verificar(req.servicos!.projeto.id);
    return responder(res, result);
  }));

  return router;
}
