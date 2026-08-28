# Quality Gates

> **Versão:** 1.0.0  
> **Data:** 2026-08-28  
> **Branch:** v0045-spike  
> **Responsável:** Engenheiro de Software

---

## 1. Visão Geral

Quality gates são verificações automáticas que bloqueiam o fluxo de entrega quando requisitos mínimos de qualidade não são atendidos.

No AgentMap, os quality gates rodam localmente via `npm run quality` e no CI via GitHub Actions.

---

## 2. Gates Disponíveis

| Gate | Comando | Descrição | Falha quando |
|------|---------|-----------|--------------|
| **Typecheck** | `tsc --noEmit` | Valida tipos TypeScript | Existe erro de compilação |
| **Lint** | `eslint src --ext .ts` | Valida padrões de código | Existe erro do ESLint |
| **Test** | `jest` | Executa suíte de testes | Existe teste falhando |
| **Coverage** | `jest --coverage` | Valida cobertura mínima | Cobertura abaixo do threshold |

---

## 3. Como Rodar Localmente

```bash
# Roda todos os gates em sequência
cd backend
npm run quality

# Roda quality + build (comando CI local)
npm run ci
```

### Saída esperada

```
========================================
  Quality Gates
========================================

[gate] Running Typecheck... ✅ PASS
       TypeScript compila sem erros (234ms)
[gate] Running Lint... ✅ PASS
       Nenhum problema de lint encontrado (1203ms)
[gate] Running Test... ❌ FAIL
       Alguns testes falharam (4521ms)
[gate] Running Coverage... ⏭ SKIPPED
       Cobertura não executada pois teste falhou

========================================
  1 gate(s) falharam ❌
========================================
```

---

## 4. Estrutura dos Arquivos

```
backend/src/quality/
├── types.ts                  ← Tipos compartilhados (GateResult)
├── TypecheckGate.ts          ← Gate de typecheck
├── LintGate.ts               ← Gate de lint
├── TestGate.ts               ← Gate de testes
├── CoverageGate.ts           ← Gate de cobertura
└── run-gates.ts              ← Orquestrador dos gates
```

---

## 5. Configuração de Cobertura

O threshold de cobertura está definido em `backend/jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

O `CoverageGate` executa `jest --coverage` e falha automaticamente se qualquer métrica ficar abaixo de 80%.

---

## 6. GitHub Actions

O workflow de CI está em `.github/workflows/ci.yml` e roda automaticamente em push/PR para `main`:

```yaml
name: CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
```

### Estágios

1. **Install** — `npm ci`
2. **Quality gates** — `npm run quality`
3. **Build** — `npm run build`

Se qualquer gate falhar, o workflow é interrompido e marcado como falha.

---

## 7. Integração com o Fluxo AgentMap

| Momento | Ação |
|---------|------|
| **Commit** | Rodar `npm run quality` antes de commitar |
| **PR** | GitHub Actions valida automaticamente |
| **Merge main** | CI bloqueia merge se gates falharem |
| **Release** | `npm run ci` como gate final antes do tag |

---

## 8. Política de Quality Gates

1. **Nenhum gate é opcional** — todos devem passar para merge.
2. **Cobertura mínima: 80%** — branches, functions, lines, statements.
3. **Zero erro de lint** — warnings são permitidas no curto prazo.
4. **Zero erro de typecheck** — `strict: true` no tsconfig.
5. **100% dos testes passing** — testes falhos bloqueiam deploy.

---

## 9. Próximos Passos

- [ ] Aumentar cobertura gradualmente até 80%
- [ ] Adicionar `npm run lint:fix` para auto-correção
- [ ] Configurar Prettier no CI
- [ ] Adicionar sonarcloud ou similar para métricas avançadas

---

*Documento gerado pelo Engenheiro de Software do AgentMap*
