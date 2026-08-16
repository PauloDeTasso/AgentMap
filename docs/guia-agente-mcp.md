# Guia do Agente MCP

## Introdução

O AgentMap disponibiliza um servidor MCP (Model Context Protocol) que permite a agentes de IA interagir com projetos, tarefas, contratos e demais recursos de governança diretamente através de ferramentas padronizadas.

O sistema está em produção e pronto para uso em ambientes profissionais.

## Pré-requisitos

1. Projeto aberto no AgentMap (`agentmap_projetos_abrir`)
2. Agente registrado no projeto (`agentmap_agentes_listar`)
3. Sessão iniciada (`agentmap_sessoes_criar`)

## Primeiros passos (onboarding)

1. Use `agentmap_descobrir` para listar todas as capabilities, agents, docs, CLI e mais.
2. Leia o resource `agentmap://onboarding` para entender o sistema.
3. Consulte o resource `agentmap://playbook` para ver padrões de uso recomendados.
4. Use `agentmap_sugerir_fluxo` se precisar de orientação sobre qual tool usar primeiro.
5. Consulte `docs/referencia-tools-mcp.md` para ver **todos os parâmetros esperados** por cada tool MCP antes de executar.

## Ciclo de Trabalho

### 1. Iniciar Trabalho

Use o prompt `agentmap-iniciar-trabalho` ou a tool `agentmap_workflows_iniciar_trabalho`:

```json
{
  "name": "agentmap_workflows_iniciar_trabalho",
  "arguments": {
    "agenteId": "backend",
    "tarefaId": "TAR-2026-00042"
  }
}
```

Isso retorna:
- Dados do agente (perfil, permissões, diretórios permitidos)
- Dados da tarefa (contratos, critérios, contexto)
- Pacote de contexto completo
- Sessão criada

### 2. Executar Trabalho

- Leia os contratos obrigatórios da tarefa
- Respeite os diretórios permitidos/proibidos
- Siga os critérios de aceitação
- Documente alterações em arquivos relevantes

### 3. Finalizar Trabalho

Use `agentmap_workflows_finalizar_trabalho`. Esta tool aceita argumentos flexíveis via `passthrough`; os campos recomendados são:

```json
{
  "name": "agentmap_workflows_finalizar_trabalho",
  "arguments": {
    "sessaoId": "SES-2026-00001",
    "tarefaId": "TAR-2026-00042",
    "agenteId": "backend",
    "resumo": "Implementada feature X",
    "estado": "CONCLUIDA",
    "arquivosAlterados": ["backend/src/feature.ts"],
    "testesExecutados": ["unit-feature"],
    "testesAprovados": ["unit-feature"]
  }
}
```

### 4. Handoff

Se o trabalho precisa ser continuado por outro agente, use `agentmap_handoffs_criar`:

```json
{
  "name": "agentmap_handoffs_criar",
  "arguments": {
    "dados": {
      "origem": "backend",
      "destino": "frontend",
      "tarefaId": "TAR-2026-00042",
      "resumo": "Backend concluído, aguardando integração",
      "pendente": ["Integração com API"],
      "estado": "PENDENTE"
    }
  }
}
```

## Regras Obrigatórias

1. **Leitura obrigatória antes do trabalho**: sempre consulte o contexto da tarefa antes de executar
2. **Resultado obrigatório**: toda tarefa deve ter resultado registrado
3. **Handoff quando necessário**: se o trabalho crossing de domínio, gere handoff
4. **Validação separada da conclusão**: não conclua tarefa sem validação quando aplicável
5. **Coordenação entre agentes**: antes de iniciar trabalho, consulte `agentmap_eventos_pendentes({ agenteId: "<seu-id>" })` para verificar eventos pendentes destinados a você. Após processar um evento, marque-o como consumido com `agentmap_eventos_confirmar({ id: "<evento-id>" })`.
6. **Subscrições MCP (2025):** use `resources/subscribe` para receber notificações automáticas de mudanças em `agentmap://solicitacoes/{seu-id}`, `agentmap://handoffs/{seu-id}` e `agentmap://bloqueios/{projeto-id}`. Após receber `notifications/resources/updated`, chame `resources/read` para obter os dados atualizados.
7. **Subscrições MCP (2026):** use `subscriptions/listen` com `resourceSubscriptions` para receber notificações com `_meta.subscriptionId`. Após reconexão stdio, re-liste; o servidor não mantém estado entre reconexões.

## Formato de Resposta MCP 2026

As tools do AgentMap seguem o padrão MCP 2026:

- **Sucesso:** retorna `content` (texto JSON) + `structuredContent` (dados estruturados)
- **Erro:** retorna `content` + `isError: true` com mensagem acionável para auto-correção
- **Validação:** `inputSchema` valida argumentos antes da execução
- **Anotações:** tools read-only usam `readOnlyHint: true`

O agente pode consumir apenas o `structuredContent` quando precisar de dados estruturados, ou o `content` para legibilidade humana.

## MCP Resource Subscriptions

O AgentMap suporta subscrições de recursos para notificações em tempo real. Isso permite que agentes sejam notificados automaticamente quando há mudanças em solicitações, handoffs ou bloqueios, sem necessidade de polling.

### Recursos assináveis

| URI | Descrição |
|---|---|
| `agentmap://solicitacoes/{agenteId}` | Solicitações destinadas a um agente específico |
| `agentmap://handoffs/{agenteId}` | Handoffs pendentes para um agente |
| `agentmap://bloqueios/{projetoId}` | Bloqueios do projeto atual |

### Modo 2025 — `resources/subscribe`

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/subscribe",
  "params": {
    "uri": "agentmap://solicitacoes/AGT-BACKEND"
  }
}
```

Quando um recurso assinado muda, o servidor envia:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "uri": "agentmap://solicitacoes/AGT-BACKEND"
  }
}
```

Após receber a notificação, leia o recurso atualizado:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/read",
  "params": {
    "uri": "agentmap://solicitacoes/AGT-BACKEND"
  }
}
```

Para cancelar:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "resources/unsubscribe",
  "params": {
    "uri": "agentmap://solicitacoes/AGT-BACKEND"
  }
}
```

### Modo 2026 — `subscriptions/listen`

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "subscriptions/listen",
  "params": {
    "notifications": {
      "resourceSubscriptions": [
        "agentmap://solicitacoes/AGT-BACKEND"
      ]
    }
  }
}
```

O servidor confirma com:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/subscriptions/acknowledged",
  "params": {},
  "_meta": {
    "io.modelcontextprotocol/subscriptionId": "1"
  }
}
```

Notificações de mudança incluem o ID da subscrição:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "uri": "agentmap://solicitacoes/AGT-BACKEND"
  },
  "_meta": {
    "io.modelcontextprotocol/subscriptionId": "1"
  }
}
```

Para cancelar:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/cancelled",
  "params": {
    "requestId": "1"
  }
}
```

> **Importante:** no modo 2026, o cliente deve re-listar após reconexão stdio. O servidor não mantém estado de subscrição entre reconexões.

### Regras de acesso

- Subscrições e leituras são permitidas localmente sem token.
- `solicitacoes/{agenteId}` e `handoffs/{agenteId}` exigem projeto aberto.
- `bloqueios/{projetoId}` exigem que o ID do projeto na URI corresponda ao projeto aberto.
- Tentativas de acesso fora da raiz do projeto retornam erro `PATH_TRAVERSAL`.

### Coalescência

O EventBus agrupa notificações do mesmo URI em janela de 100ms. Se múltiplas alterações ocorrerem rapidamente, você receberá apenas 1 notificação.

## Monitoramento

O AgentMap oferece um painel de monitoramento em tempo real acessível pela interface web e por API REST. O painel **Monitor** consolida:

- **Sessões ativas** de agentes com tarefa associada e horário de início
- **Alertas** de handoffs pendentes, bloqueios ativos e riscos críticos
- **Mensagens de monitoramento** enviadas entre agentes e sistemas
- **Eventos recentes** do projeto com resultado (sucesso/falha)

### API de Monitoramento

| Endpoint | Descrição |
|---|---|
| `GET /api/monitor` | Visão consolidada do monitoramento |
| `GET /api/monitoramento/mensagens` | Lista mensagens com filtros |
| `POST /api/monitoramento/mensagens` | Cria mensagem de monitoramento |
| `PUT /api/monitoramento/agente/:id/status` | Atualiza status de agente |
| `GET /api/monitoramento/agentes` | Lista agentes monitorados |
| `GET /api/monitoramento/modo` | Modo global (MANUAL/AUTO) |
| `POST /api/monitoramento/modo` | Altera modo global |
| `POST /api/monitoramento/intervir` | Executa intervenção manual |
| `GET /api/monitoramento/dispatcher/pendentes` | Itens pendentes do dispatcher |
| `POST /api/monitoramento/dispatcher/executar` | Executa item pendente |
| `GET /api/monitoramento/dispatcher/logs` | Logs do dispatcher |

### Enviar Mensagem de Monitoramento

```bash
curl -X POST http://localhost:3150/api/monitoramento/mensagens \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "INFO",
    "emissor": "backend",
    "agenteId": "backend",
    "tarefaId": "TAR-2026-00013",
    "conteudo": "Integração pronta para teste",
    "dados": { "modo": "MANUAL" },
    "acoes": []
  }'
```

### WebSocket

O WebSocket `ws://localhost:3150/ws/monitoramento` oferece atualizações em tempo real. O serviço `MonitoramentoWebSocket` faz broadcast de mensagens para sessões conectadas.

## Códigos de Erro

| Código | Significado |
|---|---|
| `NO_PROJECT_OPEN` | Nenhum projeto aberto |
| `TASK_NOT_FOUND` | Tarefa não encontrada |
| `AGENT_NOT_FOUND` | Agente não encontrado |
| `INVALID_TRANSITION` | Transição de estado inválida |
| `PATH_TRAVERSAL` | Tentativa de path traversal bloqueada |
| `VALIDATION_ERROR` | Erro de validação de schema |
| `NOT_FOUND` | Entidade não encontrada |

## Eventos customizados

Além dos eventos automáticos do sistema, o AgentMap oferece o endpoint `POST /api/eventos/custom` para registrar eventos específicos sem validação de enum.

Isso é útil para:
- Casos específicos de integração
- Fluxos personalizados de governança
- Eventos que não se encaixam nos padrões convencionais

Exemplo:

```json
{
  "tipo": "MEU_EVENTO_CUSTOM",
  "origem": "backend",
  "destino": "frontend",
  "mensagem": "Integração pronta para teste",
  "campoExtra": "valor"
}
```

O evento criado aparece em `GET /api/eventos` e pode ser consumido com `PUT /api/eventos/:id/consumir`.

## Autenticação

O AgentMap roda localmente e não exige autenticação. As rotas públicas incluem:
- `GET /api/status`
- `GET /api/projetos`
- `POST /api/projetos/abrir`
- `GET /api/monitoramento/*`
- `GET /api/monitoramento/*`
- `GET /api/temp/arquivos`
- `POST /api/temp/limpar`
- `GET /api/temp/caminho`

CORS está configurado para permitir origens de desenvolvimento local.
