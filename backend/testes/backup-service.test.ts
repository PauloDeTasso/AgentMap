import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileService } from '../src/arquivos/FileService';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { BackupService } from '../src/servicios/BackupService';

describe('BackupService', () => {
  let projectRoot: string;
  let fsSvc: FileService;
  let auditoria: AuditoriaService;
  let service: BackupService;
  let validator: SchemaValidator;

  beforeEach(() => {
    projectRoot = path.join(os.tmpdir(), 'agentmap-backup-test-' + Date.now());
    fs.mkdirSync(projectRoot, { recursive: true });
    fs.mkdirSync(path.join(projectRoot, '.ia', 'config'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, '.ia', 'config', 'projeto.json'), JSON.stringify({ id: 'proj-1', nome: 'Teste' }, null, 2), 'utf-8');
    fsSvc = new FileService(projectRoot);
    auditoria = new AuditoriaService(fsSvc);
    validator = new SchemaValidator(path.resolve(__dirname, '..', '..', 'esquemas'));
    service = new BackupService(fsSvc, auditoria, validator, projectRoot);
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  test('criarBackup retorna erro quando .ia nao existe', () => {
    const svc = new BackupService(fsSvc, auditoria, validator, path.join(os.tmpdir(), 'agentmap-backup-naoexiste-' + Date.now()));
    const result = svc.criarBackup();
    expect(result.sucesso).toBe(false);
    expect(result.codigoErro).toBe('IA_NOT_FOUND');
  });

  test('criarBackup cria diretorio de backup e copia arquivos', () => {
    const result = service.criarBackup();
    expect(result.sucesso).toBe(true);
    expect(result.dados).toContain('.ia-backups');
    const backups = fs.readdirSync(path.join(projectRoot, '.ia-backups'));
    expect(backups.length).toBeGreaterThan(0);
    const backupDir = path.join(projectRoot, '.ia-backups', backups[0]);
    expect(fs.existsSync(path.join(backupDir, 'config', 'projeto.json'))).toBe(true);
  });

  test('criarBackup exclui diretorio .ia-backups do backup', () => {
    service.criarBackup();
    const backups = fs.readdirSync(path.join(projectRoot, '.ia-backups'));
    const backupDir = path.join(projectRoot, '.ia-backups', backups[0]);
    const entries = fs.readdirSync(backupDir);
    expect(entries).not.toContain('.ia-backups');
  });

  test('criarBackup registra evento de auditoria', () => {
    service.criarBackup();
    const eventos = auditoria.listar(10);
    expect(eventos.some(e => e.tipo === 'BACKUP_CRIADO')).toBe(true);
  });

  test('criarBackup retorna erro quando copia falha', () => {
    const fsOriginal = fs.cpSync;
    fs.cpSync = () => { throw new Error('Falha na copia'); };
    try {
      const result = service.criarBackup();
      expect(result.sucesso).toBe(false);
      expect(result.codigoErro).toBe('BACKUP_FAILED');
    } finally {
      fs.cpSync = fsOriginal;
    }
  });
});
