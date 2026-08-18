import { mcpServer, projetoService } from '../src/mcp-server/server';
import '../src/mcp-server/resources';
import '../src/mcp-server/resources/monitoramento-resource';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

function criarProjetoTeste() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentmap-mcp-static-test-'));
  const iaDir = path.join(tmpDir, '.ia');

  const dirs = [
    'contratos', 'tarefas', 'dependencias', 'solicitacoes', 'handoffs',
    'estado', 'auditoria', 'monitoramento', 'configuracao', 'eventos', 'contexto'
  ];
  for (const d of dirs) {
    fs.mkdirSync(path.join(iaDir, d), { recursive: true });
  }

  fs.writeFileSync(path.join(iaDir, 'fluxo-trabalho.md'), '# Fluxo\n');
  fs.writeFileSync(path.join(iaDir, 'contratos', 'contrato-teste.json'), JSON.stringify({ id: 'CNT-001' }));
  fs.writeFileSync(path.join(iaDir, 'tarefas', 'tarefas.json'), JSON.stringify({ tarefas: [] }));
  fs.writeFileSync(path.join(iaDir, 'dependencias', 'dependencias.json'), JSON.stringify({ dependencias: [] }));

  const projetoId = 'PROJ-TEST-' + Date.now();
  const config = {
    id: projetoId,
    nome: 'Projeto Teste MCP',
    descricao: 'Teste',
    versao: '1.0.0',
    estado: 'ativo',
    idioma: 'pt-BR',
    fusoHorario: 'America/Sao_Paulo',
    proprietario: { tipo: 'humano', nome: 'Test' },
    objetivos: [],
    escopo: { incluso: [], excluido: [] },
    tecnologias: { frontend: [], backend: [], android: [], bancoDeDados: [], infraestrutura: [], testes: [] },
    ambiente: 'desenvolvimento',
    arquiteturas: [],
    padroes: [],
    diretorios: {},
    configuracaoIa: { diretorio: '/.ia', contratoPrincipal: '/.ia/contratos/contrato-projeto.json', estadoAtual: '/.ia/estado/estado-atual.json' },
    datas: { criacao: new Date().toISOString(), ultimaAtualizacao: new Date().toISOString() }
  };
  fs.mkdirSync(path.join(iaDir, 'configuracao'), { recursive: true });
  fs.mkdirSync(path.join(iaDir, 'auditoria'), { recursive: true });
  fs.writeFileSync(path.join(iaDir, 'configuracao', 'projeto.json'), JSON.stringify(config));
  fs.writeFileSync(path.join(iaDir, 'auditoria', 'eventos.json'), JSON.stringify({ eventos: [] }));

  const openResult = (projetoService as any).abrirProjeto(tmpDir);
  if (!openResult.sucesso) {
    throw new Error('Falha ao abrir projeto de teste: ' + openResult.erro);
  }

  return {
    tmpDir,
    projetoId,
    cleanup: () => {
      (projetoService as any).registro.projetos = (projetoService as any).registro.projetos.filter((p: any) => p.id !== projetoId);
      (projetoService as any).registro.projetoAtual = null;
      (projetoService as any).projetosAbertos.delete(projetoId);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  };
}

describe('MCP static resources', () => {
  beforeEach(() => {
    (projetoService as any).registro.projetoAtual = null;
    (projetoService as any).projetosAbertos.clear();
  });

  describe('agentmap-status', () => {
    test('retorna status online', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://status'].readCallback(new URL('agentmap://status'), {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.status).toBe('online');
    });

    test('retorna versao 1.0.0', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://status'].readCallback(new URL('agentmap://status'), {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.versao).toBe('1.0.0');
    });

    test('retorna transporte stdio', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://status'].readCallback(new URL('agentmap://status'), {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.transporte).toBe('stdio');
    });

    test('retorna protocolo 1.0', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://status'].readCallback(new URL('agentmap://status'), {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.protocolo).toBe('1.0');
    });

    test('URI do resource e agentmap://status', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://status'].readCallback(new URL('agentmap://status'), {});
      expect(result.contents[0].uri).toBe('agentmap://status');
    });

    test('mimeType e application/json', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://status'].readCallback(new URL('agentmap://status'), {});
      expect(result.contents[0].mimeType).toBe('application/json');
    });
  });

  describe('agentmap-manifest', () => {
    test('retorna nome AgentMap', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://manifest'].readCallback(new URL('agentmap://manifest'), {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.nome).toBe('AgentMap');
    });

    test('retorna versao 1.0.0', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://manifest'].readCallback(new URL('agentmap://manifest'), {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.versao).toBe('1.0.0');
    });

    test('retorna protocolo 1.0', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://manifest'].readCallback(new URL('agentmap://manifest'), {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.protocolo).toBe('1.0');
    });

    test('retorna lista de capacidades', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://manifest'].readCallback(new URL('agentmap://manifest'), {});
      const data = JSON.parse(result.contents[0].text);
      expect(Array.isArray(data.capacidades)).toBe(true);
      expect(data.capacidades).toContain('projetos');
      expect(data.capacidades).toContain('agentes');
    });

    test('retorna regras com booleanos', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://manifest'].readCallback(new URL('agentmap://manifest'), {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.regras.leituraObrigatoriaAntesDoTrabalho).toBe(true);
      expect(data.regras.resultadoObrigatorio).toBe(true);
    });

    test('retorna workspace por-projeto', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://manifest'].readCallback(new URL('agentmap://manifest'), {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.workspace).toBe('por-projeto');
    });

    test('retorna transporte stdio', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://manifest'].readCallback(new URL('agentmap://manifest'), {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.transporte).toBe('stdio');
    });

    test('URI e agentmap://manifest', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://manifest'].readCallback(new URL('agentmap://manifest'), {});
      expect(result.contents[0].uri).toBe('agentmap://manifest');
    });
  });

  describe('agentmap-projeto', () => {
    test('retorna erro quando nenhum projeto aberto', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://projeto'].readCallback(new URL('agentmap://projeto'), {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.sucesso).toBe(false);
      expect(data.codigoErro).toBe('NO_PROJECT_OPEN');
    });

    test('mensagem de erro menciona nenhum projeto aberto', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://projeto'].readCallback(new URL('agentmap://projeto'), {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.erro).toContain('Nenhum projeto aberto');
    });

    test('com projeto aberto retorna config', async () => {
      const env = criarProjetoTeste();
      try {
        const resources = (mcpServer as any)._registeredResources;
        const result = await resources['agentmap://projeto'].readCallback(new URL('agentmap://projeto'), {});
        const data = JSON.parse(result.contents[0].text);
        expect(data.sucesso).toBe(true);
        expect(data.dados).toBeDefined();
        expect(data.dados.id).toBe(env.projetoId);
      } finally {
        env.cleanup();
      }
    });

    test('com projeto aberto retorna nome do projeto', async () => {
      const env = criarProjetoTeste();
      try {
        const resources = (mcpServer as any)._registeredResources;
        const result = await resources['agentmap://projeto'].readCallback(new URL('agentmap://projeto'), {});
        const data = JSON.parse(result.contents[0].text);
        expect(data.dados.nome).toBe('Projeto Teste MCP');
      } finally {
        env.cleanup();
      }
    });

    test('URI e agentmap://projeto', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://projeto'].readCallback(new URL('agentmap://projeto'), {});
      expect(result.contents[0].uri).toBe('agentmap://projeto');
    });
  });

  describe('agentmap-onboarding', () => {
    test('retorna markdown', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://onboarding'].readCallback(new URL('agentmap://onboarding'), {});
      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toContain('# 🗺️ AgentMap — Onboarding');
    });

    test('contem instrucao para usar agentmap_descobrir', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://onboarding'].readCallback(new URL('agentmap://onboarding'), {});
      expect(result.contents[0].text).toContain('agentmap_descobrir');
    });

    test('contem instrucao para abrir projeto', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://onboarding'].readCallback(new URL('agentmap://onboarding'), {});
      expect(result.contents[0].text).toContain('agentmap_projetos_abrir');
    });

    test('contem secao de subscriptions', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://onboarding'].readCallback(new URL('agentmap://onboarding'), {});
      expect(result.contents[0].text).toContain('resources/subscribe');
    });

    test('com projeto aberto lista agentes', async () => {
      const env = criarProjetoTeste();
      try {
        const resources = (mcpServer as any)._registeredResources;
        const result = await resources['agentmap://onboarding'].readCallback(new URL('agentmap://onboarding'), {});
        expect(result.contents[0].text).toContain('🤖 Agentes ativos');
      } finally {
        env.cleanup();
      }
    });
  });

  describe('agentmap-playbook', () => {
    test('retorna markdown', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://playbook'].readCallback(new URL('agentmap://playbook'), {});
      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toContain('# 📚 AgentMap — Playbook');
    });

    test('contem Ciclo 1 onboarding', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://playbook'].readCallback(new URL('agentmap://playbook'), {});
      expect(result.contents[0].text).toContain('Ciclo 1');
    });

    test('contem Ciclo 2 iniciar trabalho', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://playbook'].readCallback(new URL('agentmap://playbook'), {});
      expect(result.contents[0].text).toContain('Ciclo 2');
    });

    test('contem Ciclo 3 handoff', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://playbook'].readCallback(new URL('agentmap://playbook'), {});
      expect(result.contents[0].text).toContain('Ciclo 3');
    });

    test('contem regras obrigatorias', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://playbook'].readCallback(new URL('agentmap://playbook'), {});
      expect(result.contents[0].text).toContain('Regras obrigatórias');
    });

    test('URI e agentmap://playbook', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://playbook'].readCallback(new URL('agentmap://playbook'), {});
      expect(result.contents[0].uri).toBe('agentmap://playbook');
    });
  });

  describe('agentmap-guia-eficacia', () => {
    test('retorna markdown', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://guia-eficacia'].readCallback(new URL('agentmap://guia-eficacia'), {});
      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toContain('# 🎯 AgentMap — Guia de Eficácia');
    });

    test('contem 5 Principios de Ouro', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://guia-eficacia'].readCallback(new URL('agentmap://guia-eficacia'), {});
      expect(result.contents[0].text).toContain('5 Princípios de Ouro');
    });

    test('contem Contexto primeiro', async () => {
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://guia-eficacia'].readCallback(new URL('agentmap://guia-eficacia'), {});
      expect(result.contents[0].text).toContain('Contexto primeiro');
    });

    test('arquivo guia-eficacia.md existe', async () => {
      const guiaPath = path.join(__dirname, '..', 'src', 'mcp-server', 'resources', 'guia-eficacia.md');
      expect(fs.existsSync(guiaPath)).toBe(true);
    });

    test('conteudo vem do arquivo', async () => {
      const guiaPath = path.join(__dirname, '..', 'src', 'mcp-server', 'resources', 'guia-eficacia.md');
      const fileContent = fs.readFileSync(guiaPath, 'utf-8');
      const resources = (mcpServer as any)._registeredResources;
      const result = await resources['agentmap://guia-eficacia'].readCallback(new URL('agentmap://guia-eficacia'), {});
      expect(result.contents[0].text).toBe(fileContent);
    });
  });
});
