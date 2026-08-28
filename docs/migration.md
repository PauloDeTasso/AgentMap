# Migração v1.x → v2.0

> **Versão:** 2.0.0  
> **Data:** 2026-08-28  
> **Branch:** v0044  
> **Breaking Changes:** Sim

---

## 1. Resumo da Mudança

O AgentMap v2.0 muda de **sistema multi-tenant centralizado** para **template/base por projeto**.

### O que mudou

| Aspecto | v1.x (Multi-tenant) | v2.0 (Single-project) |
|---------|---------------------|----------------------|
| **Arquitetura** | Backend central serve múltiplos projetos | Cada projeto tem seu próprio backend |
| **Projetos** | Gerenciados via API (`abrir/fechar`) | Auto-contidos, sem estado compartilhado |
| **Configuração** | `GERENCIADOR_DIR`, `cachedSettings` global | `agentmap.json` local por projeto |
| **Middleware** | `projectMiddleware` complexo | Simplificado ou removido |
| **Serviços** | `ProjetoService` como façade (~500 linhas) | Services por domínio (~50 linhas) |
| **Frontend** | Acoplado ao backend | Pode ser separado |
| **Dados** | `~30` serviços por request | `~10` serviços por request |

### O que NÃO mudou

- Estrutura da pasta `.ia/` (contratos, tarefas, agentes, etc.)
- Formato dos arquivos JSON de governança
- Comandos CLI (`agentmap init`, `agentmap update`)
- Integração com Kilo Code / MCP
- Protocolo de comunicação entre agentes

---

## 2. Breaking Changes

### 2.1 Removidos

| Item | Alternativa |
|------|-------------|
| `ProjetoService` como façade global | Usar services específicos por domínio |
| `projectMiddleware` | Não necessário (single-project) |
| `GERENCIADOR_DIR` | Config local em `.ia/agentmap.json` |
| `cachedSettings` global | Config singleton por projeto |
| `ProjetoService.abrirProjeto()` | Não existe mais (projeto sempre "aberto") |
| `ProjetoService.fecharProjeto()` | Não existe mais |

### 2.2 Alterados

| Item | v1.x | v2.0 |
|------|------|------|
| Bootstrap | `createApp()` com middleware | `createServices()` singleton |
| Rotas | `app.use(projectMiddleware)` | `app.use('/api', apiRouter)` |
| Testes | `createApp()` | `createApp(servicos, projetoService)` |

---

## 3. Passos de Migração

### 3.1 Projetos Novos

Projetos novos **não precisam de migração**. Use `agentmap init` para criar um projeto com a arquitetura v2.0.

```bash
agentmap init --force
```

### 3.2 Projetos Existentes (v1.x)

#### Passo 1: Backup

```bash
# Backup completo do projeto
git checkout -b backup/v1-migracao
git add .
git commit -m "backup: estado antes da migração v2.0"
```

#### Passo 2: Atualizar Código

```bash
# Atualizar dependências
cd backend
npm install

# Atualizar código para nova assinatura
# Antes: createApp()
# Depois: createApp(servicos, projetoService)
```

**Alterações manuais necessárias:**
- Atualizar testes para nova assinatura `createApp(servicos, projetoService)`
- Remover uso de `ProjetoService` como façade
- Atualizar imports para novo local dos services

#### Passo 3: Atualizar Configuração

```bash
# Remover referências a GERENCIADOR_DIR
# Remover cachedSettings global
# Atualizar .ia/agentmap.json com nova estrutura
```

#### Passo 4: Atualizar Dependências

```bash
cd backend
npm update
```

#### Passo 5: Validar

```bash
# Verificar integridade
agentmap doctor

# Rodar quality gates
npm run quality

# Testar MCP
npm run mcp
```

---

## 4. Checklist de Migração

- [ ] Backup do projeto criado
- [ ] `npm install` executado
- [ ] Testes atualizados para nova assinatura
- [ ] `ProjetoService` atualizado para services por domínio
- [ ] `projectMiddleware` removido ou simplificado
- [ ] `GERENCIADOR_DIR` removido da configuração
- [ ] `.ia/agentmap.json` atualizado
- [ ] `agentmap doctor` passa sem erros
- [ ] `npm run quality` passa
- [ ] MCP server inicia corretamente
- [ ] Frontend acessível

---

## 5. Rollback

Se necessário, reverta para o backup:

```bash
git checkout backup/v1-migracao
```

---

## 6. Suporte

Se encontrar problemas durante a migração:

1. Consulte [`docs/troubleshooting.md`](troubleshooting.md)
2. Abra uma issue no repositório
3. Consulte [`docs/development.md`](development.md)

---

## 7. Referências

- [`docs/architecture.md`](architecture.md)
- [`PLANO GERAL/UPDATE/v0044/execucao-pratica.md`](../PLANO%20GERAL/UPDATE/v0044/execucao-pratica.md)
- [`.ia/qualidade/plano-final-revisado.md`](../.ia/qualidade/plano-final-revisado.md)
