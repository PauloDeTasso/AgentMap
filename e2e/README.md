# Testes E2E — AgentMap Frontend

Estrutura de testes end-to-end usando Playwright para o frontend vanilla do AgentMap.

## Estrutura

```
e2e/
├── package.json              # Dependências e scripts
├── playwright.config.ts      # Configuração do Playwright
├── tsconfig.json             # Configuração TypeScript
├── screenshots/              # Screenshots de falhas (gerado automaticamente)
├── pages/                    # Page Objects
│   ├── BasePage.ts
│   ├── DashboardPage.ts
│   └── MonitoramentoPage.ts
└── tests/
    ├── 01-fluxo-completo.spec.ts
    ├── 02-monitoramento.spec.ts
    ├── 03-responsividade.spec.ts
    └── 04-acessibilidade.spec.ts
```

## Pré-requisitos

- Node.js 18+
- Backend rodando em `http://localhost:3150`

## Instalação

```bash
cd e2e
npm install
npx playwright install chromium firefox webkit
```

## Execução

```bash
# Todos os testes
npm test

# Com interface gráfica
npm run test:ui

# Apenas um arquivo
npx playwright test tests/01-fluxo-completo.spec.ts

# Modo headed (ver o browser)
npm run test:headed

# Ver relatório
npm run report
```

## Cobertura

1. **Fluxo Completo**: criar projeto → abrir projeto → dashboard → agente → tarefa → handoff
2. **Monitoramento**: WebSocket, chat, filtros
3. **Responsividade**: desktop, tablet, mobile (375px, 768px)
4. **Acessibilidade**: roles, labels, landmarks, navegação por teclado, contraste

## Notas

- O webServer do Playwright inicia o backend automaticamente via `npm run dev`.
- Os testes usam seletores baseados em texto, IDs e roles para maior estabilidade.
- Ajuste os seletores em `pages/` conforme a implementação real do frontend.
