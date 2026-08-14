import * as path from 'path';
import * as fs from 'fs';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { ResultadoOperacao } from '../tipos';

export class BackupService {
  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator,
    private projetoRoot: string
  ) {}

  criarBackup(): ResultadoOperacao<string> {
    const iaDir = path.win32.join(this.projetoRoot, '.ia');
    const backupDir = path.win32.join(this.projetoRoot, '.ia-backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.win32.join(backupDir, `backup-${timestamp}`);

    if (!fs.existsSync(iaDir)) {
      return { sucesso: false, erro: '.ia/ não encontrado', codigoErro: 'IA_NOT_FOUND' };
    }

    fs.mkdirSync(backupDir, { recursive: true });
    fs.mkdirSync(backupPath, { recursive: true });

    const copiar = (src: string, dest: string): void => {
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.win32.join(src, entry.name);
        const destPath = path.win32.join(dest, entry.name);
        if (entry.isDirectory()) {
          fs.mkdirSync(destPath, { recursive: true });
          copiar(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };

    try {
      copiar(iaDir, backupPath);
      this.auditoria.registrar('BACKUP_CRIADO', `Backup criado em ${backupPath}`, { backupPath });
      return { sucesso: true, dados: backupPath };
    } catch (error: any) {
      return { sucesso: false, erro: error?.message || 'Falha ao criar backup', codigoErro: 'BACKUP_FAILED' };
    }
  }
}

