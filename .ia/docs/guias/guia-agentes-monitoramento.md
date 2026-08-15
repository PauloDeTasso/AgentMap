# Guia dos Agentes Existentes — Monitoramento do AgentMap

**Versão:** 1.0  
**Data:** 2026-08-13  
**Destinatário:** Agentes existentes do AgentMap (frontend, backend, dba, arquiteto, admin)

---

## 1. Como Reportar Status

### Via WebSocket (Recomendado)

Se conectado via WebSocket ao `/ws/monitoramento`, envie:

```json
{
  "type": "solicitar_agentes"
}
→ Resposta: { "type": "agentes", "data": [...] }
```

### Via REST API

Atualize status do agente:

```
PUT /api/monitoramento/agente/{agenteId}/status
```

**Body:**
```json
{
  "status": "ATIVO",
  "conteudo": "Iniciando implementacao da tela de login",
  "tipo": "TAREFA_INICIADA",
  "tarefaId": "TAR-2026-00001",
  "progresso": 0,
  "acoes": [
    { "label": "Ver detalhes", "comando": "VER_DETALHES", "estilo": "info" }
  ]
}
```

### Status Válidos

| Status | Quando usar |
|--------|-------------|
| `ATIVO` | Executando uma tarefa |
| `AGUARDANDO` | Esperando aprovação/decisão humana |
| `ERRO` | Encontrou um erro que precisa de atenção |
| `OFFLINE` | Agente indisponível |
| `DISPONIVEL` | Livre para receber tarefas |

---

## 2. Comandos Disponíveis via MCP/API

Quando um agente está operando, ele pode reportar status usando estas ferramentas:

### Formato MCP 2026

As tools do AgentMap seguem o padrão MCP 2026:
- **Sucesso:** `content` (texto JSON) + `structuredContent` (dados validados por `outputSchema`)
- **Erro:** `content` + `isError: true` com mensagem acionável para auto-correção
- **Validação:** `inputSchema` Zod valida argumentos antes da execução
- **Anotações:** tools read-only usam `readOnlyHint: true`

### Comandos via MCP Tools

- `agentmap_tarefas_contexto` — obtém contexto completo da tarefa
- `agentmap_workflows_iniciar_trabalho` — inicia trabalho validando agente + tarefa
- `agentmap_workflows_finalizar_trabalho` — finaliza trabalho registrando resultado e handoff
- `agentmap_workflows_consultar_pendencias` — consulta pendências, handoffs, validações, bloqueios
- `agentmap_handoffs_criar` — cria handoff para próximo agente
- `agentmap_eventos_listar` — lista eventos pendentes
- `agentmap_eventos_confirmar` — confirma consumo de evento
- `agentmap_sessoes_criar` — cria sessão de trabalho
- `agentmap_sessoes_finalizar` — finaliza sessão
- `agentmap_tarefas_alterar_estado` — altera estado da tarefa
- `agentmap_bloqueios_criar` — registra bloqueio
- `agentmap_riscos_criar` — registra risco
- `agentmap_decisoes_criar` — registra decisão
- `agentmap_aprendizados_criar` — registra aprendizado

### Comandos via API REST

- `PUT /api/monitoramento/agente/{agenteId}/status` — atualiza status do agente
- `POST /api/handoffs` — cria handoff
- `POST /api/tarefas/:id/estado` — altera estado da tarefa
- `WebSocket /ws/monitoramento` — comunicação em tempo real

| Comando | Uso | Exemplo |
|---------|-----|---------|
| `ATUALIZAR_STATUS` | Reportar progresso de uma tarefa | `ATUALIZAR_STATUS: 50% concluído` |
| `TAREFA_FINALIZADA` | Marcar tarefa como concluída | `TAREFA_FINALIZADA: Implementação concluída` |
| `TAREFA_CONCLUIDA` | Sinônimo de TAREFA_FINALIZADA | `TAREFA_CONCLUIDA` |
| `ERRO` | Reportar um erro | `ERRO: Falha na conexão com banco` |
| `SOLICITAR_APROVACAO` | Pedir aprovação para ação crítica | `SOLICITAR_APROVACAO: Deploy para produção` |
| `SOLICITAR_DECISAO` | Pedir decisão humana | `SOLICITAR_DECISAO: Qual arquitetura usar?` |
| `LER_HANDOFF` | Sinalizar que leu um handoff | `LER_HANDOFF: HOF-2026-00001` |

---

## 3. Como Atualizar Status Via API

### Endpoint

```
PUT /api/monitoramento/agente/{agenteId}/status
```

### Exemplo — Agente em Execução

```bash
curl -X PUT http://localhost:3150/api/monitoramento/agente/backend/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ATIVO",
    "tarefaId": "TAR-2026-00015",
    "conteudo": "Criando WebSocket server",
    "tipo": "TAREFA_EM_EXECUCAO",
    "progresso": 30,
    "acoes": [
      { "label": "Pausar", "comando": "PAUSAR_TAREFA", "estilo": "pausar" },
      { "label": "Ver logs", "comando": "VER_LOGS", "estilo": "info" }
    ]
  }'
```

### Exemplo — Tarefa Concluída

```bash
curl -X PUT http://localhost:3150/api/monitoramento/agente/backend/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "DISPONIVEL",
    "tarefaId": "TAR-2026-00015",
    "conteudo": "Tarefa concluida com sucesso",
    "tipo": "TAREFA_CONCLUIDA",
    "progresso": 100
  }'
```

---

## 4. Como Criar Handoffs Via API

```
POST /api/handoffs
```

**Body:**
```json
{
  "origem": "backend",
  "destino": "frontend",
  "tarefaId": "TAR-2026-00001",
  "resumo": "API de login pronta para consumo",
  "concluido": ["Implementado endpoint /api/auth/login"],
  "pendente": [],
  "observacoes": "Consuma http://localhost:3150/api/auth/login"
}
```

O evento `HANDOFF_CRIADO` é automaticamente gerado e visível no monitoramento.

---

## 5. Como Respeitar o Modo de Operação

### Modo AUTONOMO

- Execute tarefas sem aprovação humana quando dentro do escopo autorizado.
- Reporte status via API/WebSocket.
- Registre ações na auditoria.

### Modo ASSISTIDA

- Execute tarefas normalmente.
- Para **ações críticas**, emitir status `AGUARDANDO` com tipo `SOLICITAR_APROVACAO`.
- Aguarde resposta via WebSocket (`INTERVENCAO_USUARIO`).
- Ações críticas incluem: deploy, drop de tabelas, delete massivo, mudanças de schema.

### Modo MANUAL

- **Toda ação** deve reportar `AGUARDANDO` + `SOLICITAR_APROVACAO`.
- NÃO execute nada sem aprovação explícita.
- O gerente aprova via clique no botão ✅ ou via API:

```
POST /api/monitoramento/intervir
{ "comando": "APROVAR_TAREFA", "payload": { "agenteId": "backend", "tarefaId": "TAR-2026-00015" } }
```

---

## 6. Como Reportar Erros

Sempre que encontrar um erro:

```bash
curl -X PUT http://localhost:3150/api/monitoramento/agente/{agenteId}/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ERRO",
    "conteudo": "Erro detalhado aqui",
    "tipo": "ERRO",
    "dados": { "stack": "traceback aqui", "codigo": "ERR_XXX" }
  }'
```

---

## 7. Status Iniciais de Cada Agente

| Agente | Modo Atual | Como Executar |
|--------|-----------|--------------|
| **frontend** | AUTONOMO | Agent Manager worktree |
| **backend** | AUTONOMO | Agent Manager worktree |
| **dba** | ASSISTIDA | Agent Manager worktree |
| **agentmap-admin** | MANUAL | Agent Manager worktree |
| **arquiteto** | AUTONOMO | Agent Manager worktree |

> **Nota:** O paralelismo real é via Agent Manager + worktrees. Não há CLI `kilo` standalone.
