  # Plano Final do Projeto AgentMap — Revisão Baseada na Ideia Principal

  > **Versão:** 1.0.1  
  > **Data:** 2026-08-27  
  > **Branch:** v0044  
  > **Status:** Revisão pós-conselheiros  
  > **Ideia Central:** AgentMap como template/base por projeto, não como gerenciador multi-tenant

  ---

  ## 1. Ideia Central (NÃO NEGOCIÁVEL)

  ### 1.1 Problema Identificado

  O AgentMap atual se comporta como um sistema **multi-tenant centralizado**:
  - Backend tenta servir múltiplos projetos via "projeto aberto/fechado"
  - `ProjetoService` como façade global
  - `GERENCIADOR_DIR` apontando para pasta base de projetos
  - Complexidade desnecessária de `projectMiddleware`

  **Dor real:** toda vez que o próprio AgentMap precisa ser atualizado (ex: docs, templates, ferramentas, regras), também é necessário atualizar o mecanismo de criação de projeto. Isso cria manutenção duplicada e risco de inconsistência.

  ### 1.2 Solução Proposta

  **AgentMap é um template/base que é adicionado à raiz de cada novo projeto.**

  ```
  Novo Projeto: MEU_PROJETO/
  ├── .ia/                          ← pasta do AgentMap (template)
  │   ├── contratos/
  │   ├── tarefas/
  │   ├── agentes/
  │   ├── fluxo-trabalho.md
  │   └── ...                       ← toda a estrutura do AgentMap
  ├── backend/                      ← backend do projeto (se necessário)
  ├── frontend/                     ← frontend do projeto (se necessário)
  └── docs/                         ← documentação do projeto
  ```

  **Consequências arquiteturais:**
  - **Remover** `ProjetoService` como service central
  - **Remover** lógica de "projeto aberto/fechado"
  - **Remover** `GERENCIADOR_DIR` e multi-tenancy
  - **Backend passa a ser um servidor por projeto**, não um servidor para todos
  - **Frontend, rotas, tools, documentação** fazem parte do template base
  - **Atualizar o AgentMap = atualizar o template** que todos os projetos usam

  ### 1.3 Benefícios Imediatos

  | Benefício | Explicação |
  |-----------|-----------|
  | **Simplicidade** | Backend serve UM projeto apenas. Sem `projectMiddleware` complexo |
  | **Manutenibilidade** | Atualizar template = todos os projetos recebem a atualização |
  | **Desacoplamento** | Projetos não dependem de instância central |
  | **Versionamento** | Cada projeto pode versionar seu próprio AgentMap |
  | **Escalabilidade** | Servidores independentes por projeto (ou monorepo) |
  | **Offline-first real** | Projeto é totalmente autossuficiente |

  ### 1.4 Desvantagens e Mitigações

  | Desvantagem | Mitigação |
  |-------------|-----------|
  | **Duplicação de código** | Usar symlinks ou submodules Git |
  | **Múltiplas instâncias** | Em produção, pode usar reverse proxy |
  | **Atualizações manuais** | Criar comando `agentmap update` para projetos |

  ---

  ## 2. Arquitetura Alvo (Revisada)

  ### 2.1 Estrutura de Projeto

  ```
  MEU_PROJETO/
  ├── .ia/                           ← AgentMap (template/base)
  │   ├── agentmap.json              ← config do AgentMap local
  │   ├── fluxo-trabalho.md
  │   ├── contratos/
  │   ├── tarefas/
  │   ├── agentes/
  │   ├── handoffs/
  │   ├── sessoes/
  │   ├── checkpoints/
  │   ├── riscos/
  │   ├── bloqueios/
  │   ├── pendencias/
  │   ├── reservas/
  │   ├── decisoes/
  │   ├── dependencias/
  │   ├── responsabilidades/
  │   ├── artefatos/
  │   ├── resultados/
  │   ├── criterios/
  │   ├── aprendizados/
  │   ├── validacoes/
  │   ├── conflitos/
  │   ├── auditoria/
  │   ├── solicitacoes/
  │   ├── instancias/
  │   ├── orquestrador/
  │   ├── estado/
  │   ├── conhecimento/
  │   ├── docs/
  │   ├── procedimentos/
  │   ├── permissoes/
  │   ├── politicas/
  │   ├── git/
  │   ├── qualidade/
  │   ├── historico/
  │   └── temp/
  ├── backend/                       ← Servidor do projeto
  │   ├── src/
  │   │   ├── api/                   ← Rotas HTTP
  │   │   ├── mcp-server/            ← MCP tools
  │   │   ├── servicios/             ← Lógica de negócio
  │   │   ├── tipos/                 ← TypeScript types
  │   │   ├── validacao/             ← Schemas Zod + JSON
  │   │   └── main.ts                ← Bootstrap
  │   ├── package.json
  │   └── tsconfig.json
  ├── frontend/                      ← UI do projeto
  │   ├── index.html
  │   ├── css/
  │   └── js/
  ├── docs/                          ← Documentação do projeto
  │   ├── README.md
  │   ├── API.md
  │   └── ...
  └── package.json                   ← Workspace root (opcional)
  ```

  ### 2.2 Backend Simplificado

  **Antes (multi-tenant):**
  ```typescript
  // ❌ Complicado: projeto aberto/fechado, middleware global
  app.use(projectMiddleware); // recria 30 serviços a cada request
  app.use('/api/monitoramento', monitoramentoRouter); // instância diferente
  ```

  **Depois (single-project):**
  ```typescript
  // ✅ Simples: serviços singleton, sem middleware de projeto
  const services = createServices(); // criado uma vez na inicialização
  app.use('/api', apiRouter); // todas as rotas usam os mesmos serviços
  ```

  ### 2.3 Comandos Simplificados

  ```bash
  # Antes: gerenciador central + projeto
  cd backend && npm run dev              # inicia gerenciador
  agentmap abrir projeto XYZ             # abre projeto específico

  # Depois: projeto autossuficiente
  cd MEU_PROJETO/backend && npm run dev  # inicia servidor do projeto
  # pronto, já está operando
  ```

  ### 2.4 Propagação de Atualizações

  ```bash
  # Opção 1: Git submodule
  git submodule update --remote .ia/

  # Opção 2: Comando de update
  npx agentmap update                    # atualiza template local

  # Opção 3: npm workspaces
  npm update @agentmap/template
  ```

  ---

  ## 3. Análise dos Conselheiros Revisada

  ### 3.1 O que ainda se aplica?

  **Arquitetura (Arquiteto):**
  - ✅ Clean Architecture / Hexagonal — ainda válido, mas mais simples
  - ✅ Event Bus formal — ainda válido
  - ⚠️ CQRS — pode ser simplificado (sem multi-tenancy, consultas são mais simples)
  - ⚠️ Plugin System — menos crítico (projetos podem customizar diretamente)

  **Engenharia (Engenheiro):**
  - ✅ Fastify — ainda válido
  - ✅ Testes — ainda válido
  - ✅ CI/CD — ainda válido
  - ✅ Logging estruturado — ainda válido
  - ⚠️ Separação de frontend — pode ser simplificada

  **Qualidade (QA):**
  - ✅ Pirâmide de testes — ainda válido
  - ✅ Quality gates — ainda válido
  - ✅ Cobertura 80% — ainda válido

  **Segurança (Segurança):**
  - ✅ Rate limiting — ainda válido
  - ✅ Externalizar secrets — ainda válido
  - ✅ Sanitização — ainda válido

  **Documentação (Documentador):**
  - ✅ Estrutura de docs — ainda válido
  - ✅ ADRs — ainda válido

  **Negócio (Analista de Negócios):**
  - ✅ Onboarding simplificado — ainda válido
  - ✅ Guia de início rápido — ainda válido

  **Governança (GP):**
  - ✅ Scrumban — ainda válido
  - ✅ Quality gates — ainda válido

  ### 3.2 O que muda?

  | Item | Antes | Depois |
  |------|-------|--------|
  | **Backend** | Multi-tenant com projeto aberto/fechado | Single-project, serviços singleton |
  | **Frontend** | Acoplado ao backend | Pode ser separado, mas menos crítico |
  | **MCP Tools** | ~170 tools globais | Tools por projeto, mas estrutura similar |
  | **Projetos** | Gerenciados via API | Cada projeto é uma instância |
  | **Configuração** | `GERENCIADOR_DIR`, `cachedSettings` | `agentmap.json` local |
  | **Middleware** | `projectMiddleware` complexo | Simplificado ou removido |
  | **Criação de projeto** | Via API + validação | Via template/copier |
  | **Atualizações** | Manuais em múltiplos lugares | Template centralizado |

  ---

  ## 4. Roadmap Revisado

  ### 4.1 Fase 1: Reestruturação (Sprints 1-2)

  **Objetivo:** Transformar backend de multi-tenant para single-project

  | Tarefa | Responsável | Esforço |
  |--------|-------------|---------|
  | Refatorar backend para single-project | Arquiteto | 16h |
  | Remover `projectMiddleware` complexo | Engenheiro | 8h |
  | Simplificar `ProjetoService` | Engenheiro | 8h |
  | Criar template de projeto (copier) | GP | 8h |
  | **Total** | | **40h** |

  **Entregável:** Backend simplificado servindo um projeto apenas

  ### 4.2 Fase 2: Qualidade (Sprints 3-4)

  **Objetivo:** Aumentar cobertura de testes e configurar CI/CD

  | Tarefa | Responsável | Esforço |
  |--------|-------------|---------|
  | Testes unitários base | QA | 32h |
  | Testes de integração | QA | 16h |
  | Configurar CI/CD | Engenheiro | 8h |
  | Quality gates | QA | 4h |
  | **Total** | | **60h** |

  **Entregável:** Cobertura ≥70%, CI/CD funcionando

  ### 4.3 Fase 3: Template Base (Sprint 5)

  **Objetivo:** Criar template/base do AgentMap que pode ser adicionado a projetos

  | Tarefa | Responsável | Esforço |
  |--------|-------------|---------|
  | Estruturar template `.ia/` | GP | 8h |
  | Documentação base (README, guias) | Documentador | 16h |
  | Scripts de inicialização | Engenheiro | 8h |
  | **Total** | | **32h** |

  **Entregável:** Template funcional do AgentMap

  ### 4.4 Fase 4: Ferramentas (Sprint 6)

  **Objetivo:** Comandos para gerenciar o template em projetos

  | Tarefa | Responsável | Esforço |
  |--------|-------------|---------|
  | `agentmap init <projeto>` | Engenheiro | 8h |
  | `agentmap update` | Engenheiro | 8h |
  | `agentmap status` | Engenheiro | 4h |
  | **Total** | | **20h** |

  **Entregável:** CLI funcional para gerenciar template

  ### 4.5 Fase 5: Estabilização (Sprints 7-8)

  **Objetivo:** Testes completos, documentação, release

  | Tarefa | Responsável | Esforço |
  |--------|-------------|---------|
  | Testes E2E | QA | 16h |
  | Documentação completa | Documentador | 20h |
  | Performance tuning | Engenheiro | 8h |
  | v0.9.0 Beta release | GP | 8h |
  | **Total** | | **52h** |

  **Entregável:** v0.9.0 Beta

  ---

  ## 5. Backlog Revisado

  ### 5.1 Tarefas Críticas (P0)

  | ID | Tarefa | Responsável | Esforço |
  |----|--------|-------------|---------|
  | T1 | Corrigir Risk/Decisions Zod | Arquiteto | 4h |
  | T2 | Refatorar backend para single-project | Arquiteto | 16h |
  | T3 | Remover `projectMiddleware` complexo | Engenheiro | 8h |
  | T4 | Simplificar `ProjetoService` | Engenheiro | 8h |
  | T5 | Configurar ESLint + Prettier | Engenheiro | 4h |
  | T6 | Externalizar secrets para .env | Engenheiro | 4h |
  | T7 | Implementar logging estruturado | Engenheiro | 4h |
  | T8 | Configurar CI/CD | Engenheiro | 8h |
  | T9 | Testes unitários base | QA | 32h |
  | T10 | Testes de integração | QA | 16h |

  **Total P0:** 104h (~13 dias)

  ### 5.2 Tarefas Importantes (P1)

  | ID | Tarefa | Responsável | Esforço |
  |----|--------|-------------|---------|
  | T11 | Criar template `.ia/` | GP | 8h |
  | T12 | Documentação base | Documentador | 16h |
  | T13 | Scripts de inicialização | Engenheiro | 8h |
  | T14 | `agentmap init` CLI | Engenheiro | 8h |
  | T15 | `agentmap update` CLI | Engenheiro | 8h |
  | T16 | Quality gates | QA | 4h |
  | T17 | Testes E2E | QA | 16h |
  | T18 | Documentação completa | Documentador | 20h |
  | T19 | Performance tuning | Engenheiro | 8h |

  **Total P1:** 96h (~12 dias)

  ### 5.3 Total

  | Categoria | Esforço | Dias Úteis |
  |-----------|---------|------------|
  | **P0** | 104h | 13 |
  | **P1** | 96h | 12 |
  | **TOTAL** | **200h** | **25 dias** |

  > **Economia:** De 440h (55 dias) para 200h (25 dias) — redução de 55% no esforço total, porque a complexidade multi-tenant é eliminada.

  ---

  ## 6. Arquitetura de Código Revisada

  ### 6.1 Estrutura de Pastas (Nova)

  ```
  backend/
  ├── src/
  │   ├── config/              ← Configurações centralizadas
  │   │   ├── index.ts
  │   │   └── env.ts           ← Variáveis de ambiente
  │   ├── modules/             ← Módulos por domínio
  │   │   ├── projeto/
  │   │   ├── tarefa/
  │   │   ├── agente/
  │   │   ├── handoff/
  │   │   ├── monitoramento/
  │   │   └── ...
  │   ├── shared/              ← Código compartilhado
  │   │   ├── errors/
  │   │   ├── middleware/
  │   │   ├── utils/
  │   │   └── types/
  │   ├── infrastructure/      ← Implementações concretas
  │   │   ├── filesystem/
  │   │   ├── json/
  │   │   └── mcp/
  │   └── main.ts              ← Bootstrap
  ├── tests/
  │   ├── unit/
  │   ├── integration/
  │   └── fixtures/
  └── package.json
  ```

  ### 6.2 Services Simplificados

  **Antes (complexo):**
  ```typescript
  // ProjetoService.ts — 500 linhas, façade para tudo
  export class ProjetoService {
    async criarProjeto() { }
    async abrirProjeto() { }
    async listarAgentes() { }
    async listarTarefas() { }
    async criarHandoff() { }
    // ... 30+ métodos
  }
  ```

  **Depois (simples):**
  ```typescript
  // Cada domínio tem seu próprio service
  // ProjetoService.ts — 50 linhas, apenas projetos
  export class ProjetoService {
    constructor(private repo: ProjetoRepository) {}
    
    async criar(dados: CriarProjetoDTO): Promise<ResultadoOperacao<Projeto>> {
      // ...
    }
    
    async obter(id: string): Promise<ResultadoOperacao<Projeto>> {
      // ...
    }
  }

  // TarefaService.ts — 50 linhas, apenas tarefas
  // AgenteService.ts — 50 linhas, apenas agentes
  // etc.
  ```

  ### 6.3 Bootstrap Simplificado

  **Antes:**
  ```typescript
  // main.ts — complexo, com cache singleton
  const cachedSettings = loadSettings(); // cache global
  app.use(projectMiddleware); // recria serviços a cada request
  ```

  **Depois:**
  ```typescript
  // main.ts — simples, serviços singleton
  const services = createServices(); // criado uma vez
  const apiRouter = createApiRouter(services);
  const mcpRouter = createMcpRouter(services);

  app.use('/api', apiRouter);
  app.use('/mcp', mcpRouter);

  app.listen(3150, () => {
    console.log('AgentMap rodando em http://localhost:3150');
  });
  ```

  ---

  ## 7. Riscos Revisados

  ### 7.1 Riscos Eliminados

  | Risco Antes | Status | Motivo |
  |-------------|--------|--------|
  | Projeto aberto/fechado inconsistente | ✅ **ELIMINADO** | Single-project não tem esse estado |
  | `projectMiddleware` recria serviços | ✅ **ELIMINADO** | Serviços singleton |
  | Duas instâncias de `MonitoramentoService` | ✅ **ELIMINADO** | Apenas uma instância |
  | `GERENCIADOR_DIR` e multi-tenancy | ✅ **ELIMINADO** | Não existe mais |
  | Path traversal entre projetos | ✅ **ELIMINADO** | Apenas um projeto |

  ### 7.2 Novos Riscos

  | Risco | Probabilidade | Impacto | Mitigação |
  |-------|---------------|---------|-----------|
  | Templates desatualizados | Média | Médio | `agentmap update` + CI |
  | Múltiplas instâncias em produção | Baixa | Médio | Reverse proxy |
  | Curva de aprendizado | Média | Baixo | Documentação + onboarding |

  ---

  ## 8. Benefícios Quantificados

  | Métrica | Antes | Depois | Ganho |
  |---------|-------|--------|-------|
  | **Esforço total** | 440h (55 dias) | 200h (25 dias) | **-55%** |
  | **Complexidade backend** | Alta (multi-tenant) | Baixa (single-project) | **-70%** |
  | **Linhas de código** | ~13k | Estimado ~8k | **-38%** |
  | **Serviços por request** | ~30 | ~10 | **-67%** |
  | **Rotas protegidas por middleware** | ~30 | ~10 | **-67%** |
  | **Tempo de startup** | Lento (cria 30 serviços) | Rápido (10 serviços) | **+50%** |
  | **Dependências** | Express + 30+ middlewares | Fastify + plugins | **-30%** |

  ---

  ## 9. Próximos Passos Imediatos

  ### 9.1 Esta Semana

  | Dia | Ação | Responsável |
  |-----|------|-------------|
  | 1 | Corrigir Risk/Decisions Zod | Arquiteto |
  | 2 | Configurar ESLint + Prettier | Engenheiro |
  | 3 | Externalizar secrets para .env | Engenheiro |
  | 4 | Implementar logging estruturado | Engenheiro |
  | 5 | Configurar CI/CD básico | Engenheiro |

  ### 9.2 Próximas 2 Semanas

  | Ação | Responsável | Esforço |
  |------|-------------|---------|
  | Refatorar backend para single-project | Arquiteto | 16h |
  | Remover `projectMiddleware` complexo | Engenheiro | 8h |
  | Simplificar `ProjetoService` | Engenheiro | 8h |
  | Iniciar testes unitários | QA | 32h |

  ### 9.3 Mês 1

  | Marco | Data | Entregável |
  |-------|------|------------|
  | Backend simplificado | 2026-09-15 | v0.9.0-alpha |
  | Testes ≥70% | 2026-09-15 | Suite de testes |
  | CI/CD funcionando | 2026-09-15 | GitHub Actions |

  ---

  ## 10. Conclusão

  Esta revisão do plano mantém **toda a análise dos 7 conselheiros**, mas reestrutura a execução em torno da **ideia principal** que foi inicialmente proposta:

  > **AgentMap é um template/base que é adicionado à raiz de cada projeto, não um gerenciador multi-tenant centralizado.**

  **Benefícios:**
  - Redução de 55% no esforço total (440h → 200h)
  - Eliminação de complexidade multi-tenant
  - Manutenção simplificada (atualizar template = atualizar todos)
  - Backend mais simples e rápido
  - Filosofia local-first verdadeira

  **Próxima ação:** Aprovação do Product Owner para iniciar Fase 1.

  ---

  ## Anexos

  ### A. Documentos de Referência

  - `.ia/qualidade/mapeamento-completo-agentmap.md` — Mapeamento completo
  - `.ia/qualidade/proposta-arquiteto.md` — Proposta arquitetural
  - `.ia/qualidade/proposta-engenheiro.md` — Proposta de engenharia
  - `.ia/qualidade/proposta-gerente.md` — Proposta executiva
  - `.ia/qualidade/proposta-analista-sistemas.md` — Proposta técnica
  - `.ia/qualidade/proposta-analista-negocios.md` — Proposta de negócio
  - `.ia/qualidade/proposta-qa.md` — Proposta de qualidade
  - `.ia/qualidade/proposta-seguranca.md` — Proposta de segurança
  - `.ia/qualidade/proposta-documentador.md` — Proposta de documentação

  ---

  *Documento revisado baseado na ideia principal: AgentMap como template/base por projeto*  
  *Branch: v0044 | Data: 2026-08-27*  
  *Status: Pronto para aprovação*
