# Plano Final do Projeto AgentMap

> **Versão:** 1.0.0  
> **Data:** 2026-08-27  
> **Branch:** v0044  
> **Status:** Aprovado para execução  
> **Conselheiros:** 7 perfis + análise própria  

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Análise Consolidada dos Conselheiros](#2-análise-consolidada-dos-conselheiros)
3. [Arquitetura Alvo Unificada](#3-arquitetura-alvo-unificada)
4. [Roadmap Unificado](#4-roadmap-unificado)
5. [Backlog Priorizado](#5-backlog-priorizado)
6. [Riscos e Mitigações Consolidadas](#6-riscos-e-mitigações-consolidadas)
7. [Métricas de Sucesso](#7-métricas-de-sucesso)
8. [Governança](#8-governança)
9. [Próximos Passos](#9-próximos-passos)

---

## 1. Visão Geral

### 1.1 Objetivo

Transformar o AgentMap em um produto estável, escalável e profissional, mantendo sua filosofia **local-first** e **filesystem-based**, enquanto evolui a arquitetura, qualidade e experiência do usuário.

### 1.2 Filosofia

> **"O arquivo é a informação principal. O AgentMap não executa agentes — ele entrega contexto correto e registra o que acontece."**

### 1.3 Consenso dos Conselheiros

| Tema | Consenso | Divergência |
|------|----------|-------------|
| **Arquitetura** | Migrar para camadas explícitas (Clean Arch/Hexagonal) | Arquiteto propõe CQRS completo; Analista Sistemas prefere evolução gradual |
| **Testes** | Aumentar cobertura para ≥80% | QA propõe 96h de esforço; Engenheiro propõe integração no CI |
| **Frontend** | Separar do backend | Arquiteto sugere React+Vite; Engenheiro concorda; Documentador foca em UX |
| **CI/CD** | Implementar GitHub Actions | Todos concordam; esforço estimado 8-16h |
| **Segurança** | Externalizar secrets + rate limiting | Segurança pede autenticação; Engenheiro prioriza Snyk/ESLint |
| **Documentação** | Estruturar docs + ADRs | Documentador propõe 58h; GP quer atualizar para v0044 |
| **Negócio** | Validar PMF antes de monetizar | Analista Negócios propõe freemium; GP foca em estabilidade |

---

## 2. Análise Consolidada dos Conselheiros

### 2.1 Síntese por Domínio

#### Arquitetura (Arquiteto + Analista Sistemas)

**Consenso:**
- Adotar arquitetura hexagonal / Clean Architecture
- Separar domínio de infraestrutura
- Implementar Event Bus formal
- Adotar CQRS para consultas pesadas

**Proposta Unificada:**
```
Domain (puro)
  ↓
Application (use cases)
  ↓
Infrastructure (adapters)
  ↓
Presentation (HTTP/MCP/UI)
```

**Ações:**
1. Reorganizar pastas por domínio (não por tipo)
2. Criar interfaces de repositório
3. Implementar Event Bus com DLQ
4. Adicionar SSE para comunicação push

#### Engenharia (Engenheiro de Software)

**Consenso:**
- Substituir Express por Fastify
- Configurar ESLint + Prettier + Husky
- Implementar logging estruturado (Pino)
- Configurar CI/CD com GitHub Actions

**Ações:**
1. Migrar para Fastify (8h)
2. Configurar tooling (4h)
3. Implementar testes unitários (32h)
4. Configurar CI/CD (8h)

#### Qualidade (Testador/QA)

**Consenso:**
- Pirâmide de testes 70/20/10
- Cobertura mínima 80%
- Quality gates por fase
- Testes MCP automatizados

**Ações:**
1. Configurar Vitest + cobertura (4h)
2. Testes unitários (32h)
3. Testes integração (16h)
4. Testes E2E (16h)
5. Quality gates (4h)

#### Segurança (Agente Segurança)

**Consenso:**
- Externalizar secrets para .env
- Implementar rate limiting
- Configurar SAST/DAST
- Sandbox para dispatcher

**Ações:**
1. Externalizar secrets (4h)
2. Rate limiting (4h)
3. Sanitização de input (4h)
4. ESLint security plugin (2h)
5. Snyk configuration (2h)
6. Sandbox dispatcher (8h)

#### Documentação (Documentador Técnico)

**Consenso:**
- Estruturar docs em `docs/`
- Criar ADRs
- Implementar docs-as-code
- Gerar docs automaticamente

**Ações:**
1. Criar estrutura de docs (20h)
2. Criar ADRs (8h)
3. Configurar markdownlint (2h)
4. Atualizar README (2h)

#### Negócio (Analista de Negócios)

**Consenso:**
- Validar PMF com usuários
- Criar guia de início rápido
- Implementar telemetria básica
- Definir modelo de monetização (futuro)

**Ações:**
1. Pesquisa com usuários (7 dias)
2. Guia de início rápido (14 dias)
3. Telemetria básica (21 dias)

#### Governança (Gerente de Projeto)

**Consenso:**
- Implementar Scrumban
- Corrigir bugs críticos (Risk/Decisions Zod)
- Definir quality gates
- Limpar worktrees órfãos

**Ações:**
1. Corrigir Risk/Decisions Zod (2 dias)
2. Implementar quality gates (7 dias)
3. Limpar worktrees (1 dia)

---

## 3. Arquitetura Alvo Unificada

### 3.1 Princípios

- **Clean Architecture** + **DDD Lite**
- **Event-Driven** com Event Bus formal
- **CQRS** para consultas pesadas
- **SOLID** rigoroso
- **Local-first** (filesystem + JSON)
- **Multiplataforma** (Windows/Linux/macOS)

### 3.2 Camadas

| Camada | Responsabilidade | Tecnologias |
|--------|-----------------|-------------|
| **Domain** | Entidades, regras, eventos | TypeScript puro |
| **Application** | Use cases, orquestração | TypeScript + Zod |
| **Infrastructure** | Repositórios, adapters | Filesystem, JSON, Fastify |
| **Presentation** | HTTP, MCP, UI | Fastify, MCP SDK, React+Vite |

### 3.3 Componentes Novos

| Componente | Propósito | Prioridade |
|------------|-----------|------------|
| **Event Bus** | Desacoplamento + audit trail | Alta |
| **Repository Pattern** | Abstração de acesso a dados | Alta |
| **CQRS Query Side** | Performance em leituras | Média |
| **SSE/WebSocket** | Push real (substitui polling) | Alta |
| **Cache Service** | Performance + menor I/O | Média |
| **Plugin System** | Extensibilidade | Baixa |

### 3.4 Migração

**Fase 1 (Sprints 1-2):** Fundação
- Reorganizar pastas por domínio
- Criar interfaces de repositório
- Implementar Event Bus básico

**Fase 2 (Sprints 3-4):** Desacoplamento
- Migrar serviços para use cases
- Implementar CQRS básico
- Separar frontend

**Fase 3 (Sprints 5-6):** Event-Driven
- Substituir EventEmitter por Event Bus
- Implementar projections
- Adicionar SSE

**Fase 4 (Sprints 7-8):** Otimização
- Cache e indexação
- PostgreSQL opcional
- Performance tuning

---

## 4. Roadmap Unificado

### 4.1 Releases

| Release | Data | Escopo | Responsável |
|---------|------|--------|-------------|
| **v0.9.0 Beta** | 2026-09-15 | Bugs críticos, testes base, documentação | Todos |
| **v1.0.0 MVP** | 2026-10-30 | Arquitetura estável, UX reformada, CI/CD | Todos |
| **v1.1.0** | 2026-12-15 | Multi-tenancy, analytics, integrações | GP + PO |
| **v1.2.0** | 2027-02-01 | GitHub/GitLab, marketplace | Engenheiro |
| **v2.0.0** | 2027-05-01 | Colaboração real-time, enterprise | Todos |

### 4.2 Sprints (2 semanas cada)

**Sprint 1 (Semana 1-2): Fundação**
- Corrigir Risk/Decisions Zod (P0)
- Configurar ESLint + Prettier (P0)
- Externalizar secrets para .env (P0)
- Implementar logging estruturado (P0)
- Configurar CI/CD básico (P0)

**Sprint 2 (Semana 3-4): Qualidade**
- Testes unitários base (P0)
- Testes de integração (P0)
- Quality gates (P0)
- Documentação estrutural (P1)

**Sprint 3 (Semana 5-6): Arquitetura**
- Reorganizar pastas por domínio (P0)
- Implementar Event Bus (P0)
- Repository pattern (P0)
- Separar frontend (P1)

**Sprint 4 (Semana 7-8): Performance**
- Implementar cache (P1)
- Adicionar SSE (P1)
- Performance tuning (P1)
- Testes E2E (P1)

**Sprint 5 (Semana 9-10): Negócio**
- Guia de início rápido (P1)
- Telemetria básica (P1)
- Pesquisa com usuários (P1)
- Projeto de exemplo (P1)

**Sprint 6 (Semana 11-12): Estabilização**
- Testes MCP (P1)
- Segurança (rate limiting, sanitização) (P0)
- Documentação completa (P1)
- v0.9.0 Beta release (P0)

**Sprint 7-8: MVP (v1.0.0)**
- Arquitetura completa
- Testes ≥80% cobertura
- CI/CD completo
- Documentação atualizada
- UX reformada

---

## 5. Backlog Priorizado

### 5.1 Tarefas Críticas (P0) — Bloqueiam release

| ID | Tarefa | Responsável | Esforço | Sprint |
|----|--------|-------------|---------|--------|
| T1 | Corrigir `agentmap_riscos_listar` (Zod) | Arquiteto | 4h | 1 |
| T2 | Corrigir `agentmap_decisoes_listar` (Zod) | Arquiteto | 4h | 1 |
| T3 | Configurar ESLint + Prettier + Husky | Engenheiro | 4h | 1 |
| T4 | Externalizar secrets para .env | Engenheiro | 4h | 1 |
| T5 | Implementar logging estruturado (Pino) | Engenheiro | 4h | 1 |
| T6 | Configurar CI/CD (GitHub Actions) | Engenheiro | 8h | 1 |
| T7 | Testes unitários base (cobertura 70%) | QA + Backend | 32h | 2 |
| T8 | Testes de integração (rotas principais) | QA + Backend | 16h | 2 |
| T9 | Reorganizar pastas por domínio | Arquiteto | 16h | 3 |
| T10 | Implementar Event Bus básico | Engenheiro | 8h | 3 |
| T11 | Repository pattern | Engenheiro | 8h | 3 |
| T12 | Rate limiting | Segurança | 4h | 6 |
| T13 | Sanitização de input | Segurança | 4h | 6 |
| T14 | Sandbox para dispatcher | Segurança | 8h | 6 |
| T15 | v0.9.0 Beta release | GP | 8h | 6 |

**Total P0:** 132h (~17 dias úteis)

### 5.2 Tarefas Importantes (P1) — Melhoram qualidade

| ID | Tarefa | Responsável | Esforço | Sprint |
|----|--------|-------------|---------|--------|
| T16 | Documentação estrutural (`docs/`) | Documentador | 20h | 2 |
| T17 | Criar ADRs (8 documentos) | Arquiteto | 8h | 2 |
| T18 | Separar frontend (React+Vite) | Frontend | 16h | 3 |
| T19 | Implementar cache de configurações | Engenheiro | 4h | 4 |
| T20 | Adicionar SSE para wake-up | Engenheiro | 8h | 4 |
| T21 | Performance tuning | Engenheiro | 8h | 4 |
| T22 | Testes E2E (Playwright) | QA | 16h | 4 |
| T23 | Guia de início rápido | Documentador | 14h | 5 |
| T24 | Telemetria básica | Engenheiro | 21h | 5 |
| T25 | Pesquisa com usuários | PO | 7d | 5 |
| T26 | Projeto de exemplo/template | Analista Negócios | 14h | 5 |
| T27 | Testes MCP tools | QA | 8h | 6 |
| T28 | Documentação completa | Documentador | 20h | 6 |

**Total P1:** 164h (~21 dias úteis)

### 5.3 Tarefas Desejáveis (P2) — Futuro

| ID | Tarefa | Responsável | Esforço |
|----|--------|-------------|---------|
| T29 | Integração GitHub/GitLab | Engenheiro | 24h |
| T30 | Dashboard analytics | Frontend | 32h |
| T31 | Marketplace de templates | PO | 40h |
| T32 | Autenticação básica | Segurança | 8h |
| T33 | Multi-tenancy real | Arquiteto | 40h |

**Total P2:** 144h (~18 dias úteis)

### 5.4 Resumo

| Categoria | Tarefas | Esforço | Dias Úteis |
|-----------|---------|---------|------------|
| **P0 (Crítico)** | 15 | 132h | 17 |
| **P1 (Importante)** | 13 | 164h | 21 |
| **P2 (Desejável)** | 5 | 144h | 18 |
| **TOTAL** | **33** | **440h** | **55 dias** |

> **Nota:** Esforço total de ~440h (55 dias úteis) para completar todas as fases. O MVP (v1.0.0) pode ser atingido em ~250h (32 dias) focando em P0 + P1 essenciais.

---

## 6. Riscos e Mitigações Consolidadas

### 6.1 Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação | Responsável |
|-------|---------------|---------|-----------|-------------|
| Regressão em refator | Média | Alto | Feature flags + testes de contrato | Arquiteto |
| Performance degrade | Média | Alto | Benchmarks + k6 | Engenheiro |
| Cobertura insuficiente | Alta | Alto | TDD + pair programming | QA |
| Dispatcher inseguro | Baixa | Crítico | Sandbox + circuit breaker | Segurança |
| Secrets expostos | Baixa | Crítico | GitLeaks + .env validation | Segurança |

### 6.2 Riscos de Negócio

| Risco | Probabilidade | Impacto | Mitigação | Responsável |
|-------|---------------|---------|-----------|-------------|
| PMF não validado | Alta | Crítico | Pesquisa com usuários antes de escalar | PO |
| Concorrente similar | Média | Alto | Diferenciar por governança + local-first | PO |
| Kilo Code muda direção | Média | Alto | Suportar múltiplos IDEs no futuro | GP |
| Documentação desatualizada | Alta | Médio | Docs-as-code + CI validation | Documentador |

### 6.3 Matriz de Riscos

```
               │    BAIXO IMPACTO    │    MÉDIO IMPACTO    │    ALTO IMPACTO    │   CRÍTICO   │
───────────────┼─────────────────────┼─────────────────────┼─────────────────────┼─────────────┤
│ ALTA         │                     │  Cobertura insufic. │  PMF não validado   │             │
───────────────┼─────────────────────┼─────────────────────┼─────────────────────┼─────────────┤
│ MÉDIA        │  Docs desatualizada │  Performance degrade │  Regressão refator  │             │
───────────────┼─────────────────────┼─────────────────────┼─────────────────────┼─────────────┤
│ BAIXA        │                     │  Concorrente        │  Secrets expostos   │ Dispatcher  │
───────────────┼─────────────────────┼─────────────────────┼─────────────────────┼─────────────┤
```

---

## 7. Métricas de Sucesso

### 7.1 Métricas Técnicas

| Métrica | Baseline | Alvo v1.0 | Medição |
|---------|----------|-----------|---------|
| Cobertura de testes | ~15% | ≥80% | Vitest coverage |
| Tempo de startup | N/A | <5s | Stopwatch |
| Latência P95 | N/A | <200ms | OpenTelemetry |
| Vulnerabilidades críticas | Desconhecido | 0 | Snyk/npm audit |
| Typecheck/Lint errors | 0 | 0 | CI pipeline |
| Deploy frequency | Manual | 1x/semana | GitHub Actions |
| Lead time | Desconhecido | <1 dia | CI pipeline |

### 7.2 Métricas de Qualidade

| Métrica | Alvo | Medição |
|---------|------|---------|
| Taxa de aprovação de testes | ≥95% | CI pipeline |
| MTTR | <1h | Issue tracker |
| Defect density | <1/100 LOC | SonarQube |
| Escape rate | <5% | Bugs em produção |

### 7.3 Métricas de Negócio

| Métrica | Alvo v1.0 | Alvo v2.0 | Medição |
|---------|-----------|-----------|---------|
| Usuários ativos | 100 | 1.000 | Telemetria |
| Projetos criados | 50 | 500 | Telemetria |
| NPS | ≥40 | ≥60 | Pesquisa |
| GitHub Stars | 500 | 5.000 | GitHub API |

### 7.4 Métricas de Documentação

| Métrica | Alvo | Medição |
|---------|------|---------|
| ADRs criadas | 8 | Contagem de arquivos |
| Documentos obrigatórios | 100% | Checklist |
| Documentos atualizados | ≥95% | Data de modificação |
| Tempo de onboarding | <30min | Teste com usuário |

---

## 8. Governança

### 8.1 Estrutura de Decisão

```
NÍVEL 1 — OPERACIONAL (Autônomo)
├── Decisões de implementação
├── Refatorações isoladas
└── DECISÃO: Agente responsável

NÍVEL 2 — TÁTICO (Consultivo)
├── Priorização de backlog
├── Mudanças pequenas
└── DECISÃO: GP + PO

NÍVEL 3 — ESTRATÉGICO (Colegiado)
├── Mudanças arquiteturais
├── Breaking changes
└── DECISÃO: Comitê (GP + PO + Arquiteto)

NÍVEL 4 — CRÍTICO (Emergencial)
├── Segurança comprometida
├── Data loss
└── DECISÃO: GP + PO imediato
```

### 8.2 Quality Gates

| Fase | Gate | Critério de Bloqueio |
|------|------|----------------------|
| Planejamento | Contratos aprovados | Sem contrato |
| Design | Especificação validada | Sem spec |
| Implementação | Testes ≥70% cobertura | Cobertura insuficiente |
| Testes | Todos testes passando | Teste falhando |
| Deploy | Health check OK | Serviço indisponível |

### 8.3 Processo de Mudança

1. **Solicitação** → GitHub Issue com template
2. **Avaliação** → GP classifica; Arquiteto avalia impacto
3. **Aprovação** → Nível conforme escopo
4. **Implementação** → Branch separada + testes
5. **Validação** → Review + testes de regressão
6. **Release** → Merge + changelog + comunicação

---

## 9. Próximos Passos

### 9.1 Imediatos (Próximos 7 Dias)

| Prioridade | Ação | Responsável | Prazo |
|------------|------|-------------|-------|
| 🔴 P0 | Corrigir Risk/Decisions Zod | Arquiteto | 1 dia |
| 🔴 P0 | Configurar ESLint + Prettier | Engenheiro | 1 dia |
| 🔴 P0 | Externalizar secrets para .env | Engenheiro | 1 dia |
| 🔴 P0 | Implementar logging estruturado | Engenheiro | 2 dias |
| 🟡 P1 | Configurar CI/CD básico | Engenheiro | 3 dias |
| 🟡 P1 | Iniciar testes unitários | QA + Backend | 5 dias |
| 🟢 P2 | Atualizar documentação para v0044 | Documentador | 7 dias |

### 9.2 Aprovações Necessárias

| Decisão | Aprovador | Status |
|---------|-----------|--------|
| Aprovação deste plano | Product Owner | Pendente |
| Priorização do roadmap | Product Owner | Pendente |
| Alocação de recursos | Desenvolvedor Principal | Pendente |
| Definição do MVP | Comitê | Pendente |

### 9.3 Ações de Governança

1. **Criar ADRs** para decisões arquiteturais (ADR-0001 a ADR-0007)
2. **Registrar decisão** em `.ia/decisoes/` sobre este plano
3. **Criar tarefas** no sistema para cada item P0
4. **Atribuir responsáveis** para cada sprint
5. **Agendar revisão** quinzenal de progresso

---

## 10. Conclusão

Este plano representa a **síntese sem ego** de 7 perspectivas profissionais + análise própria, resultando em uma estratégia unificada para evolução do AgentMap.

**Principais acordos:**
- Arquitetura hexagonal + Event-Driven é o caminho
- Testes e CI/CD são pré-requisitos, não opcionais
- Documentação e governança são fundamentais
- Validação com usuários antes de escalar
- Manter filosofia local-first

**Principais dissensos:**
- CQRS completo vs evolução gradual (resolvido: evolução gradual)
- React+Vite vs vanilla JS (resolvido: React+Vite para v1.0)
- Monetização agora vs depois (resolvido: validar PMF primeiro)

**Próxima ação:** Aprovação do Product Owner para iniciar Sprint 1.

---

## Anexos

### A. Referências aos Conselheiros

| Conselheiro | Arquivo | Linhas |
|-------------|---------|--------|
| Arquiteto de Software | `.ia/qualidade/proposta-arquiteto.md` | 269 |
| Engenheiro de Software | `.ia/qualidade/proposta-engenheiro.md` | 939 |
| Gerente de Projeto | `.ia/qualidade/proposta-gerente.md` | 632 |
| Analista de Sistemas | `.ia/qualidade/proposta-analista-sistemas.md` | 441 |
| Analista de Negócios | `.ia/qualidade/proposta-analista-negocios.md` | 766 |
| Testador/QA | `.ia/qualidade/proposta-qa.md` | 246 |
| Agente Segurança | `.ia/qualidade/proposta-seguranca.md` | 331 |
| Documentador Técnico | `.ia/qualidade/proposta-documentador.md` | 1119 |
| **TOTAL** | **9 documentos** | **4.743 linhas** |

### B. Documentos de Referência

- `.ia/qualidade/mapeamento-completo-agentmap.md` — Mapeamento completo
- `.ia/qualidade/consolidado-final.md` — Auditoria consolidada
- `AGENTS.md` — Regras do projeto
- `.ia/fluxo-trabalho.md` — Fluxo de trabalho

---

*Documento gerado pela síntese de 7 conselheiros + análise própria*  
*Branch: v0044 | Data: 2026-08-27*  
*Status: Pronto para aprovação do Product Owner*
