import { AgentePerfil, AgentesRegistry, Permissoes } from '../../tipos';

export interface AgenteInicial {
  id: string;
  nome: string;
  funcao: string;
  subpasta: string;
  perfilId: string;
  estado: 'ativo' | 'disponivel';
  permissoes: Permissoes;
  diretoriosPermitidos: string[];
  diretoriosProibidos: string[];
  contratosObrigatorios: string[];
  conhecimentos: string[];
  requerAprovacaoPara: string[];
  condicoesDeParada: string[];
  responsabilidades: string[];
}

export const AGENTES_BASE: AgenteInicial[] = [
  {
    id: 'planejador-arquiteto', nome: 'Planejador / Arquiteto', funcao: 'planejamento',
    subpasta: 'planejador', perfilId: 'planejador', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: false, testar: false, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/.ia/**', '/docs/arquitetura/**'],
    diretoriosProibidos: ['/frontend/**', '/backend/**', '/android/**', '/infraestrutura/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-arquitetura'],
    conhecimentos: ['Análise de requisitos', 'Arquitetura de software', 'Design patterns', 'Planejamento', 'Gestão de riscos', 'ADR'],
    requerAprovacaoPara: ['alteracao_arquitetural'],
    condicoesDeParada: ['requisito_ambiguo', 'conflito_de_requisitos', 'decisao_humana_necessaria'],
    responsabilidades: ['Analisar requisitos', 'Identificar ambiguidades', 'Definir arquitetura', 'Decompor funcionalidades', 'Criar tarefas', 'Definir dependências', 'Definir critérios de aceitação', 'Identificar riscos', 'Criar decisões arquiteturais', 'Planejar testes', 'Planejar segurança', 'Planejar implantação']
  },
  {
    id: 'frontend', nome: 'Frontend', funcao: 'desenvolvimento_frontend',
    subpasta: 'frontend', perfilId: 'frontend', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: true, executar: true, testar: true, revisar: false, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/frontend/**'],
    diretoriosProibidos: ['/backend/**', '/android/**', '/banco/**', '/infraestrutura/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-frontend', 'contrato-api', 'contrato-seguranca', 'contrato-interface'],
    conhecimentos: ['HTML5', 'CSS3', 'JavaScript', 'DOM', 'Fetch', 'JSON', 'Acessibilidade', 'Responsividade', 'XSS', 'CSRF', 'Autenticação', 'Autorização'],
    requerAprovacaoPara: ['alteracao_interna_contrato'],
    condicoesDeParada: ['api_incompativel', 'contrato_conflitante', 'arquivo_fora_do_dominio', 'requisito_ambiguo'],
    responsabilidades: ['Implementar interface', 'Implementar comportamentos do navegador', 'Integrar com API', 'Validar entradas', 'Tratar erros', 'Implementar responsividade', 'Implementar acessibilidade', 'Aplicar segurança no navegador', 'Executar testes']
  },
  {
    id: 'backend', nome: 'Backend', funcao: 'desenvolvimento_backend',
    subpasta: 'backend', perfilId: 'backend', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: true, executar: true, testar: true, revisar: false, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/backend/**'],
    diretoriosProibidos: ['/frontend/**', '/android/**', '/infraestrutura/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-arquitetura', 'contrato-api', 'contrato-banco', 'contrato-seguranca'],
    conhecimentos: ['Java 17+', 'Spring Boot', 'Spring Security', 'Spring Data JPA', 'Hibernate', 'API REST', 'JSON', 'DTO', 'Validação', 'PostgreSQL', 'Migrações', 'JWT', 'RBAC', 'BCrypt', 'Rate Limiting', 'CORS', 'Testes', 'DDD', 'SOLID', 'GRASP', 'Padrões de Projeto'],
    requerAprovacaoPara: ['alteracao_arquitetural', 'alteracao_destrutiva_api', 'migracao_necessaria', 'alteracao_de_autenticacao'],
    condicoesDeParada: ['mudanca_arquitetural', 'alteracao_de_contrato', 'alteracao_destrutiva', 'risco_de_seguranca', 'migracao_necessaria', 'api_incompativel'],
    responsabilidades: ['Implementar API REST', 'Implementar regras de negócio', 'Implementar autenticação/autorização', 'Implementar validação de entrada', 'Criar DTOs', 'Criar migrações de banco', 'Aplicar segurança (JWT, BCrypt, RBAC)', 'Tratar exceções', 'Rate limiting, CORS', 'Executar testes']
  },
  {
    id: 'banco', nome: 'Banco de Dados', funcao: 'banco_de_dados',
    subpasta: 'banco', perfilId: 'banco', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: true, testar: true, revisar: false, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/banco/**'],
    diretoriosProibidos: ['/frontend/**', '/android/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-banco', 'contrato-seguranca'],
    conhecimentos: ['PostgreSQL', 'Modelagem', 'Normalização', 'Índices', 'Transações', 'Concorrência', 'Integridade', 'Desempenho', 'Migrações'],
    requerAprovacaoPara: ['alteracao_destrutiva', 'alteracao_producao'],
    condicoesDeParada: ['alteracao_destrutiva', 'risco_de_seguranca', 'api_incompativel'],
    responsabilidades: ['Modelar dados', 'Criar migrações', 'Definir relacionamentos', 'Definir índices', 'Preservar integridade', 'Analisar consultas', 'Analisar desempenho', 'Aplicar segurança']
  },
  {
    id: 'android', nome: 'Android', funcao: 'desenvolvimento_android',
    subpasta: 'android', perfilId: 'android', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: true, executar: true, testar: true, revisar: false, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/android/**'],
    diretoriosProibidos: ['/backend/**', '/frontend/**', '/banco/**', '/infraestrutura/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-android', 'contrato-api', 'contrato-seguranca', 'contrato-interface'],
    conhecimentos: ['Kotlin', 'Android', 'Gradle', 'Componentes Android', 'Ciclo de Vida', 'Corrotinas', 'HTTP', 'JSON', 'API REST', 'Autenticação', 'Armazenamento Seguro', 'Permissões', 'Câmera', 'Arquivos', 'Notificações', 'Testes', 'Desempenho', 'Compatibilidade'],
    requerAprovacaoPara: ['alteracao_permissao_critica', 'acesso_producao'],
    condicoesDeParada: ['api_incompativel', 'contrato_conflitante', 'arquivo_fora_do_dominio'],
    responsabilidades: ['Implementar aplicativo', 'Integrar API', 'Implementar autenticação', 'Tratar permissões', 'Implementar armazenamento seguro', 'Implementar funcionalidades Android', 'Executar testes', 'Validar desempenho']
  },
  {
    id: 'infraestrutura', nome: 'Infraestrutura', funcao: 'infraestrutura_implantacao',
    subpasta: 'infraestrutura', perfilId: 'infraestrutura', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: true, testar: true, revisar: false, aprovar: false, implantar: true },
    diretoriosPermitidos: ['/infraestrutura/**', '/docker/**', '/implantacao/**'],
    diretoriosProibidos: ['/frontend/**', '/android/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-infraestrutura', 'contrato-seguranca'],
    conhecimentos: ['Linux', 'Docker', 'Docker Compose', 'Nginx', 'HTTPS', 'DNS', 'Firewall', 'VPS', 'Segredos', 'Cópias de Segurança', 'Monitoramento'],
    requerAprovacaoPara: ['implantacao_producao', 'alteracao_producao', 'alteracao_rede_critica'],
    condicoesDeParada: ['alteracao_de_infraestrutura', 'necessidade_de_segredo', 'alteracao_destrutiva'],
    responsabilidades: ['Configurar infraestrutura', 'Configurar contêineres', 'Configurar servidor', 'Configurar rede', 'Configurar HTTPS', 'Implantar aplicações', 'Executar cópias de segurança', 'Executar restauração', 'Monitorar infraestrutura', 'Executar reversão']
  },
  {
    id: 'testes', nome: 'Qualidade e Testes', funcao: 'qualidade_testes',
    subpasta: 'testes', perfilId: 'testes', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: true, testar: true, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/testes/**'],
    diretoriosProibidos: [],
    contratosObrigatorios: ['contrato-projeto', 'contrato-testes', 'contrato-api', 'contrato-seguranca'],
    conhecimentos: ['Testes unitários', 'Testes de integração', 'Testes de API', 'Testes de contrato', 'Testes de segurança', 'Testes de interface', 'Testes E2E', 'Testes de regressão', 'Testes de desempenho'],
    requerAprovacaoPara: ['alteracao_de_ambiente'],
    condicoesDeParada: ['teste_critico_falhando', 'api_incompativel', 'violacao_de_contrato'],
    responsabilidades: ['Executar testes', 'Criar testes', 'Validar requisitos', 'Validar critérios de aceitação', 'Detectar regressões', 'Validar contratos', 'Validar segurança']
  },
  {
    id: 'seguranca', nome: 'Segurança', funcao: 'seguranca',
    subpasta: 'seguranca', perfilId: 'seguranca', estado: 'ativo',
    permissoes: { ler: true, criar: false, alterar: false, excluir: false, executar: true, testar: true, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/.ia/**'],
    diretoriosProibidos: [],
    contratosObrigatorios: ['contrato-projeto', 'contrato-seguranca'],
    conhecimentos: ['Autenticação', 'Autorização', 'JWT', 'RBAC', 'BCrypt', 'XSS', 'CSRF', 'SQL Injection', 'Rate Limiting', 'CORS', 'Criptografia', 'Gestão de Segredos', 'Segurança de Dependências'],
    requerAprovacaoPara: ['aceitacao_de_risco_critico', 'alteracao_de_autenticacao', 'alteracao_de_autorizacao', 'alteracao_de_criptografia'],
    condicoesDeParada: ['risco_critico', 'alteracao_de_seguranca', 'necessidade_de_segredo'],
    responsabilidades: ['Analisar autenticação', 'Analisar autorização', 'Analisar entrada de dados', 'Analisar exposição de dados', 'Analisar dependências', 'Analisar configuração', 'Analisar código', 'Analisar infraestrutura', 'Registrar riscos']
  },
  {
    id: 'revisor', nome: 'Revisor de Código', funcao: 'revisao',
    subpasta: 'revisor', perfilId: 'revisor', estado: 'ativo',
    permissoes: { ler: true, criar: false, alterar: false, excluir: false, executar: true, testar: true, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/**'],
    diretoriosProibidos: [],
    contratosObrigatorios: ['contrato-projeto', 'contrato-arquitetura', 'contrato-seguranca', 'contrato-testes'],
    conhecimentos: ['Arquitetura', 'Legibilidade', 'SOLID', 'Coesão', 'Acoplamento', 'Duplicação', 'Desempenho', 'Segurança', 'Testes', 'Tratamento de erros', 'Contratos', 'Padrões do projeto'],
    requerAprovacaoPara: [],
    condicoesDeParada: ['problema_de_arquitetura', 'problema_de_seguranca', 'problema_de_contrato'],
    responsabilidades: ['Revisar código', 'Verificar arquitetura', 'Verificar segurança', 'Verificar testes', 'Verificar contratos', 'Detectar duplicação', 'Detectar complexidade', 'Registrar recomendações']
  },
  {
    id: 'documentacao', nome: 'Documentação', funcao: 'documentacao',
    subpasta: 'documentacao', perfilId: 'documentacao', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: false, testar: false, revisar: false, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/docs/**', '/README.md', '/CHANGELOG.md'],
    diretoriosProibidos: [],
    contratosObrigatorios: ['contrato-projeto', 'contrato-documentacao'],
    conhecimentos: ['Documentação de arquitetura', 'Documentação de API', 'Documentação de instalação', 'Documentação de configuração', 'Documentação de implantação', 'Documentação de segurança', 'Documentação de decisões', 'Solução de problemas', 'Histórico'],
    requerAprovacaoPara: [],
    condicoesDeParada: ['informacao_insuficiente'],
    responsabilidades: ['Documentar arquitetura', 'Documentar API', 'Documentar instalação', 'Documentar configuração', 'Documentar implantação', 'Documentar segurança', 'Documentar decisões', 'Documentar problemas', 'Atualizar histórico']
  },
  {
    id: 'observabilidade', nome: 'Observabilidade', funcao: 'observabilidade',
    subpasta: 'observabilidade', perfilId: 'observabilidade', estado: 'disponivel',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: true, testar: true, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/infraestrutura/**', '/docs/observabilidade/**'],
    diretoriosProibidos: ['/frontend/**', '/android/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-infraestrutura'],
    conhecimentos: ['Registros', 'Métricas', 'Verificações de saúde', 'Monitoramento', 'Alertas', 'Disponibilidade', 'Diagnóstico'],
    requerAprovacaoPara: ['alteracao_de_rede_critica'],
    condicoesDeParada: ['informacao_insuficiente'],
    responsabilidades: ['Definir registros', 'Definir métricas', 'Definir verificações de saúde', 'Definir alertas', 'Analisar disponibilidade', 'Analisar falhas', 'Analisar desempenho']
  },
  {
    id: 'desempenho', nome: 'Desempenho', funcao: 'desempenho',
    subpasta: 'desempenho', perfilId: 'desempenho', estado: 'disponivel',
    permissoes: { ler: true, criar: false, alterar: false, excluir: false, executar: true, testar: true, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/**'],
    diretoriosProibidos: ['/frontend/**', '/android/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-arquitetura', 'contrato-banco'],
    conhecimentos: ['Tempo de resposta', 'Consumo de memória', 'Processamento', 'Consultas', 'Índices', 'Rede', 'Carregamento frontend', 'Desempenho Android', 'Gargalos', 'Escalabilidade'],
    requerAprovacaoPara: [],
    condicoesDeParada: ['informacao_insuficiente'],
    responsabilidades: ['Analisar tempo de resposta', 'Analisar consumo de memória', 'Analisar processamento', 'Analisar consultas', 'Analisar rede', 'Analisar carregamento', 'Identificar gargalos', 'Propor melhorias']
  },
  {
    id: 'devops', nome: 'DevOps Engineer', funcao: 'devops',
    subpasta: 'devops', perfilId: 'devops', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: true, testar: true, revisar: false, aprovar: false, implantar: true },
    diretoriosPermitidos: ['/infraestrutura/**', '/backend/**', '/.ia/**'],
    diretoriosProibidos: ['/frontend/**', '/android/**', '/banco/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-infraestrutura', 'contrato-seguranca'],
    conhecimentos: ['CI/CD', 'Docker', 'Kubernetes', 'Cloud', 'Monitoramento', 'Scaling', 'IaC', 'Terraform', 'Ansible', 'GitOps', 'Observabilidade'],
    requerAprovacaoPara: ['implantacao_producao', 'alteracao_producao', 'alteracao_rede_critica'],
    condicoesDeParada: ['alteracao_de_infraestrutura', 'necessidade_de_segredo', 'alteracao_destrutiva'],
    responsabilidades: ['Implementar pipeline CI/CD', 'Gerenciar containers', 'Configurar cloud', 'Monitorar infraestrutura', 'Aplicar scaling', 'Gerenciar deploy', 'Implementar IaC', 'Gerenciar segredos', 'Garantir disponibilidade']
  },
  {
    id: 'qa-testes', nome: 'QA / Testes', funcao: 'qualidade_testes',
    subpasta: 'qa-testes', perfilId: 'qa-testes', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: false, excluir: false, executar: true, testar: true, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/testes/**', '/backend/**', '/frontend/**'],
    diretoriosProibidos: ['/android/**', '/infraestrutura/**', '/banco/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-testes', 'contrato-api', 'contrato-seguranca'],
    conhecimentos: ['Testes automatizados', 'E2E', 'Regressão', 'Integração', 'Performance', 'Segurança', 'Jest', 'Cypress', 'JUnit', 'Testes de contrato', 'Testes de API'],
    requerAprovacaoPara: ['alteracao_de_ambiente'],
    condicoesDeParada: ['teste_critico_falhando', 'api_incompativel', 'violacao_de_contrato'],
    responsabilidades: ['Executar testes automatizados', 'Criar testes E2E', 'Validar requisitos', 'Detectar regressões', 'Validar contratos', 'Validar segurança', 'Reportar bugs', 'Garantir qualidade']
  },
  {
    id: 'security-engineer', nome: 'Security Engineer', funcao: 'seguranca',
    subpasta: 'security-engineer', perfilId: 'security-engineer', estado: 'ativo',
    permissoes: { ler: true, criar: false, alterar: false, excluir: false, executar: true, testar: true, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/.ia/**', '/backend/**', '/infraestrutura/**'],
    diretoriosProibidos: ['/frontend/**', '/android/**', '/banco/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-seguranca'],
    conhecimentos: ['Pentesting', 'Auditoria', 'Conformidade', 'Gestão de vulnerabilidades', 'OWASP', 'SAST', 'DAST', 'Criptografia', 'Gestão de segredos', 'Compliance'],
    requerAprovacaoPara: ['aceitacao_de_risco_critico', 'alteracao_de_autenticacao', 'alteracao_de_autorizacao', 'alteracao_de_criptografia'],
    condicoesDeParada: ['risco_critico', 'alteracao_de_seguranca', 'necessidade_de_segredo'],
    responsabilidades: ['Realizar auditoria de segurança', 'Executar pentesting', 'Garantir conformidade', 'Gerenciar vulnerabilidades', 'Analisar código seguro', 'Implementar controles', 'Reportar riscos', 'Revisar autenticação']
  },
  {
    id: 'technical-writer', nome: 'Technical Writer / Documentador', funcao: 'documentacao',
    subpasta: 'technical-writer', perfilId: 'technical-writer', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: false, testar: false, revisar: false, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/docs/**', '/README.md', '/.ia/**'],
    diretoriosProibidos: ['/backend/**', '/frontend/**', '/android/**', '/banco/**', '/infraestrutura/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-documentacao'],
    conhecimentos: ['Documentação de API', 'Runbook', 'Manuais', 'Onboarding', 'Arquitetura', 'Procedimentos', 'Swagger/OpenAPI', 'Markdown', 'Guias'],
    requerAprovacaoPara: [],
    condicoesDeParada: ['informacao_insuficiente'],
    responsabilidades: ['Documentar APIs', 'Criar runbooks', 'Escrever manuais', 'Documentar procedimentos', 'Criar guias de onboarding', 'Documentar decisões arquiteturais', 'Manter documentação atualizada']
  }
];

export function criarAgentesRegistry(): AgentesRegistry {
  return {
    agentes: AGENTES_BASE.map((a) => ({
      id: a.id,
      nome: a.nome,
      funcao: a.funcao,
      estado: a.estado,
      arquivoPerfil: `/.ia/agentes/${a.subpasta}/${a.perfilId}.json`
    }))
  };
}

export function criarAgentePerfil(agente: AgenteInicial, dataISO: string): AgentePerfil {
  return {
    id: agente.id,
    nome: agente.nome,
    funcao: agente.funcao,
    descricao: `Responsável pela área de ${agente.funcao}.`,
    estado: agente.estado,
    responsabilidades: agente.responsabilidades,
    objetivos: [],
    conhecimentos: agente.conhecimentos,
    dominios: agente.diretoriosPermitidos,
    diretoriosPermitidos: agente.diretoriosPermitidos,
    diretoriosProibidos: agente.diretoriosProibidos,
    contratosObrigatorios: agente.contratosObrigatorios,
    procedimentosObrigatorios: [],
    permissoes: agente.permissoes,
    ferramentasPermitidas: ['leitura', 'escrita', 'terminal', 'git'],
    comandosPermitidos: [],
    comandosProibidos: [],
    ambientesPermitidos: ['desenvolvimento', 'teste'],
    requerAprovacaoPara: agente.requerAprovacaoPara,
    condicoesDeParada: agente.condicoesDeParada,
    criteriosDeQualidade: ['correcao', 'seguranca', 'testabilidade', 'manutenibilidade', 'arquitetura'],
    criteriosDeConclusao: [
      'Requisito implementado',
      'Critérios de aceitação atendidos',
      'Testes realizados e aprovados',
      'Segurança verificada',
      'Contratos respeitados',
      'Documentação atualizada',
      'Revisão realizada',
      'Alterações registradas',
      'Nenhuma pendência crítica'
    ],
    protocoloDeEntrega: {
      exigeResumo: true,
      exigeArquivosAlterados: true,
      exigeTestes: true,
      exigeRiscos: true,
      exigePendencias: true
    },
    modelo: { provedor: '', nome: '', modo: '', limiteContexto: 0 },
    datas: { criacao: dataISO, ultimaAtualizacao: dataISO }
  };
}

export function criarHabilidades(agente: AgenteInicial): Record<string, unknown> {
  return {
    id: `${agente.id}-habilidades`,
    nome: `Habilidades — ${agente.nome}`,
    agenteId: agente.id,
    conhecimentos: agente.conhecimentos,
    ferramentas: ['leitura', 'escrita', 'terminal', 'git'],
    nivel: 'intermediario',
    atualizadoEm: new Date().toISOString()
  };
}

export const INSTRUCOES_MD = `# Instruções

Instruções operacionais para este agente. Substitua este conteúdo pelo detalhamento específico.

## Objetivo geral

Descreva aqui o objetivo geral do agente neste projeto.

## Escopo de atuação

- ...

## Entradas e saídas

...

## Regras de ouro

1. Nunca ultrapasse seu domínio de arquivos.
2. Respeite todos os contratos.
3. Pare e registre quando encontrar condições de parada.
`;

export const PERSONALIDADE_MD = `# Personalidade

Define como este agente deve se comportar.

## Estilo

- ...

## Tom

- ...

## Princípios

- ...
`;

export const REGRAS_MD = `# Regras

Regras que este agente deve seguir rigorosamente.

1. Respeitar o domínio de arquivos definido em seu perfil.
2. Validar todas as entradas antes de usá-las.
3. Registrar alterações em commits rastreáveis.
4. Não armazenar segredos no código ou no Git.
5. Pausar e solicitar aprovação para mudanças críticas.
`;

export const CONTEXTO_MD = `# Contexto

Informações sobre o projeto que este agente precisa conhecer.

## Arquitetura geral

...

## Tecnologias

...

## Integração

...
`;

export const MEMORIA_MD = `# Memória

Histórico de decisões, aprendizados e informações persistentes.

## Decisões relevantes

(nenhuma ainda)

## Aprendizados

(nenhum ainda)

## Pendências

(nenhuma ainda)
`;
