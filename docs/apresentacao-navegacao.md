# Apresentação Pública — Navegação AgentMap

**Projeto:** TESTE_NAVEGACAO  
**Data:** 2026-08-16  
**Ambiente:** http://localhost:3150  
**Status:** Todos os painéis funcionais

---

## Visão Geral da Navegação

A interface web do AgentMap organiza o projeto em **27 painéis** acessíveis pela barra lateral. Cada painel representa uma entidade operacional e exibe dados reais do projeto, com ações básicas disponíveis diretamente na interface.

Os painéis são agrupados logicamente por domínio, permitindo navegação fluida entre visões de agentes, tarefas, contratos, estado, monitoramento e governança.

---

## Painéis Disponíveis

### Gestão de Projeto
1. **Agentes** — Perfis, responsabilidades e domínios de cada agente do projeto
2. **Tarefas** — Unidades de trabalho com estados, prioridades, dependências e critérios
3. **Contratos** — Estruturas compartilhadas, APIs, DTOs e modelos entre agentes
4. **Arquivos** — Navegador de arquivos do projeto com estrutura de diretórios
5. **Projetos** — Listagem e gerenciamento de projetos abertos/fechados

### Estado e Monitoramento
6. **Estado** — Snapshot atual do projeto: contadores, status e saúde geral
7. **Auditoria** — Log completo de eventos operacionais com timestamps
8. **Monitor** — Acompanhamento em tempo real de agentes, modos e intervenções

### Execução e Validação
9. **Solicitações** — Fluxo de alterações coordenadas: criação, análise, aprovação e execução
10. **Resultados** — Registro de entregues por tarefa: descrição, arquivos, testes, limitações
11. **Validações** — Aprovações e reprovações de trabalho concluído
12. **Checkpoints** — Estados intermediários de trabalhos longos ou interrompidos

### Governança
13. **Handoffs** — Transferências de contexto entre agentes com trabalho realizado, pendente e próximos passos
14. **Bloqueios** — Impedimentos ativos, responsáveis, impacto e resolução
15. **Pendências** — Tarefas secundárias ou ações pendentes associadas a entidades
16. **Conflitos** — Registro de conflitos entre agentes, tarefas, contratos ou recursos
17. **Riscos** — Riscos identificados com status de mitigação e resolução
18. **Reservas** — Reservas de recursos para evitar alterações concorrentes
19. **Decisões** — Decisões arquiteturais com contexto, justificativa e impacto

### Rastreabilidade
20. **Dependências** — Vínculos entre tarefas e entidades com regras de sequenciamento
21. **Responsabilidades** — Atribuições de responsabilidade por agente e alvo
22. **Sessões** — Ciclos de execução de agentes com status e datas
23. **Aprendizados** — Conhecimento registrado para reuso por outros agentes
24. **Histórico** — Timeline completa de eventos do projeto
25. **Integridade** — Verificação automática de consistência referencial

### Visões Especiais
26. **Painel de Controle** — Dashboard com visão consolidada do projeto
27. **Monitor** — Visão de monitoramento em tempo real com mensagens, agentes ativos, alertas e dispatcher

### Painel Monitor

O painel **Monitor** é a visão central de acompanhamento em tempo real do projeto. Ele consolida informações de múltiplas fontes do AgentMap em uma única tela.

#### Funcionalidades

- **Agentes ativos** — Sessões em andamento com identificação do agente, tarefa associada, horário de início e contexto consultado
- **Resumo do estado** — Cards com contadores de tarefas (concluídas, em execução, bloqueadas), solicitações, riscos e sessões
- **Alertas** — Handoffs pendentes, bloqueios ativos e riscos críticos, com detalhes expandidos em tabelas
- **Mensagens de monitoramento** — Comunicações enviadas via API entre agentes e sistemas, com tipo, emissor, timestamp e conteúdo
- **Eventos recentes** — Log de eventos operacionais com resultado (sucesso/falha) e descrição
- **Botão de atualização** — Atualização manual dos dados do painel

#### API de Suporte

| Endpoint | Descrição |
|---|---|
| `GET /api/monitor` | Visão consolidada do monitoramento |
| `GET /api/monitoramento/mensagens` | Lista mensagens de monitoramento |
| `POST /api/monitoramento/mensagens` | Cria mensagem de monitoramento |
| `PUT /api/monitoramento/agente/:id/status` | Atualiza status de agente |
| `GET /api/monitoramento/agentes` | Lista agentes monitorados |
| `GET /api/monitoramento/modo` | Modo global (MANUAL/AUTO) |
| `POST /api/monitoramento/modo` | Altera modo global |
| `POST /api/monitoramento/intervir` | Executa intervenção manual |
| `GET /api/monitoramento/dispatcher/pendentes` | Itens pendentes do dispatcher |
| `POST /api/monitoramento/dispatcher/executar` | Executa item pendente |
| `GET /api/monitoramento/dispatcher/logs` | Logs do dispatcher |

#### Modos de Operação

- **MANUAL** — Agentes e operações seguem fluxo controlado pelo usuário ou planejador
- **AUTO** — Sistema pode executar operações automaticamente dentro de regras predefinidas

O modo pode ser alterado via API e é refletido em tempo real no painel.

#### WebSocket

Além da API REST, o AgentMap expõe um WebSocket em `ws://localhost:3150/ws/monitoramento` para notificações em tempo real. O serviço `MonitoramentoWebSocket` faz broadcast de mensagens para sessões conectadas, permitindo atualizações instantâneas no painel Monitor sem polling.

---

## Comportamento dos Painéis

### Carregamento
- Todos os painéis carregam via chamadas à API REST em `http://localhost:3150/api`
- Dados são exibidos em tabelas, listas ou estados vazios quando não há registros
- Nenhum painel permanece em estado de carregamento indefinido

### Estados Vazios
Quando um painel não possui registros, ele exibe uma mensagem clara de estado vazio, mantendo a interface consistente e evitando confusão.

### Ações Básicas
Cada painel disponibiliza ações básicas quando aplicáveis:
- **Criar** novo registro (ex: novo agente, nova tarefa, nova solicitação)
- **Visualizar** detalhes de uma entidade
- **Gerar prompt** contextualizado para agentes
- **Navegar** por arquivos e diretórios do projeto

---

## Integração com Dados Reais

O AgentMap foi validado com dados realistas em todos os módulos:

| Módulo | Registros |
|--------|-----------|
| Agentes | 15+ |
| Tarefas | 12+ |
| Contratos | 10+ |
| Bloqueios | 3 |
| Riscos | 4 |
| Pendências | 5 |
| Conflitos | 2 |
| Reservas | 3 |
| Decisões | 4 |
| Dependências | 3 |
| Sessões | 4 |
| Handoffs | 3 |
| Validações | 4 |
| Resultados | 2 |
| Artefatos | 3 |
| Aprendizados | 4 |
| Checkpoints | 3 |

---

## API REST

A interface web consome uma API REST completa com ~180 rotas, todos funcionais e documentados. A API utiliza formato JSON consistente:

```json
{
  "sucesso": true,
  "dados": { ... }
}
```

Endpoints principais por domínio:
- `GET /api/agentes`, `POST /api/agentes`, `PUT /api/agentes/:id`, `DELETE /api/agentes/:id`
- `GET /api/tarefas`, `POST /api/tarefas`, `PUT /api/tarefas/:id`, `DELETE /api/tarefas/:id`
- `GET /api/contratos`, `POST /api/contratos`, `DELETE /api/contratos/:id`
- `GET /api/solicitacoes`, `POST /api/solicitacoes`, `PUT /api/solicitacoes/:id/aprovar`
- `GET /api/handoffs`, `POST /api/handoffs`, `PUT /api/handoffs/:id`
- `GET /api/bloqueios`, `PUT /api/bloqueios/:id/resolver`
- `GET /api/eventos`, `POST /api/eventos/custom`

Status codes utilizados: 200 (sucesso), 400 (validação), 404 (não encontrado).

---

## Integração MCP

Além da interface web, o AgentMap disponibiliza 131 tools MCP para integração direta com agentes de IA via Kilo Code / VS Code:

- **Tools de leitura:** consultar projetos, agentes, tarefas, contratos, decisões, etc.
- **Tools de escrita:** criar e atualizar entidades via MCP
- **Workflows:** `agentmap_workflows_iniciar_trabalho` e `agentmap_workflows_finalizar_trabalho`
- **Subscriptions:** notificações em tempo real para solicitações, handoffs e bloqueios

Transporte: STDIO local (`npx tsx src/mcp-server/index.ts`)  
SDK: `@modelcontextprotocol/sdk` v1.30.0

---

## Conclusão

A navegação do AgentMap está funcional, testada e populada com dados realistas. Todos os 27 painéis operam corretamente, a API responde de forma consistente e o sistema está pronto para uso em projetos reais.

