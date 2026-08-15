# Diagnóstico Inicial — AgentMap
## Data: 2026-08-15

## 0.1 Presença de `backend/src/.local/.api-key`
- **Status:** Confirmado existente.
- **Ação:** Removido em Fase 0.

## 0.2 Arquivos versionados (`node_modules/`, `dist/`)
- **Status:** Nenhum arquivo dentro de `node_modules/` ou `dist/` está no índice do Git.
- **Conclusão:** Não há necessidade de remover do controle de versão.

## 0.3 Caminho hardcoded em `KiloDispatcherService.ts`
- **Arquivo:** `backend/src/servicios/KiloDispatcherService.ts`
- **Linha:** 192-194
- **Conteúdo:** `C:\Users\Administrator\AppData\Roaming\npm\kilo.cmd`
- **Ação:** Remover caminho absoluto (Fase 3.1.2).

## 0.4 Versão Kilo hardcoded em `OrquestradorService.ts`
- **Arquivo:** `backend/src/servicios/OrquestradorService.ts`
- **Linha:** 75
- **Conteúdo:** `versaoKilo: '7.4.21'`
- **Ação:** Tornar dinâmico ou remover hardcode (Fase 3.2).

## 0.5 `req.query.apiKey` em rotas de auth
- **Arquivo:** `backend/src/seguranca/auth.ts`
- **Linha:** 23
- **Conteúdo:** `req.query.apiKey` é aceito como fallback de autenticação.
- **Ação:** Remover `req.query.apiKey` e `GET /api/auth/key` (Fase 1.1.5).

## 0.6 `?token=API_KEY` no WebSocket
- **Arquivo:** `backend/src/websocket/monitoramento.ts`
- **Linha:** 21
- **Conteúdo:** `url.searchParams.get('token')` aceita API key na URL.
- **Ação:** Substituir por header `Authorization` (Fase 1.1.4).

## 0.7 `npm ci` e `npm run build`
- **`npm ci`:** Concluído com sucesso. 497 pacotes instalados.
- **`npm run build`:** Concluído com sucesso. Sem erros de TypeScript.

## 0.8 `npm test`
- **Resultado:** 3 suites falharam, 9 passaram.
- **Falhas confirmadas:**
  - `testes/DaemonManager.test.ts` — depende de `kilo daemon` (CLI inexistente).
  - `testes/ExecutorKiloDaemon.test.ts` — depende de `kilo run` (CLI inexistente).
  - `testes/tarefa-state-machine.test.ts` — 1 falha: teste espera 11 estados, enum possui 12.
- **Conclusão:** As falhas do DaemonManager e ExecutorKiloDaemon confirmam o código morto. A falha do state-machine indica gap no enum `EstadoTarefa` (Fase 4.1.1).

## 0.9 Documento antigo versionado
- **Origem:** `.ia/contexto/analise-realidade-orquestracao.md`
- **Destino:** `.ia/contexto/historico/analise-realidade-orquestracao-2026-08-13.md`

## 0.10 Outras confirmações
- `express.json` global 50MB confirmado em `backend/src/app.ts:62`.
- `WORKSPACE` hardcoded confirmado em `kilo.jsonc:9`.
- `data_collection_enabled: true` confirmado em `kilo.jsonc:17-21` sem documentação explícita.
- `.gitignore` já cobre `.local/`, `node_modules/`, `dist/`, `logs/`. Faltam ignores específicas para arquivos de dispatch/daemon.
