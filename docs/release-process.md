# Release Process — AgentMap

> **Versão:** 1.0.0
> **Data:** 2026-08-28
> **Aplica-se a:** v2.0.0-beta.1+

---

## Visão Geral

Este documento descreve o processo de release do AgentMap, desde o desenvolvimento até a publicação da versão estável.

---

## Fluxo de Release

```
┌─────────────────────────────────────────────────────────────────┐
│                        RELEASE FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. DESENVOLVIMENTO                                             │
│     ├── Feature branches (feat/*, fix/*)                        │
│     ├── Pull requests para main                                 │
│     └── Code review + testes                                    │
│                                                                 │
│  2. PREPARAÇÃO                                                  │
│     ├── Atualizar versão em package.json                        │
│     ├── Atualizar CHANGELOG                                     │
│     ├── Executar testes completos                               │
│     └── Gerar documentação                                      │
│                                                                 │
│  3. VALIDAÇÃO                                                   │
│     ├── Testes unitários (cobertura ≥70%)                       │
│     ├── Testes E2E (CLI + MCP)                                  │
│     ├── Typecheck sem erros                                     │
│     ├── Build completo                                          │
│     └── Performance (cold start <2s)                            │
│                                                                 │
│  4. PUBLICAÇÃO                                                  │
│     ├── Tag Git (vX.Y.Z)                                        │
│     ├── Push para origin                                        │
│     ├── Criar release no GitHub                                 │
│     └── Publicar npm (se aplicável)                             │
│                                                                 │
│  5. PÓS-RELEASE                                                 │
│     ├── Comunicar stakeholders                                  │
│     ├── Atualizar documentação externa                          │
│     └── Coletar feedback                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Versionamento

O AgentMap segue [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH[-prerelease]

Exemplos:
  2.0.0-beta.1    ← Beta inicial
  2.0.0-rc.1      ← Release candidate
  2.0.0           ← Estável
  2.1.0           ← Nova funcionalidade (backward-compatible)
  3.0.0           ← Breaking changes
```

### Regras

- **MAJOR**: Breaking changes na API ou arquitetura
- **MINOR**: Novas funcionalidades (backward-compatible)
- **PATCH**: Bug fixes (backward-compatible)
- **Prerelease**: `alpha`, `beta`, `rc` (release candidate)

---

## 2. Preparação do Release

### 2.1 Atualizar Versão

```bash
# Em backend/package.json
{
  "version": "2.0.0-beta.1"  // Atualizar conforme necessário
}
```

### 2.2 Atualizar CHANGELOG

Adicionar entrada no `CHANGELOG.md`:

```markdown
## [2.0.0-beta.1] - 2026-08-28

### Added
- CLI `agentmap` com comandos init, update, status, doctor, repair
- Arquitetura single-project (remoção de multi-tenancy)
- Geradores automáticos (.kilo/, AGENTS.md, kilo.jsonc)
- MCP Server com 169+ tools via stdio
- Testes E2E para CLI e MCP

### Changed
- Backend simplificado (serviços singleton)
- Remoção de projectMiddleware complexo
- Configuração via agentmap.json local

### Removed
- Multi-tenancy (GERENCIADOR_DIR, cachedSettings)
- projectMiddleware global
```

### 2.3 Executar Testes

```bash
# Testes unitários
npm test

# Typecheck
npm run typecheck

# Build
npm run build

# Testes E2E
npm run test:e2e

# Performance
npm run perf:coldstart
```

---

## 3. Validação de Qualidade

### 3.1 Critérios de Aceitação

| Critério | Mínimo | Alvo |
|----------|--------|------|
| Cobertura de testes | 70% | 80% |
| Typecheck | 0 erros | 0 erros |
| ESLint | 0 erros | 0 erros |
| Testes E2E | 100% passando | 100% passando |
| Cold start MCP | <5s | <2s |
| Tool call | <3s | <1s |

### 3.2 Quality Gates

```bash
# Executa todos os quality gates
npm run quality
```

Os quality gates verificam:
1. Cobertura de código
2. Complexidade ciclomática
3. Duplicação de código
4. Typecheck
5. ESLint

---

## 4. Publicação

### 4.1 Criar Tag Git

```bash
# Commit final
git add -A
git commit -m "chore(release): v2.0.0-beta.1"

# Criar tag
git tag -a v2.0.0-beta.1 -m "Release v2.0.0-beta.1"

# Push
git push origin main --tags
```

### 4.2 Criar Release no GitHub

```bash
gh release create v2.0.0-beta.1 \
  --title "AgentMap v2.0.0-beta.1" \
  --notes-file RELEASE.md \
  --prerelease
```

### 4.3 Publicar no npm (se aplicável)

```bash
npm publish --tag beta
```

---

## 5. Pós-Release

### 5.1 Comunicar Stakeholders

- [ ] Atualizar documentação oficial
- [ ] Enviar newsletter/email para usuários beta
- [ ] Postar em redes sociais (se aplicável)
- [ ] Atualizar changelog público

### 5.2 Coletar Feedback

- [ ] Monitorar issues no GitHub
- [ ] Coletar métricas de uso
- [ ] Realizar entrevistas com usuários beta
- [ ] Priorizar correções para próxima versão

### 5.3 Planejar Próxima Versão

- [ ] Revisar backlog
- [ ] Priorizar bugs críticos
- [ ] Planejar novas funcionalidades
- [ ] Definir data da próxima release

---

## 6. Tipos de Release

### 6.1 Alpha

- **Quando**: Funcionalidade em desenvolvimento ativo
- **Estabilidade**: Instável, pode ter bugs
- **Público**: Desenvolvedores internos
- **Versionamento**: `X.Y.Z-alpha.N`

### 6.2 Beta

- **Quando**: Funcionalidade completa, bugs conhecidos
- **Estabilidade**: Razoável, pode ter problemas
- **Público**: Usuários beta (early adopters)
- **Versionamento**: `X.Y.Z-beta.N`

### 6.3 Release Candidate (RC)

- **Quando**: Candidato a versão estável
- **Estabilidade**: Alta, apenas bugs críticos
- **Público**: Usuários avançados
- **Versionamento**: `X.Y.Z-rc.N`

### 6.4 Estável

- **Quando**: Pronto para produção
- **Estabilidade**: Alta, testado extensivamente
- **Público**: Todos os usuários
- **Versionamento**: `X.Y.Z`

---

## 7. Hotfixes

Para correções urgentes em produção:

```bash
# Criar branch de hotfix
git checkout -b hotfix/v2.0.1 v2.0.0-beta.1

# Corrigir bug
# ...

# Atualizar versão
# backend/package.json: "version": "2.0.1"

# Commit e tag
git add -A
git commit -m "fix: corrige bug crítico"
git tag -a v2.0.1 -m "Hotfix v2.0.1"

# Push
git push origin hotfix/v2.0.1 --tags
```

---

## 8. Automação Futura

Planejado para v2.1+:

- [ ] GitHub Actions para CI/CD automático
- [ ] Release automático via `semantic-release`
- [ ] Testes de regressão automáticos
- [ ] Deploy automático para staging
- [ ] Notificações automáticas de release

---

## 9. Contato

Para dúvidas sobre o processo de release:

- **Issues**: https://github.com/agentmap/agentmap/issues
- **Email**: dev@agentmap.io

---

*Documento criado para AgentMap v2.0.0-beta.1*
*Data: 2026-08-28*
