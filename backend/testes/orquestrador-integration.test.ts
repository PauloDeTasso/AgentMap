import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { createApp } from '../src/app';
import { ProjetoService } from '../src/servicios/ProjetoService';
import { MonitoramentoService } from '../src/servicios/MonitoramentoService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { loadSettings } from '../src/config';
import { criarServicos } from '../src/api/middleware';

async function request(options: { hostname: string; port: number; path: string; method?: string; body?: any }): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, `http://${options.hostname}:${options.port}`);
    const body = options.body ? JSON.stringify(options.body) : null;
    const req = http.request({
      hostname: options.hostname,
      port: options.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
      }
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf-8');
        try {
          const data = JSON.parse(text);
          resolve({ status: res.statusCode!, data });
        } catch {
          resolve({ status: res.statusCode!, data: text });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

describe('Orquestrador API — testes de integração', () => {
  const projectRoot = path.join(os.tmpdir(), 'agentmap-orquestrador-api-test-' + Date.now());
  fs.mkdirSync(projectRoot, { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'instancias'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'eventos'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'handoffs'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'tarefas'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'dependencias'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'sessoes'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'resultados'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'pendencias'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'validacoes'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'conflitos'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'reservas'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'checkpoints'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'aprendizados'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'responsabilidades'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'decisoes'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'riscos'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'bloqueios'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'contexto'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'auditoria'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'solicitacoes'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'criterios'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'artefatos'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'historico'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'estado'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'configuracao'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'agentes'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'contratos'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'procedimentos'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'permissoes'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'politicas'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'git'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'qualidade'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'docs'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'conhecimento'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'problemas'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'decisoes'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.ia', 'riscos'), { recursive: true });

  fs.writeFileSync(path.join(projectRoot, '.ia', 'configuracao', 'projeto.json'), JSON.stringify({
    id: 'proj-orquestrador-test',
    nome: 'Projeto Orquestrador Teste',
    descricao: '',
    versao: '1.0.0',
    estado: 'ativo',
    idioma: 'pt-BR',
    fusoHorario: 'America/Sao_Paulo',
    proprietario: { tipo: 'humano', nome: '' },
    objetivos: [],
    escopo: { incluso: [], excluido: [] },
    tecnologias: { frontend: [], backend: [], android: [], bancoDeDados: [], infraestrutura: [], testes: [] },
    ambiente: 'desenvolvimento',
    arquiteturas: [],
    padroes: [],
    diretorios: {},
    configuracaoIa: { diretorio: '/.ia', contratoPrincipal: '/.ia/contratos/contrato-projeto.json', estadoAtual: '/.ia/estado/estado-atual.json' },
    datas: { criacao: new Date().toISOString(), ultimaAtualizacao: new Date().toISOString() }
  }, null, 2), 'utf-8');

  fs.writeFileSync(path.join(projectRoot, '.ia', 'configuracao', 'gerenciador.json'), JSON.stringify({
    nome: 'Gerenciador Local de Agentes de IA',
    versao: '1.0.0',
    modo: 'local',
    idioma: 'pt-BR',
    formatoDados: 'json',
    controleVersao: 'git',
    requerAprovacaoHumana: true,
    registroAuditoria: true,
    controlePermissoes: true,
    controleContexto: true,
    controleDependencias: true,
    controleConflitos: true,
    controleContratos: true,
    controleQualidade: true,
    controleSeguranca: true,
    ambientes: ['desenvolvimento', 'homologacao', 'producao'],
    estadosTarefa: ['RASCUNHO', 'PLANEJADA', 'PRONTA', 'EM_EXECUCAO', 'EM_TESTE', 'EM_REVISAO', 'AGUARDANDO_APROVACAO', 'CONCLUIDA', 'BLOQUEADA', 'CANCELADA', 'REJEITADA']
  }, null, 2), 'utf-8');

  fs.writeFileSync(path.join(projectRoot, '.ia', 'configuracao', 'ambiente.json'), JSON.stringify({
    ambientes: [
      { id: 'dev', nome: 'Desenvolvimento', tipo: 'local', permitirAlteracaoCodigo: true, permitirTestes: true, permitirImplantacao: false, permitirAcessoProducao: false }
    ]
  }, null, 2), 'utf-8');

  fs.writeFileSync(path.join(projectRoot, '.ia', 'estado', 'estado-atual.json'), JSON.stringify({
    projetoId: 'proj-orquestrador-test',
    estado: 'em_desenvolvimento',
    fase: 'inicial',
    versao: '1.0.0',
    agentesAtivos: 0,
    tarefasAtivas: 0,
    tarefasBloqueadas: 0,
    ultimasAlteracoes: [],
    problemasConhecidos: 0,
    riscosAtivos: 0,
    decisoesRecentes: 0,
    contratosAlterados: 0,
    testes: { total: 0, aprovados: 0, reprovados: 0 },
    qualidade: { percentual: 0, pendenciasCriticas: 0 },
    seguranca: { estado: 'nao_verificada', riscosCriticos: 0, riscosAltos: 0 }
  }, null, 2), 'utf-8');

  fs.writeFileSync(path.join(projectRoot, '.ia', 'tarefas', 'tarefas.json'), JSON.stringify({ tarefas: [], estatisticas: {} }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'dependencias', 'dependencias.json'), JSON.stringify({ dependencias: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'handoffs', 'handoffs.json'), JSON.stringify({ handoffs: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'eventos', 'eventos.json'), JSON.stringify({ eventos: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'instancias', 'instancias.json'), JSON.stringify({ instancias: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'sessoes', 'sessoes.json'), JSON.stringify({ sessoes: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'resultados', 'resultados.json'), JSON.stringify({ resultados: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'pendencias', 'pendencias.json'), JSON.stringify({ pendencias: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'validacoes', 'validacoes.json'), JSON.stringify({ validacoes: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'conflitos', 'conflitos.json'), JSON.stringify({ conflitos: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'reservas', 'reservas.json'), JSON.stringify({ reservas: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'checkpoints', 'checkpoints.json'), JSON.stringify({ checkpoints: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'aprendizados', 'aprendizados.json'), JSON.stringify({ aprendizados: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'responsabilidades', 'responsabilidades.json'), JSON.stringify({ responsabilidades: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'decisoes', 'decisoes.json'), JSON.stringify({ decisoes: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'riscos', 'riscos.json'), JSON.stringify({ riscos: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'bloqueios', 'bloqueios.json'), JSON.stringify({ bloqueios: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'auditoria', 'eventos.json'), JSON.stringify({ eventos: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'solicitacoes', 'solicitacoes.json'), JSON.stringify({ solicitacoes: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'criterios', 'criterios.json'), JSON.stringify({ criterios: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'artefatos', 'artefatos.json'), JSON.stringify({ artefatos: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'historico', 'historico.json'), JSON.stringify({ eventos: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'agentes', 'agentes.json'), JSON.stringify({ agentes: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'contratos', 'contratos.json'), JSON.stringify({ contratos: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'procedimentos', 'procedimentos.json'), JSON.stringify({ procedimentos: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'permissoes', 'permissoes.json'), JSON.stringify({ permissoes: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'politicas', 'politicas.json'), JSON.stringify({ politicas: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'git', 'estado-git.json'), JSON.stringify({ commits: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'qualidade', 'criterios.json'), JSON.stringify({ criterios: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'qualidade', 'testes.json'), JSON.stringify({ testes: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'qualidade', 'revisoes.json'), JSON.stringify({ revisoes: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'conhecimento', 'conhecimento.json'), JSON.stringify({ conhecimentos: [] }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectRoot, '.ia', 'problemas', 'problemas.json'), JSON.stringify({ problemas: [] }, null, 2), 'utf-8');

  const settings = loadSettings();
  const PORTA = 3151;
  const fsMock = {
    lerJson: (p: string) => {
      if (p.includes('monitoramento.json')) return { sucesso: true, dados: { modoGlobal: 'MANUAL', ultimaAtualizacao: new Date().toISOString(), timeoutHeartbeat: 30000 } };
      if (p.includes('mensagens-monitoramento.json')) return { sucesso: true, dados: [] };
      if (p.includes('monitoramento-sequence.json')) return { sucesso: true, dados: { ultimoSequence: 0 } };
      return { sucesso: true, dados: {} };
    },
    escreverJson: () => ({ sucesso: true }),
    excluir: () => ({ sucesso: true })
  };
  const monitoramento = new MonitoramentoService(fsMock as any, null as any, null as any);
  const esquemasPath = path.resolve(__dirname, '..', '..', 'esquemas');
  const validator = new SchemaValidator(esquemasPath);
  const projetoService = new ProjetoService(validator);
  const projetoResult = projetoService.abrirProjeto(projectRoot);
  if (!projetoResult.sucesso || !projetoResult.dados) {
    throw new Error('[test] falha ao abrir projeto: ' + (projetoResult.erro || 'unknown'));
  }
  const servicos = criarServicos(projetoResult.dados);
  const app = createApp(servicos, projetoService);
  const server = app.listen(PORTA, async () => {
    console.log(`[test] Projeto de teste aberto em http://localhost:${PORTA}`);
  });

  afterAll(() => {
    server.close();
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  test('GET /api/orquestrador/status retorna status do orquestrador', async () => {
    const { status, data } = await request({ hostname: '127.0.0.1', port: PORTA, path: '/api/orquestrador/status', method: 'GET' });
    expect(status).toBe(200);
    expect(data.sucesso).toBe(true);
    expect(data.dados.daemonMappings).toBeDefined();
    expect(data.dados.logsRecentes).toBeDefined();
  });

  test('POST /api/orquestrador/dispatch sem body retorna 400', async () => {
    const { status, data } = await request({ hostname: '127.0.0.1', port: PORTA, path: '/api/orquestrador/dispatch', method: 'POST', body: {} });
    expect(status).toBe(400);
    expect(data.sucesso).toBe(false);
  });

  test('POST /api/orquestrador/dispatch com tarefa inexistente retorna erro', async () => {
    const { status, data } = await request({
      hostname: '127.0.0.1',
      port: PORTA,
      path: '/api/orquestrador/dispatch',
      method: 'POST',
      body: { tarefaId: 'TAR-9999', mensagem: 'teste', dir: projectRoot }
    });
    expect(status).toBe(400);
    expect(data.sucesso).toBe(false);
    expect(data.codigoErro).toBe('TASK_NOT_FOUND');
  });

  test('POST /api/orquestrador/recuperar retorna status de recuperação', async () => {
    const { status, data } = await request({ hostname: '127.0.0.1', port: PORTA, path: '/api/orquestrador/recuperar', method: 'POST' });
    expect(status).toBe(200);
    expect(data.sucesso).toBe(true);
    expect(data.dados.daemonsVerificados).toBeDefined();
  });

  test('PUT /api/orquestrador/instancias/:id/modo sem modo retorna 400', async () => {
    const { status, data } = await request({
      hostname: '127.0.0.1',
      port: PORTA,
      path: '/api/orquestrador/instancias/INS-9999/modo',
      method: 'PUT',
      body: {}
    });
    expect(status).toBe(400);
    expect(data.sucesso).toBe(false);
  });
});
