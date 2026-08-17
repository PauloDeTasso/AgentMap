# Protocolo MCP do AgentMap

## Visão Geral

O AgentMap disponibiliza suas funcionalidades através do Model Context Protocol (MCP), um padrão aberto para comunicação entre modelos de linguagem e ferramentas externas.

Esta especificação descreve a versão estável do protocolo, atualmente em produção.

## Transporte

- **Stdio**: JSON-RPC 2.0 sobre stdin/stdout
- **Inicialização**: cliente envia `initialize`, servidor responde com capacidades
- **Handshake**: cliente envia `initialized` notification

## Formato de Requisição

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "agentmap_tarefas_listar",
    "arguments": {}
  }
}
```

## Formato de Resposta (Sucesso)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"sucesso\":true,\"dados\":[...]}"
      }
    ],
    "structuredContent": {
      "sucesso": true,
      "dados": [...]
    }
  }
}
```

> **Nota (MCP 2026):** Tools que declaram `outputSchema` retornam `structuredContent` para validação client-side e parsing estruturado. O bloco `content` continua sendo retornado para backwards compatibility.

## Formato de Resposta (Erro)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"sucesso\":false,\"codigo\":\"NO_PROJECT_OPEN\",\"mensagem\":\"Nenhum projeto aberto.\",\"detalhes\":{}}"
      }
    ],
    "isError": true
  }
}
```

> **Nota (MCP 2026):** Erros de execução de tool usam `isError: true` para permitir auto-correção pelo modelo.

## Tools Disponíveis

### Projetos
- `agentmap_projetos_listar` — Lista projetos
- `agentmap_projetos_criar` — Cria projeto
- `agentmap_projetos_abrir` — Abre projeto
- `agentmap_projetos_fechar` — Fecha projeto
- `agentmap_projetos_atual` — Projeto atual
- `agentmap_integridade_verificar` — Verifica integridade

### Entidades Principais
- `agentmap_tarefas_*` — CRUD + estado + contexto
- `agentmap_agentes_*` — CRUD
- `agentmap_solicitacoes_*` — CRUD + aprovar/rejeitar/cancelar + histórico
- `agentmap_handoffs_*` — CRUD
- `agentmap_eventos_*` — CRUD + confirmar consumo (coordenação entre agentes)
- `agentmap_sessoes_*` — CRUD + finalizar

### Entidades Secundárias
- `agentmap_checkpoints_*`, `agentmap_riscos_*`, `agentmap_bloqueios_*`
- `agentmap_pendencias_*`, `agentmap_reservas_*`, `agentmap_decisoes_*`
- `agentmap_dependencias_*`, `agentmap_responsabilidades_*`
- `agentmap_artefatos_*`, `agentmap_resultados_*`, `agentmap_criterios_*`
- `agentmap_aprendizados_*`, `agentmap_validacoes_*`
- `agentmap_contatos_*` — CRUD de contatos do projeto

### Monitoramento

- `agentmap_monitoramento_verificar_pendentes` — Consulta mensagens novas no monitoramento, filtrando tipos relevantes (`KILO_CHAT`, `KILO_REPLY`, `KILO_RESULT`, `KILO_CHAT_REPLY`, `WAKEUP_PARENT`, `AGENTE_FILHO_RESULTADO`). Suporta cursor `aposEventSequence` para polling incremental e `limite` para paginação.

### Workflows
- `agentmap_workflows_iniciar_trabalho` — Inicia trabalho com contexto completo
- `agentmap_workflows_finalizar_trabalho` — Finaliza trabalho (resultado + handoff)
- `agentmap_workflows_consultar_pendencias` — Pendencias por agente
- `agentmap_workflows_obter_mapa_projeto` — Mapa completo do projeto

### Worktree / Paralelismo
- `agentmap_tarefas_prontas_para_worktree` — Tarefas sem dependência pendente
- `agentmap_verificar_dependencias_pendentes` — Verifica dependências de uma tarefa
- `agentmap_abrir_worktree` — Cria worktree automaticamente para uma tarefa

### Contexto & Conhecimento
- `agentmap_obter_contexto_projeto` — Contexto completo do projeto
- `agentmap_obter_contexto_tarefa` — Contexto completo de uma tarefa
- `agentmap_obter_agente` — Perfil completo de um agente
- `agentmap_obter_arquitetura` — Informações de arquitetura
- `agentmap_recomendar_agente` — Recomenda agentes para uma tarefa
- `agentmap_buscar_conhecimento` — Busca na base de conhecimento
- `agentmap_buscar_referencias` — Busca referências a símbolos
- `agentmap_buscar_simbolo` — Busca definições de símbolos

### Onboarding & Descoberta
- `agentmap_descobrir` — Lista capabilities, agents, docs, CLI, worktree e onboarding
- `agentmap_sugerir_fluxo` — Recomenda sequência de tools baseada no objetivo

### Arquivos & Auditoria
- `agentmap_arquivos_listar` — Lista arquivos do projeto
- `agentmap_arquivos_ler` — Lê arquivo
- `agentmap_arquivos_excluir` — Exclui arquivo
- `agentmap_ler_trecho_arquivo` — Lê trecho de arquivo com validação
- `agentmap_auditoria_listar` — Eventos de auditoria

## Resources

### Estáticos
| URI | Descrição |
|---|---|
| `agentmap://status` | Status do servidor MCP |
| `agentmap://manifest` | Manifesto do AgentMap |
| `agentmap://projeto` | Config do projeto atual |
| `agentmap://onboarding` | Guia de descoberta do sistema |
| `agentmap://playbook` | Padrões de uso recomendados |
| `agentmap://guia-eficacia` | Guia de eficácia: quando, por que e como usar cada ferramenta |

### Dinâmicos (Resource Templates)
| URI Template | Descrição |
|---|---|
| `agentmap://solicitacoes/{agenteId}` | Solicitações de alteração de um agente |
| `agentmap://handoffs/{agenteId}` | Handoffs de um agente |
| `agentmap://bloqueios/{projetoId}` | Bloqueios do projeto |
| `agentmap://monitoramento/mensagens/{projetoId?}` | Mensagens de monitoramento do projeto (assinável para notificações em tempo real) |

### Subscriptions (MCP 2025 + 2026)

O AgentMap suporta dois modos de subscrição compatíveis com diferentes versões do protocolo MCP.

#### Modo 2025 — `resources/subscribe`

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

```json
{
  "jsonrpc": "2.0",
  "method": "resources/unsubscribe",
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

#### Modo 2026 — `subscriptions/listen`

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

O servidor responde com:

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

Quando um recurso muda, a notificação inclui o ID da subscrição:

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

Para cancelar, o cliente envia:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/cancelled",
  "params": {
    "requestId": "1"
  }
}
```

> **Nota:** no modo 2026, o cliente deve re-listar após reconexão stdio. O servidor não mantém estado de subscrição entre reconexões.

### Autorização
Subscrições e leituras de recursos são permitidas localmente sem token. O acesso é restrito à raiz do projeto aberto.

### Coalescência
Eventos de mudança são agrupados por URI em janela de 100ms. Um burst de múltiplas alterações resulta em apenas 1 notificação `resources/updated` por URI.

## Prompts

| Prompt | Objetivo |
|---|---|
| `agentmap-iniciar-trabalho` | Ciclo: sessao → mapa → pendencias → contexto → trabalho |
| `agentmap-finalizar-trabalho` | Ciclo: resultado → artefatos → handoff → validação |
| `agentmap-processar-handoff` | Receber handoff, executar, registrar resultado |
| `agentmap-processar-solicitacao` | Consultar solicitação, verificar dependências, executar |

## Autenticação e endpoints de serviço

O servidor MCP opera via STDIO e não requer headers HTTP. A API REST do AgentMap está disponível localmente sem autenticação obrigatória.

CORS está configurado para origins locais aprovadas.

## Eventos flexíveis

Além das tools MCP, o AgentMap oferece endpoints REST para eventos:

- `POST /api/eventos` — eventos do sistema (validação rigorosa)
- `POST /api/eventos/custom` — eventos genéricos para integrações e monitoramento
- `PUT /api/eventos/:id/consumir` — marca evento como processado

## Temporários

O AgentMap gerencia arquivos temporários através de endpoints públicos:

- `GET /api/temp/arquivos` — lista arquivos temporários com metadados de idade e tamanho
- `POST /api/temp/limpar` — executa limpeza manual dos temporários
- `GET /api/temp/caminho` — retorna o caminho absoluto da pasta `temp/`

Limpeza automática por TTL (padrão: 7 dias) é executada pelo `TempCleanupService`. O botão "🧹 Limpar Temp" no header do frontend aciona a limpeza manual via `POST /api/temp/limpar`.

## Monitoramento incremental e wakeup parent

O AgentMap suporta polling incremental de mensagens de monitoramento através do campo `eventSequence`:

- Cada mensagem recebe um `eventSequence` autoincremental persistido em `.ia/contexto/monitoramento-sequence.json`.
- A tool `agentmap_monitoramento_verificar_pendentes` aceita o parâmetro `aposEventSequence` para retornar apenas mensagens com `eventSequence` maior que o cursor informado.
- O campo `ultimoEventSequence` na resposta indica o maior sequence disponível, permitindo que o cliente avance o cursor sem perder mensagens.

### Tipos de mensagem relevantes para wakeup parent

A tool `agentmap_monitoramento_verificar_pendentes` filtra automaticamente os seguintes tipos:

| Tipo | Descrição |
|---|---|
| `KILO_CHAT` | Mensagem padrão de agente |
| `KILO_REPLY` | Resposta a mensagem específica |
| `KILO_RESULT` | Resultado final de tarefa |
| `KILO_CHAT_REPLY` | Resposta de chat simples |
| `WAKEUP_PARENT` | Evento de wakeup para o agente principal/pai |
| `AGENTE_FILHO_RESULTADO` | Resultado enviado por agente filho |
