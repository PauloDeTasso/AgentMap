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
    subpasta: 'planejador-arquiteto', perfilId: 'planejador-arquiteto', estado: 'ativo',
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
    contratosObrigatorios: ['contrato-projeto', 'contrato-frontend', 'contrato-api', 'contrato-interface'],
    conhecimentos: ['HTML5', 'CSS3', 'JavaScript', 'DOM', 'Fetch', 'JSON', 'Acessibilidade', 'Responsividade'],
    requerAprovacaoPara: ['alteracao_interna_contrato'],
    condicoesDeParada: ['api_incompativel', 'contrato_conflitante', 'arquivo_fora_do_dominio', 'requisito_ambiguo'],
    responsabilidades: ['Implementar interface', 'Implementar comportamentos do navegador', 'Integrar com API', 'Validar entradas', 'Tratar erros', 'Implementar responsividade', 'Implementar acessibilidade', 'Executar testes']
  },
  {
    id: 'backend', nome: 'Backend', funcao: 'desenvolvimento_backend',
    subpasta: 'backend', perfilId: 'backend', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: true, executar: true, testar: true, revisar: false, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/backend/**'],
    diretoriosProibidos: ['/frontend/**', '/android/**', '/infraestrutura/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-arquitetura', 'contrato-api', 'contrato-banco'],
    conhecimentos: ['Java 17+', 'Spring Boot', 'Spring Data JPA', 'Hibernate', 'API REST', 'JSON', 'DTO', 'Validação', 'PostgreSQL', 'Migrações', 'Testes', 'DDD', 'SOLID', 'GRASP', 'Padrões de Projeto'],
    requerAprovacaoPara: ['alteracao_arquitetural', 'alteracao_destrutiva_api', 'migracao_necessaria', 'alteracao_de_autenticacao'],
    condicoesDeParada: ['mudanca_arquitetural', 'alteracao_de_contrato', 'alteracao_destrutiva', 'migracao_necessaria', 'api_incompativel'],
    responsabilidades: ['Implementar API REST', 'Implementar regras de negócio', 'Implementar validação de entrada', 'Criar DTOs', 'Criar migrações de banco', 'Tratar exceções', 'Executar testes']
  },
  {
    id: 'banco', nome: 'Banco de Dados', funcao: 'banco_de_dados',
    subpasta: 'banco', perfilId: 'banco', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: true, testar: true, revisar: false, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/banco/**'],
    diretoriosProibidos: ['/frontend/**', '/android/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-banco'],
    conhecimentos: ['PostgreSQL', 'Modelagem', 'Normalização', 'Índices', 'Transações', 'Concorrência', 'Integridade', 'Desempenho', 'Migrações'],
    requerAprovacaoPara: ['alteracao_destrutiva', 'alteracao_producao'],
    condicoesDeParada: ['alteracao_destrutiva', 'api_incompativel'],
    responsabilidades: ['Modelar dados', 'Criar migrações', 'Definir relacionamentos', 'Definir índices', 'Preservar integridade', 'Analisar consultas', 'Analisar desempenho']
  },
  {
    id: 'android', nome: 'Android', funcao: 'desenvolvimento_android',
    subpasta: 'android', perfilId: 'android', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: true, executar: true, testar: true, revisar: false, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/android/**'],
    diretoriosProibidos: ['/backend/**', '/frontend/**', '/banco/**', '/infraestrutura/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-android', 'contrato-api', 'contrato-interface'],
    conhecimentos: ['Kotlin', 'Android', 'Gradle', 'Componentes Android', 'Ciclo de Vida', 'Corrotinas', 'HTTP', 'JSON', 'API REST', 'Armazenamento', 'Permissões', 'Câmera', 'Arquivos', 'Notificações', 'Testes', 'Desempenho', 'Compatibilidade'],
    requerAprovacaoPara: ['alteracao_permissao_critica', 'acesso_producao'],
    condicoesDeParada: ['api_incompativel', 'contrato_conflitante', 'arquivo_fora_do_dominio'],
    responsabilidades: ['Implementar aplicativo', 'Integrar API', 'Tratar permissões', 'Implementar armazenamento', 'Implementar funcionalidades Android', 'Executar testes', 'Validar desempenho']
  },
  {
    id: 'infraestrutura', nome: 'Infraestrutura', funcao: 'infraestrutura_implantacao',
    subpasta: 'infraestrutura', perfilId: 'infraestrutura', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: true, testar: true, revisar: false, aprovar: false, implantar: true },
    diretoriosPermitidos: ['/infraestrutura/**', '/docker/**', '/implantacao/**'],
    diretoriosProibidos: ['/frontend/**', '/android/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-infraestrutura'],
    conhecimentos: ['Linux', 'Docker', 'Docker Compose', 'Nginx', 'HTTPS', 'DNS', 'Firewall', 'VPS', 'Segredos', 'Cópias de Segurança', 'Monitoramento'],
    requerAprovacaoPara: ['implantacao_producao', 'alteracao_producao', 'alteracao_rede_critica'],
    condicoesDeParada: ['alteracao_de_infraestrutura', 'necessidade_de_segredo', 'alteracao_destrutiva'],
    responsabilidades: ['Configurar infraestrutura', 'Configurar contêineres', 'Configurar servidor', 'Configurar rede', 'Configurar HTTPS', 'Implantar aplicações', 'Executar cópias de segurança', 'Executar restauração', 'Monitorar infraestrutura', 'Executar reversão']
  },
  {
    id: 'seguranca', nome: 'Segurança', funcao: 'seguranca',
    subpasta: 'seguranca', perfilId: 'seguranca', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: true, testar: true, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/.ia/**', '/docs/seguranca/**', '/backend/**', '/infraestrutura/**'],
    diretoriosProibidos: ['/frontend/**', '/android/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-seguranca'],
    conhecimentos: ['OWASP Top 10', 'Autenticação e autorização', 'Criptografia', 'Validação de entrada', 'Sanitização', 'Gestão de segredos', 'LGPD', 'PCI-DSS', 'SOC 2', 'ISO 27001', 'Threat modeling', 'SAST', 'DAST', 'Penetration testing'],
    requerAprovacaoPara: ['alteracao_controle_seguranca', 'exposicao_dados_sensiveis'],
    condicoesDeParada: ['vulnerabilidade_critica_nao_corrigida', 'exposicao_de_segredos', 'falha_de_autenticacao', 'conformidade_comprometida', 'alteracao_destrutiva_seguranca'],
    responsabilidades: ['Analisar superfície de ataque', 'Definir controles de segurança', 'Implementar autenticação e autorização', 'Aplicar criptografia', 'Realizar SAST/DAST', 'Executar testes de segurança', 'Revisar conformidade', 'Documentar políticas de segurança', 'Gerenciar incidentes de segurança']
  },
  {
    id: 'testes', nome: 'Qualidade e Testes', funcao: 'qualidade_testes',
    subpasta: 'testes', perfilId: 'testes', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: true, testar: true, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/testes/**'],
    diretoriosProibidos: [],
    contratosObrigatorios: ['contrato-projeto', 'contrato-testes', 'contrato-api'],
    conhecimentos: ['Testes unitários', 'Testes de integração', 'Testes de API', 'Testes de contrato', 'Testes de segurança', 'Testes de interface', 'Testes E2E', 'Testes de regressão', 'Testes de desempenho'],
    requerAprovacaoPara: ['alteracao_de_ambiente'],
    condicoesDeParada: ['teste_critico_falhando', 'api_incompativel', 'violacao_de_contrato'],
    responsabilidades: ['Executar testes', 'Criar testes', 'Validar requisitos', 'Validar critérios de aceitação', 'Detectar regressões', 'Validar contratos', 'Validar segurança']
  },
  {
    id: 'revisor', nome: 'Revisor de Código', funcao: 'revisao',
    subpasta: 'revisor', perfilId: 'revisor', estado: 'ativo',
    permissoes: { ler: true, criar: false, alterar: false, excluir: false, executar: true, testar: true, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/**'],
    diretoriosProibidos: [],
    contratosObrigatorios: ['contrato-projeto', 'contrato-arquitetura', 'contrato-testes'],
    conhecimentos: ['Arquitetura', 'Legibilidade', 'SOLID', 'Coesão', 'Acoplamento', 'Duplicação', 'Desempenho', 'Testes', 'Tratamento de erros', 'Contratos', 'Padrões do projeto'],
    requerAprovacaoPara: [],
    condicoesDeParada: ['problema_de_arquitetura', 'problema_de_contrato'],
    responsabilidades: ['Revisar código', 'Verificar arquitetura', 'Verificar testes', 'Verificar contratos', 'Detectar duplicação', 'Detectar complexidade', 'Registrar recomendações']
  },
  {
    id: 'documentacao', nome: 'Documentação', funcao: 'documentacao',
    subpasta: 'documentacao', perfilId: 'documentacao', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: false, testar: false, revisar: false, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/docs/**', '/README.md', '/CHANGELOG.md'],
    diretoriosProibidos: [],
    contratosObrigatorios: ['contrato-projeto', 'contrato-documentacao'],
    conhecimentos: ['Documentação de arquitetura', 'Documentação de API', 'Documentação de instalação', 'Documentação de configuração', 'Documentação de implantação', 'Documentação de decisões', 'Solução de problemas', 'Histórico'],
    requerAprovacaoPara: [],
    condicoesDeParada: ['informacao_insuficiente'],
    responsabilidades: ['Documentar arquitetura', 'Documentar API', 'Documentar instalação', 'Documentar configuração', 'Documentar implantação', 'Documentar decisões', 'Documentar problemas', 'Atualizar histórico']
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
    contratosObrigatorios: ['contrato-projeto', 'contrato-infraestrutura'],
    conhecimentos: ['CI/CD', 'Docker', 'Kubernetes', 'Cloud', 'Monitoramento', 'Scaling', 'IaC', 'Terraform', 'Ansible', 'GitOps', 'Observabilidade'],
    requerAprovacaoPara: ['implantacao_producao', 'alteracao_producao', 'alteracao_rede_critica'],
    condicoesDeParada: ['alteracao_de_infraestrutura', 'necessidade_de_segredo', 'alteracao_destrutiva'],
    responsabilidades: ['Implementar pipeline CI/CD', 'Gerenciar containers', 'Configurar cloud', 'Monitorar infraestrutura', 'Aplicar scaling', 'Gerenciar deploy', 'Implementar IaC', 'Gerenciar segredos', 'Garantir disponibilidade']
  },
  {
    id: 'technical-writer', nome: 'Technical Writer', funcao: 'documentacao_tecnica',
    subpasta: 'technical-writer', perfilId: 'technical-writer', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: false, testar: false, revisar: false, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/docs/**', '/README.md', '/.ia/**'],
    diretoriosProibidos: ['/backend/**', '/frontend/**', '/android/**', '/banco/**', '/infraestrutura/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-documentacao'],
    conhecimentos: ['Documentação de API', 'Runbook', 'Manuais', 'Onboarding', 'Arquitetura', 'Procedimentos', 'Swagger/OpenAPI', 'Markdown', 'Guias'],
    requerAprovacaoPara: [],
    condicoesDeParada: ['informacao_insuficiente'],
    responsabilidades: ['Documentar APIs', 'Criar runbooks', 'Escrever manuais', 'Documentar procedimentos', 'Criar guias de onboarding', 'Documentar decisões arquiteturais', 'Manter documentação atualizada']
  },
  {
    id: 'gerente-projeto', nome: 'Gerente de Projeto', funcao: 'gerenciamento',
    subpasta: 'gerente-projeto', perfilId: 'gerente-projeto', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: false, testar: false, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/.ia/**', '/docs/**'],
    diretoriosProibidos: ['/frontend/**', '/backend/**', '/android/**', '/banco/**', '/infraestrutura/**', '/testes/**', '/docker/**', '/implantacao/**'],
    contratosObrigatorios: ['contrato-projeto'],
    conhecimentos: ['PMBOK', 'PRINCE2', 'Gestão de escopo', 'Gestão de riscos', 'Gestão de dependências', 'Métricas de projeto (SPI, CPI, EVM)', 'EAP/WBS', 'PERT', 'Planning Poker'],
    requerAprovacaoPara: ['alteracao_escopo', 'alteracao_prazo', 'alteracao_orcamento'],
    condicoesDeParada: ['escopo_ambiguo', 'orcamento_insuficiente', 'prazo_irrealista', 'recursos_indisponiveis', 'conflito_prioridades', 'risco_critico_nao_mitigavel', 'dependencia_externa_bloqueada', 'requisito_regulatorio', 'mudanca_arquitetural_necessaria'],
    responsabilidades: ['Elaborar Project Charter', 'Criar WBS e cronograma', 'Identificar riscos e construir Risk Register', 'Definir dependências entre tarefas', 'Planejar comunicação e engajamento de stakeholders', 'Criar tarefas estruturadas no AgentMap', 'Reportar progresso ao Proprietário']
  },
  {
    id: 'analista-sistemas', nome: 'Analista de Sistemas', funcao: 'analise-tecnica',
    subpasta: 'analista-sistemas', perfilId: 'analista-sistemas', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: false, testar: false, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/.ia/**', '/docs/arquitetura/**', '/docs/requisitos/**', '/docs/diagramas/**'],
    diretoriosProibidos: ['/frontend/**', '/backend/**', '/android/**', '/infraestrutura/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-api'],
    conhecimentos: ['UML', 'BPMN', 'SQL', 'API Design (REST/HTTP)', 'OpenAPI/Swagger', 'Modelagem de dados', 'Análise de viabilidade técnica', 'Documentação técnica'],
    requerAprovacaoPara: ['alteracao_contrato_api', 'alteracao_modelo_dados'],
    condicoesDeParada: ['requisito_ambiguo', 'contrato_conflitante', 'dependencia_inexistente', 'mudanca_arquitetural', 'risco_critico', 'informacao_insuficiente', 'fora_do_dominio'],
    responsabilidades: ['Analisar requisitos de negócio', 'Projetar APIs e contratos de integração', 'Modelar dados (ER Diagrams)', 'Criar diagramas UML (sequência, componentes, classes)', 'Escrever especificações técnicas (specs)', 'Validar viabilidade técnica', 'Identificar dependências técnicas', 'Criar glossário técnico']
  },
  {
    id: 'analista-negocios', nome: 'Analista de Negócios', funcao: 'analise-negocios',
    subpasta: 'analista-negocios', perfilId: 'analista-negocios', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: false, testar: false, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/.ia/**', '/docs/**'],
    diretoriosProibidos: ['/frontend/**', '/backend/**', '/android/**', '/banco/**', '/infraestrutura/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-arquitetura', 'contrato-seguranca', 'contrato-interface'],
    conhecimentos: ['Elicitação de requisitos', 'Modelagem BPMN 2.0', 'Priorização (MoSCoW, RICE, Kano)', 'Rastreabilidade de requisitos', 'Prototipação', 'Análise de dados', 'LGPD e conformidade', 'Gestão de stakeholders'],
    requerAprovacaoPara: ['alteracao_escopo', 'alteracao_requisitos'],
    condicoesDeParada: ['requisito_ambiguo', 'stakeholder_indisponivel', 'informacao_insuficiente', 'conflito_regras_negocio', 'necessidade_decisao_humana', 'alteracao_arquitetural_nao_aprovada'],
    responsabilidades: ['Elicitar requisitos de negócio', 'Mapear processos AS-IS e TO-BE', 'Elaborar BRD e FRD', 'Definir NFRs (FURPS+)', 'Escrever user stories e épicos', 'Priorizar requisitos por valor de negócio', 'Criar wireframes de baixa fidelidade', 'Validar requisitos com stakeholders', 'Definir critérios de aceitação']
  },
  {
    id: 'engenheiro-software', nome: 'Engenheiro de Software', funcao: 'engenharia',
    subpasta: 'engenheiro-software', perfilId: 'engenheiro-software', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: true, testar: true, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/.ia/**', '/docs/arquitetura/**', '/backend/**'],
    diretoriosProibidos: ['/frontend/**', '/android/**', '/infraestrutura/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-arquitetura', 'contrato-api', 'contrato-banco', 'contrato-seguranca'],
    conhecimentos: ['Princípios SOLID, DRY, KISS, YAGNI', 'Padrões de projeto (GoF)', 'Arquitetura em camadas, hexagonal, Clean Architecture', 'SQL avançado', 'APIs RESTful', 'Testes (unitários, integração, contrato, E2E)', 'CI/CD', 'Docker', 'Segurança (OWASP Top 10)'],
    requerAprovacaoPara: ['alteracao_arquitetural', 'alteracao_contrato_api'],
    condicoesDeParada: ['requisito_ambiguo', 'contrato_conflitante', 'dependencia_inexistente', 'mudanca_arquitetural', 'risco_critico', 'alteracao_destrutiva', 'migracao_perigosa', 'permissao_insuficiente'],
    responsabilidades: ['Analisar requisitos tecnicamente', 'Decompor funcionalidades em tarefas', 'Estimar esforço e complexidade', 'Propor arquitetura de módulos', 'Modelar dados e definir esquemas', 'Definir contratos de API', 'Identificar riscos técnicos', 'Planejar testes, segurança e deploy', 'Produzir ADRs técnicos']
  },
  {
    id: 'analista-banco-dados', nome: 'Analista de Banco de Dados', funcao: 'banco-dados',
    subpasta: 'analista-banco-dados', perfilId: 'analista-banco-dados', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: true, testar: false, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/.ia/banco/**', '/.ia/decisoes/**', '/.ia/contratos/', '/.ia/tarefas/', '/banco/**'],
    diretoriosProibidos: ['/frontend/**', '/android/**', '/infraestrutura/**', 'produção sem aprovação'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-banco'],
    conhecimentos: ['SQL avançado (DDL, DML, Window Functions, CTEs)', 'Modelagem conceitual, lógica e física', 'Normalização (1NF-5NF) e desnormalização', 'PostgreSQL, MySQL, SQL Server, Oracle', 'NoSQL (MongoDB, Redis, Cassandra)', 'Performance tuning (indexes, execution plans)', 'Migrações (Flyway, Liquibase)', 'Backup e recovery (RPO, RTO)', 'Segurança de banco (RBAC, RLS, criptografia)'],
    requerAprovacaoPara: ['alteracao_schema_producao', 'migracao_dados'],
    condicoesDeParada: ['requisito_ambiguo_sobre_dados', 'conflito_modelo_arquitetura', 'migracao_destrutiva_sem_backup', 'mudanca_sgbd_nao_planejada', 'acesso_dados_sensiveis_sem_controle', 'dependencia_circular_tabelas', 'volume_excede_capacidade', 'contrato_api_incompativel'],
    responsabilidades: ['Analisar requisitos de dados', 'Definir SGBD adequado', 'Projetar modelo conceitual (ER)', 'Projetar modelo lógico (DDL)', 'Definir estratégia de indexação', 'Estabelecer política de migrações', 'Definir estratégia de backup e recovery', 'Especificar requisitos de segurança', 'Planejar capacity planning', 'Documentar decisões em ADRs']
  },
  {
    id: 'testador-qa', nome: 'Testador/QA', funcao: 'qualidade-testes',
    subpasta: 'testador-qa', perfilId: 'testador-qa', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: false, testar: false, revisar: true, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/.ia/**', '/docs/**', '/testes/**'],
    diretoriosProibidos: ['/frontend/**', '/backend/**', '/android/**', '/banco/**', '/infraestrutura/**'],
    contratosObrigatorios: ['contrato-projeto'],
    conhecimentos: ['Test design techniques', 'Tipos de teste (funcional, regressão, integração, aceitação)', 'Níveis de teste (unitário, integração, sistema, UAT)', 'Defect management', 'Métricas de qualidade (cobertura, densidade de defeitos, MTTR)', 'Test management (TestRail, Zephyr, Xray)', 'API testing (Postman, REST Assured)', 'Performance testing (k6, JMeter)', 'CI/CD awareness'],
    requerAprovacaoPara: ['alteracao_quality_gates', 'alteracao_estrategia_teste'],
    condicoesDeParada: ['requisito_ambiguo', 'stakeholder_indisponivel', 'informacao_insuficiente', 'conflito_prioridades', 'orcamento_insuficiente_qualidade'],
    responsabilidades: ['Definir estratégia de qualidade do projeto', 'Elaborar plano de teste preliminar', 'Identificar riscos de qualidade', 'Definir métricas de qualidade', 'Estabelecer quality gates', 'Avaliar testabilidade dos requisitos', 'Estimar esforço de teste', 'Definir requisitos de infraestrutura de teste']
  },
  {
    id: 'documentador-tecnico', nome: 'Documentador Técnico', funcao: 'documentacao',
    subpasta: 'documentador-tecnico', perfilId: 'documentador-tecnico', estado: 'ativo',
    permissoes: { ler: true, criar: true, alterar: true, excluir: false, executar: false, testar: false, revisar: false, aprovar: false, implantar: false },
    diretoriosPermitidos: ['/docs/**', '/README.md', '/CHANGELOG.md', '/.ia/decisoes/**', '/.ia/procedimentos/**', '/.ia/contratos/contrato-documentacao.json', '/.ia/agentes/documentacao/'],
    diretoriosProibidos: ['/frontend/**', '/backend/**', '/android/**', '/banco/**', '/infraestrutura/**', '/testes/**'],
    contratosObrigatorios: ['contrato-projeto', 'contrato-documentacao'],
    conhecimentos: ['Redação técnica', 'Markdown e JSON', 'Documentação de APIs', 'Documentação arquitetural', 'Arquitetura da informação', 'Docs-as-code', 'Git e versionamento', 'Ferramentas de diagramação'],
    requerAprovacaoPara: ['publicacao_documentos_criticos'],
    condicoesDeParada: ['informacao_insuficiente', 'decisao_arquitetural_nao_documentada', 'requisito_conflitante', 'alteracao_contrato_afeta_docs', 'informacao_classificada_como_sensivel'],
    responsabilidades: ['Definir estrutura de pastas de documentação', 'Criar templates padronizados', 'Documentar visão geral do projeto', 'Documentar arquitetura proposta', 'Criar glossário e guia de estilo', 'Documentar decisões arquiteturais (ADRs)', 'Preparar estrutura para fases futuras', 'Definir processo de revisão documental']
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
    criteriosDeQualidade: ['correcao', 'testabilidade', 'manutenibilidade', 'arquitetura'],
    criteriosDeConclusao: [
      'Requisito implementado',
      'Critérios de aceitação atendidos',
      'Testes realizados e aprovados',
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
