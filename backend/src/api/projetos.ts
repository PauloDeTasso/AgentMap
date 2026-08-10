import { Router, Request, Response } from 'express';
import { ProjetoService } from '../servicos/ProjetoService';
import { asyncHandler, responder } from './middleware';
import { loadSettings, saveSettings } from '../config';

export function criarProjetoRouter(projetoService: ProjetoService): Router {
  const router = Router();

  router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    return responder(res, projetoService.listarProjetos());
  }));

  router.get('/atual', asyncHandler(async (_req: Request, res: Response) => {
    const result = projetoService.getProjetoAtual();
    if (!result.sucesso) {
      return responder(res, result, 500);
    }
    if (!result.dados) {
      return res.status(200).json({ sucesso: true, dados: null });
    }
    const { fileService, auditoria, validator, dependencia, ...limpo } = result.dados;
    return res.status(200).json({ sucesso: true, dados: limpo });
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { nome, caminhoParental, descricao, dadosExtra } = req.body;
    if (!nome || !caminhoParental) {
      return responder(res, { sucesso: false, erro: 'nome e caminhoParental são obrigatórios', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    return responder(res, projetoService.criarProjeto(nome, caminhoParental, descricao || '', dadosExtra), 201);
  }));

   router.post('/:id/abrir', asyncHandler(async (req: Request, res: Response) => {
     const { caminho } = req.body;
     const idOuPath = caminho || req.params.id;
     console.log('[POST /api/projetos/:id/abrir] params.id=' + req.params.id + ' | body.caminho=' + (caminho || 'null') + ' | using=' + idOuPath);
     const result = projetoService.abrirProjeto(idOuPath);
    if (!result.sucesso || !result.dados) {
      return responder(res, result);
    }
     const { fileService, auditoria, validator, dependencia, ...limpo } = result.dados;
     return responder(res, { sucesso: true, dados: limpo });
   }));

  router.post('/:id/fechar', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, projetoService.fecharProjeto(req.params.id));
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, projetoService.removerProjeto(req.params.id));
  }));

  router.get('/:id/configuracao', asyncHandler(async (req: Request, res: Response) => {
    const projeto = projetoService.getProjetoCached(req.params.id);
    if (!projeto) {
      return responder(res, { sucesso: false, erro: 'Projeto não está aberto', codigoErro: 'NOT_OPEN' });
    }
    return responder(res, { sucesso: true, dados: projeto.config });
  }));

  router.put('/:id/configuracao', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, projetoService.atualizarConfiguracao(req.params.id, req.body));
  }));

  router.get('/settings', (_req: Request, res: Response) => {
    return res.status(200).json({ sucesso: true, dados: loadSettings() });
  });

  router.put('/settings', (req: Request, res: Response) => {
    const settings = loadSettings();
    saveSettings({ ...settings, ...req.body });
    return res.status(200).json({ sucesso: true, dados: loadSettings() });
  });

  return router;
}
