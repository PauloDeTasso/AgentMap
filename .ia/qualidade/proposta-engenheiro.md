# Proposta de Engenharia — AgentMap

> **Versão:** 1.0.0  
> **Data:** 2026-08-27  
> **Autor:** Engenheiro de Software (AgentMap)  
> **Status:** Proposta para aprovação  
> **Branch:** v0044  

---

## 1. Diagnóstico de Engenharia Atual

### 1.1 Pontos Fortes

| Aspecto | Avaliação | Detalhamento |
|---------|-----------|--------------|
| **TypeScript strict** | ✅ | `strict: true` no tsconfig, tipagem forte em toda a base |
| **Validação dupla** | ✅ | Zod (runtime) + Ajv/JSON Schema (estrutural) |
| **Segurança de paths** | ✅ | `resolveProjectPath` com proteção contra traversal + symlinks |
| **Observabilidade** | ✅ | OpenTelemetry com tracing de HTTP, tools e métricas |
| **Organização MCP** | ✅ | ~170 tools registradas, agrupadas por domínio |
| **Estrutura .ia/** | ✅ | Governança baseada em arquivos, bem definida |
| **API RESTful** | ✅ | Rotas consistentes, separadas por domínio |
| **Multiplataforma** | ✅ | Suporte Windows/Linux/macOS (path.win32 normalizado) |

### 1.2 Dívidas Técnicas Identificadas

| ID | Dívida | Severidade | Impacto |
|----|--------|------------|---------|
| DIV-01 | Frontend acoplado ao backend | Alta | Impossibilita deploy independente, CDN, SSR |
| DIV-02 | Apenas 2 testes de integração | Alta | Cobertura insuficiente para 40+ rotas |
| DIV-03 | Sem CI/CD automatizado | Alta | Nenhuma garantia de qualidade em PRs |
| DIV-04 | Sem containerização | Média | Deploy inconsistente entre ambientes |
| DIV-05 | `tslint` descontinuado (v6.1.3) | Média | Ferramenta sem manutenção, sem suporte a TS moderno |
| DIV-06 | Logging via `console.*` | Média | Impossibilita agregação, filtros e análise |
| DIV-07 | Sem rate limiting | Média | Vulnerabilidade a DoS em endpoints públicos |
| DIV-08 | Secrets em código/config | Média | Credenciais PostgreSQL hardcoded em config |
| DIV-09 | Sem cache strategy | Baixa | Leitura repetitiva de arquivos JSON |
| DIV-10 | Erro handling genérico | Baixa | Stack traces expostos, erro genérico 500 |

### 1.3 Code Smells e Problemas de Manutenibilidade

**God Router (`api/index.ts`)**
- 39 rotas registradas em um único arquivo de 212 linhas
- Mistura rotas públicas (`/health`, `/status`) com rotas protegidas
- Dificulta navegação e manutenção

**Service Layer Monolítico**
- 45 services em `src/servicios/` sem subdomínios claros
- `ProjetoService` atua como façade para todos os domínios
- Alto acoplamento entre serviços

**Configuração Global Mútua**
- `loadSettings()` com cache singleton (`cachedSettings`)
- Dificulta testes e sobrescrita por ambiente
- Sem suporte a variáveis de ambiente nativas

**Tipagem Fraca em Domínios Críticos**
- Uso extensivo de `any` em:
  - `req.servicos!` (non-null assertion)
  - `MonitoramentoService` retornando `any`
  - Resultados de operações com `unknown` sem narrowing

**Duplicação de Código em Testes**
- Fixtures de projeto replicadas em `orquestrador-integration.test.ts` e `integridade-crud.test.ts`
- Função `request()` duplicada em ambos os arquivos

### 1.4 Gaps de Testes

| Categoria | Status | Cobertura Estimada |
|-----------|--------|-------------------|
| **Testes Unitários** | ❌ Ausentes | 0% |
| **Testes de Integração** | ⚠️ Parciais | ~15% (2 arquivos, 10 testes) |
| **Testes E2E** | ⚠️ Configurados, não executados | 0% |
| **Testes MCP** | ❌ Ausentes | 0% |
| **Testes de Segurança** | ❌ Ausentes | 0% |
| **Testes de Performance** | ❌ Ausentes | 0% |

**Domínios não cobertos:**
- Validação de schemas JSON
- Path traversal protection
- MCP tools (170 tools sem teste)
- WebSocket monitoramento
- Orquestração de fases
- Estado de máquina (state machines)
- CORS configuration

### 1.5 Performance Issues

| Issue | Severidade | Descrição |
|-------|------------|-----------|
| Leitura síncrona de arquivos | Alta | `fs.readFileSync` em serviços bloqueia event loop |
| Sem cache de schemas | Média | Ajv recompila schemas em memória, mas sem persistência |
| Listagem de diretórios recursiva | Média | `listarSchemas` sem paginação/otimização |
| Estática sem cache headers | Baixa | Frontend com `maxAge: 0` em produção |
| Sem connection pooling | Baixa | PostgreSQL opcional sem configuração de pool |

---

## 2. Stack Tecnológica Proposta

### 2.1 Backend

| Camada | Tecnologia | Versão Alvo | Justificativa |
|--------|-----------|-------------|---------------|
| **Runtime** | Node.js | 22 LTS | Estável, suporte ES2022, performance |
| **Linguagem** | TypeScript | 5.8+ | Já adotado, strict mode |
| **Framework HTTP** | Fastify | 4.x | Substituir Express — schema validation nativo, 2x mais rápido, tipado |
| **Validação** | Zod | 4.x | Já adotado, manter |
| **Schemas JSON** | Ajv + formats | 8.x | Já adotado, manter |
| **MCP SDK** | @modelcontextprotocol/sdk | 1.30+ | Já adotado, manter |
| **Observabilidade** | OpenTelemetry | 2.x | Já adotado, manter |
| **WebSocket** | ws | 8.x | Já adotado, manter |
| **CORS** | @fastify/cors | 6.x | Manter funcionalidade |
| **Rate Limiting** | @fastify/rate-limit | 9.x | **NOVO** — proteção contra abuso |
| **Cache** | node-cache | 6.x | **NOVO** — cache em memória para configs |
| **Logging** | pino + pino-pretty | 9.x | **NOVO** — logging estruturado JSON |

### 2.2 Frontend

| Camada | Tecnologia | Versão Alvo | Justificativa |
|--------|-----------|-------------|---------------|
| **UI Framework** | React 18+ | 18.x | Componentização, state management, ecossistema |
| **Linguagem** | TypeScript | 5.x | Tipagem consistente com backend |
| **Build** | Vite | 6.x | HMR rápido, bundle otimizado, ESM nativo |
| **Roteamento** | React Router | 7.x | Cliente-side routing |
| **HTTP Client** | axios | 1.x | Interceptors, tipagem |
| **Estado Global** | Zustand | 5.x | Leve, simples, sem boilerplate |
| **UI Components** | shadcn/ui + Tailwind | 4.x | Design system moderno, customizável |
| **Formulários** | React Hook Form + Zod | 7.x | Validação client-side mirror do backend |
| **Testes** | Vitest + Testing Library | 2.x | Unit e integração |
| **E2E** | Playwright | 1.55+ | Já adotado, manter |

### 2.3 Banco de Dados (Futuro)

| Camada | Tecnologia | Versão Alvo | Justificativa |
|--------|-----------|-------------|---------------|
| **SGBD** | PostgreSQL | 16+ | Já previsto, robusto para metadados |
| **Query Builder** | Knex.js | 3.x | Já em optionalDependencies |
| **Migrations** | knex migrations | 3.x | Versionamento de schema |
| **Cache DB** | Redis | 7.x | Cache de sessões, filas, rate limit |

### 2.4 DevOps e Ferramentas

| Ferramenta | Propósito |
|------------|-----------|
| **Docker + Docker Compose** | Containerização, consistência de ambiente |
| **GitHub Actions** | CI/CD pipeline |
| **ESLint + Prettier** | Linting e formatação (substituir tslint) |
| **Husky + lint-staged** | Pre-commit hooks |
| **Renovate** | Dependency updates automatizados |
| **Snyk** | Vulnerability scanning |
| **Semantic Release** | Versionamento semântico automatizado |

---

## 3. Padrões de Código

### 3.1 Convenções de Nomenclatura

```typescript
// Arquivos
projeto.service.ts       // services
projeto.controller.ts    // controllers (se migrarmos para MVC)
projeto.repository.ts    // repositories
projeto.schema.ts        // schemas/types
projeto.test.ts          // tests
projeto.integration.test.ts // integration tests

// Código
export class ProjetoService { }
export function criarProjeto(): ResultadoOperacao { }
export const PROJETO_PREFIX = 'proj-';
export type ProjetoId = string;

// Variáveis
const projetoAtual: Projeto | null = null;
const projetosFiltrados: Projeto[] = [];

// Evitar
const p: any = {};  // ❌
const data: any = {};  // ❌
```

### 3.2 Estrutura de Pastas (Proposta)

```
backend/
├── src/
│   ├── config/              # Configurações centralizadas
│   │   ├── index.ts
│   │   ├── env.ts           # Variáveis de ambiente tipadas
│   │   └── constants.ts     # Constantes globais
│   ├── modules/             # Módulos por domínio (substitui servicios/)
│   │   ├── projeto/
│   │   │   ├── projeto.service.ts
│   │   │   ├── projeto.controller.ts
│   │   │   ├── projeto.repository.ts
│   │   │   ├── projeto.schema.ts
│   │   │   └── __tests__/
│   │   ├── tarefa/
│   │   ├── agente/
│   │   └── ...
│   ├── shared/              # Código compartilhado
│   │   ├── errors/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── types/
│   ├── infrastructure/      # Implementações concretas
│   │   ├── filesystem/
│   │   ├── database/
│   │   └── mcp/
│   ├── observability/       # Manter estrutura atual
│   ├── validacao/           # Manter estrutura atual
│   └── main.ts              # Bootstrap da aplicação
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── dist/
└── package.json
```

### 3.3 Padrões de Projeto Recomendados

| Padrão | Aplicação | Exemplo |
|--------|-----------|---------|
| **Repository** | Abstração de acesso a dados | `ProjetoRepository` com `findById`, `save`, `delete` |
| **Service Layer** | Lógica de negócio | `ProjetoService` com casos de uso |
| **Factory** | Criação de entidades | `ProjetoFactory.create(dados)` |
| **Result Pattern** | Tratamento de erros | `Result<T, E>` ao invés de exceções para erros esperados |
| **Middleware Chain** | Request pipeline | Validação → Auth → Rate Limit → Handler |
| **Dependency Injection** | Inversão de controle | InversifyJS ou manual via construtor |
| **DTO/Command/Query** | Separação de inputs | `CriarProjetoCommand`, `ProjetoQuery` |

**Exemplo Result Pattern:**

```typescript
// ❌ Antes
export function abrirProjeto(caminho: string): ResultadoOperacao {
  try {
    // ...
    return { sucesso: true, dados: projeto };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

// ✅ Depois
export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

export function abrirProjeto(caminho: string): Result<Projeto, ProjetoError> {
  if (!valido) return { ok: false, error: new ProjetoError('INVALID_PATH') };
  return { ok: true, value: projeto };
}
```

### 3.4 Tratamento de Erros

**Hierarquia de Erros:**

```typescript
// shared/errors/
export class AgentMapError extends Error {
  constructor(
    public codigo: string,
    message: string,
    public statusCode: number = 500,
    public detalhes?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AgentMapError';
  }
}

export class ProjetoNaoEncontradoError extends AgentMapError {
  constructor(id: string) {
    super('PROJECT_NOT_FOUND', `Projeto ${id} não encontrado`, 404);
  }
}

export class ValidacaoError extends AgentMapError {
  constructor(campos: string[]) {
    super('VALIDATION_ERROR', 'Campos inválidos', 400, { campos });
  }
}

export class PathTraversalError extends AgentMapError {
  constructor(caminho: string) {
    super('PATH_TRAVERSAL', `Acesso negado: ${caminho}`, 403);
  }
}
```

**Global Error Handler:**

```typescript
// middleware/error-handler.ts
export function errorHandler(
  err: AgentMapError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error({
    code: err.codigo,
    message: err.message,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    detalhes: err.detalhes
  });
  
  res.status(err.statusCode).json({
    sucesso: false,
    codigoErro: err.codigo,
    erro: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}
```

### 3.5 Logging Estruturado

```typescript
// Antes
console.error('[LOG]', JSON.stringify(log));

// Depois — Pino
import pino from 'pino';
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty' } 
    : undefined,
  formatter: (log) => ({ ...log, service: 'agentmap-backend' })
});

// Uso
logger.info({ projetoId: 'proj-123', acao: 'abrir' }, 'Projeto aberto com sucesso');
logger.error({ err: erro, tarefaId: 'TAR-456' }, 'Falha ao atualizar tarefa');
```

---

## 4. Estratégia de Testes

### 4.1 Pirâmide de Testes

```
        /\
       /E2E\          10% — Testes E2E (Playwright)
      /------\
     /Integração\     20% — Testes de Integração (API)
    /----------\
   /Unitários    \   70% — Testes Unitários (Jest/Vitest)
  /--------------\
```

### 4.2 Ferramentas

| Tipo | Ferramenta | Aplicação |
|------|-----------|-----------|
| **Unitários** | Vitest | Services, utils, validadores |
| **Integração** | Vitest + supertest | Rotas HTTP, serviços com repositórios reais |
| **E2E** | Playwright | Fluxos completos via UI |
| **MCP** | Vitest | Tools MCP individuais |
| **Cobertura** | c8 (Node built-in) | Coverage sem instrumentação |
| **Mutation** | Stryker | Teste de qualidade dos testes |

### 4.3 Cobertura Mínima

| Métrica | Mínimo | Alvo |
|---------|--------|------|
| **Linhas** | 80% | 90% |
| **Ramos** | 75% | 85% |
| **Funções** | 80% | 90% |

**Exceções permitidas:**
- Schemas/types (sem lógica)
- Arquivos de configuração
- DTOs puros

### 4.4 Testes de Integração

**Escopo:** Rotas HTTP + camada de serviço + repositório real (filesystem)

```typescript
// Exemplo: projeto.integration.test.ts
describe('POST /api/projetos', () => {
  let app: Application;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempProject();
    const services = await createTestServices(tempDir);
    app = createApp(services);
  });

  afterEach(async () => {
    await cleanupTempProject(tempDir);
  });

  test('cria projeto com sucesso', async () => {
    const response = await request(app)
      .post('/api/projetos')
      .send({ nome: 'Teste', caminhoParental: tempDir });
    
    expect(response.status).toBe(201);
    expect(response.body.sucesso).toBe(true);
    expect(response.body.dados.id).toMatch(/^PROJ-/);
  });

  test('rejeita projeto sem nome', async () => {
    const response = await request(app)
      .post('/api/projetos')
      .send({ caminhoParental: tempDir });
    
    expect(response.status).toBe(400);
  });
});
```

### 4.5 Testes E2E (Playwright)

**Fluxos críticos a cobrir:**

| Fluxo | Prioridade | Complexidade |
|-------|------------|--------------|
| Criar e abrir projeto | Alta | Média |
| Criar agente e atribuir tarefa | Alta | Média |
| Executar workflow completo (handoff → execução → resultado) | Alta | Alta |
| Validar integridade do projeto | Média | Baixa |
| Limpar arquivos temporários | Baixa | Baixa |

### 4.6 Mocking Strategy

```typescript
// Para unitários: mocks manuais ou factories
const mockFileService = {
  lerJson: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
  escreverJson: vi.fn().mockResolvedValue({ sucesso: true })
};

// Para integração: repositórios reais com dados em memória
// Para E2E: sem mocks, dados reais

// MCP tools: mock do servidor MCP
const mockMcpServer = {
  listTools: vi.fn(),
  callTool: vi.fn()
};
```

---

## 5. CI/CD e Deploy

### 5.1 Pipeline de CI/CD

```yaml
# .github/workflows/ci.yml (proposta)
name: CI/CD

on:
  push:
    branches: [main, v0044, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v4
        with: { files: ./coverage/coverage-final.json }

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: playwright-report, path: e2e/playwright-report/ }

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        with: { args: '--severity-threshold=high' }

  build:
    needs: [lint-and-typecheck, unit-tests, security]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist/ }

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: echo "Deploy step — configurar para seu ambiente"
```

### 5.2 Estratégia de Deploy

**Fases de Deploy:**

```
develop → staging → production
   ↑         ↑          ↑
   │         │          │
  PR merge  aprovação  manual trigger
```

| Ambiente | Propósito | Configuração |
|----------|-----------|--------------|
| **Development** | Desenvolvimento local | `NODE_ENV=development`, porta 3150 |
| **Staging** | Homologação pré-prod | `NODE_ENV=staging`, dados sintéticos |
| **Production** | Produção | `NODE_ENV=production`, porta 3150, TLS reverso proxy |

**Deploy Manual (Fase atual):**
- Execução local via `npm run dev`
- Sem orquestração

**Deploy Automatizado (Futuro):**
- Docker Compose para single-host
- Kubernetes manifests para multi-host
- Helm chart para o ecossistema completo

### 5.3 Rollback Strategy

```typescript
// Versionamento de configuração
interface DeployVersion {
  versao: string;
  timestamp: string;
  commit: string;
  configuracoes: Record<string, unknown>;
}

// Rollback automático se health check falhar
async function deployWithRollback(versao: string) {
  const backup = await createBackup();
  await deploy(versao);
  
  const healthy = await waitForHealthCheck({ timeout: 60000 });
  if (!healthy) {
    await restoreFromBackup(backup);
    throw new Error('Deploy falhou, rollback executado');
  }
}
```

### 5.4 Feature Flags

```typescript
// config/features.ts
export interface FeatureFlags {
  mcpWakeupPlugin: boolean;
  websocketMonitoramento: boolean;
  postgresMetadados: boolean;
  rateLimiting: boolean;
  cacheArquivos: boolean;
}

export const FEATURES: FeatureFlags = {
  mcpWakeupPlugin: true,
  websocketMonitoramento: true,
  postgresMetadados: false,
  rateLimiting: false,  // Habilitar gradualmente
  cacheArquivos: false  // Habilitar após testes
};

// Uso
if (FEATURES.rateLimiting) {
  app.register(rateLimit, { max: 100, timeWindow: '1m' });
}
```

### 5.5 Ambiente de Staging

- Dados sintéticos de projetos (não reais)
- Configuração espelhada de produção
- Testes de integração automatizados no deploy
- Health checks rigorosos antes de promover

---

## 6. Performance e Escalabilidade

### 6.1 Otimizações Imediatas

| Otimização | Impacto | Esforço |
|------------|---------|---------|
| Cache de configurações | Baixo | Baixo |
| Cache de schemas JSON | Baixo | Baixo |
| Lazy loading de serviços | Médio | Médio |
| Paginação em listagens | Médio | Médio |
| Connection pooling PostgreSQL | Alto | Médio |
| Compressão gzip/brotli | Alto | Baixo |

### 6.2 Caching Strategy

```typescript
// shared/cache/
export class CacheService {
  private cache = new Map<string, { value: any; expires: number }>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: any, ttlMs: number): void {
    this.cache.set(key, { value, expires: Date.now() + ttlMs });
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) this.cache.delete(key);
    }
  }
}

// Aplicação
const config = cache.get('settings') ?? loadSettings();
cache.set('settings', config, 300000); // 5 min
```

### 6.3 Async Processing

```typescript
// Filas de trabalho para operações pesadas
interface Job {
  id: string;
  tipo: 'backup' | 'limpeza' | 'validacao';
  payload: any;
}

class JobQueue {
  private queue: Job[] = [];
  private processing = false;

  async enqueue(job: Job): Promise<void> {
    this.queue.push(job);
    if (!this.processing) this.process();
  }

  private async process(): Promise<void> {
    this.processing = true;
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      await this.execute(job);
    }
    this.processing = false;
  }
}
```

### 6.4 Monitoramento de Performance

```typescript
// Métricas customizadas OpenTelemetry
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('agentmap');

const requestDuration = meter.createHistogram('http.request.duration', {
  description: 'HTTP request duration in milliseconds',
  boundaries: [10, 50, 100, 500, 1000, 5000]
});

const fileOperations = meter.createCounter('filesystem.operations', {
  description: 'Filesystem operations count'
});

// Uso
requestDuration.record(durationMs, { method, route, statusCode });
fileOperations.add(1, { operation: 'read', path: relPath });
```

---

## 7. Segurança na Engenharia

### 7.1 SAST/DAST

| Ferramenta | Propósito | Frequência |
|------------|-----------|------------|
| **ESLint security plugin** | SAST em código | Pre-commit + CI |
| **Snyk** | Dependency scanning | CI diário |
| **OWASP ZAP** | DAST em staging | Pós-deploy |
| **npm audit** | Vulnerabilities npm | CI |

```bash
# Instalar
npm install --save-dev eslint-plugin-security @snyk/protect

# .eslintrc.js
module.exports = {
  plugins: ['security'],
  rules: {
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-regexp': 'warn'
  }
};
```

### 7.2 Dependency Scanning

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /backend
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
```

### 7.3 Secrets Management

```typescript
// ❌ Remover hardcoded
postgresConfig: {
  host: 'localhost',
  porta: 5432,
  banco: 'agentmap',
  usuario: 'postgres'  // ❌
}

// ✅ Usar variáveis de ambiente
postgresConfig: {
  host: process.env.PG_HOST ?? 'localhost',
  porta: parseInt(process.env.PG_PORT ?? '5432'),
  banco: process.env.PG_DATABASE ?? 'agentmap',
  usuario: process.env.PG_USER  // ✅
}

// ✅ Usar .env com validação
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().default(3150),
  PG_HOST: z.string().default('localhost'),
  PG_PORT: z.coerce.number().default(5432),
  PG_DATABASE: z.string().default('agentmap'),
  PG_USER: z.string().optional(),
  PG_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().optional()
});

export const env = envSchema.parse(process.env);
```

### 7.4 Input Validation

```typescript
// Validação em camadas:
// 1. Schema (Zod) — tipos e formatos
// 2. Sanitização — remoção de caracteres perigosos
// 3. Validação de negócio — regras específicas

// Exemplo
const CriarProjetoSchema = z.object({
  nome: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_]+$/),
  caminhoParental: z.string().refine(
    (path) => !path.includes('..') && !path.includes('~'),
    { message: 'Caminho inválido' }
  ),
  descricao: z.string().max(500).optional()
});

// Sanitização adicional
export function sanitizeProjectName(nome: string): string {
  return nome.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 100);
}
```

### 7.5 Rate Limiting

```typescript
// Proteção de endpoints
app.register(rateLimit, {
  max: 100,
  timeWindow: '1m',
  keyGenerator: (req) => req.ip
});

// Rate limit específico para MCP
app.register(rateLimit, {
  max: 50,
  timeWindow: '1m',
  keyGenerator: (req) => `mcp:${req.headers['x-agent-id']}`
});
```

---

## 8. Backlog Técnico Priorizado

### 8.1 Tarefas Prioritárias

| ID | Tarefa | Categoria | Prioridade | Esforço | Dependências |
|----|--------|-----------|------------|---------|--------------|
| T1 | Migrar de Express para Fastify | Arquitetura | Alta | 8h | T2, T3 |
| T2 | Reestruturar módulos (services → modules) | Arquitetura | Alta | 16h | — |
| T3 | Implementar error handling centralizado | Segurança | Alta | 4h | — |
| T4 | Configurar ESLint + Prettier | Qualidade | Alta | 4h | — |
| T5 | Implementar logging estruturado (Pino) | Observabilidade | Alta | 4h | — |
| T6 | Configurar CI/CD (GitHub Actions) | DevOps | Alta | 8h | T4, T5 |
| T7 | Aumentar cobertura de testes para 80% | Qualidade | Alta | 24h | T2 |
| T8 | Implementar rate limiting | Segurança | Média | 4h | T1 |
| T9 | Externalizar secrets para .env | Segurança | Média | 4h | — |
| T10 | Containerizar com Docker | DevOps | Média | 8h | T6 |
| T11 | Implementar cache de configurações | Performance | Média | 4h | T2 |
| T12 | Criar testes unitários para services | Qualidade | Média | 32h | T2, T7 |
| T13 | Implementar feature flags | Arquitetura | Baixa | 8h | — |
| T14 | Separar frontend em repositório próprio | Frontend | Baixa | 16h | T1 |
| T15 | Implementar connection pooling PostgreSQL | Banco | Baixa | 8h | T9 |

### 8.2 Sequenciamento Recomendado

```
Sprint 1 (Semana 1):
├── T4: ESLint + Prettier
├── T5: Logging estruturado
├── T9: Externalizar secrets
└── T3: Error handling centralizado

Sprint 2 (Semana 2):
├── T2: Reestruturar módulos
├── T7: Aumentar cobertura (base)
└── T6: CI/CD básico

Sprint 3 (Semana 3):
├── T1: Migrar para Fastify
├── T8: Rate limiting
├── T11: Cache
└── T12: Testes unitários

Sprint 4 (Semana 4):
├── T10: Docker
├── T13: Feature flags
└── T15: Separar frontend
```

### 8.3 Estimativas

| Categoria | Total Estimado |
|-----------|----------------|
| **Arquitetura** | 40h |
| **Qualidade (Testes)** | 56h |
| **Segurança** | 12h |
| **DevOps** | 16h |
| **Performance** | 8h |
| **Frontend** | 16h |
| **TOTAL** | **148h** (~19 dias úteis) |

---

## 9. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|--------|---------------|---------|-----------|
| Migração Fastify quebra compatibilidade MCP | Média | Alto | Implementar em paralelo, feature flag |
| Resistência a mudanças estruturais | Média | Médio | Documentação, ADRs, migração gradual |
| Cobertura de testes insuficiente | Alta | Alto | Testes antes de refatorings |
| Dependências desatualizadas | Alta | Médio | Renovate + Snyk |
| Falta de recursos para implementação | Média | Alto | Priorizar T1-T6 primeiro |

---

## 10. Métricas de Sucesso

| Métrica | Baseline | Alvo (3 meses) |
|---------|----------|----------------|
| Cobertura de testes | ~15% | ≥80% |
| Tempo de startup | N/A | <5s |
| Tempo de resposta P95 | N/A | <200ms |
| Vulnerabilidades críticas | Desconhecido | 0 |
| Deploy frequency | Manual | 1x/semana |
| Lead time | Desconhecido | <1 dia |
| MTTR | Desconhecido | <1h |

---

## 11. Próximos Passos

1. **APROVAÇÃO** deste documento pelo Arquiteto e Proprietário
2. Criação de ADRs para decisões arquiteturais (Fastify, módulos)
3. Início da Sprint 1 (T4-T9)
4. Revisão semanal de progresso
5. Validação de métricas ao final de cada sprint

---

*Documento gerado pelo Engenheiro de Software do AgentMap*  
*Branch: v0044 | Data: 2026-08-27*
