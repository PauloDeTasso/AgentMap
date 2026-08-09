# Auditoria Técnica — AgentMap (branch `main`)

**Método:** clone raso da branch `main` (`github.com/PauloDeTasso/AgentMap`) e leitura direta do código-fonte real — backend (Express + MCP SDK, TypeScript), não só README/docs. Toda afirmação abaixo tem evidência de arquivo:linha. Onde a profundidade não foi total (repositório tem ~2,1 MB só de backend/src, 182 endpoints REST, 40 arquivos de tools MCP), isso está marcado explicitamente como **não auditado nesta passada** — não foi inventado nem presumido.

---

## A. Resumo executivo

O AgentMap **não é um protótipo** — é um backend Express + servidor MCP real, com persistência em arquivos JSON (`.ia/contexto/*.json`), 182 endpoints REST, ~40 tools MCP, um recurso MCP assinável (`agentmap://monitoramento/mensagens`), event bus com coalescing, cursor de eventos (`eventSequence`) e um WebSocket para dashboard. A infraestrutura de eventos que os planos v1–v4 (deste chat) assumiam precisar ser construída **já existe em grande parte no backend**.

**O gargalo real não é falta de infraestrutura de eventos — é a ausência de qualquer mecanismo que empurre um prompt para dentro de uma sessão Kilo já ociosa.** Todo o código encontrado relacionado a "wake-up" é **pull** (o agente precisa perguntar) ou depende de o cliente Kilo já estar em um turno ativo para reagir a uma notificação MCP — nenhum caminho **push** para uma sessão parada foi encontrado. Isso confirma, com evidência de código e não só de teoria de protocolo, exatamente o problema que você vinha descrevendo nas últimas mensagens.

Além disso, a auditoria encontrou um **bug real** (endpoint REST de cursor não implementado, só existe na tool MCP) e uma **chave de API real hardcoded em dois arquivos versionados publicamente**.

---

## B. Mapa da arquitetura (como o código realmente está montado)

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│   FRONTEND (dashboard web)   │        │      KILO CODE (externo)      │
│  frontend/index.html + js    │        │  agente principal + filhos    │
└───────────────┬───────────────┘        └───────────────┬───────────────┘
                │ WS /ws/monitoramento                    │ HTTP (x-api-key) + stdio MCP
                │ (só origem localhost)                   │
┌───────────────▼──────────────────────────────────────────▼───────────────┐
│                          BACKEND (Express, porta 3150)                    │
│                                                                            │
│  api/*.ts (182 endpoints REST)         mcp-server/ (servidor MCP)         │
│    monitoramento.ts (sem cursor!) ◄┐     tools/ (~40 arquivos)            │
│    projetos.ts, tarefas.ts, ...    │     resources/monitoramento-resource │
│                                     │     subscriptions/ (subscribe real)  │
│  servicios/                        │     events/event-bus.ts (coalescing)│
│    MonitoramentoService.ts ────────┘         100ms, por URI)             │
│      eventSequence + globalEventBus.publish()                            │
│    KiloDiscoveryService.ts (lê .kilo/agent-manager.json, só leitura)     │
│    KiloReconciliationService.ts                                          │
│    KiloIdempotencyService.ts                                             │
│                                                                            │
│  Persistência: arquivos JSON em .ia/contexto/ (não é banco de dados)     │
└────────────────────────────────────────────────────────────────────────┘
```

**Divergência real vs. desenho do README:** o README (analisado em conversas anteriores) descreve "MCP Resource Subscriptions" como funcionalidade — e ela de fato existe (`subscription-manager.ts`, `resources/subscribe`, protocolos `2025`/`2026`). Mas nada no código consome essa notificação para acordar uma sessão Kilo parada — só existe o lado servidor da assinatura.

---

## C. Inventário — o que existe de verdade (evidência por arquivo)

| Recurso | Existe? | Integrado? | Evidência |
|---|---|---|---|
| Cursor de eventos (`eventSequence`) monotônico | ✅ Sim | Parcial (só na tool MCP) | `servicios/MonitoramentoService.ts:82-85,130-140` |
| Coalescing/debounce de eventos | ✅ Sim (100ms por URI) | Sim, usado no publish de toda mensagem | `mcp-server/events/event-bus.ts:14,25-39` |
| MCP `resources/subscribe` real | ✅ Sim (protocolo 2025/2026) | Sim, no servidor MCP | `mcp-server/subscriptions/subscription-manager.ts` |
| Recurso MCP assinável de monitoramento | ✅ Sim | Sim | `mcp-server/resources/monitoramento-resource.ts:22-78` |
| Tool MCP "verificar pendentes" (pull, cursor) | ✅ Sim | Sim | `mcp-server/tools/monitoramento-wakeup.ts:17-79` |
| Endpoint REST com cursor (`?after=`) | ❌ **Não** — só ignora o parâmetro | — | `api/monitoramento.ts:8-22` (não lê `req.query.after`) |
| Push real para sessão Kilo ociosa (wake-up) | ❌ Não encontrado | — | busca por `kilo run`/`--attach`/spawn de CLI no backend: nenhum resultado |
| Descoberta do estado do Kilo (worktrees/sessões) | ✅ Sim, mas só leitura passiva de arquivo | Sim | `servicios/KiloDiscoveryService.ts:23-53` — lê `.kilo/agent-manager.json`, não consulta `kilo session list` nem servidor HTTP do Kilo |
| WebSocket para dashboard | ✅ Sim | Sim (restrito a origem localhost) | `websocket/monitoramento.ts:10-13,24-36` |
| Dispatcher de agentes (mecanismo antigo) | ⚠️ Depreciado no código, mantido só como stub | Não | `servicios/MonitoramentoService.ts:447-449` (`"Dispatcher depreciado. Use Agent Manager worktrees."`) |
| Script de validação do cursor (`validar-wakeup.cjs`) | ✅ Existe no repo | ⚠️ Testa um endpoint que não faz o que o script espera | `backend/validar-wakeup.cjs:80-100` testa `?after=` no REST, que não é lido pelo router real |

**Não auditado nesta passada** (repositório grande demais para cobertura total no tempo desta análise): os outros ~35 arquivos de tools MCP além do de wake-up, o frontend completo (`frontend/js`, ~192 KB), os 24 schemas em `esquemas/`, os testes E2E Playwright, `ScaffoldService.ts` (52 KB), e a análise linha-a-linha dos outros 175 endpoints REST. Se quiser, posso aprofundar em qualquer um desses na sequência.

---

## D. Causa-raiz do problema de wake-up (evidência, não suposição)

Sua pergunta original era: por que o agente principal não percebe automaticamente quando o filho termina? A resposta com evidência de código:

1. Quando um agente filho reporta resultado, `MonitoramentoService.adicionarMensagem()` roda, incrementa o `eventSequence`, salva, e chama `globalEventBus.publish({ uri: 'agentmap://monitoramento/mensagens', ... })` — **linha 317-330 de `MonitoramentoService.ts`**.
2. Isso dispara o `EventBus`, que (depois de uma janela de coalescing de 100ms) notifica os handlers assinados via `subscriptionManager` — mecanismo real de `resources/updated` do protocolo MCP.
3. **Mas essa notificação só chega a um cliente MCP que já está com uma conexão ativa e ouvindo.** Se o agente principal do Kilo já terminou seu turno (ficou ocioso, sem uma chamada de ferramenta pendente), não há absolutamente nada no código do AgentMap — nem do lado do Kilo, que está fora deste repositório — que injete um novo prompt/turno nessa sessão parada.
4. A própria tool `agentmap_monitoramento_verificar_pendentes` (que seria a peça que o agente chamaria para reagir) tem na descrição: *"Use quando receber notificação resources/updated **ou para checar manualmente**"* — ou seja, o próprio time que escreveu essa tool já sabia que dependia do agente estar ativo para reagir, ou de alguém pedir manualmente. É exatamente o "verifique as mensagens dos filhos" que você digita hoje.

**Conclusão com evidência:** o gap não é de protocolo (MCP resource subscriptions funcionam), é de **transporte para sessão ociosa** — que é fora do escopo do que MCP resolve sozinho, e é exatamente o problema que os planos `PLANO-WAKEUP-...v1` a `v4` desta conversa tentaram endereçar via CLI (`kilo run --attach`). A auditoria confirma que essa lacuna é real e que o AgentMap, sozinho, não tem (nem pretende ter, pelo texto da própria tool) uma solução para ela.

---

## E. Problemas encontrados, por severidade

| # | Problema | Severidade | Evidência |
|---|---|---|---|
| 1 | Chave de API real (`66c8fdbf...`) hardcoded, commitada em 2 arquivos, repo público | **CRÍTICO*** | `backend/validar-wakeup.cjs:4`, `backend/testes/mcp-notification-e2e.test.ts:11` |
| 2 | Endpoint REST `/api/monitoramento/mensagens` ignora `?after=`, mas há um script de validação (`validar-wakeup.cjs`) que assume que funciona — rodar esse script hoje contra o REST deve falhar nas asserções de cursor | ALTO | `api/monitoramento.ts:8-22` vs `validar-wakeup.cjs:80-100` |
| 3 | Nenhum mecanismo de push para sessão Kilo ociosa — usuário precisa acionar manualmente | ALTO (é o problema central desta conversa) | ausência confirmada por busca no código |
| 4 | Persistência em arquivo JSON único por tipo de dado (`.ia/contexto/mensagens-monitoramento.json`), sem lock explícito visível nesta leitura — risco de escrita concorrente entre múltiplos agentes não avaliado a fundo nesta passada | MÉDIO (não auditado a fundo — recomendo checagem específica) | `MonitoramentoService.ts:49-50,123-128` |
| 5 | "Dispatcher" antigo deixado como stub retornando erro `NOT_IMPLEMENTED`, mas endpoints REST (`/dispatcher/*`) continuam expostos e documentáveis, gerando confusão sobre qual mecanismo é o real (Agent Manager) | BAIXO | `MonitoramentoService.ts:443-453`, `api/monitoramento.ts:98-117` |

*(*) Classifiquei como CRÍTICO por estar em repositório público, mesmo a API rodando só em `localhost:3150` — o risco concreto depende de esse endereço nunca ser exposto além do seu próprio computador (VPN, túnel, port-forward, etc.). Recomendo trocar a chave e remover do histórico do git de qualquer forma, já que uma vez commitada publicamente ela deve ser tratada como comprometida.*

---

## F. Matriz de priorização

| ID | Nome | Prioridade | Ação |
|---|---|---|---|
| P0-1 | Rotacionar a API key exposta e remover do histórico do git (`git filter-repo` ou BFG) | P0 | Gerar nova chave, mover para variável de ambiente / `.env` (já existe `.env.example` no repo, mas a chave real não deveria nunca ter sido commitada) |
| P0-2 | Corrigir `/api/monitoramento/mensagens` para ler `req.query.after` e delegar para `listarMensagensApos`, alinhando REST com o que a tool MCP e o script de validação já esperam | P0 | Pequena mudança em `api/monitoramento.ts` |
| P1-1 | Implementar o mecanismo de push para sessão ociosa (é exatamente o escopo do `PLANO-WAKEUP-...-v4.md` já produzido nesta conversa) | P1 | Seguir a cadeia de Gates do plano v4 — Gate -1 primeiro |
| P1-2 | Avaliar concorrência de escrita em `.ia/contexto/*.json` sob múltiplos agentes simultâneos (não auditado a fundo aqui) | P1 | Investigação dedicada, fora do escopo desta passada |
| P2-1 | Remover ou isolar claramente os endpoints `/dispatcher/*` depreciados, para não confundir implementadores futuros | P2 | Deprecar oficialmente na API (410 Gone) ou remover |
| P2-2 | Documentar explicitamente, no próprio README, que "resources/updated" só alcança sessões Kilo ativas — hoje o README (analisado em sessão anterior) descreve a funcionalidade sem esse limite, o que pode gerar expectativa equivocada | P2 | Atualização de documentação |
| P3 | Cobertura de auditoria dos ~35 arquivos de tools MCP não lidos nesta passada, frontend completo, e schemas | P3 | Rodada de auditoria dedicada, se quiser aprofundar |

---

## G. Roadmap sugerido (integra com o que já foi decidido nesta conversa)

```
FASE 0 — Correções críticas
  P0-1 (rotacionar chave) + P0-2 (corrigir cursor REST)
FASE 1 — Wake-up (retomar o PLANO-WAKEUP-...-v4.md já pronto)
  Gate -1 → Gate 0 → Gate 1 → Gate 2 → Gate 3 → Gate 4
FASE 2 — Concorrência e persistência
  Investigação dedicada de locks em .ia/contexto/*.json
FASE 3 — Limpeza de dívida técnica
  P2-1 (dispatcher) + P2-2 (documentação)
FASE 4 — Auditoria complementar
  Tools MCP restantes, frontend, schemas (P3)
```

**Observação importante:** a Fase 1 (wake-up) já tem um plano detalhado e revisado quatro vezes nesta conversa (`PLANO-WAKEUP-AGENTE-PRINCIPAL-KILOCODE-v4.md`) — esta auditoria não substitui aquele plano, ela confirma que o lado AgentMap da equação já está mais pronto do que o plano v1 original presumia (o `event_sequence` e o coalescing já existem, não precisam ser criados do zero como o v1 sugeria), o que simplifica o Gate 1 do plano v4.

---

## H. Metodologia e limites desta auditoria

- Repositório clonado raso (`--depth 1`) da branch `main`, sem histórico de commits analisado (então "código morto" e "duplicação histórica" não foram avaliados por diff temporal, só por inspeção do estado atual).
- Leitura direta de: `MonitoramentoService.ts`, `event-bus.ts`, `subscription-manager.ts`, `monitoramento-resource.ts`, `monitoramento-wakeup.ts`, `api/monitoramento.ts`, `api/index.ts` (rotas), `KiloDiscoveryService.ts`, `websocket/monitoramento.ts`, `validar-wakeup.cjs`, além de varredura por padrão em todo `backend/src` para termos como `kilo run`, `--attach`, `wakeup`, chaves hardcoded.
- **Não lidos linha a linha**: os demais ~35 arquivos de tools MCP, o frontend, os 24 schemas JSON, os testes E2E Playwright, `ScaffoldService.ts`, e os outros ~175 endpoints REST fora do módulo de monitoramento. As seções B–G desta auditoria cobrem o que é diretamente relevante ao problema de wake-up que motivou a investigação; uma auditoria de superfície completa dos 28 tópicos do pedido original exigiria uma rodada dedicada por módulo.
