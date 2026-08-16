import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { TempCleanupService } from '../servicios/TempCleanupService';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function criarTempRouter(cleanupService: TempCleanupService): Router {
  const router = Router();

  router.get('/arquivos', asyncHandler(async (_req: Request, res: Response) => {
    const files = cleanupService.listTempFiles();
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    return responder(res, {
      sucesso: true,
      dados: {
        arquivos: files,
        totalArquivos: files.length,
        tamanhoTotalBytes: totalSize,
        tamanhoTotalFormatado: formatBytes(totalSize),
      },
    });
  }));

  router.post('/limpar', asyncHandler(async (req: Request, res: Response) => {
    const olderThanDays = req.body.olderThanDays as number | undefined;
    const result = cleanupService.cleanupTempFiles(olderThanDays);
    return responder(res, {
      sucesso: true,
      dados: {
        ...result,
        tamanhoLiberadoFormatado: formatBytes(result.freedBytes),
      },
    });
  }));

  router.get('/caminho', asyncHandler(async (_req: Request, res: Response) => {
    return responder(res, {
      sucesso: true,
      dados: {
        caminho: cleanupService.getTempDir(),
      },
    });
  }));

  return router;
}
