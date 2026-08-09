# Guia de Consulta Rápida — Monitoramento do AgentMap

**Versão:** 1.0  
**Data:** 2026-08-13  
**Destinatário:** Todos os usuários

---

## 1. Comandos Mais Usados

### Backend

```bash
cd backend
npm run dev           # Iniciar backend
npx tsc --noEmit      # Verificar TypeScript
npm run build         # Compilar
```

### Agent Manager

```bash
# O paralelismo real é via Agent Manager (extensão VS Code)
# Cria worktrees isolados para cada agente
# Use as MCP tools: agent_manager
```

### API

```bash
# Health
curl http://localhost:3150/api/health

# Tarefas
curl http://localhost:3150/api/tarefas

# Handoffs
curl http://localhost:3150/api/handoffs

# Monitoramento
curl http://localhost:3150/api/monitoramento/mensagens
curl http://localhost:3150/api/monitoramento/agentes

# Modo
curl -X POST http://localhost:3150/api/monitoramento/modo \
  -H "Content-Type: application/json" \
  -d '{"modo":"AUTONOMA","escopo":"GLOBAL"}'
```

---

## 2. Modos de Operação

| Modo | Aprovação | Auto-execute | Quando usar |
|------|-----------|--------------|-------------|
| **AUTOMÁTICO** | Nunca | Todas | Testes, deploys simples |
| **HÍBRIDO** | Apenas críticas | Não-críticas | Uso diário normal |
| **MANUAL** | Sempre | Nenhuma | Ações destrutivas, alta segurança |

### Ações Críticas (sempre aprovadas no HÍBRIDO):
- Deploy para produção
- Drop de tabelas
- Comandos destrutivos (`rm`, `delete massivo`)
- Mudanças de schema

---

## 3. Códigos de Cor dos Status

| Status | Cor | Hex |
|--------|-----|-----|
| ATIVO | Verde | `#238636` |
| AGUARDANDO | Amarelo | `#d29922` |
| ERRO | Vermelho | `#f85178` |
| DISPONÍVEL | Azul | `#388bfd` |
| OFFLINE | Cinza | `#6e7681` |

---

## 4. Tipos de Mensagem

| Tipo | Emissor | Ação do Usuário |
|------|---------|-----------------|
| `TAREFA_INICIADA` | Agente | Nenhuma |
| `TAREFA_EM_EXECUCAO` | Agente | Pausar, Cancelar |
| `TAREFA_CONCLUIDA` | Agente | Aprovar, Reexecutar |
| `TAREFA_FALHOU` | Agente | Retry, Ver logs |
| `ERRO` | Agente | Ver detalhes |
| `SOLICITAR_APROVACAO` | Agente | ✅ Aprovar, ❌ Rejeitar |
| `ATUALIZAR_STATUS` | Agente | Nenhuma |
| `INTERVENCAO_USUARIO` | Usuário | Nenhuma |
| `MODO_ALTERADO` | Sistema | Nenhuma |
| `AGENTE_STATUS_ALTERADO` | Sistema | Nenhuma |

---

## 5. Atalhos da Interface

| Atalho | Ação |
|--------|------|
| `↓` (botão canto inferior) | Pausar/retomar auto-scroll |
| `Enter` no input | Enviar mensagem |
| Filto por agente | Filtrar mensagens do agente |
| Filto por tipo | Filtrar por tipo de mensagem |
| Clique em ✅ | Aprovar ação |
| Clique em ❌ | Rejeitar ação |
| Clique em ⏸️ | Pausar tarefa/agente |

---

## 6. Estrutura de Arquivos

```
AgentMap/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── admin.ts          # /api/admin/*
│   │   │   ├── monitoramento.ts  # /api/monitoramento/*
│   │   │   ├── health.ts         # /api/health
│   │   │   └── ...               # demais rotas
│   │   ├── servicos/
│   │   │   ├── MonitoramentoService.ts
│   │   │   └── ...
│   │   ├── websocket/
│   │   │   └── monitoramento.ts  # WebSocket server
│   │   ├── app.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── monitoramento.html
│   ├── css/
│   │   ├── monitoramento.css
│   │   └── style.css
│   ├── js/
│   │   ├── monitoramento.js
│   │   └── script.js
│   └── index.html
│
└── (Projeto PAGINA_PESSOAL)/
    └── .ia/
        ├── agentes/
        │   └── {agenteId}.json
        ├── tarefas/
        │   └── tarefas.json
        ├── handoffs/
        │   ├── handoffs.json
        │   └── HOF-2026-*.json
        ├── outbox/
        │   └── {agenteId}/
        │       ├── prompt.md
        │       ├── enviado/
        │       └── erros/
        ├── configuracao/
        │   ├── agentes-config.json
        │   └── transicoes.json
        ├── contexto/
        │   ├── dispatch-log.json
        │   └── status/
        │       └── {agenteId}.json
        ├── eventos/
        │   └── eventos.json
        ├── docs/
        │   └── guias/
        │       ├── guia-usuario-monitoramento.md
        │       ├── guia-agentes-monitoramento.md
        │       ├── guia-novos-agentes-monitoramento.md
        │       ├── guia-tools-monitoramento.md
        │       └── quick-reference.md
        └── procedimentos/
            └── interface-monitoramento-chat.md
```

---

## 7. Endpoints WebSocket

| Evento Enviado | Evento Recebido |
|----------------|-----------------|
| `ping` | `pong` |
| `{type: "solicitar_mensagens"}` | `{type: "mensagens", data: [...]}` |
| `{type: "solicitar_agentes"}` | `{type: "agentes", data: [...]}` |

### Broadcasts Automáticos

- `mensagem_nova` — nova mensagem no chat
- `agente_status_alterado` — lista atualizada de agentes
- `MODO_ALTERADO` — modo de operação alterado

---

## 8. Troubleshooting Rápido

| Problema | Solução Rápida |
|----------|----------------|
| WebSocket desconectado | Reinicie backend (`Ctrl+C`, `npm run dev`) |
| Mensagens não aparecem | Verifique filtros — reset para "todos" |
| Dispatch trava | Usar `execSync` não `execa` (problema conhecido Windows) |
| Kilo pula permissões | Adicione `--auto` para agentes com `autoApprove: true` |
| Kilo sem créditos | Adicionar créditos na conta Kilo |
| TypeScript error | `cd backend; npx tsc --noEmit` |
| Porta ocupada | `Get-Process node \| Stop-Process -Force` |
