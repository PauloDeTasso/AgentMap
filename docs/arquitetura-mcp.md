# Arquitetura MCP do AgentMap

## Visão Geral

O MCP (Model Context Protocol) do AgentMap é uma camada de acesso padrão que expõe os serviços do gerenciador através do protocolo MCP. A arquitetura é stateless por tool e reutiliza integralmente os serviços existentes, sem duplicação de lógica.

A implementação está em produção, validada e pronta para consumo por clientes MCP compatíveis.

## Transporte

- **Protocolo**: stdio (JSON-RPC sobre stdin/stdout)
- **Processo separado**: executado via `tsx src/mcp-server/index.ts`
- **Independência**: não embutido no servidor HTTP Express

## Componentes

```
backend/src/mcp-server/
├── index.ts                      # Entry point stdio + setToolRequestHandlers
├── server.ts                     # McpServer instance, capabilities, resources, subscriptions
├── contexto.ts                   # ProjetoContext: carrega projeto atual + serviços
├── erros/
│   └── mcp-erros.ts              # Códigos de erro estáveis + mapeamento para MCP
├── events/
│   └── event-bus.ts              # EventBus local: publish/subscribe + coalescência por URI
├── resources/
│   ├── index.ts                  # Resources estáticos + templates + handlers subscribe/unsubscribe + listen 2026
│   ├── uri-factory.ts            # URIs canônicas agentmap://... com encodeURIComponent
│   └── paths.ts                  # Proteção contra path traversal em todos os acessos
├── subscriptions/
│   ├── subscription-manager.ts   # Gerenciamento de subscriptions por session/URI (2025 + 2026)
│   └── protocol-adapter.ts       # Adaptador de protocolo para dual-era routing
├── tools/
│   ├── base.ts                   # Helper: executarServico<T>(servico, metodo, args)
│   ├── projeto.ts                # status, projetos_listar, projetos_criar, projetos_abrir, projetos_fechar, projetos_atual
│   ├── tarefas.ts                # listar, obter, criar, atualizar, alterar_estado, excluir, contexto
│   ├── agentes.ts                # listar, obter, criar, atualizar, excluir
│   ├── solicitacoes.ts           # listar, obter, criar, atualizar, aprovar, rejeitar, cancelar, excluir, historico
│   ├── handoffs.ts               # listar, obter, criar, atualizar, excluir
│   ├── sessoes.ts                # listar, obter, criar, atualizar, finalizar, excluir
│   ├── checkpoints.ts            # listar, obter, criar, excluir
│   ├── riscos.ts                 # listar, obter, criar, atualizar, excluir
│   ├── bloqueios.ts              # listar, obter, criar, resolver, excluir
│   ├── pendencias.ts             # listar, obter, criar, atualizar, resolver, excluir
│   ├── reservas.ts               # listar, obter, criar, liberar, excluir
│   ├── decisoes.ts               # listar, obter, criar, atualizar, excluir
│   ├── dependencias.ts           # listar, obter, criar, excluir
│   ├── responsabilidades.ts      # listar, obter, criar, excluir
│   ├── artefatos.ts              # listar, obter, criar, excluir, versoes
│   ├── resultados.ts             # listar, obter, criar, atualizar, excluir
│   ├── criterios.ts              # listar, obter, criar, excluir
│   ├── aprendizados.ts           # listar, obter, criar, excluir
│   ├── validacoes.ts             # listar, obter, criar, atualizar, aprovar, rejeitar, excluir
│   ├── arquivos.ts               # listar, ler, escrever, excluir (COM isPathSafe)
│   ├── auditoria.ts              # listar (ultimos N eventos)
│   ├── contatos.ts               # listar, obter, criar, atualizar, excluir
│   ├── descobrir.ts              # agentmap_descobrir: lista capabilities, agents, docs, CLI, worktree
│   ├── sugerirFluxo.ts           # agentmap_sugerir_fluxo: recomenda sequência de tools por objetivo
│   └── workflows.ts              # iniciar_trabalho, finalizar_trabalho, consultar_pendencias, obter_mapa_projeto
├── prompts/
│   └── index.ts                  # agentmap-iniciar-trabalho, agentmap-finalizar-trabalho, etc.
├── schemas/
│   └── manifest.json             # Manifesto do AgentMap para MCP
└── utils/
    └── helpers.ts                # toMcpResult, toMcpData, toMcpStructured, mcpError, schema helper
```

## Observabilidade (OpenTelemetry)

O backend do AgentMap instrumenta traces e métricas usando **OpenTelemetry** com convenções `gen_ai.*` e domínios próprios `agentmap.*`.

```
backend/src/observability/
├── index.ts                      # Inicialização do módulo de observabilidade
├── tracing.ts                    # NodeSDK setup + getTracer()
├── http-tracing.ts               # Middleware Express para spans HTTP
├── tool-tracing.ts               # Wrapper registerTracedTool para tools MCP
├── agent-tracing.ts              # Tracing do ciclo de vida de agentes
├── metrics.ts                    # Instruments OTel (counters, histograms)
├── metrics-store.ts              # Store em memória para dashboard
├── gen-ai.ts                     # Constantes gen_ai.* semantic conventions
├── attributes.ts                 # Constantes específicas agentmap.*
├── sanitization.ts               # Política de sanitização de argumentos
└── index.ts                      # Barrel export
```

### Instrumentação HTTP

O middleware `httpRequestMiddleware` é registrado no Express antes das rotas (`backend/src/app.ts`) e gera spans nomeados `METHOD /url` com atributos `http.request.method`, `url.path` e `http.response.status_code`.

### Instrumentação de Tools MCP

Todas as tools MCP são registradas via wrapper `registerTracedTool(mcpServer, name, schema, handler)`. Esse wrapper:
- Cria spans `execute_tool <toolName>`
- Propaga atributos `gen_ai.tool.name`, `gen_ai.tool.call.id`, `gen_ai.agent.id`
- Registra métricas de execução, duração e erro

### Métricas

Métricas OTel são combinadas com um `metricsStore` em memória para alimentar o dashboard:

- `agentmap.tool.executions` — contador de execuções de tools
- `agentmap.tool.errors` — contador de erros
- `agentmap.tool.duration` — histograma de duração
- `agentmap.agent.executions` — contador de execuções de agentes
- `agentmap.agent.duration` — histograma de duração de agentes

### Dashboard

Endpoint `GET /api/observabilidade/metricas` retorna agregados por agente e por tool para o frontend de observabilidade.

## Contexto do Projeto

A função `carregarContexto()` em `contexto.ts` replica o `projectMiddleware` do HTTP:

1. Chama `projetoService.getProjetoAtual()`
2. Se `null` → erro MCP `NO_PROJECT_OPEN`
3. Instancia todos os 22 serviços com `projeto.fileService`, `projeto.auditoria`, `projeto.validator`, `projeto.dependencia`
4. Retorna `ProjetoContext` com `projetoId`, `projeto`, `servicos`

## Segurança

- **Workspace**: MCP só opera dentro do projeto aberto. Todos os caminhos passam por `FileService.resolve()` → `resolveProjectPath()` → `isPathSafe()`.
- **Identidade**: Tools que escrevem recebem `projetoId`, `agenteId`, `sessaoId` como parâmetros explícitos.
- **Sem shell**: Nenhuma tool executa comandos do sistema.
- **Sem path traversal**: Reutiliza `FileService.resolve()` → `resolveProjectPath()` → `isPathSafe()` integralmente.

## Convenção de Nomes

- **Tools**: `agentmap_<entidade>_<acao>` (ex: `agentmap_tarefas_criar`, `agentmap_solicitacoes_aprovar`)
- **Resources**: `agentmap://<recurso>` (ex: `agentmap://status`, `agentmap://projeto`)
- **Prompts**: `agentmap-<fluxo>` (ex: `agentmap-iniciar-trabalho`)

## Dependência MCP

- **SDK**: `@modelcontextprotocol/sdk` v1.30.0
- **Transporte**: `StdioServerTransport` do SDK
- **Servidor**: `McpServer` do SDK
- **Nota**: O SDK é ESM-only. O projeto usa `tsx` para transpilar TypeScript com suporte a ESM.

## Scripts

```bash
npm run mcp    # Inicia o servidor MCP via stdio
```

## Configuração Kilo

```json
{
  "mcp": {
    "agentmap": {
      "type": "local",
      "command": ["cmd", "/c", "cd", "backend", "&&", "npx", "tsx", "src/mcp-server/index.ts"],
      "environment": {
        "NODE_ENV": "production"
      },
      "enabled": true,
      "timeout": 30000
    }
  },
  "provider": {
    "openrouter": {
      "data_collection_enabled": true
    },
    "kilo": {
      "data_collection_enabled": true
    }
  }
}
```

> **Nota:** Use caminhos relativos ou configure o diretório de trabalho (`cwd`). Caminhos absolutos como `G:/PROJETOS/WEB/AgentMap/...` quebram se o projeto for movido ou clonado em outro local.

## Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| JSON corrompido por concorrência | FileService já usa write-atômico + backup. MCP reutiliza. |
| MCP com estado próprio | MCP é stateless por tool. Contexto carregado por invocação. |
| Caminho absoluto no Windows | Reutiliza `path.win32` + `resolveProjectPath` + `isPathSafe`. |
| Stack trace exposto | Captura erros, retorna só `codigo` + `mensagem`. |
| Secret em log | AuditoriaService já sanitiza. MCP replica. |
| Versão do SDK MCP | Fixar v1.30.0 no package.json, documentado aqui. |
| Múltiplos processos sem estado compartilhado | EventBus local por processo; subscriptions são connection-scoped. |
| Vazamento de memória por sessão morta | `unsubscribeAll(sessionId)` no disconnect + shutdown do EventBus. |
| Flood de notificações em burst | Coalescência por URI com janela de 100ms. |

## Padrões MCP 2026

- **Tools:** registradas com `registerTracedTool` / `registerWorkflowTool(name, config, handler)`
- **Config:** `title`, `description`, `inputSchema` (Zod), `outputSchema` (Zod), `annotations`
- **Retorno sucesso:** `content` + `structuredContent` (validado contra `outputSchema`)
- **Retorno erro:** `content` + `isError: true`
- **Backwards compatibility:** `content` sempre retornado para clients legados
- **Resources:** registradas com `registerResource(name, uri/template, metadata, callback)`
- **Subscriptions 2025:** handlers `resources/subscribe` + `resources/unsubscribe` via `setRequestHandler`
- **Subscriptions 2026:** handler `subscriptions/listen` via `setRequestHandler` com filtro `resourceSubscriptions`
- **Notificações:** `server.sendResourceUpdated({ uri })` para clientes inscritos no modo 2025
- **Notificações 2026:** `server.notification({ method: 'notifications/resources/updated', params: { uri }, _meta: { subscriptionId } })`
- **Dual-era routing:** o servidor suporta ambos os modos simultaneamente; clients 2025 usam `resources/subscribe`, clients 2026 usam `subscriptions/listen`

## Plugin agentmap-wakeup — Wake-up nativo dentro do processo Kilo

> **Base teórica:** `PLANO GERAL/UPDATE/v0019/RELATORIO-FINAL-AGENTMAP.md` — seções 1 e 4.

### Visão geral

O plugin oficial `agentmap-wakeup` (arquivo `.kilo/plugin/agentmap-wakeup.ts`) roda **dentro do mesmo processo** do `kilo serve` — ou seja, dentro do processo que a extensão VS Code / CLI já sobe. Ele não é um script externo, não descobre porta alguma e não precisa de credencial de servidor. O plugin tem acesso nativo ao cliente interno do Kilo (`ctx.client`) e escuta o evento de ciclo de vida `session.idle`, acordando sessões ociosas quando o AgentMap tem novas mensagens para elas.

### Flow completo

```
  ┌────────────────────────────────────────────────────────────────┐
  │  KILO SERVE (processo único da extensão VS Code / CLI)         │
  │                                                                │
  │  ┌──────────────────┐   session.idle (evento)                 │
  │  │  Sessão ociosa   │ ──────────────────────────────────────►  │
  │  │  (idle)          │                                         │
  │  └────────┬─────────┘                                         │
  │           │                                                     │
  │           ▼  debounce 3000 ms (por sessionId)                  │
  │  ┌─────────────────────────────┐                                │
  │  │  Plugin agentmap-wakeup     │                                │
  │  │  (.kilo/plugin/*.ts)        │                                │
  │  └────────┬──────────────┬─────┘                                │
  │           │ HTTP GET      │ MCP/REST (localhost:3150)           │
  │           │              ▼                                        │
  │           │  ┌──────────────────────────┐                       │
  │           └─►│  AgentMap Backend        │                       │
  │              │  GET /api/monitoramento/ │                       │
  │              │       mensagens          │                       │
  │              │  (query params: limite,  │                       │
  │              │   after=eventSequence)   │                       │
  │              └──────────┬───────────────┘                       │
  │                         │  filtra por eventSequence >           │
  │                         │  último processado (client-side)     │
  │                         ▼                                        │
  │              ┌──────────────────────────┐                       │
  │              │  Mensagens pendentes?     │                       │
  │              │  sim → injeta prompt      │                       │
  │              └──────────┬───────────────┘                       │
  │                         │                                        │
  │                         ▼                                        │
  │              ┌──────────────────────────┐                       │
  │              │ client.session.promptAsync│                      │
  │              │   ({ sessionID, parts })  │                       │
  │              └──────────────────────────┘                       │
  │                                                                │
  │  (Agent Manager worktrees — filhos do AgentMap, via HTTP)      │
  │  POST /api/monitoramento/mensagens  ←  relata resultado        │
  └────────────────────────────────────────────────────────────────┘
```

1. **Disparador** — O Kilo gera o evento `session.idle` quando uma sessão não tem atividade há um intervalo configurado.
2. **Debounce** — O plugin agrupa verificações por `sessionId` usando um timer de **3000 ms** (`DEBOUNCE_MS`). Se vários eventos `idle` chegarem em sequência para a mesma sessão, apenas a última execução realmente dispara a consulta, evitando acordar a sessão várias vezes seguidas.
3. **Consulta ao AgentMap** — O plugin faz `GET /api/monitoramento/mensagens?limite=50` na API HTTP do AgentMap (`http://localhost:3150` por padrão). O header `x-api-key` é enviado quando `AGENTMAP_API_KEY` está definido, mantendo o plugin pronto para quando a validação de autenticação for implementada (ver RELATORIO-FINAL-AGENTMAP.md, seção 3, achado P0-1).
4. **Filtragem incremental (`eventSequence`)** — Cada mensagem possui um campo `eventSequence` (número inteiro sequencial). O plugin mantém em memória `ultimoEventSequenceProcessado` e processa apenas mensagens cujo `eventSequence` seja **maior** que o último valor registrado. Isso garante polling incremental: o plugin nunca reprocessa mensagens já entregues. (Nota: hoje o endpoint REST ignora o parâmetro `?after=` — achado P0-3 — por isso o filtro é feito **client-side** no plugin; veja o TODO no código.)
5. **Injeção do prompt** — Se houver mensagens pendentes, o plugin monta um resumo em texto e o injeta na sessão ociosa via `client.session.promptAsync({ sessionID, parts: [{ type: "text", text: resumo }] })`. O agente acorda já com o contexto das atualizações.
6. **Atualização do cursor** — Após o envio com sucesso, `ultimoEventSequenceProcessado` é atualizado com o maior `eventSequence` recebido, garantindo idempotência: o mesmo lote não será reenviado em polling futuros.

### Configuração

| Variável de ambiente | Default | Descrição |
|---|---|---|
| `AGENTMAP_API_URL` | `http://localhost:3150` | URL base do backend HTTP do AgentMap |
| `AGENTMAP_API_KEY` | *(vazio)* | Chave API (`x-api-key`) enviada no header; mantida para quando a validação for implementada |
| `AGENTMAP_WAKEUP_DEBOUNCE_MS` | `3000` | Janela de debounce em milissegundos entre verificações de wake-up |

### Características-chave

- **Stateless por evento** — O plugin não mantém estado de projeto; a cada `idle`, consulta a fonte real de mensagens.
- **Debounce coalescente** — Evita micro-acionamentos quando múltiplos filhos (Agent Manager worktrees) ficam ociosos quase ao mesmo tempo.
- **Idempotência** — O `eventSequence` previne reprocessamento de mensagens já entregues.
- **Integração transparente** — Usa a mesma API HTTP `GET /api/monitoramento/mensagens` já existente para o painel Monitor, sem duplicação de endpoints.
- **Zero configuração de rede** — Como o plugin roda dentro do processo do Kilo, não há necessidade de descobrir portas, handshakes ou credenciais externas (compare com abordagens baseadas em CLI externa descritas nos planos v1–v4).
