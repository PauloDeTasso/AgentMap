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
import { FileService } from './FileService';
import { KiloAgentGeneratorService } from '../servicios/KiloAgentGeneratorService';

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
      fsSync.writeFileSync(path.join(caminhoRaiz, 'docs', 'orquestrador.md'), `# Documentação do Orquestrador AgentMap\n\n> Referência oficial para agentes e operadores do AgentMap.\n> Leia este documento antes de usar dispatch, instancias, recuperar ou qualquer recurso de orquestração do backend.\n\n## 1. Visão geral\n\nO Orquestrador AgentMap é o subsistema responsável por executar agentes remotos via \`kilo run\`, gerenciar instâncias de execução e coordenar handoffs automáticos entre tarefas.\n\nEle é composto por:\n- InstanciaService: CRUD de instâncias (\`/api/instancias\`)\n- DaemonManager: gerencia \`kilo daemon\` por workspace\n- ExecutorKiloDaemon: executa \`kilo run --format json\` e parseia eventos\n- OrquestradorService: núcleo — dispatch, handoff automático, recuperação de estado\n- Novos endpoints: \`/api/orquestrador/*\`\n\n## 2. Conceitos fundamentais\n\n### 2.1 Instância\n\nUma instância representa uma execução concreta de um agente em um workspace.\n\n\`\`\`json\n{\n  "id": "INS-2026-00001",\n  "agenteId": "planejador-arquiteto",\n  "projetoId": "ID_DO_PROJETO",\n  "workspacePath": "G:\\\\PROJETOS\\\\AgenteMap_Projetos\\\\NOME_DO_PROJETO",\n  "tipoInstancia": "EXECUTOR",\n  "status": "CONECTADA",\n  "modoAutonomia": "MANUAL",\n  "sessaoId": "ses_...",\n  "versaoKilo": "7.4.21",\n  "capabilities": ["kilo-run", "json-stream"]\n}\n\`\`\`\n\nStatus: REGISTRADA | CONECTADA | DESCONECTADA | ERRO\nModo autonomia: MANUAL | ASSISTIDA | AUTONOMA\n\n### 2.2 Dispatch\n\nDispatch é a ação de executar um comando Kilo (\`kilo run\`) em um workspace específico, associando-o a uma tarefa e um agente.\n\nFluxo:\n1. Orquestrador valida tarefa existente\n2. Cria instância EXECUTOR para o agente\n3. Inicia \`kilo daemon\` no workspace (se necessário)\n4. Executa \`kilo run --agent <agente> --dir <workspace> --format json --title <titulo> <mensagem>\`\n5. Parseia stream JSON de eventos (step_start, text, step_finish)\n6. Registra log em \`.ia/contexto/dispatch-log.json\`\n7. Se step_finish encontrado → tenta alterar tarefa para CONCLUIDA\n8. Executa handoff automático se houver dependências\n\n### 2.3 Handoff automático\n\nQuando uma tarefa é concluída (CONCLUIDA), o orquestrador verifica dependências ativas. Para cada dependência:\n- Marca dependência como RESOLVIDA\n- Cria handoff automático\n- Se tarefa destino estiver em PLANEJADA ou PRONTA, avança para PRONTA\n\nImportante: O handoff automático só cria registros se existirem dependências ativas na tarefa de origem.\n\n### 2.4 Recuperação de estado\n\n\`POST /api/orquestrador/recuperar\` verifica:\n- Saúde de todos os daemons registrados\n- Tarefas órfãs (estado EM_EXECUCAO sem instância conectada)\n- Reconcilia tarefas órfãs para PRONTA\n\n## 3. Endpoints da API\n\n### 3.1 Instâncias\n\n| Método | Endpoint | Descrição |\n|--------|----------|-----------|\n| GET | /api/instancias | Lista instâncias |\n| GET | /api/instancias/:id | Obtém instância |\n| POST | /api/instancias | Cria instância |\n| PUT | /api/instancias/:id | Atualiza instância |\n| DELETE | /api/instancias/:id | Exclui instância |\n\n### 3.2 Orquestrador\n\n| Método | Endpoint | Descrição |\n|--------|----------|-----------|\n| POST | /api/orquestrador/dispatch | Executa dispatch |\n| GET | /api/orquestrador/status | Status do orquestrador |\n| POST | /api/orquestrador/recuperar | Recuperação de estado |\n| PUT | /api/orquestrador/instancias/:id/modo | Altera modo de autonomia |\n| POST | /api/orquestrador/handoffs/auto | Força handoff automático |\n\n## 4. Guia de uso para agentes\n\n### 4.1 Antes de iniciar uma tarefa\n\n1. Verifique se o projeto está aberto no AgentMap\n2. Verifique se há instâncias ativas para seu agente\n3. Verifique o estado da tarefa\n4. Leia os contratos obrigatórios em .ia/contratos/\n\n### 4.2 Como solicitar execução (dispatch)\n\nUse POST /api/orquestrador/dispatch com:\n- tarefaId: ID da tarefa atual\n- agenteId: agente responsável\n- mensagem: instrução para o agente\n- dir: workspace onde o comando será executado\n- title: título da sessão Kilo\n- timeoutMs: timeout em ms (padrão: 120000)\n\n### 4.3 Como alterar modo de autonomia\n\nPUT /api/orquestrador/instancias/:id/modo\n{ "modo": "AUTONOMA" }\n\nValores: MANUAL | ASSISTIDA | AUTONOMA\n\n### 4.4 Como recuperar estado após falha\n\nPOST /api/orquestrador/recuperar\n\n### 4.5 Monitoramento\n\n- GET /api/orquestrador/status\n- GET /api/instancias\n- GET /api/tarefas\n- WebSocket: ws://localhost:3150/ws/monitoramento\n\n## 5. Limitações e regras\n\n1. Kilo daemon: o orquestrador inicia/verifica daemons automaticamente, mas não para daemons existentes\n2. Portas: daemons usam faixa 4097-4116 para auto-discovery\n3. Handoff automático: só ocorre quando há dependências ativas\n4. Transições de estado: validadas por StateMachineService\n5. kilo run: requer Kilo 7.4.21+ instalado\n\n## 6. Solução de problemas\n\n### Daemon não iniciado\n- Verifique se kilo daemon start funciona manualmente no workspace\n- Verifique se a porta está livre\n\n### Dispatch falhou\n- Verifique se o workspace existe e é acessível\n- Verifique se kilo run funciona manualmente\n- Verifique se o agente e a tarefa existem\n\n### Tarefa não avança para CONCLUIDA\n- Verifique se há step_finish nos eventos do dispatch\n- Verifique se a transição de estado é válida\n- Verifique se não há dependências pendentes\n\n### Handoff não criado\n- Verifique se a tarefa tem dependências ativas\n- Handoff só é criado automaticamente se houver dependências\n\n## 7. Referências de código\n\n- src/servicios/OrquestradorService.ts\n- src/servicios/InstanciaService.ts\n- src/servicios/DaemonManager.ts\n- src/servicios/ExecutorKiloDaemon.ts\n- src/api/orquestrador.ts\n- src/api/instancias.ts\n`, 'utf-8');
      fsSync.writeFileSync(path.join(caminhoRaiz, 'docs', 'orquestrador-quickref.md'), `# Guia Rápido — Orquestrador AgentMap\n\n> Para agentes: leia este guia antes de sua primeira tarefa envolvendo orquestração.\n\n## Endpoints essenciais\n\n| Ação | Método | Endpoint |\n|------|--------|----------|\n| Listar instâncias | GET | /api/instancias |\n| Obter instância | GET | /api/instancias/:id |\n| Criar instância | POST | /api/instancias |\n| Atualizar instância | PUT | /api/instancias/:id |\n| Excluir instância | DELETE | /api/instancias/:id |\n| Dispatch | POST | /api/orquestrador/dispatch |\n| Status | GET | /api/orquestrador/status |\n| Recuperar estado | POST | /api/orquestrador/recuperar |\n| Alterar modo autonomia | PUT | /api/orquestrador/instancias/:id/modo |\n\n## Exemplos rápidos\n\n### Dispatch\n\n\`\`\`bash\ncurl -X POST http://localhost:3150/api/orquestrador/dispatch \\\n  -H "Content-Type: application/json" \\\n  -d \'{\n    "tarefaId": "TAR-2026-00001",\n    "agenteId": "planejador-arquiteto",\n    "mensagem": "responda OK",\n    "dir": "G:\\\\PROJETOS\\\\AgenteMap_Projetos\\\\NOME_DO_PROJETO",\n    "title": "meu-dispatch",\n    "timeoutMs": 30000\n  }\'\n\`\`\`\n\n### Status\n\n\`\`\`bash\ncurl http://localhost:3150/api/orquestrador/status\n\`\`\`\n\n### Recuperar estado\n\n\`\`\`bash\ncurl -X POST http://localhost:3150/api/orquestrador/recuperar\n\`\`\`\n\n### Alterar modo autonomia\n\n\`\`\`bash\ncurl -X PUT http://localhost:3150/api/orquestrador/instancias/INS-2026-00001/modo \\\n  -H "Content-Type: application/json" \\\n  -d \'{"modo": "AUTONOMA"}\'\n\`\`\`\n\n## Regras rápidas\n\n1. Sempre verifique o estado da tarefa antes de solicitar dispatch\n2. Handoff automático só funciona se houver dependências na tarefa\n3. Daemons são reutilizados — não pare daemons existentes\n4. kilo run requer Kilo 7.4.21+ instalado\n5. Instâncias são criadas automaticamente no dispatch\n\n## Arquivos importantes\n\n| Arquivo | Descrição |\n|---------|-----------|\n| .ia/instancias/instancias.json | Registry de instâncias |\n| .ia/contexto/dispatch-log.json | Log de dispatches |\n| .ia/handoffs/handoffs.json | Handoffs criados |\n| docs/orquestrador.md | Documentação completa |\n\n## Suporte\n\n- Documentação completa: docs/orquestrador.md\n- Logs do backend: server_output.log\n- WebSocket monitoramento: ws://localhost:3150/ws/monitoramento\n`, 'utf-8');

      this.criarEstruturaIa(projetoId, nome, descricao, caminhoRaiz);

      try {
        const fileService = new FileService(caminhoRaiz);
        const agentes = AGENTES_BASE.map((a) => ({
          ...criarAgentePerfil(a, new Date().toISOString()),
          registro: {
            id: a.id,
            nome: a.nome,
            funcao: a.funcao,
            estado: a.estado,
            arquivoPerfil: `/.ia/agentes/${a.subpasta}/${a.perfilId}.json`
          }
        }));
        const kiloGenerator = new KiloAgentGeneratorService(fileService);
        kiloGenerator.gerarAgentes(agentes);
      } catch (e) {
        console.error('[ScaffoldService] erro ao gerar agentes Kilo:', (e as Error).message);
      }

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
    fsSync.mkdirSync(path.join(iaRoot, 'instancias'), { recursive: true });

    // Configuração
    const projetoConfig = criarProjetoConfig(projetoId, nome, descricao);
    fsSync.writeFileSync(path.join(iaRoot, 'configuracao', 'projeto.json'), JSON.stringify(projetoConfig, null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'configuracao', 'gerenciador.json'), JSON.stringify(criarGerenciadorConfig(), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'configuracao', 'ambiente.json'), JSON.stringify(criarAmbienteConfig(), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'configuracao', 'README.md'), CONFIGURACAO_MARKDOWN, 'utf-8');

    // Agentes
    this.criarEstruturaAgentes(iaRoot, hoje, nome);

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

    // Fluxo obrigatório
    fsSync.writeFileSync(path.join(iaRoot, 'fluxo-desenvolvimento.json'), JSON.stringify({
      fluxo: [
        { ordem: 1, etapa: 'necessidade', responsavel: 'proprietario', descricao: 'Definir o objetivo e o escopo do projeto.' },
        { ordem: 2, etapa: 'planejamento', responsavel: 'planejador-arquiteto', descricao: 'Criar estrutura de pastas, convenções e tarefas.' },
        { ordem: 3, etapa: 'arquitetura', responsavel: 'planejador-arquiteto', descricao: 'Definir arquitetura e padrões do projeto.' },
        { ordem: 4, etapa: 'contratos', responsavel: 'planejador-arquiteto', descricao: 'Criar contratos entre áreas e agentes.' },
        { ordem: 5, etapa: 'tarefas', responsavel: 'planejador-arquiteto', descricao: 'Criar tarefas com dependências explícitas.' },
        { ordem: 6, etapa: 'implementacao', responsavel: 'agente_especializado', descricao: 'Executar implementações respeitando dependências.' },
        { ordem: 7, etapa: 'testes', responsavel: 'testes', descricao: 'Executar testes automatizados e validar cobertura.' },
        { ordem: 8, etapa: 'seguranca', responsavel: 'seguranca', descricao: 'Aplicar checklist de segurança e validar entrada/saída.' },
        { ordem: 9, etapa: 'revisao', responsavel: 'revisor', descricao: 'Revisar código, qualidade e aderência aos contratos.' },
        { ordem: 10, etapa: 'aprovacao', responsavel: 'proprietario', descricao: 'Aprovar ou rejeitar entregas conforme critérios.' },
        { ordem: 11, etapa: 'integracao', responsavel: 'git', descricao: 'Registrar alterações no Git e atualizar estado.' },
        { ordem: 12, etapa: 'documentacao', responsavel: 'documentacao', descricao: 'Documentar entregas, decisões e exemplos.' },
        { ordem: 13, etapa: 'atualizacao_estado', responsavel: 'gerenciador', descricao: 'Atualizar estado do projeto e métricas.' }
      ],
      regras: [
        'Nenhuma tarefa deve iniciar antes de suas dependências estarem concluídas.',
        'O planejador sempre cria o fluxo e as dependências antes de iniciar implementações.',
        'Agentes devem consultar dependências no início de cada ciclo de trabalho.',
        'Tarefas sem dependências podem executar em paralelo.',
        'Tarefas com dependências devem esperar bloco/reserva antes de prosseguir.'
      ]
    }, null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'fluxo-trabalho.md'), `# Fluxo de Trabalho Sincronizado — ${nome}\n\nEste documento define como o trabalho deve ser organizado para respeitar dependências entre agentes.\n\n## Princípio\n\nO AgentMap registra dependências, mas **não inicia agentes automaticamente**. O fluxo real deve ser conduzido como pessoas:\n\n1. O planejador define o que deve ser feito e em que ordem.\n2. Os agentes só começam quando os pré-requisitos estão prontos.\n3. O monitoramento mostra o estado atual para decisões humanas.\n\n## Ordem padrão do projeto\n\n1. Planejador/Arquiteto\n2. Backend / Banco / Frontend / Android / Infraestrutura\n3. Testes / Segurança / Observabilidade\n4. Revisor / Documentação / Desempenho\n\n## Regras de execução\n\n- Nenhuma tarefa com dependência pendente deve iniciar.\n- Se uma tarefa dependente tentar executar antes da hora, ela deve registrar um bloqueio no AgentMap e aguardar.\n- O usuário/revisor deve usar o monitoramento para identificar gargalos e desbloqueios.\n\n## Sincronização com Kilo Code / Agent Manager\n\n- Crie worktrees apenas para tarefas sem dependências pendentes.\n- Worktrees de tarefas dependentes devem ser criados/ativados somente após a conclusão da tarefa pré-requisito.\n- Use o monitoramento do AgentMap para validar o estado antes de iniciar novos worktrees.\n`, 'utf-8');

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

    // Instâncias
    fsSync.writeFileSync(path.join(iaRoot, 'instancias', 'instancias.json'), JSON.stringify({ instancias: [] }, null, 2), 'utf-8');

    // Fluxo obrigatório para novos projetos
    fsSync.writeFileSync(path.join(iaRoot, 'fluxo-desenvolvimento.json'), JSON.stringify({
      fluxo: [
        { ordem: 1, etapa: 'necessidade', responsavel: 'proprietario', descricao: 'Definir o objetivo e o escopo do projeto.' },
        { ordem: 2, etapa: 'planejamento', responsavel: 'planejador-arquiteto', descricao: 'Criar estrutura de pastas, convenções e tarefas.' },
        { ordem: 3, etapa: 'arquitetura', responsavel: 'planejador-arquiteto', descricao: 'Definir arquitetura e padrões do projeto.' },
        { ordem: 4, etapa: 'contratos', responsavel: 'planejador-arquiteto', descricao: 'Criar contratos entre áreas e agentes.' },
        { ordem: 5, etapa: 'tarefas', responsavel: 'planejador-arquiteto', descricao: 'Criar tarefas com dependências explícitas.' },
        { ordem: 6, etapa: 'implementacao', responsavel: 'agente_especializado', descricao: 'Executar implementações respeitando dependências.' },
        { ordem: 7, etapa: 'testes', responsavel: 'testes', descricao: 'Executar testes automatizados e validar cobertura.' },
        { ordem: 8, etapa: 'seguranca', responsavel: 'seguranca', descricao: 'Aplicar checklist de segurança e validar entrada/saída.' },
        { ordem: 9, etapa: 'revisao', responsavel: 'revisor', descricao: 'Revisar código, qualidade e aderência aos contratos.' },
        { ordem: 10, etapa: 'aprovacao', responsavel: 'proprietario', descricao: 'Aprovar ou rejeitar entregas conforme critérios.' },
        { ordem: 11, etapa: 'integracao', responsavel: 'git', descricao: 'Registrar alterações no Git e atualizar estado.' },
        { ordem: 12, etapa: 'documentacao', responsavel: 'documentacao', descricao: 'Documentar entregas, decisões e exemplos.' },
        { ordem: 13, etapa: 'atualizacao_estado', responsavel: 'gerenciador', descricao: 'Atualizar estado do projeto e métricas.' }
      ],
      regras: [
        'Nenhuma tarefa deve iniciar antes de suas dependências estarem concluídas.',
        'O planejador sempre cria o fluxo e as dependências antes de iniciar implementações.',
        'Agentes devem consultar dependências no início de cada ciclo de trabalho.',
        'Tarefas sem dependências podem executar em paralelo.',
        'Tarefas com dependências devem esperar bloco/reserva antes de prosseguir.'
      ]
    }, null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'fluxo-trabalho.md'), `# Fluxo de Trabalho Sincronizado — ${nome}

Este documento define como o trabalho deve ser organizado para respeitar dependências entre agentes.

## Princípio

O AgentMap registra dependências, mas **não inicia agentes automaticamente**. O fluxo real deve ser conduzido como pessoas:

1. O planejador define o que deve ser feito e em que ordem.
2. Os agentes só começam quando os pré-requisitos estão prontos.
3. O monitoramento mostra o estado atual para decisões humanas.

## Ordem padrão do projeto

1. Planejador/Arquiteto
2. Backend / Banco / Frontend / Android / Infraestrutura
3. Testes / Segurança / Observabilidade
4. Revisor / Documentação / Desempenho

## Regras de execução

- Nenhuma tarefa com dependência pendente deve iniciar.
- Se uma tarefa dependente tentar executar antes da hora, ela deve registrar um bloqueio no AgentMap e aguardar.
- O usuário/revisor deve usar o monitoramento para identificar gargalos e desbloqueios.

## Sincronização com Kilo Code / Agent Manager

- Crie worktrees apenas para tarefas sem dependências pendentes.
- Worktrees de tarefas dependentes devem ser criados/ativados somente após a conclusão da tarefa pré-requisito.
- Use o monitoramento do AgentMap para validar o estado antes de iniciar novos worktrees.
`, 'utf-8');

    // Fluxo padrão global
    fsSync.writeFileSync(path.join(iaRoot, 'fluxo-trabalho-padrao.md'), `# Fluxo de Trabalho Padrão — Novos Projetos

Este documento é a referência oficial para iniciar qualquer projeto no AgentMap.
Todo agente deve seguir esta ordem antes de executar qualquer trabalho.

## Regra geral

- Nada é executado em paralelo sem controle explícito.
- Cada agente só começa depois de verificar seu checklist de entrada.
- Cada agente só termina depois de registrar todas as saídas definidas.
- O desrespeito ao fluxo bloqueia a tarefa e é registrado como bloqueio.

## Ordem oficial

1. Planejador/Arquiteto
2. Agentes de implementação: Backend, Banco, Frontend, Android, Infraestrutura
3. Agentes de verificação: Testes, Segurança, Observabilidade
4. Agentes de revisão e documentação: Revisor, Documentação, Desempenho

## Documentos obrigatórios

- \`.ia/fluxo-desenvolvimento.json\`
- \`.ia/fluxo-trabalho.md\`
- \`.ia/contratos/\`
- \`.ia/tarefas/\`
- \`.ia/dependencias/\`
- \`.ia/procedimentos/\`
- \`.ia/politicas/\`

## Checklist global de entrada

Antes de iniciar qualquer tarefa:
- [ ] Projeto aberto no AgentMap
- [ ] \`.ia/fluxo-desenvolvimento.json\` existe
- [ ] \`.ia/fluxo-trabalho.md\` existe
- [ ] Tarefa atribuída está no estado RASCUNHO, PLANEJADA ou PRONTA
- [ ] Dependências da tarefa estão concluídas
- [ ] Contratos obrigatórios foram lidos
- [ ] Procedimentos obrigatórios foram lidos
- [ ] Diretórios permitidos e proibidos foram respeitados
- [ ] Ambiente definido em \`.ia/configuracao/ambiente.json\`

## Checklist global de saída

Depois de concluir qualquer tarefa:
- [ ] Resultado registrado no AgentMap
- [ ] Artefatos registrados no AgentMap
- [ ] Arquivos entregues estão nos caminhos esperados
- [ ] Tarefa evoluiu para EM_EXECUCAO e depois para CONCLUIDA
- [ ] Handoff criado se outro agente precisar continuar
- [ ] Bloqueios registrados se houver impedimento
- [ ] Decisões tomadas foram registradas
- [ ] Riscos identificados foram registrados
- [ ] Documentação atualizada se necessário
- [ ] Eventos pendentes foram confirmados
- [ ] Sanitização aplicada: sem segredos, sem metadados internos

## Preparação por papel

Cada papel tem um documento de preparação em:
- \`.ia/procedimentos/preparacao-<papel>.md\`

## Entrega por papel

Cada papel tem um documento de entrega em:
- \`.ia/procedimentos/entrega-<papel>.md\`

## Controle de estado

- O agente deve consultar o estado do projeto antes de trabalhar.
- O agente deve atualizar o estado depois de trabalhar.
- O monitoramento deve ser usado para verificar conflitos e bloqueios.
`, 'utf-8');

    // Preparação e entrega por papel
    const papeis = [
      'planejador',
      'backend',
      'banco',
      'frontend',
      'android',
      'infraestrutura',
      'testes',
      'seguranca',
      'revisor',
      'documentacao',
      'observabilidade',
      'desempenho'
    ];
    for (const papel of papeis) {
      const prepPath = path.join(iaRoot, 'procedimentos', `preparacao-${papel}.md`);
      const entPath = path.join(iaRoot, 'procedimentos', `entrega-${papel}.md`);
      if (!fsSync.existsSync(prepPath)) {
        fsSync.writeFileSync(prepPath, `# Preparação: ${papel}\n\nUse este documento antes de iniciar qualquer tarefa de ${papel}.\n`, 'utf-8');
      }
      if (!fsSync.existsSync(entPath)) {
        fsSync.writeFileSync(entPath, `# Entrega: ${papel}\n\nUse este documento depois de concluir qualquer tarefa de ${papel}.\n`, 'utf-8');
      }
    }

    // Template padrão de projeto
    fsSync.writeFileSync(path.join(iaRoot, 'template-padrao-projeto.md'), `# Template Padrão de Projeto\n\nUse este template como base para todo novo projeto no AgentMap.\n\n## Estrutura obrigatória\n\n\`\`\`text\nprojeto/\n  .ia/\n    fluxo-desenvolvimento.json\n    fluxo-trabalho.md\n    fluxo-trabalho-padrao.md\n    procedimentos/\n      preparacao-*.md\n      entrega-*.md\n    contratos/\n    tarefas/\n    dependencias/\n    configuracao/\n    agentes/\n    estado/\n\`\`\`\n\n## Regras de criação\n\n1. O planejador sempre cria o projeto primeiro.\n2. O planejador sempre define o fluxo e as dependências antes de qualquer implementação.\n3. Nenhuma tarefa pode iniciar sem dependências atendidas.\n4. Todo agente deve ler seu documento de preparação antes de começar.\n5. Todo agente deve registrar resultado, artefatos e handoff depois de terminar.\n6. O monitoramento deve ser usado para verificar estado e bloqueios.\n\n## Checklist de criação\n\n- [ ] Projeto criado na pasta correta\n- [ ] \`.ia/fluxo-desenvolvimento.json\` criado\n- [ ] \`.ia/fluxo-trabalho.md\` criado\n- [ ] Procedimentos de preparação criados para todos os papéis\n- [ ] Procedimentos de entrega criados para todos os papéis\n- [ ] Contratos obrigatórios criados\n- [ ] Tarefas criadas com dependências explícitas\n- [ ] Agentes registrados no AgentMap\n\n## Checklist de execução\n\n- [ ] Projeto aberto no AgentMap\n- [ ] Tarefa atribuída e no estado correto\n- [ ] Dependências verificadas\n- [ ] Contratos lidos\n- [ ] Procedimentos de preparação lidos\n- [ ] Trabalho executado\n- [ ] Procedimentos de entrega seguidos\n- [ ] Resultado registrado\n- [ ] Artefatos registrados\n- [ ] Handoff criado se necessário\n- [ ] Eventos confirmados\n`, 'utf-8');
  }

  private criarEstruturaAgentes(iaRoot: string, hoje: string, nome: string): void {
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

    // Orquestrador
    const orquestradorDir = path.join(agentesDir, 'orquestrador');
    fsSync.mkdirSync(path.join(orquestradorDir, 'conhecimento'), { recursive: true });
    fsSync.mkdirSync(path.join(orquestradorDir, 'recursos'), { recursive: true });
    fsSync.writeFileSync(path.join(orquestradorDir, 'orquestrador-perfil.json'), JSON.stringify({
      id: 'orquestrador',
      nome: 'Orquestrador',
      funcao: 'orquestracao',
      estado: 'ativo',
      perfilId: 'orquestrador-perfil',
      subpasta: 'orquestrador',
      permissoes: { leitura: ['*'], escrita: ['.ia/tarefas', '.ia/dependencias', '.ia/handoffs', '.ia/eventos', '.ia/bloqueios'], execucao: ['api', 'mcp', 'agente_manager', 'file_watcher'], aprovacao: false },
      diretoriosPermitidos: ['*'],
      diretoriosProibidos: ['.env', '*.key', '*.pem'],
      conhecimentos: [],
      dominios: ['planejamento', 'backend', 'banco', 'frontend', 'android', 'infraestrutura', 'testes', 'seguranca', 'revisor', 'documentacao', 'observabilidade', 'desempenho'],
      datas: { criacao: hoje, atualizacao: hoje }
    }, null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(orquestradorDir, 'habilidades.json'), JSON.stringify({
      agenteId: 'orquestrador',
      habilidades: ['Ler estado completo do projeto via API', 'Identificar tarefas prontas para execucao', 'Verificar dependencias pendentes', 'Criar handoffs e eventos', 'Enviar prompts para agentes responsaveis', 'Registrar bloqueios quando necessario', 'Atualizar estado de tarefas', 'Consultar monitoramento do projeto'],
      ferramentas: ['api', 'mcp', 'agente_manager', 'file_watcher', 'auditoria'],
      limitacoes: ['Nao executar implementacoes diretamente', 'Nao modificar codigo fonte', 'Nao aprovar ou rejeitar entregas', 'Manter circuit breaker contra loops infinitos']
    }, null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(orquestradorDir, 'instrucoes.md'), `# Instrucoes: Orquestrador\n\nVoce e o agente orquestrador do projeto ${nome}. Sua funcao e gerenciar o fluxo de trabalho entre todos os agentes, garantindo que cada tarefa seja executada na ordem correta, respeitando dependencias.\n\n## Responsabilidades\n\n- Consultar o estado do projeto periodicamente\n- Identificar quais tarefas estao prontas para iniciar\n- Verificar se dependencias estao concluidas\n- Comandar agentes responsaveis via prompts\n- Registrar bloqueios e handoffs\n- Atualizar estado de tarefas\n- Manter monitoramento atualizado\n\n## Regras\n\n- Nunca iniciar tarefa com dependencia pendente\n- Sempre registrar handoff ao transferir contexto\n- Sempre registrar bloqueio se encontrar impedimento\n- Respeitar o fluxo padrao do projeto\n- Nao executar implementacoes diretamente\n- Manter circuit breaker ativo\n`, 'utf-8');
    fsSync.writeFileSync(path.join(orquestradorDir, 'personalidade.md'), `# Personalidade: Orquestrador\n\n- Metodico e sistematico\n- Focado em estado e dependencias\n- Comunicativo via eventos e handoffs\n- Conservador: prefere bloquear a executar errado\n- Transparente: registra todas as decisoes\n`, 'utf-8');
    fsSync.writeFileSync(path.join(orquestradorDir, 'regras.md'), `# Regras: Orquestrador\n\n## Regras Gerais\n\n- Respeitar o fluxo padrao definido em .ia/fluxo-desenvolvimento.json\n- Nunca iniciar tarefa com dependencia pendente\n- Sempre registrar handoff ao transferir contexto\n- Sempre registrar bloqueio se encontrar impedimento\n- Respeitar contratos obrigatorios\n\n## Regras de Seguranca\n\n- Nao expor segredos em prompts ou eventos\n- Nao modificar codigo fonte diretamente\n- Nao aprovar ou rejeitar entregas\n- Manter logs de todas as acoes\n\n## Regras de Circuit Breaker\n\n- Maximo de 5 comandos por minuto por agente\n- Maximo de 3 tentativas de reenvio por tarefa\n- Timeout de 30 minutos por tarefa\n- Se loop detectado: pausar por 5 minutos\n`, 'utf-8');
    fsSync.writeFileSync(path.join(orquestradorDir, 'contexto.md'), `# Contexto: Orquestrador\n\n## Estado do Projeto\n\nO orquestrador mantem o estado do projeto em .ia/estado/estado-atual.json.\n\n## Tarefas\n\nTarefas sao armazenadas em .ia/tarefas/tarefas.json e organizadas por estado em subpastas.\n\n## Dependencias\n\nDependencias sao armazenadas em .ia/dependencias/dependencias.json.\n\n## Eventos\n\nEventos sao registrados em .ia/auditoria/eventos.json.\n\n## Handoffs\n\nHandoffs sao registrados em .ia/handoffs/handoffs.json.\n\n## Bloqueios\n\nBloqueios sao registrados em .ia/estado/bloqueios.json.\n`, 'utf-8');
    fsSync.writeFileSync(path.join(orquestradorDir, 'memoria.md'), `# Memoria: Orquestrador\n\n## Historico de Decisoes\n\n- ${hoje.split('T')[0]}: Orquestrador criado para projeto ${nome}\n\n## Aprendizados\n\n- Sempre verificar dependencias antes de comandar agente\n- Registrar handoff para preservar contexto\n- Usar bloqueio quando nao ha como prosseguir\n`, 'utf-8');

    const orquestradorRecursosDir = path.join(iaRoot, 'orquestrador');
    fsSync.mkdirSync(orquestradorRecursosDir, { recursive: true });
    fsSync.writeFileSync(path.join(orquestradorRecursosDir, 'package.json'), JSON.stringify({ name: 'orquestrador', version: '1.0.0', description: 'Agente orquestrador do AgentMap', main: 'polling.js', scripts: { start: 'node polling.js', test: 'node test-polling.js' }, dependencies: { axios: '^1.6.0', chokidar: '^3.6.0' } }, null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(orquestradorRecursosDir, 'estado.json'), JSON.stringify({ estado: 'INATIVO', ultimoCiclo: null, ciclos: 0, comandosEnviados: 0, tarefasIniciadas: 0, tarefasBloqueadas: 0, circuitBreakerAtivo: false, motivoParada: null, inicio: null, ultimaAtualizacao: null }, null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(orquestradorRecursosDir, 'logs.md'), `# Logs do Orquestrador\n\n## Formato\n\n\`\`\`\n[${hoje.split('T')[0]}T00:00:00Z] CICLO_INICIADO | tarefas_prontas=0 | comandos=0 | circuito=OK\n\`\`\`\n\n## Eventos\n\n- \`CICLO_INICIADO\` — inicio de ciclo de polling\n- \`COMANDO_ENVIADO\` — prompt enviado para agente\n- \`HANDOFF_CRIADO\` — handoff registrado\n- \`BLOQUEIO\` — tarefa bloqueada por dependencia\n- \`CIRCUIT_BREAKER\` — circuito aberto por loop detectado\n- \`ERRO\` — erro inesperado no orquestrador\n`, 'utf-8');
    fsSync.writeFileSync(path.join(orquestradorRecursosDir, 'polling.js'), `const axios = require('axios');\nconst fs = require('fs');\nconst path = require('path');\n\nconst API_BASE = process.env.AGENTMAP_API || 'http://localhost:3150/api';\nconst PROJETO_ID = process.env.AGENTMAP_PROJETO_ID || '';\nconst POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '60000', 10);\nconst MAX_COMMANDS_PER_CYCLE = parseInt(process.env.MAX_COMMANDS_PER_CYCLE || '1', 10);\nconst MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);\nconst TASK_TIMEOUT_MS = parseInt(process.env.TASK_TIMEOUT_MS || '1800000', 10);\nconst CIRCUIT_BREAKER_PAUSE_MS = parseInt(process.env.CIRCUIT_BREAKER_PAUSE_MS || '300000', 10);\nconst MAX_COMMANDS_PER_MINUTE_PER_AGENT = parseInt(process.env.MAX_COMMANDS_PER_MINUTE_PER_AGENT || '5', 10);\n\nconst STATE_FILE = path.join(__dirname, 'estado.json');\nconst LOG_FILE = path.join(__dirname, 'logs.txt');\n\nfunction log(evento, dados = {}) {\n  const linha = \`[\${new Date().toISOString()}] \${evento} \${JSON.stringify(dados)}\\n\`;\n  fs.appendFileSync(LOG_FILE, linha);\n  console.log(linha.trim());\n}\n\nfunction carregarEstado() {\n  if (!fs.existsSync(STATE_FILE)) {\n    return {\n      estado: 'INATIVO',\n      circuitBreakerAtivo: false,\n      comandosPorAgente: {},\n      tentativasPorTarefa: {},\n      tarefasIniciadasEm: {},\n      ciclos: 0,\n      tarefasIniciadas: 0,\n      comandosEnviados: 0\n    };\n  }\n  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));\n}\n\nfunction salvarEstado(estado) {\n  estado.ultimaAtualizacao = new Date().toISOString();\n  fs.writeFileSync(STATE_FILE, JSON.stringify(estado, null, 2));\n}\n\nasync function apiGet(caminho) {\n  const url = \`\${API_BASE}\${caminho}\`;\n  const response = await axios.get(url);\n  return response.data;\n}\n\nasync function apiPost(caminho, payload) {\n  const url = \`\${API_BASE}\${caminho}\`;\n  const response = await axios.post(url, payload);\n  return response.data;\n}\n\nasync function consultarTarefas() {\n  const data = await apiGet('/tarefas');\n  return data.dados || [];\n}\n\nasync function consultarDependencias() {\n  const data = await apiGet('/dependencias');\n  return data.dados || [];\n}\n\nasync function consultarMonitoramento() {\n  const data = await apiGet('/monitoramento/mensagens');\n  return data.dados || [];\n}\n\nfunction verificarDependenciasPendentes(tarefa, dependencias) {\n  if (!tarefa.dependencias || tarefa.dependencias.length === 0) return [];\n  return dependencias.filter(dep => {\n    return tarefa.dependencias.includes(dep.id) && dep.estado !== 'CONCLUIDA';\n  });\n}\n\nfunction identificarTarefasProntas(tarefas, dependencias) {\n  const estadosProntos = ['RASCUNHO', 'PLANEJADA', 'PRONTA'];\n  return tarefas.filter(tarefa => {\n    if (!estadosProntos.includes(tarefa.estado)) return false;\n    if (tarefa.agenteResponsavel === 'orquestrador') return false;\n    const pendentes = verificarDependenciasPendentes(tarefa, dependencias);\n    return pendentes.length === 0;\n  });\n}\n\nasync function criarHandoff(tarefaId, agenteId, motivo) {\n  const payload = {\n    tarefaId,\n    origem: 'orquestrador',\n    destino: agenteId,\n    resumo: motivo,\n    pendente: [],\n    estado: 'PENDENTE'\n  };\n  const resultado = await apiPost('/handoffs', payload);\n  log('HANDOFF_CRIADO', { tarefa: tarefaId, agente: agenteId, handoffId: resultado.dados?.id });\n  return resultado;\n}\n\nasync function iniciarTarefa(tarefaId) {\n  try {\n    await apiPost(\`/tarefas/\${tarefaId}/estado\`, { estado: 'EM_EXECUCAO' });\n    log('TAREFA_INICIADA', { tarefa: tarefaId });\n  } catch (erro) {\n    log('ERRO_INICIAR_TAREFA', { tarefa: tarefaId, mensagem: erro.message });\n  }\n}\n\nfunction verificarCircuitoAgente(estado, agenteId) {\n  const agora = Date.now();\n  const janelaMs = 60000;\n\n  if (!estado.comandosPorAgente) estado.comandosPorAgente = {};\n  if (!estado.comandosPorAgente[agenteId]) estado.comandosPorAgente[agenteId] = [];\n\n  estado.comandosPorAgente[agenteId] = estado.comandosPorAgente[agenteId].filter(ts => agora - ts < janelaMs);\n\n  if (estado.comandosPorAgente[agenteId].length >= MAX_COMMANDS_PER_MINUTE_PER_AGENT) {\n    return false;\n  }\n\n  estado.comandosPorAgente[agenteId].push(agora);\n  return true;\n}\n\nfunction verificarRetentativasTarefa(estado, tarefaId) {\n  if (!estado.tentativasPorTarefa) estado.tentativasPorTarefa = {};\n  estado.tentativasPorTarefa[tarefaId] = (estado.tentativasPorTarefa[tarefaId] || 0) + 1;\n  return estado.tentativasPorTarefa[tarefaId] <= MAX_RETRIES;\n}\n\nfunction verificarTimeoutTarefa(estado, tarefaId) {\n  if (!estado.tarefasIniciadasEm) estado.tarefasIniciadasEm = {};\n  const inicio = estado.tarefasIniciadasEm[tarefaId];\n  if (!inicio) {\n    estado.tarefasIniciadasEm[tarefaId] = Date.now();\n    return true;\n  }\n  return Date.now() - inicio < TASK_TIMEOUT_MS;\n}\n\nfunction verificarLoop(estado) {\n  if (!estado.ultimoCiclo) return false;\n\n  const agora = Date.now();\n  const ultimoCiclo = new Date(estado.ultimoCiclo).getTime();\n  const diffMs = agora - ultimoCiclo;\n\n  if (diffMs < 2000 && estado.comandosEnviados > 10) {\n    estado.circuitBreakerAtivo = true;\n    estado.motivoParada = 'loop_detectado';\n    estado.ultimaParada = new Date().toISOString();\n    return true;\n  }\n\n  return false;\n}\n\nasync function enviarPrompt(estado, agenteId, prompt) {\n  if (!verificarCircuitoAgente(estado, agenteId)) {\n    log('CIRCUIT_BREAKER_AGENTE', { agente: agenteId, motivo: 'limite_comandos_por_minuto' });\n    return { sucesso: false };\n  }\n\n  if (!verificarRetentativasTarefa(estado, prompt.tarefa)) {\n    log('CIRCUIT_BREAKER_TAREFA', { tarefa: prompt.tarefa, motivo: 'limite_retentativas' });\n    return { sucesso: false };\n  }\n\n  if (!verificarTimeoutTarefa(estado, prompt.tarefa)) {\n    log('CIRCUIT_BREAKER_TIMEOUT', { tarefa: prompt.tarefa, motivo: 'timeout' });\n    return { sucesso: false };\n  }\n\n  log('COMANDO_ENVIADO', { tarefa: prompt.tarefa, agente: agenteId });\n  return { sucesso: true };\n}\n\nasync function executarCiclo() {\n  const estado = carregarEstado();\n  if (estado.circuitBreakerAtivo) {\n    log('CIRCUIT_BREAKER_ATIVO', { motivo: estado.motivoParada });\n    return;\n  }\n\n  if (verificarLoop(estado)) {\n    log('CIRCUIT_BREAKER_ATIVADO', { motivo: 'loop_detectado' });\n    salvarEstado(estado);\n    return;\n  }\n\n  log('CICLO_INICIADO');\n  estado.ultimoCiclo = new Date().toISOString();\n  estado.ciclos += 1;\n\n  try {\n    const [tarefas, dependencias, mensagens] = await Promise.all([\n      consultarTarefas(),\n      consultarDependencias(),\n      consultarMonitoramento()\n    ]);\n\n    const tarefasProntas = identificarTarefasProntas(tarefas, dependencias);\n    log('CONSULTA', {\n      totalTarefas: tarefas.length,\n      tarefasProntas: tarefasProntas.length,\n      totalDependencias: dependencias.length,\n      novasMensagens: mensagens.length\n    });\n\n    let comandosEnviados = 0;\n    for (const tarefa of tarefasProntas) {\n      if (comandosEnviados >= MAX_COMMANDS_PER_CYCLE) break;\n\n      const prompt = {\n        tarefa: tarefa.id,\n        titulo: tarefa.titulo,\n        objetivo: tarefa.objetivo,\n        contratos: tarefa.contratosObrigatorios,\n        criterios: tarefa.criteriosAceitacao,\n        proximo: 'Registrar resultado e handoff apos conclusao'\n      };\n\n      await criarHandoff(tarefa.id, tarefa.agenteResponsavel, 'Orquestrador iniciando tarefa');\n      const resultadoPrompt = await enviarPrompt(estado, tarefa.agenteResponsavel, prompt);\n\n      if (resultadoPrompt.sucesso) {\n        await iniciarTarefa(tarefa.id);\n        comandosEnviados += 1;\n        estado.tarefasIniciadas += 1;\n      }\n    }\n\n    estado.comandosEnviados += comandosEnviados;\n    salvarEstado(estado);\n    log('CICLO_CONCLUIDO', { comandosEnviados });\n  } catch (erro) {\n    log('ERRO', { mensagem: erro.message });\n    salvarEstado(estado);\n  }\n}\n\nasync function main() {\n  log('ORQUESTRADOR_INICIADO', {\n    pollIntervalMs: POLL_INTERVAL_MS,\n    maxCommandsPerCycle: MAX_COMMANDS_PER_CYCLE,\n    projetoId: PROJETO_ID\n  });\n\n  const estado = carregarEstado();\n  estado.estado = 'ATIVO';\n  estado.inicio = new Date().toISOString();\n  salvarEstado(estado);\n\n  await executarCiclo();\n  setInterval(executarCiclo, POLL_INTERVAL_MS);\n}\n\nmain().catch(erro => {\n  log('ERRO_FATAL', { mensagem: erro.message });\n  process.exit(1);\n});\n`, 'utf-8');
    fsSync.writeFileSync(path.join(orquestradorRecursosDir, 'filewatcher.js'), `const chokidar = require('chokidar');\nconst fs = require('fs');\nconst path = require('path');\n\nconst WATCH_DIRS = [\n  path.resolve(__dirname, '..', '..', '.ia', 'tarefas'),\n  path.resolve(__dirname, '..', '..', '.ia', 'dependencias'),\n  path.resolve(__dirname, '..', '..', '.ia', 'handoffs'),\n  path.resolve(__dirname, '..', '..', '.ia', 'estado'),\n  path.resolve(__dirname, '..', '..', 'backend'),\n  path.resolve(__dirname, '..', '..', 'frontend'),\n  path.resolve(__dirname, '..', '..', 'docs')\n];\n\nconst IGNORE_PATTERNS = [\n  /node_modules/,\n  /.git/,\n  /.vite/,\n  /coverage/,\n  /dist/,\n  /build/\n];\n\nconst LOG_FILE = path.join(__dirname, 'filewatcher-logs.txt');\n\nfunction log(evento, dados = {}) {\n  const linha = \`[\${new Date().toISOString()}] \${evento} \${JSON.stringify(dados)}\\n\`;\n  fs.appendFileSync(LOG_FILE, linha);\n  console.log(linha.trim());\n}\n\nfunction iniciarWatcher() {\n  log('FILEWATCHER_INICIADO', { diretorios: WATCH_DIRS });\n\n  const watcher = chokidar.watch(WATCH_DIRS, {\n    ignored: IGNORE_PATTERNS,\n    persistent: true,\n    depth: 3,\n    awaitWriteFinish: {\n      stabilityThreshold: 2000,\n      pollInterval: 500\n    }\n  });\n\n  watcher.on('add', caminho => {\n    log('ARQUIVO_CRIADO', { caminho });\n  });\n\n  watcher.on('change', caminho => {\n    log('ARQUIVO_ALTERADO', { caminho });\n  });\n\n  watcher.on('unlink', caminho => {\n    log('ARQUIVO_REMOVIDO', { caminho });\n  });\n\n  watcher.on('addDir', caminho => {\n    log('DIRETORIO_CRIADO', { caminho });\n  });\n\n  watcher.on('unlinkDir', caminho => {\n    log('DIRETORIO_REMOVIDO', { caminho });\n  });\n\n  watcher.on('error', erro => {\n    log('ERRO_FILEWATCHER', { mensagem: erro.message });\n  });\n\n  watcher.on('ready', () => {\n    log('FILEWATCHER_PRONTO', { arquivosMonitorados: watcher.getWatched() });\n  });\n}\n\niniciarWatcher();\n`, 'utf-8');
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
