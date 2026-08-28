# Proposta de Qualidade — Testador/QA

> **Versão:** 1.0.0  
> **Data:** 2026-08-27  
> **Autor:** Testador/QA (AgentMap)  
> **Branch:** v0044  
> **Status:** Proposta para aprovação  

---

## 1. Diagnóstico de Qualidade Atual

### 1.1 Pontos Fortes

- Validação dupla: Zod + JSON Schema
- TypeScript strict mode
- OpenTelemetry para observabilidade
- Proteção contra path traversal
- Estrutura de governança bem definida

### 1.2 Gaps de Qualidade

| Gap | Severidade | Descrição |
|-----|------------|-----------|
| **Cobertura de testes ~15%** | Crítica | Apenas 2 arquivos de integração |
| **Sem testes unitários** | Crítica | Services sem cobertura |
| **Sem testes MCP** | Alta | 170 tools sem validação |
| **Sem testes de segurança** | Alta | SAST/DAST ausentes |
| **Sem testes de performance** | Média | Sem baseline de performance |
| **Sem quality gates** | Alta | Fases avançam sem validação |
| **Sem Definition of Done** | Média | Critérios de conclusão não formalizados |

### 1.3 Riscos de Qualidade

- Regressão funcional em refatorings
- Bugs em produção por falta de testes
- Performance degrade sem detecção
- Segurança comprometida sem validação

---

## 2. Estratégia de Qualidade

### 2.1 Filosofia

> **"Quality is built-in, not bolted-on"**

- Shift-left testing
- Testes como especificação
- Automação máxima
- Quality gates por fase

### 2.2 Definition of Ready (DoR)

- [ ] Critérios de aceitação definidos
- [ ] Dependências mapeadas
- [ ] Contratos definidos
- [ ] Agente responsável atribuído
- [ ] Estimativa registrada

### 2.3 Definition of Done (DoD)

- [ ] Critérios de aceitação atendidos
- [ ] Testes unitários ≥ 80% cobertura
- [ ] Testes de integração passando
- [ ] Typecheck + lint limpos
- [ ] Resultados registrados
- [ ] Handoff gerado

### 2.4 Quality Gates

| Fase | Gate | Critério de Bloqueio |
|------|------|----------------------|
| Planejamento | Contratos aprovados | Sem contrato, não avança |
| Design | Especificação validada | Sem spec, não avança |
| Implementação | Testes unitários ≥ 70% | Cobertura insuficiente |
| Testes | Todos os testes passando | Teste falhando |
| Deploy | Health check OK | Serviço indisponível |

---

## 3. Plano de Testes

### 3.1 Pirâmide de Testes

```
        /\
       /E2E\          10% — Fluxos críticos
      /------\
     /Integração\     20% — API + serviços
    /----------\
   /Unitários    \   70% — Services, utils, validadores
  /--------------\
```

### 3.2 Ferramentas

| Tipo | Ferramenta | Aplicação |
|------|-----------|-----------|
| Unitários | Vitest | Services, validadores, utils |
| Integração | Vitest + supertest | Rotas HTTP, repositórios |
| E2E | Playwright | Fluxos completos |
| MCP | Vitest | Tools MCP |
| Cobertura | c8 | Coverage reports |
| Contrato | Schemathesis | Property-based testing |

### 3.3 Cobertura Mínima

| Métrica | Mínimo | Alvo |
|---------|--------|------|
| Linhas | 80% | 90% |
| Ramos | 75% | 85% |
| Funções | 80% | 90% |

---

## 4. Métricas de Qualidade

| KPI | Meta | Medição |
|-----|------|---------|
| Cobertura de testes | ≥ 80% | Vitest coverage |
| Taxa de aprovação | ≥ 95% | Testes passando / total |
| MTTR | < 1h | Tempo de correção |
| Defect density | < 1 por 100 LOC | Bugs / linhas |
| Escape rate | < 5% | Bugs em produção / total |

---

## 5. Automação de Testes

### 5.1 Testes Unitários

- Services: regras de negócio
- Validadores: schemas Zod
- Utils: funções puras
- State machines: transições válidas

### 5.2 Testes de Integração

- Rotas HTTP: CRUD de entidades
- Repositórios: filesystem + JSON
- MCP tools: contratos de ferramentas
- Event Bus: publicação/assinatura

### 5.3 Testes E2E

- Criar e abrir projeto
- Workflow completo de tarefa
- Handoff entre agentes
- Validação de integridade

### 5.4 Testes MCP

- 170 tools: smoke tests
- Contratos de entrada/saída
- Error handling
- Tracing funcionando

---

## 6. Quality Gates

### 6.1 Por Fase

**Desenvolvimento:**
- PR com testes + coverage ≥ 80%
- Typecheck + lint limpos
- Review aprovado

**Integração:**
- Todos os testes passando
- Contratos MCP válidos
- Health check OK

**Deploy:**
- E2E passando
- Performance baseline atendida
- Security scan limpo

### 6.2 Critérios de Bloqueio

- Cobertura < 70%
- Teste falhando em CI
- Vulnerabilidade crítica não corrigida
- Contrato quebrado

---

## 7. Riscos de Qualidade

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Cobertura insuficiente | Alta | Alto | TDD, pair programming |
| Testes frágeis | Média | Médio | Testes estáveis, mocks corretos |
| Performance não atendida | Média | Alto | k6, benchmarks |
| Regressão em refator | Média | Alto | Testes de contrato |

---

## 8. Processo de Qualidade

### 8.1 Workflow

```
Desenvolver → Testar → Revisar → Integrar → Validar → Deploy
     ↑           ↓        ↓         ↓         ↓        ↓
   TDD      Unit/Int  Code Review  CI     Quality Gate  Monitor
```

### 8.2 Papéis

| Papel | Responsabilidade |
|-------|-----------------|
| Desenvolvedor | Escrever testes unitários |
| QA | Definir estratégia, revisar testes |
| Arquiteto | Validar quality gates |
| GP | Garantir cobertura mínima |

### 8.3 Ferramentas

- **CI:** GitHub Actions
- **Testes:** Vitest, Playwright
- **Coverage:** c8, codecov
- **Qualidade:** SonarQube (futuro)

---

## 9. Backlog de Qualidade

| ID | Tarefa | Prioridade | Esforço |
|----|--------|-----------|---------|
| Q1 | Configurar Vitest + cobertura | Alta | 4h |
| Q2 | Testes unitários para services | Alta | 32h |
| Q3 | Testes de integração para rotas | Alta | 16h |
| Q4 | Testes MCP tools | Média | 8h |
| Q5 | Testes E2E com Playwright | Média | 16h |
| Q6 | Configurar CI/CD | Alta | 8h |
| Q7 | Quality gates automatizados | Média | 4h |
| Q8 | Testes de segurança | Média | 8h |

**Total:** 96h (~12 dias úteis)

---

*Documento gerado pelo Testador/QA do AgentMap*  
*Branch: v0044 | Data: 2026-08-27*
