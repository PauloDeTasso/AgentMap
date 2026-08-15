# Plano — Teste Completo do AgentMap (todas as tools, agents, CLI, docs)

## 1. Objetivo

Executar bateria completa de testes em todos os aspectos do AgentMap:
- 79 tools MCP
- Agentes e perfis
- CLI / comandos
- Documentação
- Subscriptions 2026
- Segurança
- Integração E2E

Dividir em worktrees Agent Manager para paralelismo real.

## 2. Escopo

- Testes unitários de todas as 79 tools MCP
- Testes de integração do protocolo MCP (initialize, resources, notifications)
- Testes E2E via stdio pipe
- Testes de segurança (auth, path traversal, CSRF, CORS)
- Testes de subscriptions 2026 (`subscriptions/listen`)
- Verificação de documentação vs implementação
- Verificação CLI e comandos npm

## 3. Tarefas

### Fase 1 — Unit tests (todas as 79 tools)

1. **Projetos & Integridade** (6 tools)
2. **Tarefas** (7 tools)
3. **Agentes** (5 tools)
4. **Contexto & Conhecimento** (8 tools)
5. **Solicitações** (9 tools)
6. **Handoffs** (5 tools)
7. **Sessões** (6 tools)
8. **Entidades Secundárias** (artefatos, aprendizados, checkpoints, critérios, decisões, dependencias, responsabilidades, resultados)
9. **Bloqueios, Pendências, Riscos, Reservas, Validações, Contatos** (18 tools)
10. **Workflows** (4 tools)
11. **Worktree / Paralelismo** (3 tools)
12. **Eventos** (3 tools)
13. **Arquivos & Auditoria** (5 tools)

### Fase 2 — Integration & Protocol

14. Protocolo MCP 2025 (initialize, handshake, tools/call, resources/read)
15. Subscriptions 2026 (`subscriptions/listen`, acknowledged, cancelamento, graceful shutdown)
16. Notifications dual-era (legacy + listen)
17. EventBus coalescence
18. Autorização centralizada

### Fase 3 — E2E & Security

19. E2E stdio pipe (spawn server, enviar JSON-RPC, validar respostas)
20. API REST auth (x-api-key, verify, login/logout)
21. CSRF / CORS headers
22. Path traversal bloqueios
23. Validação Zod em todas as escritas

### Fase 4 — Documentation & CLI

24. README vs código (tools list, agents, capabilities)
25. docs/protocolo-mcp.md vs implementação
26. CLI commands (`npm run mcp`, `npm run dev`, `npm test`)

## 4. Critérios de aceite

- [ ] 100% das 79 tools testadas unitariamente
- [ ] Protocolo MCP 2025 + 2026 validado
- [ ] Subscriptions 2026 com ack, cancel, shutdown
- [ ] E2E stdio pipe funcionando
- [ ] Security: auth, path traversal, CSRF, CORS
- [ ] Documentação sincronizada com implementação
- [ ] CLI commands funcionais

## 5. Ordem de execução

1. Criar worktrees no Agent Manager (um por domínio)
2. Cada agente executa testes do seu domínio
3. Consolidar resultados em relatório único
