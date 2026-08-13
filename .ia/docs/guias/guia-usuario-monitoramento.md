# Guia do Usuário Humano — Monitoramento do AgentMap

**Versão:** 1.0  
**Data:** 2026-08-13  
**Destinatário:** Arquiteto / Gerente de Projetos / Usuário final

---

## 1. Como Acessar

1. **Start o backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Abra no navegador:**
   ```
   http://localhost:3150/monitoramento.html
   ```

3. A interface se conecta automaticamente ao WebSocket na porta 3150.

---

## 2. Interface de Monitoramento

### Layout Principal

```
┌─────────────────────────────────────────────────────────────┐
│  AgentMap - Monitoramento             [🔴 WebSocket Conectado]│
├────────────────┬──────────────────────────────────────────────┤
│  Agentes       │  Chat / Monitoramento                        │
│  (sidebar)     │                                              │
│  🟢 Frontend   │  ┌─────────────────────────────────────────┐ │
│  🟡 Backend    │  │ 🤖 Frontend                             │ │
│  🔴 DBA        │  │ 🕒 14:32                                │ │
│  ⚪ Admin      │  │ TAREFA_CONCLUIDA                         │ │
│  ⚪ Arquiteto  │  │ Implementacao finalizada                 │ │
│                │  └─────────────────────────────────────────┘ │
│                │  ┌─────────────────────────────────────────┐ │
│                │  │ 👤 Voce (Arquiteto)                     │ │
│                │  │ MODAL_alterado                          │ │
│                │  └─────────────────────────────────────────┘ │
│                │                                              │
├────────────────┼──────────────────────────────────────────────┤
│  Modo: [AUTO]  │  [Digite mensagem...]  [Enviar]              │
│  [PAUSAR]      │                                              │
└────────────────┴──────────────────────────────────────────────┘
```

### Elementos da Interface

| Elemento | Descrição |
|----------|-----------|
| **Header** | Título, status de conexão WebSocket |
| **Nav** | Modo de operação + botão de pausar auto-scroll |
| **Sidebar de Agentes** | Lista de agentes com status colorido e tarefa atual |
| **Área de Chat** | Mensagens em tempo real com tipos coloridos |
| **Filtros** | Filtrar por agente e tipo de mensagem |
| **Input** | Digite mensagens/comandos para agentes |
| **Botão de Scroll** | Pausar/retomar auto-scroll + badge de novas mensagens |

---

## 3. Como Interpretar o Chat

### Tipos de Mensagem

| Tipo | Cor | Descrição |
|------|-----|-----------|
| `TAREFA_INICIADA` | Azul | Um agente começou uma tarefa |
| `TAREFA_EM_EXECUCAO` | Azul | Tarefa em andamento (com progresso) |
| `TAREFA_CONCLUIDA` | Verde | Tarefa finalizada com sucesso |
| `TAREFA_FALHOU` | Vermelho | Tarefa falhou — requer atenção |
| `ERRO` | Vermelho | Erro de agente ou sistema |
| `SOLICITAR_APROVACAO` | Amarelo | Agente precisa de sua aprovação |
| `SOLICITAR_DECISAO` | Amarelo | Agente precisa de sua decisão |
| `ATUALIZAR_STATUS` | Cinza | Agente reportou progresso |
| `INTERVENCAO_USUARIO` | Roxo | Sua intervenção foi registrada |
| `MODO_ALTERADO` | Azul-claro | Modo de operação alterado |
| `AGENTE_STATUS_ALTERADO` | Cinza | Status de um agente mudou |
| `CONECTADO` | Cinza | Sistema — conexão estabelecida |

### Status dos Agentes (Sidebar)

| Cor | Significado |
|-----|-------------|
| 🟢 Verde | ATIVO — agente está executando uma tarefa |
| 🟡 Amarelo | AGUARDANDO — agente aguarda sua aprovação/decisão |
| 🔴 Vermelho | ERRO — agente encontrou um erro |
| ⚪ Azul | DISPONÍVEL — agente está pronto para receber tarefas |
| ⚫ Cinza | OFFLINE — agente não está conectado |

---

## 4. Como Usar os Filtros

### Filtrar por Agente

1. Clique na lista suspensa **"Todos os agentes"** no topo da área de chat.
2. Selecione um agente específico (ex: "frontend").
3. Apenas mensagens desse agente serão exibidas.
4. Para ver todas, volte para "Todos os agentes".

### Filtrar por Tipo

1. Clique na lista suspensa **"Todos os tipos"**.
2. Selecione um tipo (ex: "ERRO", "TAREFA_CONCLUIDA").
3. Apenas mensagens desse tipo serão exibidas.

---

## 5. Como Alterar Modos de Operação

### Botões de Modo (Nav)

| Botão | Modo | Comportamento |
|-------|------|---------------|
| **AUTOMÁTICO** | Todos os agentes executam sem intervenção. Ideal para testes e tarefas repetitivas. |
| **HÍBRIDO** | Agentes executam automaticamente, mas ações críticas pedem aprovação. |
| **MANUAL** | Todas as ações requerem sua aprovação antes de executar. |

### Como Alterar

Clique no botão do modo desejado. O botão ativo ficará destacado em azul. A mudança é imediata e afeta todos os agentes.

### Ações Críticas (bloqueio no HÍBRIDO)

No modo HÍBRIDO, estas ações pedem aprovação:
- Alterações em produção
- Mudanças de schema de banco
- Deploys
- Comandos destrutivos (`rm`, `drop`, `delete massivo`)

---

## 6. Como Intervir Manualmente

### Botões de Ação em Mensagens

Cada mensagem de agente pode conter botões de ação:

| Botão | Ação |
|-------|------|
| ✅ Aprovar | Aprova a ação solicitada |
| ❌ Rejeitar | Rejeita a ação solicitada |
| ⏸️ Pausar | Pausa a tarefa atual |
| ▶️ Retomar | Retoma a tarefa pausada |
| 🔄 Reexecutar | Reexecuta a tarefa |
| ❌ Cancelar | Cancela a tarefa/agente |
| ↗️ Redirecionar | Envia a tarefa para outro agente |

### Como Enviar Comandos

1. Digite no campo de texto: `/pausar frontend`
2. O comando será enviado para o sistema e processado.

### Pausar/Retomar Auto-scroll

- Clique no **botão de scroll** (↓) no canto inferior direito.
- Quando pausado, uma **badge com número de novas mensagens** aparece.
- Clique novamente para retomar e rolar até a última mensagem.

---

## 7. Troubleshooting Básico

| Problema | Solução |
|----------|---------|
| WebSocket desconectado | Verifique se o backend está rodando (`npm run dev`) |
| Nenhuma mensagem aparece | Verifique os filtros — clique em "Todos os agentes" e "Todos os tipos" |
| Agente mostra como offline | O agente não está conectado ao sistema. Verifique o processo do agente. |
| Modo não altera | Clique novamente no botão do modo desejado. O botão ativo indica o modo atual. |
| Mensagens não atualizam | Clique no botão de scroll para retomar auto-scroll. |
| Erro 500 na API | Reinicie o backend e verifique os logs no terminal. |

---

## 8. Acesso Rápido

- **Interface:** http://localhost:3150/monitoramento.html
- **API Health:** http://localhost:3150/api/health
- **API Mensagens:** http://localhost:3150/api/monitoramento/mensagens
- **API Agentes:** http://localhost:3150/api/monitoramento/agentes
- **API Modo:** http://localhost:3150/api/monitoramento/modo
- **WebSocket:** ws://localhost:3150/ws/monitoramento
