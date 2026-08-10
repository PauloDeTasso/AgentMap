import * as path from 'path';
import * as fsSync from 'fs';
import {
  criarProjetoConfig,
  criarGerenciadorConfig,
  criarAmbienteConfig,
  CONFIGURACAO_MARKDOWN
} from './templates/configuracao';
import {
  AGENTES_BASE,
  criarAgentesRegistry,
  criarAgentePerfil,
  criarHabilidades,
  INSTRUCOES_MD,
  PERSONALIDADE_MD,
  REGRAS_MD,
  CONTEXTO_MD,
  MEMORIA_MD
} from './templates/agentes';
import {
  criarContratosRegistry,
  getContratosCompletos,
  getContratosPadrao,
  CONTRATO_MODELO_JSON
} from './templates/contratos';
import {
  MODELO_TAREFA,
  criarTarefasRegistry,
  DIRS_TAREFA
} from './templates/tarefas';
import {
  criarEstadoAtual,
  criarProgresso,
  criarBloqueios,
  criarDecisoes,
  criarRiscos,
  criarProblemas,
  criarConhecimento,
  criarProcedimentos,
  criarPermissoes,
  criarFerramentas,
  criarContextos,
  criarCriterios,
  criarTestes,
  criarRevisoes,
  criarEstadoGit,
  criarEventosAuditoria,
  criarPoliticas,
  criarSolicitacaoModelo
} from './templates/governanca';
import { ResultadoOperacao } from '../tipos';

const PROCEDIMENTOS_MD: Record<string, string> = {
  CRIAR_TAREFA: `# Procedimento: Criar Tarefa

## Objetivo

Criar uma nova tarefa no gerenciador de forma padronizada.

## Quando aplicar

Sempre que for necessário registrar um novo trabalho.

## Passos

1. Definir o objetivo claro da tarefa.
2. Identificar os contratos obrigatórios.
3. Verificar dependências existentes.
4. Definir critérios de aceitação.
5. Atribuir um agente responsável.
6. Definir prioridade e ambiente.
    7. Criar a tarefa no estado "RASCUNHO".

## Critérios de conclusão

- Tarefa criada com todos os campos obrigatórios preenchidos.
- Contratos obrigatórios identificados.
- Dependências mapeadas.
`,
  IMPLEMENTAR_TAREFA: `# Procedimento: Implementar Tarefa

## Objetivo

Executar uma tarefa atribuída seguindo todos os contratos e restrições.

## Passos

1. Ler os contratos obrigatórios.
2. Ler o contexto e decisões relevantes.
3. Verificar dependências.
4. Planejar a execução.
5. Implementar.
6. Executar testes.
7. Registrar o resultado.

## Critérios de conclusão

- Implementação concluída.
- Testes aprovados.
- Segurança verificada.
- Contratos respeitados.
- Documentação atualizada.
- Revisão realizada.
`,
  REVISAR_CODIGO: `# Procedimento: Revisar Código

## Objetivo

Realizar revisão de código verificável.

## Passos

1. Analisar arquitetura.
2. Verificar segurança.
3. Verificar testes.
4. Verificar contratos.
5. Detectar duplicação e complexidade.
6. Registrar recomendações.

## Critérios de conclusão

- Revisão finalizada com recomendações registradas.
`,
  EXECUTAR_TESTES: `# Procedimento: Executar Testes

## Objetivo

Validar que o sistema atende aos requisitos.

## Passos

1. Identificar testes necessários.
2. Executar testes.
3. Verificar resultados.
4. Registrar falhas.

## Critérios de conclusão

- Todos os testes obrigatórios aprovados.
`,
  CRIAR_MIGRACAO: `# Procedimento: Criar Migração

## Objetivo

Criar e aplicar uma migração de banco com segurança.

## Passos

1. Analisar alteração necessária.
2. Criar script de migração.
3. Testar em ambiente de desenvolvimento.
4. Obter aprovação.

## Critérios de conclusão

- Migração criada, testada e aprovada.
`,
  ALTERAR_API: `# Procedimento: Alterar API

## Objetivo

Alterar a API respeitando consumidores.

## Passos

1. Analisar impacto da alteração.
2. Atualizar o contrato da API.
3. Notificar consumidores.
4. Implementar alteração.

## Critérios de conclusão

    - Contrato atualizado e consumidores notificados.
    `,
  SOLICITAR_ALTERACAO: `# Procedimento: Solicitar Alteração
    
## Objetivo

Registrar uma solicitação de alteração que afete outros componentes, agentes ou contratos antes de executá-la.

## Quando aplicar

Sempre que a alteração ultrapassar o escopo seguro da tarefa atual, exigir aprovação, afetar outro agente, contrato de API, banco de dados, arquitetura, infraestrutura, dependências, documentação ou configuração.

## Passos

1. Identificar o alvo da alteração (tipo, nome, identificador, localização).
2. Descrever a alteração (tipo: ADICAO, ALTERACAO, REMOCAO, CORRECAO, MIGRACAO, SUBSTITUICAO, REESTRUTURACAO).
3. Justificar o motivo da alteração.
4. Listar arquivos afetados.
5. Identificar impactos (BACKEND, FRONTEND, API, BANCO_DADOS, etc.).
6. Listar dependências de outras solicitações ou tarefas.
7. Definir prioridade (BAIXA, MEDIA, ALTA, CRITICA).
8. Definir agente responsável ou deixar como null (aguardando atribuição).
9. Informar se requer aprovação.
10. Relacionar com a tarefa de origem.
11. Criar a Solicitação de Alteração no estado PENDENTE.

## Critérios de conclusão

- Solicitação registrada com todos os campos obrigatórios validados.
- ID no formato ALT-AAAA-NNNNN único no projeto.
- Histórico registrado em historico-alteracoes.json.
`,
  IMPLANTAR: `# Procedimento: Implantar

## Objetivo

Implantar a aplicação em um ambiente.

## Passos

1. Verificar aprovações necessárias.
2. Preparar ambiente.
3. Executar implantação.
4. Validar saúde do sistema.

## Critérios de conclusão

- Implantação concluída e validada.
`,
  REVERTER_IMPLANTACAO: `# Procedimento: Reverter Implantação

## Objetivo

Reverter uma implantação problemática.

## Passos

1. Diagnosticar a falha.
2. Identificar versão anterior.
3. Executar reversão.
4. Validar sistema estável.

## Critérios de conclusão

- Reversão concluída e sistema estável.
`
};

const POLITICAS_MD: Record<string, string> = {
  POLITICA_SEGURANCA: `# Política de Segurança

## Princípios

- Defesa em profundidade.
- Menor privilégio.
- Validação de entrada.
- Segurança desde o início.
- Não confiar no cliente.
- Segredos fora do código.

## Controles obrigatórios

- Autenticação e autorização.
- JWT e RBAC.
- BCrypt para senhas.
- Proteção contra XSS, CSRF e SQL Injection.
- Rate limiting e CORS.
- Criptografia em repouso e trânsito.
- Gestão de segredos.
- Auditoria de eventos.

## Segredos

Segredos nunca devem ser armazenados no código ou no Git. Utilize gerenciadores de segredos.
`,
  POLITICA_GIT: `# Política de Git

## Regras

- Commits atômicos com mensagens claras.
- Branch por tarefa.
- Pull request antes de merge.
- Nunca forçar push em branches compartilhadas.

## Proibições

- Commit direto em main.
- Forçar push.
- Commitear segredos.
`,
  POLITICA_QUALIDADE: `# Política de Qualidade

## Requisitos

- Cobertura mínima de 70% para regras de negócio.
- Testes em todas as novas funcionalidades.
- Revisão de código obrigatória antes de merge.
- Testes de segurança em endpoints críticos.

## Critérios de aceitação

- Código compila e testes passam.
- Critérios de aceitação atendidos.
- Documentação atualizada.
`,
  POLITICA_PERMISSOES: `# Política de Permissões

## Princípio

- Princípio do menor privilégio: cada agente recebe apenas o necessário.
- Agente só acessa seus diretórios permitidos.
- Acesso à produção exige aprovação humana.
`,
  POLITICA_MUDANCAS: `# Política de Mudanças

## Alterações críticas

As seguintes alterações exigem aprovação humana:

- Alteração arquitetural.
- Alteração destrutiva no banco.
- Alteração de segurança crítica.
- Alteração de contrato incompatível.
- Implantação em produção.
- Remoção de dados.
- Alteração de infraestrutura crítica.

## Versionamento de contratos

Contratos evoluem (v1, v2, v3). Alterações incompatíveis exigem nova versão e notificação aos consumidores.
`
};

const AGENTE_ARQUIVOS_MD: Record<string, string> = {
  instrucoes: INSTRUCOES_MD,
  personalidade: PERSONALIDADE_MD,
  regras: REGRAS_MD,
  contexto: CONTEXTO_MD,
  memoria: MEMORIA_MD
};

export class ScaffoldService {
  constructor() {}

  scaffoldProject(projetoId: string, nome: string, descricao: string, caminhoRaiz: string, dadosExtra?: Record<string, unknown>): ResultadoOperacao<string> {
    try {
      if (fsSync.existsSync(path.join(caminhoRaiz, '.ia'))) {
        return { sucesso: false, erro: 'Já existe uma estrutura .ia/ neste diretório', codigoErro: 'IA_EXISTS' };
      }
      fsSync.mkdirSync(caminhoRaiz, { recursive: true });
      fsSync.mkdirSync(path.join(caminhoRaiz, '.ia'), { recursive: true });
      fsSync.mkdirSync(path.join(caminhoRaiz, '.ia', '.backups'), { recursive: true });
      fsSync.mkdirSync(path.join(caminhoRaiz, 'frontend'), { recursive: true });
      fsSync.mkdirSync(path.join(caminhoRaiz, 'backend'), { recursive: true });
      fsSync.mkdirSync(path.join(caminhoRaiz, 'android'), { recursive: true });
      fsSync.mkdirSync(path.join(caminhoRaiz, 'banco'), { recursive: true });
      fsSync.mkdirSync(path.join(caminhoRaiz, 'infraestrutura'), { recursive: true });
      fsSync.mkdirSync(path.join(caminhoRaiz, 'implantacao'), { recursive: true });
      fsSync.mkdirSync(path.join(caminhoRaiz, 'testes'), { recursive: true });
      fsSync.mkdirSync(path.join(caminhoRaiz, 'docs'), { recursive: true });

      this.criarEstruturaIa(projetoId, nome, descricao, caminhoRaiz);

      const readmeContent = `# ${nome}\n\n${descricao || ''}\n\nEste projeto é gerenciado pelo **Gerenciador Local de Projetos para Agentes de IA**.\n`;
      fsSync.writeFileSync(path.join(caminhoRaiz, 'README.md'), readmeContent, 'utf-8');

      return { sucesso: true, dados: caminhoRaiz };
    } catch (e) {
      return { sucesso: false, erro: (e as Error).message, codigoErro: 'SCAFFOLD_ERROR' };
    }
  }

  private criarEstruturaIa(projetoId: string, nome: string, descricao: string, caminhoRaiz: string): void {
    const iaRoot = path.join(caminhoRaiz, '.ia');
    const hoje = new Date().toISOString();

    fsSync.mkdirSync(path.join(iaRoot, 'configuracao'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'agentes'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'contratos'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'tarefas', 'modelos'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'estado'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'decisoes'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'riscos'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'problemas'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'conhecimento'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'procedimentos'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'permissoes'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'contexto'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'qualidade'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'git'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'politicas'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'auditoria'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'solicitacoes'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'criterios'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'resultados'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'artefatos'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'handoffs'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'pendencias'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'validacoes'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'conflitos'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'reservas'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'sessoes'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'checkpoints'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'aprendizados'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'dependencias'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'responsabilidades'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'historico'), { recursive: true });

    // Configuração
    const projetoConfig = criarProjetoConfig(projetoId, nome, descricao);
    fsSync.writeFileSync(path.join(iaRoot, 'configuracao', 'projeto.json'), JSON.stringify(projetoConfig, null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'configuracao', 'gerenciador.json'), JSON.stringify(criarGerenciadorConfig(), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'configuracao', 'ambiente.json'), JSON.stringify(criarAmbienteConfig(), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'configuracao', 'README.md'), CONFIGURACAO_MARKDOWN, 'utf-8');

    // Agentes
    this.criarEstruturaAgentes(iaRoot, hoje);

    // Contratos
    this.criarEstruturaContratos(iaRoot, hoje);

    // Tarefas
    this.criarEstruturaTarefas(iaRoot);

    // Estado
    fsSync.writeFileSync(path.join(iaRoot, 'estado', 'estado-atual.json'), JSON.stringify(criarEstadoAtual(projetoId), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'estado', 'progresso.json'), JSON.stringify(criarProgresso(), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'estado', 'bloqueios.json'), JSON.stringify(criarBloqueios(), null, 2), 'utf-8');

    // Governança
    fsSync.writeFileSync(path.join(iaRoot, 'decisoes', 'decisoes.json'), JSON.stringify(criarDecisoes(), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'riscos', 'riscos.json'), JSON.stringify(criarRiscos(), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'problemas', 'problemas.json'), JSON.stringify(criarProblemas(), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'conhecimento', 'conhecimento.json'), JSON.stringify(criarConhecimento(), null, 2), 'utf-8');

    // Procedimentos
    fsSync.writeFileSync(path.join(iaRoot, 'procedimentos', 'procedimentos.json'), JSON.stringify(criarProcedimentos(), null, 2), 'utf-8');
    for (const [nome, conteudo] of Object.entries(PROCEDIMENTOS_MD)) {
      fsSync.writeFileSync(path.join(iaRoot, 'procedimentos', `${nome}.md`), conteudo, 'utf-8');
    }

    // Permissões e ferramentas
    fsSync.writeFileSync(path.join(iaRoot, 'permissoes', 'permissoes.json'), JSON.stringify(criarPermissoes(), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'permissoes', 'ferramentas.json'), JSON.stringify(criarFerramentas(), null, 2), 'utf-8');

    // Contexto
    fsSync.writeFileSync(path.join(iaRoot, 'contexto', 'contextos.json'), JSON.stringify(criarContextos(), null, 2), 'utf-8');

    // Qualidade
    fsSync.writeFileSync(path.join(iaRoot, 'qualidade', 'criterios.json'), JSON.stringify(criarCriterios(), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'qualidade', 'testes.json'), JSON.stringify(criarTestes(), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'qualidade', 'revisoes.json'), JSON.stringify(criarRevisoes(), null, 2), 'utf-8');

    // Git
    fsSync.writeFileSync(path.join(iaRoot, 'git', 'estado-git.json'), JSON.stringify(criarEstadoGit(), null, 2), 'utf-8');

    // Políticas
    fsSync.writeFileSync(path.join(iaRoot, 'politicas', 'politicas.json'), JSON.stringify(criarPoliticas(), null, 2), 'utf-8');
    for (const [nome, conteudo] of Object.entries(POLITICAS_MD)) {
      fsSync.writeFileSync(path.join(iaRoot, 'politicas', `${nome}.md`), conteudo, 'utf-8');
    }

    // Auditoria
    fsSync.writeFileSync(path.join(iaRoot, 'auditoria', 'eventos.json'), JSON.stringify(criarEventosAuditoria(), null, 2), 'utf-8');

    // Solicitações de Alteração
    fsSync.writeFileSync(path.join(iaRoot, 'solicitacoes', 'solicitacoes.json'), JSON.stringify({ solicitacoes: [] }, null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'solicitacoes', 'historico-alteracoes.json'), JSON.stringify({ eventos: [] }, null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'solicitacoes', 'modelo-solicitacao.json'), JSON.stringify(criarSolicitacaoModelo(), null, 2), 'utf-8');

    // Critérios de Aceitação
    fsSync.writeFileSync(path.join(iaRoot, 'criterios', 'criterios.json'), JSON.stringify({ criterios: [] }, null, 2), 'utf-8');

    // Resultados
    fsSync.writeFileSync(path.join(iaRoot, 'resultados', 'resultados.json'), JSON.stringify({ resultados: [] }, null, 2), 'utf-8');

    // Artefatos
    fsSync.writeFileSync(path.join(iaRoot, 'artefatos', 'artefatos.json'), JSON.stringify({ artefatos: [] }, null, 2), 'utf-8');

    // Handoffs
    fsSync.writeFileSync(path.join(iaRoot, 'handoffs', 'handoffs.json'), JSON.stringify({ handoffs: [] }, null, 2), 'utf-8');

    // Pendências
    fsSync.writeFileSync(path.join(iaRoot, 'pendencias', 'pendencias.json'), JSON.stringify({ pendencias: [] }, null, 2), 'utf-8');

    // Validações
    fsSync.writeFileSync(path.join(iaRoot, 'validacoes', 'validacoes.json'), JSON.stringify({ validacoes: [] }, null, 2), 'utf-8');

    // Conflitos
    fsSync.writeFileSync(path.join(iaRoot, 'conflitos', 'conflitos.json'), JSON.stringify({ conflitos: [] }, null, 2), 'utf-8');

    // Reservas
    fsSync.writeFileSync(path.join(iaRoot, 'reservas', 'reservas.json'), JSON.stringify({ reservas: [] }, null, 2), 'utf-8');

    // Sessões
    fsSync.writeFileSync(path.join(iaRoot, 'sessoes', 'sessoes.json'), JSON.stringify({ sessoes: [] }, null, 2), 'utf-8');

    // Checkpoints
    fsSync.writeFileSync(path.join(iaRoot, 'checkpoints', 'checkpoints.json'), JSON.stringify({ checkpoints: [] }, null, 2), 'utf-8');

    // Aprendizados
    fsSync.writeFileSync(path.join(iaRoot, 'aprendizados', 'aprendizados.json'), JSON.stringify({ aprendizados: [] }, null, 2), 'utf-8');

    // Dependências
    fsSync.writeFileSync(path.join(iaRoot, 'dependencias', 'dependencias.json'), JSON.stringify({ dependencias: [] }, null, 2), 'utf-8');

    // Responsabilidades
    fsSync.writeFileSync(path.join(iaRoot, 'responsabilidades', 'responsabilidades.json'), JSON.stringify({ responsabilidades: [] }, null, 2), 'utf-8');

    // Histórico de Coordenação
    fsSync.writeFileSync(path.join(iaRoot, 'historico', 'historico.json'), JSON.stringify({ eventos: [] }, null, 2), 'utf-8');
  }

  private criarEstruturaAgentes(iaRoot: string, hoje: string): void {
    const agentesDir = path.join(iaRoot, 'agentes');

    // Registro central
    fsSync.writeFileSync(path.join(agentesDir, 'agentes.json'), JSON.stringify(criarAgentesRegistry(), null, 2), 'utf-8');

    // Cada agente
    for (const agente of AGENTES_BASE) {
      const agenteDir = path.join(agentesDir, agente.subpasta);
      fsSync.mkdirSync(path.join(agenteDir, 'conhecimento'), { recursive: true });
      fsSync.mkdirSync(path.join(agenteDir, 'recursos'), { recursive: true });

      // Perfil estruturado
      const perfil = criarAgentePerfil(agente, hoje);
      fsSync.writeFileSync(path.join(agenteDir, `${agente.perfilId}.json`), JSON.stringify(perfil, null, 2), 'utf-8');

      // Habilidades
      fsSync.writeFileSync(path.join(agenteDir, 'habilidades.json'), JSON.stringify(criarHabilidades(agente), null, 2), 'utf-8');

      // Arquivos .md
      for (const [arquivo, conteudo] of Object.entries(AGENTE_ARQUIVOS_MD)) {
        fsSync.writeFileSync(path.join(agenteDir, `${arquivo}.md`), conteudo, 'utf-8');
      }
    }
  }

  private criarEstruturaContratos(iaRoot: string, hoje: string): void {
    const contratosDir = path.join(iaRoot, 'contratos');
    const contratosCompletos = getContratosCompletos();

    // Registro central
    const reg = criarContratosRegistry(getContratosPadrao());
    fsSync.writeFileSync(path.join(contratosDir, 'contratos.json'), JSON.stringify(reg, null, 2), 'utf-8');

    // Modelo
    fsSync.writeFileSync(path.join(contratosDir, 'modelo-contrato.json'), JSON.stringify(CONTRATO_MODELO_JSON, null, 2), 'utf-8');

    // Contratos individuais
    for (const [id, contrato] of Object.entries(contratosCompletos)) {
      const safeId = id.replace(/[^a-z0-9-]/g, '');
      fsSync.writeFileSync(path.join(contratosDir, `${safeId}.json`), JSON.stringify(contrato, null, 2), 'utf-8');
    }

    // Versão legível do contrato-projeto
    const projetoReadable = `# Contrato do Projeto\n\nEste é o contrato constitucional do projeto. Todos os agentes devem respeitá-lo.\n`;
    fsSync.writeFileSync(path.join(contratosDir, 'contrato-projeto.md'), projetoReadable, 'utf-8');
  }

  private criarEstruturaTarefas(iaRoot: string): void {
    const tarefasDir = path.join(iaRoot, 'tarefas');
    // Registro
    fsSync.writeFileSync(path.join(tarefasDir, 'tarefas.json'), JSON.stringify(criarTarefasRegistry(), null, 2), 'utf-8');
    // Modelo
    fsSync.writeFileSync(path.join(tarefasDir, 'modelos', 'modelo-tarefa.json'), JSON.stringify(MODELO_TAREFA, null, 2), 'utf-8');
    // Subpastas por estado
    for (const dir of DIRS_TAREFA) {
      fsSync.mkdirSync(path.join(tarefasDir, dir), { recursive: true });
    }
  }
}
