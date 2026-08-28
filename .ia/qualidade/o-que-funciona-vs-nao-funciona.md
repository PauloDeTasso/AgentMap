# O Que o AgentMap Tem Hoje vs O Que Terá na v2.0

> **Versão:** 2.0.0  
> **Data:** 2026-08-28  
> **Branch:** v0044  
> **Status:** Antes da implementação

---

## 1. O Que VAI FUNCIONAR (mantido ou melhorado)

| # | Funcionalidade | Status | Observação |
|---|----------------|--------|------------|
| 1 | CRUD de Tarefas | ✅ Mantido | Sem mudanças |
| 2 | CRUD de Agentes | ✅ Mantido | Sem mudanças |
| 3 | Handoffs entre agentes | ✅ Mantido | Sem mudanças |
| 4 | Eventos e mensagens | ✅ Mantido | Sem mudanças |
| 5 | Checkpoints | ✅ Mantido | Sem mudanças |
| 6 | Riscos | ✅ Mantido | Sem mudanças |
| 7 | Bloqueios | ✅ Mantido | Sem mudanças |
| 8 | Pendencias | ✅ Mantido | Sem mudanças |
| 9 | Reservas | ✅ Mantido | Sem mudanças |
| 10 | Decisões | ✅ Mantido | Sem mudanças |
| 11 | Dependências | ✅ Mantido | Sem mudanças |
| 12 | Responsabilidades | ✅ Mantido | Sem mudanças |
| 13 | Artefatos | ✅ Mantido | Sem mudanças |
| 14 | Resultados | ✅ Mantido | Sem mudanças |
| 15 | Critérios | ✅ Mantido | Sem mudanças |
| 16 | Aprendizados | ✅ Mantido | Sem mudanças |
| 17 | Validações | ✅ Mantido | Sem mudanças |
| 18 | Conflitos | ✅ Mantido | Sem mudanças |
| 19 | Auditoria | ✅ Mantido | Sem mudanças |
| 20 | Solicitações | ✅ Mantido | Sem mudanças |
| 21 | Instâncias | ✅ Mantido | Sem mudanças |
| 22 | Estado do projeto | ✅ Mantido | Sem mudanças |
| 23 | Conhecimento | ✅ Mantido | Sem mudanças |
| 24 | Contatos | ✅ Mantido | Sem mudanças |
| 25 | Monitoramento | ✅ Mantido | Sem mudanças |
| 26 | MCP Tools (170+) | ✅ Mantido | Mesmas tools, por projeto |
| 27 | HTTP API | ✅ Mantido | Rotas simplificadas |
| 28 | OpenTelemetry | ✅ Mantido | Mesma configuração |
| 29 | Git (somente leitura) | ✅ Mantido | Mesma funcionalidade |
| 30 | Validação Zod | ✅ Mantido | Sem mudanças |
| 31 | JSON Schemas | ✅ Mantido | Sem mudanças |
| 32 | Path traversal protection | ✅ Mantido | Sem mudanças |
| 33 | CORS | ✅ Mantido | Sem mudanças |
| 34 | Frontend web | ✅ Mantido | Melhorado |
| 35 | Templates de agentes | ✅ Mantido | Melhorado |
| 36 | Fluxo de trabalho | ✅ Mantido | Mesmas 11 fases |
| 37 | Contratos | ✅ Mantido | Sem mudanças |
| 38 | Governança | ✅ Mantido | Melhorada |
| 39 | `agentmap init` | 🆕 Novo | Inicializa em projeto existente |
| 40 | `agentmap update` | 🆕 Novo | Atualiza template preservando edições |
| 41 | `agentmap status` | 🆕 Novo | Mostra status de sincronização |
| 42 | `agentmap doctor` | 🆕 Novo | Valida integridade da instalação |
| 43 | `agentmap repair` | 🆕 Novo | Repara problemas automaticamente |
| 44 | Template distribuível | 🆕 Novo | Copiar e colar funciona |
| 45 | Multi-projeto real | 🆕 Novo | Cada projeto isolado |
| 46 | Offline-first verdadeiro | 🆕 Novo | Sem servidor central |
| 47 | Versionamento por projeto | 🆕 Novo | Cada projeto versiona seu AgentMap |
| 48 | `.kilo/agents/agentmap/` | 🆕 Novo | Agentes customizados |
| 49 | `.kilo/rules/agentmap/` | 🆕 Novo | Regras customizadas |
| 50 | `.kilo/commands/agentmap/` | 🆕 Novo | Comandos slash |

---

## 2. O Que NÃO VAI FUNCIONAR (removido)

| # | Funcionalidade | Status | Motivo |
|---|----------------|--------|--------|
| 1 | `ProjetoService` como façade global | ❌ Removido | Substituído por módulos por domínio |
| 2 | `projectMiddleware` | ❌ Removido | Serviços singleton |
| 3 | `GERENCIADOR_DIR` | ❌ Removido | Substituído por `.ia/agentmap.json` |
| 4 | `cachedSettings` global | ❌ Removido | Settings local |
| 5 | Abertura de projetos | ❌ Removido | Sempre é o projeto local |
| 6 | Fechamento de projetos | ❌ Removido | Sempre é o projeto local |
| 7 | Multi-tenant centralizado | ❌ Removido | Cada projeto é independente |
| 8 | Gerenciador de projetos | ❌ Removido | Não faz sentido em single-project |
| 9 | `POST /api/projetos/abrir` | ❌ Removido | Não necessário |
| 10 | `POST /api/projetos/fechar` | ❌ Removido | Não necessário |
| 11 | `GET /api/projetos/scan` | ❌ Removido | Não faz sentido |
| 12 | `GET /api/projetos/atual` | ❌ Removido | Sempre é o local |
| 13 | `GET /api/admin/transicoes` | ❌ Removido | Movido para config local |
| 14 | `PUT /api/admin/transicoes` | ❌ Removido | Movido para config local |
| 15 | `GET /api/admin/cors` | ❌ Removido | Movido para config local |
| 16 | `PUT /api/admin/cors` | ❌ Removido | Movido para config local |
| 17 | `agentmap_projetos_abrir` (MCP) | ❌ Removida | Não necessário |
| 18 | `agentmap_projetos_fechar` (MCP) | ❌ Removida | Não necessário |
| 19 | `agentmap_projetos_scan` (MCP) | ❌ Removida | Não faz sentido |
| 20 | `agentmap_projetos_atual` (MCP) | ❌ Removida | Sempre é o local |
| 21 | `agentmap_admin_transicoes` (MCP) | ❌ Removida | Movido para config |
| 22 | `agentmap_admin_cors` (MCP) | ❌ Removida | Movido para config |
| 23 | Auto-abertura do projeto sistema | ❌ Removido | MCP carrega `.ia/` local |
| 24 | `.local/` (pasta de dados) | ❌ Removida | Dados em `.ia/` |
| 25 | `backend/scripts/auditoria-tools.ts` | ❌ Removido | Ferramentas são MCP tools |
| 26 | Visão consolidada de projetos | ❌ Removido | Cada projeto é isolado |
| 27 | API de gerenciamento central | ❌ Removido | Não existe instância central |
| 28 | `kilo.jsonc` duplicado (raiz + `.kilo/`) | ❌ Removido | Consolidado em `kilo.jsonc` raiz |
| 29 | `AGENTS.md` global único | ❌ Removido | `AGENTS.md` por projeto |
| 30 | Configuração global (`backend/src/config/index.ts`) | ❌ Removida | Config local em `.ia/agentmap.json` |

---

## 3. Resumo Visual

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENTMAP v1.x (ATUAL)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ 38 funcionalidades mantidas                             │
│  ✅ 170+ MCP tools                                          │
│  ✅ HTTP API                                                │
│  ✅ Frontend                                                │
│                                                             │
│  ❌ 30 funcionalidades removidas                            │
│  ❌ Multi-tenant                                            │
│  ❌ Gerenciamento central                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    AGENTMAP v2.0 (NOVA)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ 50 funcionalidades (38 mantidas + 12 novas)             │
│  ✅ 170+ MCP tools                                          │
│  ✅ HTTP API                                                │
│  ✅ Frontend                                                │
│  ✅ Template distribuível                                   │
│  ✅ Copiar e colar funciona                                 │
│  ✅ Multi-projeto real (isolado)                            │
│  ✅ Offline-first verdadeiro                                │
│                                                             │
│  ❌ 30 funcionalidades removidas                            │
│  ❌ Multi-tenant                                            │
│  ❌ Gerenciamento central                                   │
│  ❌ Projeto aberto/fechado                                  │
│  ❌ `agentmap init` obrigatório                             │
│  ❌ `npm run build` obrigatório                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Matriz de Impacto

| Categoria | O Que Perde | O Que Ganha | Impacto |
|-----------|-------------|-------------|---------|
| **Usuário atual** | Gerenciamento multi-projeto | Template portátil | Médio |
| **Novo usuário** | Nada | Tudo funciona imediatamente | Baixo |
| **Desenvolvedor** | `ProjetoService` global | Módulos por domínio | Baixo |
| **Equipe** | Visão consolidada | Projetos isolados | Médio |
| **Performance** | Complexidade multi-tenant | Backend mais rápido | Alto |
| **Manutenibilidade** | Atualizações duplicadas | Template único | Alto |
| **Escalabilidade** | Servidor central | Servidores independentes | Alto |

---

## 5. Critérios de Sucesso

### 5.1 O Que Deve Funcionar Imediatamente

- [ ] Copiar `.ia/`, `.kilo/`, `AGENTS.md`, `kilo.jsonc` para projeto novo
- [ ] Kilo Code reconhece agentes automaticamente
- [ ] MCP tools funcionam sem configuração adicional
- [ ] Tarefas, handoffs, eventos funcionam
- [ ] Frontend funciona em `localhost:3150`

### 5.2 O Que Não Deve Existir

- [ ] `ProjetoService` como façade global
- [ ] `projectMiddleware`
- [ ] `GERENCIADOR_DIR`
- [ ] `cachedSettings`
- [ ] APIs de abertura/fechamento de projeto
- [ ] Multi-tenant centralizado

---

## 6. Próxima Ação

1. ✅ Lista de o que funciona/não funciona criada
2. 🔄 **Implementar Fase 0 (spike)** — validar que a arquitetura funciona
3. ⏳ Implementar Fase 1 (core simplificado)
4. ⏳ Implementar Fase 2 (Kilo integration)
5. ⏳ Implementar Fase 3 (testes + CI/CD)
6. ⏳ Implementar Fase 4 (documentação + release)

---

*Documento baseado em `PLANO GERAL/UPDATE/v0044/execucao-pratica.md`*  
*Branch: v0044 | Data: 2026-08-28*
