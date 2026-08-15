import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { FileService } from '../src/arquivos/FileService';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { AuditoriaService } from '../src/servicios/AuditoriaService';
import { MonitoramentoService } from '../src/servicios/MonitoramentoService';
import { TarefaService } from '../src/servicios/TarefaService';

describe('MonitoramentoService', () => {
  const projectRoot = path.join(os.tmpdir(), 'agentmap-monitoramento-test-' + Date.now());
  fs.mkdirSync(projectRoot, { recursive: true });

  const iaDir = path.join(projectRoot, '.ia');
  fs.mkdirSync(path.join(iaDir, 'tarefas'), { recursive: true });
  fs.mkdirSync(path.join(iaDir, 'sessoes'), { recursive: true });
  fs.mkdirSync(path.join(iaDir, 'agentes'), { recursive: true });
  fs.mkdirSync(path.join(iaDir, 'auditoria'), { recursive: true });

  const fsSvc = new FileService(projectRoot);
  const validator = new SchemaValidator(path.resolve(__dirname, '..', '..', 'esquemas'));
  const auditoria = new AuditoriaService(fsSvc);
  const monitoramento = new MonitoramentoService(fsSvc, auditoria);
  const tarefaService = new TarefaService(fsSvc, auditoria, validator);

  beforeAll(() => {
    fs.writeFileSync(path.join(iaDir, 'tarefas', 'tarefas.json'), JSON.stringify({ tarefas: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(iaDir, 'sessoes', 'sessoes.json'), JSON.stringify({ sessoes: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(iaDir, 'agentes', 'agentes.json'), JSON.stringify({ agentes: [] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(iaDir, 'auditoria', 'eventos.json'), JSON.stringify({ eventos: [] }, null, 2), 'utf-8');
  });

  afterAll(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  test('retorna vazio quando não há tarefas em EM_EXECUCAO', async () => {
    const tarefa = await tarefaService.criar({
      titulo: 'Tarefa normal',
      descricao: '',
      objetivo: 'Objetivo',
      tipo: 'desenvolvimento',
      prioridade: 'media',
      agenteResponsavel: 'AGT-001',
      dominio: 'backend',
      ambiente: 'desenvolvimento',
      dependencias: [],
      contratosObrigatorios: [],
      procedimentosObrigatorios: [],
      arquivosPermitidos: [],
      arquivosProibidos: [],
      contextoNecessario: [],
      criteriosAceitacao: [],
      testesObrigatorios: [],
      riscos: [],
      restricoes: [],
      condicoesDeParada: [],
      criteriosConclusao: []
    } as any);
    expect(tarefa.sucesso).toBe(true);
    await tarefaService.alterarEstado(tarefa.dados!.id, 'PLANEJADA');
    await tarefaService.alterarEstado(tarefa.dados!.id, 'PRONTA');

    const result = monitoramento.verificarOrfaos('PROJ-001');
    expect(result.sucesso).toBe(true);
    expect(result.dados).toEqual([]);
  });

  test('detecta tarefa órfã sem sessão ativa', async () => {
    const tarefa = await tarefaService.criar({
      titulo: 'Tarefa órfã',
      descricao: '',
      objetivo: 'Objetivo',
      tipo: 'desenvolvimento',
      prioridade: 'media',
      agenteResponsavel: 'AGT-001',
      dominio: 'backend',
      ambiente: 'desenvolvimento',
      dependencias: [],
      contratosObrigatorios: [],
      procedimentosObrigatorios: [],
      arquivosPermitidos: [],
      arquivosProibidos: [],
      contextoNecessario: [],
      criteriosAceitacao: [],
      testesObrigatorios: [],
      riscos: [],
      restricoes: [],
      condicoesDeParada: [],
      criteriosConclusao: []
    } as any);
    expect(tarefa.sucesso).toBe(true);
    await tarefaService.alterarEstado(tarefa.dados!.id, 'PLANEJADA');
    await tarefaService.alterarEstado(tarefa.dados!.id, 'PRONTA');
    const execResult = await tarefaService.alterarEstado(tarefa.dados!.id, 'EM_EXECUCAO');
    expect(execResult.sucesso).toBe(true);

    const result = monitoramento.verificarOrfaos('PROJ-001');
    expect(result.sucesso).toBe(true);
    expect(result.dados).toContain(tarefa.dados!.id);
  });

  test('não detecta órfã quando há sessão ativa', async () => {
    const tarefa = await tarefaService.criar({
      titulo: 'Tarefa com sessão',
      descricao: '',
      objetivo: 'Objetivo',
      tipo: 'desenvolvimento',
      prioridade: 'media',
      agenteResponsavel: 'AGT-002',
      dominio: 'backend',
      ambiente: 'desenvolvimento',
      dependencias: [],
      contratosObrigatorios: [],
      procedimentosObrigatorios: [],
      arquivosPermitidos: [],
      arquivosProibidos: [],
      contextoNecessario: [],
      criteriosAceitacao: [],
      testesObrigatorios: [],
      riscos: [],
      restricoes: [],
      condicoesDeParada: [],
      criteriosConclusao: []
    } as any);
    expect(tarefa.sucesso).toBe(true);
    await tarefaService.alterarEstado(tarefa.dados!.id, 'PLANEJADA');
    await tarefaService.alterarEstado(tarefa.dados!.id, 'PRONTA');
    const execResult = await tarefaService.alterarEstado(tarefa.dados!.id, 'EM_EXECUCAO');
    expect(execResult.sucesso).toBe(true);

    const sessoesPath = path.join(iaDir, 'sessoes', 'sessoes.json');
    const sessoesData = JSON.parse(fs.readFileSync(sessoesPath, 'utf-8'));
    sessoesData.sessoes.push({
      id: 'SES-2026-00001',
      agenteId: 'AGT-002',
      tarefaId: tarefa.dados!.id,
      projetoId: 'PROJ-001',
      contextoConsultado: {},
      registrosProduzidos: [],
      estadoFinal: '',
      datas: { inicio: new Date().toISOString(), fim: null }
    });
    fs.writeFileSync(sessoesPath, JSON.stringify(sessoesData, null, 2), 'utf-8');

    const result = monitoramento.verificarOrfaos('PROJ-001');
    expect(result.sucesso).toBe(true);
    expect(result.dados).not.toContain(tarefa.dados!.id);
  });

  test('não detecta órfã quando sessão está finalizada', async () => {
    const tarefa = await tarefaService.criar({
      titulo: 'Tarefa com sessão finalizada',
      descricao: '',
      objetivo: 'Objetivo',
      tipo: 'desenvolvimento',
      prioridade: 'media',
      agenteResponsavel: 'AGT-003',
      dominio: 'backend',
      ambiente: 'desenvolvimento',
      dependencias: [],
      contratosObrigatorios: [],
      procedimentosObrigatorios: [],
      arquivosPermitidos: [],
      arquivosProibidos: [],
      contextoNecessario: [],
      criteriosAceitacao: [],
      testesObrigatorios: [],
      riscos: [],
      restricoes: [],
      condicoesDeParada: [],
      criteriosConclusao: []
    } as any);
    expect(tarefa.sucesso).toBe(true);
    await tarefaService.alterarEstado(tarefa.dados!.id, 'PLANEJADA');
    await tarefaService.alterarEstado(tarefa.dados!.id, 'PRONTA');
    const execResult = await tarefaService.alterarEstado(tarefa.dados!.id, 'EM_EXECUCAO');
    expect(execResult.sucesso).toBe(true);

    const sessoesPath = path.join(iaDir, 'sessoes', 'sessoes.json');
    const sessoesData = JSON.parse(fs.readFileSync(sessoesPath, 'utf-8'));
    sessoesData.sessoes.push({
      id: 'SES-2026-00002',
      agenteId: 'AGT-003',
      tarefaId: tarefa.dados!.id,
      projetoId: 'PROJ-001',
      contextoConsultado: {},
      registrosProduzidos: [],
      estadoFinal: 'CONCLUIDA',
      datas: { inicio: new Date().toISOString(), fim: new Date().toISOString() }
    });
    fs.writeFileSync(sessoesPath, JSON.stringify(sessoesData, null, 2), 'utf-8');

    const result = monitoramento.verificarOrfaos('PROJ-001');
    expect(result.sucesso).toBe(true);
    expect(result.dados).toContain(tarefa.dados!.id);
  });

  test('detecta múltiplos órfãos', async () => {
    const t1 = await tarefaService.criar({
      titulo: 'Órfão 1',
      descricao: '',
      objetivo: 'Objetivo',
      tipo: 'desenvolvimento',
      prioridade: 'media',
      agenteResponsavel: 'AGT-004',
      dominio: 'backend',
      ambiente: 'desenvolvimento',
      dependencias: [],
      contratosObrigatorios: [],
      procedimentosObrigatorios: [],
      arquivosPermitidos: [],
      arquivosProibidos: [],
      contextoNecessario: [],
      criteriosAceitacao: [],
      testesObrigatorios: [],
      riscos: [],
      restricoes: [],
      condicoesDeParada: [],
      criteriosConclusao: []
    } as any);
    expect(t1.sucesso).toBe(true);
    await tarefaService.alterarEstado(t1.dados!.id, 'PLANEJADA');
    await tarefaService.alterarEstado(t1.dados!.id, 'PRONTA');
    const exec1 = await tarefaService.alterarEstado(t1.dados!.id, 'EM_EXECUCAO');
    expect(exec1.sucesso).toBe(true);

    const t2 = await tarefaService.criar({
      titulo: 'Órfão 2',
      descricao: '',
      objetivo: 'Objetivo',
      tipo: 'desenvolvimento',
      prioridade: 'media',
      agenteResponsavel: 'AGT-005',
      dominio: 'backend',
      ambiente: 'desenvolvimento',
      dependencias: [],
      contratosObrigatorios: [],
      procedimentosObrigatorios: [],
      arquivosPermitidos: [],
      arquivosProibidos: [],
      contextoNecessario: [],
      criteriosAceitacao: [],
      testesObrigatorios: [],
      riscos: [],
      restricoes: [],
      condicoesDeParada: [],
      criteriosConclusao: []
    } as any);
    expect(t2.sucesso).toBe(true);
    await tarefaService.alterarEstado(t2.dados!.id, 'PLANEJADA');
    await tarefaService.alterarEstado(t2.dados!.id, 'PRONTA');
    const exec2 = await tarefaService.alterarEstado(t2.dados!.id, 'EM_EXECUCAO');
    expect(exec2.sucesso).toBe(true);

    const result = monitoramento.verificarOrfaos('PROJ-001');
    expect(result.sucesso).toBe(true);
    expect(result.dados).toContain(t1.dados!.id);
    expect(result.dados).toContain(t2.dados!.id);
  });

  test('ignora tarefas em outros estados', async () => {
    const pronta = await tarefaService.criar({
      titulo: 'Tarefa pronta',
      descricao: '',
      objetivo: 'Objetivo',
      tipo: 'desenvolvimento',
      prioridade: 'media',
      agenteResponsavel: 'AGT-006',
      dominio: 'backend',
      ambiente: 'desenvolvimento',
      dependencias: [],
      contratosObrigatorios: [],
      procedimentosObrigatorios: [],
      arquivosPermitidos: [],
      arquivosProibidos: [],
      contextoNecessario: [],
      criteriosAceitacao: [],
      testesObrigatorios: [],
      riscos: [],
      restricoes: [],
      condicoesDeParada: [],
      criteriosConclusao: []
    } as any);
    expect(pronta.sucesso).toBe(true);
    await tarefaService.alterarEstado(pronta.dados!.id, 'PLANEJADA');
    await tarefaService.alterarEstado(pronta.dados!.id, 'PRONTA');

    const result = monitoramento.verificarOrfaos('PROJ-001');
    expect(result.sucesso).toBe(true);
    expect(result.dados).not.toContain(pronta.dados!.id);
  });
});
