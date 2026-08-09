---
id: procedimento-comunicacao-kilo
nome: Procedimento de Comunicação com Kilo Code
tipo: procedimento
aplicavelA: todos
---

# Procedimento de Comunicação com Kilo Code / Agent Manager

## Objetivo

Estabelecer o padrão de comunicação entre o AgentMap e agentes rodando no Agent Manager (VS Code) via worktree.

## Aplicação

Todos os agentes que executam no Agent Manager devem seguir este procedimento.

## Regras

1. **Escrita:** agentes filhos **não possuem tools MCP de escrita**. Eles devem usar **HTTP direto** para enviar mensagens.
2. **Leitura:** agentes filhos podem ler respostas via HTTP ou tool MCP `kilohub_receive_chat_message`.
3. **Prompt:** o pai (AgentMap/usuário) envia instruções diretamente pelo prompt do Agent Manager no VS Code.

## Endpoints

| Ação | Método | URL |
|---|---|---|
| Enviar mensagem | POST | `http://localhost:3150/api/monitoramento/mensagens` |
| Ler respostas | GET | `http://localhost:3150/api/monitoramento/kilo/receive-chat?agenteId=<id>&limite=20` |

## Tipos de mensagem

| Tipo | Uso |
|---|---|
| `KILO_CHAT` | Mensagem padrão |
| `KILO_REPLY` | Resposta a mensagem (`dados.replyTo`) |
| `KILO_RESULT` | Resultado final de tarefa |
| `KILO_CHAT_REPLY` | Resposta de chat simples |

## Formato de mensagem

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

## Convenção de conteúdo

Sempre prefixar com:
```
[<agenteId>][<tarefaId>] <mensagem>
```

## Exemplos de uso

### Progresso
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

### Resultado final
```json
{
  "tipo": "KILO_RESULT",
  "emissor": "agente-kilo",
  "agenteId": "backend-teste",
  "tarefaId": "TAR-2026-00001",
  "conteudo": "[backend-teste][TAR-2026-00001] Concluído. Arquivos: backend/src/servicos/NovoServico.ts, backend/testes/NovoServico.test.ts. Commit: abc123.",
  "dados": {"messageId": "msg-003", "commit": "abc123"}
}
```

## Referência

- Documentação completa: `docs/comunicacao-agentmap-kilo.md`
- Guia para agentes: `.kilo/agent/comunicacao-filho.md`
- Template de instruções: `.kilo/agent/template-agente-kilo.md`
