import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ScaffoldService } from '../src/arquivos/ScaffoldService';

describe('ScaffoldService — Estrutura .ia/', () => {
  const projectRoot = path.join(os.tmpdir(), 'agentmap-scaffold-test-' + Date.now());
  fs.mkdirSync(projectRoot, { recursive: true });
  const scaffold = new ScaffoldService();

  beforeAll(() => {
    const result = scaffold.scaffoldProject('proj-test', 'Projeto de Teste', 'Descrição de teste', projectRoot);
    expect(result.sucesso).toBe(true);
  });

  afterAll(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  test('cria diretório .ia/ na raiz', () => {
    expect(fs.existsSync(path.join(projectRoot, '.ia'))).toBe(true);
  });

  test('cria .ia/.backups/', () => {
    expect(fs.existsSync(path.join(projectRoot, '.ia', '.backups'))).toBe(true);
  });

  test('cria diretório de configuração com arquivos obrigatórios', () => {
    const configDir = path.join(projectRoot, '.ia', 'configuracao');
    expect(fs.existsSync(path.join(configDir, 'projeto.json'))).toBe(true);
    expect(fs.existsSync(path.join(configDir, 'gerenciador.json'))).toBe(true);
    expect(fs.existsSync(path.join(configDir, 'ambiente.json'))).toBe(true);
  });

  test('cria diretório de agentes com 16 agentes', () => {
    const agentesDir = path.join(projectRoot, '.ia', 'agentes');
    const registry = JSON.parse(fs.readFileSync(path.join(agentesDir, 'agentes.json'), 'utf-8'));
    expect(registry.agentes).toHaveLength(16);
    expect(registry.agentes[0].id).toBe('planejador-arquiteto');
    expect(registry.agentes.some((a: { id: string }) => a.id === 'devops')).toBe(true);
    expect(registry.agentes.some((a: { id: string }) => a.id === 'qa-testes')).toBe(true);
    expect(registry.agentes.some((a: { id: string }) => a.id === 'security-engineer')).toBe(true);
    expect(registry.agentes.some((a: { id: string }) => a.id === 'technical-writer')).toBe(true);
  });

  test.each([
    ['planejador', 'planejador'],
    ['frontend', 'frontend'],
    ['backend', 'backend'],
    ['banco', 'banco'],
    ['android', 'android'],
    ['infraestrutura', 'infraestrutura'],
    ['testes', 'testes'],
    ['seguranca', 'seguranca'],
    ['revisor', 'revisor'],
    ['documentacao', 'documentacao'],
    ['observabilidade', 'observabilidade'],
    ['desempenho', 'desempenho'],
    ['devops', 'devops'],
    ['qa-testes', 'qa-testes'],
    ['security-engineer', 'security-engineer'],
    ['technical-writer', 'technical-writer']
  ])('cria estrutura do agente %s com perfil, habilidades e markdown', (subpasta, perfilId) => {
    const dir = path.join(projectRoot, '.ia', 'agentes', subpasta);
    expect(fs.existsSync(path.join(dir, `${perfilId}.json`))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'habilidades.json'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'instrucoes.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'personalidade.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'regras.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'contexto.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'memoria.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'conhecimento'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'recursos'))).toBe(true);
  });

  test('cria todos os contratos obrigatórios', () => {
    const contratosDir = path.join(projectRoot, '.ia', 'contratos');
    expect(fs.existsSync(path.join(contratosDir, 'contratos.json'))).toBe(true);
    expect(fs.existsSync(path.join(contratosDir, 'contrato-projeto.json'))).toBe(true);
    expect(fs.existsSync(path.join(contratosDir, 'contrato-arquitetura.json'))).toBe(true);
    expect(fs.existsSync(path.join(contratosDir, 'contrato-api.json'))).toBe(true);
    expect(fs.existsSync(path.join(contratosDir, 'contrato-banco.json'))).toBe(true);
    expect(fs.existsSync(path.join(contratosDir, 'contrato-frontend.json'))).toBe(true);
    expect(fs.existsSync(path.join(contratosDir, 'contrato-android.json'))).toBe(true);
    expect(fs.existsSync(path.join(contratosDir, 'contrato-seguranca.json'))).toBe(true);
    expect(fs.existsSync(path.join(contratosDir, 'contrato-infraestrutura.json'))).toBe(true);
    expect(fs.existsSync(path.join(contratosDir, 'contrato-testes.json'))).toBe(true);
    expect(fs.existsSync(path.join(contratosDir, 'contrato-documentacao.json'))).toBe(true);
    expect(fs.existsSync(path.join(contratosDir, 'contrato-interface.json'))).toBe(true);
    expect(fs.existsSync(path.join(contratosDir, 'modelo-contrato.json'))).toBe(true);
    expect(fs.existsSync(path.join(contratosDir, 'contrato-projeto.md'))).toBe(true);
  });

  test('cria estrutura de tarefas com subpastas por estado', () => {
    const tarefasDir = path.join(projectRoot, '.ia', 'tarefas');
    expect(fs.existsSync(path.join(tarefasDir, 'tarefas.json'))).toBe(true);
    expect(fs.existsSync(path.join(tarefasDir, 'modelos', 'modelo-tarefa.json'))).toBe(true);
    expect(fs.existsSync(path.join(tarefasDir, 'rascunho'))).toBe(true);
    expect(fs.existsSync(path.join(tarefasDir, 'planejadas'))).toBe(true);
    expect(fs.existsSync(path.join(tarefasDir, 'prontas'))).toBe(true);
    expect(fs.existsSync(path.join(tarefasDir, 'execucao'))).toBe(true);
    expect(fs.existsSync(path.join(tarefasDir, 'testes'))).toBe(true);
    expect(fs.existsSync(path.join(tarefasDir, 'revisao'))).toBe(true);
    expect(fs.existsSync(path.join(tarefasDir, 'aprovacao'))).toBe(true);
    expect(fs.existsSync(path.join(tarefasDir, 'bloqueadas'))).toBe(true);
    expect(fs.existsSync(path.join(tarefasDir, 'concluidas'))).toBe(true);
  });

  test('cria arquivos de estado', () => {
    const estadoDir = path.join(projectRoot, '.ia', 'estado');
    expect(fs.existsSync(path.join(estadoDir, 'estado-atual.json'))).toBe(true);
    expect(fs.existsSync(path.join(estadoDir, 'progresso.json'))).toBe(true);
    expect(fs.existsSync(path.join(estadoDir, 'bloqueios.json'))).toBe(true);
  });

  test('cria arquivos de governança', () => {
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'decisoes', 'decisoes.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'riscos', 'riscos.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'problemas', 'problemas.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'conhecimento', 'conhecimento.json'))).toBe(true);
  });

  test('cria procedimentos operacionais', () => {
    const procDir = path.join(projectRoot, '.ia', 'procedimentos');
    expect(fs.existsSync(path.join(procDir, 'procedimentos.json'))).toBe(true);
    expect(fs.existsSync(path.join(procDir, 'CRIAR_TAREFA.md'))).toBe(true);
    expect(fs.existsSync(path.join(procDir, 'IMPLEMENTAR_TAREFA.md'))).toBe(true);
    expect(fs.existsSync(path.join(procDir, 'REVISAR_CODIGO.md'))).toBe(true);
    expect(fs.existsSync(path.join(procDir, 'EXECUTAR_TESTES.md'))).toBe(true);
    expect(fs.existsSync(path.join(procDir, 'CRIAR_MIGRACAO.md'))).toBe(true);
    expect(fs.existsSync(path.join(procDir, 'ALTERAR_API.md'))).toBe(true);
    expect(fs.existsSync(path.join(procDir, 'IMPLANTAR.md'))).toBe(true);
    expect(fs.existsSync(path.join(procDir, 'REVERTER_IMPLANTACAO.md'))).toBe(true);
    expect(fs.existsSync(path.join(procDir, 'SOLICITAR_ALTERACAO.md'))).toBe(true);
  });

  test('cria arquivos de permissões, contexto e qualidade', () => {
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'permissoes', 'permissoes.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'permissoes', 'ferramentas.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'contexto', 'contextos.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'qualidade', 'criterios.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'qualidade', 'testes.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'qualidade', 'revisoes.json'))).toBe(true);
  });

  test('cria arquivos Git, políticas e auditoria', () => {
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'git', 'estado-git.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'politicas', 'politicas.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'politicas', 'POLITICA_SEGURANCA.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'politicas', 'POLITICA_GIT.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'politicas', 'POLITICA_QUALIDADE.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'politicas', 'POLITICA_PERMISSOES.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'politicas', 'POLITICA_MUDANCAS.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '.ia', 'auditoria', 'eventos.json'))).toBe(true);
  });

  test('cria estrutura de solicitações de alteração', () => {
    const solDir = path.join(projectRoot, '.ia', 'solicitacoes');
    expect(fs.existsSync(solDir)).toBe(true);
    expect(fs.existsSync(path.join(solDir, 'solicitacoes.json'))).toBe(true);
    expect(fs.existsSync(path.join(solDir, 'historico-alteracoes.json'))).toBe(true);
    expect(fs.existsSync(path.join(solDir, 'modelo-solicitacao.json'))).toBe(true);
    const registry = JSON.parse(fs.readFileSync(path.join(solDir, 'solicitacoes.json'), 'utf-8'));
    expect(registry.solicitacoes).toEqual([]);
  });

  test('cria diretórios de código do projeto', () => {
    expect(fs.existsSync(path.join(projectRoot, 'frontend'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'backend'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'android'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'banco'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'infraestrutura'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'implantacao'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'testes'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'docs'))).toBe(true);
  });

  test('conteúdo de projeto.json é válido', () => {
    const config = JSON.parse(fs.readFileSync(path.join(projectRoot, '.ia', 'configuracao', 'projeto.json'), 'utf-8'));
    expect(config.id).toBe('proj-test');
    expect(config.nome).toBe('Projeto de Teste');
    expect(config.versao).toBe('1.0.0');
    expect(config.idioma).toBe('pt-BR');
    expect(config.configuracaoIa.diretorio).toBe('/.ia');
  });

  test('perfil do agente frontend tem permissões corretas', () => {
    const perfil = JSON.parse(fs.readFileSync(path.join(projectRoot, '.ia', 'agentes', 'frontend', 'frontend.json'), 'utf-8'));
    expect(perfil.id).toBe('frontend');
    expect(perfil.permissoes.aprovar).toBe(false);
    expect(perfil.permissoes.implantar).toBe(false);
    expect(perfil.diretoriosPermitidos).toContain('/frontend/**');
    expect(perfil.diretoriosProibidos).toContain('/backend/**');
    expect(perfil.contratosObrigatorios).toContain('contrato-projeto');
    expect(perfil.contratosObrigatorios).toContain('contrato-api');
  });

  test('cria agentes Kilo em .kilo/agent/', () => {
    const kiloAgentDir = path.join(projectRoot, '.kilo', 'agent');
    expect(fs.existsSync(kiloAgentDir)).toBe(true);
    expect(fs.existsSync(path.join(kiloAgentDir, 'planejador-arquiteto.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloAgentDir, 'frontend.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloAgentDir, 'backend.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloAgentDir, 'banco.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloAgentDir, 'android.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloAgentDir, 'infraestrutura.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloAgentDir, 'testes.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloAgentDir, 'seguranca.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloAgentDir, 'revisor.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloAgentDir, 'documentacao.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloAgentDir, 'observabilidade.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloAgentDir, 'desempenho.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloAgentDir, 'devops.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloAgentDir, 'qa-testes.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloAgentDir, 'security-engineer.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiloAgentDir, 'technical-writer.md'))).toBe(true);
  });

  test('agente Kilo frontend tem frontmatter valido', () => {
    const content = fs.readFileSync(path.join(projectRoot, '.kilo', 'agent', 'frontend.md'), 'utf-8');
    expect(content).toContain('description: Frontend');
    expect(content).toContain('mode: primary');
    expect(content).toContain('steps: 25');
    expect(content).toContain('/frontend/**');
  });
});
