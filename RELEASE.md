# RELEASE.md — AgentMap v2.0.0-beta.1

> **Versão:** 2.0.0-beta.1
> **Data:** 2026-08-28
> **Status:** Beta Release
> **Branch:** v0044

---

## Resumo da Release

Primeira release beta do AgentMap v2.0. Esta versão introduz:

- **Arquitetura single-project**: Backend serve um projeto apenas, sem multi-tenancy
- **CLI `agentmap`**: Comandos `init`, `update`, `status`, `doctor`, `repair`
- **Template base**: `.ia/` como fonte de verdade, `.kilo/` gerado automaticamente
- **MCP Server**: 169+ tools via stdio, resources, prompts e subscriptions
- **Performance**: Cold start <2s, cache de configuração, carregamento otimizado

---

## Checklist de Release

### Pré-Release

- [x] Versão atualizada em `backend/package.json` → `2.0.0-beta.1`
- [x] Testes unitários passando (`npm test`)
- [x] Testes E2E implementados (`npm run test:e2e`)
- [x] Typecheck sem erros (`npm run typecheck`)
- [x] Build completo (`npm run build`)
- [x] Documentação atualizada

### Testes

- [x] **Teste A — Instalação**: `agentmap init` cria estrutura completa
- [x] **Teste B — Atualização**: `agentmap update` atualiza sem perder dados do usuário
- [x] **Teste C — MCP**: Tools respondem via stdio
- [x] **Teste D — Performance**: Cold start <5s, tool call <2s
- [x] **Teste E — Preservação**: Seções do usuário são mantidas entre atualizações
- [x] **Teste F — Dry-run**: `--dry-run` não escreve arquivos

### Qualidade

- [x] Cobertura de testes ≥70% (unitários)
- [x] Testes E2E cobrindo fluxos críticos
- [x] ESLint sem erros
- [x] TypeScript strict mode sem erros

### Documentação

- [x] `README.md` atualizado
- [x] `docs/release-process.md` criado
- [x] `RELEASE.md` criado
- [x] Changelog documentado

---

## Como Instalar

```bash
# Clonar repositório
git clone https://github.com/agentmap/agentmap.git
cd agentmap

# Instalar dependências
cd backend
npm install

# Build
npm run build

# Inicializar em um projeto
cd /caminho/do/seu/projeto
agentmap init

# Atualizar arquivos gerenciados
agentmap update

# Verificar status
agentmap status

# Validar integridade
agentmap doctor
```

---

## Como Testar

```bash
# Testes unitários
npm test

# Testes E2E (CLI + MCP)
npm run test:e2e

# Testes de performance
npm run perf:coldstart
npm run perf:cache

# Typecheck
npm run typecheck

# Build
npm run build
```

---

## Mudanças Principais (v1.0 → v2.0-beta.1)

### Arquitetura

| Aspecto | v1.0 | v2.0-beta.1 |
|---------|------|-------------|
| Modelo | Multi-tenant centralizado | Single-project por instância |
| Backend | Servidor para múltiplos projetos | Servidor por projeto |
| Configuração | `GERENCIADOR_DIR` + `cachedSettings` | `agentmap.json` local |
| Frontend | Acoplado ao backend | Pode ser separado |
| Criação de projeto | Via API + validação | Via template/copier |

### CLI

| Comando | Descrição |
|---------|-----------|
| `agentmap init [--force]` | Inicializa AgentMap no diretório atual |
| `agentmap update [--dry-run] [--force]` | Atualiza arquivos gerenciados |
| `agentmap status [--json]` | Mostra status de sincronização |
| `agentmap doctor [--json] [--repair]` | Valida integridade |
| `agentmap repair` | Repara problemas detectados |

### Geradores

| Gerador | Entrada | Saída |
|---------|---------|-------|
| `AgentsRootGenerator` | Template | `AGENTS.md` |
| `KiloJsoncGenerator` | `.ia/agentmap.json` | `kilo.jsonc` |
| `AgentsMdGenerator` | `.ia/agentes/*.json` | `.kilo/agents/agentmap/*.md` |
| `RulesGenerator` | `.ia/policies/` | `.kilo/rules/agentmap/*.md` |
| `CommandsGenerator` | `.ia/procedures/` | `.kilo/commands/agentmap/*.md` |

### MCP Tools (169+)

- **Projeto**: `agentmap_projetos_abrir`, `agentmap_projetos_fechar`, `agentmap_projetos_listar`
- **Tarefas**: `agentmap_tarefas_criar`, `agentmap_tarefas_listar`, `agentmap_tarefas_atualizar`
- **Agentes**: `agentmap_agentes_listar`, `agentmap_agentes_obter`, `agentmap_recomendar_agente`
- **Handoffs**: `agentmap_handoffs_criar`, `agentmap_handoffs_atualizar`, `agentmap_handoffs_listar`
- **Sessões**: `agentmap_sessoes_criar`, `agentmap_sessoes_atualizar`, `agentmap_sessoes_finalizar`
- **Workflows**: `agentmap_workflows_iniciar_trabalho`, `agentmap_workflows_finalizar_trabalho`
- **Busca**: `agentmap_buscar_simbolo`, `agentmap_buscar_referencias`, `agentmap_buscar_conhecimento`
- **Utilitários**: `agentmap_descobrir`, `agentmap_sugerir_fluxo`

---

## Limitações Conhecidas (Beta)

1. **PostgreSQL**: Não implementado; apenas filesystem + JSON
2. **Frontend**: Interface web básica; melhorias planejadas para v2.1
3. **CI/CD**: GitHub Actions não configurado; planejado para v2.1
4. **Plugins**: Sistema de plugins não implementado; planejado para v2.2
5. **Migrações**: Migrações de schema não automatizadas

---

## Próximos Passos (Pós-Beta)

- [ ] Coletar feedback de usuários beta
- [ ] Corrigir bugs reportados
- [ ] Implementar CI/CD (GitHub Actions)
- [ ] Melhorar cobertura de testes para ≥80%
- [ ] Documentação completa de API
- [ ] Guia de migração v1 → v2
- [ ] Versão estável v2.0.0

---

## Suporte

- **Issues**: https://github.com/agentmap/agentmap/issues
- **Documentação**: `docs/`
- **Exemplos**: `examples/`

---

*Release gerada automaticamente a partir do branch v0044*
*Data: 2026-08-28*
