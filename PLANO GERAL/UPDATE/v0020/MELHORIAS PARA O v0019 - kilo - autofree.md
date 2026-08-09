## L. MELHORIAS DE MUITA NECESSIDADE (P1)

| ID | Nome | Categoria | Problema | Situação Atual | Impacto | Risco Atual | Prioridade | Complexidade | Dependências | Tecnologia | Arquivos Afetados |
|----|------|-----------|----------|----------------|---------|-------------|------------|--------------|--------------|------------|-------------------|
| P1-1 | **EventBus persistente com retry/DLQ** | Resiliência | Eventos em memória perdidos em restart | `event-bus.ts` pub/sub sem journaling | ALTO | Perda de eventos críticos | P1 | Média | Nenhuma | Redis Streams ou arquivo append-only | `backend/src/mcp-server/events/event-bus.ts`, `MonitoramentoService.ts` |
| P1-2 | **Locks/transações em registries** | Concorrência | Race conditions em `saveRegistroProjetos`, `proximoSequence` | Sem locks; write-then-rename não basta para registries | MÉDIO | Corrupção de dados JSON | P1 | Média | Nenhuma | `flock` ou mutex file-based; ou migração para SQLite | `backend/src/servicios/*.ts`, `FileService.ts` |
| P1-3 | **Auto-refresh no dashboard principal** | Frontend | Dashboard estático; operador não vê mudanças | Polling manual apenas | MÉDIO | UX degradada, operador desatualizado | P1 | Baixa | Nenhuma | Polling automático 5s ou SSE | `frontend/js/app.js` |
| P1-4 | **Validação de schema alinhada com TS** | Qualidade | Campos divergem entre TS e JSON Schema | Schemas desatualizados ou tipos divergentes | MÉDIO | Dados inválidos passam ou válidos são rejeitados | P1 | Média | Nenhuma | Gerar schemas a partir de TS (`typescript-json-schema`) | `backend/esquemas/*.json`, `backend/src/tipos/index.ts` |
| P1-5 | **Sanitização consistente de entrada** | Segurança | `sanitizeInput` não é usado consistentemente | Alguns serviços sanitizam, outros não | MÉDIO | XSS, command injection, path traversal | P1 | Baixa | Nenhuma | `sanitize-html` + validação Zod estrita | `backend/src/seguranca/paths.ts`, `backend/src/mcp-server/tools/*.ts` |
| P1-6 | **Auditoria com rotação/compactação** | Observabilidade | `eventos.json` cresce indefinidamente | Sem limite, sem rotação | MÉDIO | Performance e disco | P1 | Baixa | Nenhuma | Rotação por tamanho/data; compressão gzip | `backend/src/servicios/AuditoriaService.ts` |
| P1-7 | **Backup agendado automático** | Resiliência | Backup manual apenas | Sem cron/scheduler | MÉDIO | Perda de dados em falhas | P1 | Baixa | Nenhuma | Cron interno ou script agendado | `backend/src/servicios/BackupService.ts` |
| P1-8 | **Heartbeat WebSocket + reconexão inteligente** | Frontend | WebSocket sem ping; reconexão cega a cada 3s | Sem heartbeat/ping | BAIXO | Conexão zombie, desperdício de recursos | P1 | Baixa | Nenhuma | WebSocket ping/pong + backoff exponencial | `backend/src/websocket/monitoramento.ts`, `frontend/js/monitoramento.js` |

---

## M. MELHORIAS DE ALTA OBRIGATORIEDADE (P2)

| ID | Nome | Categoria | Problema | Situação Atual | Impacto | Risco Atual | Prioridade | Complexidade | Dependências | Tecnologia | Arquivos Afetados |
|----|------|-----------|----------|----------------|---------|-------------|------------|--------------|--------------|------------|-------------------|
| P2-1 | **Modos de operação (AUTÔNOMO/ASSISTIDO/MANUAL)** | Autonomia | Sistema não suporta graus de autonomia | Sem modos configuráveis | MÉDIO | Operador não pode escolher nível de intervenção | P2 | Média | P0-1, P0-2 | Configuração + workflow engine | `backend/src/servicios/OrquestradorService.ts`, `docs/` |
| P2-2 | **Busca global unificada** | Frontend | Sem busca textual além de filtros específicos | Filtros apenas em solicitações e monitoramento | BAIXO | UX limitada | P2 | Baixa | Nenhuma | PostgreSQL FTS ou Meilisearch | `frontend/js/app.js`, `backend/src/api/` |
| P2-3 | **Gráficos no dashboard** | Frontend | Dashboard apenas com cards de texto | Sem Chart.js ou equivalente | BAIXO | Visualização limitada | P2 | Baixa | Nenhuma | Chart.js ou ECharts | `frontend/index.html`, `frontend/js/app.js` |
| P2-4 | **Paginação/virtualização em listas** | Frontend | Listas longas renderizam tudo de uma vez | Sem paginação | BAIXO | Performance com muitos registros | P2 | Baixa | Nenhuma | Intersection Observer ou paginação server-side | `frontend/js/app.js` |
| P2-5 | **Validação client-side avançada** | Frontend | Validação básica (required, length) | Sem validação de duplicidade, formato, datas | BAIXO | Dados inválidos chegam ao backend | P2 | Baixa | Nenhuma | Zod validation mirror + debounce | `frontend/js/api.js` |
| P2-6 | **Testes de carga e stress** | Qualidade | Sem testes de concorrência reais | Apenas testes unitários/integração | MÉDIO | Race conditions não detectadas | P2 | Média | Nenhuma | Artillery ou k6 | `backend/testes/` |
| P2-7 | **Metrics de uso (tokens, custo, latência)** | Observabilidade | Sem métricas de consumo de modelos | Apenas traces OTel básicos | BAIXO | Sem visibilidade de custo | P2 | Média | Nenhuma | OpenTelemetry metrics + custom attributes | `backend/src/observability/` |
| P2-8 | **Documentação de API interativa** | Documentação | Sem OpenAPI/Swagger | Apenas docs estáticos | BAIXO | Descoberta de endpoints limitada | P2 | Baixa | Nenhuma | OpenAPI 3.1 + Swagger UI | `backend/src/api/` |

---

## N. MELHORIAS DE EVOLUÇÃO (P3)

| ID | Nome | Categoria | Problema | Situação Atual | Impacto | Risco Atual | Prioridade | Complexidade | Dependências | Tecnologia | Arquivos Afetados |
|----|------|-----------|----------|----------------|---------|-------------|------------|--------------|--------------|------------|-------------------|
| P3-1 | **Multi-projeto real** | Arquitetura | Estado global compartilhado; sem namespaces | `projetosAbertos` Map global | BAIXO | Escalabilidade | P3 | Alta | P0-2, P2-1 | Namespaces + contexto por projeto | `backend/src/servicios/ProjetoService.ts`, `middleware.ts` |
| P3-2 | **PostgreSQL como índice** | Persistência | Apenas JSON files; sem queries eficientes | `banco/` existe mas não implementado | BAIXO | Performance com muitos registros | P3 | Alta | Nenhuma | Knex + PostgreSQL | `backend/src/servicios/*`, `banco/` |
| P3-3 | **Event sourcing completo** | Arquitetura | Sem histórico completo de mudanças | Eventos são append-only, não reconstroem estado | BAIXO | Auditoria e replay | P3 | Alta | P1-1 | EventStore ou PostgreSQL | `backend/src/servicios/EventoService.ts` |
| P3-4 | **GraphQL API** | API | REST overfetch/underfetch | Apenas REST | BAIXO | Flexibilidade frontend | P3 | Média | Nenhuma | Apollo Server ou GraphQL Yoga | `backend/src/api/` |
| P3-5 | **Plugin system** | Extensibilidade | Sem hooks customizados | Código monolítico | BAIXO | Customização por usuário | P3 | Média | Nenhuma | Plugin SDK próprio ou `tapable` | `backend/src/` |
| P3-6 | **CI/CD integrado** | DevOps | Sem pipeline automatizada | Apenas scripts manuais | BAIXO | Deploy e testes manuais | P3 | Baixa | Nenhuma | GitHub Actions ou similar | `.github/workflows/` |
| P3-7 | **Mobile app** | Frontend | Apenas web | Sem app nativo | BAIXO | Acessibilidade mobile | P3 | Alta | Nenhuma | React Native ou Flutter | — |
| P3-8 | **AI-powered triage** | IA | Sem classificação automática de tarefas | Tudo manual | BAIXO | Autonomia | P3 | Média | P0-2 | Modelo de classificação local | `backend/src/servicios/TarefaService.ts` |

---

## O. TECNOLOGIAS OPEN SOURCE RECOMENDADAS

### Comunicação

| Tecnologia | Categoria | Problema que resolve | Por que é adequada | Integração AgentMap | Integração Kilo | Licença | Maturidade | Manutenção | Custo | Complexidade | Alternativas | Recomendação |
|------------|-----------|----------------------|-------------------|---------------------|----------------|---------|------------|------------|-------|--------------|--------------|--------------|
| **Redis Streams** | Mensageria | EventBus sem persistência, wake-up confiável | Nativo Redis, leve, suporta consumer groups, persistente | Via `ioredis` ou `redis` | Via HTTP bridge | MIT | Alta | Ativa | Baixo | Baixa | NATS, RabbitMQ | **RECOMENDAR** |
| **NATS** | Mensageria | Comunicação assíncrona, pub/sub, request/reply | Performance altíssima, clustering, jetstream para persistência | Via `nats` | Via HTTP bridge | Apache 2.0 | Alta | Ativa | Baixo | Média | Redis Streams | **RECOMENDAR** (alternativa) |
| **SSE (Server-Sent Events)** | Push HTTP | Frontend sem polling; Kilo sem WebSocket | Padrão HTTP, simples, funciona com proxies | `express-sse` ou similar | Nativa (Kilo Server suporta SSE) | MIT | Alta | Ativa | Baixo | Baixa | WebSocket | **RECOMENDAR** para notificações HTTP |
| **WebSocket + Ping/Pong** | Push | Heartbeat e reconexão | Já implementado; apenas adicionar ping/pong | Melhoria existente | Nativa (se suportado) | MIT | Alta | Ativa | Baixo | Baixa | SSE | **RECOMENDAR** (melhoria) |

### Observabilidade

| Tecnologia | Categoria | Problema que resolve | Por que é adequada | Integração AgentMap | Integração Kilo | Licença | Maturidade | Manutenção | Custo | Complexidade | Alternativas | Recomendação |
|------------|-----------|----------------------|-------------------|---------------------|----------------|---------|------------|------------|-------|--------------|--------------|--------------|
| **OpenTelemetry** | Tracing/Métricas | Observabilidade básica já existe; faltam métricas custom | Padrão aberto, suportado por Kilo, exporters fáceis | Já parcialmente implementado | Suportado via `gen_ai.*` | Apache 2.0 | Muito alta | Muito ativa | Baixo | Média | Jaeger puro, Prometheus | **RECOMENDAR** (expandir) |
| **Prometheus + Grafana** | Métricas/Dashboard | Dashboards operacionais, alertas | Padrão para métricas time-series | Via OTLP exporter | Via OTLP | Apache 2.0 / AGPL | Muito alta | Muito ativa | Baixo | Média | Tempo, Jaeger | **RECOMENDAR** |
| **Loki** | Logs | Agregação de logs com labels | Integra com Grafana, leve, indexa por label | Via `pino` ou `winston` transport | — | Apache 2.0 | Alta | Ativa | Baixo | Baixa | ELK, Splunk | **RECOMENDAR** |
| **Tempo** | Traces | Armazenamento de traces OTLP | Integra com Grafana, open source, simples | Via OTLP exporter | Suportado | AGPL | Alta | Ativa | Baixo | Baixa | Jaeger, Zipkin | **RECOMENDAR** (alternativa Jaeger) |

### Persistência

| Tecnologia | Categoria | Problema que resolve | Por que é adequada | Integração AgentMap | Integração Kilo | Licença | Maturidade | Manutenção | Custo | Complexidade | Alternativas | Recomendação |
|------------|-----------|----------------------|-------------------|---------------------|----------------|---------|------------|------------|-------|--------------|--------------|--------------|
| **SQLite** | Persistência | JSON files sem transações, sem queries | Serverless, embarcado, ACID, suporta FTS5 | Via `better-sqlite3` ou `sql.js` | — | Public Domain | Muito alta | Muito ativa | Baixo | Baixa | PostgreSQL | **RECOMENDAR** como stepping stone |
| **PostgreSQL** | Persistência | Queries complexas, FTS, índices, multi-usuário | Robusto, maduro, suporta JSON/JSONB | Via `pg` (já instalado) | — | PostgreSQL | Muito alta | Muito ativa | Baixo | Alta | SQLite | **RECOMENDAR** a longo prazo |
| **Redis** | Cache/Streams | Cache de sessões, rate limit, filas | Nativo, rápido, suporta streams | Via `ioredis` | — | MIT | Muito alta | Muito ativa | Baixo | Baixa | Memcached | **RECOMENDAR** |

### Jobs/Schedulers

| Tecnologia | Categoria | Problema que resolve | Por que é adequada | Integração AgentMap | Integração Kilo | Licença | Maturidade | Manutenção | Custo | Complexidade | Alternativas | Recomendação |
|------------|-----------|----------------------|-------------------|---------------------|----------------|---------|------------|------------|-------|--------------|--------------|--------------|
| **BullMQ** | Jobs/Queues | Backups, limpeza, orquestração assíncrona | Baseado em Redis, confiável, suporta delayed jobs, retry, DLQ | Via `bullmq` | — | MIT | Alta | Ativa | Baixo | Média | Agenda, Celery | **RECOMENDAR** |
| **Temporal** | Workflows | Orquestração multi-agente, stateful | Workflows duráveis, code-first, recuperação automática | Via `@temporalio/client` | — | MIT | Alta | Ativa | Baixo | Alta | Camunda, Airflow | **NÃO RECOMENDAR** (overkill para local) |

### Segurança

| Tecnologia | Categoria | Problema que resolve | Por que é adequada | Integração AgentMap | Integração Kilo | Licença | Maturidade | Manutenção | Custo | Complexidade | Alternativas | Recomendação |
|------------|-----------|----------------------|-------------------|---------------------|----------------|---------|------------|------------|-------|--------------|--------------|--------------|
| **Keycloak** | Auth/SSO | Autenticação robusta, RBAC, OIDC | Open source, maduro, suporta OIDC/OAuth2 | Via `keycloak-connect` | Via OIDC plugin | Apache 2.0 | Muito alta | Muito ativa | Baixo | Alta | Authelia, Ory | **NÃO RECOMENDAR** (overkill para local) |
| **JWT + RBAC próprio** | Auth | Autenticação e autorização | Simples, stateless, suficiente para local | Via `jsonwebtoken` + middleware | Via MCP context | MIT | Alta | Ativa | Baixo | Baixa | Keycloak | **RECOMENDAR** |
| **Ory Kratos** | Auth/Usuários | Identidade, senhas, recovery | Open source, focado em identidade | Via API | — | Apache 2.0 | Alta | Ativa | Baixo | Média | Authelia | **AVALIAR** se multi-usuário |

### Observabilidade (alternativas)

| Tecnologia | Categoria | Problema que resolve | Por que é adequada | Integração AgentMap | Integração Kilo | Licença | Maturidade | Manutenção | Custo | Complexidade | Alternativas | Recomendação |
|------------|-----------|----------------------|-------------------|---------------------|----------------|---------|------------|------------|-------|--------------|--------------|--------------|
| **Prometheus + Grafana** | Métricas/Dashboard | Falta de dashboards operacionais | Padrão de mercado, exporters fáceis | Via `prom-client` | Via OTLP exporter | Apache 2.0 / AGPL | Muito alta | Muito ativa | Baixo | Média | Tempo, Jaeger | **RECOMENDAR** |
| **Loki** | Logs | Falta de agregação de logs | Integra com Grafana, leve | Via `pino-loki` ou `winston-loki` | — | Apache 2.0 | Alta | Ativa | Baixo | Baixa | ELK, Splunk | **RECOMENDAR** |
| **Tempo** | Traces | Falta de armazenamento de traces | Integra com Grafana, simples | Via OTLP exporter | Suportado | AGPL | Alta | Ativa | Baixo | Baixa | Jaeger, Zipkin | **RECOMENDAR** |

---

## P. ARQUITETURA ALVO

```
┌─────────────────────────────────────────────────────────────────────┐
│                     KILO CODE (VS Code Extension)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │  Kilo A     │  │  Kilo B     │  │  Kilo C     │                │
│  │ (Principal) │  │ (Filho)     │  │ (Filho)     │                │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
│         │ MCP stdio      │ HTTP           │ HTTP                  │
└─────────┼────────────────┼────────────────┼────────────────────────┘
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AGENTMAP GATEWAY                               │
│                   (Node.js + Express + MCP)                        │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │   API REST   │  │ MCP Server  │  │  WebSocket  │               │
│  │  (auth +     │  │ (tools +    │  │  (monitor)  │               │
│  │   RBAC)      │  │  resources) │  │  + SSE)     │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│         │                 │                 │                      │
│         ▼                 ▼                 ▼                      │
│  ┌─────────────────────────────────────────────────────┐           │
│  │                   SERVICES LAYER                     │           │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────────────┐  │           │
│  │  │ Command  │ │  Query   │ │   Event Bus         │  │           │
│  │  │ Service  │ │ Service  │ │  (Redis Streams)    │  │           │
│  │  └──────────┘ └──────────┘ └─────────────────────┘  │           │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────────────┐  │           │
│  │  │  Task    │ │  Agent   │ │   Wake-Up           │  │           │
│  │  │ Service  │ │ Service  │ │   Dispatcher        │  │           │
│  │  └──────────┘ └──────────┘ └─────────────────────┘  │           │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────────────┐  │           │
│  │  │ Worktree │ │ Session  │ │   Audit +           │  │           │
│  │  │ Registry │ │ Service  │ │   Observability     │  │           │
│  │  └──────────┘ └──────────┘ └─────────────────────┘  │           │
│  └─────────────────────────────────────────────────────┘           │
│         │                 │                 │                      │
│         ▼                 ▼                 ▼                      │
│  ┌─────────────────────────────────────────────────────┐           │
│  │              PERSISTÊNCIA                             │           │
│  │  SQLite (ACID, FTS) + Redis (cache/streams) +       │           │
│  │  JSON files (compatibilidade)                        │           │
│  └─────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   FRONTEND SPA  │ │   .kilo/        │ │  Worktrees Git  │
│  + SSE + WS     │ │ Agent Manager   │ │  (isolamento)   │
│  + auto-refresh │ │ (extensão VS    │ │                 │
│                 │ │     Code)       │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Fluxo Bidirecional Ideal

```
KILO PRINCIPAL
      │
      │ 1. comando (MCP tool)
      ▼
AGENTMAP GATEWAY
      │
      │ 2. cria tarefa + evento
      ▼
EVENT BUS (Redis Streams)
      │
      │ 3. evento publicado
      ▼
WAKE-UP DISPATCHER
      │
      │ 4. prompt async (HTTP attach / MCP notification)
      ▼
KILO PRINCIPAL (idle → ativo)
      │
      │ 5. consulta contexto (MCP tool)
      ▼
AGENTMAP GATEWAY
      │
      │ 6. delega para Agent Manager
      ▼
AGENT MANAGER
      │
      │ 7. cria worktree + sessão
      ▼
AGENTE FILHO
      │
      │ 8. trabalha (vários minutos)
      │ 9. reporta progresso (HTTP/MCP)
      ▼
AGENTMAP GATEWAY
      │
      │ 10. evento TASK_COMPLETED
      ▼
EVENT BUS (Redis Streams)
      │
      │ 11. mensagem disponível
      ▼
WAKE-UP DISPATCHER
      │
      │ 12. injeta prompt em sessão Kilo idle
      ▼
KILO PRINCIPAL
      │
      │ 13. consulta mensagem (MCP tool)
      ▼
AGENTMAP GATEWAY
      │
      │ 14. processa resultado
      ▼
KILO PRINCIPAL
      │
      │ 15. decisão (novo comando, handoff, aprovação)
      ▼
NOVO CICLO
```

---

## Q. ROADMAP

### FASE 0 — Correções Críticas (1-2 semanas)

| ID | Ação | Evidência | Prioridade |
|----|------|-----------|------------|
| F0-1 | Implementar validação de `caminhoParental` em `criarProjeto` | `ProjetoService.ts:73-82` — gap de path traversal | P0 |
| F0-2 | Remover `z.unknown()` e `z.record()` de tools MCP | Tools aceitam payloads arbitrários | P0 |
| F0-3 | Adicionar `eventSequence` monotônico com lock | `MonitoramentoService.proximoSequence()` sem lock | P0 |
| F0-4 | Corrigir divergências TS vs JSON Schema | `Tarefa.datas`, `ProjetoConfig.ambiente` | P0 |
| F0-5 | Remover stack traces de logs de produção | `app.ts:80-85` | P0 |
| F0-6 | Adicionar `sanitizeInput` em todas as entradas MCP | `paths.ts:125-128` não usado consistentemente | P0 |

### FASE 1 — Fundação (2-4 semanas)

| ID | Ação | Evidência | Prioridade |
|----|------|-----------|------------|
| F1-1 | Implementar autenticação JWT + RBAC | Nenhum auth existe | P0 |
| F1-2 | Enforcement de permissões de agente nas tools MCP | `validateAgentDirectoryAccess` não chamado | P0 |
| F1-3 | Adicionar CSRF protection (SameSite tokens + Origin validation) | Sem CSRF | P1 |
| F1-4 | Alinhar schemas JSON com tipos TypeScript | Divergências documentadas | P1 |
| F1-5 | Implementar auto-refresh no dashboard principal | Sem auto-refresh | P1 |
| F1-6 | Adicionar heartbeat WebSocket + ping/pong | Sem heartbeat | P1 |

### FASE 2 — Comunicação Assíncrona (4-6 semanas)

| ID | Ação | Evidência | Prioridade |
|----|------|-----------|------------|
| F2-1 | Implementar EventBus persistente (Redis Streams ou arquivo append-only) | EventBus em memória sem persistência | P1 |
| F2-2 | Adicionar retry + DLQ para eventos | Sem retry/DLQ | P1 |
| F2-3 | Implementar SSE para notificações HTTP | Não implementado | P2 |
| F2-4 | Adicionar cursor `eventSequence` server-side em `GET /api/monitoramento/mensagens` | Filtragem client-side no watcher | P1 |

### FASE 3 — Wake-Up (3-5 semanas)

| ID | Ação | Evidência | Prioridade |
|----|------|-----------|------------|
| F3-1 | Resolver Gate -1: injeção de prompt em sessão Kilo idle | Nenhum mecanismo oficial | P0 |
| F3-2 | Implementar auto-subscribe no prompt de workflow | Prompts não orientam subscribe | P1 |
| F3-3 | Integrar `watcher-wakeup.js` ao backend via MCP/HTTP | Esqueleto não integrado | P0 |
| F3-4 | Implementar Wake-Up Dispatcher no backend | Nenhum dispatcher | P0 |

### FASE 4 — Observabilidade (2-3 semanas)

| ID | Ação | Evidência | Prioridade |
|----|------|-----------|------------|
| F4-1 | Expandir OpenTelemetry: métricas custom, spans de tarefa | Apenas traces básicos | P2 |
| F4-2 | Implementar Prometheus + Grafana dashboards | Sem dashboards operacionais | P2 |
| F4-3 | Adicionar Loki para agregação de logs | Logs apenas no console | P2 |
| F4-4 | Implementar rotação/compactação de auditoria | Sem rotação | P1 |

### FASE 5 — Segurança (contínua)

| ID | Ação | Evidência | Prioridade |
|----|------|-----------|------------|
| F5-1 | Implementar RBAC completo por agente/projeto | Permissões não enforcementadas | P0 |
| F5-2 | Adicionar rate limiting (se exposto para rede) | Removido recentemente (local-only) | P3 |
| F5-3 | Implementar secrets management (vault ou env encryption) | Sem gerenciamento de secrets | P2 |
| F5-4 | Adicionar audit log de ações administrativas | Auditoria básica existe | P2 |

### FASE 6 — Autonomia (4-6 semanas)

| ID | Ação | Evidência | Prioridade |
|----|------|-----------|------------|
| F6-1 | Implementar modos de operação (AUTÔNOMO/ASSISTIDO/MANUAL) | Sem modos | P2 |
| F6-2 | Implementar auto-aprovação de tarefas simples | Tudo manual | P2 |
| F6-3 | Implementar retry automático de tarefas falhas | Sem retry | P2 |
| F6-4 | Implementar detecção de agente travado + reatribuição | Sem watchdog avançado | P2 |

### FASE 7 — Escalabilidade (contínua)

| ID | Ação | Evidência | Prioridade |
|----|------|-----------|------------|
| F7-1 | Migrar persistência para SQLite (ACID + FTS) | JSON files sem transações | P3 |
| F7-2 | Implementar multi-projeto com namespaces | Estado global compartilhado | P3 |
| F7-3 | Adicionar cache Redis para sessões e métricas | Sem cache | P3 |
| F7-4 | Implementar sharding de arquivos `.ia/` por projeto | Um diretório por projeto | P3 |

### FASE 8 — Evolução (contínua)

| ID | Ação | Evidência | Prioridade |
|----|------|-----------|------------|
| F8-1 | Adicionar GraphQL API opcional | Apenas REST | P3 |
| F8-2 | Implementar plugin system | Sem hooks customizáveis | P3 |
| F8-3 | Adicionar AI-powered triage de tarefas | Classificação manual | P3 |
| F8-4 | Implementar CI/CD pipeline | Scripts manuais | P3 |

---

## CONCLUSÃO

### O que o AgentMap é hoje

O AgentMap é um **gerenciador local de agentes de IA funcional** com backend Express + MCP Server + frontend SPA. Ele gerencia projetos, agentes, tarefas, contratos, handoffs, bloqueios e eventos através de arquivos JSON. A integração com Kilo Code/Agent Manager existe e é **híbrida MCP + HTTP**. O sistema possui **527 testes aprovados**, path traversal protection, observabilidade OpenTelemetry e documentação extensa.

### O que ele já consegue fazer

- Criar/abrir/fechar projetos com scaffold automático de `.ia/`
- Gerenciar agentes com perfis, papéis, permissões (não enforcementadas)
- CRUD completo de tarefas, contratos, handoffs, bloqueios, solicitações
- Monitoramento via WebSocket (chat, status, worktrees)
- Integração MCP com 39+ tools
- Integração HTTP com Kilo (filho → pai)
- Descoberta e reconciliação de sessões Kilo
- Backups, limpeza de temporários, auditoria
- Observabilidade com traces OTel

### Onde ele é forte

- Código real, testado, documentado.
- Path traversal protection sólida.
- MCP implementado com validação Zod e subscriptions.
- Integração Kilo funcional (leitura/escrita).
- Arquitetura de serviços bem separada.

### Onde está fraco

- **Sem autenticação/autorização** (CRÍTICO).
- **Sem wake-up automático** do Kilo principal (ALTO).
- Permissões de agente não enforcementadas (ALTO).
- EventBus em memória sem persistência (MÉDIO).
- Concorrência sem locks/transações (MÉDIO).
- Frontend sem auto-refresh (MÉDIO).

### Principal gargalo arquitetural

O AgentMap é **reativo por polling**, não **event-driven**. O Kilo principal fica idle porque não há um **Wake-Up Dispatcher integrado** que injete prompts automaticamente quando eventos relevantes ocorrem. O sistema possui todos os blocos (`eventSequence`, `EventBus`, MCP subscriptions, watcher esqueleto), mas falta a **cola** que conecta eventos a ações proativas no Kilo.

### Arquitetura mais adequada para evolução

1. **Fase 0:** Corrigir gaps críticos de segurança e consistência.
2. **Fase 1:** Implementar auth + RBAC + enforcement de permissões.
3. **Fase 2:** Substituir EventBus em memória por Redis Streams ou arquivo append-only com retry/DLQ.
4. **Fase 3:** Resolver Gate -1 e implementar Wake-Up Dispatcher + auto-subscribe.
5. **Fase 4:** Expandir observabilidade (Prometheus + Grafana + Loki).
6. **Fase 5:** Adicionar modos de operação (AUTÔNOMO/ASSISTIDO/MANUAL).
7. **Fase 6-8:** Escalabilidade (SQLite/PostgreSQL, multi-projeto, plugins).

**Princípio orientador:** não substituir soluções existentes sem demonstrar benefício. Priorizar simplicidade, confiabilidade, observabilidade, segurança, idempotência, extensibilidade e manutenibilidade.