import { Router, Request, Response } from 'express';
import { ProjetoService } from '../servicios';
import { asyncHandler, responder } from './middleware';
import { loadSettings, saveSettings, saveRegistroProjetos } from '../config';
import { RegistroProjetos, ProjetoRegistro } from '../tipos';
import * as fs from 'fs';
import * as path from 'path';
import { resolveProjectPath } from '../seguranca/paths';

const LOCK_FILE = path.join(require('os').tmpdir(), 'agentmap-projetos-lock');

function adquirirLock(): boolean {
  try {
    const fd = fs.openSync(LOCK_FILE, 'w');
    fs.writeSync(fd, String(process.pid));
    fs.closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

function liberarLock() {
  try {
    fs.unlinkSync(LOCK_FILE);
  } catch {
    // ignore
  }
}

export function criarProjetoRouter(projetoService: ProjetoService): Router {
  const router = Router();

  router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    return responder(res, projetoService.listarProjetos());
  }));

  router.get('/scan', asyncHandler(async (req: Request, res: Response) => {
    const { pasta } = req.query;
    let targetDir = typeof pasta === 'string' ? pasta : loadSettings().diretorioProjetosDefault;
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

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const projetos = projetoService.listarProjetos();
    if (!projetos.sucesso || !projetos.dados) {
      return responder(res, { sucesso: false, erro: 'Erro ao listar projetos', codigoErro: 'LIST_ERROR' });
    }
    const projeto = projetos.dados.find((p: any) => p.id === req.params.id);
    if (!projeto) {
      return responder(res, { sucesso: false, erro: 'Projeto não encontrado', codigoErro: 'NOT_FOUND' }, 404);
    }
    return responder(res, { sucesso: true, dados: projeto });
  }));

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { nome, ativo } = req.body;
    let locked = false;
    try {
      if (!adquirirLock()) {
        return responder(res, { sucesso: false, erro: 'Operação concorrente. Tente novamente.', codigoErro: 'CONFLICT' }, 409);
      }
      locked = true;
      const projetos = projetoService.listarProjetos();
      if (!projetos.sucesso || !projetos.dados) {
        return responder(res, { sucesso: false, erro: 'Erro ao listar projetos', codigoErro: 'LIST_ERROR' });
      }
      const index = projetos.dados.findIndex((p: any) => p.id === req.params.id);
      if (index < 0) {
        return responder(res, { sucesso: false, erro: 'Projeto não encontrado', codigoErro: 'NOT_FOUND' }, 404);
      }
      const atualizado = {
        ...projetos.dados[index],
        nome: nome ?? projetos.dados[index].nome,
        ativo: ativo ?? projetos.dados[index].ativo
      };
      const novoRegistro: RegistroProjetos = { projetos: [...projetos.dados], projetoAtual: projetoService.getProjetoAtual().dados?.id ?? null };
      novoRegistro.projetos[index] = atualizado;
      saveRegistroProjetos(novoRegistro);
      return responder(res, { sucesso: true, dados: atualizado });
    } finally {
      if (locked) liberarLock();
    }
  }));

  router.post('/:id/abrir', asyncHandler(async (req: Request, res: Response) => {
    const { caminho } = req.body;
    const idOuPath = caminho || req.params.id;
    const result = projetoService.abrirProjeto(idOuPath);
    if (!result.sucesso || !result.dados) {
      return responder(res, result);
    }
    const { id, nome, caminhoRaiz, config } = result.dados;
    return responder(res, { sucesso: true, dados: { id, nome, caminhoRaiz, config } });
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

  router.get('/:id/fluxo/checklist', asyncHandler(async (req: Request, res: Response) => {
    const projeto = projetoService.getProjetoCached(req.params.id);
    if (!projeto) {
      return responder(res, { sucesso: false, erro: 'Projeto não está aberto', codigoErro: 'NOT_OPEN' });
    }
    return responder(res, projeto.fluxo.validarChecklist());
  }));

  router.put('/:id/configuracao', asyncHandler(async (req: Request, res: Response) => {
    return responder(res, projetoService.atualizarConfiguracao(req.params.id, req.body));
  }));

  return router;
}