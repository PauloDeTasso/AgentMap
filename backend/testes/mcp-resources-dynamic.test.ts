import { mcpServer, projetoService } from '../src/mcp-server/server';
import '../src/mcp-server/resources';
import '../src/mcp-server/resources/monitoramento-resource';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

function criarProjetoTeste() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentmap-mcp-dynamic-test-'));
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

describe('MCP dynamic resources', () => {
  beforeEach(() => {
    (projetoService as any).registro.projetoAtual = null;
    (projetoService as any).projetosAbertos.clear();
  });

  describe('agentmap-solicitacoes', () => {
    test('retorna erro para URI invalida', async () => {
      const templates = (mcpServer as any)._registeredResourceTemplates;
      const result = await templates['agentmap-solicitacoes'].readCallback(new URL('agentmap://solicitacoes/'), {}, {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.sucesso).toBe(false);
      expect(data.codigoErro).toBe('INVALID_URI');
    });

    test('retorna erro quando nenhum projeto aberto', async () => {
      const templates = (mcpServer as any)._registeredResourceTemplates;
      const result = await templates['agentmap-solicitacoes'].readCallback(new URL('agentmap://solicitacoes/AGT-1'), { agenteId: 'AGT-1' }, {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.sucesso).toBe(false);
      expect(data.codigoErro).toBe('NO_PROJECT_OPEN');
    });

    test('com projeto aberto retorna array vazio quando sem solicitacoes', async () => {
      const env = criarProjetoTeste();
      try {
        const templates = (mcpServer as any)._registeredResourceTemplates;
        const result = await templates['agentmap-solicitacoes'].readCallback(new URL('agentmap://solicitacoes/AGT-1'), { agenteId: 'AGT-1' }, {});
        const data = JSON.parse(result.contents[0].text);
        expect(data.sucesso).toBe(true);
        expect(Array.isArray(data.dados)).toBe(true);
        expect(data.dados).toHaveLength(0);
      } finally {
        env.cleanup();
      }
    });

    test('filtra por agenteResponsavel', async () => {
      const env = criarProjetoTeste();
      try {
        const solPath = path.join(env.tmpDir, '.ia', 'solicitacoes', 'solicitacoes.json');
        fs.writeFileSync(solPath, JSON.stringify({
          solicitacoes: [
            {
              id: 'ALT-001',
              titulo: 'Test',
              descricao: 'Test',
              agenteSolicitante: { id: 'AGT-1' },
              agenteResponsavel: { id: 'AGT-2' },
              alvo: { tipo: 'ARQUIVO', nome: 'test' },
              alteracao: { tipo: 'ADICAO', descricao: 'x', motivo: 'x', arquivosAfetados: [] },
              impactos: [],
              dependencias: [],
              prioridade: 'BAIXA',
              status: 'PENDENTE',
              requerAprovacao: false,
              aprovacao: { status: 'PENDENTE', agenteId: null, data: null, observacao: null },
              tarefaOrigem: null,
              datas: { criadaEm: new Date().toISOString(), atualizadaEm: null, concluidaEm: null },
              observacoes: null
            }
          ]
        }));

        const templates = (mcpServer as any)._registeredResourceTemplates;
        const result = await templates['agentmap-solicitacoes'].readCallback(new URL('agentmap://solicitacoes/AGT-2'), { agenteId: 'AGT-2' }, {});
        const data = JSON.parse(result.contents[0].text);
        expect(data.sucesso).toBe(true);
        expect(data.dados).toHaveLength(1);
        expect(data.dados[0].id).toBe('ALT-001');
      } finally {
        env.cleanup();
      }
    });

    test('filtra por agenteSolicitante', async () => {
      const env = criarProjetoTeste();
      try {
        const solPath = path.join(env.tmpDir, '.ia', 'solicitacoes', 'solicitacoes.json');
        fs.writeFileSync(solPath, JSON.stringify({
          solicitacoes: [
            {
              id: 'ALT-001',
              titulo: 'Test',
              descricao: 'Test',
              agenteSolicitante: { id: 'AGT-1' },
              agenteResponsavel: { id: 'AGT-2' },
              alvo: { tipo: 'ARQUIVO', nome: 'test' },
              alteracao: { tipo: 'ADICAO', descricao: 'x', motivo: 'x', arquivosAfetados: [] },
              impactos: [],
              dependencias: [],
              prioridade: 'BAIXA',
              status: 'PENDENTE',
              requerAprovacao: false,
              aprovacao: { status: 'PENDENTE', agenteId: null, data: null, observacao: null },
              tarefaOrigem: null,
              datas: { criadaEm: new Date().toISOString(), atualizadaEm: null, concluidaEm: null },
              observacoes: null
            }
          ]
        }));

        const templates = (mcpServer as any)._registeredResourceTemplates;
        const result = await templates['agentmap-solicitacoes'].readCallback(new URL('agentmap://solicitacoes/AGT-1'), { agenteId: 'AGT-1' }, {});
        const data = JSON.parse(result.contents[0].text);
        expect(data.sucesso).toBe(true);
        expect(data.dados).toHaveLength(1);
        expect(data.dados[0].id).toBe('ALT-001');
      } finally {
        env.cleanup();
      }
    });

    test('URI aparece no resultado', async () => {
      const env = criarProjetoTeste();
      try {
        const templates = (mcpServer as any)._registeredResourceTemplates;
        const result = await templates['agentmap-solicitacoes'].readCallback(new URL('agentmap://solicitacoes/AGT-1'), { agenteId: 'AGT-1' }, {});
        expect(result.contents[0].uri).toBe('agentmap://solicitacoes/AGT-1');
      } finally {
        env.cleanup();
      }
    });
  });

  describe('agentmap-handoffs', () => {
    test('retorna erro para URI invalida', async () => {
      const templates = (mcpServer as any)._registeredResourceTemplates;
      const result = await templates['agentmap-handoffs'].readCallback(new URL('agentmap://handoffs/'), {}, {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.sucesso).toBe(false);
      expect(data.codigoErro).toBe('INVALID_URI');
    });

    test('retorna erro quando nenhum projeto aberto', async () => {
      const templates = (mcpServer as any)._registeredResourceTemplates;
      const result = await templates['agentmap-handoffs'].readCallback(new URL('agentmap://handoffs/AGT-1'), { agenteId: 'AGT-1' }, {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.sucesso).toBe(false);
      expect(data.codigoErro).toBe('NO_PROJECT_OPEN');
    });

    test('com projeto aberto retorna array vazio quando sem handoffs', async () => {
      const env = criarProjetoTeste();
      try {
        const templates = (mcpServer as any)._registeredResourceTemplates;
        const result = await templates['agentmap-handoffs'].readCallback(new URL('agentmap://handoffs/AGT-1'), { agenteId: 'AGT-1' }, {});
        const data = JSON.parse(result.contents[0].text);
        expect(data.sucesso).toBe(true);
        expect(Array.isArray(data.dados)).toBe(true);
        expect(data.dados).toHaveLength(0);
      } finally {
        env.cleanup();
      }
    });

    test('retorna handoffs filtrados por destino', async () => {
      const env = criarProjetoTeste();
      try {
        const handoffsPath = path.join(env.tmpDir, '.ia', 'handoffs', 'handoffs.json');
        fs.writeFileSync(handoffsPath, JSON.stringify({
          handoffs: [
            {
              id: 'HOF-001',
              origem: 'AGT-1',
              destino: 'AGT-2',
              tarefaId: null,
              resumo: 'Handoff teste',
              concluido: [],
              pendente: [],
              artefatos: [],
              decisoes: [],
              alteracoes: [],
              riscos: [],
              bloqueios: [],
              observacoes: null,
              estado: 'PENDENTE',
              datas: { criadaEm: new Date().toISOString(), criacao: null, aceitaEm: null, concluidaEm: null }
            }
          ]
        }));

        const templates = (mcpServer as any)._registeredResourceTemplates;
        const result = await templates['agentmap-handoffs'].readCallback(new URL('agentmap://handoffs/AGT-2'), { agenteId: 'AGT-2' }, {});
        const data = JSON.parse(result.contents[0].text);
        expect(data.sucesso).toBe(true);
        expect(data.dados).toHaveLength(1);
        expect(data.dados[0].id).toBe('HOF-001');
      } finally {
        env.cleanup();
      }
    });

    test('URI aparece no resultado', async () => {
      const env = criarProjetoTeste();
      try {
        const templates = (mcpServer as any)._registeredResourceTemplates;
        const result = await templates['agentmap-handoffs'].readCallback(new URL('agentmap://handoffs/AGT-1'), { agenteId: 'AGT-1' }, {});
        expect(result.contents[0].uri).toBe('agentmap://handoffs/AGT-1');
      } finally {
        env.cleanup();
      }
    });
  });

  describe('agentmap-bloqueios', () => {
    test('retorna erro para URI invalida', async () => {
      const templates = (mcpServer as any)._registeredResourceTemplates;
      const result = await templates['agentmap-bloqueios'].readCallback(new URL('agentmap://bloqueios/'), {}, {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.sucesso).toBe(false);
      expect(data.codigoErro).toBe('INVALID_URI');
    });

    test('retorna erro quando nenhum projeto aberto', async () => {
      const templates = (mcpServer as any)._registeredResourceTemplates;
      const result = await templates['agentmap-bloqueios'].readCallback(new URL('agentmap://bloqueios/PROJ-1'), { projetoId: 'PROJ-1' }, {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.sucesso).toBe(false);
      expect(data.codigoErro).toBe('NO_PROJECT_OPEN');
    });

    test('com projeto aberto retorna array vazio quando sem bloqueios', async () => {
      const env = criarProjetoTeste();
      try {
        const templates = (mcpServer as any)._registeredResourceTemplates;
        const result = await templates['agentmap-bloqueios'].readCallback(new URL('agentmap://bloqueios/PROJ-1'), { projetoId: 'PROJ-1' }, {});
        const data = JSON.parse(result.contents[0].text);
        expect(data.sucesso).toBe(true);
        expect(Array.isArray(data.dados)).toBe(true);
        expect(data.dados).toHaveLength(0);
      } finally {
        env.cleanup();
      }
    });

    test('retorna bloqueios do projeto', async () => {
      const env = criarProjetoTeste();
      try {
        const bloqueiosPath = path.join(env.tmpDir, '.ia', 'estado', 'bloqueios.json');
        fs.writeFileSync(bloqueiosPath, JSON.stringify({
          bloqueios: [
            {
              id: 'BLOQ-001',
              tarefaId: 'TAR-001',
              tipo: 'TECNICO',
              gravidade: 'ALTA',
              descricao: 'Teste',
              origem: 'test',
              responsavelResolucao: 'test',
              estado: 'ATIVO',
              criadoEm: new Date().toISOString(),
              resolvidoEm: null
            }
          ]
        }));

        const templates = (mcpServer as any)._registeredResourceTemplates;
        const result = await templates['agentmap-bloqueios'].readCallback(new URL('agentmap://bloqueios/PROJ-1'), { projetoId: 'PROJ-1' }, {});
        const data = JSON.parse(result.contents[0].text);
        expect(data.sucesso).toBe(true);
        expect(data.dados).toHaveLength(1);
        expect(data.dados[0].id).toBe('BLOQ-001');
      } finally {
        env.cleanup();
      }
    });

    test('URI aparece no resultado', async () => {
      const env = criarProjetoTeste();
      try {
        const templates = (mcpServer as any)._registeredResourceTemplates;
        const result = await templates['agentmap-bloqueios'].readCallback(new URL('agentmap://bloqueios/PROJ-1'), { projetoId: 'PROJ-1' }, {});
        expect(result.contents[0].uri).toBe('agentmap://bloqueios/PROJ-1');
      } finally {
        env.cleanup();
      }
    });
  });

  describe('agentmap-monitoramento-mensagens', () => {
    test('URI invalida faz fallback para projeto atual', async () => {
      const env = criarProjetoTeste();
      try {
        const templates = (mcpServer as any)._registeredResourceTemplates;
        const result = await templates['agentmap-monitoramento-mensagens'].readCallback(new URL('agentmap://monitoramento/invalid'), {}, {});
        const data = JSON.parse(result.contents[0].text);
        expect(data.sucesso).toBe(true);
        expect(data.dados.projetoId).toBe(env.projetoId);
      } finally {
        env.cleanup();
      }
    });

    test('retorna erro quando nenhum projeto aberto', async () => {
      const templates = (mcpServer as any)._registeredResourceTemplates;
      const result = await templates['agentmap-monitoramento-mensagens'].readCallback(new URL('agentmap://monitoramento/mensagens/PROJ-1'), { projetoId: 'PROJ-1' }, {});
      const data = JSON.parse(result.contents[0].text);
      expect(data.sucesso).toBe(false);
      expect(data.codigoErro).toBe('NO_PROJECT_OPEN');
    });

    test('com projeto aberto retorna mensagens vazias quando nao ha mensagens', async () => {
      const env = criarProjetoTeste();
      try {
        const templates = (mcpServer as any)._registeredResourceTemplates;
        const result = await templates['agentmap-monitoramento-mensagens'].readCallback(new URL('agentmap://monitoramento/mensagens'), {}, {});
        const data = JSON.parse(result.contents[0].text);
        expect(data.sucesso).toBe(true);
        expect(data.dados.total).toBe(0);
        expect(Array.isArray(data.dados.mensagens)).toBe(true);
      } finally {
        env.cleanup();
      }
    });

    test('retorna mensagens relevantes', async () => {
      const env = criarProjetoTeste();
      try {
        const mensagensPath = path.join(env.tmpDir, '.ia', 'contexto', 'mensagens-monitoramento.json');
        fs.writeFileSync(mensagensPath, JSON.stringify([
          {
            id: 'MSG-001',
            timestamp: new Date().toISOString(),
            tipo: 'KILO_CHAT',
            emissor: 'sistema',
            agenteId: 'AGT-1',
            tarefaId: null,
            conteudo: 'Hello',
            progresso: undefined,
            dados: undefined,
            acoes: undefined,
            modo: undefined,
            eventSequence: 1
          },
          {
            id: 'MSG-002',
            timestamp: new Date().toISOString(),
            tipo: 'OUTRO_TIPO',
            emissor: 'sistema',
            agenteId: 'AGT-1',
            tarefaId: null,
            conteudo: 'Ignore',
            progresso: undefined,
            dados: undefined,
            acoes: undefined,
            modo: undefined,
            eventSequence: 2
          }
        ]));

        const templates = (mcpServer as any)._registeredResourceTemplates;
        const result = await templates['agentmap-monitoramento-mensagens'].readCallback(new URL('agentmap://monitoramento/mensagens'), {}, {});
        const data = JSON.parse(result.contents[0].text);
        expect(data.sucesso).toBe(true);
        expect(data.dados.total).toBe(1);
        expect(data.dados.mensagens[0].tipo).toBe('KILO_CHAT');
      } finally {
        env.cleanup();
      }
    });

    test('fallback para projetoId atual quando URI nao contem projetoId', async () => {
      const env = criarProjetoTeste();
      try {
        const mensagensPath = path.join(env.tmpDir, '.ia', 'contexto', 'mensagens-monitoramento.json');
        fs.writeFileSync(mensagensPath, JSON.stringify([
          {
            id: 'MSG-001',
            timestamp: new Date().toISOString(),
            tipo: 'KILO_CHAT',
            emissor: 'sistema',
            agenteId: 'AGT-1',
            tarefaId: null,
            conteudo: 'Hello',
            progresso: undefined,
            dados: undefined,
            acoes: undefined,
            modo: undefined,
            eventSequence: 1
          }
        ]));

        const templates = (mcpServer as any)._registeredResourceTemplates;
        const result = await templates['agentmap-monitoramento-mensagens'].readCallback(new URL('agentmap://monitoramento/mensagens'), {}, {});
        const data = JSON.parse(result.contents[0].text);
        expect(data.sucesso).toBe(true);
        expect(data.dados.projetoId).toBe(env.projetoId);
      } finally {
        env.cleanup();
      }
    });

    test('URI aparece no resultado', async () => {
      const env = criarProjetoTeste();
      try {
        const templates = (mcpServer as any)._registeredResourceTemplates;
        const result = await templates['agentmap-monitoramento-mensagens'].readCallback(new URL('agentmap://monitoramento/mensagens/PROJ-1'), { projetoId: 'PROJ-1' }, {});
        expect(result.contents[0].uri).toBe('agentmap://monitoramento/mensagens/PROJ-1');
      } finally {
        env.cleanup();
      }
    });
  });
});
