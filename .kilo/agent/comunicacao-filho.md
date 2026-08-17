---
id: comunicacao-filho
nome: Guia de Comunicação para Agentes Kilo
descricao: Documento que ensina agentes no Agent Manager a se comunicar com o AgentMap via HTTP
---

# Guia de Comunicação para Agentes Kilo

## Objetivo

Este documento ensina **todo agente rodando no Agent Manager (VS Code)** como se comunicar com o AgentMap via HTTP.

## Regra Principal

> **Você não tem tools MCP de escrita para o AgentMap.**  
> Use **HTTP direto** para enviar mensagens.  
> Use **HTTP direto ou tool `kilohub_receive_chat_message`** para ler respostas.

## Endpoints

| Ação | Método | URL |
|---|---|---|
| Enviar mensagem | `POST` | `http://localhost:3150/api/monitoramento/mensagens` |
| Ler respostas | `GET` | `http://localhost:3150/api/monitoramento/kilo/receive-chat?agenteId=<seu-id>&limite=20` |

## Enviar Mensagem

```bash
curl -X POST http://localhost:3150/api/monitoramento/mensagens \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "KILO_CHAT",
    "emissor": "agente-kilo",
    "agenteId": "backend-teste",
    "tarefaId": "TAR-2026-00001",
    "conteudo": "[backend-teste][TAR-2026-00001] Mensagem completa...",
    "dados": {"messageId": "msg-001"}
  }'
```

## Ler Respostas

```bash
curl "http://localhost:3150/api/monitoramento/kilo/receive-chat?agenteId=backend-teste&limite=20"
```

## Formato Obrigatório de Mensagens

Toda mensagem deve ser **completa e estruturada**:

```json
{
  "tipo": "KILO_CHAT",
  "emissor": "agente-kilo",
  "agenteId": "backend-teste",
  "tarefaId": "TAR-2026-00001",
  "conteudo": "[backend-teste][TAR-2026-00001] Mensagem completa...",
  "dados": {"messageId": "msg-001"},
  "acoes": []
}
```

### Convenção de `conteudo`

Sempre prefixar com:
```
[<agenteId>][<tarefaId>] <mensagem>
```

## Tipos de Mensagem

| Tipo | Quando usar |
|---|---|
| `KILO_CHAT` | Mensagem padrão do agente |
| `KILO_REPLY` | Resposta a uma mensagem específica (`dados.replyTo`) |
| `KILO_RESULT` | Resultado final de tarefa |
| `KILO_CHAT_REPLY` | Resposta de chat simples |

## Exemplos Práticos

### Progresso de tarefa
```json
{
  "tipo": "KILO_CHAT",
  "emissor": "agente-kilo",
  "agenteId": "backend-teste",
  "tarefaId": "TAR-2026-00001",
  "conteudo": "[backend-teste][TAR-2026-00001] Iniciando implementação do serviço X. Arquivos: backend/src/servicos/NovoServico.ts",
  "dados": {"messageId": "msg-001"}
}
```

### Erro
```json
{
  "tipo": "KILO_CHAT",
  "emissor": "agente-kilo",
  "agenteId": "backend-teste",
  "tarefaId": "TAR-2026-00001",
  "conteudo": "[backend-teste][TAR-2026-00001] ERRO: falha ao conectar ao banco. Detalhes: Connection refused.",
  "dados": {"messageId": "msg-002"}
}
```

### Solicitação de aprovação
```json
{
  "tipo": "KILO_CHAT",
  "emissor": "agente-kilo",
  "agenteId": "backend-teste",
  "tarefaId": "TAR-2026-00001",
  "conteudo": "[backend-teste][TAR-2026-00001] Solicito aprovação para alterar contrato Y. Motivo: nova exigência do frontend.",
  "dados": {"messageId": "msg-003"}
}
```

### Resultado final
```json
{
  "tipo": "KILO_RESULT",
  "emissor": "agente-kilo",
  "agenteId": "backend-teste",
  "tarefaId": "TAR-2026-00001",
  "conteudo": "[backend-teste][TAR-2026-00001] Concluído. Arquivos: backend/src/servicos/NovoServico.ts, backend/testes/NovoServico.test.ts. Commit: abc123.",
  "dados": {"messageId": "msg-004", "commit": "abc123"}
}
```

### Respondendo a uma mensagem
```json
{
  "tipo": "KILO_REPLY",
  "emissor": "agente-kilo",
  "agenteId": "backend-teste",
  "tarefaId": "TAR-2026-00001",
  "conteudo": "[backend-teste][TAR-2026-00001] Entendido. Prosseguindo com a implementação.",
  "dados": {"replyTo": "MSG-1786927468474"}
}
```

## Caminhos de Documentos

Sempre referencie documentos com caminhos relativos ao worktree:

```
<caminho-do-worktree>/backend/src/servicos/NovoServico.ts
<caminho-do-worktree>/docs/arquitetura.md
```

## Logs de Auditoria

O backend registra logs com prefixo `[KILO]`:
- `[KILO][HTTP_IN]` — mensagem recebida via HTTP
- `[KILO][HTTP_OK]` — mensagem salva com sucesso
- `[KILO][HTTP_FAIL]` — erro ao salvar
- `[KILO][CHAT_LIST]` — listagem de mensagens

Esses logs aparecem no stdout do backend e também em `.ia/auditoria/eventos.json`.

## Troubleshooting

| Problema | Solução |
|---|---|
| `Cannot POST /api/monitoramento/mensagens` | Backend não está rodando. Inicie com `npm start` em `backend/` |
| `Cannot GET /api/monitoramento/kilo/receive-chat` | Backend não foi rebuildado. Rode `npm run build` e reinicie |
| Mensagem não aparece no monitoramento | Verifique se o WebSocket está conectado (status verde no topo) |
| Filho não vê resposta do pai | Filho deve chamar `GET /api/monitoramento/kilo/receive-chat` periodicamente |

## Prompt de Exemplo para Agente Filho

```
Você é o agente <agenteId>. Envie uma mensagem de progresso para o AgentMap via HTTP:

POST http://localhost:3150/api/monitoramento/mensagens
Content-Type: application/json

{
  "tipo": "KILO_CHAT",
  "emissor": "agente-kilo",
  "agenteId": "<agenteId>",
  "tarefaId": "<tarefaId>",
  "conteudo": "[<agenteId>][<tarefaId>] <mensagem>",
  "dados": {"messageId": "<msg-id-unico>"}
}
```
