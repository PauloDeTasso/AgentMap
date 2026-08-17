<div align="center">

# 🗺️ AgentMap

**Sistema local de coordenação, memória operacional e rastreabilidade para projetos desenvolvidos por múltiplos agentes de IA.**

[![Licença: MIT](https://img.shields.io/badge/licença-MIT-blue.svg)](./LICENSE)
[![Status](https://img.shields.io/badge/status-estável-green.svg)]()
[![Node.js](https://img.shields.io/badge/node-18%2B-339933.svg?logo=node.js&logoColor=white)]()
[![MCP](https://img.shields.io/badge/protocolo-MCP-8A2BE2.svg)]()
[![Plataformas](https://img.shields.io/badge/plataformas-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)]()

</div>

---

## 📚 Sumário

- [Visão geral](#-visão-geral)
- [Objetivo](#-objetivo)
- [Conceito central](#-conceito-central)
- [Arquitetura](#-arquitetura)
- [MCP](#-mcp)
- [Agentes](#-agentes)
- [Ciclo operacional do agente](#-ciclo-operacional-do-agente)
- [Tarefas](#-tarefas)
- [Solicitações de alteração](#-solicitações-de-alteração)
- [Contratos](#-contratos)
- [Decisões](#-decisões)
- [Dependências](#-dependências)
- [Reservas](#-reservas)
- [Bloqueios](#-bloqueios)
- [Conflitos](#-conflitos)
- [Handoffs](#-handoffs)
- [Resultados](#-resultados)
- [Validação](#-validação)
- [Checkpoints](#-checkpoints)
- [Riscos](#-riscos)
- [Histórico e rastreabilidade](#-histórico-e-rastreabilidade)
- [Interface Web](#-interface-web)
- [Observabilidade](#-observabilidade)
- [Eventos](#-eventos)
- [MCP Resource Subscriptions](#-mcp-resource-subscriptions)
- [Como usar](#-como-usar)
- [Estrutura de projetos gerenciados](#-estrutura-de-projetos-gerenciados)
- [Organização do repositório](#-organização-do-repositório)
- [Documentação](#-documentação)
- [Integração com Kilo Code](#-integração-com-kilo-code)
- [Segurança](#-segurança)
- [Git](#-git)
- [Princípios arquiteturais](#-princípios-arquiteturais)
- [Estado do projeto](#-estado-do-projeto)
- [Evolução futura](#-evolução-futura)
- [Filosofia](#-filosofia)
- [Licença](#-licença)

---

## 🔎 Visão geral

O **AgentMap** é um sistema local criado para permitir que múltiplos agentes de Inteligência Artificial trabalhem de forma coordenada sobre o mesmo projeto.

Compatível com **Windows**, **Linux** e **macOS**.

O AgentMap funciona como uma **memória operacional compartilhada e uma camada de coordenação do projeto**, permitindo que os agentes consultem, registrem e atualizem informações estruturadas sobre o trabalho em andamento.

> A comunicação operacional não depende de conversas diretas entre agentes. Cada agente pode consultar o estado do projeto, executar sua tarefa, registrar resultados e deixar informações estruturadas para os próximos agentes.

```mermaid
flowchart TD
    subgraph AM["🗺️ AgentMap"]
        direction LR
        P[Projetos] ~~~ AG[Agentes] ~~~ T[Tarefas] ~~~ C[Contratos]
        D[Decisões] ~~~ S[Solicitações] ~~~ DEP[Dependências] ~~~ R[Reservas]
        B[Bloqueios] ~~~ CF[Conflitos] ~~~ H[Handoffs] ~~~ RES[Resultados]
        V[Validações] ~~~ CK[Checkpoints] ~~~ RI[Riscos] ~~~ HI[Histórico]
    end

    AM --> MCP((MCP))
    MCP --> A1[Agente A]
    MCP --> A2[Agente B]
    MCP --> A3[Agente C]
    A1 & A2 & A3 --> PJ[Projeto real]
```

---

## 🎯 Objetivo

O AgentMap foi desenvolvido para resolver um problema comum em ambientes multiagente:

> **Como fazer agentes diferentes trabalharem sobre o mesmo projeto sem perder contexto, decisões, responsabilidades, dependências e histórico?**

Para isso, o sistema centraliza as informações operacionais do projeto. Os agentes podem descobrir:

| | | |
|---|---|---|
| ✅ Tarefas existentes | ✅ Tarefas pendentes | ✅ Tarefas concluídas |
| ✅ Alterações solicitadas | ✅ Contratos existentes | ✅ Decisões tomadas |
| ✅ Recursos em uso | ✅ Dependências existentes | ✅ Agentes responsáveis |
| ✅ Bloqueios existentes | ✅ Conflitos identificados | ✅ Resultados produzidos |
| ✅ Trabalhos a validar | ✅ Informações de agentes anteriores | |

---

## 🧠 Conceito central

O AgentMap não foi projetado como um simples sistema de mensagens entre agentes. A comunicação acontece através do **estado estruturado do projeto**.

<table>
<tr>
<th align="center">❌ Modelo tradicional</th>
<th align="center">✅ Modelo AgentMap</th>
</tr>
<tr>
<td>

```mermaid
flowchart LR
    A[Agente A] -- conversa direta --> B[Agente B]
```

</td>
<td>

```mermaid
flowchart LR
    A[Agente A] --> AM1[AgentMap]
    AM1 --> R[Registro estruturado]
    R --> AM2[AgentMap]
    AM2 --> B[Agente B]
```

</td>
</tr>
</table>

Isso permite que os agentes trabalhem de forma **desacoplada**: um agente pode terminar seu trabalho e outro pode continuar posteriormente, sem depender da memória da conversa anterior.

---

## 🏗️ Arquitetura

O AgentMap é dividido conceitualmente em três camadas principais:

```mermaid
flowchart TD
    UI["🖥️ Interface Web<br/><sub>Visualização • Monitoramento • Administração</sub>"]
    CORE["🗺️ AgentMap<br/><sub>Núcleo de coordenação e memória operacional</sub>"]
    MCP["🔌 MCP<br/><sub>Tools • Resources • Prompts • Integração</sub>"]
    A1["Agente"]
    A2["Agente"]
    A3["Agente"]

    UI --> CORE --> MCP
    MCP --> A1
    MCP --> A2
    MCP --> A3
```

- O **AgentMap** permanece como autoridade sobre o estado operacional do projeto.
- O **MCP** funciona como camada de integração entre os agentes e o AgentMap.
- A **interface Web** funciona como camada de visualização, monitoramento e administração.

---

## 🔌 MCP

O **Model Context Protocol (MCP)** fornece a camada padronizada de comunicação entre os agentes e o AgentMap. O MCP **não** funciona como uma segunda fonte de verdade.

```mermaid
flowchart LR
    Agente --> MCP --> AgentMap --> Regras["Regras do sistema"] --> Dados["Dados do projeto"]
```

Isso permite que diferentes clientes e agentes utilizem o mesmo núcleo operacional. A arquitetura também permite que novos clientes sejam adicionados futuramente sem alterar a estrutura conceitual do AgentMap.

---

## 🤖 Agentes

Cada agente possui uma identidade própria dentro do projeto.

<details>
<summary><strong>Exemplo de identidade de agente (JSON)</strong></summary>

```json
{
  "id": "AGT-BACKEND",
  "nome": "Agente Backend",
  "responsabilidades": [
    "API",
    "Java",
    "Spring",
    "Banco de dados"
  ]
}
```

</details>

A identidade do agente permite determinar:

- quem executa uma tarefa;
- quem solicitou uma alteração;
- quem é responsável por uma pendência;
- quem produziu determinado resultado;
- quem realizou determinada ação;
- quem deve validar determinado trabalho.

---

## 🔁 Ciclo operacional do agente

O AgentMap estabelece um fluxo operacional para os agentes:

```mermaid
flowchart TD
    A([Iniciar]) --> B[Identificar agente]
    B --> C[Consultar contexto]
    C --> D[Consultar tarefas]
    D --> E[Consultar solicitações]
    E --> F[Consultar contratos]
    F --> G[Consultar decisões]
    G --> H[Verificar dependências]
    H --> I[Verificar bloqueios]
    I --> J[Verificar conflitos]
    J --> K[Verificar reservas]
    K --> L[Executar trabalho]
    L --> M[Registrar resultados]
    M --> N[Registrar artefatos]
    N --> O[Criar handoff]
    O --> P[Solicitar validação]
    P --> Q([Finalizar])
```

Esse processo permite que cada agente tenha acesso ao contexto necessário antes de modificar o projeto.

---

## ✅ Tarefas

As tarefas representam unidades de trabalho do projeto. Cada tarefa pode possuir:

| Campo | Campo | Campo |
|---|---|---|
| Identificação | Título | Descrição |
| Agente responsável | Prioridade | Status |
| Dependências | Artefatos | Critérios de conclusão |
| Resultados | Validação | Histórico |

As tarefas formam uma das principais estruturas de coordenação entre os agentes.

---

## 🔄 Solicitações de alteração

O AgentMap possui um sistema estruturado de **Solicitações de Alteração**, que permite que um agente registre uma alteração necessária que afete outro agente, domínio ou recurso compartilhado.

<details>
<summary><strong>Exemplo de solicitação de alteração (JSON)</strong></summary>

```json
{
  "id": "ALT-2026-00001",
  "titulo": "Adicionar campo status ao contrato",
  "descricao": "O contrato da API precisa disponibilizar o estado atual do contrato.",

  "agenteSolicitante": {
    "id": "AGT-FRONTEND"
  },

  "agenteResponsavel": {
    "id": "AGT-BACKEND"
  },

  "alvo": {
    "tipo": "CONTRATO_API",
    "nome": "Contrato de cliente",
    "identificador": "cliente-resposta"
  },

  "alteracao": {
    "tipo": "ADICAO",
    "descricao": "Adicionar o campo status ao contrato de resposta.",
    "motivo": "O frontend precisa receber o estado atual do contrato.",
    "arquivosAfetados": [
      "ContratoRespostaDTO.java",
      "cliente-resposta.json"
    ]
  },

  "impactos": [
    "BACKEND",
    "FRONTEND",
    "API"
  ],

  "prioridade": "MEDIA",
  "status": "PENDENTE",
  "requerAprovacao": true,

  "aprovacao": {
    "status": "PENDENTE",
    "agenteId": null,
    "data": null,
    "observacao": null
  }
}
```

</details>

O agente responsável consulta as solicitações destinadas a ele durante seu ciclo de trabalho, evitando alterações silenciosas em recursos compartilhados.

---

## 📄 Contratos

Contratos representam estruturas compartilhadas entre diferentes partes do sistema, como:

`Contratos de API` · `DTOs` · `Estruturas JSON` · `Interfaces` · `Eventos` · `Modelos compartilhados` · `Estruturas de banco` · `Integrações`

Antes de alterar um recurso compartilhado, o agente deve verificar o contrato vigente e suas dependências.

---

## 🧭 Decisões

Decisões importantes do projeto são registradas para evitar que agentes diferentes adotem soluções incompatíveis. Uma decisão pode registrar:

`Identificação` · `Contexto` · `Problema` · `Decisão tomada` · `Justificativa` · `Impactos` · `Agentes envolvidos` · `Data` · `Status`

Dessa forma, uma decisão importante deixa de depender da memória de uma única sessão de IA.

---

## 🔗 Dependências

O AgentMap permite registrar dependências entre tarefas, agentes, módulos, contratos, recursos e etapas de desenvolvimento.

```mermaid
flowchart LR
    B[Tarefa B] -- depende de --> A[Tarefa A]
```

Um agente pode verificar suas dependências antes de iniciar uma tarefa.

---

## 🔒 Reservas

As reservas representam a intenção de um agente trabalhar sobre determinado recurso.

```mermaid
flowchart LR
    AG[AGT-BACKEND] --> RES[Reserva] --> C[Contrato cliente-resposta]
```

Outro agente pode consultar a reserva antes de modificar o mesmo recurso. As reservas são mecanismos de **coordenação lógica** — elas não substituem o Git e não representam bloqueio físico do arquivo.

---

## 🚧 Bloqueios

Quando um agente não consegue continuar, pode registrar um bloqueio.

> **Tarefa:** Implementar integração com API
> **Bloqueio:** Contrato da API ainda não foi aprovado.
> **Responsável:** `AGT-BACKEND`
> **Impacto:** Implementação não pode ser finalizada.

Isso permite que outros agentes descubram por que determinada tarefa não está avançando.

---

## ⚠️ Conflitos

Conflitos podem ocorrer entre agentes, tarefas, contratos, decisões, alterações, dependências e recursos.

O AgentMap registra esses conflitos para torná-los explícitos e rastreáveis. O sistema não depende de conversas informais para comunicar problemas entre agentes.

---

## 🤝 Handoffs

O **Handoff** permite transferir contexto operacional de um agente para outro. Um agente pode registrar:

`Trabalho realizado` · `Trabalho pendente` · `Arquivos modificados` · `Decisões tomadas` · `Problemas encontrados` · `Riscos` · `Próximos passos` · `Agente recomendado para continuidade`

Assim, outro agente pode assumir o trabalho sem depender da memória do agente anterior.

---

## 📦 Resultados

Ao concluir uma tarefa, o agente registra o resultado produzido, contendo:

`Descrição` · `Arquivos modificados` · `Recursos criados` · `Decisões tomadas` · `Testes realizados` · `Limitações` · `Pendências` · `Observações`

Isso cria rastreabilidade entre tarefa e resultado.

---

## 🔍 Validação

Uma tarefa concluída não é automaticamente considerada validada.

```mermaid
flowchart LR
    T1[Tarefa] --> C1[Concluída] --> V1[Validação] --> AP[✅ Aprovada]
    T2[Tarefa] --> C2[Concluída] --> V2[Validação] --> RP[❌ Reprovada] --> COR[Correção]
```

Isso permite separar claramente **quem implementou**, **quem revisou** e **quem aprovou**.

---

## 💾 Checkpoints

Checkpoints permitem registrar o estado intermediário de um trabalho, especialmente importantes para trabalhos longos ou interrompidos. Um checkpoint pode registrar:

`Estado atual` · `Progresso` · `Arquivos alterados` · `Decisões` · `Problemas` · `Próximos passos`

Isso facilita a recuperação do trabalho.

---

## ⚡ Riscos

Riscos identificados durante o desenvolvimento podem ser registrados no AgentMap, como:

`Alteração incompatível` · `Dependência externa` · `Risco de regressão` · `Contrato indefinido` · `Conflito arquitetural` · `Recurso compartilhado` · `Problema de segurança`

O registro permite acompanhar o risco até sua resolução.

---

## 🕓 Histórico e rastreabilidade

O AgentMap mantém informações necessárias para reconstruir o histórico operacional do projeto. Quando aplicável, registros podem estar associados a:

```text
projetoId · agenteId · sessaoId · tarefaId · correlationId · requestId · timestamp
```

Isso permite identificar quem realizou uma ação, quando, em qual contexto, sobre qual tarefa e qual resultado foi produzido.

---

## 🖥️ Interface Web

O AgentMap possui uma interface Web local para visualizar e administrar o estado do projeto. A interface organiza o projeto em **27 painéis funcionais** acessíveis pela barra lateral, agrupados logicamente por domínio para navegação fluida.

### Painéis Disponíveis

#### Gestão de Projeto
1. **Agentes** — Perfis, responsabilidades e domínios de cada agente do projeto
2. **Tarefas** — Unidades de trabalho com estados, prioridades, dependências e critérios
3. **Contratos** — Estruturas compartilhadas, APIs, DTOs e modelos entre agentes
4. **Arquivos** — Navegador de arquivos do projeto com estrutura de diretórios
5. **Projetos** — Listagem e gerenciamento de projetos abertos/fechados

#### Estado e Monitoramento
6. **Estado** — Snapshot atual do projeto: contadores, status e saúde geral
7. **Auditoria** — Log completo de eventos operacionais com timestamps
8. **Monitor** — Visão de monitoramento em tempo real com mensagens, agentes ativos, alertas e dispatcher

#### Execução e Validação
9. **Solicitações** — Fluxo de alterações coordenadas: criação, análise, aprovação e execução
10. **Resultados** — Registro de entregues por tarefa: descrição, arquivos, testes, limitações
11. **Validações** — Aprovações e reprovações de trabalho concluído
12. **Checkpoints** — Estados intermediários de trabalhos longos ou interrompidos

#### Governança
13. **Handoffs** — Transferências de contexto entre agentes com trabalho realizado, pendente e próximos passos
14. **Bloqueios** — Impedimentos ativos, responsáveis, impacto e resolução
15. **Pendências** — Tarefas secundárias ou ações pendentes associadas a entidades
16. **Conflitos** — Registro de conflitos entre agentes, tarefas, contratos ou recursos
17. **Riscos** — Riscos identificados com status de mitigação e resolução
18. **Reservas** — Reservas de recursos para evitar alterações concorrentes
19. **Decisões** — Decisões arquiteturais com contexto, justificativa e impacto

#### Rastreabilidade
20. **Dependências** — Vínculos entre tarefas e entidades com regras de sequenciamento
21. **Responsabilidades** — Atribuições de responsabilidade por agente e alvo
22. **Sessões** — Ciclos de execução de agentes com status e datas
23. **Aprendizados** — Conhecimento registrado para reuso por outros agentes
24. **Histórico** — Timeline completa de eventos do projeto
25. **Integridade** — Verificação automática de consistência referencial

#### Visões Especiais
26. **Painel de Controle** — Dashboard com visão consolidada do projeto
27. **Monitor** — Visão de monitoramento com mensagens, agentes e dispatcher

### Comportamento dos Painéis

- **Carregamento:** Todos os painéis carregam via chamadas à API REST em `http://localhost:3150/api`. Dados são exibidos em tabelas, listas ou estados vazios quando não há registros. Nenhum painel permanece em estado de carregamento indefinido.
- **Estados vazios:** Quando um painel não possui registros, ele exibe uma mensagem clara de estado vazio, mantendo a interface consistente e evitando confusão.
- **Ações básicas:** Cada painel disponibiliza ações básicas quando aplicáveis: criar novo registro, visualizar detalhes, gerar prompt contextualizado para agentes e navegar por arquivos e diretórios do projeto.

O desenvolvedor pode acompanhar o trabalho dos agentes através do navegador local, sem depender da interface do próprio agente.

---

## 📡 Monitoramento

O painel **Monitor** é a visão central de acompanhamento em tempo real do projeto. Ele consolida informações de múltiplas fontes do AgentMap em uma única tela, permitindo identificar rapidamente o estado dos agentes, alertas ativos, mensagens de comunicação e eventos recentes.

### Funcionalidades do Painel Monitor

O painel **Monitor** exibe:

- **Agentes ativos** — Sessões em andamento com identificação do agente, tarefa associada, horário de início e contexto consultado
- **Resumo do estado do projeto** — Cards com contadores de tarefas (concluídas, em execução, bloqueadas), solicitações, riscos e sessões
- **Alertas** — Handoffs pendentes, bloqueios ativos e riscos críticos, com detalhes expandidos em tabelas
- **Mensagens de monitoramento** — Comunicações enviadas via API entre agentes e sistemas, com tipo, emissor, timestamp e conteúdo
- **Eventos recentes** — Log de eventos operacionais com resultado (sucesso/falha) e descrição

### API de Monitoramento

O backend expõe endpoints dedicados para integração com o painel Monitor:

| Endpoint | Descrição |
|---|---|
| `GET /api/monitor` | Visão consolidada do monitoramento: projeto, estado, sessões ativas, alertas, mensagens recentes e eventos |
| `GET /api/monitoramento/mensagens` | Lista mensagens de monitoramento com filtros opcionais |
| `POST /api/monitoramento/mensagens` | Cria uma nova mensagem de monitoramento |
| `PUT /api/monitoramento/agente/:id/status` | Atualiza o status de um agente monitorado |
| `GET /api/monitoramento/agentes` | Lista agentes e seus status de monitoramento |
| `GET /api/monitoramento/modo` | Retorna o modo global de operação (MANUAL/AUTO) |
| `POST /api/monitoramento/modo` | Altera o modo global de operação |
| `POST /api/monitoramento/intervir` | Executa intervenção manual no sistema |
| `GET /api/monitoramento/dispatcher/pendentes` | Lista itens pendentes do dispatcher |
| `POST /api/monitoramento/dispatcher/executar` | Executa item pendente do dispatcher |
| `GET /api/monitoramento/dispatcher/logs` | Logs do dispatcher |

### Modos de Operação

O AgentMap suporta dois modos de operação no monitoramento:

- **MANUAL** — Agentes e operações seguem fluxo controlado pelo usuário ou planejador
- **AUTO** — Sistema pode executar operações automaticamente dentro de regras predefinidas

O modo pode ser alterado via `POST /api/monitoramento/modo` e é refletido em tempo real no painel Monitor.

### Mensagens de Monitoramento

Mensagens são registros estruturados de comunicação entre agentes e sistemas. Campos disponíveis:

| Campo | Descrição |
|---|---|
| `id` | Identificador único (ex: `MSG-<timestamp>`) |
| `timestamp` | Data/hora da mensagem |
| `tipo` | Tipo da mensagem (INFO, AVISO, ERRO, SUCESSO) |
| `emissor` | Origem da mensagem |
| `agenteId` | Agente relacionado |
| `tarefaId` | Tarefa relacionada |
| `conteudo` | Conteúdo da mensagem |
| `dados` | Dados estruturados adicionais |
| `acoes` | Ações associadas |

Exemplo de envio:

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

### Intervenções

O painel Monitor permite intervenções manuais através do endpoint `POST /api/monitoramento/intervenir`. Comandos suportados são executados pelo serviço de monitoramento e registrados no histórico.

### Dispatcher

O dispatcher gerencia itens pendentes de execução. Através dos endpoints `GET /api/monitoramento/dispatcher/pendentes` e `POST /api/monitoramento/dispatcher/executar`, o sistema pode listar e executar trabalhos pendentes de forma controlada.

### WebSocket

Além da API REST, o AgentMap expõe um WebSocket em `ws://localhost:3150/ws/monitoramento` para notificações em tempo real. O serviço `MonitoramentoWebSocket` broadcast mensagens para sessões conectadas, permitindo atualizações instantâneas no painel Monitor sem polling.

---

## 📡 Eventos

O AgentMap registra eventos assíncronos para coordenação entre agentes. Além dos eventos automáticos gerados por ações como handoffs e solicitações, o sistema oferece:

| Endpoint | Descrição |
|---|---|
| `POST /api/eventos` | Cria eventos do sistema com validação rigorosa de schema |
| `POST /api/eventos/custom` | Cria eventos genéricos/flexíveis para casos específicos, debugging ou integrações futuras |

<details>
<summary><strong>Exemplo de evento custom (JSON)</strong></summary>

```json
{
  "tipo": "MEU_EVENTO_CUSTOM",
  "origem": "backend",
  "destino": "frontend",
  "mensagem": "Integração pronta para teste",
  "campoExtra": "valor"
}
```

</details>

## 📡 MCP Resource Subscriptions

O AgentMap suporta **subscrições de recursos MCP** para notificações em tempo real entre agentes. Isso elimina a necessidade de polling manual por mudanças em solicitações, handoffs e bloqueios.

### Recursos assináveis

| URI | Descrição |
|---|---|
| `agentmap://solicitacoes/{agenteId}` | Solicitações de alteração destinadas a um agente |
| `agentmap://handoffs/{agenteId}` | Handoffs pendentes para um agente |
| `agentmap://bloqueios/{projetoId}` | Bloqueios ativos do projeto |

### Onboarding e descoberta

| Recurso / Tool | Descrição |
|---|---|
| `agentmap://onboarding` | Guia de descoberta do sistema |
| `agentmap://playbook` | Padrões de uso recomendados |
| `agentmap_descobrir` | Lista capabilities, agents, docs, CLI, worktree |
| `agentmap_sugerir_fluxo` | Recomenda sequência de tools por objetivo |

### Modos de subscrição

#### 2025 — `resources/subscribe`

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

#### 2026 — `subscriptions/listen`

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

### Fluxo de subscrição

```mermaid
sequenceDiagram
    participant A as Agente A
    participant M as MCP Server
    participant E as Event Bus
    participant S as Serviço de Domínio

    A->>M: resources/subscribe (uri)
    M-->>A: { sucesso: true }
    S->>E: publish(uri, reason)
    E->>E: coalesce por URI (100ms)
    E->>M: notificar subscribers
    M->>A: notifications/resources/updated
    A->>M: resources/read (uri)
    M-->>A: JSON com dados atualizados
```

### Notificações 2026

No modo 2026, o servidor envia `notifications/subscriptions/acknowledged` e usa `_meta["io.modelcontextprotocol/subscriptionId"]` para identificar a subscription. O cliente deve re-listar após reconexão stdio; o servidor não mantém estado de subscription entre reconexões.

### Características

- **Capabilities anunciadas:** `resources.subscribe: true` e `resources.listChanged: true`
- **Subscrições por session:** cada processo stdio MCP mantém suas próprias subscrições isoladas
- **Proteção limitada a path traversal:** acesso restrito à raiz do projeto aberto
- **Coalescência:** bursts de mudanças são agrupados em 1 notificação por URI (janela de 100ms)
- **Limpeza automática:** subscrições são removidas no disconnect da sessão
- **Graceful shutdown:** streams 2026 recebem resultado vazio antes do fechamento

### Exemplo de uso (2025)

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
  "method": "notifications/resources/updated",
  "params": {
    "uri": "agentmap://solicitacoes/AGT-BACKEND"
  }
}
```

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

> **Nota:** URIs usam `encodeURIComponent` para IDs com caracteres especiais. Ex: `agentmap://solicitacoes/AGT%2FBACKEND`.

---

## 🚀 Como usar

### Pré-requisitos

- Node.js 18+
- npm
- Git
- VS Code *(opcional, para integração com Kilo Code / Agent Manager)*

### Instalação

```bash
git clone <url-do-repositorio>
cd AgentMap
cd backend
npm install
```

### Iniciar o sistema

```bash
cd backend
npm run dev
```

Isso inicia:
- Backend + API REST em `http://localhost:3150`
- Frontend (interface web) servido automaticamente

### Iniciar o MCP Server (Kilo Code)

```bash
cd backend
npm run mcp
```

Ou diretamente:
```bash
npx tsx src/mcp-server/index.ts
```

Isso inicia o servidor MCP via STDIO para integração com Kilo Code / VS Code.

### Acessar

| Recurso | URL / Comando |
|---|---|
| 🖥️ Frontend / Dashboard | http://localhost:3150 |
| 🔌 API REST | http://localhost:3150/api |
| 📊 Status | http://localhost:3150/api/status |
| 💓 Health | http://localhost:3150/api/health |
| 📈 Observabilidade | http://localhost:3150/api/observabilidade/metricas |
| 🔧 MCP Server (Kilo Code) | `npm run mcp` |

### Criar um projeto novo

1. Acesse o frontend em `http://localhost:3150`
2. Clique em **"Novo Projeto"**
3. Preencha nome e pasta destino
4. O scaffold gera automaticamente a estrutura `.ia/` completa

> **Nota:** a pasta base de projetos é configurável. No Windows, o padrão é `G:\PROJETOS\AgenteMap_Projetos\`. Em Linux/macOS, use qualquer caminho como `~/projetos/agentmap/`. Você pode alterar o padrão nas configurações do projeto.

### Integração com Kilo Code / VS Code

1. Abra o projeto no VS Code
2. Verifique se o arquivo `kilo.jsonc` existe na raiz
3. Na extensão Kilo Code, o MCP do AgentMap deve aparecer automaticamente
4. Se não aparecer, recarregue a janela: `Ctrl+Shift+P` → `Developer: Reload Window`

> O AgentMap **não executa agentes**. Ele fornece contexto, ferramentas e governança via MCP. O paralelismo é responsabilidade do Agent Manager (extensão VS Code).

### Fluxo recomendado para agentes

1. Consultar eventos pendentes no início do ciclo
2. Verificar dependências da tarefa atual
3. Ler contratos obrigatórios antes de executar
4. Executar o trabalho respeitando diretórios permitidos
5. Registrar resultado, artefatos e handoff quando necessário
6. Confirmar eventos processados

### Comunicação entre AgentMap e Agent Manager (Kilo Code)

O AgentMap e o Agent Manager se comunicam por **HTTP/MCP**, nunca por escrita direta em arquivos compartilhados.

**Fluxo Pai → Filho:**
- Você envia instruções ao agente Kilo **diretamente pelo prompt do Agent Manager** no VS Code
- O AgentMap não empurra mensagens; o filho deve consultar periodicamente

**Fluxo Filho → AgentMap:**
- Agentes filhos **não possuem tools MCP de escrita**. Eles devem usar **HTTP direto**:
  - `POST http://localhost:3150/api/monitoramento/mensagens`
  - Tipos aceitos: `KILO_CHAT`, `KILO_REPLY`, `KILO_RESULT`, `KILO_CHAT_REPLY`

**Fluxo AgentMap → Filho (leitura):**
- Agentes filhos leem respostas por:
  - HTTP: `GET http://localhost:3150/api/monitoramento/kilo/receive-chat?agenteId=<id>&limite=20`
  - Tool MCP (se disponível): `kilohub_receive_chat_message`

**Formato obrigatório de mensagens:**
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

Documentação completa: [`docs/comunicacao-agentmap-kilo.md`](docs/comunicacao-agentmap-kilo.md)

---

## 📁 Estrutura de projetos gerenciados

- Pasta base de projetos: configurável por projeto (caminho absoluto ou relativo)
- Cada projeto recebe sua própria pasta com o **mesmo nome do projeto**
- Cada projeto gerencia uma pasta `.ia/` com contratos, tarefas, decisões, handoffs e demais entidades do AgentMap

### Regra obrigatória: fluxo e dependências

Novos projetos devem respeitar o fluxo padrão definido em `.ia/fluxo-trabalho.md`. O planejador deve criar tarefas e dependências explicitamente antes de iniciar implementações. Agentes devem consultar dependências no início de cada ciclo e só prosseguir quando elas estiverem concluídas.

> Sem dependências, tarefas podem executar em paralelo; com dependências, a execução é sequencial.

### Checklist automático de novos projetos

O AgentMap valida automaticamente a estrutura mínima de fluxo ao criar ou abrir um projeto:

- [x] `.ia/fluxo-trabalho.md` obrigatório
- [x] Pastas `.ia/contratos`, `.ia/tarefas`, `.ia/dependencias` obrigatórias
- [x] Pelo menos 1 contrato e 1 tarefa registrados
- [x] Sem dependências circulares

Se o checklist não estiver completo, a criação/abertura do projeto é bloqueada.
**Endpoint:** `GET /api/projetos/:id/fluxo/checklist`

### Coordenação entre agentes

Em projetos com múltiplos agentes:

- O planejador define a ordem e as dependências.
- Cada agente só inicia quando seus pré-requisitos estão prontos.
- O monitoramento é a fonte de verdade para o estado do projeto.
- Bloqueios devem ser registrados no AgentMap, não resolvidos informalmente.
- Handoffs devem ser usados para transferir contexto entre agentes.
- O revisor valida aderência aos contratos antes da documentação final.

---

## 🗂️ Organização do repositório

```text
AgentMap/
├── backend/          # API Node.js + TypeScript + Express + MCP Server
├── frontend/          # Interface web HTML/CSS/JS vanilla
├── .ia/               # Dados do projeto (tarefas, contratos, agentes, handoffs...)
├── esquemas/          # JSON Schemas de validação
├── banco/             # PostgreSQL opcional (não implementado; apenas expansão futura)
├── PLANO GERAL/       # Documentação de planejamento e especificações
├── docs/              # Guias e documentação adicional
└── temp/              # Arquivos temporários do projeto (limpeza automática/manual)
```

> **Armazenamento operacional:** predominantemente **filesystem + JSON**. Os dados reais do projeto vivem em arquivos dentro de `.ia/`. PostgreSQL, se usado no futuro, será apenas para metadados/índice.
>
> A estrutura real do repositório deve ser considerada a autoridade.

---

## 📚 Documentação

| Arquivo | Descrição |
|---|---|
| `docs/guia-agente-mcp.md` | Guia do agente MCP |
| `docs/referencia-tools-mcp.md` | Referência completa de tools com parâmetros |
| `docs/api-reference.md` | Referência completa da API REST |
| `docs/arquitetura-mcp.md` | Arquitetura MCP |
| `PLANO GERAL/...` | Especificação autoritativa do projeto |

## 🧩 Integração com Kilo Code

O AgentMap foi projetado para funcionar com agentes utilizados através do Kilo Code e de outros clientes compatíveis com MCP.

```mermaid
flowchart LR
    KC[Kilo Code] --> AI[Agente IA] --> MCP --> AM[AgentMap] --> EP[Estado do projeto]
```

O agente utiliza as ferramentas disponibilizadas pelo MCP para consultar e atualizar o estado operacional. O AgentMap não depende exclusivamente do Kilo Code — outros clientes podem ser integrados posteriormente.

### Configuração do Kilo

O arquivo `kilo.jsonc` define a integração com o MCP do AgentMap.

O campo `data_collection_enabled` controla se dados de uso são coletados pelos provedores. Por padrão, está desabilitado no arquivo `kilo.local.jsonc` (não versionado).

Variáveis de ambiente e configurações locais devem ser definidas em `kilo.local.jsonc`, que é ignorado pelo Git.

### Padrões MCP 2026

O AgentMap segue as melhores práticas do ecossistema MCP em 2026:

- **131 tools MCP** registradas com `registerTracedTool` / `registerWorkflowTool` do SDK `@modelcontextprotocol/sdk` v1.30.0
- **Transporte STDIO** local (sem exposição de rede)
- **`outputSchema` + `structuredContent`** para resultados estruturados
- **Validação de entrada** via Zod em todas as tools
- **Anotações** (`readOnly`, `destructive`, `idempotent`) para orientar o cliente
- **Erros via `isError: true`** com mensagens acionáveis para auto-correção do modelo
- **Subscriptions dual-era:** `resources/subscribe` (2025) e `subscriptions/listen` (2026-07-28) coexistem; o servidor roteia automaticamente conforme a versão do protocolo anunciada no `initialize`
- **Graceful shutdown:** streams `subscriptions/listen` são encerrados com resultado vazio antes do fechamento do transporte

### Worktree Tools

Além das tools de domínio, o AgentMap expõe 3 tools específicas para paralelismo via Agent Manager:

- `agentmap_tarefas_prontas_para_worktree` — lista tarefas sem dependência pendente
- `agentmap_verificar_dependencias_pendentes` — verifica dependências de uma tarefa
- `agentmap_abrir_worktree` — cria worktree automaticamente para uma tarefa

### Kilo Hub Tools

Tools de integração com Kilo Code para agentes filhos (somente leitura/escrita limitada):

- `kilohub_report_status` — reporta status de sessão Kilo
- `kilohub_report_progress` — reporta progresso de tarefa
- `kilohub_report_result` — reporta resultado final de tarefa
- `kilohub_receive_chat_message` — busca respostas/mensagens direcionadas a um agente Kilo

> **Nota:** `kilohub_send_chat_message` foi removida. Agentes filhos devem usar **HTTP direto** para enviar mensagens: `POST http://localhost:3150/api/monitoramento/mensagens`

### Ecossistema Kilo Code / VS Code 2026

- **Kilo Code** é a camada de IDE/CLI que consome o MCP do AgentMap
- **Agent Manager** é o painel de paralelismo real: worktrees isolados por agente
- **VS Code 1.115+** inclui preview de **Agents app** com sessões paralelas em worktrees
- **Worktree isolation** é o padrão do mercado para agentes paralelos (Cursor, Windsurf, Claude Code, Copilot)
- O AgentMap **não depende de CLI `kilo` standalone**; o paralelismo é via Agent Manager

---

## 🛡️ Segurança

O sistema foi projetado com segurança desde sua concepção. Entre os princípios adotados estão:

| | |
|---|---|
| ✅ Validação de entradas | ✅ Controle de permissões |
| ✅ Isolamento do workspace | ✅ Proteção contra path traversal |
| ✅ Controle das operações disponíveis | ✅ Validação das operações de escrita |
| ✅ Logs | ✅ Proteção de informações sensíveis |
| ✅ Ausência de credenciais no código | ✅ Controle de acesso às ferramentas MCP |
| ✅ Princípio do menor privilégio | ✅ Separação entre consulta e alteração |
| ✅ Prevenção de execução arbitrária de comandos | ✅ Limpeza automática de temporários (TTL + manual) |

Consulte [`SECURITY.md`](./SECURITY.md) para detalhes de controles e responsabilidades.

## 🧹 Limpeza de Temporários

O AgentMap gerencia arquivos temporários através da pasta `temp/` localizada na raiz do repositório. O sistema oferece limpeza automática e manual para evitar acúmulo de arquivos desnecessários.

| Recurso | Descrição |
|---|---|
| `GET /api/temp/arquivos` | Lista arquivos temporários com idade e tamanho |
| `POST /api/temp/limpar` | Executa limpeza manual dos temporários |
| `GET /api/temp/caminho` | Retorna o caminho absoluto da pasta `temp/` |
| Botão "🧹 Limpar Temp" | Interface web para limpeza manual no header |

**Comportamento:**
- Limpeza automática por TTL (padrão: 7 dias)
- Limpeza manual via botão na UI ou chamada direta à API
- Pasta `temp/` é ignorada pelo `.gitignore`
- O AgentMap não é mais repositório de lixo; temporários são gerenciados

> **Nota:** temporários não devem ser confundidos com dados operacionais do projeto. Apenas arquivos transitórios devem ser colocados em `temp/`.

> O MCP não deve oferecer aos agentes acesso irrestrito ao sistema operacional.

---

## 🌿 Git

O Git continua sendo responsável pelo controle de versão do código. **O AgentMap não substitui o Git** — eles possuem responsabilidades diferentes e complementares.

| Git | AgentMap |
|---|---|
| Código | Tarefas |
| Commits | Agentes |
| Branches | Decisões |
| Diff | Contratos |
| Histórico de versões | Solicitações · Dependências · Bloqueios · Handoffs · Validações · Estado operacional |

---

## 🧱 Princípios arquiteturais

| Princípio | Descrição |
|---|---|
| **Uma única fonte de verdade** | O estado operacional do projeto pertence ao AgentMap. |
| **Agentes desacoplados** | Agentes não precisam manter comunicação direta entre si. |
| **Comunicação estruturada** | Informações importantes são registradas em estruturas previsíveis. |
| **Responsabilidades explícitas** | Solicitante, responsável e validador podem ser agentes diferentes. |
| **Rastreabilidade** | Operações importantes possuem identificação e contexto. |
| **Recuperabilidade** | O trabalho pode ser retomado por outro agente. |
| **Segurança** | Cada agente deve possuir somente as permissões necessárias. |
| **Extensibilidade** | Novos agentes e clientes podem ser adicionados sem alterar o conceito central. |
| **Observabilidade** | O desenvolvedor deve conseguir acompanhar o estado do projeto. |

---

## 📊 Estado do projeto

O AgentMap está funcional, testado e pronto para uso em projetos reais. A interface web, a API REST e a integração MCP estão completamente operacionais.

**Funcionalidades confirmadas:**

| Recurso | Detalhe |
|---|---|
| 🖥️ Interface Web | **27 painéis funcionais** com navegação completa |
| 🔌 API REST | **~180 rotas** funcionais e documentadas |
| 🛠️ Tools MCP | **131 tools** registradas para integração com agentes |
| 📊 Dados | Base populada com dados realistas em todos os módulos |
| 🔔 Eventos | Sistema de eventos assíncronos com subscrições em tempo real |
| 🔒 Segurança | Validação Zod, proteção contra path traversal, CORS configurado |
| 📡 Observabilidade | OpenTelemetry com traces, métricas e convenções `gen_ai.*` |

**Módulos operacionais:**

`Gerenciamento de projetos` · `Gerenciamento de agentes` · `Gerenciamento de tarefas` · `Contratos` · `Decisões` · `Solicitações de alteração` · `Dependências` · `Reservas` · `Bloqueios` · `Conflitos` · `Handoffs` · `Resultados` · `Validações` · `Checkpoints` · `Riscos` · `Histórico` · `Interface Web` · `Integração MCP` · `Observabilidade com OpenTelemetry`

---

## 🔮 Evolução futura

O projeto foi estruturado para permitir futuras extensões sem alterar seu núcleo conceitual. Possíveis evoluções:

`Novos tipos de agentes` · `Novos clientes MCP` · `Novas ferramentas` · `Automação de validações` · `Análises de dependências` · `Detecção automática de conflitos` · `Visualizações avançadas` · `Auditoria avançada` · `Recuperação automática de trabalhos` · `Integração com outras IDEs` · `Integração com outros orquestradores`

> Essas funcionalidades devem ser adicionadas somente quando fizerem sentido para o uso real do projeto.

---

## 🔭 Observabilidade

O AgentMap implementa **OpenTelemetry** como camada de observabilidade nativa, permitindo rastreamento distribuído, métricas e inspeção do fluxo de execução entre HTTP, MCP stdio e agentes.

```mermaid
flowchart TD
    subgraph Backend["Backend Node.js"]
        HTTP["HTTP / Express"]
        MCP["MCP Stdio"]
        OTL["OTel SDK"]
    end

    subgraph Telemetry["Observabilidade"]
        TRACES["Traces"]
        METRICS["Métricas"]
        CONV["Convenções gen_ai.*"]
    end

    HTTP --> OTL
    MCP --> OTL
    OTL --> TRACES
    OTL --> METRICS
    CONV --> OTL

    TRACES --> DASH["Dashboard / API"]
    METRICS --> DASH
```

### O que é instrumentado

- **HTTP requests**: middleware `httpRequestMiddleware` cria spans para cada requisição HTTP com atributos `http.request.method`, `url.path` e `http.response.status_code`.
- **Tools MCP**: wrapper `registerTracedTool` instrumenta todas as tools registradas no MCP, gerando spans `execute_tool <toolName>` e métricas por tool.
- **Ciclos de agente**: `executeAgentWithTracing` gera spans de lifecycle para execução de agentes, incluindo status e duração.

### Métricas e dashboard

Endpoint REST para consulta de métricas:

- `GET /api/observabilidade/metricas` — retorna período, métricas por agente e por tool.

As métricas seguem domínios próprios combinados com convenções `gen_ai.*`:

- `agentmap.tool.executions`
- `agentmap.tool.errors`
- `agentmap.tool.duration`
- `agentmap.agent.executions`
- `agentmap.agent.duration`

### Convenções semânticas

Além dos domínios `agentmap.*`, o AgentMap adota atributos padronizados:

- `gen_ai.operation.name` — operação executada (`execute_tool`)
- `gen_ai.tool.name` — nome da tool MCP
- `gen_ai.tool.call.id` — identificador da chamada
- `gen_ai.agent.id` — agente responsável pela execução

### Exportação

Em desenvolvimento, os spans são exportados para o console via `ConsoleSpanExporter`. Em produção, o backend pode enviar traces para um coletor OTLP configurável por variável de ambiente (`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`).

---

## 💭 Filosofia

O AgentMap parte de uma ideia simples:

> *Agentes diferentes não precisam conversar para colaborar. Eles precisam compartilhar um estado confiável, estruturado e rastreável do projeto.*

Um agente pode iniciar um trabalho. Outro pode continuar. Um terceiro pode validar. Um quarto pode corrigir. E todos podem utilizar o mesmo contexto operacional registrado no AgentMap.

```mermaid
flowchart LR
    A[Agente] --> C[Consulta] --> W[Trabalha] --> R[Registra] --> AM[AgentMap] --> N[Próximo agente]
```

O resultado é um ambiente onde o conhecimento operacional deixa de pertencer à memória individual de cada agente e passa a pertencer ao **projeto**.

---

## 📜 Licença

Este projeto é distribuído sob a licença **MIT**. Consulte o arquivo [`LICENSE`](./LICENSE) para obter o texto completo.

<div align="center">

---

**AgentMap** — Sistema local de coordenação, memória operacional e rastreabilidade para desenvolvimento multiagente.

`Licença: MIT` · `Status: Estável`

</div>
