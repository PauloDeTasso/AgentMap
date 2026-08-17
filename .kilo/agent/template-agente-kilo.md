# Template de Instruções para Agentes Kilo

Copie este template para cada agente que trabalhará no Agent Manager.

---

## Seu papel

Você é o agente `<agenteId>` responsável pela tarefa `<tarefaId>`.

## Ferramentas disponíveis

Você tem acesso às tools MCP do AgentMap para **leitura**:
- `agentmap_obter_contexto_projeto`
- `agentmap_tarefas_listar`
- `agentmap_tarefas_obter`
- `kilohub_receive_chat_message`
- `kilohub_report_status`
- `kilohub_report_progress`
- `kilohub_report_result`

Você **NÃO** tem tools MCP de escrita para o monitoramento.

## Como enviar mensagens ao AgentMap

Use **HTTP direto**:

```bash
curl -X POST http://localhost:3150/api/monitoramento/mensagens \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "KILO_CHAT",
    "emissor": "agente-kilo",
    "agenteId": "<agenteId>",
    "tarefaId": "<tarefaId>",
    "conteudo": "[<agenteId>][<tarefaId>] <mensagem>",
    "dados": {"messageId": "<msg-id-unico>"}
  }'
```

## Como ler respostas do AgentMap

```bash
curl "http://localhost:3150/api/monitoramento/kilo/receive-chat?agenteId=<agenteId>&limite=20"
```

## Formato obrigatório de mensagens

Sempre use o padrão:
```
[<agenteId>][<tarefaId>] <mensagem>
```

Exemplos:
- `[backend-teste][TAR-2026-00001] Iniciando implementação...`
- `[backend-teste][TAR-2026-00001] ERRO: falha ao conectar...`
- `[backend-teste][TAR-2026-00001] Solicito aprovação...`
- `[backend-teste][TAR-2026-00001] Concluído. Arquivos: backend/src/servicos/NovoServico.ts`

## Tipos de mensagem

| Tipo | Quando usar |
|---|---|
| `KILO_CHAT` | Mensagem padrão |
| `KILO_REPLY` | Resposta a mensagem (`dados.replyTo`) |
| `KILO_RESULT` | Resultado final de tarefa |
| `KILO_CHAT_REPLY` | Resposta de chat simples |

## Caminhos de documentos

Sempre use caminhos relativos ao worktree:
```
<caminho-do-worktree>/backend/src/servicos/NovoServico.ts
<caminho-do-worktree>/docs/arquitetura.md
```

## Logs

O backend registra logs `[KILO]` no stdout e em `.ia/auditoria/eventos.json`.

---

**Instruções para o Agent Manager:**
1. Abra o worktree da tarefa `<tarefaId>`
2. Execute este template como instrução inicial para o agente
3. O agente enviará mensagens via HTTP para o monitoramento
4. Você verá as mensagens em tempo real em `http://localhost:3150/monitoramento.html`
5. Responda pelo prompt do Agent Manager quando necessário
