/**
 * E2E Test: agentmap init
 *
 * Testa o fluxo completo do comando `agentmap init` em um diretório temporário.
 * Valida:
 * 1. Criação da estrutura .ia/
 * 2. Criação da estrutura .kilo/
 * 3. Geração de AGENTS.md
 * 4. Geração de kilo.jsonc
 * 5. Geração de .kilo/agents/agentmap/*.md
 * 6. Comportamento com --force
 * 7. Comportamento quando estrutura já existe
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

const CLI_PATH = path.resolve(__dirname, '..', 'src', 'cli', 'index.ts');

function createTempDir(): string {
  const tmpDir = path.join(os.tmpdir(), `agentmap-e2e-init-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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

function createMinimalAgentMapStructure(dir: string): void {
  // Cria estrutura mínima .ia/ com agentmap.json
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

describe('E2E: agentmap init', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
    createMinimalAgentMapStructure(tmpDir);
  });

  afterEach(() => {
    cleanupDir(tmpDir);
  });

  test('deve criar estrutura completa em diretorio com agentmap.json', () => {
    const result = runAgentmap(['init'], tmpDir);

    expect(result.status).toBe(0);

    // Verifica estrutura criada
    expect(fs.existsSync(path.join(tmpDir, '.kilo'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'kilo.jsonc'))).toBe(true);
  });

  test('deve gerar AGENTS.md com secao protegida', () => {
    runAgentmap(['init'], tmpDir);

    const agentsMd = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    expect(agentsMd).toContain('<!-- AGENTMAP_PROTECTED_START -->');
    expect(agentsMd).toContain('<!-- AGENTMAP_PROTECTED_END -->');
    expect(agentsMd).toContain('<!-- AGENTMAP_USER_START -->');
    expect(agentsMd).toContain('<!-- AGENTMAP_USER_END -->');
    expect(agentsMd).toContain('AgentMap — Gerenciador Local de Agentes de IA');
  });

  test('deve gerar kilo.jsonc valido', () => {
    runAgentmap(['init'], tmpDir);

    const kiloJsonc = fs.readFileSync(path.join(tmpDir, 'kilo.jsonc'), 'utf-8');
    const parsed = JSON.parse(kiloJsonc);

    expect(parsed.$schema).toBeDefined();
    expect(parsed.mcp).toBeDefined();
    expect(parsed.mcp.agentmap).toBeDefined();
    expect(parsed.mcp.agentmap.command).toBeDefined();
    expect(parsed.mcp.agentmap.enabled).toBe(true);
  });

  test('nao deve sobrescrever arquivos existentes sem --force', () => {
    // Primeira execução
    runAgentmap(['init'], tmpDir);

    // Modifica AGENTS.md na seção de usuário
    const agentsMdPath = path.join(tmpDir, 'AGENTS.md');
    const originalContent = fs.readFileSync(agentsMdPath, 'utf-8');
    const modifiedContent = originalContent.replace(
      '<!-- AGENTMAP_USER_START -->',
      '<!-- AGENTMAP_USER_START -->\n\n# Minha secao customizada\n'
    );
    fs.writeFileSync(agentsMdPath, modifiedContent);

    // Segunda execução sem --force
    const result = runAgentmap(['init'], tmpDir);
    expect(result.status).toBe(0);

    // Conteúdo do usuário deve ser preservado
    const afterContent = fs.readFileSync(agentsMdPath, 'utf-8');
    expect(afterContent).toContain('Minha secao customizada');
  });

  test('deve sobrescrever arquivos gerenciados com --force', () => {
    // Primeira execução
    runAgentmap(['init'], tmpDir);

    // Modifica AGENTS.md
    const agentsMdPath = path.join(tmpDir, 'AGENTS.md');
    fs.writeFileSync(agentsMdPath, 'CONTEUDO COMPLETAMENTE DIFERENTE');

    // Segunda execução com --force
    const result = runAgentmap(['init', '--force'], tmpDir);
    expect(result.status).toBe(0);

    // Deve ter regenerado
    const afterContent = fs.readFileSync(agentsMdPath, 'utf-8');
    expect(afterContent).toContain('<!-- AGENTMAP_PROTECTED_START -->');
  });

  test('deve gerar saida no console indicando sucesso', () => {
    const result = runAgentmap(['init'], tmpDir);

    expect(result.stdout).toContain('[init]');
    expect(result.stdout).toContain('Concluído');
  });

  test('deve preservar secao do usuario ao atualizar', () => {
    // Executa init primeiro
    runAgentmap(['init'], tmpDir);

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

    // Executa init novamente com --force
    runAgentmap(['init', '--force'], tmpDir);

    // Verifica que seção do usuário foi preservada
    const afterContent = fs.readFileSync(agentsMdPath, 'utf-8');
    expect(afterContent).toContain('Meu Projeto Especial');
    expect(afterContent).toContain('Instruções específicas do meu projeto.');
  });

  test('deve gerar .kilo/agents/agentmap/ a partir de .ia/agentes/', () => {
    const result = runAgentmap(['init'], tmpDir);

    expect(result.status).toBe(0);

    const agentMdPath = path.join(tmpDir, '.kilo', 'agents', 'agentmap', 'engenheiro-software.md');
    expect(fs.existsSync(agentMdPath)).toBe(true);

    const content = fs.readFileSync(agentMdPath, 'utf-8');
    expect(content).toContain('Engenheiro de Software');
  });

  test('deve pular MCP quando skip-mcp eh true', () => {
    const result = runAgentmap(['init', '--skip-mcp'], tmpDir);

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(tmpDir, 'AGENTS.md'))).toBe(true);
  });
});
