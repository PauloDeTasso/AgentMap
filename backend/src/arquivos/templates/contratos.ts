import { ContratoBase, ContratosRegistry } from '../../tipos';

const hoje = () => new Date().toISOString();

function criarContratoBase(id: string, nome: string, versao: string, objetivo: string, regras: string[], aplicavelA: string[]): ContratoBase {
  return {
    id, nome, descricao: `Contrato ${nome}.`, versao, estado: 'ativo', obrigatorio: true,
    aplicavelA, objetivo, escopo: [], regras, restricoes: [],
    padroesObrigatorios: [], padroesProibidos: [], dependencias: [],
    criteriosValidacao: [], condicoesDeExcecao: [], requerAprovacaoPara: [],
    historico: [{ versao, data: hoje(), alteracao: 'Criação' }]
  };
}

export function criarContratosRegistry(contratos: { id: string; nome: string; versao: string; estado: string; obrigatorio: boolean }[]): ContratosRegistry {
  return { contratos: contratos.map((c) => ({ id: c.id, nome: c.nome, arquivo: `/.ia/contratos/${c.id}.json`, versao: c.versao, estado: c.estado, obrigatorio: c.obrigatorio })) };
}

export function getContratosPadrao(): { id: string; nome: string; versao: string; estado: string; obrigatorio: boolean }[] {
  return [
    { id: 'contrato-projeto', nome: 'Contrato do Projeto', versao: '1.0.0', estado: 'ativo', obrigatorio: true },
    { id: 'contrato-arquitetura', nome: 'Contrato de Arquitetura', versao: '1.0.0', estado: 'ativo', obrigatorio: true },
    { id: 'contrato-api', nome: 'Contrato da API', versao: '1.0.0', estado: 'ativo', obrigatorio: true },
    { id: 'contrato-banco', nome: 'Contrato de Banco', versao: '1.0.0', estado: 'ativo', obrigatorio: false },
    { id: 'contrato-frontend', nome: 'Contrato de Frontend', versao: '1.0.0', estado: 'ativo', obrigatorio: false },
    { id: 'contrato-android', nome: 'Contrato de Android', versao: '1.0.0', estado: 'ativo', obrigatorio: false },
    { id: 'contrato-seguranca', nome: 'Contrato de Segurança', versao: '1.0.0', estado: 'ativo', obrigatorio: true },
    { id: 'contrato-infraestrutura', nome: 'Contrato de Infraestrutura', versao: '1.0.0', estado: 'ativo', obrigatorio: false },
    { id: 'contrato-testes', nome: 'Contrato de Testes', versao: '1.0.0', estado: 'ativo', obrigatorio: false },
    { id: 'contrato-documentacao', nome: 'Contrato de Documentação', versao: '1.0.0', estado: 'ativo', obrigatorio: false },
    { id: 'contrato-interface', nome: 'Contrato de Interface', versao: '1.0.0', estado: 'ativo', obrigatorio: false }
  ];
}

export function getContratosCompletos(): Record<string, ContratoBase> {
  const contratos: Record<string, ContratoBase> = {};

  contratos['contrato-projeto'] = criarContratoBase(
    'contrato-projeto', 'Contrato do Projeto', '1.0.0',
    'Definir as regras gerais que todos os agentes devem obedecer.',
    [
      'Todo agente deve conhecer sua função.',
      'Todo agente deve respeitar seu domínio.',
      'Todo agente deve respeitar os contratos.',
      'Todo agente deve executar somente tarefas autorizadas.',
      'Todo agente deve respeitar as regras de segurança.',
      'Todo agente deve registrar sua entrega.',
      'Alterações críticas exigem aprovação humana.',
      'Segredos nunca devem ser armazenados no código.',
      'Alterações devem ser rastreáveis.',
      'Uma tarefa somente pode ser concluída após atender seus critérios de conclusão.'
    ],
    ['todos']
  );

  contratos['contrato-arquitetura'] = criarContratoBase(
    'contrato-arquitetura', 'Contrato de Arquitetura', '1.0.0',
    'Definir padrões e restrições arquiteturais do projeto.',
    [
      'A arquitetura proposta deve ser seguida por todos os agentes.',
      'Alterações arquiteturais exigem aprovação do planejador ou proprietário.',
      'Componentes devem ter responsabilidade única e coesos.',
      'Dependências devem fluir em direção à camada de domínio.'
    ],
    ['planejador-arquiteto', 'backend', 'frontend', 'banco', 'android']
  );

  contratos['contrato-api'] = criarContratoBase(
    'contrato-api', 'Contrato da API', '1.0.0',
    'Definir a comunicação entre sistemas consumidores e o backend.',
    [
      'Todas as respostas devem possuir formato definido.',
      'Todos os dados recebidos devem ser validados.',
      'Erros devem utilizar códigos HTTP apropriados.',
      'Contratos incompatíveis exigem nova versão.',
      'Endpoints devem possuir autenticação quando necessário.',
      'Dados sensíveis nunca devem ser retornados desnecessariamente.'
    ],
    ['frontend', 'backend', 'android']
  );
  (contratos['contrato-api'] as any).padrao = 'API REST';
  (contratos['contrato-api'] as any).formato = 'JSON';
  (contratos['contrato-api'] as any).componentes = ['enderecos', 'metodos', 'cabecalhos', 'autenticacao', 'autorizacao', 'requisicoes', 'respostas', 'erros', 'paginacao', 'filtros', 'ordenacao', 'versionamento', 'limites'];
  (contratos['contrato-api'] as any).consumidores = ['frontend', 'android'];
  (contratos['contrato-api'] as any).provedor = 'backend';

  contratos['contrato-banco'] = criarContratoBase(
    'contrato-banco', 'Contrato de Banco', '1.0.0',
    'Definir padrões e regras para modelagem e acesso ao banco de dados.',
    [
      'Nenhuma alteração estrutural direta em produção.',
      'Todas as alterações devem passar por migração versionada.',
      'Consultas complexas devem ser revisadas por especialista.'
    ],
    ['backend', 'banco']
  );

  contratos['contrato-frontend'] = criarContratoBase(
    'contrato-frontend', 'Contrato de Frontend', '1.0.0',
    'Definir padrões de desenvolvimento da interface web.',
    [
      'Código deve seguir padrões de acessibilidade.',
      'Componentes devem ser responsivos.',
      'Segurança no navegador deve ser aplicada.',
      'Integração com API deve seguir o contrato da API.'
    ],
    ['frontend']
  );

  contratos['contrato-android'] = criarContratoBase(
    'contrato-android', 'Contrato de Android', '1.0.0',
    'Definir padrões de desenvolvimento do aplicativo Android.',
    [
      'Seguir diretrizes oficiais Android.',
      'Segurança de dados com armazenamento seguro.',
      'Permissões devem ser solicitadas em tempo de execução.',
      'Integração com API deve seguir o contrato da API.'
    ],
    ['android']
  );

  contratos['contrato-seguranca'] = criarContratoBase(
    'contrato-seguranca', 'Contrato de Segurança', '1.0.0',
    'Definir requisitos mínimos de segurança.',
    [
      'Validação de entrada em todos os pontos de entrada.',
      'Autenticação e autorização em todos os endpoints protegidos.',
      'Segredos fora do código e do Git.',
      'Criptografia em repouso e em trânsito.'
    ],
    ['todos']
  );
  (contratos['contrato-seguranca'] as any).principios = ['Defesa em profundidade', 'Menor privilégio', 'Validação de entrada', 'Segurança desde o início', 'Não confiar no cliente', 'Segredos fora do código'];
  (contratos['contrato-seguranca'] as any).controles = ['Autenticação', 'Autorização', 'Controle de acesso', 'JWT', 'RBAC', 'BCrypt', 'XSS', 'CSRF', 'SQL Injection', 'Rate Limiting', 'CORS', 'Criptografia', 'Gestão de Segredos', 'Auditoria'];
  (contratos['contrato-seguranca'] as any).requerAprovacaoPara = ['aceitacao_de_risco_critico', 'alteracao_de_autenticacao', 'alteracao_de_autorizacao', 'alteracao_de_criptografia'];

  contratos['contrato-infraestrutura'] = criarContratoBase(
    'contrato-infraestrutura', 'Contrato de Infraestrutura', '1.0.0',
    'Definir padrões para infraestrutura e implantação.',
    [
      'Infraestrutura como código versionada no Git.',
      'Segredos gerenciados fora do código.',
      'Ambientes isolados entre desenvolvimento, teste e produção.',
      'Backups automatizados antes de alterações destrutivas.'
    ],
    ['infraestrutura']
  );

  contratos['contrato-testes'] = criarContratoBase(
    'contrato-testes', 'Contrato de Testes', '1.0.0',
    'Definir padrões e critérios para validação de qualidade.',
    [
      'Todo código novo deve ter testes.',
      'Cobertura mínima de 70% para regras de negócio.',
      'Testes de segurança em endpoints críticos.',
      'Validação de contratos entre consumidores e provedor.'
    ],
    ['testes', 'backend', 'frontend', 'android']
  );

  contratos['contrato-documentacao'] = criarContratoBase(
    'contrato-documentacao', 'Contrato de Documentação', '1.0.0',
    'Definir padrões para documentação do projeto.',
    [
      'Documentação não deve descrever comportamento que não existe.',
      'Documentação deve ser atualizada em cada sprint.',
      'Decisões arquiteturais devem ser registradas como ADRs.'
    ],
    ['documentacao']
  );

  contratos['contrato-interface'] = criarContratoBase(
    'contrato-interface', 'Contrato de Interface', '1.0.0',
    'Definir padrões de interface do usuário.',
    [
      'Seguir diretrizes de acessibilidade (WCAG).',
      'Manter consistência visual entre telas.',
      'Responsividade para diferentes tamananho de tela.'
    ],
    ['frontend']
  );

  return contratos;
}

export const CONTRATO_MODELO_JSON = {
  id: 'contrato-exemplo', nome: 'Contrato de Exemplo', descricao: 'Define regras para determinado domínio.',
  versao: '1.0.0', estado: 'ativo', obrigatorio: true, aplicavelA: ['frontend', 'backend'],
  objetivo: '', escopo: [], regras: [], restricoes: [],
  padroesObrigatorios: [], padroesProibidos: [], dependencias: [],
  criteriosValidacao: [], condicoesDeExcecao: [], requerAprovacaoPara: [],
  historico: [{ versao: '1.0.0', data: null, alteracao: 'Criação' }]
};
