Sim. Com a documentação atual e o código/comportamento real que consegui verificar, dá para transformar isso em um plano **implementável**, sem depender de funcionalidades que o Kilo não possui.

E faço uma correção importante da resposta anterior: **a documentação atual do Kilo já documenta oficialmente `agent_manager` com `action: "list"` e `action: "prompt"`**. O `prompt` é direcionado a uma sessão gerenciada existente; não cria sessão, não faz broadcast e não espera a conclusão. O ponto que ainda precisa ser tratado é o bug de **child → parent** registrado no Kilo. ([GitHub][1])

# 🏗️ Plano completo: AgentMap como orquestrador do Kilo Code

## 1. Objetivo

Construir o AgentMap como uma **camada de orquestração local**, utilizando o Kilo Code como runtime de execução dos agentes.

O objetivo final será:

```text
                         VOCÊ
                          │
                          ▼
                ┌───────────────────┐
                │ KILO CHAT /       │
                │ AGENTE GERENTE    │
                └─────────┬─────────┘
                          │
                     agent_manager
                          │
                          ▼
                ┌───────────────────┐
                │     AGENTMAP      │
                │   ORCHESTRATOR    │
                └─────────┬─────────┘
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
     BACKEND          FRONTEND             QA
     Session           Session           Session
        │                 │                │
        ▼                 ▼                ▼
    Worktree           Worktree         Worktree
```

Mas com **comunicação bidirecional**:

```text
GERENTE
   │
   │ tarefa
   ▼
AGENTMAP
   │
   ▼
AGENTE FILHO
   │
   │ resultado/evento
   ▼
AGENTMAP
   │
   ▼
GERENTE
```

---

# 2. O que vamos reutilizar do Kilo

Não devemos recriar o que o Kilo já faz.

O Kilo já fornece:

### Runtime

O Agent Manager usa o runtime embutido da extensão e compartilha o processo `kilo serve`. ([Kilo][2])

### Sessões

Cada execução é uma sessão Kilo.

### Worktrees

O Kilo cria worktrees em:

```text
.kilo/worktrees/
```

e mantém o estado do Agent Manager em:

```text
.kilo/agent-manager.json
```

([Kilo][2])

### `agent_manager`

O Kilo já permite:

```text
start
list
prompt
```

com:

```text
mode: worktree
mode: local
```

e até **1–20 tarefas em uma requisição**. ([Kilo][2])

### Eventos

A extensão utiliza SSE para receber eventos do runtime, fazendo roteamento por diretório/sessão. ([Kilo][3])

### Permissões

O Kilo possui autorização específica para:

```text
worktree
local
overview
prompt
```

e `prompt` em sessão existente exige aprovação própria na primeira utilização. ([Kilo][4])

---

# 3. O que NÃO vamos fazer

Não vamos criar:

```text
❌ um LLM próprio
❌ um executor de código próprio
❌ um substituto do Kilo
❌ um sistema de worktree paralelo ao Kilo
❌ um segundo mecanismo de sessão
```

O AgentMap será:

> **Control Plane / Orchestrator**

e o Kilo será:

> **Agent Runtime**

Essa separação é fundamental.

---

# 4. Arquitetura definitiva

Eu usaria:

```text
                    ┌───────────────────┐
                    │       USUÁRIO     │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ KILO CHAT         │
                    │ GERENTE           │
                    └─────────┬─────────┘
                              │
                              │ MCP / integração
                              ▼
┌─────────────────────────────────────────────────────┐
│                    AGENTMAP                         │
│                                                     │
│  ┌──────────────┐     ┌─────────────────────────┐  │
│  │ Agent        │     │ Session Registry        │  │
│  │ Registry     │     │                         │  │
│  └──────────────┘     └─────────────────────────┘  │
│                                                     │
│  ┌──────────────┐     ┌─────────────────────────┐  │
│  │ Task         │     │ Message Router          │  │
│  │ Orchestrator │     │                         │  │
│  └──────────────┘     └─────────────────────────┘  │
│                                                     │
│  ┌──────────────┐     ┌─────────────────────────┐  │
│  │ Event Bus    │     │ Permission Manager      │  │
│  └──────────────┘     └─────────────────────────┘  │
│                                                     │
│  ┌──────────────┐     ┌─────────────────────────┐  │
│  │ Worktree     │     │ Audit / State           │  │
│  │ Registry     │     │                         │  │
│  └──────────────┘     └─────────────────────────┘  │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
                    ┌───────────────────┐
                    │ KILO RUNTIME      │
                    │ kilo serve        │
                    └─────────┬─────────┘
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
           Session A      Session B      Session C
           Backend        Frontend       QA
               │              │              │
               ▼              ▼              ▼
           Worktree A     Worktree B     Worktree C
```

---

# 5. Registro de agentes

O AgentMap precisa saber **quem é quem**.

Exemplo:

```text
agents/
├── gerente/
├── arquitetura/
├── backend/
├── frontend/
├── banco/
├── qa/
├── seguranca/
└── devops/
```

Cada agente terá metadados:

```text
agentId
nome
funcao
especialidades
modelo
permissoes
capabilities
estado
sessionId
worktreeId
```

Importante:

**`agentId` não é `sessionId`.**

Exemplo:

```text
agentId = backend
sessionId = ses_01JXYZ...
```

O agente lógico permanece o mesmo.

A sessão pode mudar.

---

# 6. Registro de sessões

Essa será uma das estruturas mais importantes.

```text
SessionRegistry
```

Cada sessão terá:

```text
sessionId
agentId
parentSessionId
projectId
worktreeId
workspacePath
status
createdAt
updatedAt
lastEvent
```

Estados:

```text
PREPARANDO
AGUARDANDO
EXECUTANDO
BLOQUEADO
AGUARDANDO_APROVACAO
CONCLUIDO
FALHOU
CANCELADO
OFFLINE
```

---

# 7. Worktree Registry

O AgentMap não deve inventar os caminhos.

Ele deve registrar o que o Kilo criou.

Exemplo:

```text
WorktreeRegistry

worktreeId
agentId
sessionId
branchName
path
baseBranch
status
```

E teremos:

```text
.kilo/
├── agent-manager.json
├── worktrees/
│   ├── backend/
│   ├── frontend/
│   └── qa/
└── ...
```

O Kilo oficialmente usa `.kilo/worktrees/` e `.kilo/agent-manager.json`. ([Kilo][2])

---

# 8. Sistema de mensagens

Aqui está a principal melhoria que eu faria.

Não mandaríamos apenas:

```text
"terminou"
```

Usaríamos mensagens estruturadas.

### TaskRequest

```text
{
	"type": "TASK_REQUEST",
	"taskId": "...",
	"from": "gerente",
	"to": "backend",
	"sessionId": "...",
	"prompt": "...",
	"priority": "NORMAL"
}
```

### TaskStarted

```text
{
	"type": "TASK_STARTED",
	"taskId": "...",
	"agentId": "backend"
}
```

### TaskProgress

```text
{
	"type": "TASK_PROGRESS",
	"taskId": "...",
	"progress": 60,
	"message": "API implementada"
}
```

### TaskBlocked

```text
{
	"type": "TASK_BLOCKED",
	"taskId": "...",
	"reason": "Contrato do frontend incompatível"
}
```

### TaskCompleted

```text
{
	"type": "TASK_COMPLETED",
	"taskId": "...",
	"result": "...",
	"filesChanged": [],
	"tests": []
}
```

### TaskFailed

```text
{
	"type": "TASK_FAILED",
	"taskId": "...",
	"error": "..."
}
```

---

# 9. O fluxo de ida

O gerente recebe:

> "Crie a API de clientes."

Ele decide:

```text
GERENTE
   ↓
AgentMap
   ↓
BACKEND
```

O AgentMap identifica:

```text
agentId = backend
```

localiza:

```text
sessionId
```

e então utiliza a capacidade real do Kilo:

```text
agent_manager
action: prompt
```

para mandar a instrução à sessão existente. A documentação atual descreve exatamente esse uso de `prompt`. ([GitHub][1])

---

# 10. O fluxo de volta

Aqui precisamos separar **duas implementações possíveis**.

## Opção A — usar o `agent_manager` diretamente

```text
BACKEND
   │
   │ agent_manager
   │ prompt
   ▼
GERENTE
```

É a solução mais direta.

Mas existe atualmente o problema documentado no Kilo:

```text
child → parent
```

pode falhar porque o parent não está registrado como sessão gerenciada. ([GitHub][5])

Portanto:

**não devemos fazer o AgentMap depender exclusivamente disso.**

---

# 11. Solução robusta para o retorno

O AgentMap será o intermediário.

```text
BACKEND
   │
   │ evento
   ▼
AGENTMAP
   │
   │ resolve parentSessionId
   ▼
GERENTE
```

Assim o agente filho não precisa conhecer detalhes internos do Agent Manager.

Ele conhece:

```text
parentSessionId
```

e o AgentMap conhece como entregar a mensagem.

---

# 12. Mas como entregar ao Kilo?

Aqui existem duas camadas.

### Camada 1 — integração nativa

Quando o Kilo permitir:

```text
agent_manager.prompt(parentSessionId)
```

usamos isso.

### Camada 2 — fallback

Se o parent não estiver no escopo do Agent Manager:

```text
AgentMap
   ↓
mecanismo de integração da extensão
   ↓
sessão gerente
```

**Não devemos criar um script externo simulando o usuário.**

Nada de:

```text
AutoHotKey
PowerShell digitando no VSCode
clicar na tela
```

Isso seria frágil.

---

# 13. Melhor solução arquitetural

Eu faria o AgentMap possuir um:

```text
MessageRouter
```

com adaptadores:

```text
MessageRouter
│
├── KiloAgentManagerAdapter
│
├── KiloSessionAdapter
│
└── FutureAdapter
```

Assim:

```text
AgentMap
   │
   ▼
MessageRouter
   │
   ▼
KiloAdapter
```

Se amanhã o Kilo mudar a API:

```text
AgentMap
   │
   ▼
MessageRouter
   │
   ▼
novo adapter
```

O restante permanece intacto.

---

# 14. MCP entra aqui

Como você já está trabalhando com MCP, ele é uma excelente interface para o AgentMap.

O Kilo possui suporte oficial a MCP para conectar ferramentas e serviços externos. ([Kilo][6])

Então o AgentMap pode expor ferramentas como:

```text
agentmap_list_agents
agentmap_get_agent
agentmap_start_task
agentmap_send_task
agentmap_get_task
agentmap_cancel_task
agentmap_report_progress
agentmap_report_result
agentmap_get_dependencies
agentmap_request_approval
```

O gerente passa a enxergar:

```text
Kilo
  ↓
MCP
  ↓
AgentMap
```

---

# 15. O agente filho também pode utilizar MCP

Então temos:

```text
GERENTE
   │
   ▼
AgentMap MCP
   │
   ▼
BACKEND
   │
   ▼
AgentMap MCP
   │
   ▼
GERENTE
```

Isso cria a comunicação bidirecional sem depender de prompts mágicos.

---

# 16. Máquina de estados

Eu colocaria uma máquina de estados formal.

```text
CRIADA
  │
  ▼
PREPARANDO
  │
  ▼
AGUARDANDO
  │
  ▼
EXECUTANDO
  │
  ├───────────────┐
  ▼               ▼
CONCLUIDA       BLOQUEADA
                  │
                  ▼
             AGUARDANDO_APROVACAO
                  │
                  ▼
              EXECUTANDO
```

Falhas:

```text
EXECUTANDO
    │
    ▼
  FALHOU
```

Cancelamento:

```text
qualquer estado
      │
      ▼
CANCELANDO
      │
      ▼
CANCELADA
```

---

# 17. Dependências entre agentes

Não devemos deixar:

```text
Backend
Frontend
QA
```

trabalhando indiscriminadamente.

Devemos ter DAG:

```text
ARQUITETURA
     │
     ├──────────────┐
     ▼              ▼
 BACKEND         FRONTEND
     │              │
     └──────┬───────┘
            ▼
           QA
            │
            ▼
          DEVOPS
```

O AgentMap só libera uma tarefa quando suas dependências estiverem satisfeitas.

---

# 18. Exemplo real

Usuário:

> Quero implementar cadastro de clientes.

Gerente:

```text
TASK-001
```

Divide:

```text
TASK-002 arquitetura
TASK-003 banco
TASK-004 backend
TASK-005 frontend
TASK-006 testes
```

Mas:

```text
003 depende de 002
004 depende de 003
005 depende de 002
006 depende de 004 + 005
```

AgentMap controla:

```text
002 → concluída
       │
       ├──→ 003
       └──→ 005

003 → concluída
       │
       ▼
      004

004 + 005
       │
       ▼
      006
```

---

# 19. Comunicação em tempo real

O AgentMap deve possuir um Event Bus.

Eventos:

```text
AGENT_ONLINE
AGENT_OFFLINE
SESSION_CREATED
SESSION_STARTED
TASK_CREATED
TASK_STARTED
TASK_PROGRESS
TASK_BLOCKED
TASK_COMPLETED
TASK_FAILED
APPROVAL_REQUIRED
MESSAGE_SENT
MESSAGE_RECEIVED
WORKTREE_CREATED
WORKTREE_READY
TEST_STARTED
TEST_FAILED
TEST_PASSED
```

Isso permite que a sua interface mostre:

```text
┌─────────────────────────────────────────────┐
│ AGENTMAP                                    │
├─────────────────────────────────────────────┤
│                                             │
│ 🟢 Gerente       EXECUTANDO                 │
│ 🟢 Backend       EXECUTANDO  68%            │
│ 🟢 Frontend      EXECUTANDO  42%            │
│ 🟡 QA            AGUARDANDO                 │
│                                             │
├─────────────────────────────────────────────┤
│ EVENTOS                                     │
│                                             │
│ 15:31 Backend terminou ClienteRepository    │
│ 15:30 Frontend iniciou formulário            │
│ 15:28 Banco migration V3 concluída         │
└─────────────────────────────────────────────┘
```

---

# 20. Interface web do AgentMap

Seu desejo anterior era justamente acompanhar tudo pelo navegador.

Então:

```text
Browser
   │
   │ WebSocket/SSE
   ▼
AgentMap API
   │
   ▼
Orchestrator
```

O navegador **não conversa diretamente com os agentes**.

Ele conversa com o AgentMap.

Isso permite:

```text
visualizar
pausar
aprovar
cancelar
reenviar
inspecionar
```

quando permitido.

---

# 21. Controle manual / automático

Precisamos colocar isso como uma política de execução.

```text
EXECUTION_MODE

MANUAL
SEMI_AUTOMATIC
AUTONOMOUS
```

### MANUAL

```text
AgentMap
   ↓
"Backend precisa executar"
   ↓
VOCÊ APROVA
   ↓
Backend
```

### SEMI_AUTOMATIC

```text
tarefas normais → automáticas

ações críticas → aprovação humana
```

### AUTONOMOUS

```text
AgentMap
   ↓
agentes
   ↓
resultados
   ↓
AgentMap
   ↓
próxima tarefa
```

---

# 22. Ações críticas

Mesmo no modo autônomo, eu manteria gates para:

```text
DROP DATABASE
DELETE MASSIVO
PRODUÇÃO
DEPLOY
ALTERAÇÃO DE SEGREDOS
ALTERAÇÃO DE INFRAESTRUTURA
PUSH FORCE
MERGE CRÍTICO
```

O próprio Kilo já possui sistema de permissões/auto-approval para ferramentas, portanto o AgentMap deve respeitar essa camada em vez de tentar contorná-la. ([Kilo][4])

---

# 23. Contexto entre agentes

Não devemos simplesmente mandar:

```text
"faça a API"
```

O AgentMap gera um pacote contextual:

```text
TaskContext
│
├── objetivo
├── requisitos
├── contrato
├── arquivos relevantes
├── dependências
├── decisões arquiteturais
├── restrições
├── resultado anterior
└── critérios de aceite
```

Assim o Backend recebe:

```text
CONTRATO:

POST /api/v1/clientes

Entrada:
...

Saída:
...

Regras:
...

Arquivos:
...
```

---

# 24. `AGENTS.md`

O Kilo oficialmente reconhece:

```text
AGENTS.md
CLAUDE.md
CONTEXT.md
```

e também permite instruções específicas por diretório. ([Kilo][7])

Então o AgentMap deve usar isso.

Por exemplo:

```text
projeto/
├── AGENTS.md
│
├── backend/
│   └── AGENTS.md
│
├── frontend/
│   └── AGENTS.md
│
└── infra/
    └── AGENTS.md
```

O agente recebe automaticamente o contexto apropriado conforme acessa os diretórios.

---

# 25. AgentMap não deve substituir `AGENTS.md`

Cada coisa terá sua função.

### `AGENTS.md`

```text
COMO o agente deve trabalhar.
```

### AgentMap

```text
O QUE o agente deve trabalhar.
QUANDO.
COM QUEM.
DEPENDÊNCIAS.
ESTADO.
RESULTADO.
```

Essa separação é excelente.

---

# 26. Persistência

Como você já trabalha com PostgreSQL, eu faria:

```text
AgentMap
   │
   ▼
PostgreSQL
```

Tabelas principais:

```text
projetos
agentes
sessoes
worktrees
tarefas
dependencias_tarefas
mensagens
eventos
permissoes
aprovacoes
execucoes
artefatos
```

---

# 27. Exemplo de relacionamento

```text
projeto
   │
   ├── agentes
   │
   ├── sessões
   │
   ├── worktrees
   │
   └── tarefas
           │
           ├── dependências
           ├── mensagens
           ├── eventos
           └── artefatos
```

---

# 28. Segurança

Como isso controla agentes capazes de executar comandos, segurança deve entrar desde o primeiro commit.

### API

```text
JWT
RBAC
rate limiting
CSRF quando aplicável
CORS restritivo
validação DTO
sanitização
logs
auditoria
```

### AgentMap

Permissões por:

```text
agent
project
action
workspace
```

Exemplo:

```text
BACKEND

READ:
src/**
pom.xml

WRITE:
src/main/**
src/test/**

DENY:
infra/prod/**
.env
secrets/**
```

---

# 29. Não permitir que o agente invente outro agente

O AgentMap deve validar:

```text
toAgentId
```

contra:

```text
AgentRegistry
```

Se não existir:

```text
AGENT_NOT_FOUND
```

Nada de:

```text
"mande para o agente segurança"
```

e o sistema aceitar qualquer string.

---

# 30. Protocolo de comunicação

Eu criaria um envelope único:

```text
{
	"messageId": "...",
	"projectId": "...",
	"taskId": "...",
	"fromAgentId": "...",
	"toAgentId": "...",
	"fromSessionId": "...",
	"toSessionId": "...",
	"type": "TASK_COMPLETED",
	"timestamp": "...",
	"payload": {}
}
```

Isso resolve grande parte da confusão entre:

```text
agente
sessão
tarefa
worktree
mensagem
```

---

# 31. Identificação das sessões Kilo

Nunca depender apenas do nome:

```text
Backend
```

Usar:

```text
projectId
agentId
sessionId
worktreeId
```

Exemplo:

```text
projectId:
proj_001

agentId:
backend

sessionId:
ses_abc123

worktreeId:
wt_backend_001
```

---

# 32. Descoberta

Na inicialização do AgentMap:

```text
1. Detecta projeto
2. Detecta Git
3. Detecta .kilo
4. Lê agent-manager.json
5. Descobre worktrees
6. Reconcilia sessões
7. Atualiza SessionRegistry
8. Conecta eventos
```

O AgentMap nunca deve simplesmente assumir que seu banco está correto.

Ele deve fazer:

```text
DATABASE
   ↕
RECONCILIATION
   ↕
KILO
```

---

# 33. Reconciliação

Se PostgreSQL disser:

```text
Backend = ONLINE
```

mas o Kilo disser:

```text
sessão inexistente
```

o AgentMap corrige:

```text
Backend = OFFLINE
```

Se o Kilo possuir uma sessão desconhecida:

```text
UNKNOWN_SESSION
```

e o sistema pode mostrar:

```text
⚠ Sessão não registrada
```

---

# 34. Recuperação após reiniciar

Isso é obrigatório.

Se:

```text
AgentMap desligou
```

os agentes podem continuar.

Ao voltar:

```text
AgentMap
   ↓
reconciliação
   ↓
Kilo
   ↓
sessões
   ↓
restauração do estado
```

Não podemos depender da memória do processo.

---

# 35. Fila

Eu colocaria uma fila persistente.

```text
PENDING
   ↓
DISPATCHING
   ↓
DELIVERED
   ↓
ACKNOWLEDGED
```

Se falhar:

```text
DELIVERY_FAILED
```

e:

```text
retryCount
```

com backoff.

---

# 36. Idempotência

Uma mensagem nunca deve executar duas vezes por acidente.

Usar:

```text
messageId
taskId
attempt
```

Se:

```text
messageId = MSG-001
```

já foi processada:

```text
não executar novamente
```

---

# 37. ACK

O agente pode confirmar:

```text
TASK_RECEIVED
```

Então:

```text
AgentMap
   ↓
TASK_REQUEST
   ↓
Backend
   ↓
TASK_RECEIVED
```

Se não receber ACK:

```text
timeout
```

e o AgentMap decide:

```text
retry
ou
blocked
ou
human approval
```

---

# 38. Fluxo completo real

### Etapa 1

Usuário:

```text
"Implemente cadastro de clientes."
```

### Etapa 2

Gerente analisa.

### Etapa 3

Gerente chama:

```text
AgentMap.startTask()
```

### Etapa 4

AgentMap verifica:

```text
backend
```

### Etapa 5

Se não existir sessão:

```text
Kilo agent_manager
mode = worktree
```

O Kilo cria:

```text
.kilo/worktrees/backend
```

e inicia a sessão. Isso é comportamento oficial documentado. ([Kilo][2])

### Etapa 6

AgentMap registra:

```text
agentId
sessionId
worktree
branch
```

### Etapa 7

AgentMap envia:

```text
agent_manager.prompt
```

para a sessão.

### Etapa 8

Backend executa.

### Etapa 9

Backend envia evento:

```text
TASK_COMPLETED
```

### Etapa 10

AgentMap recebe.

### Etapa 11

Atualiza:

```text
task.status = CONCLUIDA
```

### Etapa 12

Resolve:

```text
parentSessionId
```

### Etapa 13

Entrega resultado ao gerente.

### Etapa 14

Gerente decide:

```text
próxima tarefa
```

---

# 39. Onde entra o Git

Não devemos fazer:

```text
agentes → mesmo diretório
```

Para tarefas paralelas:

```text
agente A → worktree A
agente B → worktree B
agente C → worktree C
```

O Kilo recomenda worktrees justamente para isolamento de filesystem/Git. ([Kilo][8])

---

# 40. Merge

O AgentMap não deve automaticamente misturar tudo.

Fluxo:

```text
Backend
   ↓
concluído
   ↓
testes
   ↓
review
   ↓
aprovação
   ↓
merge
```

O próprio workflow oficial do Kilo trabalha com:

```text
worktree → parent
```

via Apply, Merge ou PR. ([Kilo][8])

---

# 41. QA como gate

Muito importante:

```text
Backend
   ↓
QA
   ↓
PASS
   ↓
Merge
```

Se:

```text
FAIL
```

então:

```text
QA
 ↓
AgentMap
 ↓
Backend
```

e o ciclo recomeça.

---

# 42. Segurança como gate

Para seu tipo de projeto:

```text
Backend
   ↓
Security Agent
   ↓
QA
   ↓
Merge
```

ou em paralelo:

```text
Backend ────────┐
                ├── Security
Frontend ───────┘
```

---

# 43. Os 8 agentes

Considerando o limite de 8 que você definiu anteriormente, eu manteria:

| # | Agente        | Responsabilidade                      |
| - | ------------- | ------------------------------------- |
| 1 | **Gerente**   | Orquestração e decisões               |
| 2 | **Arquiteto** | DDD, arquitetura e contratos          |
| 3 | **Backend**   | API e regras de negócio               |
| 4 | **Frontend**  | UI e integração                       |
| 5 | **Dados**     | PostgreSQL, migrations e persistência |
| 6 | **Segurança** | DevSecOps e segurança                 |
| 7 | **QA**        | Testes e validação                    |
| 8 | **DevOps**    | Docker, Linux, CI/CD e deploy         |

O AgentMap controla todos.

---

# 44. O gerente não deve fazer tudo

O gerente deve:

```text
PENSAR
DECOMPOR
DELEGAR
ACOMPANHAR
VALIDAR
DECIDIR
```

Não:

```text
editar 300 arquivos
```

Isso mantém o contexto do gerente limpo.

---

# 45. O AgentMap não deve pensar como LLM

Ele deve executar regras determinísticas.

Exemplo:

```text
if dependency.status != CONCLUIDA:
	blockTask()
```

e não:

```text
"acho que talvez a dependência esteja pronta"
```

LLM decide.

AgentMap garante.

---

# 46. Separação de responsabilidades

Essa é a arquitetura que eu considero mais correta:

```text
LLM
 ↓
DECISÃO

KILO
 ↓
EXECUÇÃO

AGENTMAP
 ↓
ORQUESTRAÇÃO

GIT
 ↓
ISOLAMENTO

POSTGRES
 ↓
ESTADO

MCP
 ↓
INTERFACE DE FERRAMENTAS

SSE/WS
 ↓
EVENTOS/UI
```

---

# 47. Stack

Para o seu projeto, eu usaria:

### Backend

```text
Java 21+
Spring Boot
Spring Web
Spring Security
Spring Data JPA
PostgreSQL
Flyway
WebSocket/SSE
MCP
```

### Frontend

```text
HTML5
CSS3
JavaScript ES6+
Fetch
SSE/WebSocket
```

### Infra

```text
Docker
Linux
Nginx
Git
Kilo Code
VS Code
```

---

# 48. Módulos Java

Eu estruturaria:

```text
agentmap/
├── domain/
│   ├── agent/
│   ├── session/
│   ├── task/
│   ├── worktree/
│   ├── message/
│   ├── event/
│   └── project/
│
├── application/
│   ├── orchestration/
│   ├── messaging/
│   ├── session/
│   ├── task/
│   └── reconciliation/
│
├── infrastructure/
│   ├── kilo/
│   ├── git/
│   ├── postgres/
│   ├── mcp/
│   └── events/
│
└── presentation/
    ├── rest/
    ├── websocket/
    └── mcp/
```

Isso combina muito bem com Clean/Hexagonal.

---

# 49. Interfaces principais

```text
KiloSessionPort
KiloAgentManagerPort
WorktreePort
GitPort
MessageBusPort
SessionRepository
TaskRepository
AgentRepository
EventRepository
```

Implementações:

```text
KiloSessionAdapter
KiloAgentManagerAdapter
GitWorktreeAdapter
PostgresSessionRepository
PostgresTaskRepository
```

---

# 50. A regra mais importante

**O AgentMap não deve depender de detalhes internos não documentados do Kilo.**

Usaremos somente:

```text
agent_manager
session
worktree
MCP
SSE
documented extension behavior
```

e onde o Kilo tiver uma limitação:

```text
AgentMap fallback
```

Assim o sistema continua funcional mesmo se o Kilo mudar internamente.

---

# 51. Fases de implementação

## Fase 1 — Descoberta

```text
[ ] detectar projeto Git
[ ] detectar .kilo
[ ] detectar Agent Manager
[ ] ler agent-manager.json
[ ] descobrir worktrees
[ ] criar registry
```

## Fase 2 — Session Registry

```text
[ ] Agent
[ ] Session
[ ] Worktree
[ ] Project
[ ] estado
[ ] parentSessionId
```

## Fase 3 — Kilo Adapter

```text
[ ] listar sessões
[ ] iniciar sessão
[ ] criar worktree
[ ] enviar prompt
[ ] identificar sessão
[ ] capturar eventos
```

## Fase 4 — Task Engine

```text
[ ] criar tarefa
[ ] dependências
[ ] dispatch
[ ] ACK
[ ] retry
[ ] timeout
[ ] conclusão
```

## Fase 5 — Comunicação

```text
[ ] message envelope
[ ] Event Bus
[ ] Message Router
[ ] parentSessionId
[ ] childSessionId
[ ] retorno
```

## Fase 6 — MCP

```text
[ ] agentmap_list_agents
[ ] agentmap_start_task
[ ] agentmap_send_task
[ ] agentmap_report_result
[ ] agentmap_get_task
[ ] agentmap_request_approval
```

## Fase 7 — Dashboard

```text
[ ] mapa dos agentes
[ ] sessões
[ ] worktrees
[ ] tarefas
[ ] eventos
[ ] logs
[ ] aprovação
[ ] intervenção
```

## Fase 8 — Autonomia

```text
[ ] manual
[ ] semi-autonomous
[ ] autonomous
[ ] circuit breaker
[ ] approval gates
```

---

# 52. Primeiro MVP

Eu **não começaria pelos 8 agentes**.

O teste mínimo deveria ser:

```text
GERENTE
   │
   ▼
AGENTMAP
   │
   ▼
BACKEND
   │
   ▼
AGENTMAP
   │
   ▼
GERENTE
```

Com apenas:

```text
1 gerente
1 backend
1 worktree
1 tarefa
1 retorno
```

Se isso funcionar:

```text
gerente → backend → gerente
```

temos provado a engrenagem fundamental.

Depois:

```text
gerente
 ├── backend
 └── frontend
```

Depois:

```text
gerente
 ├── backend
 ├── frontend
 └── QA
```

E somente depois os oito.

---

# 53. Teste definitivo do MVP

A tarefa de teste poderia ser:

```text
Gerente:

Crie uma tarefa para o agente Backend.
O Backend deve criar um arquivo de teste simples,
executar o teste e retornar o resultado ao gerente.
Não use scripts externos para comunicação.
```

Esperado:

```text
GERENTE
   │
   │ start
   ▼
AGENTMAP
   │
   ▼
BACKEND
   │
   ├── cria arquivo
   ├── executa teste
   │
   ▼
AGENTMAP
   │
   ▼
GERENTE
```

Resultado:

```text
TASK_COMPLETED
```

Se conseguirmos isso de forma persistente e auditável, temos o núcleo do AgentMap.

---

# 54. A grande conclusão

Depois de confrontar o plano com a documentação atual do Kilo, eu mudaria uma coisa importante no projeto que vínhamos desenhando:

**não tente fazer o AgentMap "controlar VS Codes".**

Controle:

```text
SESSÕES
```

e:

```text
WORKTREES
```

O VS Code é apenas a interface.

A arquitetura passa a ser:

```text
              ┌──────────────────────┐
              │       VS CODE        │
              │      KILO CHAT       │
              └──────────┬───────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │    AGENTMAP   │
                 │   CONTROL     │
                 │    PLANE      │
                 └───────┬───────┘
                         │
                 ┌───────┴───────┐
                 │               │
                 ▼               ▼
             KILO API         MCP
                 │               │
                 └───────┬───────┘
                         ▼
                 ┌───────────────┐
                 │    SESSÕES    │
                 └───────┬───────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
           Backend    Frontend      QA
              │          │          │
              ▼          ▼          ▼
          Worktree   Worktree   Worktree
```

E **a comunicação de retorno passa pelo AgentMap**, não fica dependente da limitação atual `child → parent` do Agent Manager.

Isso nos dá exatamente o que você queria desde o começo: **você acompanha o gerente no Kilo, o gerente distribui trabalho para agentes visíveis no Agent Manager, os agentes trabalham isoladamente nos worktrees, devolvem eventos/resultados, e o gerente continua o ciclo — com possibilidade de intervenção humana ou autonomia completa.** A documentação atual do Kilo confirma que o Agent Manager já fornece a base de sessões, worktrees, `start`, `list`, `prompt`, runtime compartilhado e roteamento por diretório; o AgentMap acrescenta a camada de coordenação persistente que o Kilo não pretende ser. ([Kilo][2])

**E há uma vantagem enorme:** não precisamos construir isso no escuro. O próximo passo correto é transformar este desenho em uma **especificação técnica do AgentMap**, incluindo o contrato JSON das mensagens, modelo PostgreSQL, estados, MCP tools, Kilo Adapter, fluxo `parent → child → parent`, reconciliação de sessões e o teste MVP de duas sessões. Isso deixa o projeto pronto para implementação pelos seus próprios agentes.

[1]: https://github.com/ggml-org/llama.cpp/issues/25967?utm_source=chatgpt.com "Duplicate rule definitions in generated GBNF grammar with large tools list (harmony/gpt-oss) → \"failed to parse grammar\" · Issue #25967 · ggml-org/llama.cpp · GitHub"
[2]: https://kilo.ai/docs/automate/agent-manager?utm_source=chatgpt.com "Agent Manager"
[3]: https://kilo.ai/docs/contributing/architecture/vscode-extension?utm_source=chatgpt.com "VS Code Extension Architecture"
[4]: https://kilo.ai/docs/getting-started/settings/auto-approving-actions?utm_source=chatgpt.com "Auto-Approving Actions"
[5]: https://github.com/Kilo-Org/kilocode/issues/12557?utm_source=chatgpt.com "Agent Manager session cannot reply to the session that spawned it · Issue #12557 · Kilo-Org/kilocode · GitHub"
[6]: https://kilo.ai/docs/automate?utm_source=chatgpt.com "Automate"
[7]: https://kilo.ai/docs/customize/custom-instructions?utm_source=chatgpt.com "Custom Instructions"
[8]: https://kilo.ai/docs/automate/agent-manager-workflows?utm_source=chatgpt.com "Agent Manager Workflows"
