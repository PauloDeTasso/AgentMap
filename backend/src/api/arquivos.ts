import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { asyncHandler, responder } from './middleware';
import { normalizePath, matchesPattern, PathTraversalError } from '../seguranca/paths';

export function criarArquivoRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const caminho = (req.query.path as string) || '.';
    return responder(res, req.servicos!.projeto.fileService.listar(caminho));
  }));

  router.get('/conteudo', asyncHandler(async (req: Request, res: Response) => {
    const caminho = req.query.path as string;
    if (!caminho) {
      return responder(res, { sucesso: false, erro: 'parâmetro path é obrigatório', codigoErro: 'MISSING_PATH' }, 400);
    }
    return responder(res, req.servicos!.projeto.fileService.ler(caminho));
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { caminho, conteudo } = req.body;
    if (!caminho || conteudo === undefined) {
      return responder(res, { sucesso: false, erro: 'caminho e conteudo são obrigatórios', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const agenteId = (req.headers['x-agent-id'] as string | undefined) || (req.body?.agenteId as string | undefined);
    if (agenteId) {
      const perm = req.servicos!.agente.validarDominioArquivo(agenteId, caminho);
      if (!perm.sucesso || !perm.dados) {
        return responder(res, { sucesso: false, erro: perm.erro || 'Sem permissão de escrita', codigoErro: 'FORBIDDEN' }, 403);
      }
    }
    return responder(res, req.servicos!.projeto.fileService.escrever(caminho, conteudo, { backup: true }), 201);
  }));

  router.put('/', asyncHandler(async (req: Request, res: Response) => {
    const { caminho, conteudo } = req.body;
    if (!caminho || conteudo === undefined) {
      return responder(res, { sucesso: false, erro: 'caminho e conteudo são obrigatórios', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const agenteId = (req.headers['x-agent-id'] as string | undefined) || (req.body?.agenteId as string | undefined);
    if (agenteId) {
      const perm = req.servicos!.agente.validarDominioArquivo(agenteId, caminho);
      if (!perm.sucesso || !perm.dados) {
        return responder(res, { sucesso: false, erro: perm.erro || 'Sem permissão de escrita', codigoErro: 'FORBIDDEN' }, 403);
      }
    }
    return responder(res, req.servicos!.projeto.fileService.escrever(caminho, conteudo, { backup: true }));
  }));

  router.delete('/', asyncHandler(async (req: Request, res: Response) => {
    const caminho = req.query.path as string;
    if (!caminho) {
      return responder(res, { sucesso: false, erro: 'parâmetro path é obrigatório', codigoErro: 'MISSING_PATH' }, 400);
    }
    const fs = req.servicos!.projeto.fileService;
    const confirmado = req.body?.confirmado === true;
    if (!confirmado) {
      return responder(res, { sucesso: false, erro: 'Confirmação necessária (confirme com confirmado=true)', codigoErro: 'CONFIRMATION_REQUIRED' }, 409);
    }
    return responder(res, fs.excluir(caminho, { backup: true }));
  }));

  router.get('/validar-json', asyncHandler(async (req: Request, res: Response) => {
    const caminho = req.query.path as string;
    if (!caminho) {
      return responder(res, { sucesso: false, erro: 'parâmetro path é obrigatório', codigoErro: 'MISSING_PATH' }, 400);
    }
    const result = req.servicos!.projeto.fileService.ler(caminho);
    if (!result.sucesso || !result.dados) {
      return responder(res, result);
    }
    try {
      const dados = JSON.parse(result.dados);
      return responder(res, { sucesso: true, dados: { valido: true, dados } });
    } catch (e) {
      return responder(res, { sucesso: true, dados: { valido: false, erro: (e as Error).message } });
    }
  }));

  router.get('/validar-schema', asyncHandler(async (req: Request, res: Response) => {
    const caminho = req.query.path as string;
    const schemaId = req.query.schema as string;
    if (!caminho || !schemaId) {
      return responder(res, { sucesso: false, erro: 'parâmetros path e schema são obrigatórios', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const readResult = req.servicos!.projeto.fileService.ler(caminho);
    if (!readResult.sucesso || !readResult.dados) {
      return responder(res, readResult);
    }
    try {
      const dados = JSON.parse(readResult.dados);
      const validacao = req.servicos!.projeto.validator.validar(schemaId, dados);
      return responder(res, { sucesso: true, dados: validacao });
    } catch (e) {
      return responder(res, { sucesso: false, erro: (e as Error).message, codigoErro: 'PARSE_ERROR' }, 400);
    }
  }));

  router.get('/explorer', asyncHandler(async (req: Request, res: Response) => {
    const caminho = req.query.path as string;
    if (!caminho) {
      return responder(res, { sucesso: false, erro: 'parâmetro path é obrigatório', codigoErro: 'MISSING_PATH' }, 400);
    }
    const fileService = req.servicos!.projeto.fileService;
    let absPath: string;
    try {
      absPath = fileService.getCaminhoAbsoluto(caminho);
    } catch (e) {
      if (e instanceof PathTraversalError) {
        return responder(res, { sucesso: false, erro: e.message, codigoErro: 'PATH_TRAVERSAL' }, 403);
      }
      throw e;
    }
    let realPath: string;
    try {
      realPath = fs.realpathSync(absPath);
    } catch (e: any) {
      if (e?.code === 'ENOENT') {
        return responder(res, { sucesso: false, erro: 'Caminho não encontrado', codigoErro: 'NOT_FOUND' }, 404);
      }
      return responder(res, { sucesso: false, erro: 'Erro ao resolver caminho', codigoErro: 'PATH_ERROR' }, 400);
    }
    return responder(res, { sucesso: true, dados: { caminho: caminho, absoluto: realPath } });
  }));

  return router;
}
