import { TRANSICOES_ESTADO_TAREFA, ESTADOS_TAREFA } from '../src/tipos';

describe('Máquina de Estados de Tarefas', () => {
  test('todos os estados estão definidos', () => {
    expect(ESTADOS_TAREFA).toContain('RASCUNHO');
    expect(ESTADOS_TAREFA).toContain('PLANEJADA');
    expect(ESTADOS_TAREFA).toContain('PRONTA');
    expect(ESTADOS_TAREFA).toContain('EM_EXECUCAO');
    expect(ESTADOS_TAREFA).toContain('EM_TESTE');
    expect(ESTADOS_TAREFA).toContain('EM_REVISAO');
    expect(ESTADOS_TAREFA).toContain('AGUARDANDO_APROVACAO');
    expect(ESTADOS_TAREFA).toContain('CONCLUIDA');
    expect(ESTADOS_TAREFA).toContain('BLOQUEADA');
    expect(ESTADOS_TAREFA).toContain('CANCELADA');
    expect(ESTADOS_TAREFA).toContain('REJEITADA');
    expect(ESTADOS_TAREFA).toHaveLength(11);
  });

  test('RASCUNHO → PLANEJADA é válido', () => {
    expect(TRANSICOES_ESTADO_TAREFA['RASCUNHO']).toContain('PLANEJADA');
  });

  test('RASCUNHO → PRONTA é inválido (não pode pular)', () => {
    expect(TRANSICOES_ESTADO_TAREFA['RASCUNHO']).not.toContain('PRONTA');
  });

  test('PLANEJADA → PRONTA é válido', () => {
    expect(TRANSICOES_ESTADO_TAREFA['PLANEJADA']).toContain('PRONTA');
  });

  test('PRONTA → EM_EXECUCAO é válido', () => {
    expect(TRANSICOES_ESTADO_TAREFA['PRONTA']).toContain('EM_EXECUCAO');
  });

  test('EM_EXECUCAO → EM_TESTE é válido', () => {
    expect(TRANSICOES_ESTADO_TAREFA['EM_EXECUCAO']).toContain('EM_TESTE');
  });

  test('EM_EXECUCAO → EM_REVISAO é válido', () => {
    expect(TRANSICOES_ESTADO_TAREFA['EM_EXECUCAO']).toContain('EM_REVISAO');
  });

  test('EM_EXECUCAO → CONCLUIDA direto é válido', () => {
    expect(TRANSICOES_ESTADO_TAREFA['EM_EXECUCAO']).toContain('CONCLUIDA');
  });

  test('EM_TESTE → EM_REVISAO é válido', () => {
    expect(TRANSICOES_ESTADO_TAREFA['EM_TESTE']).toContain('EM_REVISAO');
  });

  test('EM_REVISAO → AGUARDANDO_APROVACAO é válido', () => {
    expect(TRANSICOES_ESTADO_TAREFA['EM_REVISAO']).toContain('AGUARDANDO_APROVACAO');
  });

  test('EM_REVISAO → CONCLUIDA direto é válido', () => {
    expect(TRANSICOES_ESTADO_TAREFA['EM_REVISAO']).toContain('CONCLUIDA');
  });

  test('AGUARDANDO_APROVACAO → CONCLUIDA é válido', () => {
    expect(TRANSICOES_ESTADO_TAREFA['AGUARDANDO_APROVACAO']).toContain('CONCLUIDA');
  });

  test('BLOQUEADA → qualquer estado ativo é válido', () => {
    const bloq = TRANSICOES_ESTADO_TAREFA['BLOQUEADA'];
    expect(bloq).toContain('RASCUNHO');
    expect(bloq).toContain('PLANEJADA');
    expect(bloq).toContain('PRONTA');
    expect(bloq).toContain('EM_EXECUCAO');
    expect(bloq).toContain('EM_TESTE');
    expect(bloq).toContain('EM_REVISAO');
    expect(bloq).toContain('AGUARDANDO_APROVACAO');
  });

  test('CONCLUIDA não tem transições de saída', () => {
    expect(TRANSICOES_ESTADO_TAREFA['CONCLUIDA']).toHaveLength(0);
  });

  test('CANCELADA não tem transições de saída', () => {
    expect(TRANSICOES_ESTADO_TAREFA['CANCELADA']).toHaveLength(0);
  });

  test('RASCUNHO → CONCLUIDA direto é válido', () => {
    expect(TRANSICOES_ESTADO_TAREFA['RASCUNHO']).toContain('CONCLUIDA');
  });

  test('REJEITADA → RASCUNHO é válido (reabertura)', () => {
    expect(TRANSICOES_ESTADO_TAREFA['REJEITADA']).toContain('RASCUNHO');
  });

  test('ciclo completo: RASCUNHO → PLANEJADA → PRONTA → EM_EXECUCAO → EM_TESTE → EM_REVISAO → AGUARDANDO_APROVACAO → CONCLUIDA', () => {
    const ciclo = ['RASCUNHO', 'PLANEJADA', 'PRONTA', 'EM_EXECUCAO', 'EM_TESTE', 'EM_REVISAO', 'AGUARDANDO_APROVACAO', 'CONCLUIDA'] as const;
    for (let i = 0; i < ciclo.length - 1; i++) {
      const de = ciclo[i];
      const para = ciclo[i + 1];
      expect(TRANSICOES_ESTADO_TAREFA[de]).toContain(para);
    }
  });
});
