# Comunicação AgentMap <-> Agent Manager / Kilo Code

**Versão:** 1.1
**Data:** 2026-08-25

## 1. Visão geral

O AgentMap atua como **Control Plane** de orquestração. O **Agent Manager** (VS Code) é o executor operacional. Eles se comunicam por **HTTP/MCP**, nunca por escrita direta em arquivos compartilhados.

```
AgentMap (monitoramento)  ←→  HTTP/MCP  ←→  Agente Kilo no worktree
```

## 2. Regra de ouro

> **AgentMap nunca assume controle operacional de recursos do Kilo.**  
> Ele solicita, observa, registra, reconcilia e orquestra.

| Recurso | Dono |
|---|---|
| Agente lógico | AgentMap |
| Tarefa | AgentMap |
| Orquestração | AgentMap |
| Evento de projeto | AgentMap |
| Sessão Kilo | **Kilo** |
| Worktree | **Kilo/Git** |
| Branch | **Git/Kilo** |
| Execução LLM | **Kilo** |
| Estado do Agent Manager | **Kilo** |
| Contexto/instruções | AgentMap + AGENTS.md |

## 3. Ferramentas e endpoints

### 3.1 Filho → AgentMap (escrita)

Os agentes filhos **não possuem tools MCP de escrita**. Eles devem usar **HTTP direto**:

```
POST http://localhost:3150/api/monitoramento/mensagens
Content-Type: application/json

{
  "tipo": "KILO_CHAT | KILO_REPLY | KILO_RESULT | KILO_CHAT_REPLY",
  "emissor": "agente-kilo",
  "agenteId": "backend-teste",
  "tarefaId": "TAR-2026-00001",
  "conteudo": "mensagem completa",
  "dados": { "messageId": "msg-001" },
  "acoes": []
}
```

**Regras:**
- `tipo` é obrigatório e deve ser um dos valores Kilo
- `emissor` é obrigatório
- `conteudo` é obrigatório
- `messageId` vai em `dados.messageId`
- A resposta é `201 Created` com `{ sucesso: true }` ou erro

### 3.2 AgentMap → Filho (leitura)

Os agentes filhos leem respostas por:

**HTTP:**
```
GET http://localhost:3150/api/monitoramento/kilo/receive-chat?agenteId=backend-teste&limite=20
```

**Ou via tool MCP (se disponível no contexto do filho):**
```json
{
  "tool": "kilohub_receive_chat_message",
  "arguments": {
    "agenteId": "backend-teste",
    "limite": 20
  }
}

### 3.3 Pai (AgentMap/usuário) → Filho

Você envia mensagens ao filho **diretamente pelo prompt do Kilo/Agent Manager** no VS Code. O AgentMap não “empurra” mensagens; o filho deve consultar periodicamente.

## 4. Formato obrigatório de mensagens

Toda mensagem enviada ao monitoramento deve ser **completa e estruturada**:

```json
{
  "tipo": "KILO_CHAT",
  "emissor": "agente-kilo",
  "agenteId": "backend-teste",
  "tarefaId": "TAR-2026-00001",
  "conteudo": "[backend-teste][TAR-2026-00001] Mensagem...",
  "dados": {
    "messageId": "msg-001",
    "replyTo": "MSG-xxx"
  },
  "acoes": []
}
```

### 4.1 Convenção de `conteudo`

Sempre prefixar com:
```
[<agenteId>][<tarefaId>] <mensagem>
```

Exemplos:
- `[backend-teste][TAR-2026-00001] Iniciando implementação do serviço X.`
- `[backend-teste][TAR-2026-00001] ERRO: falha ao conectar ao banco.`
- `[backend-teste][TAR-2026-00001] Solicito aprovação para alterar contrato Y.`
- `[backend-teste][TAR-2026-00001] Documento criado: backend/src/servicos/NovoServico.ts`
- `[backend-teste][TAR-2026-00001] Concluído. Arquivos: backend/src/servicos/NovoServico.ts, backend/testes/NovoServico.test.ts`

## 5. Tipos de mensagem

| Tipo | Quando usar |
|---|---|
| `KILO_CHAT` | Mensagem padrão do agente |
| `KILO_REPLY` | Resposta a uma mensagem específica (`dados.replyTo`) |
| `KILO_RESULT` | Resultado final de tarefa |
| `KILO_CHAT_REPLY` | Resposta de chat simples |

## 6. Ciclo completo recomendado

```
1. AgentMap cria tarefa em .ia/tarefas/tarefas.json
2. Você abre worktree via Agent Manager (VS Code)
3. Agente Kilo executa a tarefa no worktree
4. Agente Kilo envia progresso via POST /api/monitoramento/mensagens
5. Você vê a mensagem em http://localhost:3150/monitoramento.html
6. Você responde pelo prompt do Agent Manager (ou HTTP se for outro agente)
7. Agente Kilo consulta respostas via GET /api/monitoramento/kilo/receive-chat
8. Repetir 4-7 até conclusão
9. Agente Kilo envia resultado final
10. AgentMap registra resultado e dispara handoff automático
```

## 7. Exemplos práticos

### 7.1 Enviar mensagem (filho)

```bash
curl -X POST http://localhost:3150/api/monitoramento/mensagens \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "KILO_CHAT",
    "emissor": "agente-kilo",
    "agenteId": "backend-teste",
    "tarefaId": "TAR-2026-00001",
    "conteudo": "[backend-teste][TAR-2026-00001] Iniciando implementação...",
    "dados": {"messageId": "msg-001"}
  }'
```

### 7.2 Enviar resultado (filho)

```bash
curl -X POST http://localhost:3150/api/monitoramento/mensagens \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "KILO_RESULT",
    "emissor": "agente-kilo",
    "agenteId": "backend-teste",
    "tarefaId": "TAR-2026-00001",
    "conteudo": "[backend-teste][TAR-2026-00001] Concluído. Arquivos: backend/src/servicos/NovoServico.ts",
    "dados": {"messageId": "msg-002", "commit": "abc123"}
  }'
```

### 7.3 Ler mensagens (filho)

```bash
curl "http://localhost:3150/api/monitoramento/kilo/receive-chat?agenteId=backend-teste&limite=20"
```

### 7.4 Responder mensagem (pai/AgentMap)

```bash
curl -X POST http://localhost:3150/api/monitoramento/mensagens \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "KILO_REPLY",
    "emissor": "agentmap-root",
    "agenteId": "backend-teste",
    "tarefaId": "TAR-2026-00001",
    "conteudo": "[agentmap-root][TAR-2026-00001] Aprovado. Prosseguir.",
    "dados": {"replyTo": "MSG-1786927468474"}
  }'
```

## 8. Caminhos de documentos no worktree

Os agentes filhos devem referenciar documentos assim:

```
<caminho-do-worktree>/backend/src/servicos/NovoServico.ts
<caminho-do-worktree>/backend/testes/NovoServico.test.ts
<caminho-do-worktree>/docs/arquitetura.md
```

No AgentMap, os caminhos são relativos ao projeto:

```
backend/src/servicos/NovoServico.ts
backend/testes/NovoServico.test.ts
docs/arquitetura.md
```

## 9. Troubleshooting

| Problema | Solução |
|---|---|
| `Cannot POST /api/monitoramento/mensagens` | Backend não está rodando. Inicie com `npm run dev` em `backend/` |
| `Cannot GET /api/monitoramento/kilo/receive-chat` | Backend não foi rebuildado após alterações. Rode `npm run build` e reinicie |
| Mensagem não aparece no monitoramento | Verifique se o WebSocket está conectado (status verde no topo) |
| Filho não vê resposta do pai | Filho deve chamar `GET /api/monitoramento/kilo/receive-chat` periodicamente |
| `UNKNOWN_SESSION` | Sessão Kilo não foi descoberta pelo `KiloDiscoveryService`; abra o projeto no AgentMap para reconciliar |

## 10. Prompts prontos para agentes

### 10.1 Prompt para agente filho (enviar mensagem)

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

### 10.2 Prompt para agente filho (ler respostas)

```
Você é o agente <agenteId>. Consulte respostas do AgentMap:

GET http://localhost:3150/api/monitoramento/kilo/receive-chat?agenteId=<agenteId>&limite=20
```

## 11. Teste Real

**Testado em:** 2026-08-18

Um teste bidirecional foi realizado entre uma worktree do Agent Manager (agente-filho) e o
AgentMap para validar o canal HTTP de comunicação. Os resultados confirmam o funcionamento
de `POST /api/monitoramento/mensagens` e `GET /api/monitoramento/kilo/receive-chat` entre
worktree e AgentMap.

### 11.1 Cenário

- **Worktree:** `docs-comm-wakeup-update` — agenteId `docs-comm-01`, tarefaId `TAR-2026-00005`
- **Direcionador:** AgentMap rodando em `http://localhost:3150`
- **Mecanismo de wake-up:** plugin `agentmap-wakeup.ts` (via `session.idle`) — o agente-filho foi
  acordado automaticamente ao detectar inatividade na sessão Kilo.

### 11.2 Sequência de eventos

| Ordem | Ação | Tipo / Direção | Endpoint |
|---|---|---|---|
| 1 | Agente-filho acordado pelo plugin `agentmap-wakeup.ts` (session.idle) | Wake-up | — |
| 2 | Agente-filho envia `KILO_CHAT` perguntando sobre tecnologia frontend | Filho → AgentMap | `POST /api/monitoramento/mensagens` |
| 3 | AgentMap responde com `KILO_REPLY` | AgentMap → Filho | via `GET /api/monitoramento/kilo/receive-chat` |
| 4 | Agente-filho pergunta sobre backend | Filho → AgentMap | `POST /api/monitoramento/mensagens` |
| 5 | AgentMap responde com `KILO_REPLY` | AgentMap → Filho | via `GET /api/monitoramento/kilo/receive-chat` |
| 6 | Agente-filho envia `KILO_RESULT` com resultado final | Filho → AgentMap | `POST /api/monitoramento/mensagens` |

### 11.3 Mensagens trocadas

1. **KILO_CHAT** (Filho → AgentMap) — Pergunta sobre tecnologia frontend.
2. **KILO_REPLY** (AgentMap → Filho) — Resposta via endpoint de leitura.

   ```
   GET /api/monitoramento/kilo/receive-chat?agenteId=docs-comm-01&limite=20
   ```

3. **KILO_CHAT** (Filho → AgentMap) — Pergunta sobre backend.
4. **KILO_REPLY** (AgentMap → Filho) — Resposta sobre backend.
5. **KILO_RESULT** (Filho → AgentMap) — Resultado final: `Concluido. Arquivos alterados: docs/comunicacao-agentmap-kilo.md, documentos/protocolo-agentes.md`

### 11.4 eventSequence

O ciclo de mensagens foi registrado com os seguintes sequenciais de evento: **39, 40, 41, 42, 43**.

| eventSequence | Tipo | Direção | Conteúdo resumido |
|---|---|---|---|
| 39 | KILO_CHAT | Filho → AgentMap | Pergunta sobre tecnologia frontend |
| 40 | KILO_REPLY | AgentMap → Filho | Resposta frontend |
| 41 | KILO_CHAT | Filho → AgentMap | Pergunta sobre backend |
| 42 | KILO_REPLY | AgentMap → Filho | Resposta backend |
| 43 | KILO_RESULT | Filho → AgentMap | Conclusão da tarefa |

### 11.5 Conclusão

O teste confirma que:

- `POST /api/monitoramento/mensagens` entrega corretamente as mensagens do agente-filho ao
  AgentMap, persistindo-as e tornando-as visíveis no painel Monitor em tempo real (WebSocket).
- `GET /api/monitoramento/kilo/receive-chat` devolve as respostas do AgentMap ao agente-filho,
  com filtragem por `agenteId` e limite configurável.
- O plugin `agentmap-wakeup.ts` acorda o agente via `session.idle` de forma confiável,
  iniciando o ciclo de comunicação sem intervenção manual.

## 12. Logs de auditoria

O backend registra logs com prefixo `[KILO]`:
- `[KILO][HTTP_IN]` — mensagem recebida via HTTP
- `[KILO][HTTP_OK]` — mensagem salva com sucesso
- `[KILO][HTTP_FAIL]` — erro ao salvar
- `[KILO][CHAT_LIST]` — listagem de mensagens

Esses logs aparecem no stdout do backend e também em `.ia/auditoria/eventos.json`.
