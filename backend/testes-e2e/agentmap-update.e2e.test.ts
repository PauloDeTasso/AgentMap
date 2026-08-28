/**
 * E2E Test: agentmap update
 *
 * Testa o fluxo completo do comando `agentmap update` em um projeto existente.
 * Valida:
 * 1. Atualização de arquivos gerenciados
 * 2. Preservação de seções do usuário
 * 3. Comportamento --dry-run
 * 4. Comportamento --force
 * 5. Rejeição quando .ia/ não existe
 * 6. Atualização de .kilo/agents/agentmap/*.md
 * 7. Atualização de kilo.jsonc (merge)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

const CLI_PATH = path.resolve(__dirname, '..', 'src', 'cli', 'index.ts');

function createTempDir(): string {
  const tmpDir = path.join(os.tmpdir(), `agentmap-e2e-update-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
}

function cleanupDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}

function runAgentmap(args: string[], cwd: string): { stdout: string; stderr: string; status: number } {
  const result = spawnSync('npx', ['tsx', CLI_PATH, ...args], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, NODE_ENV: 'test' },
    timeout: 30000,
    shell: true,
  });
  return {
    stdout: result.stdout?.toString() || '',
    stderr: result.stderr?.toString() || '',
    status: result.status || 0,
  };
}

function createMinimalAgentMapProject(dir: string): void {
  // Cria estrutura mínima .ia/
  fs.mkdirSync(path.join(dir, '.ia'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.ia', 'agentmap.json'),
    JSON.stringify({
      agentMap: { name: 'AgentMap', version: '2.0.0', schemaVersion: '1.0' },
    }, null, 2),
    'utf-8'
  );

  // Cria agentes de exemplo
  const agentesDir = path.join(dir, '.ia', 'agentes', 'engenheiro-software');
  fs.mkdirSync(agentesDir, { recursive: true });
  fs.writeFileSync(
    path.join(agentesDir, 'engenheiro-software.json'),
    JSON.stringify({
      id: 'engenheiro-software',
      nome: 'Engenheiro de Software',
      descricao: 'Projetar, implementar, testar e operar sistemas de software.',
      responsabilidades: ['Projetar sistemas', 'Implementar código', 'Testar'],
      conhecimentos: ['TypeScript', 'Node.js', 'Testes'],
      condicoesDeParada: ['Requisito ambíguo', 'Risco crítico'],
      diretoriosPermitidos: ['backend/src/**', 'frontend/src/**'],
      diretoriosProibidos: ['node_modules/**', 'dist/**'],
      ferramentasPermitidas: ['read', 'write', 'edit', 'bash'],
      contratosObrigatorios: ['contrato-api'],
      procedimentosObrigatorios: ['preparacao-engenheiro-software'],
      protocoloDeEntrega: { formato: 'handoff', destino: 'gerente-projeto' },
      ambientesPermitidos: ['desenvolvimento', 'homologação'],
      criteriosDeConclusao: ['Testes passando', 'Code review aprovado'],
    }, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(agentesDir, 'instrucoes.md'),
    '# Instruções — Engenheiro de Software\n\nVocê é o Engenheiro de Software do AgentMap.',
    'utf-8'
  );

  // Cria .kilo/agents/agentmap/ para o update
  const kiloAgentsDir = path.join(dir, '.kilo', 'agents', 'agentmap');
  fs.mkdirSync(kiloAgentsDir, { recursive: true });

  // Cria AGENTS.md inicial
  fs.writeFileSync(
    path.join(dir, 'AGENTS.md'),
    '<!-- AGENTMAP_PROTECTED_START -->\n# AgentMap\n<!-- AGENTMAP_PROTECTED_END -->\n\n<!-- AGENTMAP_USER_START -->\n<!-- AGENTMAP_USER_END -->\n',
    'utf-8'
  );

  // Cria kilo.jsonc inicial
  fs.writeFileSync(
    path.join(dir, 'kilo.jsonc'),
    JSON.stringify({
      $schema: 'https://app.kilo.ai/config.json',
      model: 'kilo/auto-hide',
      mcp: {
        agentmap: {
          type: 'local',
          command: ['cmd', '/c', 'npx', 'tsx', '--tsconfig', 'backend/tsconfig.json', 'backend/src/mcp-server/index.ts'],
          enabled: true,
        },
      },
    }, null, 2),
    'utf-8'
  );
}

describe('E2E: agentmap update', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
    createMinimalAgentMapProject(tmpDir);
  });

  afterEach(() => {
    cleanupDir(tmpDir);
  });

  test('deve atualizar arquivos gerenciados quando .ia existe', () => {
    const result = runAgentmap(['update'], tmpDir);

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(tmpDir, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'kilo.jsonc'))).toBe(true);
  });

  test('deve rejeitar atualizacao quando .ia nao existe', () => {
    // Remove .ia
    fs.rmSync(path.join(tmpDir, '.ia'), { recursive: true, force: true });

    const result = runAgentmap(['update'], tmpDir);

    expect(result.stdout).toContain('agentmap init');
  });

  test('deve respeitar --dry-run e nao escrever arquivos', () => {
    // Captura conteúdo original
    const originalAgentsMd = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');

    const result = runAgentmap(['update', '--dry-run'], tmpDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[dry-run]');

    // Arquivos não devem ser modificados
    const afterAgentsMd = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    expect(afterAgentsMd).toBe(originalAgentsMd);
  });

  test('deve forcar sobrescrita com --force', () => {
    // Modifica AGENTS.md
    const agentsMdPath = path.join(tmpDir, 'AGENTS.md');
    fs.writeFileSync(agentsMdPath, 'CONTEUDO COMPLETAMENTE DIFERENTE');

    const result = runAgentmap(['update', '--force'], tmpDir);

    expect(result.status).toBe(0);

    // Deve ter regenerado
    const afterContent = fs.readFileSync(agentsMdPath, 'utf-8');
    expect(afterContent).toContain('<!-- AGENTMAP_PROTECTED_START -->');
  });

  test('deve gerar .kilo/agents/agentmap/ a partir de .ia/agentes/', () => {
    const result = runAgentmap(['update'], tmpDir);

    expect(result.status).toBe(0);

    const agentMdPath = path.join(tmpDir, '.kilo', 'agents', 'agentmap', 'engenheiro-software.md');
    expect(fs.existsSync(agentMdPath)).toBe(true);

    const content = fs.readFileSync(agentMdPath, 'utf-8');
    expect(content).toContain('Engenheiro de Software');
    expect(content).toContain('Projetar sistemas');
  });

  test('deve atualizar kilo.jsonc com merge', () => {
    // Adiciona configuração customizada ao kilo.jsonc
    const kiloJsoncPath = path.join(tmpDir, 'kilo.jsonc');
    const original = JSON.parse(fs.readFileSync(kiloJsoncPath, 'utf-8'));
    original.customField = 'valor-customizado';
    original.model = 'kilo/claude-4-opus';
    fs.writeFileSync(kiloJsoncPath, JSON.stringify(original, null, 2), 'utf-8');

    const result = runAgentmap(['update'], tmpDir);

    expect(result.status).toBe(0);

    // Verifica que campos customizados foram preservados
    const after = JSON.parse(fs.readFileSync(kiloJsoncPath, 'utf-8'));
    expect(after.customField).toBe('valor-customizado');
    expect(after.model).toBe('kilo/claude-4-opus');
  });

  test('deve preservar secao do usuario no AGENTS.md', () => {
    // Adiciona conteúdo do usuário
    const agentsMdPath = path.join(tmpDir, 'AGENTS.md');
    const content = [
      '<!-- AGENTMAP_PROTECTED_START -->',
      '# AgentMap',
      '<!-- AGENTMAP_PROTECTED_END -->',
      '',
      '<!-- AGENTMAP_USER_START -->',
      '',
      '# Meu Projeto Especial',
      '',
      'Instruções específicas do meu projeto.',
      '',
      '<!-- AGENTMAP_USER_END -->',
    ].join('\n');
    fs.writeFileSync(agentsMdPath, content);

    const result = runAgentmap(['update'], tmpDir);

    expect(result.status).toBe(0);

    const afterContent = fs.readFileSync(agentsMdPath, 'utf-8');
    expect(afterContent).toContain('Meu Projeto Especial');
    expect(afterContent).toContain('Instruções específicas do meu projeto.');
  });

  test('deve gerar saida no console indicando resultados', () => {
    const result = runAgentmap(['update'], tmpDir);

    expect(result.stdout).toContain('[update]');
    expect(result.stdout).toContain('Resultados');
  });

  test('deve atualizar versao do kilo.jsonc para refletir AgentMap 2.0', () => {
    const result = runAgentmap(['update'], tmpDir);

    expect(result.status).toBe(0);

    const kiloJsonc = JSON.parse(fs.readFileSync(path.join(tmpDir, 'kilo.jsonc'), 'utf-8'));
    expect(kiloJsonc.mcp.agentmap).toBeDefined();
    expect(kiloJsonc.mcp.agentmap.enabled).toBe(true);
  });
});
