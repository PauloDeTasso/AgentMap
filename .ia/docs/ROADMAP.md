# ROADMAP E STATUS DO AGENTMAP
## Branch: v0007 | Data: 2026-08-15

---

## 1. ESTADO ATUAL

### Branch v0006 (estável, no GitHub)
- Auditoria completa aplicada
- Build limpo, testes verdes
- Documentação consolidada
- PR pendente para `main`

### Branch v0007 (em desenvolvimento)
- Criado a partir de `v0006`
- Próximas correções serão aplicadas aqui

---

## 2. PENDÊNCIAS PRIORITÁRIAS (v0007)

### P0 — Crítico (segurança)

| # | Tarefa | Worktree | Responsável | Status |
|---|--------|----------|-------------|--------|
| 1 | Corrigir command injection em `/api/arquivos/explorer` | `fix/command-injection-explorer` | Agente backend | 🔄 Em andamento |
| 2 | Implementar `verifyClient` no WebSocket | `fix/websocket-verify-client` | Agente backend | 🔄 Em andamento |

### P1 — Alto (qualidade)

| # | Tarefa | Worktree | Responsável | Status |
|---|--------|----------|-------------|--------|
| 4 | Corrigir schemas inconsistentes (prioridade, agente-perfil, evento, contrato) | `fix/schemas-inconsistentes` | Agente backend | 🔄 Em andamento |

### P2 — Médio (melhorias)

| # | Tarefa | Worktree | Responsável | Status |
|---|--------|----------|-------------|--------|
| 6 | Corrigir `aprovacao.estado` fantasma e `getDirPorEstado` fallback | — | — | ⏳ Pendente |
| 7 | Remover testes de código deprecated | — | — | ⏳ Pendente |

---

## 3. COMO RETOMAR O TRABALHO

### Se você é um agente novo:

1. **Leia primeiro:** `.ia/docs/GUIA_INICIAL_AGENTES.md`
2. **Verifique pendências:** este arquivo (`ROADMAP.md`)
3. **Consulte o contexto:** `.ia/contexto/fluxo-trabalho.md`

### Se você é um agente executor:

1. Verifique se há worktree atribuída para sua tarefa
2. Consulte o checklist no início de cada ciclo
3. Use apenas MCP tools e API REST (não há CLI `kilo`)
4. Registre handoffs, aprendizados e bloqueios

---

## 4. COMANDOS ÚTEIS

```bash
# Verificar branch atual
git branch --show-current

# Verificar status
git status

# Ver worktrees do Agent Manager
agent_manager list

# Build e testes
cd backend
npm run build
npm test

# Criar commit
git add -A
git commit -m "feat: descrição"
```

---

## 5. ESTRUTURA DE BRANCHES

```
main (produção)
  └── v0006 (estável, com PR aberto)
       └── v0007 (desenvolvimento atual)
            ├── fix/command-injection-explorer
            ├── fix/websocket-verify-client
            └── fix/schemas-inconsistentes
```

---

## 6. PRINCIPIS QUE NÃO MUDAM

1. **O arquivo é a verdade** — não confie em estado em memória
2. **Git é somente leitura** para agentes (consulta)
3. **Validação antes de escrita** — sempre valide antes de persistir
4. **Auditoria de tudo** — registre ações importantes
5. **Segurança primeiro** — path traversal, secrets, validação de input
6. **Worktree é o paralelismo real** — não use CLI inexistente
7. **Documente o que fez** — handoffs, aprendizados, artefatos

---

**Última atualização:** 2026-08-15  
**Branch ativo:** v0007  
**Próximo milestone:** Resolver P0 e P1, então merge para main
