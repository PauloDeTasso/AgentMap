# Arquitetura do AgentMap

> **Versão:** 2.0.0  
> **Data:** 2026-08-28  
> **Branch:** v0044  
> **Status:** Arquitetura alvo (single-project)

---

## 1. Princípio Fundamental

O AgentMap é um **template/base adicionado à raiz de cada projeto**, não um gerenciador multi-tenant centralizado.

```
MEU_PROJETO/
├── .ia/                    ← AgentMap (template/base)
│   ├── agentmap.json       ← config local
│   ├── fluxo-trabalho.md
│   ├── contratos/
│   ├── tarefas/
│   ├── agentes/
│   └── ...
├── backend/                ← Servidor do projeto (opcional)
├── frontend/               ← UI do projeto (opcional)
└── docs/                   ← Documentação do projeto (opcional)
```

**Consequências:**
- Backend serve **UM projeto apenas**
- Sem `projectMiddleware` complexo
- Sem `ProjetoService` como façade global
- Sem `GERENCIADOR_DIR` e multi-tenancy
- Atualizar o template = atualizar todos os projetos

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

## 3. Backend Simplificado (Single-Project)

### 3.1 Bootstrap Singleton

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

## 4. Estrutura de Pastas (Nova)

```
backend/
├── src/
│   ├── config/              ← Configurações centralizadas
│   │   ├── index.ts
│   │   └── env.ts           ← Variáveis de ambiente
│   ├── modules/             ← Módulos por domínio
│   │   ├── projeto/
│   │   ├── tarefa/
│   │   ├── agente/
│   │   ├── handoff/
│   │   ├── monitoramento/
│   │   └── ...
│   ├── shared/              ← Código compartilhado
│   │   ├── errors/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── types/
│   ├── infrastructure/      ← Implementações concretas
│   │   ├── filesystem/
│   │   ├── json/
│   │   └── mcp/
│   └── main.ts              ← Bootstrap
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── package.json
```

---

## 5. Comparação: Antes vs Depois

| Item | Antes (Multi-tenant) | Depois (Single-project) |
|------|----------------------|-------------------------|
| **Backend** | Multi-tenant com projeto aberto/fechado | Single-project, serviços singleton |
| **Middleware** | `projectMiddleware` complexo | Simplificado ou removido |
| **Serviços** | `ProjetoService` como façade global (~500 linhas) | Services por domínio (~50 linhas cada) |
| **Projetos** | Gerenciados via API central | Cada projeto é uma instância |
| **Configuração** | `GERENCIADOR_DIR`, `cachedSettings` | `agentmap.json` local |
| **Criação de projeto** | Via API + validação | Via template/copier |
| **Atualizações** | Manuais em múltiplos lugares | Template centralizado |

---

## 6. Benefícios Quantificados

| Métrica | Antes | Depois | Ganho |
|---------|-------|--------|-------|
| **Esforço total** | 440h (55 dias) | 200h (25 dias) | **-55%** |
| **Complexidade backend** | Alta (multi-tenant) | Baixa (single-project) | **-70%** |
| **Linhas de código** | ~13k | Estimado ~8k | **-38%** |
| **Serviços por request** | ~30 | ~10 | **-67%** |
| **Rotas protegidas por middleware** | ~30 | ~10 | **-67%** |

---

## 7. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Templates desatualizados | Média | Médio | `agentmap update` + CI |
| Múltiplas instâncias em produção | Baixa | Médio | Reverse proxy |
| Curva de aprendizado | Média | Baixo | Documentação + onboarding |

---

## 8. Integração com Kilo Code

### 8.1 Estrutura de Geração

O AgentMap gera automaticamente os arquivos que o Kilo Code precisa:

| Arquivo Gerado | Origem | Propósito |
|----------------|--------|-----------|
| `AGENTS.md` | `.ia/docs/` | Entry point para Kilo |
| `kilo.jsonc` | `.ia/agentmap.json` | Config Kilo + MCP |
| `.kilo/agents/agentmap/*.md` | `.ia/agentes/*.json` | Subagentes customizados |
| `.kilo/rules/agentmap/*.md` | `.ia/policies/` | Regras do AgentMap |
| `.kilo/commands/agentmap/*.md` | `.ia/procedimentos/` | Comandos slash |

### 8.2 Arquivos Protegidos

Os seguintes arquivos **não são sobrescritos** pelo `agentmap update`:

- `src/**`
- `backend/**`
- `frontend/**`
- `docs/**`
- `package.json`

---

## 9. Referências

- [`PLANO GERAL/UPDATE/v0044/execucao-pratica.md`](../PLANO%20GERAL/UPDATE/v0044/execucao-pratica.md)
- [`.ia/qualidade/plano-final-revisado.md`](../.ia/qualidade/plano-final-revisado.md)
- [`.ia/qualidade/spike-resultado.md`](../.ia/qualidade/spike-resultado.md)
