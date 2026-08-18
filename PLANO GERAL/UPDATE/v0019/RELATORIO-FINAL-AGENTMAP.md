# Relatório Final — AgentMap: Auditoria Consolidada e Arquitetura Definitiva de Wake-Up

Este documento reconcilia três auditorias independentes da mesma branch `main` (a minha, feita clonando e lendo o código; e as duas que você enviou, feitas por outros agentes) e fecha com uma recomendação técnica única, verificada contra documentação oficial do Kilo Code.

---

## 1. O achado que muda tudo — mecanismo oficial de wake-up

Os planos v1 a v4 desta conversa (baseados em `kilo run --attach` via CLI externa) resolviam o problema, mas dependiam de descobrir porta e senha de um servidor gerado pela extensão VS Code — o Gate -1/0 mais frágil de todo o processo.

**Verifiquei contra a documentação oficial do Kilo (`TESTING.md` e `kilo.ai/docs/automate/extending/plugins`) e existe um caminho melhor, oficialmente suportado:**

- O SDK oficial (`@kilocode/sdk/v2`) expõe `client.session.promptAsync({ sessionID, parts })` — injeta um prompt numa sessão existente, assíncrono, sem precisar de CLI externa.
- O sistema de **plugins** do Kilo (`.kilo/plugin/*.ts`) roda **dentro do mesmo processo** do `kilo serve` que a extensão VS Code já sobe — e tem um hook nativo:
  ```ts
  const plugin: Plugin = async () => ({
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        // sessão acabou de ficar ociosa — momento exato de agir
      }
    },
  })
  ```

**Isso substitui o Gate -1/0 dos planos v1-v4 inteiro.** Em vez de um watcher externo tentando adivinhar porta/senha do servidor da extensão e chamar `kilo run --attach` de fora, um **plugin do AgentMap** (`.kilo/plugin/agentmap-wakeup.ts`) roda dentro do próprio Kilo, escuta `session.idle`, consulta a API do AgentMap (`agentmap_monitoramento_verificar_pendentes`, que já existe) e, se houver mensagem pendente, chama `promptAsync` diretamente — tudo dentro do mesmo processo, com acesso nativo ao `sessionID`, sem autenticação externa, sem descoberta de porta.

Isso não invalida o trabalho dos planos v1-v4 — o **Event Bus, o `eventSequence`, o filtro de relevância, o coalescing e os níveis de autonomia continuam exatamente como desenhados** (Gates 1 a 4). Só o transporte muda: de "CLI externa tentando entrar" para "plugin nativo já dentro".

---

## 2. Reconciliação das três auditorias

| Ponto | Minha auditoria | Relatório "kilo-autofree" | Relatório "openai" | Veredito (verificado no código/docs reais) |
|---|---|---|---|---|
| Nº de tools MCP | ~40 (**errado** — contei arquivos, não tools registradas) | não afirma número exato | 131 | **131 está correto** — contei 129 chamadas `registerTracedTool` + tools via `registerWorkflowTool` (não contadas na minha regex), bate com o que o próprio README declara. Corrijo minha auditoria anterior aqui. |
| Autenticação da API REST | não avaliei a fundo | CRÍTICO — sem auth/RBAC | 🟢 "Segurança local: Boa base" (mais brando) | **CRÍTICO confirmado agora com evidência direta**: `x-api-key` é citado como "obrigatório" em `mcp-server/resources/index.ts:222` e listado em `CorsService.ts:13`, mas **não há nenhuma validação desse header em nenhum lugar do backend** (`grep` vazio em toda `backend/src`). É controle documentado, não implementado — divergência real entre doc e código. O relatório "openai" foi brando demais aqui. |
| Cursor `eventSequence` no REST | Confirmei que falta (`?after=` ignorado) | Mesma constatação (F2-4) | Menciona menos esse detalhe específico | **Confirmado por dois dos três relatórios com evidência de arquivo/linha** — bug real. |
| Path traversal em `criarProjeto` | não avaliado | CRÍTICO, `ProjetoService.ts:73-82` | não detalha | **Parcialmente confirmado**: o nome do projeto é sanitizado, mas `caminhoParental` só é comparado contra a pasta do próprio AgentMap — nada impede um caminho arbitrário fora dela. Risco real, mas atenuado pelo fato de o software ser local/single-user; ainda assim vale corrigir. |
| Wake-up já existe? | Não — só pull, confirmei ausência de qualquer push | 🔴 Não fechado | 🔴 "Gargalo principal", mesma conclusão | **Os três relatórios convergem** neste ponto central — é o achado mais robusto de toda a auditoria, confirmado de três ângulos independentes. |
| Solução recomendada para wake-up | CLI `kilo run --attach` (planos v1-v4) | Não detalha mecanismo específico do Kilo | `prompt_async` + plugin `session.idle` | **A proposta "openai" vence** — verificada agora contra documentação oficial (seção 1 acima). Mais simples, sem problema de credencial, oficialmente suportada. |
| "527 testes aprovados" (kilo-autofree) | não verificado nesta rodada | afirma | não menciona | **Não verificado por mim** — não rodei a suíte de testes. Trato como não confirmado, nem confirmo nem refuto. |

---

## 3. Segurança — quadro consolidado e corrigido

| # | Achado | Severidade | Evidência |
|---|---|---|---|
| 1 | **Nenhuma autenticação real na API REST** — `x-api-key` documentado como obrigatório, mas não validado em código | **CRÍTICO** | `mcp-server/resources/index.ts:222` (doc) vs. ausência total em `backend/src/api/middleware.ts` e demais arquivos |
| 2 | Chave de API real hardcoded, commitada publicamente (mesmo não fazendo nada hoje, é má prática e fica exposta se a validação for implementada depois) | ALTO | `backend/validar-wakeup.cjs:4`, `backend/testes/mcp-notification-e2e.test.ts:11` |
| 3 | `criarProjeto` não valida `caminhoParental` contra um diretório raiz permitido | MÉDIO (atenuado por ser software local/single-user) | `ProjetoService.ts:73-82` |
| 4 | Endpoint REST de monitoramento ignora `?after=` — cursor só funciona via tool MCP | ALTO (funcional, não segurança) | `api/monitoramento.ts:8-22` |
| 5 | Sem wake-up automático — usuário precisa intervir manualmente | ALTO (é o motivo desta investigação inteira) | confirmado pelos 3 relatórios |

---

## 4. Arquitetura definitiva recomendada

```
┌────────────────────────────────────────────┐
│              KILO SERVE (processo único)     │
│         (spawnado pela extensão VS Code)     │
│                                              │
│  Agente Principal ◄──── promptAsync ────┐    │
│         │                               │    │
│         │ session.idle (evento)         │    │
│         ▼                               │    │
│  ┌─────────────────────────────────┐    │    │
│  │  Plugin AgentMap (.kilo/plugin)  │────┘    │
│  │  - escuta session.idle           │         │
│  │  - consulta AgentMap (MCP/HTTP)  │         │
│  │  - filtra relevância + debounce  │         │
│  │  - chama promptAsync se relevante│         │
│  └─────────────────┬─────────────────┘         │
└────────────────────┼──────────────────────────┘
                      │ HTTP (localhost) ou MCP stdio
                      ▼
┌────────────────────────────────────────────┐
│                  AGENTMAP                    │
│  MonitoramentoService (eventSequence real)   │
│  EventBus (coalescing, já implementado)      │
│  tool agentmap_monitoramento_verificar_...   │
└────────────────────────────────────────────┘
                      ▲
                      │ HTTP (reporta resultado)
┌────────────────────┴──────────────────────┐
│        AGENTES FILHOS (Agent Manager)       │
└──────────────────────────────────────────────┘
```

Isso elimina inteiramente a necessidade de: descobrir porta/senha do servidor da extensão, lidar com o bug de `Unauthorized`, e testar concorrência entre painel aberto e injeção externa — porque não há mais processo externo tentando entrar, o código roda dentro do Kilo.

---

## 5. Matriz de prioridades final (consolidada, substitui listas parciais anteriores)

| ID | Ação | Prioridade | Origem |
|---|---|---|---|
| P0-1 | Implementar validação real do `x-api-key` (ou substituir por auth JWT local) na API REST | P0 | achado direto desta rodada |
| P0-2 | Rotacionar a chave hardcoded e remover do histórico do git | P0 | minha auditoria anterior |
| P0-3 | Corrigir `/api/monitoramento/mensagens` para honrar `?after=` (delegar para `listarMensagensApos`) | P0 | minha auditoria + kilo-autofree (F2-4) |
| P0-4 | Construir o plugin `.kilo/plugin/agentmap-wakeup.ts` (escuta `session.idle` → consulta AgentMap → `promptAsync`) | P0 | esta rodada, substitui v1-v4 do plano CLI |
| P1-1 | Validar `caminhoParental` contra diretório(s) raiz permitido(s) em `criarProjeto` | P1 | kilo-autofree |
| P1-2 | Debounce/coalescing de eventos antes do wake-up (múltiplos filhos terminando juntos) | P1 | planos v1-v4 desta conversa, ainda válido |
| P1-3 | Idempotência do wake-up (não reenviar o mesmo lote de eventos) | P1 | planos v1-v4 + kilo-autofree |
| P2-1 | EventBus persistente (hoje é só em memória, perde estado em restart) | P2 | kilo-autofree (P1-1 na numeração deles) |
| P2-2 | Auto-refresh do dashboard frontend | P2 | kilo-autofree |
| P3 | Migração de persistência para SQLite/Postgres, GraphQL, multi-projeto real | P3 | kilo-autofree — concordo que é evolução, não urgente |

---

## 6. O que eu não recomendo (das sugestões recebidas)

- **Redis/NATS/Kafka como pré-requisito para o wake-up** — o relatório "openai" já chegou à mesma conclusão e eu concordo: o Event Bus em memória atual, mais o plugin `session.idle`, resolve o problema sem precisar de um broker externo. Adicionar isso agora seria complexidade sem benefício imediato.
- **Keycloak/OIDC completo** — overkill para uso local single-user; um JWT simples ou validação correta do `x-api-key` já documentado resolve o P0-1 sem essa complexidade.
- **Temporal para orquestração de workflows** — mesmo raciocínio; o relatório kilo-autofree já classificou como "NÃO RECOMENDAR" e concordo.

---

## 7. Próximo passo concreto

Entre tudo que foi mapeado, o item que destrava mais valor com menos esforço é o **P0-4** (plugin `session.idle` + `promptAsync`) — ele substitui todo o trabalho de Gates -1 a 0 dos planos anteriores por uma integração nativa já documentada oficialmente. Posso montar esse plugin (esqueleto real, em TypeScript, seguindo a API `@kilocode/plugin` documentada) na sequência, do mesmo jeito que fiz o `watcher-wakeup.js` — assim você já sai com código para testar, não só o desenho.
