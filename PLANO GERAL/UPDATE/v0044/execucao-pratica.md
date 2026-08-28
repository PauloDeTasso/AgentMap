# Execução Prática — AgentMap como Template/Base por Projeto

> **Versão:** 2.0.0  
> **Data:** 2026-08-28  
> **Branch:** v0044  
> **Status:** Pronto para execução  
> **Base:** `PLANO GERAL/UPDATE/v0044/3.md` + `2.md` + `1.md`

---

## 0. Princípio Fundamental (NÃO NEGOCIÁVEL)

> **Tudo que o Kilo Code precisa para operar o AgentMap deve estar presente e funcional imediatamente após a cópia. Tudo que o AgentMap precisa para evoluir deve estar dentro do `.ia/`.**

Isso significa:
- **SEM** `npm install` manual
- **SEM** `npm run build` manual
- **SEM** `agentmap init` para funcionar a primeira vez
- **SEM** geradores complexos na primeira experiência

O AgentMap é distribuído **pronto para usar**. A pasta `.ia/runtime/mcp/dist/` já contém o MCP buildado. A pasta `.kilo/` já contém os agentes, regras e comandos. O `kilo.jsonc` já aponta para o MCP local.

---

## 1. Estrutura Final do AgentMap

```
MEU_PROJETO/
├── AGENTS.md                       ← Entry point (Kilo carrega automaticamente)
├── kilo.jsonc                      ← Config Kilo + MCP (Kilo carrega automaticamente)
├── .kilo/
│   ├── agents/
│   │   └── agentmap/               ← Agentes do AgentMap (Kilo carrega automaticamente)
│   │       ├── orchestrator.md
│   │       ├── architect.md
│   │       ├── backend.md
│   │       ├── frontend.md
│   │       ├── qa.md
│   │       ├── security.md
│   │       └── documentation.md
│   ├── rules/
│   │   └── agentmap/               ← Regras do AgentMap
│   │       ├── operating-rules.md
│   │       ├── security-rules.md
│   │       ├── communication-rules.md
│   │       └── quality-rules.md
│   └── commands/
│       └── agentmap/               ← Comandos slash do AgentMap
│           ├── status.md
│           ├── handoff.md
│           └── audit.md
├── .ia/                            ← CORE do AgentMap (fonte de verdade)
│   ├── agentmap.json               ← Config do AgentMap (versionamento, ownership)
│   ├── core/
│   │   ├── contracts/              ← Contratos JSON
│   │   ├── schemas/                ← JSON Schemas
│   │   ├── protocols/              ← Protocolos de comunicação
│   │   └── lifecycle/              ← Ciclo de vida de agentes/tarefas
│   ├── agents/
│   │   ├── definitions/            ← Definições canônicas (fonte de verdade)
│   │   ├── capabilities/           ← Capacidades por agente
│   │   └── registry/               ← Registro de agentes
│   ├── tasks/                      ← Tarefas
│   ├── handoffs/                   ← Handoffs
│   ├── decisions/                  ← Decisões
│   ├── results/                    ← Resultados
│   ├── artifacts/                  ← Artefatos
│   ├── state/                      ← Estado do projeto
│   ├── knowledge/                  ← Conhecimento
│   ├── checkpoints/                ← Checkpoints
│   ├── risks/                      ← Riscos
│   ├── blockers/                   ← Bloqueios
│   ├── dependencies/               ← Dependências
│   ├── audit/                      ← Auditoria
│   ├── policies/                   ← Políticas
│   ├── procedures/                 ← Procedimentos
│   ├── runtime/
│   │   └── mcp/
│   │       └── dist/
│   │           └── main.js         ← MCP server buildado (pronto para executar)
│   └── docs/                       ← Documentação do AgentMap
│       ├── architecture/
│       ├── guides/
│       ├── protocols/
│       └── reference/
├── backend/                        ← Backend do projeto (opcional)
│   ├── src/
│   │   ├── api/
│   │   ├── mcp-server/
│   │   ├── servicios/
│   │   ├── tipos/
│   │   └── main.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/                       ← Frontend do projeto (opcional)
└── docs/                           ← Documentação do projeto (opcional)
```

---

## 2. Camadas de Responsabilidade

| Camada | Arquivo/Pasta | Responsável | Quando atualizar |
|--------|---------------|-------------|------------------|
| **Entry Point** | `AGENTS.md` | AgentMap | `agentmap update` |
| **Runtime Config** | `kilo.jsonc` | AgentMap + usuário | `agentmap update` (merge) |
| **Kilo Adapter** | `.kilo/` | AgentMap | `agentmap update` |
| **Core** | `.ia/` | AgentMap | `agentmap update` |
| **Projeto** | `backend/`, `frontend/`, `docs/` | Usuário | Nunca (AgentMap não toca) |

---

## 3. Arquitetura de Código

### 3.1 Backend Simplificado (single-project)

```typescript
// backend/src/main.ts
import { createServices } from './modules';
import { createApiRouter } from './api';
import { createMcpRouter } from './mcp-server';

const services = createServices(); // singleton, criado uma vez
const apiRouter = createApiRouter(services);
const mcpRouter = createMcpRouter(services);

app.use('/api', apiRouter);
app.use('/mcp', mcpRouter);

app.listen(3150, () => console.log('AgentMap rodando em http://localhost:3150'));
```

**Sem:**
- `projectMiddleware`
- `ProjetoService` como façade
- `GERENCIADOR_DIR`
- `cachedSettings` global mutável

### 3.2 Módulos por Domínio

```
backend/src/modules/
├── projeto/         ← ProjetoService, ProjetoRepository
├── tarefa/          ← TarefaService, TarefaRepository
├── agente/          ← AgenteService, AgenteRepository
├── handoff/         ← HandoffService, HandoffRepository
├── monitoramento/   ← MonitoramentoService
├── evento/          ← EventoService
├── risco/           ← RiscoService
├── bloqueio/        ← BloqueioService
├── pendencia/       ← PendenciaService
├── reserva/         ← ReservaService
├── decisao/         ← DecisaoService
├── dependencia/     ← DependenciaService
├── validacao/       ← ValidacaoService
├── conflito/        ← ConflitoService
├── auditoria/       ← AuditoriaService
├── solicitacao/     ← SolicitacaoService
├── criterio/        ← CriterioService
├── resultado/       ← ResultadoService
├── artefato/        ← ArtefatoService
├── conhecimento/    ← ConhecimentoService
├── estado/          ← EstadoService
└── integracao/      ← GeradorIntegracao (kilo.jsonc, .kilo/, AGENTS.md)
```

### 3.3 Repository Pattern

```typescript
// Exemplo: modules/tarefa/TarefaRepository.ts
export interface TarefaRepository {
  obter(id: string): Promise<ResultadoOperacao<Tarefa>>;
  listar(): Promise<ResultadoOperacao<Tarefa[]>>;
  criar(dados: CriarTarefaDTO): Promise<ResultadoOperacao<Tarefa>>;
  atualizar(id: string, dados: AtualizarTarefaDTO): Promise<ResultadoOperacao<Tarefa>>;
  excluir(id: string): Promise<ResultadoOperacao<void>>;
}

// Implementação filesystem
export class TarefaRepositoryFilesystem implements TarefaRepository {
  constructor(private projetoPath: string) {}
  
  async obter(id: string): Promise<ResultadoOperacao<Tarefa>> {
    // lê de .ia/tarefas/tarefas.json
  }
}
```

---

## 4. Fases de Implementação

### Fase 0: Spike de Validação (4-8h)

**Objetivo:** Provir que a arquitetura funciona na prática.

**Entregável:** Projeto de teste onde:
1. Cópia das pastas `.ia/`, `.kilo/`, `AGENTS.md`, `kilo.jsonc` para um projeto novo
2. Kilo Code reconhece os agentes automaticamente
3. MCP tools funcionam
4. Handoff/task funcionam

**Critérios de sucesso:**
- [ ] `AGENTS.md` é carregado pelo Kilo
- [ ] Agentes em `.kilo/agents/agentmap/` são listados
- [ ] MCP server é iniciado via `kilo.jsonc`
- [ ] Pelo menos 1 tool MCP funciona
- [ ] 1 handoff é criado e consumido

### Fase 1: Core Simplificado (40h)

**Objetivo:** Reestruturar backend para single-project.

**Tarefas:**
1. Reorganizar pastas para `modules/`
2. Implementar Repository pattern
3. Remover `projectMiddleware` complexo
4. Simplificar `ProjetoService`
5. Criar `agentmap.json` (config local)
6. Bootstrap singleton

**Entregável:** Backend servindo um projeto, sem multi-tenancy.

### Fase 2: Kilo Integration (66h)

**Objetivo:** Implementar geradores e adaptadores.

**Tarefas:**
1. Estruturar `.ia/` como fonte de verdade
2. Gerador `.kilo/agent/*.md` a partir de `.ia/agentes/*.json`
3. Gerador `kilo.jsonc` com merge JSONC-safe
4. Detecção de formato MCP legado vs atual
5. Bootstrap automático (`npm install && npm run build` dentro de `.ia/runtime/mcp/`)
6. Gerador `AGENTS.md` com seção protegida

**Entregável:** `agentmap init` e `agentmap update` funcionando.

### Fase 3: Testes e CI/CD (60h)

**Objetivo:** Aumentar cobertura e automatizar.

**Tarefas:**
1. Testes unitários (32h)
2. Testes de integração (16h)
3. CI/CD GitHub Actions (8h)
4. Quality gates (4h)

**Entregável:** Cobertura ≥70%, CI/CD funcionando.

### Fase 4: Documentação e Release (52h)

**Objetivo:** Documentar e lançar beta.

**Tarefas:**
1. Testes E2E (16h)
2. Documentação completa (20h)
3. Performance tuning (8h)
4. v0.9.0 Beta release (8h)

**Entregável:** v0.9.0 Beta.

---

## 5. Backlog Execução Imediata

### Fase 0 — Esta semana

| Dia | Ação | Responsável |
|-----|------|-------------|
| 1 | Criar projeto de teste e validar spike | Arquiteto |
| 2 | Corrigir Risk/Decisions Zod | Arquiteto |
| 3 | Configurar ESLint + Prettier | Engenheiro |
| 4 | Externalizar secrets para `.env` | Engenheiro |
| 5 | Implementar logging estruturado | Engenheiro |

### Fase 1 — Próximas 2 semanas

| Ação | Responsável | Esforço |
|------|-------------|---------|
| Reorganizar pastas para `modules/` | Arquiteto | 16h |
| Remover `projectMiddleware` | Engenheiro | 8h |
| Simplificar `ProjetoService` | Engenheiro | 8h |
| Repository pattern | Engenheiro | 8h |

---

## 6. Arquivos de Saída do AgentMap

### 6.1 Arquivos Gerenciados pelo AgentMap

| Arquivo | Origem | Propósito |
|---------|--------|-----------|
| `AGENTS.md` | Gerado de `.ia/docs/` | Entry point para Kilo |
| `kilo.jsonc` | Gerado de `.ia/agentmap.json` | Config Kilo + MCP |
| `.kilo/agents/agentmap/*.md` | Gerado de `.ia/agentes/*.json` | Subagentes customizados |
| `.kilo/rules/agentmap/*.md` | Copiado de `.ia/policies/` | Regras do AgentMap |
| `.kilo/commands/agentmap/*.md` | Copiado de `.ia/procedures/` | Comandos slash |

### 6.2 Arquivos Protegidos (não sobrescritos)

| Arquivo | Propósito |
|---------|-----------|
| `src/**` | Código do projeto |
| `backend/**` | Backend do projeto |
| `frontend/**` | Frontend do projeto |
| `docs/**` | Documentação do projeto |
| `package.json` | Dependencies do projeto |

### 6.3 Ownership em `.ia/agentmap.json`

```json
{
  "agentMap": {
    "name": "AgentMap",
    "version": "2.0.0",
    "schemaVersion": "1.0"
  },
  "ownership": {
    "managed": [
      "AGENTS.md",
      "kilo.jsonc",
      ".kilo/agents/agentmap-*",
      ".kilo/rules/agentmap-*",
      ".kilo/commands/agentmap-*",
      ".ia/**"
    ],
    "protected": [
      "src/**",
      "backend/**",
      "frontend/**",
      "docs/**",
      "package.json"
    ]
  }
}
```

---

## 7. Comandos CLI

```bash
# Inicializar AgentMap em projeto existente
agentmap init [--force]

# Atualizar AgentMap (merge, não overwrite)
agentmap update [--dry-run]

# Verificar status de sincronização
agentmap status

# Validar integridade
agentmap doctor

# Reparar problemas
agentmap repair
```

---

## 8. Critérios de Sucesso

### Teste A — Instalação
```
copiar AgentMap → abrir projeto → Kilo reconhece
```

### Teste B — Agentes
```
Kilo → encontra agentes → identifica funções → delega corretamente
```

### Teste C — MCP
```
Kilo → encontra AgentMap MCP → lista tools → executa tool
```

### Teste D — Comunicação
```
Agente A → cria tarefa → handoff → Agente B → executa → resultado
```

### Teste E — Atualização
```
AgentMap 2.0 → copiar sobre projeto → código permanece → configs preservadas
```

### Teste F — Isolamento
```
Projeto A ≠ Projeto B (nenhum compartilha estado)
```

### Teste G — Recuperação
```
agente morreu → estado permanece → outro agente continua
```

---

## 9. Próximos Passos

1. ✅ Documentos de referência lidos
2. 🔄 **Implementar Fase 0 (spike)** — validar arquitetura
3. ⏳ Implementar Fase 1 (core simplificado)
4. ⏳ Implementar Fase 2 (Kilo integration)
5. ⏳ Implementar Fase 3 (testes + CI/CD)
6. ⏳ Implementar Fase 4 (documentação + release)

---

*Documento de execução prática baseado nas revisões v1.0.1, v1.1.0 e v1.2*  
*Branch: v0044 | Data: 2026-08-28*
