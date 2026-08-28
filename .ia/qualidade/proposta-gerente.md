# Proposta Executiva — Gerente de Projeto

> **Versão:** 1.0.0
> **Data:** 2026-08-27
> **Autor:** Gerente de Projeto (AgentMap)
> **Branch:** v0044
> **Status:** Proposta para Revisão

---

## 1. Diagnóstico de Processos Atuais

### 1.1 Pontos Fortes Identificados

| Área | Ponto Forte | Impacto |
|------|-------------|---------|
| **Arquitetura** | Separação clara entre API HTTP e MCP Server | Permite evolução independente |
| **Governanza** | Sistema completo de contratos, riscos, bloqueios | Rastreabilidade total |
| **Validação** | Schemas Zod em todas as escritas | Integridade de dados |
| **Observabilidade** | OpenTelemetry tracing + monitoramento | Debugging eficiente |
| **Documentação** | 170+ tools MCP documentadas | Usabilidade do sistema |
| **Fluxo de Fases** | 11 fases bem definidas | Previsibilidade |
| **Wake-up Plugin** | Comunicação bidirecional AgentMap ↔ Kilo | Coordenação assíncrona eficaz |

### 1.2 Gaps de Governança

| Gap | Severidade | Descrição |
|-----|------------|-----------|
| **Ausência de Change Management** | ALTA | Não existe processo formal para mudanças de escopo/arquitetura |
| **Risk Register Inoperante** | ALTA | `agentmap_riscos_listar` retorna erro Zod — riscos não são gerenciáveis |
| **Decisões sem Versionamento** | MÉDIA | `agentmap_decisoes_listar` também falha — histórico decisório comprometido |
| **Contratos Vazios** | MÉDIA | Projeto possui 0 contratos registrados — violação de regra obrigatória |
| **Ausência de KPIs Operacionais** | MÉDIA | Não há métricas de sucesso do produto em produção |
| **Validação de Qualidade Inexistente** | MÉDIA | Sem quality gates definidos entre fases |
| **Documentação Desatualizada** | BAIXA | Docs existem mas não refletem estado atual (v0044) |

### 1.3 Falhas no Processo de Trabalho

1. **Auditoria sem follow-up:** 13 tarefas de auditoria concluídas mas resultados não consolidados em ação corretiva
2. **Worktrees órfãos:** 90+ worktrees criados, muitos sem tarefa associada ou branch mergeada
3. **Falta de Release Management:** Sem tags, changelog ou processo de release definido
4. **Propagação de atualizações:** Mudanças no AgentMap base não se propagam para projetos existentes
5. **Ausência de Testes Automatizados:** Cobertura de testes desconhecida; typecheck/lint são as únicas validações

### 1.4 Problemas de Comunicação entre Agentes

| Problema | Impacto | Mitigação Necessária |
|----------|---------|---------------------|
| Mensagens sem sessionId | Isolamento por sessão incompleto | Adicionar sessionId em MensagemMonitoramento |
| Plugin usa `require('path')` | Pode falhar em alguns ambientes Kilo | Usar ESM imports |
| Eventos não confirmados | Acúmulo de eventos pendentes | Implementar TTL para eventos |
| Handoffs sem validação | Transferências sem critério de aceitação | Adicionar validação de completude |

### 1.5 Riscos Não Mitigados

1. **Risco Técnico:** Acoplamento frontend/backend impede deploy independente
2. **Risco Operacional:** Sem backup automático em produção
3. **Risco de Segurança:** Sem política de rotação de tokens/segredos
4. **Risco de Negócio:** Dependência de um único desenvolvedor (bus factor = 1)
5. **Risco de Escalabilidade:** FileSystem pode não suportar volume alto de projetos

---

## 2. Metodologia Proposta

### 2.1 Framework de Trabalho: **Scrumban**

**Justificativa:** O AgentMap opera em modo iterativo com sprints curtas (1-2 semanas) mas requer flexibilidade para correções urgentes. Scrumban combina:

- **Scrum:** Sprints, dailies (assíncronos), retrospectivas
- **Kanban:** WIP limits, flow contínuo, priorização dinâmica

### 2.2 Cerimônias Recomendadas

| Cerimônia | Frequência | Duração | Participantes |
|-----------|------------|---------|---------------|
| **Sprint Planning** | Quinzenal | 30min | GP + Arquiteto + Devs |
| **Daily Async** | Diária | 5min (escrita) | Todos os agentes |
| **Sprint Review** | Quinzenal | 20min | GP + Stakeholders |
| **Retrospectiva** | Quinzenal | 15min | GP + Equipe |
| **Backlog Refinement** | Semanal | 15min | GP + PO + Arquiteto |
| **Risk Review** | Mensal | 15min | GP + Todos |

### 2.3 Papéis e Responsabilidades

```
┌─────────────────────────────────────────────────────────────┐
│                    STAKEHOLDERS (Humano)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              PRODUCT OWNER (PO) - Humano                     │
│  Define prioridades, valida entregas, aceita/rejeita         │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  GERENTE DE     │ │   ARQUITETO     │ │  ANALISTA DE    │
│  PROJETO        │ │   DE SOFTWARE   │ │  NEGÓCIOS       │
│  (Este perfil)  │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    EQUIPE TÉCNICA                            │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│  │ Backend   │ │ Frontend  │ │   DBA     │ │   QA      │   │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 Definition of Ready (DoR)

Uma tarefa está **pronta** quando:

- [ ] Descrição clara com critérios de aceitação testáveis
- [ ] Dependências mapeadas e tarefas pai concluídas
- [ ] Contrato associado definido e aprovado
- [ ] Agente responsável atribuído e disponível
- [ ] Arquivos permitidos/proibidos definidos
- [ ] Estimativa de esforço registrada
- [ ] Riscos identificados e mitigados

### 2.5 Definition of Done (DoD)

Uma tarefa está **concluída** quando:

- [ ] Critérios de aceitação atendidos e testados
- [ ] Código typecheck + lint limpos
- [ ] Resultados registrados em `.ia/resultados/`
- [ ] Artefatos versionados em `.ia/artefatos/`
- [ ] Handoff gerado para próximo agente (se aplicável)
- [ ] Documentação atualizada (se aplicável)
- [ ] Validação humana obtida (se aprovação necessária)

### 2.6 Work Breakdown Structure (WBS)

```
1. AGENTMAP v1.0 — Release Planejado
   │
   ├── 1.1 Fundação Técnica
   │   ├── 1.1.1 Correção de Bugs Críticos [CONCLUÍDO]
   │   ├── 1.1.2 Correção Risk/Decisions Zod [PENDENTE]
   │   ├── 1.1.3 Testes Automatizados (Jest)
   │   └── 1.1.4 Scaffold para Novos Projetos
   │
   ├── 1.2 Governança e Qualidade
   │   ├── 1.2.1 Implementar Change Management
   │   ├── 1.2.2 Definir Quality Gates por Fase
   │   ├── 1.2.3 Criar Templates de Contratos
   │   └── 1.2.4 Auditoria de Segurança (OWASP)
   │
   ├── 1.3 UX/UI e Documentação
   │   ├── 1.3.1 Redesign do Frontend (Design System)
   │   ├── 1.3.2 Documentação de API (OpenAPI)
   │   ├── 1.3.3 Guia de Início Rápido
   │   └── 1.3.4 Vídeos Tutoriais
   │
   ├── 1.4 Estabilização
   │   ├── 1.4.1 Performance Tuning
   │   ├── 1.4.2 Backup Automático
   │   ├── 1.4.3 Logging e Monitoramento
   │   └── 1.4.4 Testes E2E
   │
   └── 1.5 Release v1.0
       ├── 1.5.1 Release Notes
       ├── 1.5.2 Migração de Dados
       └── 1.5.3 Tag e Changelog
```

---

## 3. Roadmap do Produto

### 3.1 Visão de Longo Prazo

> **"Ser o padrão-ouro em gerenciamento local de agentes de IA, fornecendo governança, contexto e coordenação para equipes de desenvolvimento potencializadas por IA."**

**Horizonte:** 12 meses (2026-08 a 2027-08)

### 3.2 Releases Planejadas

| Release | Data Prevista | Escopo Principal | Status |
|---------|---------------|------------------|--------|
| **v0.9.0** | 2026-09-15 | Beta Estável — Bugs corrigidos, testes, documentação | Em progresso |
| **v1.0.0** | 2026-10-30 | MVP Produção — Governança completa, UX reformada | Planejado |
| **v1.1.0** | 2026-12-15 | Multi-tenancy Real — Suporte robusto a múltiplos projetos | Planejado |
| **v1.2.0** | 2027-02-01 | Integrações — Plugins para outros IDEs, CI/CD | Planejado |
| **v2.0.0** | 2027-05-01 | Scale — PostgreSQL opcional, clustering, SaaS-ready | Visionamento |

### 3.3 MVP vs Features Futuras

**MVP (v1.0.0) — Obrigatório:**
- CRUD completo de projetos, agentes, tarefas
- Contratos e validação funcional
- Risk Register e Decisões operacionais
- Documentação de API (OpenAPI/Swagger)
- Frontend funcional e responsivo
- Testes unitários e de integração
- Pipeline CI/CD básico

**Features Futuras (Pós-v1.0):**
- Multi-tenancy real com isolamento
- Dashboard analytics
- Integração com GitHub/GitLab
- Plugins para JetBrains, Neovim
- Modo SaaS (opcional)
- Marketplace de templates
- Agentes especializados por domínio

### 3.4 Cronograma Realista

```
AGO 2026                    OUT 2026                    NOV 2026
│─────────────────────────────│─────────────────────────────│
│ Sprint 1-2: Bugs + Zod      │ Sprint 5-6: UX + Docs       │
│ Sprint 3-4: Testes + Scaffold│ Sprint 7-8: Stabilization   │
│                             │                             │
├── v0.9.0 Beta ──────────────┤                             │
                              ├── v1.0.0 MVP ────────────────┤
                                                           ──┘
```

### 3.5 Marcos (Milestones)

| Marco | Data | Entregável | Critério de Sucesso |
|-------|------|------------|---------------------|
| **M1: Estabilidade** | 2026-09-01 | Zero bugs críticos | Typecheck + lint + testes verdes |
| **M2: Beta** | 2026-09-15 | v0.9.0 release | 5 projetos teste bem-sucedidos |
| **M3: Governança** | 2026-10-01 | Quality Gates operacionais | 100% tarefas com DoR/DoD |
| **M4: MVP** | 2026-10-30 | v1.0.0 release | Documentação completa + testes |
| **M5: Produção** | 2026-11-15 | Deploy estável | Uptime 99% + backup automático |

---

## 4. Gestão de Riscos

### 4.1 Risk Register Atualizado

| ID | Risco | Probabilidade | Impacto | Score | Estratégia | Responsável |
|----|-------|---------------|---------|-------|------------|-------------|
| **R01** | Risk/Decisions Zod quebrado | Alta | Alto | Crítico | Mitigar: Corrigir schemas imediatamente | Arquiteto |
| **R02** | Sem testes automatizados | Alta | Alto | Crítico | Mitigar: Implementar Jest + Supertest | QA + Backend |
| **R03** | Worktrees órfãos acumulados | Alta | Médio | Alto | Mitigar: Limpeza automática + política | GP |
| **R04** | Frontend acoplado ao backend | Médio | Alto | Alto | Mitigar: Planejar separação incremental | Arquiteto |
| **R05** | Dependência de desenvolvedor único | Médio | Crítico | Alto | Mitigar: Documentação + pair programming | GP |
| **R06** | FileSystem não escala | Médio | Médio | Médio | Aceitar: PostgreSQL como opção futura | Arquiteto |
| **R07** | Plugin wake-up falha em updates Kilo | Médio | Médio | Médio | Monitorar: Version pinning + testes | Backend |
| **R08** | Sem backup em produção | Baixo | Crítico | Médio | Mitigar: Implementar backup automático | DevOps |
| **R09** | Segurança: path traversal residual | Baixo | Alto | Médio | Mitigar: Pen-test + SAST | Segurança |
| **R10** | Documentação desatualizada | Médio | Baixo | Baixo | Mitigar: Docs-as-code + CI check | Documentador |

### 4.2 Estratégias de Mitigação

**Para Riscos Críticos (Score ≥ Alto):**

1. **R01 — Risk/Decisions Zod:**
   - Ação: Criar schemas Zod dedicados para Risco e Decisao
   - Prazo: 2 dias
   - Owner: Arquiteto

2. **R02 — Sem testes:**
   - Ação: Implementar suíte de testes unitários (cobertura mínima 70%)
   - Prazo: 2 sprints
   - Owner: QA + Backend

3. **R03 — Worktrees órfãos:**
   - Ação: Script de limpeza automática (TTL 7 dias)
   - Prazo: 1 dia
   - Owner: GP

### 4.3 Planos de Contingência

| Risco | Gatilho | Plano B |
|-------|---------|---------|
| R01 persiste após 3 dias | Schema não resolve | Desabilitar features temporariamente |
| R02 não concluído em 2 sprints | Cobertura < 50% | Contratar revisão externa |
| R04 bloqueia release | Separação muito complexa | Manter acoplado com API versionada |
| R05 se materializa | Desenvolvedor indisponível | Ativar documentação como onboarding |

### 4.4 Matriz de Probabilidade x Impacto

```
              │    BAIXO    │    MÉDIO    │    ALTO     │   CRÍTICO   │
──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ ALTA        │             │     R03     │  R01, R02   │             │
──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ MÉDIO       │             │  R06, R07   │  R04, R05   │             │
──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ BAIXO       │             │     R10     │  R08, R09   │             │
──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
```

---

## 5. Gestão de Stakeholders

### 5.1 Mapa de Stakeholders

| Stakeholder | Papel | Interesse | Influência | Estratégia |
|-------------|-------|-----------|------------|------------|
| **Desenvolvedor Principal** | Criador/ mantenedor | Muito Alto | Muito Alto | Envolvido diariamente |
| **Product Owner** | Define prioridades | Alto | Alto | Review quinzenal |
| **Usuários Beta** | Testam o sistema | Médio | Médio | Feedback contínuo |
| **Comunidade Open Source** | Potenciais contribuidores | Baixo | Médio | Documentação + GitHub |
| **Agentes Kilo** | Consumem MCP | Alto | Alto | Coordenação via handoffs |

### 5.2 Estratégia de Comunicação

| Canal | Frequência | Público | Conteúdo |
|-------|------------|---------|----------|
| **Daily Async** | Diária | Equipe técnica | Status, bloqueios, próximos passos |
| **Sprint Review** | Quinzenal | PO + Stakeholders | Demo de entregas |
| **Retrospectiva** | Quinzenal | Equipe | Melhorias de processo |
| **GitHub Issues** | Contínuo | Comunidade | Bugs, features, discussões |
| **Documentação** | Sob demanda | Usuários | Guias, API reference |
| **Changelog** | Por release | Todos | Mudanças, breaking changes |

### 5.3 Expectativas e Alinhamento

| Stakeholder | Expectativa | Alinhamento | Ação |
|-------------|-------------|-------------|------|
| Desenvolvedor | Produto estável e bem documentado | ✅ Alinhado | Priorizar qualidade |
| PO | Entregas previsíveis | ⚠️ Parcial | Definir MVP claramente |
| Usuários | Sistema fácil de usar | ⚠️ Parcial | Investir em UX |
| Comunidade | Open source atrativo | ❌ Pendente | Licença + contribuição |

### 5.4 Canais de Feedback

1. **GitHub Issues** — Bugs e feature requests
2. **GitHub Discussions** — Dúvidas e ideias
3. **Formulário interno** — Feedback de usabilidade
4. **Métricas de uso** — Telemetria anônima (opt-in)
5. **Entrevistas** — Usuários beta trimestrais

---

## 6. KPIs e Métricas

### 6.1 Métricas de Sucesso do Produto

| KPI | Meta Atual | Meta v1.0 | Medição |
|-----|------------|-----------|---------|
| **Projetos gerenciados** | 1 | 10+ | Contagem de projetos ativos |
| **Agentes coordenados** | 15 | 50+ | Contagem de agentes registrados |
| **Tempo de onboarding** | N/A | < 30min | Timer de criação de projeto |
| **Uptime do sistema** | N/A | 99% | Health check monitoring |
| **Satisfação do usuário** | N/A | ≥ 4/5 | Pesquisa NPS |

### 6.2 Métricas de Qualidade

| KPI | Meta | Medição |
|-----|------|---------|
| **Cobertura de testes** | ≥ 70% | Jest coverage report |
| **Bugs críticos em produção** | 0 | Issue tracker |
| **Tempo de correção de bugs** | < 24h | Lead time |
| **Dívida técnica** | < 10% | Code climate / SonarQube |
| **Typecheck/Lint errors** | 0 | CI pipeline |

### 6.3 Métricas de Desempenho

| KPI | Meta | Medição |
|-----|------|---------|
| **Latência API (p95)** | < 200ms | OpenTelemetry |
| **Latência MCP (p95)** | < 500ms | OpenTelemetry |
| **Throughput** | 100 req/s | Load test |
| **Uso de memória** | < 512MB | Process monitor |
| **Tempo de resposta do frontend** | < 1s | Lighthouse |

### 6.4 Dashboards Recomendados

1. **Dashboard de Saúde do Sistema**
   - Status: online/offline
   - Latência: p50, p95, p99
   - Erros: taxa de erro 5xx
   - Uptime: % disponibilidade

2. **Dashboard de Projeto**
   - Tarefas: por estado (todo/doing/done)
   - Velocidade: story points/sprint
   - Burndown: progresso da sprint
   - Riscos: abertos vs resolvidos

3. **Dashboard de Qualidade**
   - Cobertura de testes: % por módulo
   - Bugs: abertos por severidade
   - Dívida técnica: estimativa em horas
   - Code smells: quantidade

---

## 7. Gestão de Mudanças

### 7.1 Processo de Change Management

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE MUDANÇA                          │
└─────────────────────────────────────────────────────────────┘

1. SOLICITAÇÃO
   └── Stakeholder cria solicitação via GitHub Issue
       └── Template: tipo, descrição, justificativa, impacto

2. AVALIAÇÃO
   └── GP classifica: escopo, prazo, custo, risco
       └── Arquiteto avalia impacto técnico

3. APROVAÇÃO
   └── Pequena: GP aprova
   └── Média: PO aprova
   └── Grande: Comitê (GP + PO + Arquiteto)

4. IMPLEMENTAÇÃO
   └── Tarefa criada com change flag
   └── Implementação em branch separada
   └── Testes + documentação atualizados

5. VALIDAÇÃO
   └── Review por pares
   └── Testes de regressão
   └── Aprovação do solicitante

6. RELEASE
   └── Merge para main
   └── Changelog atualizado
   └── Comunicação aos stakeholders
```

### 7.2 Classificação de Mudanças

| Tipo | Descrição | Aprovação Necessária | Prazo Mínimo |
|------|-----------|----------------------|--------------|
| **Pequena** | Bug fix, docs, refatoração isolada | GP | 1 dia |
| **Média** | Nova feature, mudança de API | PO | 3 dias |
| **Grande** | Mudança arquitetural, breaking change | Comitê | 7 dias |
| **Emergencial** | Segurança, data loss | GP + PO imediato | Imediato |

### 7.3 Impacto de Mudanças

| Área | Métrica de Impacto | Limite para Escalonamento |
|------|-------------------|---------------------------|
| **Escopo** | Story points adicionais | > 20% da sprint |
| **Prazo** | Dias de atraso | > 3 dias |
| **Custo** | Horas adicionais | > 16 horas |
| **Qualidade** | Redução de cobertura | > 5% |
| **Risco** | Novos riscos críticos | Qualquer um |

### 7.4 Comunicação de Mudanças

| Evento | Canal | Audiência | Conteúdo |
|--------|-------|-----------|----------|
| Mudança aprovada | GitHub Issue | Equipe | Descrição + prazo |
| Mudança implementada | PR + Changelog | Todos | Diff + breaking changes |
| Mudança rejeitada | GitHub Issue | Solicitante | Motivo + alternativas |
| Release notes | GitHub Release | Público | Resumo + migration guide |

### 7.5 Rollback Procedures

**Condições para Rollback:**
- Taxa de erro > 5% após deploy
- Performance degradada > 50%
- Bug crítico em produção sem hotfix disponível
- Solicitação do PO

**Procedimento:**
1. Identificar versão estável anterior (`git tag`)
2. Criar branch de rollback: `rollback/vX.Y.Z`
3. Reverter para commit estável
4. Executar testes de regressão
5. Deploy de rollback
6. Comunicar stakeholders
7. Criar post-mortem

---

## 8. Governança

### 8.1 Estrutura de Decisão

```
┌─────────────────────────────────────────────────────────────┐
│                  NÍVEIS DE DECISÃO                           │
└─────────────────────────────────────────────────────────────┘

NÍVEL 1 — OPERACIONAL (Autônomo)
├── Decisões de implementação técnica
├── Refatorações isoladas
├── Correção de bugs não-críticos
└── DECISÃO: Agente responsável

NÍVEL 2 — TÁTICO (Consultivo)
├── Priorização de backlog
├── Mudanças de escopo pequenas
├── Alocação de recursos
└── DECISÃO: GP + PO

NÍVEL 3 — ESTRATÉGICO (Colegiado)
├── Mudanças arquiteturais
├── Breaking changes
├── Novos releases
├── Orçamento e prazos
└── DECISÃO: Comitê (GP + PO + Arquiteto)

NÍVEL 4 — CRÍTICO (Emergencial)
├── Segurança comprometida
├── Data loss
├── Sistema indisponível
└── DECISÃO: GP + PO imediato (depois ratificado)
```

### 8.2 Níveis de Aprovação

| Ação | Aprovador | Prazo | Registro |
|------|-----------|-------|----------|
| Tarefa técnica | Agente | Imediato | `.ia/tarefas/` |
| Sprint planning | GP + PO | 1 dia | `.ia/sprint/` |
| Release menor | GP | 2 dias | `.ia/lancamentos/` |
| Release maior | Comitê | 5 dias | `.ia/lancamentos/` |
| Mudança arquitetural | Arquiteto + PO | 3 dias | `.ia/decisoes/` |
| Emergência | GP | Imediato | `.ia/decisoes/` |

### 8.3 Políticas e Standards

**Políticas Obrigatórias:**

1. **Código:**
   - TypeScript strict mode obrigatório
   - ESLint + Prettier para formatação
   - Typecheck + lint devem passar antes do commit
   - Conventional Commits para mensagens

2. **Documentação:**
   - Toda feature deve ter documentação atualizada
   - API changes devem atualizar OpenAPI
   - Breaking changes devem ter migration guide

3. **Testes:**
   - Toda feature deve ter testes unitários
   - Integrações devem ter testes E2E
   - Cobertura mínima: 70%

4. **Segurança:**
   - Dependências auditadas (npm audit)
   - Sem segredos em código ou Git
   - Path traversal protegido em todas as rotas

5. **Comunicação:**
   - Handoffs obrigatórios entre agentes
   - Resultados registrados em `.ia/resultados/`
   - Eventos confirmados após processamento

### 8.4 Auditoria e Compliance

**Auditorias Realizadas:**

| Tipo | Frequência | Responsável | Registro |
|------|------------|-------------|----------|
| Code review | Por PR | Pares | GitHub PR |
| Segurança (SAST) | Semanal | Segurança | Relatório |
| Dependências | Semanal | Backend | npm audit |
| Qualidade de código | Mensal | QA | SonarQube |
| Compliance LGPD | Trimestral | Segurança | Checklist |

**Compliance:**

| Requisito | Status | Ação |
|-----------|--------|------|
| LGPD — Dados pessoais | ✅ Conformidade | Sem dados sensíveis armazenados |
| LGPD — Direito ao esquecimento | ⚠️ Parcial | Implementar exclusão completa |
| OWASP Top 10 | ⚠️ Pendente | Agendar pen-test |
| Acessibilidade (WCAG) | ❌ Pendente | Planejar auditoria |

---

## 9. Ações Imediatas (Próximos 7 Dias)

| Prioridade | Ação | Responsável | Prazo |
|------------|------|-------------|-------|
| 🔴 P0 | Corrigir `agentmap_riscos_listar` (Zod) | Arquiteto | 1 dia |
| 🔴 P0 | Corrigir `agentmap_decisoes_listar` (Zod) | Arquiteto | 1 dia |
| 🔴 P0 | Criar contrato do projeto | Arquiteto + PO | 2 dias |
| 🟡 P1 | Implementar scaffold para novos projetos | Backend | 3 dias |
| 🟡 P1 | Limpar worktrees órfãos | GP | 2 dias |
| 🟡 P1 | Criar suíte de testes base | QA | 5 dias |
| 🟢 P2 | Atualizar documentação para v0044 | Documentador | 7 dias |
| 🟢 P2 | Definir quality gates por fase | QA + GP | 7 dias |

---

## 10. Aprovações Necessárias

| Decisão | Aprovador | Status |
|---------|-----------|--------|
| Aprovação desta proposta | Product Owner | Pendente |
| Priorização do roadmap | Product Owner | Pendente |
| Alocação de recursos | Desenvolvedor Principal | Pendente |
| Definição do MVP | Comitê | Pendente |

## 11. Atualizações Recentes (2026-08-27)

### 11.1 Ativação do Agente DBA

O agente `analista-banco-dados` reportou:
- Autoidentificação como agente banco/dados
- Verificação de tarefas: nenhuma pendente anterior
- Estado pronto para receber atribuições

**Ação tomada:** Criada tarefa TAR-2026-00020 "Analisar modelo de dados do AgentMap" com prioridade ALTA.

### 11.2 Status Atual das Tarefas

| Estado | Quantidade |
|--------|------------|
| CONCLUIDA | 13 |
| RASCUNHO | 7 |
| **Total** | **20** |

### 11.3 Decisões Registradas

| ID | Decisão | Responsável |
|----|---------|-------------|
| DEC-2026-00001 | Atribuir análise de modelo de dados ao DBA | Gerente de Projeto |

---

*Documento preparado pelo Gerente de Projeto do AgentMap*
*Próxima revisão: Após aprovação do Product Owner*
*Versão: 1.1.0 — 2026-08-27 (atualizado com ativação DBA)*
