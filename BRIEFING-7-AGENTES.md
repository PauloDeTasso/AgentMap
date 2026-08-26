# Briefing Consolidado — Proposta de Laboratório de Engenharia de Software para o AgentMap

## Contexto

Você está atuando como arquiteto/engenheiro do **AgentMap**, um gerenciador local de agentes de IA com:
- Backend Node.js + TypeScript + Express
- Frontend HTML5/JS vanilla
- Storage baseado em filesystem + JSON
- MCP protocol com 131+ tools
- Integração nativa com Kilo Code (Custom Subagents, Agent Manager, wake-up plugin)
- PostgreSQL como camada futura (não implementada)

## Objetivo

Propor uma estrutura de **laboratório/arquitetura de engenharia de software** para o AgentMap que cubra o ciclo de vida completo:
**Planejamento → Viabilidade → Requisitos → Design/Contratos → Design UX/UI → Arquitetura/Implementação → Banco de Dados → Testes/Qualidade → DevSecOps → Deploy/Infra → Documentação/Manutenção**

## Restrições Obrigatórias

1. **NÃO quebrar o sistema existente**: backward compatibility total
2. **NÃO reinventar** mecanismos que o Kilo já oferece (Custom Subagents, task, permission.task, Agent Manager)
3. **NÃO criar orquestrador paralelo** ao Kilo
4. **NÃO permitir criação automática** de agentes não registrados
5. **Respeitar separação de conceitos**: Agent (persistente) ≠ Session (efêmera) ≠ Worktree (ambiente físico)
6. **Fonte da verdade**: AgentMap Registry → Kilo Custom Subagents → Agent Manager (worktree)
7. **NÃO usar AGENTS.md como registry** — ele é para regras gerais do projeto
8. **NÃO duplicar** identidade/personalidade em prompts, AGENTS.md, rules e agent.md simultaneamente
9. **Triagem obrigatória**: tarefas pequenas → execução direta; tarefas especializadas → delegação; worktree só quando necessário
10. **GATE 0 primeiro**: verificar schema real do `agent_manager` antes de assumir campos não documentados

## Assets Existentes que DEVEM ser preservados/reutilizados

### Backend
- `backend/src/app.ts` — Express app com CORS/security
- `backend/src/index.ts` — bootstrap
- `backend/src/api/index.ts` — router registry
- `backend/src/servicios/ProjetoService.ts` — orquestração
- `backend/src/arquivos/FileService.ts` — file ops com path traversal protection
- `backend/src/arquivos/ScaffoldService.ts` — scaffolding
- `backend/src/mcp-server/index.ts` — MCP stdio server
- `KiloAgentGeneratorService` — gera Custom Subagents a partir de perfis AgentMap
- Templates: governanca.ts, contratos.ts, configuracao.ts, tarefas.ts, agentes.ts, projeto-kilo.ts

### Schemas
- `esquemas/projeto.schema.json`
- `esquemas/tarefa.schema.json`
- `esquemas/agente-perfil.schema.json`

### MCP Tools (131+)
- Projetos, Agentes, Tarefas, Workflows, Handoffs, Solicitações, Sessões, Eventos, Bloqueios, Reservas, Decisões, Dependências, Riscos, Checkpoints, Pendências, Resultados, Validações, Artefatos, Aprendizados, Critérios, Contatos, Responsabilidades, Conflitos, Arquivos, Busca, Contexto, Auditoria, Descoberta, Monitoramento/Wake-up, Kilo Hub

### Documentação
- `docs/arquitetura-mcp.md`
- `docs/api-reference.md`
- `docs/comunicacao-agentmap-kilo.md`
- `docs/protocolo-mcp.md`
- `docs/categorizacao-tools.md`
- `docs/referencia-tools-mcp.md`
- `docs/providers-free-llm-2026.md`
- `docs/relatorio-consolidado-tools.md`
- `PLANO GERAL/arquivo/v0021/*.md` — 5 propostas arquiteturais validadas

### Frontend
- `frontend/index.html`
- `frontend/js/app.js`

### Estrutura de pastas esperada em projetos gerenciados
```
.ia/
├── fluxo-trabalho.md (obrigatório)
├── contratos/ (obrigatório)
├── tarefas/ (obrigatório)
├── dependencias/ (obrigatório)
├── estado/
├── conhecimento/
├── procedimentos/
└── monitoramento/
```

## Problemas Identificados (para corrigir SEM quebrar)

| Problema | Causa Raiz | Restrição |
|----------|-----------|-----------|
| Agente principal inventa agentes no Agent Manager | `agentmap_abrir_worktree` monta prompt genérico sem transportar `agenteResponsavel` + falta de sync AgentMap → Kilo | Manter execução direta para tarefas pequenas; usar Custom Subagents para especializadas |
| Falta de sync automática AgentMap → `.kilo/agent/` | `KiloAgentGeneratorService` só usado para contexto, não para identidade | Reutilizar serviço existente |
| Worktree = identidade | Confusão conceitual | Documentar/workaround: Agent ≠ Session ≠ Worktree |
| Múltiplas fontes de verdade (AGENTS.md + rules + prompt + agent.md) | Nenhuma autoridade clara | AGENTS.md = regras gerais; AgentMap = identidade |
| `AGENT_NOT_REGISTERED` não existe como erro estruturado | Falta de validação explícita | Implementar antes de abrir worktree |
| Ausência de triagem antes de delegar | `recomendarAgente` não é consultada por padrão | Adicionar triagem no fluxo de worktree |

## Arquitetura Alvo (consolidada dos v0021)

```
                         ┌──────────────────────┐
                         │      AGENTMAP        │
                         │                      │
                         │  Agent Registry      │ ← FONTE DA VERDADE
                         │  Profiles            │
                         │  Capabilities        │
                         │  Policies            │
                         │  Contracts           │
                         │  Tasks               │
                         │  Events              │
                         └──────────┬───────────┘
                                    │
                              gera/sincroniza
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   KILO CUSTOM        │
                         │      SUBAGENTS       │
                         │ (.kilo/agent/*.md)   │
                         └──────────┬───────────┘
                                    │
                                  task
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │  KILO PRIMARY AGENT  │
                         │                      │
                         │ raciocina            │
                         │ executa               │
                         │ decide delegação      │
                         └──────────┬───────────┘
                                    │
                         ┌──────────┴───────────┐
                         │                      │
                      DIRECT                 TASK
                         │                      │
                         ▼                      ▼
                     execução             SUBAGENT
                                               │
                                       ┌───────┴───────┐
                                       │               │
                                    normal          worktree
                                       │               │
                                       ▼               ▼
                                   SESSION       AGENT MANAGER
                                                         │
                                                         ▼
                                                      WORKTREE
                                                         │
                                                         ▼
                                                      GIT
```

## Regras de Ouro (não negociáveis)

1. **AgentMap governa** identidade, personalidade, contexto, contratos, permissões, delegação
2. **Kilo raciocina e executa** via Custom Subagents nativos + task + permission.task
3. **Agent Manager isola** via worktree/Git quando necessário
4. **Git controla** código e branches
5. **Nada é inventado** — `AGENT_NOT_REGISTERED` se agente não existe
6. **Triagem antes de delegar** — tarefa pequena = execução direta
7. **Worktree ≠ agente** — worktree é ambiente de execução de uma session
8. **AGENTS.md ≠ registry** — é para regras gerais do projeto
9. **Eventos fecham o loop** — TASK_COMPLETED → watcher → wake principal
10. **GATE 0 primeiro** — verificar schema real do `agent_manager` antes de implementar

## O que você deve entregar

Uma proposta estruturada contendo:

### 1. Estrutura de Laboratório/Arquitetura
- Camadas funcionais (Domain, Application, Infrastructure, Presentation)
- Módulos e suas responsabilidades
- Padrões arquiteturais recomendados (DDD, Clean Architecture, etc.)
- Separação de concerns para evitar acoplamento

### 2. Contratos e Schemas
- Contratos existentes a manter/estender
- Novos contratos necessários (se houver)
- Validação via Zod + AJV
- Versionamento de contratos

### 3. Tecnologias e Bibliotecas
- Stack tecnológico atual (Express, Zod, OpenTelemetry, AJV)
- Recomendações de bibliotecas adicionais (se necessárias)
- Critérios de seleção

### 4. Banco de Dados (preparação futura)
- Modelo conceitual para PostgreSQL (opcional)
- Estratégia de migração quando chegar a hora
- Como manter compatibilidade com filesystem/JSON atual

### 5. Implementação
- Estrutura de pastas do backend
- Convenções de código
- Naming conventions
- Error handling strategy
- Logging e observabilidade

### 6. Testes
- Estratégia de testes (unit, integration, e2e)
- Cobertura mínima (70% já definida)
- Testes automatizados para cenários críticos
- Playwright para E2E (já existe)

### 7. Deploy e Infraestrutura
- Estratégia de deploy
- Ambientes (desenvolvimento, teste, homologação, produção)
- Scripts start/stop/restart (já existem)
- Monitoramento

### 8. Documentação
- ADRs para decisões arquiteturais
- Documentação de API
- Guias para novos desenvolvedores
- Runbooks

### 9. Manutenção
- Estratégia de evolução sem breaking changes
- Processo de atualização de contratos
- backward compatibility
- Backup e recuperação

## Critérios de Avaliação

| Critério | Peso |
|----------|------|
| Preservação do sistema existente | 25% |
| Reuso de assets existentes | 20% |
| Simplicidade vs completude | 15% |
| Alinhamento com Kilo nativo | 15% |
| Backward compatibility | 10% |
- **NÃO criar orquestrador paralelo** ao Kilo
4. **NÃO permitir criação automática** de agentes não registrados
5. **Respeitar separação de conceitos**: Agent (persistente) ≠ Session (efêmera) ≠ Worktree (ambiente físico)
6. **Fonte da verdade**: AgentMap Registry → Kilo Custom Subagents → Agent Manager (worktree)
7. **NÃO usar AGENTS.md como registry** — ele é para regras gerais do projeto
8. **NÃO duplicar** identidade/personalidade em prompts, AGENTS.md, rules e agent.md simultaneamente
9. **Triagem obrigatória**: tarefas pequenas → execução direta; tarefas especializadas → delegação; worktree só quando necessário
10. **GATE 0 primeiro**: verificar schema real do `agent_manager` antes de assumir campos não documentados

## Assets Existentes que DEVEM ser preservados/reutilizados

### Backend
- `backend/src/app.ts` — Express app com CORS/security
- `backend/src/index.ts` — bootstrap
- `backend/src/api/index.ts` — router registry
- `backend/src/servicios/ProjetoService.ts` — orquestração
- `backend/src/arquivos/FileService.ts` — file ops com path traversal protection
- `backend/src/arquivos/ScaffoldService.ts` — scaffolding
- `backend/src/mcp-server/index.ts` — MCP stdio server
- `KiloAgentGeneratorService` — gera Custom Subagents a partir de perfis AgentMap
- Templates: governanca.ts, contratos.ts, configuracao.ts, tarefas.ts, agentes.ts, projeto-kilo.ts

### Schemas
- `esquemas/projeto.schema.json`
- `esquemas/tarefa.schema.json`
- `esquemas/agente-perfil.schema.json`

### MCP Tools (131+)
- Projetos, Agentes, Tarefas, Workflows, Handoffs, Solicitações, Sessões, Eventos, Bloqueios, Reservas, Decisões, Dependências, Riscos, Checkpoints, Pendências, Resultados, Validações, Artefatos, Aprendizados, Critérios, Contatos, Responsabilidades, Conflitos, Arquivos, Busca, Contexto, Auditoria, Descoberta, Monitoramento/Wake-up, Kilo Hub

### Documentação
- `docs/arquitetura-mcp.md`
- `docs/api-reference.md`
- `docs/comunicacao-agentmap-kilo.md`
- `docs/protocolo-mcp.md`
- `docs/categorizacao-tools.md`
- `docs/referencia-tools-mcp.md`
- `docs/providers-free-llm-2026.md`
- `docs/relatorio-consolidado-tools.md`
- `PLANO GERAL/arquivo/v0021/*.md` — 5 propostas arquiteturais validadas

### Frontend
- `frontend/index.html`
- `frontend/js/app.js`

### Estrutura de pastas esperada em projetos gerenciados
```
.ia/
├── fluxo-trabalho.md (obrigatório)
├── contratos/ (obrigatório)
├── tarefas/ (obrigatório)
├── dependencias/ (obrigatório)
├── estado/
├── conhecimento/
├── procedimentos/
└── monitoramento/
```

## Problemas Identificados (para corrigir SEM quebrar)

| Problema | Causa Raiz | Restrição |
|----------|-----------|-----------|
| Agente principal inventa agentes no Agent Manager | `agentmap_abrir_worktree` monta prompt genérico sem transportar `agenteResponsavel` + falta de sync AgentMap → Kilo | Manter execução direta para tarefas pequenas; usar Custom Subagents para especializadas |
| Falta de sync automática AgentMap → `.kilo/agent/` | `KiloAgentGeneratorService` só usado para contexto, não para identidade | Reutilizar serviço existente |
| Worktree = identidade | Confusão conceitual | Documentar/workaround: Agent ≠ Session ≠ Worktree |
| Múltiplas fontes de verdade (AGENTS.md + rules + prompt + agent.md) | Nenhuma autoridade clara | AGENTS.md = regras gerais; AgentMap = identidade |
| `AGENT_NOT_REGISTERED` não existe como erro estruturado | Falta de validação explícita | Implementar antes de abrir worktree |
| Ausência de triagem antes de delegar | `recomendarAgente` não é consultada por padrão | Adicionar triagem no fluxo de worktree |

## Arquitetura Alvo (consolidada dos v0021)

```
                         ┌──────────────────────┐
                         │      AGENTMAP        │
                         │                      │
                         │  Agent Registry      │ ← FONTE DA VERDADE
                         │  Profiles            │
                         │  Capabilities        │
                         │  Policies            │
                         │  Contracts           │
                         │  Tasks               │
                         │  Events              │
                         └──────────┬───────────┘
                                    │
                              gera/sincroniza
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   KILO CUSTOM        │
                         │      SUBAGENTS       │
                         │ (.kilo/agent/*.md)   │
                         └──────────┬───────────┘
                                    │
                                  task
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │  KILO PRIMARY AGENT  │
                         │                      │
                         │ raciocina            │
                         │ executa               │
                         │ decide delegação      │
                         └──────────┬───────────┘
                                    │
                         ┌──────────┴───────────┐
                         │                      │
                      DIRECT                 TASK
                         │                      │
                         ▼                      ▼
                     execução             SUBAGENT
                                               │
                                       ┌───────┴───────┐
                                       │               │
                                    normal          worktree
                                       │               │
                                       ▼               ▼
                                   SESSION       AGENT MANAGER
                                                         │
                                                         ▼
                                                      WORKTREE
                                                         │
                                                         ▼
                                                      GIT
```

## Regras de Ouro (não negociáveis)

1. **AgentMap governa** identidade, personalidade, contexto, contratos, permissões, delegação
2. **Kilo raciocina e executa** via Custom Subagents nativos + task + permission.task
3. **Agent Manager isola** via worktree/Git quando necessário
4. **Git controla** código e branches
5. **Nada é inventado** — `AGENT_NOT_REGISTERED` se agente não existe
6. **Triagem antes de delegar** — tarefa pequena = execução direta
7. **Worktree ≠ agente** — worktree é ambiente de execução de uma session
8. **AGENTS.md ≠ registry** — é para regras gerais do projeto
9. **Eventos fecham o loop** — TASK_COMPLETED → watcher → wake principal
10. **GATE 0 primeiro** — verificar schema real do `agent_manager` antes de implementar

## O que você deve entregar

Uma proposta estruturada contendo:

### 1. Estrutura de Laboratório/Arquitetura
- Camadas funcionais (Domain, Application, Infrastructure, Presentation)
- Módulos e suas responsabilidades
- Padrões arquiteturais recomendados (DDD, Clean Architecture, etc.)
- Separação de concerns para evitar acoplamento

### 2. Contratos e Schemas
- Contratos existentes a manter/estender
- Novos contratos necessários (se houver)
- Validação via Zod + AJV
- Versionamento de contratos

### 3. Tecnologias e Bibliotecas
- Stack tecnológico atual (Express, Zod, OpenTelemetry, AJV)
- Recomendações de bibliotecas adicionais (se necessárias)
- Critérios de seleção

### 4. Banco de Dados (preparação futura)
- Modelo conceitual para PostgreSQL (opcional)
- Estratégia de migração quando chegar a hora
- Como manter compatibilidade com filesystem/JSON atual

### 5. Implementação
- Estrutura de pastas do backend
- Convenções de código
- Naming conventions
- Error handling strategy
- Logging e observabilidade

### 6. Testes
- Estratégia de testes (unit, integration, e2e)
- Cobertura mínima (70% já definida)
- Testes automatizados para cenários críticos
- Playwright para E2E (já existe)

### 7. Deploy e Infraestrutura
- Estratégia de deploy
- Ambientes (desenvolvimento, teste, homologação, produção)
- Scripts start/stop/restart (já existem)
- Monitoramento

### 8. Documentação
- ADRs para decisões arquiteturais
- Documentação de API
- Guias para novos desenvolvedores
- Runbooks

### 9. Manutenção
- Estratégia de evolução sem breaking changes
- Processo de atualização de contratos
- backward compatibility
- Backup e recuperação

### 10. Design UX/UI
- Pesquisar padrões de UX/UI aplicáveis a painéis administrativos e ferramentas de engenharia
- Propor design system, tokens, tipografia, cores, espaçamento
- Definir wireframes/mockups para os 27 painéis do frontend atual
- Propor componentes reutilizáveis (botões, tabelas, filtros, modais)
- Definição de acessibilidade (WCAG), responsividade e convenções de interação

### 11. Planejamento de Projeto
- Metodologia de trabalho (Waterfall/Ágil/Híbrida) adaptada ao contexto do AgentMap
- Estrutura de escopo, marcos, entregas e responsabilidades
- Gestão de riscos, stakeholders e cronograma

### 12. Análise de Viabilidade
- Viabilidade técnica, econômica e operacional
- Análise de riscos e premissas
- Critérios de go/no-go para iniciativas

### 13. DevSecOps / Segurança
- Modelagem de ameaças e análise de vulnerabilidades por estágio
- Controles de segurança (CORS, path traversal, secrets, headers, rate limiting)
- Estratégia de segurança contínua integrada ao pipeline

## Critérios de Avaliação

| Critério | Peso |
|----------|------|
| Preservação do sistema existente | 25% |
| Reuso de assets existentes | 20% |
| Simplicidade vs completude | 15% |
| Alinhamento com Kilo nativo | 15% |
| Backward compatibility | 10% |
| Cobertura do ciclo de vida completo | 10% |
| Viabilidade de implementação | 5% |

## Formato de Entrega

Cada agente deve entregar:
1. Proposta textual estruturada (markdown)
2. Diagramas Mermaid quando necessário
3. Lista de arquivos a criar/modificar (com caminhos relativos ao projeto)
4. Lista de dependências novas (se houver)
5. Riscos e mitigações
6. Ordem de implementação sugerida
