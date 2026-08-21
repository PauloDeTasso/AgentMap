Sim. Fiz a auditoria diretamente sobre a `main` pública do seu AgentMap e confrontei a implementação/documentação do repositório com a documentação e o código atual do Kilo Code. O resultado é **bem mais interessante do que eu esperava**, principalmente em relação ao problema do *wake-up*.

[AgentMap — branch main](https://github.com/PauloDeTasso/AgentMap/tree/main?utm_source=chatgpt.com)

## 🔎 1. Conclusão executiva

O AgentMap **já é muito mais avançado do que um simples monitor de agentes**.

Na `main` encontrei:

* backend Node.js + TypeScript;
* Express;
* MCP Server via STDIO;
* 131 tools MCP documentadas;
* recursos MCP;
* subscriptions MCP;
* Event Bus;
* WebSocket de monitoramento;
* dispatcher;
* API REST extensa;
* sistema de projetos;
* agentes;
* tarefas;
* sessões;
* worktrees;
* handoffs;
* contratos;
* decisões;
* dependências;
* reservas;
* bloqueios;
* conflitos;
* resultados;
* validações;
* checkpoints;
* riscos;
* aprendizados;
* auditoria;
* observabilidade OpenTelemetry;
* schemas JSON;
* validação Zod/AJV;
* modos MANUAL/AUTO;
* orquestrador;
* integração específica com Kilo;
* ferramentas `kilohub_*`;
* testes;
* mecanismo de limpeza de temporários.

O próprio README afirma atualmente aproximadamente **180 rotas REST, 131 tools MCP, 27 painéis e OpenTelemetry**, e esses números são coerentes com a documentação exposta na `main`. ([GitHub][1])

Porém existe uma **falha arquitetural central**:

> O AgentMap já possui praticamente toda a infraestrutura necessária para saber que uma mensagem chegou, mas a cadeia atual termina antes de conseguir transformar esse evento em um novo turno do agente pai do Kilo.

E isso explica exatamente o comportamento que você está vendo.

---

# 🧠 2. O que o AgentMap realmente é hoje

A arquitetura real é aproximadamente:

```text
                    ┌───────────────────────┐
                    │       VS CODE         │
                    │                       │
                    │     Kilo Code         │
                    │         │             │
                    │         ▼             │
                    │   Agente principal    │
                    └──────────┬────────────┘
                               │
                         MCP / HTTP
                               │
                               ▼
┌─────────────────────────────────────────────────────────┐
│                       AGENTMAP                          │
│                                                         │
│  Projetos                                               │
│  Agentes                                                │
│  Tarefas                                                │
│  Sessões                                                │
│  Contratos                                              │
│  Decisões                                               │
│  Dependências                                           │
│  Reservas                                               │
│  Bloqueios                                              │
│  Conflitos                                              │
│  Handoffs                                               │
│  Resultados                                             │
│  Validações                                             │
│  Checkpoints                                            │
│  Riscos                                                 │
│  Eventos                                                │
│  Mensagens                                              │
│  Monitoramento                                          │
│  Auditoria                                              │
│  Observabilidade                                        │
│                                                         │
│              Event Bus                                  │
│                  │                                      │
│          ┌───────┴────────┐                             │
│          ▼                ▼                             │
│      MCP Server      WebSocket                          │
│          │                │                             │
└──────────┼────────────────┼─────────────────────────────┘
           │                │
           ▼                ▼
       Agentes          Navegador
```

A própria documentação define o AgentMap como autoridade sobre o estado operacional, com MCP como camada de integração e Web como visualização/monitoramento/administração. ([GitHub][1])

---

# 🏗️ 3. Stack tecnológica encontrada

O backend atualmente utiliza:

| Tecnologia       | Estado                 |
| ---------------- | ---------------------- |
| Node.js          | presente               |
| TypeScript       | presente               |
| Express 4        | presente               |
| MCP SDK `1.30.0` | presente               |
| Zod 4            | presente               |
| AJV 8            | presente               |
| WebSocket `ws`   | presente               |
| OpenTelemetry    | presente               |
| Jest             | presente               |
| ts-jest          | presente               |
| tsx              | presente               |
| ts-node          | presente               |
| UUID             | presente               |
| CORS             | presente               |
| PostgreSQL/Knex  | dependências opcionais |

Isso está diretamente no `backend/package.json`. ([GitHub][2])

Um ponto importante: **não encontrei Redis, NATS, RabbitMQ ou Kafka como dependências atuais**. Portanto, o sistema não está usando hoje um message broker externo.

---

# 📁 4. Estrutura real do backend

A `main` possui:

```text
backend/
├── .ia/
├── esquemas/
├── scripts/
├── src/
│   ├── api/
│   ├── arquivos/
│   ├── config/
│   ├── mcp-server/
│   ├── observability/
│   ├── seguranca/
│   ├── servicios/
│   ├── tipos/
│   ├── validacao/
│   ├── websocket/
│   ├── app.ts
│   └── index.ts
├── testes/
├── jest.config.js
├── package.json
├── tsconfig.json
├── validar-wakeup.cjs
└── ...
```

Essa estrutura mostra que o projeto já possui **um módulo explicitamente relacionado a wake-up/teste** (`validar-wakeup.cjs`), o que é particularmente relevante para o problema atual. ([GitHub][3])

---

# 🔌 5. MCP

Aqui há uma descoberta importante.

O servidor MCP real é iniciado por:

```text
backend/src/mcp-server/index.ts
```

e utiliza:

```text
McpServer
StdioServerTransport
```

Além disso, carrega:

```text
resources
tools
subscriptionManager
globalEventBus
observabilidade
```

Ou seja:

```text
MCP
 ├── Tools
 ├── Resources
 ├── Subscriptions
 ├── Event Bus
 └── Observabilidade
```

Isso está implementado no código, não apenas documentado. ([GitHub][4])

---

# 🛠️ 6. As 131 tools MCP

A documentação atual declara **131 tools**.

Elas cobrem praticamente todo o domínio operacional:

```text
Monitoramento
Projetos
Agentes
Tarefas
Arquivos
Contratos
Solicitações
Critérios
Resultados
Artefatos
Handoffs
Pendências
Validações
Conflitos
Reservas
Sessões
Checkpoints
Aprendizados
Dependências
Responsabilidades
Decisões
Riscos
Bloqueios
...
```

Há inclusive ferramentas específicas para worktree:

```text
agentmap_tarefas_prontas_para_worktree
agentmap_verificar_dependencias_pendentes
agentmap_abrir_worktree
```

e para sessões:

```text
agentmap_sessoes_listar
agentmap_sessoes_obter
agentmap_sessoes_criar
agentmap_sessoes_atualizar
agentmap_sessoes_finalizar
agentmap_sessoes_excluir
```

e eventos:

```text
agentmap_eventos_pendentes
agentmap_eventos_listar
agentmap_eventos_confirmar
```

([GitHub][5])

---

# 📡 7. O AgentMap já possui subscriptions MCP

Essa é uma das descobertas mais importantes.

Existem recursos assináveis:

```text
agentmap://solicitacoes/{agenteId}
agentmap://handoffs/{agenteId}
agentmap://bloqueios/{projetoId}
```

E existe implementação de:

```text
resources/subscribe
subscriptions/listen
notifications/resources/updated
resources/read
resources/unsubscribe
```

([GitHub][1])

Portanto, **o AgentMap já possui uma forma de notificação MCP em tempo real**.

Mas isso **não significa automaticamente que o agente principal do Kilo será acordado**.

Essa distinção é fundamental.

---

# 🌐 8. API REST

A documentação `api-reference.md` é extensa e cobre os principais domínios.

Alguns grupos:

### Projetos

```text
GET    /api/projetos
GET    /api/projetos/scan
GET    /api/projetos/atual
GET    /api/projetos/settings
PUT    /api/projetos/settings
POST   /api/projetos
GET    /api/projetos/:id
PUT    /api/projetos/:id
POST   /api/projetos/:id/abrir
POST   /api/projetos/:id/fechar
DELETE /api/projetos/:id
...
```

### Agentes

```text
GET    /api/agentes
GET    /api/agentes/:id
POST   /api/agentes
PUT    /api/agentes/:id
DELETE /api/agentes/:id
```

### Tarefas

```text
GET    /api/tarefas
GET    /api/tarefas/:id
POST   /api/tarefas
PUT    /api/tarefas/:id
POST   /api/tarefas/:id/estado
GET    /api/tarefas/:id/contexto
DELETE /api/tarefas/:id
```

### Eventos

```text
GET    /api/eventos
GET    /api/eventos/:id
PUT    /api/eventos/:id/consumir
POST   /api/eventos
POST   /api/eventos/custom
```

### Sessões

```text
GET    /api/sessoes
GET    /api/sessoes/:id
POST   /api/sessoes
PUT    /api/sessoes/:id/finalizar
DELETE /api/sessoes/:id
```

([GitHub][6])

---

# 🤖 9. E existe uma API específica para Kilo

Isso é muito importante para o seu problema.

O AgentMap possui:

```text
GET /api/monitoramento/kilo/receive-chat
```

e:

```text
POST /api/monitoramento/mensagens
```

As mensagens possuem tipos específicos:

```text
KILO_CHAT
KILO_REPLY
KILO_RESULT
KILO_CHAT_REPLY
```

([GitHub][6])

Então hoje:

```text
FILHO
 ↓
POST /api/monitoramento/mensagens
 ↓
AGENTMAP
```

funciona.

E:

```text
FILHO
 ↓
GET /api/monitoramento/kilo/receive-chat
 ↓
AGENTMAP
```

também funciona.

---

# ⚠️ 10. E aqui encontramos exatamente o gargalo

A documentação atual do próprio AgentMap diz explicitamente:

> **"O AgentMap não empurra mensagens; o filho deve consultar periodicamente."**

E descreve o fluxo:

```text
Pai
 ↓
Agent Manager
 ↓
Filho
 ↓
POST AgentMap
 ↓
Monitoramento
 ↓
Filho consulta GET
```

([GitHub][1])

Portanto, a arquitetura atual é essencialmente:

```text
PUSH → AgentMap
PULL ← AgentMap
```

e não:

```text
PUSH ↔ PUSH
```

Isso explica o problema que você relatou.

---

# 🔥 11. O WebSocket NÃO resolve o wake-up do Kilo

O AgentMap possui:

```text
ws://localhost:3150/ws/monitoramento
```

O WebSocket envia notificações para **sessões conectadas do monitoramento** e atualiza o painel Web em tempo real. ([GitHub][1])

Então:

```text
Agente filho
   ↓
AgentMap
   ↓
WebSocket
   ↓
Browser
```

funciona.

Mas isso não significa:

```text
AgentMap
   ↓
Kilo principal idle
   ↓
novo turno
```

Portanto, adicionar mais WebSocket ao frontend **não resolve seu problema central**.

---

# 🧩 12. O dispatcher também já existe

A API possui:

```text
GET  /api/monitoramento/dispatcher/pendentes
POST /api/monitoramento/dispatcher/executar
GET  /api/monitoramento/dispatcher/logs
```

([GitHub][6])

Ou seja, você já tem uma espécie de:

```text
Evento
 ↓
Dispatcher
 ↓
Ação
```

Mas falta fechar a última milha:

```text
Dispatcher
 ↓
Sessão Kilo específica
 ↓
prompt
```

---

# 🧠 13. O Kilo atual muda completamente a análise

Pesquisei o Kilo atual, não versões antigas.

O Agent Manager atual:

* executa múltiplas sessões;
* pode criar worktrees isolados;
* possui sessões independentes;
* utiliza o runtime embutido da extensão;
* suporta `agent_manager` via chat;
* permite sessões em `worktree` ou `local`. ([Kilo][7])

E o código do Kilo confirma que as sessões locais do Agent Manager utilizam um **processo `kilo serve` compartilhado**, não um servidor independente por worktree. ([GitHub][8])

Isso é excelente para o AgentMap.

---

# 🚨 14. Existe uma API real de prompt assíncrono no Kilo

A documentação/testes atuais do Kilo mostram:

```text
POST /session/{sessionId}/prompt_async
```

e inclusive mostram como:

```text
criar sessão
↓
obter sessionID
↓
prompt_async
↓
receber eventos
↓
session.idle
```

([GitHub][9])

O próprio runtime V2 também possui:

```text
sessions.create()
sessions.prompt()
sessions.interrupt()
```

e uma arquitetura de entrada durável para prompts. ([GitHub][10])

Isso significa que a ideia que discutimos anteriormente **não é apenas teórica**.

Existe infraestrutura no Kilo para:

```text
AgentMap
   ↓
sessionID
   ↓
prompt_async
   ↓
Kilo
```

---

# 🟢 15. E existe uma opção ainda melhor: Plugin do Kilo

A documentação atual do Kilo mostra que plugins podem:

* escutar eventos de sessão;
* escutar mensagens;
* escutar permissões;
* escutar alterações de arquivos;
* executar ferramentas;
* usar o SDK;
* acessar `sessionID`;
* acessar `worktree`;
* acessar `serverUrl`;
* chamar o servidor Kilo.

([GitHub][11])

E há eventos como:

```text
session.created
session.updated
session.idle
session.error
session.deleted
session.compacted
session.diff
session.status

message.updated
message.part.updated

tool.execute.before
tool.execute.after
```

([GitHub][11])

Isso oferece uma integração muito mais nativa.

---

# 🏆 16. Minha conclusão técnica sobre o Wake-up

A arquitetura que eu investigaria como **primeira implementação** é:

```text
                    KILO PRINCIPAL
                          │
                          │ sessionID
                          ▼
                  ┌───────────────┐
                  │ AgentMap      │
                  │ Session       │
                  │ Registry      │
                  └───────┬───────┘
                          │
                          │
                    AGENTE FILHO
                          │
                          ▼
                   nova mensagem
                          │
                          ▼
                  ┌───────────────┐
                  │ Event Bus     │
                  └───────┬───────┘
                          │
                          ▼
                  Wake-Up Dispatcher
                          │
                          ▼
                  Kilo Session API
                          │
                          ▼
                    prompt_async
                          │
                          ▼
                  KILO PRINCIPAL
                          │
                          ▼
                   novo turno
                          │
                          ▼
                    consulta MCP
```

O prompt deveria ser mínimo:

```text
AgentMap: nova mensagem disponível para sua sessão.
Consulte o AgentMap e processe as mensagens pendentes.
```

Não devemos colocar toda a mensagem do filho no prompt de wake-up.

---

# 🔐 17. Mas existe uma exigência fundamental

Precisamos criar uma relação persistente:

```text
AgentMap
   │
   ├── agenteId
   ├── tarefaId
   ├── projetoId
   ├── instanciaId
   ├── worktree
   └── kiloSessionId
```

Hoje o AgentMap possui `instancias` e `sessoes`, mas eu **não considero demonstrado pela documentação atual que o vínculo persistente e confiável `AgentMap Session ↔ Kilo sessionID` esteja completo para o wake-up automático**.

Isso precisa ser implementado/verificado.

---

# 🔄 18. Também precisamos de idempotência

Imagine:

```text
filho envia mensagem
        ↓
AgentMap
        ↓
evento
        ↓
dispatcher
```

Se o evento for processado duas vezes:

```text
prompt_async
prompt_async
```

o Kilo pode receber:

```text
"Verifique mensagens"
"Verifique mensagens"
```

Isso pode gerar dois turnos.

Então precisamos de:

```text
wakeupId
eventId
messageId
sessionId
taskId
correlationId
causationId
```

e uma garantia:

```text
UMA MENSAGEM NOVA
        ↓
UM WAKE-UP LÓGICO
```

Mesmo que o evento seja entregue várias vezes.

---

# 📊 19. Event ordering

O AgentMap já possui eventos e confirmação de consumo.

Mas para um sistema realmente assíncrono eu considero necessário evoluir para:

```text
eventId
eventSequence
aggregateId
aggregateType
correlationId
causationId
timestamp
producer
consumer
status
```

Exemplo:

```json
{
	"eventId": "evt-001",
	"eventSequence": 184,
	"aggregateType": "AGENT_SESSION",
	"aggregateId": "ses-001",
	"tipo": "MESSAGE_AVAILABLE",
	"correlationId": "task-001",
	"causationId": "msg-009"
}
```

Isso evita uma quantidade enorme de problemas futuros.

---

# 🔥 20. Um ponto que eu classificaria como P0

Hoje o sistema possui:

```text
MENSAGEM
   ↓
AGENTMAP
   ↓
MONITORAMENTO
   ↓
EVENTO
   ↓
DISPATCHER
```

mas não possui uma ponte confiável:

```text
DISPATCHER
   ↓
KILO SESSION
   ↓
PROMPT
```

Portanto:

### P0 — Wake-Up de sessão

O AgentMap precisa conhecer a sessão Kilo pai e possuir um mecanismo confiável para solicitar um novo turno.

---

# 🟠 21. P0 — Registro de execução

Criaria uma entidade:

```text
WakeupRequest
```

com:

```text
id
sessionId
agentId
taskId
projectId
triggerEventId
triggerMessageId
reason
status
attempts
createdAt
claimedAt
sentAt
acknowledgedAt
completedAt
error
```

Estados:

```text
PENDING
CLAIMED
SENT
ACKNOWLEDGED
COMPLETED
FAILED
CANCELLED
COALESCED
```

Isso torna o wake-up observável.

---

# 🟠 22. P0 — coalescing

Se cinco mensagens chegarem enquanto o pai estiver idle:

```text
MSG1
MSG2
MSG3
MSG4
MSG5
```

não devemos fazer:

```text
wake
wake
wake
wake
wake
```

Devemos fazer:

```text
MSG1 ┐
MSG2 │
MSG3 ├──► WAKEUP #1
MSG4 │
MSG5 ┘
```

O Kilo acorda uma vez e consulta todas.

---

# 🟠 23. P0 — retry

Se:

```text
AgentMap → Kilo
```

falhar:

```text
retry 1
↓
backoff
↓
retry 2
↓
backoff
↓
retry 3
```

Depois:

```text
WAKEUP_FAILED
```

e o monitor mostra:

```text
🔴 Falha ao acordar sessão
```

---

# 🟠 24. P0 — recuperação após reinício

Imagine:

```text
Agente filho termina
      ↓
AgentMap recebe mensagem
      ↓
WakeupRequest criado
      ↓
AgentMap fecha
```

Ao voltar:

```text
AgentMap
 ↓
encontra WAKEUP PENDING
 ↓
reprocessa
```

Sem isso, a autonomia não é confiável.

---

# 🟡 25. Observabilidade já está muito boa

O projeto já possui OpenTelemetry.

O `package.json` mostra:

```text
@opentelemetry/api
@opentelemetry/sdk-node
@opentelemetry/sdk-trace-node
@opentelemetry/sdk-metrics
OTLP exporters
semantic conventions
```

([GitHub][2])

O README também declara traces/métricas e convenções `gen_ai.*`. ([GitHub][1])

Portanto, **eu não colocaria Redis/Grafana/etc. como primeira prioridade**.

Primeiro exploraria melhor o que já existe.

---

# 🟡 26. Segurança

O `app.ts` já implementa:

```text
X-Content-Type-Options
X-Frame-Options
X-XSS-Protection
Referrer-Policy
Content-Security-Policy
CORS
JSON body limit
URL encoded limit
```

e possui serviços específicos de:

```text
SchemaValidator
CorsService
AuditoriaService
```

([GitHub][12])

O README também declara proteção contra path traversal, validação Zod e audit logging. ([GitHub][1])

Mas existe um problema:

### ⚠️ A API local parece confiar fortemente no ambiente local.

A documentação das tools MCP diz explicitamente:

> ambiente local, sem autenticação obrigatória.

([GitHub][5])

Isso pode ser aceitável para um MVP exclusivamente local, mas se o AgentMap futuramente sair de localhost, será necessário autenticação/autorização real.

---

# 🟡 27. Persistência

Há uma questão que merece investigação.

O `package.json` possui:

```text
knex
pg
```

como **optionalDependencies**. ([GitHub][2])

Isso indica que PostgreSQL existe como possibilidade de infraestrutura, mas a implementação pública/documentação que consegui verificar não demonstra que todo o estado operacional atual dependa de PostgreSQL.

Isso precisa ser claramente definido:

```text
AgentMap é filesystem-first?
SQLite?
PostgreSQL?
híbrido?
```

Para um verdadeiro sistema de eventos confiável, isso é importante.

---

# 🔴 28. Eu não colocaria Kafka agora

Para o seu cenário local:

```text
Windows
VS Code
Kilo
AgentMap
poucos agentes
```

Kafka seria uma complexidade desnecessária.

Da mesma forma, não vejo justificativa imediata para:

```text
Kubernetes
Kafka
microservices
service mesh
```

O AgentMap ainda pode evoluir bastante dentro do atual:

```text
Node
TypeScript
Express
MCP
WebSocket
OpenTelemetry
filesystem/DB
```

---

# 🟢 29. Tecnologias que eu colocaria para avaliação

Não como instalação automática, mas como candidatos:

### Comunicação Kilo

**Kilo Plugin + Kilo SDK + Session API**

É o primeiro caminho a investigar porque é nativo do ecossistema Kilo. ([GitHub][11])

### Event Bus

O atual Event Bus interno deve permanecer inicialmente.

Só migraria para:

```text
NATS
```

ou:

```text
Redis Streams
```

se os testes mostrarem que o processo único não atende.

### Observabilidade

Continuar com:

```text
OpenTelemetry
```

porque já existe.

### Frontend

O WebSocket atual pode permanecer.

### Persistência

Definir claramente uma fonte durável de verdade antes de adicionar outra tecnologia.

---

# 🧠 30. Uma referência externa interessante

Encontrei também uma arquitetura open source recente de orquestração de agentes, Paperclip, que trata explicitamente **wakeups como uma entidade persistente**, com fila, idempotency key, coalescing, retries e estados como `queued`, `claimed`, `completed`, `failed` etc. ([GitHub][13])

Não significa copiar Paperclip.

Mas a ideia confirma algo importante para o AgentMap:

> **Wake-up não deve ser simplesmente uma chamada HTTP. Deve ser uma operação operacional persistente, rastreável e recuperável.**

---

# 🏆 31. Classificação das melhorias

## 🔴 P0 — Críticas

### P0.1 — Wake-Up real do agente pai

```text
AgentMap
 ↓
Kilo Session
 ↓
prompt_async
```

### P0.2 — Registro `KiloSession`

Persistir:

```text
agentMapSessionId
kiloSessionId
worktree
agentId
taskId
projectId
```

### P0.3 — WakeupRequest persistente

### P0.4 — Idempotência

### P0.5 — Coalescing

### P0.6 — Retry + exponential backoff

### P0.7 — Recovery após restart

### P0.8 — Correlation/Causation IDs

### P0.9 — Event sequence/order

### P0.10 — Teste E2E real

O teste deve provar:

```text
Pai cria filho
 ↓
Pai fica idle
 ↓
Filho trabalha
 ↓
Filho termina
 ↓
AgentMap recebe mensagem
 ↓
AgentMap acorda pai
 ↓
Pai executa novo turno
 ↓
Pai consulta mensagem
 ↓
Pai toma nova decisão
```

**Sem intervenção humana.**

---

# 🟠 P1 — Muito importantes

* heartbeat;
* agente travado;
* sessão órfã;
* worktree órfão;
* timeout de execução;
* dead-letter;
* fila de wakeups;
* prioridade;
* cancelamento;
* pausa;
* retomada;
* auditoria completa dos wakeups;
* timeline de execução;
* estado de comunicação;
* health check por integração;
* registro de capabilities do Kilo;
* versionamento de protocolo AgentMap ↔ Kilo.

---

# 🟡 P2 — Alta obrigatoriedade

* RBAC mais formal;
* autenticação opcional configurável;
* API versioning;
* OpenAPI;
* contratos de resposta padronizados;
* paginação;
* filtros avançados;
* rate limiting;
* testes de concorrência;
* testes de carga;
* contract testing;
* schema evolution;
* migrações formais;
* métricas de agentes;
* métricas de ferramentas;
* métricas de wake-up.

---

# 🔵 P3 — Evolução

* múltiplos orquestradores;
* múltiplas IDEs;
* outros agentes além do Kilo;
* ACP;
* plugins externos;
* visualização de DAG;
* replay de execução;
* análise de dependências;
* detecção automática de conflitos;
* recuperação automática avançada;
* planejamento automático.

---

# 🧭 32. Arquitetura que eu considero mais coerente para a próxima evolução

```text
                         ┌──────────────────────┐
                         │      OPERADOR        │
                         │ Browser / VS Code    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      AGENTMAP        │
                         │                      │
                         │ Command / Query      │
                         │ Agent Registry       │
                         │ Task Registry        │
                         │ Session Registry     │
                         │ Worktree Registry    │
                         │ Message Service      │
                         │ Event Service        │
                         │ Wakeup Service       │
                         │ Audit                │
                         └──────────┬───────────┘
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                         ▼                     ▼
                   Event Bus             Persistence
                         │
                         ▼
                 Wake-Up Dispatcher
                         │
                         ▼
                  Kilo Adapter
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
       Kilo Session A          Kilo Session B
             │                       │
             ▼                       ▼
         Worktree A              Worktree B
             │                       │
             ▼                       ▼
         Agente Filho             Agente Filho
             │                       │
             └──────────┬────────────┘
                        ▼
                     AgentMap
```

---

# 🚨 33. O ponto mais importante da auditoria

Existe uma diferença entre:

### O que você pensava que faltava

```text
"AgentMap não consegue saber que o filho terminou."
```

e o que realmente encontrei:

```text
AgentMap
   │
   ├── recebe mensagem
   ├── registra mensagem
   ├── gera eventos
   ├── possui Event Bus
   ├── possui dispatcher
   ├── possui subscriptions MCP
   ├── possui WebSocket
   ├── possui API específica Kilo
   └── possui estado de sessão
```

**O problema não está na detecção.**

O problema está no:

```text
             ÚLTIMO TRECHO

AgentMap
   │
   │ "há algo novo"
   ▼
??????????????????????
   │
   │
   ▼
Kilo principal idle
```

É exatamente essa ponte que precisa ser construída.

---

# 🔥 34. E encontrei uma informação ainda mais importante no Kilo

O Kilo atual já possui uma infraestrutura de sessão que permite:

```text
sessionID
   ↓
prompt_async
```

e eventos globais via SSE. ([GitHub][9])

Além disso, o sistema de plugins do Kilo recebe `sessionID` e possui eventos `session.idle`. ([GitHub][11])

Portanto, **não precisamos criar um segundo "motor de agentes" dentro do AgentMap**.

O desenho correto é:

```text
Kilo = runtime do agente

AgentMap = control plane
```

Ou seja:

```text
              AGENTMAP
             CONTROL PLANE
                  │
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
      Estado             Eventos
         │                 │
         └────────┬────────┘
                  ▼
            Kilo Adapter
                  │
                  ▼
             Kilo Runtime
                  │
                  ▼
              Agente
```

Isso preserva a responsabilidade que o seu próprio projeto já estabelece: **AgentMap coordena/governa; Kilo executa os agentes**. ([GitHub][1])

---

# 🧩 35. Veredito da auditoria

| Área                      | Situação encontrada                  |
| ------------------------- | ------------------------------------ |
| Núcleo AgentMap           | 🟢 Muito desenvolvido                |
| Modelo operacional        | 🟢 Muito desenvolvido                |
| API REST                  | 🟢 Ampla                             |
| MCP                       | 🟢 Muito desenvolvido                |
| MCP subscriptions         | 🟢 Existe                            |
| Event Bus                 | 🟢 Existe                            |
| WebSocket                 | 🟢 Existe                            |
| Monitoramento             | 🟢 Existe                            |
| Dispatcher                | 🟢 Existe                            |
| Kilo integration          | 🟢 Existe                            |
| Agent Manager integration | 🟡 Indireta                          |
| Sessão AgentMap           | 🟢 Existe                            |
| Sessão Kilo persistida    | 🟡 Precisa consolidar                |
| Filho → AgentMap          | 🟢 Funciona                          |
| AgentMap → Filho          | 🟢 Consulta/pull                     |
| Filho → Pai automático    | 🔴 Não fechado                       |
| AgentMap → Kilo idle      | 🔴 Gargalo principal                 |
| Wake-up persistente       | 🔴 Precisa evoluir                   |
| Idempotência de wake-up   | 🔴 Precisa evoluir                   |
| Coalescing                | 🔴 Precisa evoluir                   |
| Recovery                  | 🟡 Precisa aprofundar                |
| Observabilidade           | 🟢 Muito boa                         |
| Segurança local           | 🟢 Boa base                          |
| Segurança multi-host      | 🟡 Precisa evoluir                   |
| Arquitetura assíncrona    | 🟡 Base forte, última milha faltando |
| Autonomia real            | 🟡 Parcial                           |
| Autonomia sem intervenção | 🔴 Ainda não completa                |

### Minha conclusão

**Eu não faria uma grande reescrita do AgentMap.**

O código atual já contém grande parte das peças corretas. A evolução deve ser **incremental e cirúrgica**, principalmente em torno de:

```text
Kilo Session Registry
        +
Wakeup Request
        +
Wakeup Dispatcher
        +
Kilo Session Adapter
        +
Idempotência
        +
Coalescing
        +
Retry
        +
Recovery
        +
E2E proof
```

E, sobretudo, **eu não adicionaria Redis/NATS/Kafka antes de testar essa arquitetura usando o Event Bus existente + persistência atual + Kilo Session API/SDK/Plugin**.

O Kilo atual fornece exatamente as primitivas que tornam essa abordagem possível: Agent Manager com sessões/worktrees, servidor HTTP, `prompt_async`, eventos SSE e plugins com hooks de sessão. ([Kilo][7])

[Documentação atual do Agent Manager do Kilo](https://kilo.ai/docs/automate/agent-manager?utm_source=chatgpt.com)
[Documentação atual de Plugins do Kilo](https://kilo.ai/docs/automate/extending/plugins?utm_source=chatgpt.com)
[Código/ especificação atual da Session API do Kilo](https://github.com/Kilo-Org/kilocode/blob/main/specs/v2/session.md?utm_source=chatgpt.com)

**Observação de precisão:** esta auditoria foi feita sobre os arquivos e documentação da `main` que consegui inspecionar diretamente pela superfície pública do GitHub, além da implementação/documentação oficial atual do Kilo. Portanto, não vou afirmar que executei localmente os ~180 endpoints ou todos os 131 tools; os números e recursos foram confrontados com a documentação e com pontos centrais do código. Para uma auditoria de execução real, o próximo passo seria rodar o AgentMap e o Kilo juntos e fazer um **teste E2E instrumentado do cenário pai → filho → mensagem → wake-up → novo turno do pai**, que é justamente o teste que falta para provar essa última parte da arquitetura.

[1]: https://github.com/PauloDeTasso/AgentMap "GitHub - PauloDeTasso/AgentMap: Plataforma open source para planejamento, mapeamento, documentação e orquestração de agentes de IA em projetos de software. · GitHub"
[2]: https://github.com/PauloDeTasso/AgentMap/blob/main/backend/package.json "AgentMap/backend/package.json at main · PauloDeTasso/AgentMap · GitHub"
[3]: https://github.com/PauloDeTasso/AgentMap/tree/main/backend "AgentMap/backend at main · PauloDeTasso/AgentMap · GitHub"
[4]: https://github.com/PauloDeTasso/AgentMap/blob/main/backend/src/mcp-server/index.ts "AgentMap/backend/src/mcp-server/index.ts at main · PauloDeTasso/AgentMap · GitHub"
[5]: https://github.com/PauloDeTasso/AgentMap/blob/main/docs/referencia-tools-mcp.md "AgentMap/docs/referencia-tools-mcp.md at main · PauloDeTasso/AgentMap · GitHub"
[6]: https://github.com/PauloDeTasso/AgentMap/blob/main/docs/api-reference.md "AgentMap/docs/api-reference.md at main · PauloDeTasso/AgentMap · GitHub"
[7]: https://kilo.ai/docs/automate/agent-manager?utm_source=chatgpt.com "Agent Manager"
[8]: https://github.com/Kilo-Org/kilocode/blob/main/packages/kilo-vscode/AGENTS.md?utm_source=chatgpt.com "kilocode/packages/kilo-vscode/AGENTS.md at main · Kilo-Org/kilocode · GitHub"
[9]: https://github.com/Kilo-Org/kilocode/blob/main/TESTING.md?utm_source=chatgpt.com "kilocode/TESTING.md at main · Kilo-Org/kilocode · GitHub"
[10]: https://github.com/Kilo-Org/kilocode/blob/main/specs/v2/session.md?utm_source=chatgpt.com "kilocode/specs/v2/session.md at main · Kilo-Org/kilocode · GitHub"
[11]: https://github.com/kilo-org/kilocode/blob/main/packages/kilo-docs/pages/automate/extending/plugins.md?utm_source=chatgpt.com "kilocode/packages/kilo-docs/pages/automate/extending/plugins.md at main · Kilo-Org/kilocode · GitHub"
[12]: https://github.com/PauloDeTasso/AgentMap/blob/main/backend/src/app.ts "AgentMap/backend/src/app.ts at main · PauloDeTasso/AgentMap · GitHub"
[13]: https://github.com/paperclipai/paperclip/blob/master/doc/spec/agent-runs.md?utm_source=chatgpt.com "paperclip/doc/spec/agent-runs.md at master · paperclipai/paperclip · GitHub"
