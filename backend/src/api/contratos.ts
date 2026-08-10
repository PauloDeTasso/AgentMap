import { Router, Request, Response } from 'express';
import * as path from 'path';
import { asyncHandler, responder } from './middleware';
import { ContratoBase, ContratoRegistro, ContratosRegistry } from '../tipos';

export function criarContratoRouter(): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const result = req.servicos!.projeto.fileService.lerJson<ContratosRegistry>(
      path.win32.join('.ia', 'contratos', 'contratos.json')
    );
    return responder(res, result);
  }));

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const result = req.servicos!.projeto.fileService.lerJson<ContratoBase>(
      path.win32.join('.ia', 'contratos', `${req.params.id}.json`)
    );
    return responder(res, result);
  }));

  router.get('/:id/dependentes', asyncHandler(async (req: Request, res: Response) => {
    const registryResult = req.servicos!.projeto.fileService.lerJson<ContratosRegistry>(
      path.win32.join('.ia', 'contratos', 'contratos.json')
    );
    if (!registryResult.sucesso || !registryResult.dados) {
      return responder(res, registryResult);
    }
    const alvo = req.params.id;
    const dependentes = registryResult.dados.contratos.filter((c) =>
      c.id !== alvo
    );
    return responder(res, { sucesso: true, dados: dependentes });
  }));

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const contrato: ContratoBase = req.body;
    if (!contrato.id) {
      return responder(res, { sucesso: false, erro: 'id do contrato é obrigatório', codigoErro: 'MISSING_FIELDS' }, 400);
    }
    const result = req.servicos!.projeto.fileService.escreverJson(
      path.win32.join('.ia', 'contratos', `${contrato.id}.json`),
      contrato,
      { backup: true }
    );
    if (!result.sucesso) {
      return responder(res, result);
    }

    // Update registry
    const registryPath = path.win32.join('.ia', 'contratos', 'contratos.json');
    const registryResult = req.servicos!.projeto.fileService.lerJson<ContratosRegistry>(registryPath);
    let registry: ContratosRegistry;
    if (!registryResult.sucesso || !registryResult.dados) {
      registry = { contratos: [] };
    } else {
      registry = registryResult.dados;
      registry.contratos = registry.contratos.filter((c) => c.id !== contrato.id);
    }
    const entry: ContratoRegistro = {
      id: contrato.id,
      nome: contrato.nome,
      arquivo: `contratos/${contrato.id}.json`,
      versao: contrato.versao,
      estado: contrato.estado,
      obrigatorio: contrato.obrigatorio || false
    };
    registry.contratos.push(entry);
    req.servicos!.projeto.fileService.escreverJson(registryPath, registry);

    req.servicos!.auditoria.registrar('CONTRATO_ALTERADO', `Contrato '${contrato.id}' criado/atualizado.`, { agenteId: 'proprietario' });
    return responder(res, { sucesso: true, dados: entry }, 201);
  }));

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const registryResult = req.servicos!.projeto.fileService.lerJson<ContratosRegistry>(
      path.win32.join('.ia', 'contratos', 'contratos.json')
    );
    if (!registryResult.sucesso || !registryResult.dados) {
      return responder(res, registryResult);
    }
    const registry = registryResult.dados;
    const existed = registry.contratos.some((c) => c.id === id);
    if (!existed) {
      return responder(res, { sucesso: false, erro: 'Contrato não encontrado', codigoErro: 'NOT_FOUND' }, 404);
    }
    registry.contratos = registry.contratos.filter((c) => c.id !== id);
    const regResult = req.servicos!.projeto.fileService.escreverJson(
      path.win32.join('.ia', 'contratos', 'contratos.json'),
      registry
    );
    if (!regResult.sucesso) {
      return responder(res, regResult);
    }
    req.servicos!.projeto.fileService.excluir(
      path.win32.join('.ia', 'contratos', `${id}.json`),
      { backup: true }
    );
    req.servicos!.auditoria.registrar('CONTRATO_EXCLUIDO', `Contrato '${id}' excluído.`, {});
    return responder(res, { sucesso: true, dados: true });
  }));

  return router;
}
