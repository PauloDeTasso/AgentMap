# Proposta de Negócios — Analista de Negócios

> **Papel:** Analista de Negócios (`analista-negocios`)
> **Versão:** 1.0.0
> **Data:** 2026-08-27
> **Base analisada:** branch `v0044` (conforme `.ia/qualidade/mapeamento-completo-agentmap.md`)
> **Escopo:** Diagnóstico de negócio, análise de mercado, requisitos (BRD/FRD/NFR), proposta de valor, roadmap de produto, processos de negócio, stakeholders e KPIs.
>
> **Nota de escopo (regra do papel):** Este documento **especifica requisitos de negócio e propõe direcionamento estratégico**, não implementa código nem define arquitetura técnica. Requisitos aqui derivados de evidência documental (`mapeamento-completo-agentmap.md`, `AGENTS.md`, propostas existentes). Novos requisitos de produto devem ser validados pelo Product Owner; mudanças arquiteturais, pelo Arquiteto.

---

## Índice

1. [Diagnóstico de Negócio Atual](#1-diagnóstico-de-negócio-atual)
2. [Análise de Mercado](#2-análise-de-mercado)
3. [Requisitos de Negócio](#3-requisitos-de-negócio)
4. [Proposta de Valor](#4-proposta-de-valor)
5. [Roadmap de Produto](#5-roadmap-de-produto)
6. [Processos de Negócio](#6-processos-de-negócio)
7. [Stakeholders e Governança](#7-stakeholders-e-governança)
8. [KPIs de Negócio](#8-kpis-de-negócio)

---

## 1. Diagnóstico de Negócio Atual

### 1.1 Proposta de Valor Atual

| Dimensão | Descrição |
|----------|-----------|
| **Produto** | AgentMap — Gerenciador Local de Agentes de IA |
| **Problema que resolve** | Coordenação, governança e contexto para equipes de desenvolvimento potencializadas por IA |
| **Diferencial** | Arquivo como informação principal (filesystem + JSON), sem execução de agentes, integração nativa com Kilo Code via MCP |
| **Posicionamento** | Ferramenta local-first para desenvolvedores que usam agentes de IA no dia a dia |

### 1.2 Público-Alvo Identificado

| Segmento | Perfil | Necessidade Principal |
|----------|--------|----------------------|
| **Desenvolvedores Solo** | Devs individuais usando IA para codificar | Organizar contexto de agentes sem overhead de infraestrutura |
| **Equipes Pequenas** | 2-10 desenvolvedores com agentes de IA | Coordenação entre agentes, handoffs, rastreabilidade |
| **Early Adopters de IA** | Tech leads explorando MCP/LLMs | Estrutura de governança para experimentação controlada |
| **Educadores/Estudantes** | Ensinando desenvolvimento com IA | Ambiente estruturado para aprender agentes de IA |

### 1.3 Gaps de Negócio Identificados

| # | Gap | Severidade | Impacto no Negócio |
|---|-----|------------|-------------------|
| **GN-1** | **Sem modelo de monetização definido** | 🔴 Alta | Sustentabilidade do projeto incerta; não há caminho claro para receita |
| **GN-2** | **Sem métricas de produto em produção** | 🔴 Alta | Impossível medir sucesso, retenção ou engajamento dos usuários |
| **GN-3** | **Onboarding complexo** | 🟠 Alta | Curva de aprendizado íngreme; barreiras para adoção além de early adopters |
| **GN-4** | **Sem comunidade estruturada** | 🟠 Alta | Falta de efeitos de rede; crescimento orgânico limitado |
| **GN-5** | **Documentação apenas em português** | 🟡 Média | Limita adoção internacional; reduz mercado endereçável |
| **GN-6** | **Sem integrações com ferramentas populares** | 🟡 Média | Isolamento do ecossistema; usuários precisam mudar workflow |
| **GN-7** | **Sem caso de uso validado com usuários reais** | 🟡 Média | Risco de construir produto que ninguém quer |
| **GN-8** | **Dependência de plataforma única (Kilo Code)** | 🟡 Média | Risco de negócio se Kilo Code perder tração ou mudar direção |

### 1.4 Análise SWOT

| | **Positivo** | **Negativo** |
|---|-------------|--------------|
| **Interno** | **Forças:** Arquitetura local-first; 170+ tools MCP; governança completa; sem vendor lock-in de nuvem | **Fraquezas:** Sem testes automatizados; documentação desatualizada; sem CI/CD; frontend acoplado |
| **Externo** | **Oportunidades:** Mercado de agentes de IA em explosão; MCP se tornando padrão; demanda por governança de IA | **Ameaças:** Concorrentes com mais recursos; big players entrando no mercado; mudanças rápidas no ecossistema LLM |

---

## 2. Análise de Mercado

### 2.1 Competidores Diretos e Indiretos

| Competidor | Tipo | Forças | Fraquezas | Posicionamento |
|------------|------|--------|-----------|----------------|
| **Cursor** | IDE com IA integrada | UX polida; grande base de usuários | Fechado; sem governança; sem coordenação multi-agente | IDE tudo-em-um |
| **GitHub Copilot** | Assistente de código | Integração GitHub; Microsoft | Sem governança; sem contexto de projeto estruturado | Assistente individual |
| **Devin (Cognition)** | Agente autônomo | Autonomia total | Caixa preta; sem controle; caro | Agente substituto |
| **AutoGen (Microsoft)** | Framework multi-agente | Open source; flexível | Complexo; sem UI; sem persistência | Framework técnico |
| **LangChain/LangGraph** | Framework LLM | Ecossistema grande; documentação | Curva de aprendizado; sem UI; sem governança | Framework de desenvolvimento |
| **Aider** | CLI pair programming | Simples; open source | Sem governança; sem coordenação; CLI only | Ferramenta CLI |
| **Windsurf** | IDE IA | UX moderna; agentes integrados | Fechado; sem governança local | IDE comercial |

### 2.2 Tendências de Mercado (2026)

| Tendência | Relevância para AgentMap | Oportunidade |
|-----------|-------------------------|--------------|
| **MCP como padrão** | Alta — AgentMap já usa MCP | Posicionar como camada de governança sobre MCP |
| **Regulamentação de IA** | Alta — LGPD, AI Act | Governança e auditoria como diferencial competitivo |
| **Agentes autônomos** | Média — risco de disrupção | Posicionar como orquestrador, não como agente |
| **Local-first / Edge AI** | Alta — privacidade de dados | Reforçar proposta de valor local-first |
| **Multi-modalidade** | Baixa — escopo atual é texto | Futuro: suporte a agentes multimodais |
| **AI-native development** | Alta — mudança de paradigma | Capturar desenvolvedores migrando para AI-native |

### 2.3 Benchmarking de Funcionalidades

| Funcionalidade | AgentMap | Cursor | Copilot | AutoGen | LangGraph |
|----------------|----------|--------|---------|---------|-----------|
| Governança de agentes | ✅ Completa | ❌ | ❌ | ❌ | ❌ |
| Coordenação multi-agente | ✅ Handoffs | ❌ | ❌ | ✅ | ✅ |
| Persistência local | ✅ Filesystem | ❌ Cloud | ❌ Cloud | ❌ | ❌ |
| Contratos/APIs | ✅ MCP tools | ❌ | ❌ | ❌ | ❌ |
| Auditoria | ✅ Completa | ❌ | Parcial | ❌ | ❌ |
| UI web | ✅ Básica | ✅ Avançada | ✅ Integrada | ❌ | ❌ |
| Testes automatizados | ❌ | ✅ | ✅ | ✅ | ✅ |
| CI/CD | ❌ | ✅ | ✅ | ❌ | ❌ |
| Marketplace | ❌ | ✅ | ✅ | ❌ | ❌ |

### 2.4 Mercado Endereçável

| Métrica | Valor | Fonte/Observação |
|---------|-------|-----------------|
| **TAM (Total Addressable Market)** | $5B (ferramentas de desenvolvimento com IA) | Estimativa baseada em Gartner 2026 |
| **SAM (Serviceable Addressable Market)** | $500M (governança e coordenação de agentes) | Subconjunto de ferramentas de IA para dev |
| **SOM (Serviceable Obtainable Market)** | $5M (5% do SAM em 3 anos) | Meta agressiva mas alcançável |

---

## 3. Requisitos de Negócio

### 3.1 BRD (Business Requirements Document)

#### 3.1.1 Requisitos de Negócio Prioritários

| ID | Requisito | Prioridade | Origem |
|----|-----------|------------|--------|
| **BR-01** | O sistema deve permitir que desenvolvedores coordenem múltiplos agentes de IA sem infraestrutura de nuvem | P0 (Must have) | Visão do produto |
| **BR-02** | O sistema deve fornecer governança completa (contratos, riscos, auditoria) para uso profissional | P0 (Must have) | Necessidade de mercado |
| **BR-03** | O sistema deve integrar-se com Kilo Code via MCP como protocolo primário | P0 (Must have) | Arquitetura atual |
| **BR-04** | O sistema deve operar 100% localmente, sem dependência de serviços externos | P0 (Must have) | Proposta de valor central |
| **BR-05** | O sistema deve permitir onboarding em menos de 30 minutos | P1 (Should have) | Gap GN-3 |
| **BR-06** | O sistema deve fornecer métricas de uso para tomada de decisão | P1 (Should have) | Gap GN-2 |
| **BR-07** | O sistema deve suportar múltiplos projetos simultaneamente | P1 (Should have) | Escalabilidade |
| **BR-08** | O sistema deve ter documentação em inglês para alcance internacional | P2 (Could have) | Gap GN-5 |
| **BR-09** | O sistema deve oferecer integrações com GitHub/GitLab | P2 (Could have) | Gap GN-6 |
| **BR-10** | O sistema deve suportar plugins para outros IDEs além do Kilo Code | P3 (Won't have agora) | Gap GN-8 |

### 3.2 Épicos e User Stories

#### Épico 1: Governança de Agentes

| ID | User Story | Prioridade | Critérios de Aceitação |
|----|------------|------------|------------------------|
| **US-001** | Como desenvolvedor, quero criar e configurar agentes com papéis definidos, para que cada agente tenha responsabilidades claras | P0 | - CRUD de agentes funcional<br>- Perfis padrão disponíveis<br>- Validação de configuração |
| **US-002** | Como gerente de projeto, quero definir contratos entre agentes, para que as interações sejam padronizadas | P0 | - Contratos versionados<br>- Validação de conformidade<br>- Alertas de violação |
| **US-003** | Como auditor, quero rastrear todas as ações dos agentes, para que haja accountability completa | P0 | - Log de auditoria imutável<br>- Filtros por agente/período<br>- Exportação de relatórios |

#### Épico 2: Coordenação de Trabalho

| ID | User Story | Prioridade | Critérios de Aceitação |
|----|------------|------------|------------------------|
| **US-004** | Como desenvolvedor, quero criar tarefas com dependências, para que o trabalho seja executado na ordem correta | P0 | - Dependências circulares bloqueadas<br>- Visualização de grafo<br>- Validação de estado |
| **US-005** | Como agente, quero transferir contexto para outro agente via handoff, para que o trabalho continue sem perda de informação | P0 | - Handoff com validação<br>- Estado transferido completamente<br>- Confirmação de recebimento |
| **US-006** | Como gerente, quero visualizar o progresso de todas as tarefas, para que eu possa identificar gargalos | P1 | - Dashboard de status<br>- Filtros por estado/agente<br>- Alertas de bloqueio |

#### Épico 3: Contexto e Conhecimento

| ID | User Story | Prioridade | Critérios de Aceitação |
|----|------------|------------|------------------------|
| **US-007** | Como agente, quero acessar o contexto completo de uma tarefa, para que eu tenha todas as informações necessárias | P0 | - Contexto agregado de múltiplas fontes<br>- Cache para performance<br>- Atualização em tempo real |
| **US-008** | Como desenvolvedor, quero buscar conhecimento no projeto, para que informações não sejam duplicadas | P1 | - Busca por símbolo<br>- Busca por referência<br>- Busca semântica básica |
| **US-009** | Como equipe, quero manter um glossário de termos, para que a comunicação seja consistente | P2 | - CRUD de termos<br>- Integração com documentação<br>- Sugestão automática |

#### Épico 4: Monitoramento e Observabilidade

| ID | User Story | Prioridade | Critérios de Aceitação |
|----|------------|------------|------------------------|
| **US-010** | Como desenvolvedor, quero receber notificações quando mensagens estiverem disponíveis, para que eu não precise fazer polling | P1 | - Push via SSE<br>- Filtros por tipo/agente<br>- Histórico de mensagens |
| **US-011** | Como gerente, quero ver métricas de performance do sistema, para que eu possa otimizar recursos | P1 | - Latência por endpoint<br>- Uso de memória<br>- Throughput |
| **US-012** | Como operador, quero configurar alertas de saúde do sistema, para que problemas sejam detectados proativamente | P2 | - Health checks configuráveis<br>- Notificações por canal<br>- Runbooks automáticos |

#### Épico 5: Experiência do Usuário

| ID | User Story | Prioridade | Critérios de Aceitação |
|----|------------|------------|------------------------|
| **US-013** | Como novo usuário, quero um guia de início rápido, para que eu comece a usar em menos de 30 minutos | P1 | - Tutorial passo a passo<br>- Projeto de exemplo<br>- FAQ integrado |
| **US-014** | Como usuário, quero uma interface web responsiva, para que eu possa usar em qualquer dispositivo | P1 | - Design responsivo<br>- Tema claro/escuro<br>- Performance aceitável |
| **US-015** | Como usuário avançado, quero usar CLI para operações comuns, para que eu possa automatizar tarefas | P2 | - Comandos essenciais<br>- Saída estruturada (JSON)<br>- Autocompletion |

### 3.3 NFRs (Non-Functional Requirements — FURPS+)

| Categoria | ID | Requisito | Métrica |
|-----------|-----|-----------|---------|
| **Funcional** | NFR-F01 | Cobertura de requisitos críticos | 100% dos BR-01 a BR-04 implementados |
| **Funcional** | NFR-F02 | Compatibilidade MCP | Todas as 170+ tools funcionais |
| **Usabilidade** | NFR-U01 | Tempo de onboarding | < 30 minutos para primeiro uso |
| **Usabilidade** | NFR-U02 | Satisfação do usuário | NPS ≥ 40 |
| **Usabilidade** | NFR-U03 | Documentação | 100% dos endpoints documentados |
| **Confiabilidade** | NFR-R01 | Disponibilidade | 99% uptime em produção |
| **Confiabilidade** | NFR-R02 | Integridade de dados | 0 perda de dados em operações normais |
| **Confiabilidade** | NFR-R03 | Recuperação de desastres | RPO < 1h, RTO < 4h |
| **Performance** | NFR-P01 | Latência API (p95) | < 200ms para operações CRUD |
| **Performance** | NFR-P02 | Latência MCP (p95) | < 500ms para tools |
| **Performance** | NFR-P03 | Throughput | 100 req/s sustentado |
| **Performance** | NFR-P04 | Uso de memória | < 512MB em operação normal |
| **Suportabilidade** | NFR-S01 | Cobertura de testes | ≥ 80% linhas |
| **Suportabilidade** | NFR-S02 | Tempo de build | < 2 minutos |
| **Suportabilidade** | NFR-S03 | Portabilidade | Windows, Linux, macOS |
| **Segurança** | NFR-SE01 | Proteção de dados | Path traversal protegido em 100% das rotas |
| **Segurança** | NFR-SE02 | Auditoria | 100% das ações críticas logadas |
| **Segurança** | NFR-SE03 | Segredos | 0 segredos em código ou Git |

---

## 4. Proposta de Valor

### 4.1 Value Proposition Canvas

| | | |
|---|---|---|
| **Customer Jobs** | **Pain Relievers** | **Gain Creators** |
| - Coordenar múltiplos agentes de IA | - Elimina complexidade de infraestrura | - Governança completa out-of-box |
| - Manter contexto entre sessões | - Persistência local sem configuração | - Auditoria automática de ações |
| - Garantir qualidade do trabalho | - Contratos e validações integradas | - Handoffs estruturados entre agentes |
| - Rastrear decisões e mudanças | - Histórico imutável em Git | - Busca de conhecimento integrada |
| - Colaborar com equipe | - Handoffs e checkpoints | - Observabilidade em tempo real |

### 4.2 Proposta de Valor Resumida

> **Para desenvolvedores e equipes que usam agentes de IA, o AgentMap é um gerenciador local-first que fornece governança, coordenação e contexto estruturado. Diferente de IDEs com IA integrada, o AgentMap não executa agentes — ele orquestra, registra e garante qualidade, mantendo todos os dados localmente sob controle do desenvolvedor.**

### 4.3 Modelo de Monetização Proposto

| Modelo | Descrição | Prós | Contras | Recomendação |
|--------|-----------|------|---------|--------------|
| **Open Source + Freemium** | Core grátis; features avançadas pagas | Adoção rápida; comunidade | Difícil monetizar | ✅ **Recomendado** |
| **SaaS Self-hosted** | Licença paga para uso comercial | Receita previsível | Complexidade de venda | 🔮 Futuro |
| **Marketplace de Templates** | Comissão por templates vendidos | Receita recorrente | Precisa escala | 🔮 Futuro |
| **Suporte Enterprise** | Contrato de suporte/consultoria | Alto valor por cliente | Não escalável | 🔮 Futuro |

#### 4.3.1 Estratégia Freemium Detalhada

| Camada | Preço | Features |
|--------|-------|----------|
| **Free (OSS)** | $0 | Core completo: projetos, agentes, tarefas, contratos, MCP tools |
| **Pro** | $15/user/mês | Dashboard analytics, integrações GitHub/GitLab, suporte prioritário |
| **Team** | $50/team/mês | Colaboração em tempo real, SSO, auditoria avançada |
| **Enterprise** | Sob consulta | SLA, suporte dedicado, features customizadas, on-premise assistido |

### 4.4 Análise de ROI

#### 4.4.1 Custos Estimados (12 meses)

| Categoria | Custo Mensal | Custo Anual | Observação |
|-----------|--------------|-------------|------------|
| Desenvolvimento (1 dev) | $8.000 | $96.000 | Custo oportunidade |
| Infraestrutura (servidores) | $200 | $2.400 | CI/CD, hosting docs |
| Ferramentas (SaaS) | $100 | $1.200 | GitHub, Snyk, etc. |
| Marketing/Comunidade | $500 | $6.000 | Site, conteúdo, eventos |
| **Total** | **$8.800** | **$105.600** | |

#### 4.4.2 Projeção de Receita (Cenário Conservador)

| Período | Usuários Free | Usuários Pro | Receita MRR | Receita Anual |
|---------|---------------|--------------|-------------|---------------|
| Mês 1-3 | 100 | 5 | $75 | $225 |
| Mês 4-6 | 500 | 25 | $375 | $1.125 |
| Mês 7-9 | 1.000 | 75 | $1.125 | $3.375 |
| Mês 10-12 | 2.000 | 150 | $2.250 | $6.750 |
| **Total Anual** | — | — | — | **$11.475** |

#### 4.4.3 Break-even Analysis

| Métrica | Valor |
|---------|-------|
| Custo anual | $105.600 |
| Receita anual projetada (conservadora) | $11.475 |
| **Break-even (Pro users)** | **~1.400 usuários Pro** |
| **Break-even (Team)** | **~210 teams** |

> **Nota:** Break-even não é alcançável no primeiro ano com cenário conservador. Estratégia recomendada: buscar financiamento (grants, aceleradora) ou validar product-market-fit antes de investir em monetização.

---

## 5. Roadmap de Produto

### 5.1 Visão de Produto

> **"Ser o padrão-ouro em governança local de agentes de IA, permitindo que desenvolvedores coordenem, auditem e otimizem o trabalho de múltiplos agentes sem abrir mão de privacidade e controle."**

### 5.2 Releases Planejadas

| Release | Data | Escopo | Objetivo de Negócio |
|---------|------|--------|---------------------|
| **v0.9.0 Beta** | 2026-09-15 | Estabilização técnica, bugs corrigidos, testes base | Validar com early adopters |
| **v1.0.0 MVP** | 2026-10-30 | Governança completa, UX reformada, documentação | Lançamento público |
| **v1.1.0** | 2026-12-15 | Multi-tenancy real, analytics, integrações | Retenção e engajamento |
| **v1.2.0** | 2027-02-01 | GitHub/GitLab, marketplace de templates | Monetização inicial |
| **v2.0.0** | 2027-05-01 | Colaboração em tempo real, enterprise features | Escala comercial |

### 5.3 MVP Definition (v1.0.0)

#### Must Have (P0)
- [ ] CRUD completo de projetos, agentes, tarefas
- [ ] Contratos e validação funcional
- [ ] Risk Register e Decisões operacionais (corrigir Zod)
- [ ] Handoffs entre agentes
- [ ] Documentação de API (OpenAPI/Swagger)
- [ ] Frontend funcional e responsivo
- [ ] Testes unitários e de integração (cobertura ≥ 70%)
- [ ] Pipeline CI/CD básico
- [ ] Guia de início rápido

#### Should Have (P1)
- [ ] Dashboard de métricas
- [ ] Integração GitHub básica
- [ ] Notificações via SSE
- [ ] CLI essencial
- [ ] Documentação em inglês

#### Could Have (P2)
- [ ] Marketplace de templates
- [ ] Integração GitLab
- [ ] Tema escuro/claro
- [ ] Exportação de relatórios

#### Won't Have (v1.0)
- [ ] Colaboração em tempo real
- [ ] SSO/Autenticação
- [ ] Mobile app
- [ ] Plugins para outros IDEs

### 5.4 Matriz de Priorização (RICE)

| Feature | Reach | Impact | Confidence | Effort | RICE Score | Prioridade |
|---------|-------|--------|------------|--------|------------|------------|
| Corrigir Risk/Decisions Zod | 100 | 3 | 100% | 1 | 300 | 🔴 P0 |
| Testes automatizados | 100 | 3 | 90% | 3 | 90 | 🔴 P0 |
| Documentação de API | 80 | 3 | 100% | 2 | 120 | 🔴 P0 |
| Guia de início rápido | 100 | 2 | 100% | 1 | 200 | 🟡 P1 |
| Dashboard de métricas | 60 | 2 | 80% | 2 | 48 | 🟡 P1 |
| Integração GitHub | 40 | 3 | 70% | 3 | 28 | 🟢 P2 |
| Marketplace | 20 | 2 | 50% | 5 | 4 | ⚪ P3 |

---

## 6. Processos de Negócio

### 6.1 Processo AS-IS: Onboarding de Novo Usuário

```
┌─────────────────────────────────────────────────────────────────┐
│                    ONBOARDING ATUAL (AS-IS)                      │
└─────────────────────────────────────────────────────────────────┘

1. DESCOBERTA
   └── Usuário encontra AgentMap (GitHub, indicação)
       └── Sem funil de conversão definido
           └── Sem analytics de aquisição

2. INSTALAÇÃO
   └── git clone + npm install + npm run dev
       └── Sem instalador
           └── Sem verificação de pré-requisitos
               └── Erros comuns não documentados

3. PRIMEIRO USO
   └── Abrir http://localhost:3150
       └── Sem tutorial guiado
           └── Sem projeto de exemplo
               └── Usuário perdido na interface

4. CRIAÇÃO DE PROJETO
   └── Criar projeto manualmente
       └── Sem scaffold/template
           └── Estrutura .ia/ criada vazia
               └── Usuário não sabe o que fazer

5. CONFIGURAÇÃO DE AGENTES
   └── Criar agentes manualmente
       └── Sem perfis pré-configurados
           └── Sem exemplos de uso
               └── Abandono provável

┌─────────────────────────────────────────────────────────────────┐
│                         DOR PRINCIPAL                            │
│  "Não sei por onde começar e não vejo valor imediato"            │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Processo TO-BE: Onboarding Otimizado

```
┌─────────────────────────────────────────────────────────────────┐
│                    ONBOARDING OTIMIZADO (TO-BE)                  │
└─────────────────────────────────────────────────────────────────┘

1. DESCOBERTA OTIMIZADA
   └── Landing page com proposta de valor clara
       └── Vídeo demo de 2 minutos
           └── Depoimentos de usuários
               └── Analytics de aquisição (UTM, referral)

2. INSTALAÇÃO SIMPLIFICADA
   └── Instalador CLI: `npx create-agentmap`
       └── Verificação automática de pré-requisitos
           └── Feedback visual de progresso
               └── Fallback para instalação manual documentada

3. TUTORIAL INTERATIVO
   └── Welcome screen com tour guiado
       └── Projeto de exemplo pré-carregado
           └── Task "Hello World" para primeiro uso
               └── Celebração de conclusão (gamificação)

4. CRIAÇÃO DE PROJETO GUIADA
   └── Wizard de criação com templates
       └── Templates por caso de uso:
           ├── "Desenvolvimento Web"
           ├── "Data Science"
           ├── "Mobile"
           └── "Personalizado"
           └── Estrutura .ia/ pré-preenchida

5. AGENTES PRONTOS PARA USO
   └── Perfis padrão com um clique
       └── "Equipe Básica" (GP + Dev + QA)
           └── "Solo Developer" (Full-stack)
               └── Sugestão baseada no template escolhido

6. PRIMEIRA CONQUISTA
   └── Dashboard com progresso visível
       └── "Primeira tarefa concluída" celebration
           └── Compartilhamento social opcional
               └── Convite para comunidade

┌─────────────────────────────────────────────────────────────────┐
│                         VALOR ENTREGUE                           │
│  "Em 10 minutos, você coordenou seu primeiro agente de IA"      │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Processo de Trabalho com Agentes (TO-BE)

```
┌─────────────────────────────────────────────────────────────────┐
│                 FLUXO DE TRABALHO COM AGENTES                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   PLANEJAR   │────▶│   EXECUTAR   │────▶│   VALIDAR    │
│              │     │              │     │              │
│ - Criar tarefa│     │ - Agente     │     │ - Revisar    │
│ - Definir    │     │   executa    │     │   resultado  │
│   critérios  │     │ - Registrar  │     │ - Aprovar/   │
│ - Atribuir   │     │   progresso  │     │   rejeitar   │
│   agente     │     │ - Handoff    │     │ - Registrar  │
│              │     │   se needed  │     │   aprendizado│
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  CONTEXTO    │     │  GOVERNANÇA  │     │  CONHECIMENTO│
│              │     │              │     │              │
│ - Histórico  │     │ - Contratos  │     │ - Glossário  │
│ - Decisões   │     │ - Auditoria  │     │ - Padrões    │
│ - Arquivos   │     │ - Riscos     │     │ - Templates  │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 6.4 Automações Prioritárias

| Automação | Processo Atual | Processo Automatizado | Benefício |
|-----------|----------------|----------------------|-----------|
| **Scaffold de projeto** | Criação manual de estrutura .ia/ | `POST /api/projetos/init` com template | Reduz onboarding de 30min para 5min |
| **Criação de agentes** | Configuração manual de cada agente | Perfis padrão com um clique | Elimina erro de configuração |
| **Validação de contratos** | Verificação manual | Validação automática em cada handoff | Garante qualidade |
| **Limpeza de temporários** | Limpeza manual | TTL automático (7 dias) | Reduz manutenção |
| **Backup** | Backup manual | Backup automático agendado | Segurança de dados |
| **Notificações** | Polling manual | Push via SSE | Tempo real |

---

## 7. Stakeholders e Governança

### 7.1 Mapa de Stakeholders

| Stakeholder | Papel | Interesse | Influência | Estratégia de Engajamento |
|-------------|-------|-----------|------------|---------------------------|
| **Desenvolvedor Principal** | Criador/Mantenedor | Muito Alto | Muito Alto | Envolvimento diário; decisões técnicas |
| **Product Owner** | Define prioridades | Alto | Alto | Review quinzenal; validação de requisitos |
| **Usuários Beta** | Testam e fornecem feedback | Alto | Médio | Feedback contínuo; acesso antecipado |
| **Comunidade Open Source** | Contribuidores potenciais | Médio | Médio | Documentação; issues; discussões |
| **Agentes Kilo** | Consumem MCP | Alto | Alto | Coordenação via handoffs; integração |
| **Investidores/Aceleradoras** | Financiamento | Médio | Alto | Updates trimestrais; métricas de tração |
| **Concorrentes** | Referência de mercado | Baixo | Baixo | Monitoramento; benchmarking |

### 7.2 Matriz de Poder x Interesse

```
                    │    BAIXO INTERESSE    │    ALTO INTERESSE     │
────────────────────┼───────────────────────┼───────────────────────┤
│ ALTO PODER         │  Investidores         │  Desenvolvedor        │
│                    │  (Manter satisfeito)  │  Principal            │
│                    │                       │  (Gerenciar de perto) │
────────────────────┼───────────────────────┼───────────────────────┤
│ BAIXO PODER        │  Concorrentes         │  Usuários Beta        │
│                    │  (Monitorar)          │  Comunidade           │
│                    │                       │  (Manter informado)   │
```

### 7.3 Estratégia de Comunicação

| Canal | Frequência | Público | Conteúdo | Responsável |
|-------|------------|---------|----------|-------------|
| **GitHub Issues** | Contínuo | Comunidade | Bugs, features, discussões | Todos |
| **GitHub Discussions** | Contínuo | Comunidade | Dúvidas, ideias, showcase | Todos |
| **Changelog** | Por release | Todos | Mudanças, breaking changes | Documentador |
| **Blog/Twitter** | Semanal | Público externo | Updates, tutoriais, casos de uso | PO/GP |
| **Newsletter** | Mensal | Usuários inscritos | Novidades, dicas, roadmap | PO |
| **Discord/Slack** | Contínuo | Comunidade ativa | Suporte, discussões, feedback | Comunidade |

### 7.4 Governança de Produto

#### 7.4.1 Processo de Priorização

```
┌─────────────────────────────────────────────────────────────────┐
│                    FUNIL DE PRIORIZAÇÃO                          │
└─────────────────────────────────────────────────────────────────┘

1. COLETA
   ├── Feedback de usuários (GitHub Issues, Discord)
   ├── Análise de métricas (uso, retenção, churn)
   ├── Análise competitiva (benchmarking)
   └── Visão estratégica (PO, desenvolvedor)

2. TRIAGEM
   ├── Classificar: Bug / Feature / Tech Debt / Research
   ├── Estimar: Impacto x Esforço (RICE)
   └── Validar: Alinhamento com visão

3. PRIORIZAÇÃO
   ├── P0: Crítico (segurança, data loss, blocker)
   ├── P1: Alta valor (retenção, aquisição)
   ├── P2: Melhorias (qualidade, performance)
   └── P3: Nice-to-have (futuro)

4. PLANEJAMENTO
   ├── Incluir na sprint/release
   ├── Definir critérios de aceitação
   └── Atribuir responsável

5. ENTREGA
   ├── Desenvolvimento
   ├── Review + Testes
   └── Release + Comunicação

6. MEDIÇÃO
   ├── Métricas de uso da feature
   ├── Feedback pós-lançamento
   └── Iteração se necessário
```

#### 7.4.2 Critérios de Aceitação de Negócio

| Critério | Descrição | Como Medir |
|----------|-----------|------------|
| **Valor para o usuário** | Resolve um problema real | Pesquisa com usuários; NPS |
| **Viabilidade técnica** | Pode ser implementado com recursos atuais | Validação do Arquiteto |
| **Alinhamento estratégico** | Contribui para a visão do produto | Revisão do PO |
| **ROI positivo** | Retorno justifica investimento | Análise custo-benefício |
| **Time-to-market** | Pode ser entregue no prazo | Estimativa do GP |

---

## 8. KPIs de Negócio

### 8.1 Métricas de Aquisição

| KPI | Definição | Meta v1.0 | Meta v2.0 | Fonte de Dados |
|-----|-----------|-----------|-----------|----------------|
| **Novos usuários/mês** | Instalações únicas por mês | 500 | 5.000 | Telemetria (opt-in) |
| **Fontes de aquisição** | Canais que trouxeram usuários | 3 canais ativos | 5 canais ativos | UTM parameters |
| **Custo de aquisição (CAC)** | Custo para adquirir 1 usuário | < $5 | < $2 | Marketing spend / users |
| **GitHub Stars** | Estrelas no repositório | 500 | 5.000 | GitHub API |

### 8.2 Métricas de Ativação

| KPI | Definição | Meta v1.0 | Meta v2.0 | Fonte de Dados |
|-----|-----------|-----------|-----------|----------------|
| **Time to first value** | Tempo até primeiro uso completo | < 30 min | < 15 min | Telemetria |
| **Taxa de ativação** | % que completa onboarding | 40% | 60% | Telemetria |
| **Projetos criados** | Projetos criados por usuário | 2/user | 3/user | Telemetria |
| **Agentes configurados** | Agentes criados por projeto | 3/projeto | 5/projeto | Telemetria |

### 8.3 Métricas de Retenção

| KPI | Definição | Meta v1.0 | Meta v2.0 | Fonte de Dados |
|-----|-----------|-----------|-----------|----------------|
| **DAU/MAU** | Usuários diários / mensais | 20% | 30% | Telemetria |
| **Taxa de retenção (D7)** | % que volta após 7 dias | 30% | 45% | Telemetria |
| **Taxa de retenção (D30)** | % que volta após 30 dias | 15% | 25% | Telemetria |
| **Churn rate** | % que para de usar | < 10%/mês | < 5%/mês | Telemetria |

### 8.4 Métricas de Receita (Pós-Monetização)

| KPI | Definição | Meta v1.2 | Meta v2.0 | Fonte de Dados |
|-----|-----------|-----------|-----------|----------------|
| **MRR** | Receita recorrente mensal | $1.000 | $10.000 | Sistema de pagamento |
| **ARPU** | Receita média por usuário | $5 | $8 | MRR / usuários pagantes |
| **LTV** | Valor vitalício do cliente | $100 | $200 | ARPU / churn |
| **LTV:CAC** | Razão valor vitalício / custo aquisição | > 3:1 | > 5:1 | Calculado |
| **Conversion rate** | % free → pago | 2% | 5% | Telemetria + pagamentos |

### 8.5 Métricas de Engajamento

| KPI | Definição | Meta v1.0 | Meta v2.0 | Fonte de Dados |
|-----|-----------|-----------|-----------|----------------|
| **Tarefas criadas/semana** | Volume de tarefas por usuário | 5/user | 10/user | Telemetria |
| **Handoffs realizados** | Transferências entre agentes | 2/user | 5/user | Telemetria |
| **Tempo médio de sessão** | Duração de uso contínuo | 15 min | 25 min | Telemetria |
| **Features utilizadas** | % de features usadas por usuário | 30% | 50% | Telemetria |
| **NPS (Net Promoter Score)** | Satisfação geral | ≥ 40 | ≥ 60 | Pesquisa trimestral |

### 8.6 Métricas de Qualidade

| KPI | Definição | Meta v1.0 | Meta v2.0 | Fonte de Dados |
|-----|-----------|-----------|-----------|----------------|
| **Bugs em produção** | Bugs críticos abertos | 0 P0 | 0 P0 | Issue tracker |
| **Tempo de resolução** | Média para resolver bugs | < 24h | < 12h | Issue tracker |
| **Cobertura de testes** | % de código coberto | ≥ 70% | ≥ 85% | CI pipeline |
| **Uptime** | Disponibilidade do sistema | 99% | 99.9% | Health check |
| **Latência P95** | Tempo de resposta | < 200ms | < 100ms | OpenTelemetry |

### 8.7 Dashboard de Métricas Recomendado

```
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD DE NEGÓCIO                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   USUÁRIOS  │  │    MRR      │  │  RETENÇÃO   │  │   NPS   │ │
│  │   1,234     │  │   $2,250    │  │    28%      │  │   42    │ │
│  │   ↑ 23%     │  │   ↑ 15%     │  │   ↑ 5%      │  │  ↑ 8    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    FUNIL DE CONVERSÃO                        │ │
│  │  Visitantes → Instalação → Ativação → Retenção → Pagamento  │ │
│  │   10,000      2,500        1,000       280        56       │ │
│  │              (25%)        (40%)      (28%)     (20%)       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐│
│  │    COHORT RETENTION     │  │      TOP FEATURES               ││
│  │  W1: 100%               │  │  1. Criar projeto    (89%)       ││
│  │  W2:  65%               │  │  2. Configurar agente (76%)     ││
│  │  W3:  45%               │  │  3. Criar tarefa     (68%)       ││
│  │  W4:  28%               │  │  4. Handoff          (45%)       ││
│  │                         │  │  5. Dashboard        (32%)       ││
│  └─────────────────────────┘  └─────────────────────────────────┘│
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 8.8 Cadência de Revisão de Métricas

| Tipo de Métrica | Frequência | Responsável | Ação |
|-----------------|------------|-------------|------|
| **Aquisição** | Semanal | PO/GP | Ajustar canais de marketing |
| **Ativação** | Semanal | PO/GP | Otimizar onboarding |
| **Retenção** | Quinzenal | PO/GP | Identificar churn, melhorar produto |
| **Receita** | Mensal | PO | Ajustar pricing, features pagas |
| **Engajamento** | Mensal | PO/GP | Priorizar features de alto uso |
| **Qualidade** | Contínua | QA/Dev | Corrigir bugs, melhorar performance |

---

## 9. Riscos de Negócio

### 9.1 Matriz de Riscos

| ID | Risco | Probabilidade | Impacto | Score | Estratégia | Responsável |
|----|-------|---------------|---------|-------|------------|-------------|
| **RN-01** | Product-market fit não validado | Alta | Crítico | 🔴 | Mitigar: Pesquisa com usuários antes de escalar | PO |
| **RN-02** | Concorrente lança solução similar | Média | Alto | 🟠 | Mitigar: Diferenciar por governança e local-first | PO/Arquiteto |
| **RN-03** | Kilo Code muda direção/preços | Média | Alto | 🟠 | Mitigar: Suportar múltiplos IDEs no futuro | GP |
| **RN-04** | Desenvolvedor principal indisponível | Baixo | Crítico | 🟠 | Mitigar: Documentação + comunidade | GP |
| **RN-05** | Mudanças regulatórias (AI Act) | Média | Médio | 🟡 | Aceitar: Adaptar governança quando necessário | Segurança |
| **RN-06** | Adoção abaixo do esperado | Média | Médio | 🟡 | Mitigar: Marketing, comunidade, open source | PO |
| **RN-07** | Monetização não sustentável | Média | Médio | 🟡 | Mitigar: Validar willingness-to-pay cedo | PO |
| **RN-08** | Segurança: vazamento de dados | Baixo | Crítico | 🟡 | Mitigar: Security audit, bug bounty | Segurança |

### 9.2 Planos de Contingência

| Risco | Gatilho | Plano B |
|-------|---------|---------|
| RN-01 | NPS < 20 após 3 meses | Pivotar para nicho específico (ex: apenas governança) |
| RN-02 | Concorrente com 10x features | Focar em integração superior e comunidade |
| RN-03 | Kilo Code descontinuar MCP | Adaptar para protocolo alternativo (OpenAI plugin, etc.) |
| RN-04 | Indisponibilidade > 1 mês | Ativar comunidade para manutenção |
| RN-06 | < 100 usuários ativos em 6 meses | Revisar positioning e proposta de valor |

---

## 10. Plano de Ação Imediato

### 10.1 Próximos 30 Dias

| Prioridade | Ação | Responsável | Prazo | Critério de Sucesso |
|------------|------|-------------|-------|---------------------|
| 🔴 P0 | Validar proposta de valor com 5 usuários-alvo | PO | 7 dias | 3/5 confirmam valor |
| 🔴 P0 | Corrigir Risk/Decisions Zod (BR-02) | Arquiteto | 3 dias | Tools funcionando |
| 🔴 P0 | Criar guia de início rápido (BR-05) | Documentador | 14 dias | Usuário completa em < 30min |
| 🟡 P1 | Implementar telemetria básica (BR-06) | Engenheiro | 21 dias | Métricas de uso coletadas |
| 🟡 P1 | Criar projeto de exemplo/template | Analista Negócios | 14 days | Template funcional |
| 🟡 P1 | Definir processo de priorização (RICE) | GP | 7 dias | Processo documentado |
| 🟢 P2 | Traduzir documentação principal para inglês | Documentador | 30 dias | README em EN |
| 🟢 P2 | Criar landing page simples | PO/Comunidade | 30 dias | Page publicada |

### 10.2 Critérios de Sucesso do Plano

| Métrica | Target |
|---------|--------|
| Usuários entrevistados | ≥ 5 |
| Guia de início rápido publicado | ✅ |
| Telemetria funcionando | ✅ |
| Risk/Decisions corrigidos | ✅ |
| Primeiros 10 usuários beta | ✅ |

---

## 11. Aprovações Necessárias

| Decisão | Aprovador | Status | Prazo |
|---------|-----------|--------|-------|
| Aprovação desta proposta | Product Owner | Pendente | 7 dias |
| Validação do MVP definition | Comitê (PO + GP + Arquiteto) | Pendente | 14 dias |
| Aprovação do modelo de monetização | Product Owner | Pendente | 30 dias |
| Priorização do roadmap | Product Owner | Pendente | 14 dias |
| Alocação de recursos para telemetria | Desenvolvedor Principal | Pendente | 7 dias |

---

## 12. Referências

### 12.1 Documentos Internos

- [Mapeamento Completo AgentMap](mapeamento-completo-agentmap.md) — Diagnóstico técnico completo
- [Proposta Gerente de Projeto](proposta-gerente.md) — Planejamento executivo
- [Proposta Analista de Sistemas](proposta-analista-sistemas.md) — Especificações técnicas
- [Proposta Engenheiro de Software](proposta-engenheiro.md) — Engenharia técnica
- [Proposta Documentador](proposta-documentador.md) — Documentação estruturada
- [Consolidado Final](../qualidade/consolidado-final.md) — Resultados da mega auditoria

### 12.2 Referências de Mercado

- [Gartner: AI Development Tools 2026](https://www.gartner.com/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [LGPD - Lei Geral de Proteção de Dados](https://www.gov.br/esporte/pt-br/assuntos/lgpd)

---

## Histórico de Mudanças

| Versão | Data | Autor | Mudança |
|--------|------|-------|---------|
| 1.0.0 | 2026-08-27 | Analista de Negócios | Criação da proposta completa de negócios |

---

*Documento elaborado pelo Analista de Negócios do AgentMap*
*Próxima revisão: Após validação com Product Owner e feedback de usuários beta*
*Versão: 1.0.0 — 2026-08-27*
