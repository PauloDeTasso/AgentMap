# Lista Completa de Profissionais/Agentes do AgentMap

> Documento consolidado com todos os agentes que existem no código, são criados no scaffolding
> ou são referenciados na documentação oficial do AgentMap.
> Data: 2026-08-26

---

## 1. Agentes Criados Automaticamente no Scaffolding de Projeto Novo

Definidos em `backend/src/arquivos/templates/agentes.ts` (`AGENTES_BASE`).
São criados fisicamente em `.ia/agentes/` quando um projeto novo é criado.

| # | ID | Nome | Função | Estado | Tipo |
|---|-----|------|--------|--------|------|
| 1 | `planejador-arquiteto` | Planejador / Arquiteto | planejamento | ativo | Base |
| 2 | `frontend` | Frontend | desenvolvimento_frontend | ativo | Base |
| 3 | `backend` | Backend | desenvolvimento_backend | ativo | Base |
| 4 | `banco` | Banco de Dados | banco_de_dados | ativo | Base |
| 5 | `android` | Android | desenvolvimento_android | ativo | Base |
| 6 | `infraestrutura` | Infraestrutura | infraestrutura_implantacao | ativo | Base |
| 7 | `seguranca` | Segurança | seguranca | ativo | Base |
| 8 | `testes` | Qualidade e Testes | qualidade_testes | ativo | Base |
| 9 | `revisor` | Revisor de Código | revisao | ativo | Base |
| 10 | `documentacao` | Documentação | documentacao | ativo | Base |
| 11 | `observabilidade` | Observabilidade | observabilidade | disponivel | Base |
| 12 | `desempenho` | Desempenho | desempenho | disponivel | Base |
| 13 | `devops` | DevOps Engineer | devops | ativo | Base |
| 14 | `technical-writer` | Technical Writer | documentacao_tecnica | ativo | Base |
| 15 | `gerente-projeto` | Gerente de Projeto | gerenciamento | ativo | Fase 1 |
| 16 | `analista-sistemas` | Analista de Sistemas | analise-tecnica | ativo | Fase 1 |
| 17 | `analista-negocios` | Analista de Negócios | analise-negocios | ativo | Fase 1 |
| 18 | `engenheiro-software` | Engenheiro de Software | engenharia | ativo | Fase 1 |
| 19 | `analista-banco-dados` | Analista de Banco de Dados | banco-dados | ativo | Fase 1 |
| 20 | `testador-qa` | Testador/QA | qualidade-testes | ativo | Fase 1 |
| 21 | `documentador-tecnico` | Documentador Técnico | documentacao | ativo | Fase 1 |

**Total: 21 agentes base** + 1 orquestrador especial.

### Agente Especial: Orquestrador

Criado em `ScaffoldService.ts` (linhas 250-278). Não faz parte do `AGENTES_BASE`, mas é criado em todo projeto novo.

| ID | Nome | Função |
|-----|------|--------|
| `orquestrador` | Orquestrador | orquestracao |

---

## 2. Agentes Registrados no Projeto Atual (.ia/agentes/agentes.json)

Além dos 21 base, o projeto atual tem 6 agentes customizados de documentação:

| # | ID | Nome | Função |
|---|-----|------|--------|
| 1 | `docs-api-01` | Doc API | atualizacao_docs |
| 2 | `docs-arq-01` | Doc Arquitetura | atualizacao_docs |
| 3 | `docs-comm-01` | Doc Comunicacao | atualizacao_docs |
| 4 | `docs-guia-01` | Doc Guia | atualizacao_docs |
| 5 | `docs-proc-01` | Doc Processo | atualizacao_docs |
| 6 | `docs-root-01` | Doc Root | atualizacao_docs |

**Total no projeto atual: 28 agentes** (21 base + 1 orquestrador + 6 custom)

---

## 3. Papéis de Procedimentos (preparacao/entrega)

Definidos em `backend/src/arquivos/ScaffoldService.ts` (array `PAPEIS`).
Geram arquivos `preparacao-{papel}.md` e `entrega-{papel}.md` em `.ia/procedimentos/`.

| # | Papel ID |
|---|----------|
| 1 | `planejador` |
| 2 | `gerente-projeto` |
| 3 | `analista-sistemas` |
| 4 | `analista-negocios` |
| 5 | `engenheiro-software` |
| 6 | `analista-banco-dados` |
| 7 | `testador-qa` |
| 8 | `documentador-tecnico` |
| 9 | `backend` |
| 10 | `banco` |
| 11 | `frontend` |
| 12 | `android` |
| 13 | `infraestrutura` |
| 14 | `seguranca` |
| 15 | `testes` |
| 16 | `revisor` |
| 17 | `documentacao` |
| 18 | `observabilidade` |
| 19 | `desempenho` |

**Total: 19 papéis de procedimento.**

---

## 4. Templates de Prompt por Fase

Definidos em `backend/src/templates/prompts/index.ts` (`PAPEIS_POR_FASE`).
Estes são templates de prompt carregados pelo sistema de prompts do AgentMap.

### Fase 1 — Planejamento
`project-manager`, `product-owner`, `business-analyst`, `stakeholder`, `scrum-master`, `risk-manager`, `technical-lead`, `gerente-projeto`, `analista-sistemas`, `analista-negocios`, `engenheiro-software`, `analista-banco-dados`, `testador-qa`, `documentador-tecnico`, `seguranca`

### Fase 2 — Viabilidade
`project-manager`, `software-architect`, `business-analyst`, `financial-analyst`, `legal-consultant`, `technical-lead`, `domain-expert`, `risk-analyst`, `operations-manager`

### Fase 3 — Requisitos
`business-analyst`, `product-owner`, `project-manager`, `technical-lead`, `stakeholder`, `qa-lead`, `ux-designer`, `domain-expert`, `security-analyst`

### Fase 4 — Design e Contratos
`software-architect`, `system-architect`, `technical-lead`, `backend-developer`, `frontend-developer`, `database-architect`, `devops-engineer`, `qa-lead`, `security-architect`

### Fase 5 — Design UX/UI
`ux-designer`, `ui-designer`, `ux-researcher`, `interaction-designer`, `visual-designer`, `design-systems-engineer`, `accessibility-specialist`, `product-designer`

### Fase 6 — Banco de Dados
`database-architect`, `database-administrator`, `data-engineer`, `backend-developer`, `data-analyst`, `qa-engineer`, `devops-engineer`, `data-architect`

### Fase 7 — Implementação
`software-architect`, `technical-lead`, `full-stack-developer`, `backend-developer`, `frontend-developer`, `mobile-developer`, `devops-engineer`, `qa-engineer`

### Fase 8 — Testes
`qa-lead`, `qa-engineer`, `test-automation-engineer`, `performance-engineer`, `security-engineer`, `uat-specialist`, `release-manager`, `devops-engineer`

### Fase 9 — DevSecOps
`devsecops-engineer`, `security-engineer`, `security-analyst`, `penetration-tester`, `compliance-officer`, `risk-manager`, `security-architect`, `application-security-engineer`

### Fase 10 — Deploy
`devops-engineer`, `release-manager`, `sre`, `cloud-engineer`, `infrastructure-engineer`, `operations-manager`, `support-engineer`, `security-engineer`

### Fase 11 — Documentação
`technical-writer`, `documentation-specialist`, `maintenance-engineer`, `application-support-engineer`, `sre`, `product-owner`, `qa-engineer`, `devops-engineer`

**Total de templates de prompt: ~70 papéis únicos.**

---

## 5. Profissionais da Documentação Oficial

Documentados em `docs/responsabilidades-profissionais.md` e `PLANO GERAL/`:

### Gestão e Produto (7)
1. Project Manager (PM)
2. Product Owner (PO)
3. Product Manager
4. Stakeholder / Sponsor
5. Scrum Master
6. Risk Manager
7. Business Analyst (BA)

### Arquitetura e Design (14)
8. Software Architect
9. System Architect
10. Technical Lead
11. UX Designer
12. UI Designer
13. UX Researcher
14. Interaction Designer
15. Visual Designer
16. Design Systems Engineer
17. Accessibility Specialist (A11y)
18. Product Designer
19. Database Architect
20. Data Architect
21. Security Architect

### Desenvolvimento (5)
22. Full-Stack Developer
23. Backend Developer
24. Frontend Developer
25. Mobile Developer
26. Data Engineer

### Qualidade e Testes (5)
27. QA Lead
28. QA Engineer
29. Test Automation Engineer
30. Performance Engineer
31. UAT Specialist

### Segurança (6)
32. Security Engineer
33. Security Analyst
34. Penetration Tester (Pentester)
35. Compliance Officer
36. Application Security Engineer
37. DevSecOps Engineer

### Dados (2)
38. Database Administrator (DBA)
39. Data Analyst

### Infraestrutura e Operações (7)
40. DevOps Engineer
41. Release Manager
42. Site Reliability Engineer (SRE)
43. Cloud Engineer
44. Infrastructure Engineer
45. Operations Manager
46. Support Engineer

### Documentação e Manutenção (4)
47. Technical Writer
48. Documentation Specialist
49. Maintenance Engineer
50. Application Support Engineer

**Total: 50 profissionais na documentação.**

---

## 6. Comparação: 8 Tradicionais da Fase 1 vs AgentMap

| Profissional Tradicional (Fase 1) | ID no AgentMap | Tipo | Status |
|-----------------------------------|----------------|------|--------|
| Gerente de Projeto | `gerente-projeto` | Base + Fase 1 | ✅ Criado |
| Analista de Sistemas | `analista-sistemas` | Base + Fase 1 | ✅ Criado |
| Arquiteto de Software | `planejador-arquiteto` | Base | ✅ Existia |
| Analista de Negócios | `analista-negocios` | Base + Fase 1 | ✅ Criado |
| Engenheiro de Software | `engenheiro-software` | Base + Fase 1 | ✅ Criado |
| Analista de Banco de Dados | `analista-banco-dados` | Base + Fase 1 | ✅ Criado |
| Testador/QA | `testador-qa` | Base + Fase 1 | ✅ Criado |
| Documentador Técnico | `documentador-tecnico` | Base + Fase 1 | ✅ Criado |

---

## 7. Agentes de Execução que Não Estão nos 8 Tradicionais

Estes são papéis de **execução**, não de planejamento. Eles não precisam estar nos 8 tradicionais,
mas existem no AgentMap como agentes separados:

| Agente Executor | ID | Função | Status |
|-----------------|-----|--------|--------|
| Frontend | `frontend` | desenvolvimento_frontend | ✅ Base |
| Backend | `backend` | desenvolvimento_backend | ✅ Base |
| Android | `android` | desenvolvimento_android | ✅ Base |
| Infraestrutura | `infraestrutura` | infraestrutura_implantacao | ✅ Base |
| DevOps Engineer | `devops` | devops | ✅ Base |
| Revisor de Código | `revisor` | revisao | ✅ Base |
| Observabilidade | `observabilidade` | observabilidade | ✅ Base |
| Desempenho | `desempenho` | desempenho | ✅ Base |
| Segurança | `seguranca` | seguranca | ✅ Base (adicionado agora) |

---

## 8. O Que Está Embutido vs. Ausente

| Conceito | Onde Está | Status |
|----------|-----------|--------|
| Levantador de requisitos | `analista-negocios` (BA) | ✅ Embutido |
| Performance/Desempenho | `desempenho` (executor) + `engenheiro-software`/`testador-qa` (planejamento) | ✅ Coberto |
| Segurança | `seguranca` (executor) + `analista-negocios`/`engenheiro-software`/`analista-banco-dados`/`testador-qa` (planejamento) | ✅ Coberto |
| DevOps/Deploy | `devops` (executor) + `infraestrutura` (executor) + `engenheiro-software` (planejamento) | ✅ Coberto |
| QA/Testes | `testes` (executor) + `testador-qa` (planejamento) | ✅ Coberto |
| Documentação | `documentacao` + `technical-writer` (executores) + `documentador-tecnico` (planejamento) | ✅ Coberto |
| Product Owner | Template de prompt Fase 1/3 | ✅ Template |
| Scrum Master | Template de prompt Fase 1 | ✅ Template |
| Risk Manager | Template de prompt Fase 1/9 | ✅ Template |
| UX/UI Designer | Template de prompt Fase 5 | ✅ Template |
| Data Engineer | Template de prompt Fase 6 | ✅ Template |
| Pentester | Template de prompt Fase 9 | ✅ Template |
| Compliance Officer | Template de prompt Fase 9 | ✅ Template |
| Release Manager | Template de prompt Fase 8/10 | ✅ Template |
| SRE | Template de prompt Fase 10/11 | ✅ Template |

---

## 9. Inconsistências Encontradas e Corrigidas

### Antes da correção
- `backend/src/tipos/index.ts` definia `AGENTES_INICIAIS` com 12 agentes, incluindo `seguranca`
- `backend/src/arquivos/templates/agentes.ts` definia `AGENTES_BASE` com 20 agentes, **sem** `seguranca`
- `ScaffoldService.ts` usava `AGENTES_BASE`, então `seguranca` NÃO era criado em projetos novos
- Resultado: o agente `seguranca` existia na especificação mas não no scaffolding real

### Depois da correção
- `AGENTES_BASE` agora tem 21 agentes, incluindo `seguranca`
- `PAPEIS` agora tem 19 papéis, incluindo `seguranca`
- `PAPEIS_POR_FASE['fase-1-planejamento']` agora inclui `seguranca`
- TypeScript compila sem erros
- Projetos novos agora criam `.ia/agentes/seguranca/` automaticamente

---

## 10. Resumo Final

### Agentes base criados automaticamente em todo projeto novo: **21**
- 13 originais do AgentMap
- 7 adicionados da Fase 1 (tradicionais)
- 1 `seguranca` adicionado para fechar o gap de execução

### Agentes especiais: **1** (`orquestrador`)

### Agentes customizados no projeto atual: **6** (docs-*)

### Templates de prompt por fase: **~70 papéis únicos**

### Profissionais na documentação: **50**

### Todos os níveis de prioridade do Kilo Code: ✅ OK
- Nível 1: `agent.<nome>.prompt` em `kilo.jsonc`
- Nível 2: `instructions` array em `kilo.jsonc`
- Nível 3: `AGENTS.md` na raiz
- Nível 4: `kilo.jsonc` global
