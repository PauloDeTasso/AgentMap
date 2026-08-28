import { Router, Request, Response } from 'express';
import { ProjetoService } from '../servicios';
import { asyncHandler, responder } from './middleware';
import { loadSettings, saveSettings } from '../config';
import * as fs from 'fs';
import * as path from 'path';
import { resolveProjectPath } from '../seguranca/paths';

export function criarProjetoRouter(projetoService: ProjetoService): Router {
  const router = Router();

  // Em single-project mode, listar retorna apenas o projeto atual
  router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const atual = projetoService.getProjetoAtual();
    return responder(res, { sucesso: true, dados: atual.dados ? [atual.dados] : [] });
  }));

  router.get('/scan', asyncHandler(async (req: Request, res: Response) => {
    const { pasta } = req.query;
    const settings = loadSettings();
    let targetDir = typeof pasta === 'string' ? pasta : (settings as any).diretorioProjetosDefault;
    if (!targetDir || typeof targetDir !== 'string') {
      return responder(res, { sucesso: false, erro: 'Pasta nao encontrada', codigoErro: 'DIR_NOT_FOUND' }, 404);
    }
    let resolved: string;
    try {
      resolved = resolveProjectPath(targetDir, '.').caminhoAbsoluto;
    } catch (e: any) {
      return responder(res, { sucesso: false, erro: 'Caminho inválido', codigoErro: 'INVALID_PATH' }, 400);
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      return responder(res, { sucesso: false, erro: 'Pasta nao encontrada', codigoErro: 'DIR_NOT_FOUND' }, 404);
    }
    const projetosEncontrados: Array<{ nome: string; caminho: string; descricao?: string; id?: string }> = [];
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const caminho = path.join(resolved, entry.name);
      const iaPath = path.join(caminho, '.ia');
      if (fs.existsSync(iaPath) && fs.statSync(iaPath).isDirectory()) {
        let nome = entry.name;
        let descricao = '';
        let id = '';
        const configPath = path.join(iaPath, 'configuracao', 'projeto.json');
        if (fs.existsSync(configPath)) {
          try {
            const configRaw = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configRaw);
            nome = config.nome || entry.name;
            descricao = config.descricao || '';
            id = config.id || '';
          } catch {
            // Keep folder name as fallback
          }
        }
        projetosEncontrados.push({ nome, caminho, descricao, id });
      }
    }
    return responder(res, { sucesso: true, dados: projetosEncontrados });
  }));

  router.get('/atual', asyncHandler(async (_req: Request, res: Response) => {
    const result = projetoService.getProjetoAtual();
    if (!result.sucesso) {
      return responder(res, result, 500);
    }
    if (!result.dados) {
      return res.status(200).json({ sucesso: true, dados: null });
    }
    const { fileService, auditoria, validator, dependencia, fluxo, monitoramento, kiloDiscovery, kiloReconciliation, ...limpo } = result.dados;
    return res.status(200).json({ sucesso: true, dados: limpo });
  }));

  router.get('/settings', (_req: Request, res: Response) => {
    const settings = loadSettings();
    const { postgresConfig, ...safeSettings } = settings;
    return res.status(200).json({ sucesso: true, dados: safeSettings });
  });

  router.put('/settings', (req: Request, res: Response) => {
    const settings = loadSettings();
    saveSettings({ ...settings, ...req.body });
    return res.status(200).json({ sucesso: true, dados: loadSettings() });
  });

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { nome, caminhoParental, descricao, dadosExtra } = req.body;
    if (!nome || !caminhoParental) {
      return responder(res, { sucesso: false, erro: 'nome e caminhoParental são obrigatórios', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const extras: Record<string, unknown> = { ...dadosExtra, ...req.body };
    return responder(res, projetoService.criarProjeto(nome, caminhoParental, descricao || '', extras), 201);
  }));

  // Single-project: abrir projeto por caminho
  router.post('/abrir', asyncHandler(async (req: Request, res: Response) => {
    const { caminho } = req.body;
    const idOuPath = caminho || req.params.id;
    const result = projetoService.abrirProjeto(idOuPath);
    if (!result.sucesso || !result.dados) {
      return responder(res, result);
    }
    const { id, nome, caminhoRaiz, config } = result.dados;
    return responder(res, { sucesso: true, dados: { id, nome, caminhoRaiz, config } });
  }));

  // Single-project: abrir projeto raiz (auto-detecção)
  router.post('/abrir-raiz', asyncHandler(async (_req: Request, res: Response) => {
    const result = projetoService.abrirProjetoRaiz();
    if (!result.sucesso || !result.dados) {
      return responder(res, result);
    }
    const { id, nome, caminhoRaiz, config } = result.dados;
    return responder(res, { sucesso: true, dados: { id, nome, caminhoRaiz, config } });
  }));

  router.get('/configuracao', asyncHandler(async (_req: Request, res: Response) => {
    const projeto = projetoService.getProjetoAtual();
    if (!projeto.dados) {
      return responder(res, { sucesso: false, erro: 'Projeto não está aberto', codigoErro: 'NOT_OPEN' });
    }
    return responder(res, { sucesso: true, dados: projeto.dados.config });
  }));

  router.get('/fluxo/checklist', asyncHandler(async (_req: Request, res: Response) => {
    const projeto = projetoService.getProjetoAtual();
    if (!projeto.dados) {
      return responder(res, { sucesso: false, erro: 'Projeto não está aberto', codigoErro: 'NOT_OPEN' });
    }
    return responder(res, projeto.dados.fluxo.validarChecklist());
  }));

  router.put('/configuracao', asyncHandler(async (req: Request, res: Response) => {
    const projeto = projetoService.getProjetoAtual();
    if (!projeto.dados) {
      return responder(res, { sucesso: false, erro: 'Projeto não está aberto', codigoErro: 'NOT_OPEN' });
    }
    return responder(res, projetoService.atualizarConfiguracao(projeto.dados.id, req.body));
  }));

  return router;
}
