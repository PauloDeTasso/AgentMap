import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { FileService } from '../src/arquivos/FileService';
import { resolveProjectPath, isPathSafe, matchesPattern, PathTraversalError, validateAgentDirectoryAccess } from '../src/seguranca/paths';
import { AgentePerfil } from '../src/tipos';

describe('Segurança — Path Traversal', () => {
  const projectRoot = path.join(os.tmpdir(), 'agentmap-test-' + Date.now());
  fs.mkdirSync(projectRoot, { recursive: true });

  test('caminho normal dentro da raiz resolve corretamente', () => {
    const result = resolveProjectPath(projectRoot, '.ia/configuracao/projeto.json');
    expect(result.dentroDaRaiz).toBe(true);
    expect(result.caminhoRelativo).toBe('.ia/configuracao/projeto.json');
  });

  test('path traversal com .. é bloqueado', () => {
    expect(() => resolveProjectPath(projectRoot, '../etc/passwd')).toThrow(PathTraversalError);
    expect(() => resolveProjectPath(projectRoot, '.ia/../../../windows/system32')).toThrow(PathTraversalError);
  });

  test('isPathSafe retorna false para traversal', () => {
    expect(isPathSafe(projectRoot, '../../etc/passwd')).toBe(false);
    expect(isPathSafe(projectRoot, '.ia/config/projeto.json')).toBe(true);
  });

  test('matchesPattern detecta padrões corretos', () => {
    expect(matchesPattern('/frontend/src/index.ts', ['/frontend/**'])).toBe(true);
    expect(matchesPattern('/backend/src/app.js', ['/frontend/**'])).toBe(false);
    expect(matchesPattern('/frontend/src', ['/frontend/**'])).toBe(true);
    expect(matchesPattern('/frontend', ['/frontend/**'])).toBe(true);
  });

  test('matchesPattern funciona com arquivos específicos', () => {
    expect(matchesPattern('/frontend/README.md', ['/README.md', '/frontend/**'])).toBe(true);
    expect(matchesPattern('/README.md', ['/README.md'])).toBe(true);
    expect(matchesPattern('/backend/README.md', ['/README.md'])).toBe(false);
  });

  test('validateAgentDirectoryAccess respeita permissões do agente', () => {
    const perfil = {
      diretoriosPermitidos: ['/frontend/**'],
      diretoriosProibidos: ['/backend/**']
    } as AgentePerfil;
    expect(validateAgentDirectoryAccess(projectRoot, '/frontend/src/app.ts', perfil).permitido).toBe(true);
    expect(validateAgentDirectoryAccess(projectRoot, '/backend/src/app.js', perfil).permitido).toBe(false);
    expect(validateAgentDirectoryAccess(projectRoot, '/android/app/MainActivity.kt', perfil).permitido).toBe(false);
  });
});
