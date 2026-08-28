# Guia de Desenvolvimento

> **Versão:** 2.0.0  
> **Data:** 2026-08-28  
> **Branch:** v0044

---

## 1. Pré-requisitos

| Ferramenta | Versão | Uso |
|------------|--------|-----|
| **Node.js** | 18+ | Runtime |
| **npm** | 8+ | Gerenciador de pacotes |
| **Git** | 2+ | Controle de versão |
| **VS Code** | 1.115+ | IDE (recomendado) |
| **TypeScript** | 5+ | Linguagem |

---

## 2. Estrutura do Projeto

### 2.1 Backend

```
backend/
├── src/
│   ├── config/              ← Configurações centralizadas
│   │   ├── index.ts
│   │   └── env.ts
│   ├── modules/             ← Módulos por domínio
│   │   ├── projeto/         ← ProjetoService, ProjetoRepository
│   │   ├── tarefa/          ← TarefaService, TarefaRepository
│   │   ├── agente/          ← AgenteService, AgenteRepository
│   │   ├── handoff/         ← HandoffService, HandoffRepository
│   │   ├── monitoramento/   ← MonitoramentoService
│   │   ├── evento/          ← EventoService
│   │   ├── risco/           ← RiscoService
│   │   ├── bloqueio/        ← BloqueioService
│   │   ├── pendencia/       ← PendenciaService
│   │   ├── reserva/         ← ReservaService
│   │   ├── decisao/         ← DecisaoService
│   │   ├── dependencia/     ← DependenciaService
│   │   ├── validacao/       ← ValidacaoService
│   │   ├── conflito/        ← ConflitoService
│   │   ├── auditoria/       ← AuditoriaService
│   │   ├── solicitacao/     ← SolicitacaoService
│   │   ├── criterio/        ← CriterioService
│   │   ├── resultado/       ← ResultadoService
│   │   ├── artefato/        ← ArtefatoService
│   │   ├── conhecimento/    ← ConhecimentoService
│   │   ├── estado/          ← EstadoService
│   │   └── integracao/      ← GeradorIntegracao
│   ├── shared/              ← Código compartilhado
│   │   ├── errors/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── types/
│   ├── infrastructure/      ← Implementações concretas
│   │   ├── filesystem/
│   │   ├── json/
│   │   └── mcp/
│   ├── observability/       ← OpenTelemetry
│   │   ├── agent-tracing.ts
│   │   ├── attributes.ts
│   │   ├── gen-ai.ts
│   │   ├── http-tracing.ts
│   │   ├── metrics-store.ts
│   │   ├── metrics.ts
│   │   ├── sanitization.ts
│   │   ├── tool-tracing.ts
│   │   └── tracing.ts
│   ├── quality/             ← Quality Gates
│   │   ├── TypecheckGate.ts
│   │   ├── LintGate.ts
│   │   ├── TestGate.ts
│   │   ├── CoverageGate.ts
│   │   └── run-gates.ts
│   ├── seguranca/           ← Segurança
│   │   └── paths.ts
│   ├── cli/                 ← Comandos CLI
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── commands/
│   │   │   ├── init.ts
│   │   │   ├── update.ts
│   │   │   ├── status.ts
│   │   │   ├── doctor.ts
│   │   │   └── repair.ts
│   │   └── utils/
│   │       ├── jsonc.ts
│   │       └── project.ts
│   ├── generators/          ← Geradores de código
│   │   ├── KiloJsoncGenerator.ts
│   │   ├── AgentsMdGenerator.ts
│   │   ├── AgentsRootGenerator.ts
│   │   ├── RulesGenerator.ts
│   │   └── CommandsGenerator.ts
│   ├── bootstrap/           ← Bootstrap MCP
│   │   └── McpBootstrap.ts
│   ├── mcp-server/          ← Servidor MCP
│   │   ├── index.ts
│   │   ├── server.ts
│   │   ├── contexto.ts
│   │   ├── audit/
│   │   ├── erros/
│   │   ├── events/
│   │   ├── mapper/
│   │   ├── prompts/
│   │   ├── resources/
│   │   ├── schemas/
│   │   ├── security/
│   │   ├── subscriptions/
│   │   ├── tools/
│   │   └── utils/
│   ├── servicios/           ← Lógica de negócio
│   │   ├── index.ts
│   │   ├── ProjetoService.ts
│   │   ├── TarefaService.ts
│   │   ├── AgenteService.ts
│   │   ├── HandoffService.ts
│   │   ├── MonitoramentoService.ts
│   │   └── ...
│   ├── templates/           ← Templates de prompts
│   │   └── prompts/
│   ├── tipos/               ← TypeScript types
│   │   └── index.ts
│   ├── validacao/           ← Schemas Zod + JSON
│   │   └── SchemaValidator.ts
│   ├── api/                 ← Rotas HTTP
│   │   ├── index.ts
│   │   ├── projetos.ts
│   │   ├── tarefas.ts
│   │   ├── agentes.ts
│   │   ├── monitoramento.ts
│   │   └── ...
│   ├── websocket/           ← WebSocket
│   │   └── monitoramento.ts
│   ├── arquivos/            ← Gerenciamento de arquivos
│   │   ├── FileService.ts
│   │   ├── IdGenerator.ts
│   │   ├── ScaffoldService.ts
│   │   └── templates/
│   ├── app.ts               ← Aplicação Express
│   └── main.ts              ← Bootstrap
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── package.json
├── tsconfig.json
└── jest.config.js
```

### 2.2 Frontend

```
frontend/
├── index.html
├── css/
│   └── style.css
└── js/
    ├── app.js
    ├── api.js
    └── components/
```

---

## 3. Padrões de Código

### 3.1 Services

Cada domínio tem seu próprio service:

```typescript
// backend/src/modules/tarefa/TarefaService.ts
export class TarefaService {
  constructor(private repo: TarefaRepository) {}
  
  async criar(dados: CriarTarefaDTO): Promise<ResultadoOperacao<Tarefa>> {
    // validação
    // persistência
    // eventos
  }
}
```

### 3.2 Repositories

```typescript
// backend/src/modules/tarefa/TarefaRepository.ts
export interface TarefaRepository {
  obter(id: string): Promise<ResultadoOperacao<Tarefa>>;
  listar(): Promise<ResultadoOperacao<Tarefa[]>>;
  criar(dados: CriarTarefaDTO): Promise<ResultadoOperacao<Tarefa>>;
  atualizar(id: string, dados: AtualizarTarefaDTO): Promise<ResultadoOperacao<Tarefa>>;
  excluir(id: string): Promise<ResultadoOperacao<void>>;
}
```

### 3.3 Resultado Operacional

```typescript
// shared/types/ResultadoOperacional.ts
export interface ResultadoOperacao<T> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
}
```

---

## 4. Convenções

### 4.1 Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| **Arquivos** | kebab-case | `tarefa-service.ts` |
| **Classes** | PascalCase | `TarefaService` |
| **Interfaces** | PascalCase + `I` | `ITarefaRepository` |
| **Funções** | camelCase | `criarTarefa()` |
| **Constantes** | UPPER_SNAKE_CASE | `MAX_TENTATIVAS` |
| **Tipos** | PascalCase | `TarefaDTO` |

### 4.2 Commits

Siga [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona filtro de tarefas por agente
fix: corrige validação de dependências circulares
docs: atualiza guia de instalação
refactor: simplifica ProjetoService
test: adiciona testes de integração para handoffs
chore: atualiza dependências
```

---

## 5. Scripts Disponíveis

```bash
# Desenvolvimento (backend + frontend)
npm run dev

# Build
npm run build

# Testes
npm test

# Testes com coverage
npm run test:coverage

# Lint
npm run lint

# Typecheck
npm run typecheck

# Quality gates (tudo)
npm run quality

# CI local (quality + build)
npm run ci

# MCP Server
npm run mcp
```

---

## 6. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do backend:

```env
# Backend
PORT=3150
NODE_ENV=development

# OpenTelemetry
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=

# AgentMap
AGENTMAP_API_URL=http://localhost:3150
```

---

## 7. Worktree por Agente

Para desenvolvimento paralelo, use worktrees isolados:

```bash
# Criar worktree para agente backend
git worktree add .kilo/worktrees/backend -b feature/backend

# Criar worktree para agente frontend
git worktree add .kilo/worktrees/frontend -b feature/frontend
```

Cada worktree tem seu próprio diretório `.ia/` isolado.

---

## 8. Debug

### 8.1 VS Code

Configure `launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "preLaunchTask": "npm: build",
      "program": "${workspaceFolder}/backend/src/main.ts"
    }
  ]
}
```

### 8.2 Logs

O AgentMap usa logging estruturado. Verifique:
- Console do terminal (desenvolvimento)
- Arquivos de log (produção)

---

## 9. Testes

### 9.1 Estrutura

```
tests/
├── unit/
│   ├── modules/
│   │   ├── tarefa/
│   │   │   └── TarefaService.test.ts
│   │   └── agente/
│   │       └── AgenteService.test.ts
│   └── shared/
│       └── utils.test.ts
├── integration/
│   ├── api/
│   │   ├── tarefas.test.ts
│   │   └── handoffs.test.ts
│   └── mcp/
│       └── tools.test.ts
└── fixtures/
    ├── projetos/
    ├── tarefas/
    └── agentes/
```

### 9.2 Convenções

- **Unitários:** testam services e repositories isoladamente
- **Integração:** testam rotas HTTP e tools MCP
- **Fixtures:** dados de teste reutilizáveis

---

## 10. Contribuindo

Consulte [`docs/contributing.md`](contributing.md) para detalhes.

---

## 11. Referências

- [`docs/architecture.md`](architecture.md)
- [`docs/testing.md`](testing.md)
- [`docs/quality-gates.md`](quality-gates.md)
- [`docs/cli.md`](cli.md)
