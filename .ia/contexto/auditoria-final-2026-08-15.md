# Auditoria Final — AgentMap
## Data: 2026-08-15

## Resumo das Correções Aplicadas

### Segurança
- Removido `backend/src/.local/.api-key` (segredo commitado)
- Removido `GET /api/auth/key` que expunha API key em texto plano
- Removido `req.query.apiKey` do auth middleware
- Substituído `?token=API_KEY` no WebSocket por header `Authorization: Bearer`
- Limitado `express.json` global de 50MB para 1MB
- Adicionada proteção contra symlinks/junctions via `fs.realpathSync` em `paths.ts`
- Adicionadas ignores específicas no `.gitignore` para `.api-key`, `dispatch-log.json`, `daemon-mapping.json`, `estado.json`
- Criado `SECURITY.md` com política de segredos

### Configuração
- Removido `WORKSPACE` hardcoded de `kilo.jsonc`
- Criado `kilo.local.jsonc` para variáveis locais (ignorado)
- Documentado `data_collection_enabled` no README

### Arquitetura
- `DaemonManager.ts`, `ExecutorKiloDaemon.ts`, `KiloDispatcherService.ts` marcados como `@deprecated`
- Rotas `/dispatch` e `/recuperar` retornam `501 Not Implemented`
- Rotas `/status`, `/handoffs/auto`, `/instancias/:id/modo` permanecem ativas
- Criado `KiloRuntimeAdapter.ts` (interface)
- Criado `ExecutionService.ts` (camada única de execução)
- `MonitoramentoService` refatorado para não depender de `KiloDispatcherService`
- Modos de autonomia unificados: `MANUAL`, `ASSISTIDA`, `AUTONOMA` (removidos `AUTOMATICO`, `HIBRIDO`, `autoApprove`)

### Estados de Tarefa
- `EstadoTarefa` expandido: adicionados `PREPARANDO`, `PAUSANDO`, `CANCELANDO`, `ORFA`, `RECUPERANDO`, `TIMEOUT`
- `transicoes.json` atualizado com novos estados e transições
- `StateMachineService.ts` atualizado com transições padrão

### Heartbeat
- Adicionados campos `ultimoHeartbeat` e `timeoutHeartbeat` ao monitoramento
- Implementados métodos `registrarHeartbeat()` e `verificarOrfaos()`
- Estado `ORFA` adicionado ao `StatusAgente`

### MCP Tools
- Criadas tools: `agentmap_tarefas_prontas_para_worktree`, `agentmap_verificar_dependencias_pendentes`, `agentmap_abrir_worktree`
- Nenhuma tool ativa depende de `DaemonManager`/`ExecutorKiloDaemon`/`KiloDispatcherService`

### Testes
- `DaemonManager.test.ts`, `ExecutorKiloDaemon.test.ts`, `orquestrador-integration.test.ts` marcados como `.skip`
- `tarefa-state-machine.test.ts` atualizado para 18 estados
- Build e testes verdes: 9 suites passam, 3 puladas

### Documentação
- `.ia/contexto/analise-realidade-orquestracao.md` reescrito
- Documento antigo versionado em `.ia/contexto/historico/analise-realidade-orquestracao-2026-08-13.md`
- `.ia/contexto/fluxo-trabalho.md` criado
- `.ia/docs/runbook.md` atualizado
- `SECURITY.md` criado
- README atualizado com configuração do Kilo

## Verificações

| Item | Status |
|------|--------|
| Nenhuma rota ativa retorna sucesso fingido para CLI inexistente | ✅ |
| Tool `verificarDependenciasPendentes` testada | ✅ (via MCP) |
| Testes rodam verdes; caminho morto marcado `.skip` | ✅ |
| Documentação reflete Agent Manager como paralelismo real | ✅ |
| Nenhum segredo commitado; `.gitignore` protege arquivos sensíveis | ✅ |
| `kilo.jsonc` não tem caminhos hardcoded | ✅ |
| Estado de tarefa separado de estado de execução | ✅ |
| Heartbeat implementado com detecção de órfãos | ✅ |
