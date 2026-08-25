import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { createApp } from '../src/app';
import { ProjetoService } from '../src/servicios/ProjetoService';
import { MonitoramentoService } from '../src/servicios/MonitoramentoService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';

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

describe('Integridade API — CRUD de regras e verificação', () => {
  const projectRoot = path.join(os.tmpdir(), 'agentmap-integridade-crud-test-' + Date.now());
  const PORTA = 3152;
  let server: http.Server;

  beforeAll((done) => {
    fs.mkdirSync(projectRoot, { recursive: true });
    const iaDirs = [
      'agentes', 'tarefas', 'dependencias', 'sessoes', 'resultados', 'pendencias', 'validacoes',
      'conflitos', 'reservas', 'checkpoints', 'aprendizados', 'responsabilidades', 'decisoes',
      'riscos', 'bloqueios', 'contexto', 'auditoria', 'solicitacoes', 'criterios', 'artefatos',
      'historico', 'estado', 'configuracao', 'contratos', 'procedimentos', 'permissoes', 'politicas',
      'git', 'qualidade', 'docs', 'conhecimento', 'problemas', 'instancias', 'eventos', 'handoffs',
      'integridade'
    ];
    for (const d of iaDirs) fs.mkdirSync(path.join(projectRoot, '.ia', d), { recursive: true });

    fs.writeFileSync(path.join(projectRoot, '.ia', 'configuracao', 'projeto.json'), JSON.stringify({
      id: 'proj-integridade-test', nome: 'Projeto Integridade Teste', descricao: '', versao: '1.0.0',
      estado: 'ativo', idioma: 'pt-BR', fusoHorario: 'America/Sao_Paulo',
      proprietario: { tipo: 'humano', nome: '' }, objetivos: [], escopo: { incluso: [], excluido: [] },
      tecnologias: { frontend: [], backend: [], android: [], bancoDeDados: [], infraestrutura: [], testes: [] },
      ambiente: 'desenvolvimento', arquiteturas: [], padroes: [], diretorios: {},
      configuracaoIa: { diretorio: '/.ia', contratoPrincipal: '/.ia/contratos/contrato-projeto.json', estadoAtual: '/.ia/estado/estado-atual.json' },
      datas: { criacao: new Date().toISOString(), ultimaAtualizacao: new Date().toISOString() }
    }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectRoot, '.ia', 'estado', 'estado-atual.json'), JSON.stringify({
      projetoId: 'proj-integridade-test', estado: 'em_desenvolvimento', fase: 'inicial', versao: '1.0.0',
      agentesAtivos: 0, tarefasAtivas: 0, tarefasBloqueadas: 0, ultimasAlteracoes: [], problemasConhecidos: 0,
      riscosAtivos: 0, decisoesRecentes: 0, contratosAlterados: 0, testes: { total: 0, aprovados: 0, reprovados: 0 },
      qualidade: { percentual: 0, pendenciasCriticas: 0 }, seguranca: { estado: 'nao_verificada', riscosCriticos: 0, riscosAltos: 0 }
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

    const fileService = new (require('../src/arquivos/FileService').FileService)(projectRoot);
    const auditoria = new (require('../src/servicios/AuditoriaService').AuditoriaService)(fileService);
    const esquemasPath = path.resolve(__dirname, '..', '..', 'esquemas');
    const validator = new SchemaValidator(esquemasPath);
    const monitoramento = new MonitoramentoService(fileService, auditoria, validator);
    const app = createApp(monitoramento);
    server = app.listen(PORTA, async () => {
      const res = await request({ hostname: '127.0.0.1', port: PORTA, path: `/api/projetos/${encodeURIComponent(projectRoot)}/abrir`, method: 'POST', body: {} });
      if (!res.data.sucesso) console.error('[test] falha ao abrir projeto:', res.data);
      done();
    });
  });

  afterAll((done) => {
    server.close(() => {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      done();
    });
  });

  const base = { hostname: '127.0.0.1', port: PORTA };

  test('GET /api/integridade verifica integridade (estado OK em projeto vazio)', async () => {
    const { status, data } = await request({ ...base, path: '/api/integridade', method: 'GET' });
    expect(status).toBe(200);
    expect(data.sucesso).toBe(true);
    expect(data.dados.estado).toBe('OK');
    expect(Array.isArray(data.dados.inconsistencias)).toBe(true);
  });

  test('POST /api/integridade/verificar re-verifica integridade', async () => {
    const { status, data } = await request({ ...base, path: '/api/integridade/verificar', method: 'POST' });
    expect(status).toBe(200);
    expect(data.sucesso).toBe(true);
    expect(data.dados.estado).toBe('OK');
  });

  test('POST /api/integridade/regras cria uma regra (201)', async () => {
    const { status, data } = await request({
      ...base, path: '/api/integridade/regras', method: 'POST',
      body: { nome: 'Tarefas devem ter agente', descricao: 'Toda tarefa precisa de agente responsável', entidade: 'TAREFA', severidade: 'ALTA', ativo: true }
    });
    expect(status).toBe(201);
    expect(data.sucesso).toBe(true);
    expect(data.dados.id).toMatch(/^REGINT-/);
    expect(data.dados.nome).toBe('Tarefas devem ter agente');
  });

  test('POST /api/integridade/regras valida campos obrigatórios (400)', async () => {
    const { status, data } = await request({ ...base, path: '/api/integridade/regras', method: 'POST', body: { descricao: '' } });
    expect(status).toBe(400);
    expect(data.sucesso).toBe(false);
  });

  test('GET /api/integridade/regras lista regras criadas', async () => {
    const { status, data } = await request({ ...base, path: '/api/integridade/regras', method: 'GET' });
    expect(status).toBe(200);
    expect(data.sucesso).toBe(true);
    expect(Array.isArray(data.dados)).toBe(true);
    expect(data.dados.length).toBeGreaterThanOrEqual(1);
    expect(data.dados[0].id).toMatch(/^REGINT-/);
  });

  test('PUT /api/integridade/regras/:id atualiza uma regra', async () => {
    const list = await request({ ...base, path: '/api/integridade/regras', method: 'GET' });
    const id = list.data.dados[0].id;
    const { status, data } = await request({
      ...base, path: `/api/integridade/regras/${id}`, method: 'PUT',
      body: { nome: 'Tarefas devem ter agente responsável', severidade: 'CRITICA' }
    });
    expect(status).toBe(200);
    expect(data.sucesso).toBe(true);
    expect(data.dados.nome).toBe('Tarefas devem ter agente responsável');
    expect(data.dados.severidade).toBe('CRITICA');
  });

  test('DELETE /api/integridade/regras/:id remove uma regra', async () => {
    const list = await request({ ...base, path: '/api/integridade/regras', method: 'GET' });
    const id = list.data.dados[0].id;
    const del = await request({ ...base, path: `/api/integridade/regras/${id}`, method: 'DELETE' });
    expect(del.status).toBe(200);
    expect(del.data.sucesso).toBe(true);
    const after = await request({ ...base, path: '/api/integridade/regras', method: 'GET' });
    expect(after.data.dados.find((r: any) => r.id === id)).toBeUndefined();
  });

  test('DELETE /api/integridade/regras remove todas as regras', async () => {
    await request({ ...base, path: '/api/integridade/regras', method: 'POST', body: { nome: 'R1', descricao: 'd' } });
    await request({ ...base, path: '/api/integridade/regras', method: 'POST', body: { nome: 'R2', descricao: 'd' } });
    const del = await request({ ...base, path: '/api/integridade/regras', method: 'DELETE' });
    expect(del.status).toBe(200);
    expect(del.data.sucesso).toBe(true);
    expect(del.data.dados).toBe(2);
    const after = await request({ ...base, path: '/api/integridade/regras', method: 'GET' });
    expect(after.data.dados.length).toBe(0);
  });
});
