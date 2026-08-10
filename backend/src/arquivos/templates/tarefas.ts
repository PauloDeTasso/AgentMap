import { Tarefa, TarefasRegistry, EstadoTarefa } from '../../tipos';

const hoje = () => new Date().toISOString();

export const MODELO_TAREFA: Tarefa = {
  id: 'TAREFA-0001',
  titulo: 'Título da tarefa',
  descricao: 'Descrição detalhada.',
  objetivo: 'Objetivo da tarefa.',
  tipo: 'desenvolvimento',
  estado: 'RASCUNHO' as EstadoTarefa,
  prioridade: 'media',
  agenteResponsavel: 'frontend',
  dominio: 'frontend',
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
  criteriosConclusao: [
    'Implementação concluída',
    'Critérios de aceitação atendidos',
    'Testes aprovados',
    'Segurança verificada',
    'Contratos respeitados',
    'Documentação atualizada',
    'Revisão realizada'
  ],
  resultado: {
    resumo: '',
    arquivosAlterados: [],
    testesExecutados: [],
    testesAprovados: [],
    riscosEncontrados: [],
    pendencias: [],
    observacoes: '',
    commit: ''
  },
  aprovacao: { necessaria: false, estado: 'nao_solicitada', aprovador: '', data: null, observacao: '' },
  datas: { criacao: null, inicio: null, ultimaAtualizacao: null, conclusao: null }
};

export function criarTarefasRegistry(): TarefasRegistry {
  return { tarefas: [], estatisticas: {} };
}

export const DIRS_TAREFA = ['rascunho', 'planejadas', 'prontas', 'execucao', 'testes', 'revisao', 'aprovacao', 'bloqueadas', 'concluidas'] as const;
