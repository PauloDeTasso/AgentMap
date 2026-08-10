import { EstadoAtual, Bloqueio, Decisao, Risco, Problema, EventoAuditoria, EstadoGit } from '../../tipos';

const hoje = () => new Date().toISOString();

export function criarEstadoAtual(projetoId: string): EstadoAtual {
  return {
    projetoId,
    estado: 'em_desenvolvimento',
    fase: 'inicial',
    versao: '1.0.0',
    agentesAtivos: 10,
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
  };
}

export function criarProgresso(): Record<string, unknown> {
  return {
    projeto: { percentual: 0, tarefasConcluidas: 0, tarefasTotais: 0 },
    areas: {
      frontend: { percentual: 0, tarefasConcluidas: 0, tarefasTotais: 0 },
      backend: { percentual: 0, tarefasConcluidas: 0, tarefasTotais: 0 },
      android: { percentual: 0, tarefasConcluidas: 0, tarefasTotais: 0 },
      banco: { percentual: 0, tarefasConcluidas: 0, tarefasTotais: 0 },
      infraestrutura: { percentual: 0, tarefasConcluidas: 0, tarefasTotais: 0 },
      testes: { percentual: 0, tarefasConcluidas: 0, tarefasTotais: 0 }
    }
  };
}

export function criarBloqueios(): { bloqueios: Bloqueio[] } {
  return { bloqueios: [] };
}

export function criarDecisoes(): { decisoes: Decisao[] } {
  return { decisoes: [] };
}

export function criarRiscos(): { riscos: Risco[] } {
  return { riscos: [] };
}

export function criarProblemas(): { problemas: Problema[] } {
  return { problemas: [] };
}

export function criarConhecimento(): { conhecimento: unknown[] } {
  return { conhecimento: [] };
}

export function criarProcedimentos(): { procedimentos: unknown[] } {
  return {
    procedimentos: [
      { id: 'criar-tarefa', nome: 'Criar Tarefa', descricao: 'Procedimento para criar uma nova tarefa.', estado: 'ativo', versao: '1.0.0', aplicavelA: ['planejador-arquiteto'], etapas: ['Definir objetivo', 'Identificar contratos', 'Definir critérios de aceitação', 'Atribuir agente', 'Definir dependências'], criteriosConclusao: ['Tarefa criada com todos os campos obrigatórios preenchidos'] },
      { id: 'implementar-tarefa', nome: 'Implementar Tarefa', descricao: 'Procedimento para implementar uma tarefa.', estado: 'ativo', versao: '1.0.0', aplicavelA: ['todos'], etapas: ['Ler contratos', 'Ler contexto', 'Verificar dependências', 'Implementar', 'Executar testes'], criteriosConclusao: ['Implementação concluída', 'Testes aprovados'] },
      { id: 'revisar-codigo', nome: 'Revisar Código', descricao: 'Procedimento para revisão de código.', estado: 'ativo', versao: '1.0.0', aplicavelA: ['revisor'], etapas: ['Analisar arquitetura', 'Verificar segurança', 'Verificar testes', 'Verificar contratos', 'Registrar recomendações'], criteriosConclusao: ['Revisão finalizada com recomendações registradas'] },
      { id: 'executar-testes', nome: 'Executar Testes', descricao: 'Procedimento para execução de testes.', estado: 'ativo', versao: '1.0.0', aplicavelA: ['testes'], etapas: ['Identificar testes necessários', 'Executar testes', 'Verificar resultados', 'Registrar falhas'], criteriosConclusao: ['Todos os testes obrigatórios aprovados'] },
      { id: 'criar-migracao', nome: 'Criar Migração', descricao: 'Procedimento para criação de migração de banco.', estado: 'ativo', versao: '1.0.0', aplicavelA: ['banco', 'backend'], etapas: ['Analisar alteração necessária', 'Criar script de migração', 'Testar em ambiente de desenvolvimento', 'Obter aprovação'], criteriosConclusao: ['Migração criada, testada e aprovada'] },
      { id: 'alterar-api', nome: 'Alterar API', descricao: 'Procedimento para alteração de API.', estado: 'ativo', versao: '1.0.0', aplicavelA: ['backend', 'frontend', 'android'], etapas: ['Analisar impacto', 'Atualizar contrato da API', 'Notificar consumidores', 'Implementar alteração'], criteriosConclusao: ['Contrato atualizado e consumidores notificados'] },
      { id: 'implantar', nome: 'Implantar', descricao: 'Procedimento para implantação.', estado: 'ativo', versao: '1.0.0', aplicavelA: ['infraestrutura'], etapas: ['Verificar aprovações', 'Preparar ambiente', 'Executar implantação', 'Validar saúde'], criteriosConclusao: ['Implantação concluída e validada'] },
      { id: 'reverter-implantacao', nome: 'Reverter Implantação', descricao: 'Procedimento para reversão de implantação.', estado: 'ativo', versao: '1.0.0', aplicavelA: ['infraestrutura'], etapas: ['Diagnosticar falha', 'Identificar versão anterior', 'Executar reversão', 'Validar'], criteriosConclusao: ['Reversão concluída e sistema estável'] }
    ]
  };
}

export function criarPermissoes(): { permissoes: { descricao: string; permissoes: string[] }[]; perfis: unknown[] } {
  return {
    permissoes: [
      { descricao: 'Ler recursos do projeto', permissoes: ['ler'] },
      { descricao: 'Criar novos recursos', permissoes: ['criar'] },
      { descricao: 'Alterar recursos existentes', permissoes: ['alterar'] },
      { descricao: 'Excluir recursos', permissoes: ['excluir'] },
      { descricao: 'Executar comandos', permissoes: ['executar'] },
      { descricao: 'Executar testes', permissoes: ['testar'] },
      { descricao: 'Revisar código', permissoes: ['revisar'] },
      { descricao: 'Aprovar alterações', permissoes: ['aprovar'] },
      { descricao: 'Implantar produção', permissoes: ['implantar'] }
    ],
    perfis: [
      { id: 'proprietario', nome: 'Proprietário do Produto', permissoes: ['ler', 'criar', 'alterar', 'excluir', 'executar', 'testar', 'revisar', 'aprovar', 'implantar'] },
      { id: 'agente', nome: 'Agente', permissoes: ['ler', 'criar', 'alterar', 'executar', 'testar'] },
      { id: 'revisor', nome: 'Revisor', permissoes: ['ler', 'testar', 'revisar'] },
      { id: 'seguranca', nome: 'Segurança', permissoes: ['ler', 'testar', 'revisar'] }
    ]
  };
}

export function criarFerramentas(): { ferramentas: unknown[] } {
  return {
    ferramentas: [
      { id: 'leitura', nome: 'Leitura de arquivos', tipo: 'arquivo', descricao: 'Ler conteúdo de arquivos do projeto.', permissoes: ['ler'], requerRestricao: false },
      { id: 'escrita', nome: 'Escrita de arquivos', tipo: 'arquivo', descricao: 'Criar e alterar arquivos do projeto.', permissoes: ['criar', 'alterar'], requerRestricao: true },
      { id: 'exclusao', nome: 'Exclusão de arquivos', tipo: 'arquivo', descricao: 'Excluir arquivos do projeto.', permissoes: ['excluir'], requerRestricao: true },
      { id: 'terminal', nome: 'Terminal', tipo: 'comando', descricao: 'Executar comandos no terminal.', permissoes: ['executar'], requerRestricao: true },
      { id: 'git', nome: 'Git', tipo: 'versionamento', descricao: 'Consultar estado e histórico do Git.', permissoes: ['ler', 'executar'], requerRestricao: false },
      { id: 'testes', nome: 'Testes', tipo: 'teste', descricao: 'Executar suíte de testes.', permissoes: ['testar'], requerRestricao: false },
      { id: 'docker', nome: 'Docker', tipo: 'infra', descricao: 'Gerenciar contêineres.', permissoes: ['executar', 'implantar'], requerRestricao: true },
      { id: 'producao', nome: 'Acesso Produção', tipo: 'infra', descricao: 'Acessar ambiente de produção.', permissoes: ['implantar'], requerRestricao: true }
    ]
  };
}

export function criarContextos(): { contextos: unknown[] } {
  return { contextos: [] };
}

export function criarCriterios(): { criterios: unknown[] } {
  return {
    criterios: [
      { id: 'correcao', nome: 'Correção', descricao: 'O código resolve o problema sem introduzir novos bugs.', obrigatorio: true },
      { id: 'seguranca', nome: 'Segurança', descricao: 'O código respeita o contrato de segurança.', obrigatorio: true },
      { id: 'testabilidade', nome: 'Testabilidade', descricao: 'O código é testável.', obrigatorio: true },
      { id: 'manutencao', nome: 'Manutenibilidade', descricao: 'O código é fácil de manter.', obrigatorio: true },
      { id: 'arquitetura', nome: 'Arquitetura', descricao: 'O código respeita a arquitetura proposta.', obrigatorio: true }
    ]
  };
}

export function criarTestes(): { testes: unknown[] } {
  return { testes: [] };
}

export function criarRevisoes(): { revisoes: unknown[] } {
  return { revisoes: [] };
}

export function criarEstadoGit(): EstadoGit {
  return {
    repositorio: {
      caminho: '',
      ramoAtual: null,
      estado: 'nao_inicializado',
      ultimoCommit: { identificador: null, mensagem: null, autor: null, data: null }
    },
    alteracoes: { modificados: [], criados: [], excluidos: [] },
    conflitos: [],
    tarefasRelacionadas: [],
    ultimaVerificacao: hoje()
  };
}

export function criarEventosAuditoria(): { eventos: EventoAuditoria[] } {
  return { eventos: [] };
}

export function criarPoliticas(): { politicas: unknown[] } {
  return {
    politicas: [
      { id: 'politica-seguranca', nome: 'Política de Segurança', versao: '1.0.0', estado: 'ativa', objetivo: 'Garantir a segurança de todos os componentes.', regras: ['Validar todas as entradas', 'Nunca armazenar segredos no código', 'Usar HTTPS em produção'], proibicoes: ['Compartilhar credenciais no código', 'Desativar validações de segurança'], excecoes: [], requerAprovacaoPara: ['alteracao_de_autenticacao'], agentesAplicaveis: ['todos'], ambientesAplicaveis: ['desenvolvimento', 'teste', 'homologacao', 'producao'], consequenciasViolacao: ['Rejeição de código', 'Incidente registrado'], historico: [{ versao: '1.0.0', data: hoje(), alteracao: 'Criação' }] },
      { id: 'politica-git', nome: 'Política de Git', versao: '1.0.0', estado: 'ativa', objetivo: 'Padronizar o uso do Git.', regras: ['Commits atômicos e com mensagem clara', 'Branch por tarefa', 'Pull request antes de merge'], proibicoes: ['Commit direto em main', 'Forçar push'], excecoes: [], requerAprovacaoPara: ['force_push'], agentesAplicaveis: ['todos'], ambientesAplicaveis: ['desenvolvimento', 'teste'], consequenciasViolacao: ['Rever histórico'], historico: [{ versao: '1.0.0', data: hoje(), alteracao: 'Criação' }] },
      { id: 'politica-qualidade', nome: 'Política de Qualidade', versao: '1.0.0', estado: 'ativa', objetivo: 'Garantir qualidade do código.', regras: ['Cobertura mínima 70%', 'Testes em novas funcionalidades', 'Revisão de código obrigatória'], proibicoes: [], excecoes: [], requerAprovacaoPara: ['baixar_cobertura'], agentesAplicaveis: ['todos'], ambientesAplicaveis: ['desenvolvimento', 'teste'], consequenciasViolacao: ['Bloqueio de merge'], historico: [{ versao: '1.0.0', data: hoje(), alteracao: 'Criação' }] },
      { id: 'politica-permissoes', nome: 'Política de Permissões', versao: '1.0.0', estado: 'ativa', objetivo: 'Definir acesso mínimo necessário.', regras: ['Princípio do menor privilégio', 'Agente só acessa seu domínio'], proibicoes: ['Acesso irrestrito'], excecoes: [], requerAprovacaoPara: ['alterar_domínio_agente'], agentesAplicaveis: ['todos'], ambientesAplicaveis: ['desenvolvimento', 'teste', 'homologacao', 'producao'], consequenciasViolacao: ['Revisão de acesso'], historico: [{ versao: '1.0.0', data: hoje(), alteracao: 'Criação' }] },
      { id: 'politica-mudancas', nome: 'Política de Mudanças', versao: '1.0.0', estado: 'ativa', objetivo: 'Controlar alterações críticas.', regras: ['Mudanças arquiteturais exigem aprovação', 'Alterações destrutivas exigem backup', 'Contratos incompatíveis exigem nova versão'], proibicoes: [], excecoes: [], requerAprovacaoPara: ['alteracao_arquitetural', 'alteracao_destrutiva', 'alteracao_contrato_incompativel'], agentesAplicaveis: ['todos'], ambientesAplicaveis: ['desenvolvimento', 'teste', 'homologacao', 'producao'], consequenciasViolacao: ['Reversão obrigatória'], historico: [{ versao: '1.0.0', data: hoje(), alteracao: 'Criação' }] }
    ]
  };
}

export function criarSolicitacaoModelo(): Record<string, unknown> {
  const hoje = new Date().toISOString();
  return {
    id: '',
    titulo: 'Título da solicitação',
    descricao: 'Descrição detalhada da necessidade de alteração.',
    agenteSolicitante: { id: '' },
    agenteResponsavel: { id: null },
    alvo: { tipo: 'ARQUIVO', nome: '', identificador: null, localizacao: null },
    alteracao: { tipo: 'ADICAO', descricao: '', motivo: '', arquivosAfetados: [] },
    impactos: [],
    dependencias: [],
    prioridade: 'MEDIA',
    status: 'PENDENTE',
    requerAprovacao: true,
    aprovacao: { status: 'PENDENTE', agenteId: null, data: null, observacao: null },
    tarefaOrigem: null,
    datas: { criadaEm: hoje, atualizadaEm: hoje, concluidaEm: null },
    observacoes: null
  };
}
