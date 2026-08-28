# Processo de Release

> **Versão:** 1.0.0  
> **Data:** 2026-08-28  
> **Branch:** v0044  
> **Responsável:** Gerente de Projeto

---

## 1. Visão Geral

O processo de release do AgentMap segue o modelo **semver** (Semantic Versioning) com releases beta antes da estabilização.

---

## 2. Versionamento

### 2.1 Formato

```
MAJOR.MINOR.PATCH
```

| Nível | Quando incrementar | Exemplo |
|-------|-------------------|---------|
| **MAJOR** | Breaking changes | `1.0.0` → `2.0.0` |
| **MINOR** | Novas features (backward compatible) | `1.0.0` → `1.1.0` |
| **PATCH** | Bug fixes | `1.0.0` → `1.0.1` |

### 2.2 Pre-release

```
MAJOR.MINOR.PATCH-beta.N
```

Exemplos:
- `2.0.0-beta.1`
- `2.0.0-beta.2`

---

## 3. Fluxo de Release

### 3.1 Fases

```
alpha → beta → release candidate (RC) → stable
```

| Fase | Descrição | Público |
|------|-----------|---------|
| **alpha** | Features implementadas, testes em andamento | Equipe interna |
| **beta** | Features completas, testes concluídos | Beta testers |
| **RC** | Release candidate, apenas bugs críticos | Beta testers |
| **stable** | Release oficial | Todos |

### 3.2 Checklist Pré-Release

- [ ] Todos os quality gates passam
- [ ] Cobertura ≥80%
- [ ] Documentação atualizada
- [ ] CHANGELOG.md atualizado
- [ ] Versão atualizada em `package.json`
- [ ] Testes E2E passam
- [ ] Sem dependências circulares
- [ ] Integridade do projeto verificada

---

## 4. Release v0.9.0 Beta

### 4.1 Objetivo

Lançar a versão beta com arquitetura single-project validada.

### 4.2 Entregas

| Item | Descrição |
|------|-----------|
| **Arquitetura** | Single-project validada |
| **CLI** | `agentmap init`, `update`, `status`, `doctor`, `repair` |
| **Testes** | Cobertura ≥70% |
| **CI/CD** | GitHub Actions configurado |
| **Docs** | Documentação completa |
| **Performance** | Tuning aplicado |

### 4.3 Critérios de Aceitação

- [ ] `agentmap init` funciona em projeto vazio
- [ ] `agentmap update` preserva edições do usuário
- [ ] `agentmap status` mostra status correto
- [ ] `agentmap doctor` detecta problemas
- [ ] MCP bootstrap automático funciona
- [ ] Todos os comandos passam em validação typecheck
- [ ] Cobertura ≥70%
- [ ] CI/CD funcionando

---

## 5. Comandos de Release

### 5.1 Preparar Release

```bash
# 1. Atualizar versão
npm version 2.0.0-beta.1

# 2. Atualizar CHANGELOG.md
# (editar manualmente)

# 3. Rodar quality gates
npm run quality

# 4. Build
npm run build

# 5. Commit
git add .
git commit -m "chore(release): v2.0.0-beta.1"
```

### 5.2 Publicar Release

```bash
# 1. Tag
git tag -a v2.0.0-beta.1 -m "Release v2.0.0-beta.1"

# 2. Push
git push origin main --tags

# 3. Criar GitHub Release
gh release create v2.0.0-beta.1 \
  --title "v2.0.0-beta.1" \
  --notes-file /tmp/release-notes.md
```

### 5.3 Publicar no npm (opcional)

```bash
npm publish
```

---

## 6. Rollback

### 6.1 Se release for problemática

```bash
# 1. Reverter tag
git tag -d v2.0.0-beta.1
git push origin :refs/tags/v2.0.0-beta.1

# 2. Reverter commit
git revert HEAD
git push origin main
```

### 6.2 Hotfix

```bash
# Criar branch de hotfix
git checkout -b hotfix/2.0.0-beta.2

# Aplicar correção
# ...

# Nova release
npm version 2.0.0-beta.2
git push origin hotfix/2.0.0-beta.2 --tags
```

---

## 7. Pós-Release

### 7.1 Comunicação

- Atualizar documentação com nova versão
- Anunciar em canais de comunicação
- Coletar feedback dos beta testers

### 7.2 Monitoramento

- Acompanhar issues no GitHub
- Monitorar CI/CD
- Acompanhar métricas de qualidade

---

## 8. Referências

- [`docs/quality-gates.md`](quality-gates.md)
- [`docs/testing.md`](testing.md)
- [`CHANGELOG.md`](../CHANGELOG.md)
