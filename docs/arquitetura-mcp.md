# Arquitetura MCP do AgentMap

## Visão Geral

O MCP (Model Context Protocol) do AgentMap é uma camada de acesso que expõe os serviços existentes do gerenciador através de um protocolo padrão. Zero duplicação de código — todas as operações MCP reutilizam diretamente os serviços do AgentMap.

## Transporte

- **Protocolo**: stdio (JSON-RPC sobre stdin/stdout)
- **Processo separado**: roda via `tsx src/mcp-server/index.ts`
- **Independência**: não embutido no Express HTTP

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
│   └── authorization.ts          # authorizeResourceAccess(): valida acesso antes de subscribe/read
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
- **Sem path traversal**: Reutiliza `seguranca/paths.ts` integralmente.

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

## Estado da Implementação

- [x] Fase 1 — Core (status, projetos)
- [x] Fase 2 — Entidades principais (tarefas, agentes, solicitacoes, handoffs, sessoes)
- [x] Fase 3 — Entidades secundárias (checkpoints, riscos, bloqueios, pendencias, reservas, decisoes, dependencias, responsabilidades, artefatos, resultados, criterios, aprendizados, validacoes)
- [x] Fase 4 — Workflows (iniciar_trabalho, finalizar_trabalho, consultar_pendencias, obter_mapa_projeto)
- [x] Infra (arquivos, auditoria, integridade)
- [x] Resources (status, manifest, projeto)
- [x] Prompts (4 prompts operacionais)
- [x] Manifesto JSON
- [x] MCP Resource Subscriptions (EventBus, SubscriptionManager, URI Factory, Authorization, templates dinâmicos)
- [x] Subscriptions dual-era (2025 legacy + 2026 listen)
- [x] Graceful shutdown para streams 2026
- [x] Documentação

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

- **Tools:** registradas com `registerTool(name, config, handler)`
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
