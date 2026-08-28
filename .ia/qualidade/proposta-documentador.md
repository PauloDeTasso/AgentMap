# Proposta de Documentação — Documentador Técnico

> **Versão:** 1.0.0
> **Data:** 2026-08-27
> **Autor:** Documentador Técnico (AgentMap)
> **Branch:** v0044
> **Status:** Proposta para revisão e aprovação

---

## Sumário

1. [Diagnóstico de Documentação Atual](#1-diagnóstico-de-documentação-atual)
2. [Estrutura de Documentação Proposta](#2-estrutura-de-documentação-proposta)
3. [Documentos Obrigatórios](#3-documentos-obrigatórios)
4. [Templates de Documentação](#4-templates-de-documentação)
5. [Estratégia de Documentação](#5-estratégia-de-documentação)
6. [Glossário e Terminologia](#6-glossário-e-terminologia)
7. [Processo de Revisão](#7-processo-de-revisão)
8. [Ferramentas e Automação](#8-ferramentas-e-automação)

---

## 1. Diagnóstico de Documentação Atual

### 1.1 Pontos Fortes

| # | Ponto Forte | Evidência |
|---|-------------|-----------|
| 1 | **README.md abrangente** | 1300+ linhas cobrindo visão geral, arquitetura, MCP, agentes, API, segurança, instalação |
| 2 | **API REST documentada** | `docs/api-reference.md` com ~801 linhas cobrindo todos os endpoints |
| 3 | **Arquitetura MCP documentada** | `docs/arquitetura-mcp.md` com estrutura completa do servidor MCP |
| 4 | **Referência de tools MCP** | `docs/referencia-tools-mcp.md` com ~169 tools catalogadas |
| 5 | **Guia de comunicação** | `docs/kilo-code-docs/comunicacao-agentmap-kilo.md` documenta protocolo HTTP/MCP |
| 6 | **Perfis profissionais** | `.ia/procedimentos/perfis-fase1-consolidado.md` com 8 papéis detalhados |
| 7 | **Guia inicial de agentes** | `.ia/docs/GUIA_INICIAL_AGENTES.md` com 668 linhas de instruções |
| 8 | **JSON Schemas** | 27 schemas de validação em `esquemas/` |
| 9 | **Segurança documentada** | `SECURITY.md` com princípios claros |
| 10 | **Fluxo de trabalho definido** | `.ia/fluxo-trabalho.md` com 11 fases obrigatórias |

### 1.2 Gaps de Informação

| # | Gap | Severidade | Impacto |
|---|-----|------------|---------|
| 1 | **Sem ADRs (Architecture Decision Records)** | Alta | Decisões arquiteturais não são rastreáveis |
| 2 | **Sem glossário padronizado** | Média | Terminologia inconsistente entre documentos |
| 3 | **Sem guia de contribuição (CONTRIBUTING.md)** | Alta | Novos desenvolvedores não sabem como contribuir |
| 4 | **Sem guia de deployment** | Alta | Falta instruções de produção |
| 5 | **Sem CHANGELOG.md** | Média | Histórico de mudanças não é rastreável |
| 6 | **Sem templates padronizados** | Média | Documentos criados sem consistência |
| 7 | **Sem guia de estilo de código** | Média | Inconsistência em contribuições |
| 8 | **Sem runbook de operações** | Alta | Falta procedimentos de incidentes |
| 9 | **Documentação de testes insuficiente** | Média | Sem cobertura de estratégia de testes |
| 10 | **Sem política de versionamento documental** | Baixa | Versões de docs não acompanham código |

### 1.3 Documentação Desatualizada

| # | Documento | Problema | Ação Necessária |
|---|-----------|----------|-----------------|
| 1 | `.ia/docs/ROADMAP.md` | Branch v0037 mencionada, atual é v0044 | Atualizar para v0044 |
| 2 | `README.md` (linha 1235) | "169 tools" — número pode estar desatualizado | Verificar e atualizar |
| 3 | `docs/plano-final-implementacao.md` | Referencia v0021 como base | Verificar alinhamento com v0044 |
| 4 | `.ia/docs/GUIA_INICIAL_AGENTES.md` | Estrutura de pastas pode não refletir estado atual | Revisar e atualizar |
| 5 | `docs/relatorio-consolidado-tools.md` | Data não verificada | Atualizar timestamp |

### 1.4 Falta de Estrutura

| # | Problema | Local | Solução Proposta |
|---|----------|-------|------------------|
| 1 | Documentos espalhados em múltiplas pastas | `docs/`, `.ia/docs/`, `PLANO GERAL/`, `documentos/` | Consolidar em `docs/` |
| 2 | Sem índice mestre de documentação | — | Criar `docs/INDEX.md` |
| 3 | Sem padrão de nomenclatura | Varia entre kebab-case e snake-case | Definir convenção |
| 4 | Sem versionamento de documentos | — | Adotar versionamento semântico |
| 5 | Sem ownership de documentos | — | Definir responsáveis por área |

### 1.5 Problemas de Acessibilidade

| # | Problema | Impacto | Solução |
|---|----------|---------|---------|
| 1 | Documentação apenas em português | Limita adoção internacional | Considerar versão EN no futuro |
| 2 | Sem busca textual unificada | Difícil encontrar informações | Adicionar `docs/INDEX.md` com busca |
| 3 | Sem navegação cruzada entre docs | Links internos inconsistentes | Padronizar links relativos |
| 4 | Mermaid diagrams sem texto alternativo | Acessibilidade reduzida | Adicionar descrição textual |
| 5 | Sem sumário automático em documentos longos | Navegação difícil | Adicionar TOC em docs > 100 linhas |

---

## 2. Estrutura de Documentação Proposta

### 2.1 Organização de Pastas

```
AgentMap/
├── README.md                          # Entrada principal
├── CHANGELOG.md                       # Histórico de mudanças
├── CONTRIBUTING.md                    # Guia de contribuição
├── SECURITY.md                        # Política de segurança
├── LICENSE                            # Licença MIT
│
├── docs/
│   ├── INDEX.md                       # Índice mestre de documentação
│   ├── GLOSSARIO.md                   # Glossário de termos
│   ├── guias/                         # Guias operacionais
│   │   ├── guia-inicio-rapido.md      # Quick start
│   │   ├── guia-agentes.md            # Guia de agentes
│   │   ├── guia-projetos.md           # Guia de projetos
│   │   ├── guia-monitoramento.md      # Guia de monitoramento
│   │   └── guia-troubleshooting.md    # Resolução de problemas
│   │
│   ├── referencia/                    # Referências técnicas
│   │   ├── api-reference.md           # Referência da API REST
│   │   ├── referencia-tools-mcp.md    # Referência de tools MCP
│   │   ├── arquitetura-mcp.md         # Arquitetura MCP
│   │   └── schemas-json.md            # Documentação dos schemas
│   │
│   ├── arquitetura/                   # Documentação arquitetural
│   │   ├── visao-geral.md             # Visão geral da arquitetura
│   │   ├── decisoes/                  # ADRs (Architecture Decision Records)
│   │   │   ├── ADR-0001-arquitectura-fs-json.md
│   │   │   ├── ADR-0002-protocolo-mcp.md
│   │   │   ├── ADR-0003-sem-banco-relacional.md
│   │   │   └── ...
│   │   └── diagramas/                 # Diagramas de arquitetura
│   │       ├── fluxo-agentes.mmd
│   │       ├── fluxo-projeto.mmd
│   │       └── ...
│   │
│   ├── operacao/                      # Documentação operacional
│   │   ├── runbook.md                 # Procedimentos de incidentes
│   │   ├── deployment.md              # Guia de deployment
│   │   ├── backup-restore.md          # Backup e recuperação
│   │   └── monitoring.md              # Monitoramento e alertas
│   │
│   ├── templates/                     # Templates padronizados
│   │   ├── template-adr.md
│   │   ├── template-user-story.md
│   │   ├── template-especificacao.md
│   │   ├── template-plano-teste.md
│   │   ├── template-release-notes.md
│   │   └── template-runbook.md
│   │
│   ├── desenvolvimento/               # Guias de desenvolvimento
│   │   ├── guia-desenvolvedor.md      # Onboarding de devs
│   │   ├── padroes-codigo.md          # Padrões de código
│   │   ├── padroes-commit.md          # Convenção de commits
│   │   ├── test-strategy.md           # Estratégia de testes
│   │   └── ci-cd.md                   # Pipeline CI/CD
│   │
│   └── imagens/                       # Recursos visuais
│       ├── fluxo-plugin-wakeup.png
│       ├── fluxo-plugin-wakeup.mmd
│       └── ...
│
├── .ia/                               # Dados operacionais do projeto
│   ├── docs/                          # Docs internos de agentes
│   │   ├── GUIA_INICIAL_AGENTES.md
│   │   ├── ROADMAP.md
│   │   └── guias/
│   ├── procedimentos/                 # Procedimentos de papéis
│   │   ├── perfis-fase1-consolidado.md
│   │   ├── comunicacao-kilo.md
│   │   └── lista-completa-agentes.md
│   └── fluxo-trabalho.md              # Fluxo obrigatório
│
├── PLANO GERAL/                       # Planejamento estratégico
│   ├── arquivo/
│   │   ├── GERENCIADOR_LOCAL_DE_AGENTES_DE_IA-ESPECIFICACAO_DE_IMPLEMENTACAO.md
│   │   ├── MODELOS JSON DO GERENCIADOR LOCAL DE PROJETOS PARA AGENTES.md
│   │   └── ...
│   └── UPDATE/                        # Projetos de melhoria
│
└── esquemas/                          # JSON Schemas de validação
    ├── agente-perfil.schema.json
    ├── tarefa.schema.json
    └── ...
```

### 2.2 Convenções de Nomenclatura

| Tipo de Documento | Convenção | Exemplo |
|-------------------|-----------|---------|
| Guias | `guia-<topico>.md` | `guia-agentes.md` |
| Referências | `referencia-<topico>.md` ou `<topico>-reference.md` | `api-reference.md` |
| ADRs | `ADR-<numero>-<titulo>.md` | `ADR-0001-arquitectura-fs-json.md` |
| Templates | `template-<tipo>.md` | `template-adr.md` |
| Runbooks | `runbook-<sistema>.md` | `runbook-agentmap.md` |
| Diagramas | `<contexto>-<tipo>.mmd` | `fluxo-agentes.mmd` |

### 2.3 Templates Padronizados

Todos os documentos devem seguir estrutura mínima:

```markdown
# <Título do Documento>

> **Versão:** X.Y.Z
> **Data:** YYYY-MM-DD
> **Autor:** <Nome/Papel>
> **Status:** Rascunho | Em Revisão | Aprovado | Obsoleto

---

## Sumário

1. [Seção 1](#1-seção-1)
2. [Seção 2](#2-seção-2)

---

## 1. Seção 1

Conteúdo...

---

## Histórico de Mudanças

| Versão | Data | Autor | Mudança |
|--------|------|-------|---------|
| 1.0.0 | YYYY-MM-DD | Autor | Criação do documento |
```

### 2.4 Versionamento

- Documentos seguem **versionamento semântico** (MAJOR.MINOR.PATCH)
- **MAJOR:** Mudança estrutural ou conteúdo significativo
- **MINOR:** Adição de seções ou informações
- **PATCH:** Correções, typos, formatação
- Histórico de mudanças no final de cada documento
- Tags Git para releases de documentação

### 2.5 Acessibilidade

- Todos os diagramas Mermaid devem ter **descrição textual** abaixo
- Documentos > 100 linhas devem ter **sumário automático**
- Links devem ser **relativos** e descritivos (não "clique aqui")
- Imagens devem ter **alt text** quando em Markdown
- Código deve ter **syntax highlighting** especificado

---

## 3. Documentos Obrigatórios

### 3.1 README.md (existente — melhorias propostas)

**Status:** Existente, necessita atualização

**Melhorias:**
- Adicionar badge de versão atual (v0044)
- Adicionar badge de documentação
- Atualizar número de tools MCP (verificar quantidade real)
- Adicionar link para `docs/INDEX.md`
- Adicionar seção "Documentação" com links para guias principais
- Adicionar screenshot da interface web

### 3.2 ADRs (Architecture Decision Records)

**Status:** Não existe — necessita criação

**ADRs prioritários a criar:**

| # | Título | Contexto |
|---|--------|----------|
| ADR-0001 | Arquitetura Filesystem + JSON | Justificar uso de FS em vez de banco relacional |
| ADR-0002 | Protocolo MCP como interface | Justificar escolha de MCP sobre REST direto |
| ADR-0003 | Sem banco relacional | Justificar PostgreSQL como opcional |
| ADR-0004 | Worktree por fase | Justificar 1 worktree por fase vs por agente |
| ADR-0005 | Plugin wake-up via Kilo Code | Justificar arquitetura de wake-up |
| ADR-0006 | Estado como arquivos JSON | Justificar persistência em JSON |
| ADR-0007 | Subscrições MCP dual-era | Justificar suporte a 2025 e 2026 |
| ADR-0008 | Frontend vanilla (sem framework) | Justificar escolha de HTML/CSS/JS puro |

### 3.3 API Documentation

**Status:** Existente em `docs/api-reference.md`

**Melhorias:**
- Adicionar exemplos de request/response para todos os endpoints
- Adicionar códigos de erro documentados
- Adicionar rate limiting (se aplicável)
- Adicionar autenticação (se aplicável)
- Mover para `docs/referencia/api-reference.md`

### 3.4 User Guide

**Status:** Parcialmente coberto no README.md

**A criar:**
- `docs/guias/guia-inicio-rapido.md` — Quick start (5 minutos)
- `docs/guias/guia-projetos.md` — Como criar, abrir, gerenciar projetos
- `docs/guias/guia-agentes.md` — Como criar e configurar agentes
- `docs/guias/guia-monitoramento.md` — Como usar o painel de monitoramento

### 3.5 Developer Guide

**Status:** Não existe — necessita criação

**A criar:**
- `docs/desenvolvimento/guia-desenvolvedor.md` — Onboarding de desenvolvedores
- `docs/desenvolvimento/padroes-codigo.md` — Padrões de código TypeScript
- `docs/desenvolvimento/padroes-commit.md` — Convenção de commits
- `docs/desenvolvimento/test-strategy.md` — Estratégia de testes

### 3.6 Deployment Guide

**Status:** Não existe — necessita criação

**A criar:**
- `docs/operacao/deployment.md` — Guia de deployment em produção
- `docs/operacao/backup-restore.md` — Procedimentos de backup
- `docs/operacao/monitoring.md` — Monitoramento e alertas

### 3.7 Security Policy

**Status:** Existente em `SECURITY.md`

**Melhorias:**
- Adicionar processo de reporte de vulnerabilidades
- Adicionar política de divulgação responsável
- Adicionar checklist de segurança para releases
- Expandir com detalhes técnicos (CORS, path traversal, sanitização)

### 3.8 Contributing Guide

**Status:** Não existe — necessita criação

**A criar:**
- `CONTRIBUTING.md` — Guia de contribuição
  - Como reportar bugs
  - Como solicitar features
  - Como submeter pull requests
  - Padrões de código
  - Processo de review

---

## 4. Templates de Documentação

### 4.1 Template de ADR

```markdown
# ADR-XXX: <Título da Decisão>

> **Status:** Proposta | Aceita | Rejeitada | Substituída
> **Data:** YYYY-MM-DD
> **Autor:** <Nome>
> **Aprovadores:** <Nomes>

---

## Contexto

Descreva o contexto que levou a esta decisão. Qual problema estamos resolvendo?
Quais fatores influenciaram? Quais restrições existem?

## Opções Consideradas

### Opção 1: <Nome>
- **Vantagens:** ...
- **Desvantagens:** ...
- **Custo:** ...

### Opção 2: <Nome>
- **Vantagens:** ...
- **Desvantagens:** ...
- **Custo:** ...

## Decisão

Descreva a decisão tomada e por quê. Referencie a opção escolhida.

## Consequências

### Positivas
- ...

### Negativas
- ...

### Riscos
- ...

## Referências

- [Link 1](...)
- [Link 2](...)
```

### 4.2 Template de User Story

```markdown
# US-XXXX: <Título>

> **Épico:** <ID do Épico>
> **Prioridade:** Alta | Média | Baixa
> **Pontos:** <Estimativa>
> **Sprint:** <Sprint>

---

## Descrição

Como **<papel>**, eu quero **<funcionalidade>**, para que **<benefício>**.

## Critérios de Aceitação

- [ ] **CA1:** <Critério verificável>
- [ ] **CA2:** <Critério verificável>
- [ ] **CA3:** <Critério verificável>

## Regras de Negócio

1. <Regra 1>
2. <Regra 2>

## Dependências

- [US-YYYY](link) — <Descrição da dependência>

## Notas Técnicas

- <Nota 1>
- <Nota 2>

## Mockups / Referências

- [Link para protótipo](...)
```

### 4.3 Template de Especificação Técnica

```markdown
# SPEC-XXXX: <Título>

> **Status:** Rascunho | Em Revisão | Aprovado
> **Data:** YYYY-MM-DD
> **Autor:** <Nome>
> **Aprovador:** <Nome>
> **User Stories:** [US-XXXX](link), [US-YYYY](link)

---

## 1. Visão Geral

Breve descrição da funcionalidade.

## 2. Requisitos Técnicos

### 2.1 Requisitos Funcionais
- RF001: ...
- RF002: ...

### 2.2 Requisitos Não-Funcionais
- RNF001: Performance — ...
- RNF002: Segurança — ...

## 3. Design Técnico

### 3.1 Arquitetura
<Diagrama ou descrição>

### 3.2 API/Endpoints
| Método | Caminho | Descrição |
|--------|---------|-----------|
| POST | /api/... | Cria... |

### 3.3 Modelo de Dados
<Schema ou estrutura>

### 3.4 Fluxo de Execução
<Diagrama de sequência>

## 4. Dependências

- [Serviço X](link)
- [Biblioteca Y](link)

## 5. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| ... | Alta | Alta | ... |

## 6. Testes

- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes de aceitação

## 7. Referências

- [ADR-XXX](link)
- [Documentação relacionada](link)
```

### 4.4 Template de Plano de Teste

```markdown
# TEST-XXXX: <Título>

> **Status:** Rascunho | Ativo | Concluído
> **Data:** YYYY-MM-DD
> **Autor:** <Nome>
> **Especificação:** [SPEC-XXXX](link)

---

## 1. Escopo

### 1.1 O que será testado
- ...

### 1.2 O que NÃO será testado
- ...

## 2. Estratégia de Testes

| Tipo | Ferramenta | Cobertura Mínima |
|------|-----------|------------------|
| Unitário | Jest | 80% |
| Integração | Supertest | 70% |
| E2E | Playwright | Críticos |

## 3. Casos de Teste

### CT-001: <Nome do caso>
- **Pré-condição:** ...
- **Passos:**
  1. ...
  2. ...
- **Resultado esperado:** ...
- **Prioridade:** Alta

## 4. Ambiente

- **SO:** Windows 11 / Ubuntu 22.04 / macOS 14
- **Node.js:** 18+
- **Dependências:** ...

## 5. Critérios de Aceitação

- [ ] Todos os testes críticos passando
- [ ] Cobertura >= 80%
- [ ] Sem bugs P0/P1 abertos

## 6. Referências

- [SPEC-XXXX](link)
```

### 4.5 Template de Release Notes

```markdown
# Release vX.Y.Z — <Data>

> **Branch:** v00XX
> **Commit Base:** <hash>
> **Data de Release:** YYYY-MM-DD

---

## 🎉 Novas Funcionalidades

- **Feature 1** — Descrição curta ([ISSUE-XXX](link))
- **Feature 2** — Descrição curta ([ISSUE-YYY](link))

## 🔧 Melhorias

- **Melhoria 1** — Descrição
- **Melhoria 2** — Descrição

## 🐛 Correções de Bugs

- **Bug 1** — Descrição ([ISSUE-XXX](link))
- **Bug 2** — Descrição ([ISSUE-YYY](link))

## ⚠️ Breaking Changes

- **Mudança 1** — O que mudou e como migrar

## 📚 Documentação

- [Nova documentação](link)
- [Documentação atualizada](link)

## 🔒 Segurança

- **CVE-XXXX** — Descrição da correção

## 📦 Dependências Atualizadas

- `pacote` v1.0.0 → v1.1.0

## 👥 Contribuidores

- @usuario1 — Feature X
- @usuario2 — Bug fix Y

## 📋 Checklist de Release

- [ ] Testes passando
- [ ] Documentação atualizada
- [ ] CHANGELOG atualizado
- [ ] Tag Git criada
- [ ] Release notes publicadas
```

### 4.6 Template de Runbook

```markdown
# RUNBOOK: <Nome do Incidente>

> **Severidade:** P0 (Crítica) | P1 (Alta) | P2 (Média) | P3 (Baixa)
> **Tempo de Resolução Esperado:** <X horas>
> **Última Atualização:** YYYY-MM-DD

---

## 1. Descrição do Incidente

O que acontece? Qual o impacto?

## 2. Detecção

### 2.1 Sintomas
- Sintoma 1: ...
- Sintoma 2: ...

### 2.2 Alertas
- Alerta: ...
- Métrica: ...

## 3. Diagnóstico

### 3.1 Comandos de Verificação
```bash
# Verificar status
curl http://localhost:3150/api/health

# Verificar logs
tail -f backend/logs/error.log
```

### 3.2 Possíveis Causas
1. Causa A — Como verificar
2. Causa B — Como verificar

## 4. Resolução

### 4.1 Procedimento de Resolução

**Passo 1:** Descrição
```bash
# Comando
```

**Passo 2:** Descrição
```bash
# Comando
```

### 4.2 Procedimento de Emergência (Rollback)

Se a resolução falhar:
1. ...
2. ...

## 5. Prevenção

- [ ] Monitoramento adicionado
- [ ] Alerta configurado
- [ ] Teste de regressão criado
- [ ] Documentação atualizada

## 6. Referências

- [Documentação relacionada](link)
- [ADR relevante](link)
```

---

## 5. Estratégia de Documentação

### 5.1 Documentação as Code

**Princípio:** Documentação vive no mesmo repositório que o código.

| Prática | Implementação |
|---------|---------------|
| Versionamento | Git junto com código |
| Review | Pull requests incluem docs |
| CI/CD | Validação automática de links |
| Ownership | CODEOWNERS para docs |
| Localização | `docs/` na raiz do repositório |

### 5.2 Auto-generated Docs

| Tipo | Ferramenta | Output |
|------|-----------|--------|
| API REST | OpenAPI/Swagger (futuro) | `docs/referencia/api-openapi.yaml` |
| MCP Tools | Script TypeScript | `docs/referencia/tools-auto.md` |
| JSON Schemas | json-schema-to-markdown | `docs/referencia/schemas.md` |
| Diagramas | Mermaid CLI | `docs/imagens/*.png` |
| Changelog | conventional-changelog | `CHANGELOG.md` |

### 5.3 Documentação Sincronizada

**Regra:** Toda mudança de código que afeta comportamento documentado deve atualizar a documentação.

| Gatilho | Ação |
|---------|------|
| Novo endpoint API | Atualizar `api-reference.md` |
| Nova tool MCP | Atualizar `referencia-tools-mcp.md` |
| Mudança arquitetural | Criar ou atualizar ADR |
| Nova feature | Atualizar `CHANGELOG.md` |
| Bug fix significativo | Atualizar `runbook.md` se aplicável |
| Mudança de schema | Atualizar `schemas-json.md` |

### 5.4 Processo de Atualização

```
1. IDENTIFICAR — Documento precisa ser criado/atualizado
2. CRIAR BRANCH — `docs/<descricao-curta>`
3. ATUALIZAR — Editar documento seguindo template
4. REVIEW — Pull request com revisor de documentação
5. APROVAR — Aprovação obrigatória do revisor
6. MERGER — Integrar na main/atual
7. PUBLICAR — Se aplicável (site, wiki)
```

### 5.5 Responsáveis pela Documentação

| Área | Responsável | Backup |
|------|-------------|--------|
| README.md | Documentador Técnico | Gerente de Projeto |
| ADRs | Arquiteto de Software | Engenheiro de Software |
| API Reference | Engenheiro de Software | Analista de Sistemas |
| Guias de Usuário | Documentador Técnico | Analista de Negócios |
| Guia de Desenvolvimento | Engenheiro de Software | Arquiteto |
| Runbooks | Segurança / Infra | Engenheiro de Software |
| Templates | Documentador Técnico | — |
| Glossário | Documentador Técnico | Todos |
| Release Notes | Gerente de Projeto | Documentador |
| SECURITY.md | Segurança | Gerente de Projeto |

---

## 6. Glossário e Terminologia

### 6.1 Glossário do Projeto

| Termo | Definição | Contexto |
|-------|-----------|----------|
| **AgentMap** | Gerenciador Local de Agentes de IA | Sistema principal |
| **Agente** | Entidade de IA com identidade e responsabilidades definidas | `.ia/agentes/` |
| **ADR** | Architecture Decision Record — registro de decisão arquitetural | `docs/arquitetura/decisoes/` |
| **API REST** | Application Programming Interface usando REST | `backend/src/api/` |
| **Artefato** | Produto gerado por um agente (código, doc, config) | `.ia/artefatos/` |
| **Bloqueio** | Impedimento que impede progresso de tarefa | `.ia/bloqueios/` |
| **Checkpoint** | Marco de validação humana entre fases | `.ia/checkpoints/` |
| **Contrato** | Estrutura compartilhada entre agentes (API, DTO, schema) | `.ia/contratos/` |
| **CORS** | Cross-Origin Resource Sharing | Segurança HTTP |
| **Dependência** | Relação entre tarefas (A depende de B) | `.ia/dependencias/` |
| **Dispatcher** | Serviço de execução de tarefas pendentes | `backend/src/monitoramento/` |
| **Evento** | Comunicação assíncrona entre agentes | `.ia/eventos/` |
| **Filesystem** | Sistema de arquivos (armazenamento primário) | `.ia/` |
| **Fase** | Etapa do fluxo de trabalho (11 fases) | `.ia/fluxo-trabalho.md` |
| **Handoff** | Transferência de contexto entre agentes | `.ia/handoffs/` |
| **Health Check** | Endpoint de verificação de saúde | `/api/health` |
| **JSON Schema** | Schema de validação de documentos JSON | `esquemas/` |
| **Kilo Code** | IDE/CLI que consome o MCP do AgentMap | Integração |
| **MCP** | Model Context Protocol | Protocolo de integração |
| **MCP Tool** | Ferramenta exposta via MCP | `backend/src/mcp-server/tools/` |
| **Monitoramento** | Sistema de acompanhamento em tempo real | `/api/monitoramento/` |
| **NFR** | Non-Functional Requirement | Requisito não-funcional |
| **OTel** | OpenTelemetry — framework de observabilidade | `backend/src/observability/` |
| **Path Traversal** | Ataque de navegação de diretórios | Segurança |
| **Pendencia** | Tarefa secundária ou ação pendente | `.ia/pendencias/` |
| **Reserva** | Coordenação lógica de acesso a recurso | `.ia/reservas/` |
| **Risco** | Evento futuro com impacto potencial | `.ia/riscos/` |
| **Runbook** | Procedimento operacional documentado | `docs/operacao/` |
| **Sessão** | Ciclo de execução de um agente | `.ia/sessoes/` |
| **Solicitação** | Pedido de alteração entre agentes | `.ia/solicitacoes/` |
| **Tarefa** | Unidade de trabalho do projeto | `.ia/tarefas/` |
| **TTL** | Time To Live — tempo de vida de temporários | `temp/` |
| **Validação** | Aprovação/reprovação de trabalho concluído | `.ia/validacoes/` |
| **Wake-up** | Acordar automático do agente principal | Plugin Kilo Code |
| **WebSocket** | Protocolo de comunicação bidirecional | `ws://localhost:3150/ws/` |
| **Worktree** | Árvore de trabalho isolada (Git) | Agent Manager |
| **Zod** | Biblioteca de validação de schemas TypeScript | Validação de entrada |

### 6.2 Termos Técnicos

| Termo | Definição |
|-------|-----------|
| **CorrelationId** | Identificador que correlaciona operações entre sistemas |
| **DTO** | Data Transfer Object — objeto de transferência de dados |
| **FURPS+** | Functionality, Usability, Reliability, Performance, Supportability + |
| **GenAI** | Inteligência Artificial Generativa |
| **Idempotent** | Operação que pode ser repetida sem efeito colateral |
| **OTLP** | OpenTelemetry Protocol |
| **RBAC** | Role-Based Access Control |
| **RPO/RTO** | Recovery Point Objective / Recovery Time Objective |
| **SAST/DAST** | Static/Dynamic Application Security Testing |
| **STDIO** | Standard Input/Output — transporte MCP |
| **Structured Content** | Conteúdo estruturado retornado por tools MCP |

### 6.3 Siglas

| Sigla | Significado |
|-------|-------------|
| ADR | Architecture Decision Record |
| API | Application Programming Interface |
| CORS | Cross-Origin Resource Sharing |
| DBA | Database Administrator |
| DTO | Data Transfer Object |
| FRD | Functional Requirements Document |
| HTTP | HyperText Transfer Protocol |
| JSON | JavaScript Object Notation |
| MCP | Model Context Protocol |
| MIT | Massachusetts Institute of Technology (licença) |
| NFR | Non-Functional Requirement |
| OTel | OpenTelemetry |
| QA | Quality Assurance |
| REST | Representational State Transfer |
| SDK | Software Development Kit |
| SGBD | Sistema de Gerenciamento de Banco de Dados |
| SRS | Software Requirements Specification |
| TTL | Time To Live |
| UI | User Interface |
| UML | Unified Modeling Language |
| URI | Uniform Resource Identifier |
| WBS | Work Breakdown Structure |
| WS | WebSocket |

### 6.4 Convenções de Nomenclatura

| Entidade | Padrão | Exemplo |
|----------|--------|---------|
| ID de Agente | `AGT-<NOME>` ou `<papel>` | `AGT-BACKEND`, `backend` |
| ID de Tarefa | `TAR-YYYY-NNNNN` | `TAR-2026-00001` |
| ID de Sessão | `SES-YYYY-NNNNN` | `SES-2026-00001` |
| ID de Resultado | `RES-YYYY-NNNNN` | `RES-2026-00001` |
| ID de Evento | `EVT-YYYY-NNNNN` | `EVT-2026-00001` |
| ID de Mensagem | `MSG-<timestamp>` | `MSG-1700000000000` |
| ID de Solicitação | `SOL-YYYY-NNNNN` | `SOL-2026-00001` |
| Branch de docs | `docs/<descricao>` | `docs/adr-arquitectura-fs` |
| Branch de feature | `feat/<descricao>` | `feat/nova-tool-mcp` |
| Branch de fix | `fix/<descricao>` | `fix/schema-inconsistente` |

---

## 7. Processo de Revisão

### 7.1 Revisão Obrigatória

| Tipo de Documento | Revisão Obrigatória | Aprovador |
|-------------------|---------------------|-----------|
| ADR | Sim | Arquiteto + 1 revisor |
| API Reference | Sim | Engenheiro de Software |
| Guias | Sim | Documentador Técnico |
| Runbooks | Sim | Segurança ou Infra |
| Templates | Sim | Documentador Técnico |
| SECURITY.md | Sim | Segurança + Gerente |
| CONTRIBUTING.md | Sim | Gerente de Projeto |
| README.md | Sim | Gerente de Projeto |
| CHANGELOG.md | Sim | Gerente de Projeto |

### 7.2 Aprovação Humana

**Documentos críticos requerem aprovação humana:**

- Arquitetura (ADRs)
- Segurança (SECURITY.md, Runbooks)
- API pública (api-reference.md)
- Contribuição (CONTRIBUTING.md)
- Releases (CHANGELOG.md, Release Notes)

**Processo:**
1. Criar Pull Request com a mudança
2. Solicitar review de pelo menos 1 aprovador
3. Aprovação explícita via GitHub
4. Merge apenas após aprovação

### 7.3 Versionamento

- Documentos versionados semanticamente (MAJOR.MINOR.PATCH)
- Mudanças documentadas no histórico do documento
- Tags Git para releases de documentação
- CHANGELOG.md para mudanças globais

### 7.4 Change Log

**Formato do CHANGELOG.md:**

```markdown
# Changelog

## [Unreleased]

### Added
- Nova documentação X

### Changed
- Atualização do documento Y

### Fixed
- Correção de erro no documento Z

## [1.0.0] - 2026-08-27

### Added
- Documentação inicial do projeto
```

**Categorias:**
- `Added` — Novos documentos ou seções
- `Changed` — Atualizações significativas
- `Deprecated` — Documentos obsoletos
- `Removed` — Documentos removidos
- `Fixed` — Correções de erros
- `Security` — Correções de segurança

---

## 8. Ferramentas e Automação

### 8.1 Ferramentas de Documentação

| Ferramenta | Uso | Status |
|------------|-----|--------|
| **Markdown** | Formato principal | Em uso |
| **Mermaid** | Diagramas | Em uso |
| **VS Code** | Edição | Recomendado |
| **Markdownlint** | Validação de estilo | A implementar |
| **Vale** | Validação de estilo prosa | A implementar |
| **Lychee** | Verificação de links | A implementar |
| **Mermaid CLI** | Geração de imagens | A implementar |

### 8.2 Geração Automática

| Output | Ferramenta | Frequência |
|--------|-----------|------------|
| API Reference | Script TypeScript + JSDoc | A cada release |
| MCP Tools Reference | Script TypeScript | A cada release |
| Schemas Documentation | json-schema-to-markdown | A cada mudança de schema |
| Diagramas PNG/SVG | Mermaid CLI | A cada mudança de diagrama |
| CHANGELOG | conventional-changelog | A cada release |
| Índice de Docs | Script customizado | A cada merge |

### 8.3 Validação de Docs

**CI/CD Pipeline (proposto):**

```yaml
# .github/workflows/docs.yml
name: Documentation

on:
  pull_request:
    paths:
      - 'docs/**'
      - '*.md'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Lint Markdown
        uses: avto-dev/markdown-lint@v1
        with:
          config: '.markdownlint.json'

      - name: Check Links
        uses: lycheeverse/lychee-action@v1
        with:
          args: --verbose --no-progress './docs/**/*.md'

      - name: Validate Mermaid
        uses: mermaid-js/mermaid-cli
        with:
          args: '-i docs/**/*.mmd'
```

### 8.4 Publicação

| Canal | Conteúdo | Frequência |
|-------|----------|------------|
| GitHub (README) | Visão geral | Contínuo |
| `docs/` | Documentação completa | Contínuo |
| GitHub Releases | Release notes | A cada release |
| Wiki (futuro) | Guias expandidos | Sob demanda |
| Site estático (futuro) | Documentação navegável | A cada release |

---

## 9. Plano de Ação Prioritizado

### 9.1 Sprint 1 — Fundação (Semana 1)

| # | Tarefa | Prioridade | Esforço |
|---|--------|------------|---------|
| 1 | Criar `docs/INDEX.md` | P0 | 2h |
| 2 | Criar `CONTRIBUTING.md` | P0 | 3h |
| 3 | Criar `CHANGELOG.md` | P0 | 2h |
| 4 | Criar `docs/GLOSSARIO.md` | P0 | 3h |
| 5 | Criar ADR-0001 até ADR-0003 | P0 | 6h |
| 6 | Mover docs para estrutura proposta | P1 | 4h |

### 9.2 Sprint 2 — Guias e Templates (Semana 2)

| # | Tarefa | Prioridade | Esforço |
|---|--------|------------|---------|
| 1 | Criar templates (6 templates) | P0 | 6h |
| 2 | Criar `guia-inicio-rapido.md` | P0 | 3h |
| 3 | Criar `guia-desenvolvedor.md` | P1 | 4h |
| 4 | Criar `deployment.md` | P1 | 4h |
| 5 | Atualizar README.md | P1 | 2h |

### 9.3 Sprint 3 — Automação e Polimento (Semana 3)

| # | Tarefa | Prioridade | Esforço |
|---|--------|------------|---------|
| 1 | Configurar markdownlint | P1 | 2h |
| 3 | Criar ADR-0004 até ADR-0008 | P1 | 8h |
| 4 | Criar `runbook.md` | P1 | 3h |
| 5 | Polir documentação existente | P2 | 4h |

### 9.4 Estimativa Total

| Sprint | Esforço | Prazo |
|--------|---------|-------|
| Sprint 1 — Fundação | 20h | Semana 1 |
| Sprint 2 — Guias e Templates | 19h | Semana 2 |
| Sprint 3 — Automação e Polimento | 19h | Semana 3 |
| **Total** | **58h** | **3 semanas** |

---

## 10. Métricas de Sucesso

### 10.1 KPIs de Documentação

| Métrica | Estado Atual | Meta | Como Medir |
|---------|-------------|------|------------|
| Cobertura de docs | 60% | 95% | Checklist de documentos obrigatórios |
| Documentos atualizados | 70% | 95% | Data da última atualização < 30 dias |
| ADRs criadas | 0 | 8 | Contagem de arquivos em `docs/arquitetura/decisoes/` |
| Glossário | Não existe | 1 completo | Arquivo `docs/GLOSSARIO.md` |
| Templates | 0 | 6 | Contagem de arquivos em `docs/templates/` |
| CONTRIBUTING.md | Não existe | 1 | Arquivo na raiz |
| CHANGELOG.md | Não existe | 1 | Arquivo na raiz |
| Tempo de onboarding | Desconhecido | < 30 min | Teste com novo desenvolvedor |

### 10.2 Checklists de Validação

**Checklist de Qualidade Documental:**

- [ ] Todos os documentos obrigatórios existem
- [ ] Todos os documentos seguem template padronizado
- [ ] Todos os documentos têm versão e data
- [ ] Todos os documentos têm autor identificado
- [ ] Todos os links internos funcionam
- [ ] Todos os diagramas têm descrição textual
- [ ] Todos os documentos > 100 linhas têm sumário
- [ ] Glossário está completo e consistente
- [ ] ADRs documentam decisões arquiteturais significativas
- [ ] CHANGELOG está atualizado
- [ ] CONTRIBUTING.md explica processo de contribuição
- [ ] Runbooks cobrem incidentes críticos

---

## 11. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Documentação fica desatualizada | Alta | Alta | Automação de validação + processo de review |
| Falta de tempo para documentar | Alta | Média | Priorizar P0, integrar ao fluxo de desenvolvimento |
| Resistência da equipe | Média | Média | Mostrar valor, facilitar com templates |
| Ferramentas de automação falham | Baixa | Baixa | Processo manual como fallback |
| Documentação muito extensa | Média | Média | Manter concisa, usar links cruzados |
| Perda de conhecimento | Baixa | Alta | Múltiplos revisores, documentação as code |

---

## 12. Referências

### 12.1 Documentos Internos

- [README.md](../README.md) — Documentação principal
- [SECURITY.md](../SECURITY.md) — Política de segurança
- [AGENTS.md](../AGENTS.md) — Regras do projeto
- [.ia/fluxo-trabalho.md](../.ia/fluxo-trabalho.md) — Fluxo de trabalho
- [.ia/docs/GUIA_INICIAL_AGENTES.md](../.ia/docs/GUIA_INICIAL_AGENTES.md) — Guia de agentes
- [docs/api-reference.md](../docs/api-reference.md) — Referência da API
- [docs/arquitetura-mcp.md](../docs/arquitetura-mcp.md) — Arquitetura MCP
- [docs/plano-final-implementacao.md](../docs/plano-final-implementacao.md) — Plano de implementação

### 12.2 Padrões e Referências Externas

- [Google Documentation Best Practices](https://developers.google.com/tech-writing)
- [Write the Docs](https://www.writethedocs.org/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Mermaid Documentation](https://mermaid.js.org/)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)

---

## Histórico de Mudanças

| Versão | Data | Autor | Mudança |
|--------|------|-------|---------|
| 1.0.0 | 2026-08-27 | Documentador Técnico | Criação da proposta completa de documentação |