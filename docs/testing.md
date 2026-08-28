# Estratégia de Testes

> **Versão:** 1.0.0  
> **Data:** 2026-08-28  
> **Branch:** v0044  
> **Responsável:** Testador/QA

---

## 1. Objetivo

Garantir que o AgentMap atenda aos requisitos de qualidade funcionais, não-funcionais e de experiência do usuário.

---

## 2. Pirâmide de Testes

```
        /\
       /E2E\       ← Testes End-to-End (ponta da pirâmide)
      /------\
     /Integração\  ← Testes de Integração
    /----------\
   / Unitários \  ← Testes Unitários (base da pirâmide)
  /--------------\
```

### 2.1 Testes Unitários (70%)

- **Responsabilidade:** Testar services, repositories e utilitários isoladamente
- **Ferramenta:** Jest
- **Cobertura alvo:** 80% branches, functions, lines, statements

**Exemplos:**
- `TarefaService.criar()`
- `HandoffRepository.listar()`
- `SchemaValidator.validar()`

### 2.2 Testes de Integração (20%)

- **Responsabilidade:** Testar rotas HTTP, tools MCP e fluxos completos
- **Ferramenta:** Jest + SuperTest
- **Cobertura alvo:** Rotas críticas e fluxos principais

**Exemplos:**
- `POST /api/tarefas` → 201 Created
- `GET /api/handoffs/:id` → 200 OK
- MCP tool `agentmap_tarefas_criar` → executa corretamente

### 2.3 Testes E2E (10%)

- **Responsabilidade:** Testar fluxos completos de usuário
- **Ferramenta:** Playwright ou Cypress
- **Cobertura alvo:** Jornadas críticas

**Exemplos:**
- Criar projeto → criar tarefa → criar handoff → aceitar handoff
- Inicializar AgentMap → sincronizar → validar integridade

---

## 3. Ferramentas

| Ferramenta | Uso |
|------------|-----|
| **Jest** | Framework de testes unitários e de integração |
| **SuperTest** | Testes de API HTTP |
| **Playwright** | Testes E2E |
| **@modelcontextprotocol/sdk** | Testes de MCP tools |

---

## 4. Estrutura de Testes

```
tests/
├── unit/
│   ├── modules/
│   │   ├── tarefa/
│   │   │   ├── TarefaService.test.ts
│   │   │   └── TarefaRepository.test.ts
│   │   ├── agente/
│   │   │   └── AgenteService.test.ts
│   │   └── handoff/
│   │       └── HandoffService.test.ts
│   ├── quality/
│   │   ├── TypecheckGate.test.ts
│   │   ├── LintGate.test.ts
│   │   └── CoverageGate.test.ts
│   └── shared/
│       ├── utils.test.ts
│       └── errors.test.ts
├── integration/
│   ├── api/
│   │   ├── tarefas.test.ts
│   │   ├── handoffs.test.ts
│   │   ├── agentes.test.ts
│   │   └── monitoramento.test.ts
│   ├── mcp/
│   │   ├── tools.test.ts
│   │   └── resources.test.ts
│   └── workflows/
│       └── fluxo-trabalho.test.ts
└── fixtures/
    ├── projetos/
    │   └── projeto-exemplo.json
    ├── tarefas/
    │   └── tarefa-exemplo.json
    └── agentes/
        └── agente-exemplo.json
```

---

## 5. Convenções

### 5.1 Nomenclatura

- Arquivos: `<Nome>.test.ts`
- Descrições: `describe('TarefaService', () => { ... })`
- Testes: `test('deve criar tarefa', () => { ... })`

### 5.2 Setup

```typescript
// tests/setup.ts
beforeEach(() => {
  // Limpa estado antes de cada teste
  jest.clearAllMocks();
});
```

### 5.3 Mocks

```typescript
// Mock de repositório
const mockRepo = {
  obter: jest.fn(),
  listar: jest.fn(),
  criar: jest.fn(),
} as unknown as TarefaRepository;
```

---

## 6. Cobertura

### 6.1 Thresholds

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

### 6.2 Medição

```bash
# Executar testes com coverage
npm run test:coverage

# Visualizar relatório
open coverage/lcov-report/index.html
```

---

## 7. Quality Gates

Consulte [`docs/quality-gates.md`](quality-gates.md) para detalhes.

| Gate | Comando | Bloqueia quando |
|------|---------|-----------------|
| Typecheck | `tsc --noEmit` | Erro de compilação |
| Lint | `eslint src --ext .ts` | Erro do ESLint |
| Test | `jest` | Teste falhando |
| Coverage | `jest --coverage` | Cobertura < 80% |

---

## 8. Testes por Módulo

### 8.1 Tarefas

- Criar tarefa
- Listar tarefas
- Atualizar tarefa
- Excluir tarefa
- Verificar dependências
- Transições de estado

### 8.2 Handoffs

- Criar handoff
- Aceitar handoff
- Concluir handoff
- Rejeitar handoff
- Listar handoffs por agente

### 8.3 Agentes

- Criar agente
- Atualizar agente
- Listar agentes
- Verificar permissões

### 8.4 Monitoramento

- Criar mensagem
- Listar mensagens
- Filtrar por agente/tarefa
- Wake-up automático

### 8.5 MCP Tools

- Registrar tool
- Executar tool
- Validar parâmetros
- Retornar erro estruturado

---

## 9. Testes de Segurança

### 9.1 Path Traversal

```typescript
test('deve bloquear path traversal', async () => {
  const resultado = await pathValidator.validar('../../etc/passwd');
  expect(resultado.valido).toBe(false);
});
```

### 9.2 Validação de Entrada

```typescript
test('deve rejeitar JSON malformado', async () => {
  const resultado = await schemaValidator.validar('{invalido}');
  expect(resultado.valido).toBe(false);
});
```

---

## 10. Testes de Performance

### 10.1 Métricas

| Métrica | Alvo |
|---------|------|
| Tempo de resposta (p95) | < 200ms |
| Throughput | > 100 req/s |
| Memória | < 512MB |

### 10.2 Ferramentas

- **Autocannon** — load testing HTTP
- **0x** — profiling Node.js

---

## 11. Integração Contínua

### 11.1 GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run quality
      - run: npm run build
```

### 11.2 Bloqueio Automático

- PR não pode ser mergeado se quality gates falharem
- Cobertura deve manter-se ≥80%

---

## 12. Troubleshooting de Testes

### Testes falham aleatoriamente

- Verifique se há estado compartilhado entre testes
- Use `beforeEach` para limpar estado
- Verifique se há race conditions em testes assíncronos

### Cobertura baixa

- Identifique arquivos não cobertos
- Adicione testes para cenários críticos
- Priorize: services, repositories, rotas HTTP

### MCP tools não testadas

- Use `@modelcontextprotocol/sdk` para criar clientes de teste
- Mock chamadas externas
- Valide schema de entrada/saída

---

## 13. Referências

- [`docs/quality-gates.md`](quality-gates.md)
- [`docs/development.md`](development.md)
- [`backend/jest.config.js`](../backend/jest.config.js)
- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
