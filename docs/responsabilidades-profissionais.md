# Responsabilidades por Profissional e Fase — AgentMap

> Este documento detalha o que cada profissional faz em cada fase do ciclo de vida.
> **Total:** 50 profissionais únicos × 11 fases = 55 relações principais.
>
> **Versão:** 1.0.0
> **Data:** 2026-08-25

---

## Sumário

1. [Fase 1 — Planejamento de Projeto](#1)
2. [Fase 2 — Análise de Viabilidade](#2)
3. [Fase 3 — Requisitos](#3)
4. [Fase 4 — Design e Contratos](#4)
5. [Fase 5 — Design UX/UI](#5)
6. [Fase 6 — Banco de Dados](#6)
7. [Fase 7 — Arquitetura e Implementação](#7)
8. [Fase 8 — Testes e Qualidade](#8)
9. [Fase 9 — DevSecOps / Segurança](#9)
10. [Fase 10 — Deploy e Infraestrutura](#10)
11. [Fase 11 — Documentação e Manutenção](#11)

---

## 1. Planejamento de Projeto

### Project Manager (PM)
- Define escopo, cronograma, recursos e orçamento
- Identifica riscos iniciais e planeja mitigações
- Alinha stakeholders e garante comunicação
- Produz o Project Charter e o plano de projeto

### Product Owner (PO)
- Define visão do produto e objetivos de negócio
- Prioriza backlog inicial e critérios de sucesso
- Representa a voz do usuário e do negócio
- Aprova o planejamento sob a perspectiva de valor

### Product Manager
- Define estratégia de produto e roadmap de longo prazo
- Analisa mercado, concorrentes e tendências
- Estabelece métricas de sucesso e KPIs
- Alinha produto com metas organizacionais

### Stakeholder / Sponsor
- Aprova orçamento e recursos financeiros
- Define diretrizes estratégicas e limites de escopo
- Autoriza decisões de go/no-go
- Garante apoio executivo ao projeto

### Scrum Master
- Facilita cerimônias de planejamento (sprint planning, kickoff)
- Remove impedimentos e bloqueios organizacionais
- Garante que o processo ágil seja seguido
- Protege o time de interferências externas

### Risk Manager
- Identifica riscos iniciais (técnicos, financeiros, operacionais)
- Cria o risk register com probabilidade e impacto
- Planeja estratégias de mitigação e contingência
- Estabelece planos de resposta a riscos

### Business Analyst (BA)
- Levanta necessidades iniciais de negócio
- Define critérios de sucesso e métricas de negócio
- Documenta premissas e restrições iniciais
- Apoia a definição de escopo com dados de negócio

### Technical Lead
- Avalia viabilidade técnica inicial
- Define stack tecnológico e arquitetura de referência
- Identifica gaps de conhecimento na equipe
- Estima esforço técnico e complexidade

---

## 2. Análise de Viabilidade

### Project Manager
- Lidera o estudo de viabilidade
- Coordena especialistas e coleta deliverables
- Produz o feasibility report final
- Apresenta resultados para stakeholders

### Software Architect
- Avalia viabilidade técnica: arquitetura, integrações, escalabilidade
- Verifica maturidade do stack tecnológico proposto
- Identifica riscos técnicos e dependencies críticas
- Propõe alternativas arquiteturais

### Business Analyst
- Levanta requisitos de negócio em alto nível
- Traduz necessidades em critérios de viabilidade
- Valida que o sistema resolverá o problema de negócio
- Documenta premissas de negócio

### Financial Analyst / Advisor
- Calcula ROI, NPV, TCO, payback period
- Estima custos de desenvolvimento, operação e manutenção
- Modela cenários econômicos (base, otimista, pessimista)
- Define orçamento e fontes de financiamento

### Legal Consultant
- Avalia conformidade legal (LGPD, GDPR, licenças)
- Verifica propriedade intelectual e direitos autorais
- Analisa riscos legais e regulatórios
- Valida termos de serviço e políticas de privacidade

### Technical Lead
- Avalia expertise da equipe atual
- Verifica se o stack é dominado pelo time
- Identifica necessidade de treinamento ou contratação
- Estima prazo realista baseado em capacidade

### Domain Expert
- Valida pressupostos do domínio de negócio
- Confirma cenários de uso reais
- Identifica regras de negócio complexas
- Apoia na validação de requisitos de domínio

### Risk Analyst
- Quantifica riscos técnicos, econômicos e operacionais
- Calcula probabilidade e impacto de cada risco
- Propõe planos de mitigação específicos
- Estabelece indicadores de alerta precoce

### Operations Manager
- Avalia prontidão operacional para adotar o sistema
- Verifica capacidade de suporte e manutenção
- Analisa impacto nos processos de negócio
- Define requisitos de change management

---

## 3. Requisitos

### Business Analyst (BA)
- Elicita requisitos funcionais e não-funcionais
- Conduz entrevistas, workshops e questionários
- Documenta requisitos no SRS (Software Requirements Specification)
- Gerencia mudanças de requisitos durante o projeto
- Garante rastreabilidade entre requisitos

### Product Owner (PO)
- Prioriza backlog de requisitos
- Define acceptance criteria para cada requisito
- Aprova o SRS final
- Toma decisões de escopo e trade-offs

### Project Manager
- Gerencia escopo, prazo e recursos durante elicitação
- Coordena workshops de requisitos
- Garante que requisitos sejam realistas e entregáveis
- Controla mudanças de escopo

### Technical Lead
- Traduz requisitos de negócio em especificações técnicas
- Avalia viabilidade técnica de cada requisito
- Identifica ambiguidades e inconsistências
- Propõe soluções técnicas alternativas

### Stakeholder / Usuário
- Fornece necessidades reais do dia a dia
- Valida user stories e acceptance criteria
- Participa de entrevistas e workshops
- Aprova requisitos antes do design

### QA Lead
- Define estratégia de testes baseada em requisitos
- Mapeia requisitos para casos de teste
- Garante que requisitos sejam testáveis
- Estabelece critérios de qualidade

### UX Designer
- Levanta necessidades de usabilidade
- Pesquisa comportamento e expectativas dos usuários
- Define jornadas do usuário e fluxos
- Valida que requisitos são alcançáveis via interface

### Domain Expert
- Valida regras de negócio complexas
- Confirma exceções e casos limite
- Garante que requisitos refletem a realidade do domínio
- Apoia na resolução de ambiguidades

### Security Analyst
- Levanta requisitos de segurança (autenticação, autorização, LGPD)
- Define controles de acesso e conformidade
- Identifica dados sensíveis e requisitos de criptografia
- Documenta políticas de segurança

---

## 4. Design e Contratos

### Software Architect
- Define High-Level Design (HLD)
- Escolhe padrões arquiteturais e tecnologias
- Define camadas e responsabilidades do sistema
- Documenta decisões arquiteturais (ADRs)
- Garante consistência com requisitos

### System Architect
- Define arquitetura do sistema completo
- Especifica componentes, módulos e integrações
- Define protocolos de comunicação e APIs
- Valida que a arquitetura suporta requisitos não-funcionais

### Technical Lead
- Define Low-Level Design (LLD) para cada módulo
- Especifica algoritmos, estruturas de dados e interfaces
- Estabelece convenções de código e naming
- Revisa designs antes da implementação

### Backend Developer
- Define contratos de API (endpoints, DTOs, schemas)
- Especifica modelos de dados e validação
- Define estratégia de erros e códigos HTTP
- Documenta contratos em OpenAPI/Swagger

### Frontend Developer
- Define contratos de UI (componentes, props, estados)
- Especifica fluxos de navegação e rotas
- Define padrões de estado e cache
- Valida viabilidade de designs no frontend

### Database Architect
- Define modelo conceitual de dados (ERD)
- Define modelo lógico (tabelas, chaves, relacionamentos)
- Define modelo físico (tipos, índices, constraints)
- Especifica estratégia de migração e versionamento

### DevOps Engineer
- Define infraestrutura necessária (cloud, containers, redes)
- Especifica pipeline de CI/CD
- Define estratégia de deploy e ambientes
- Planeja monitoramento e observabilidade

### QA Lead
- Define estratégia de testes completa
- Especifica planos de teste por tipo (unit, integration, e2e)
- Define critérios de entrada e saída para cada fase de teste
- Estabelece métricas de qualidade

### Security Architect
- Define arquitetura de segurança (CORS, auth, encryption)
- Especifica threat model e controles de defesa
- Define políticas de segurança e compliance
- Valida que o design atende requisitos de segurança

---

## 5. Design UX/UI

### UX Designer
- Conduz pesquisa com usuários (entrevistas, testes de usabilidade)
- Define personas e jornadas do usuário
- Cria wireframes e protótipos de baixa fidelidade
- Valida fluxos de navegação e interação
- Testa usabilidade e itera baseado em feedback

### UI Designer
- Define design system (tokens, tipografia, cores, espaçamento)
- Cria mockups de alta fidelidade
- Especifica componentes visuais reutilizáveis
- Define estados de interface (hover, active, disabled, error)
- Garante consistência visual em todos os painéis

### UX Researcher
- Conduz pesquisa qualitativa e quantitativa
- Analisa dados de analytics e feedback de usuários
- Realiza testes de usabilidade moderados e não moderados
- Sintetiza findings em relatórios de pesquisa
- Valida hipóteses de design com dados

### Interaction Designer
- Define micro-interações e animações
- Especifica comportamentos de interface (transições, feedback)
- Define estados de loading, error e vazio
- Cria protótipos interativos de alta fidelidade
- Garante fluidez e resposta imediata da interface

### Visual Designer
- Define identidade visual do produto
- Cria iconografia, ilustrações e elementos gráficos
- Define hierarquia visual e contraste
- Garante alinhamento com marca e diretrizes visuais
- Produz assets finais para desenvolvimento

### Design Systems Engineer
- Constrói biblioteca de componentes reutilizáveis
- Documenta padrões de uso e variações
- Garante consistência entre design e implementação
- Mantém tokens e versionamento do design system
- Suporta desenvolvedores no handoff

### Accessibility Specialist (A11y)
- Valida conformidade com WCAG 2.1/2.2
- Testa navegação por teclado e leitores de tela
- Verifica contraste, foco e semântica HTML
- Define requisitos de acessibilidade para componentes
- Audita interfaces e reporta issues

### Product Designer
- Alinha design com objetivos de negócio
- Define features e prioriza esforços de design
- Colabora com PO e PM na definição de roadmap
- Apresenta design para stakeholders
- Garante que design entrega valor de negócio

---

## 6. Banco de Dados

### Database Architect
- Define modelo conceitual de dados (entidades, relacionamentos)
- Define modelo lógico (tabelas, chaves, normalização)
- Define modelo físico (tipos, índices, constraints, particionamento)
- Cria diagramas ER e documentação de dados
- Valida que modelo suporta requisitos de consulta

### Database Administrator (DBA)
- Administra SGBD (instalação, configuração, patches)
- Otimiza performance (queries, índices, estatísticas)
- Gerencia backup, recovery e replicação
- Monitora saúde do banco (espaço, conexões, locks)
- Define políticas de retenção e segurança

### Data Engineer
- Define pipelines ETL/ELT
- Planeja migrações de dados
- Especifica integrações com sistemas externos
- Automatiza processos de carga e transformação
- Garante qualidade e consistência de dados

### Backend Developer
- Implementa acesso a dados (ORM, queries, transações)
- Define repositories e data mappers
- Implementa validações de integridade
- Otimiza queries e conexões
- Integra banco com lógica de negócio

### Data Analyst
- Valida modelo de dados contra necessidades de relatórios
- Define métricas e indicadores de negócio
- Cria dashboards e relatórios operacionais
- Analisa padrões de uso e consultas frequentes
- Apoia na definição de índices e otimizações

### QA Engineer
- Testa integridade de dados (constraints, triggers, foreign keys)
- Valida migrações e seed data
- Testa performance de queries críticas
- Verifica comportamento em cenários de erro
- Garante que dados estão consistentes após operações

### DevOps Engineer
- Configura deploy de banco (migrations, seeds, rollback)
- Automatiza provisionamento de infraestrutura de dados
- Configura monitoramento de banco (métricas, alertas)
- Gerencia ambientes de banco (dev, staging, prod)
- Define estratégia de backup automatizado

### Data Architect
- Define estratégia de dados e governança
- Estabelece políticas de qualidade e master data
- Define padrões de modelagem e nomenclatura
- Planeja arquitetura de dados de longo prazo
- Gerencia catálogo de dados e metadados

---

## 7. Arquitetura e Implementação

### Software Architect
- Define estrutura de código e camadas (Domain, Application, Infrastructure, Presentation)
- Escolhe padrões arquiteturais (DDD, Clean Architecture, Repository)
- Define responsabilidades de cada módulo
- Documenta decisões técnicas (ADRs)
- Garante que implementação segue o design

### Technical Lead
- Define convenções de código e naming
- Revisa código (code review)
- Faz mentoring e pairing com desenvolvedores
- Resolve problemas técnicos complexos
- Garante qualidade e consistência do código

### Full-Stack Developer
- Implementa features end-to-end (backend + frontend)
- Integra API com interface
- Garante que dados fluem corretamente entre camadas
- Resolve bugs e issues
- Colabora com QA para validação

### Backend Developer
- Implementa API REST e endpoints
- Desenvolve lógica de negócio em serviços
- Implementa integrações externas
- Escreve testes unitários e de integração
- Otimiza performance e escalabilidade

### Frontend Developer
- Implementa interface e componentes
- Desenvolve telas e fluxos de navegação
- Implementa estados e gerenciamento de estado
- Garante responsividade e acessibilidade
- Colabora com UX/UI para fidelidade ao design

### Mobile Developer
- Implementa versões mobile (PWA, responsive)
- Otimiza performance em dispositivos móveis
- Testa em diferentes tamanhos de tela e browsers
- Implementa features específicas mobile (touch, gestures)
- Garante experiência consistente em mobile

### DevOps Engineer
- Configura pipeline de CI/CD
- Gerencia ambientes (dev, staging, prod)
- Automatiza build, test e deploy
- Configura infraestrutura como código
- Resolve problemas de deploy e infraestrutura

### QA Engineer
- Implementa testes unitários e de integração
- Executa testes manuais exploratórios
- Reporta bugs e acompanha correções
- Valida correções e regressão
- Suporta time com debugging e troubleshooting

---

## 8. Testes e Qualidade

### QA Lead
- Define estratégia de testes completa
- Cria planos de teste e casos de teste
- Estabelece métricas de qualidade (cobertura, defect rate)
- Coordena esforços de teste entre tipos
- Aprova qualidade final antes de deploy

### QA Engineer
- Executa testes manuais funcionais
- Reporta bugs com passos de reprodução
- Valida correções e regressão
- Executa testes exploratórios
- Garante que requisitos são atendidos

### Test Automation Engineer
- Implementa testes automatizados (unit, integration, e2e)
- Cria e mantém frameworks de automação
- Integra testes no pipeline de CI/CD
- Otimiza suítes de teste para velocidade e confiabilidade
- Reporta métricas de automação

### Performance Engineer
- Executa testes de carga, stress e performance
- Identifica gargalos e otimizações
- Define SLOs e SLIs
- Testa escalabilidade e limites do sistema
- Produz relatórios de performance

### Security Engineer
- Executa SAST (static analysis) em código
- Executa DAST (dynamic analysis) em ambiente
- Testa autenticação, autorização e criptografia
- Verifica conformidade OWASP Top 10
- Reporta vulnerabilidades e recomendações

### UAT Specialist
- Representa usuários finais nos testes
- Executa cenários de uso reais
- Valida acceptance criteria
- Coleta feedback de usuários reais
- Aprova ou reprova release para produção

### Release Manager
- Planeja releases e versionamento
- Coordena deploy e rollback
- Comunica mudanças para stakeholders
- Gerencia configuração de releases
- Documenta mudanças em release notes

### DevOps Engineer
- Configura pipelines de teste automatizado
- Gerencia ambientes de teste (QA, staging)
- Automatiza deploy de releases
- Configura monitoramento pós-deploy
- Suporta QA com infraestrutura de testes

---

## 9. DevSecOps / Segurança

### DevSecOps Engineer
- Integra segurança em todas as fases do SDLC
- Automatiza SAST, DAST, SCA no pipeline CI/CD
- Configura ferramentas de security scanning
- Gerencia segredos e credenciais (vault, rotation)
- Implementa security gates no pipeline

### Security Engineer
- Implementa controles de segurança (auth, encryption, headers)
- Configura CORS, rate limiting, CSP
- Implementa logging e auditoria de segurança
- Responde a incidentes de segurança
- Aplica patches e atualizações de segurança

### Security Analyst
- Analisa logs de segurança e eventos
- Investiga incidentes e anomalias
- Monitora ameaças e vulnerabilidades
- Reporta metrics de segurança
- Recomenda melhorias de postura de segurança

### Penetration Tester (Pentester)
- Executa testes de penetração manuais e automatizados
- Explora vulnerabilidades em profundidade
- Reporta findings com impacto e recomendações
- Valida correções de segurança
- Realiza red teaming e simulações de ataque

### Compliance Officer
- Garante conformidade com LGPD, GDPR e regulamentações
- Executa auditorias de segurança e compliance
- Documenta políticas e procedimentos de segurança
- Gerencia evidências de conformidade
- Reporta para órgãos reguladores (se aplicável)

### Risk Manager
- Gerencia riscos de segurança
- Quantifica impacto e probabilidade de ameaças
- Define planos de resposta a incidentes
- Mantém registro de riscos e mitigações
- Prioriza ações de segurança baseado em risco

### Security Architect
- Define arquitetura de segurança do sistema
- Estabelece padrões e princípios de segurança
- Define defesa em profundidade (defense in depth)
- Aprova design de segurança antes da implementação
- Define requisitos de segurança para contratos

### Application Security Engineer
- Foca em segurança de aplicações específicas
- Aplica OWASP Top 10 e secure coding practices
- Implementa SAST e correções de vulnerabilidades
- Valida segurança de APIs e endpoints
- Treina desenvolvedores em secure coding

---

## 10. Deploy e Infraestrutura

### DevOps Engineer
- Configura infraestrutura como código (Terraform, Ansible)
- Automatiza deploy em múltiplos ambientes
- Configura CI/CD pipelines end-to-end
- Gerencia containers e orquestração (Docker, K8s)
- Resolve problemas de infraestrutura e deploy

### Release Manager
- Planeja releases e versionamento semântico
- Coordena go-live e comunicação
- Executa rollback quando necessário
- Documenta mudanças e release notes
- Gerencia configuração de releases

### Site Reliability Engineer (SRE)
- Define SLOs, SLIs e error budgets
- Monitora produção com dashboards e alertas
- Resolve incidentes e post-mortems
- Otimiza confiabilidade e performance
- Automatiza operações repetitivas

### Cloud Engineer
- Gerencia infraestrutura cloud (AWS, Azure, GCP)
- Configura redes, storage, compute
- Otimiza custos e performance cloud
- Implementa alta disponibilidade e disaster recovery
- Gerencia identidades e acessos cloud

### Infrastructure Engineer
- Configura servidores físicos ou virtuais
- Gerencia redes, VPNs, firewalls
- Configura balanceadores de carga
- Implementa alta disponibilidade e failover
- Mantém inventário de infraestrutura

### Operations Manager
- Gerencia operações de produção
- Coordena suporte e escalonamento
- Define processos de incident response
- Gerencia fornecedores e SLAs
- Planeja capacity e crescimento

### Support Engineer
- Atende usuários finais e resolve incidentes
- Escala problemas para equipes apropriadas
- Documenta soluções e workarounds
- Coleta feedback de usuários
- Apoia treinamento de usuários

### Security Engineer
- Configura firewalls, WAF, DDoS protection
- Implementa TLS e certificados
- Configura security headers e CORS
- Monitora ameaças de segurança em produção
- Responde a incidentes de segurança

---

## 11. Documentação e Manutenção

### Technical Writer
- Escreve documentação técnica (API, guias, ADRs)
- Cria tutoriais e exemplos de uso
- Mantém docs atualizados com mudanças de código
- Cria conteúdo para onboarding de desenvolvedores
- Documenta decisões arquiteturais

### Documentation Specialist
- Organiza estrutura de documentação
- Mantém índices, glossários e referências cruzadas
- Versiona documentação junto com código
- Garante consistência de estilo e formato
- Gerencia ferramentas de documentação

### Maintenance Engineer
- Corrige bugs reportados em produção
- Aplica patches de segurança
- Otimiza performance e refatora código
- Gerencia dependências e atualizações
- Planeja melhorias incrementais

### Application Support Engineer
- Suporta usuários finais (tier 2/3)
- Resolve incidentes e problemas complexos
- Escala para engineering quando necessário
- Documenta soluções e workarounds
- Coleta feedback para melhorias

### Site Reliability Engineer (SRE)
- Monitora produção com métricas e traces
- Responde a incidentes e otimiza recovery
- Mantém SLOs e error budgets
- Automatiza respostas a incidentes
- Planeja capacity e scaling

### Product Owner
- Prioriza backlog de manutenção e novas features
- Define roadmap de evolução do produto
- Alinha manutenção com objetivos de negócio
- Aprova mudanças e releases
- Gerencia expectations de stakeholders

### QA Engineer
- Mantém suítes de teste automatizadas
- Valida correções e regressão
- Executa testes de smoke antes de releases
- Reporta qualidade e métricas de confiabilidade
- Garante que mudanças não quebram funcionalidades

### DevOps Engineer
- Mantém pipelines de CI/CD
- Automatiza deploys de correções
- Gerencia infraestrutura de produção
- Resolve problemas de deploy e infraestrutura
- Mantém monitoramento e alertas

---

## Profissionais Consolidados

**Total: 50 profissionais únicos** envolvidos no ciclo de vida completo.

### Por Categoria

**Gestão e Produto:**
1. Project Manager (PM)
2. Product Owner (PO)
3. Product Manager
4. Stakeholder / Sponsor
5. Scrum Master
6. Risk Manager
7. Business Analyst (BA)

**Arquitetura e Design:**
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

**Desenvolvimento:**
22. Full-Stack Developer
23. Backend Developer
24. Frontend Developer
25. Mobile Developer
26. Data Engineer

**Qualidade e Testes:**
27. QA Lead
28. QA Engineer
29. Test Automation Engineer
30. Performance Engineer
31. UAT Specialist

**Segurança:**
32. Security Engineer
33. Security Analyst
34. Penetration Tester (Pentester)
35. Compliance Officer
36. Application Security Engineer
37. DevSecOps Engineer

**Dados:**
38. Database Administrator (DBA)
39. Data Analyst

**Infraestrutura e Operações:**
40. DevOps Engineer
41. Release Manager
42. Site Reliability Engineer (SRE)
43. Cloud Engineer
44. Infrastructure Engineer
45. Operations Manager
46. Support Engineer

**Documentação e Manutenção:**
47. Technical Writer
48. Documentation Specialist
49. Maintenance Engineer
50. Application Support Engineer

---

## Referências

- `docs/fluxo-execucao-projetos.md` — Ordem de execução e workflow
- `BRIEFING-7-AGENTES.md` — Contexto e restrições do projeto
- `AGENTS.md` — Regras gerais do AgentMap

---

**Versão:** 1.0.0
**Data:** 2026-08-25
**Autor:** Equipe AgentMap
