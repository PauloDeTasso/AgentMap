# ERROS E LIMITAÇÕES ATUAIS DO AGENTMAP
## Data: 2026-08-15

Este documento lista apenas erros, limitações e pontos de atenção **ainda não resolvidos** no código atual.

---

## 1. SEGURANÇA (Crítico/Alto)

### 1.1 Command Injection em `/api/arquivos/explorer`
- **Severidade:** CRÍTICA
- **Arquivo:** `backend/src/api/arquivos.ts`
- **Problema:** Usa `exec` com string contendo caminho do usuário
- **Impacto:** Execução arbitrária de comandos
- **Status:** Documentado em `AUDITORIA_SEGURANCA.md`

### 1.2 WebSocket sem validação de origem
- **Severidade:** ALTA
- **Arquivo:** `backend/src/websocket/monitoramento.ts`
- **Problema:** Ausência de `verifyClient` no handshake
- **Impacto:** Qualquer origem pode conectar
- **Status:** Documentado em `AUDITORIA_SEGURANCA.md`

### 1.3 CORS dinâmico sem validação de origins
- **Severidade:** ALTA
- **Arquivo:** `backend/src/servicios/CorsService.ts`
- **Problema:** Atualiza dinamicamente sem allowlist
- **Impacto:** Possível bypass de restrições CORS
- **Status:** Documentado em `AUDITORIA_SEGURANCA.md`

### 1.4 CSRF validação incompleta
- **Severidade:** ALTA
- **Arquivo:** `backend/src/seguranca/csrf.ts`
- **Problema:** Validação Origin/Referer incompleta
- **Impacto:** Bypass de proteção CSRF
- **Status:** Documentado em `AUDITORIA_SEGURANCA.md`

### 1.5 Rate limit apenas em memória
- **Severidade:** MÉDIA
- **Arquivo:** `backend/src/app.ts`
- **Problema:** Reinicia a cada startup, não compartilhado entre instâncias
- **Impacto:** Proteção temporária apenas
- **Status:** Implementado mas limitado

---

## 2. CÓDIGO DEPRECATED (Baixo risco)

### 2.1 Serviços deprecated ainda presentes
- `DaemonManager.ts` — depende de CLI inexistente
- `ExecutorKiloDaemon.ts` — depende de CLI inexistente
- `KiloDispatcherService.ts` — rotas retornam 501
- **Impacto:** Código morto que pode causar confusão
- **Status:** Marcados `@deprecated`, rotas retornam 501

### 2.2 Testes de código deprecated
- `backend/testes/DaemonManager.test.ts` — `.skip`
- `backend/testes/ExecutorKiloDaemon.test.ts` — `.skip`
- `backend/testes/orquestrador-integration.test.ts` — `.skip`
- **Impacto:** Testes mortos ocupando espaço
- **Status:** Pulados, mas podem ser removidos

---

## 3. DOCUMENTAÇÃO INCOMPLETA (Médio risco)

### 3.1 Guias ainda mencionam CLI Kilo
- `.ia/docs/guias/quick-reference.md` — parcialmente atualizado
- `.ia/docs/guias/guia-agentes-monitoramento.md` — atualizado
- `.ia/docs/guias/guia-novos-agentes-monitoramento.md` — atualizado
- `.ia/docs/guias/guia-usuario-monitoramento.md` — atualizado

### 3.2 Pastas obrigatórias inexistentes
- `.ia/procedimentos/` — documentada mas não existe
- `.ia/orquestrador/` — documentada mas não existe
- `.ia/fluxo-desenvolvimento.json` — documentado mas não existe
- **Impacto:** Checklist de projetos pode falhar
- **Status:** Documentação desatualizada

### 3.3 Contratos registrados mas inexistentes
- `.ia/contratos/contratos.json` registra 11 contratos
- Apenas `contratos.json` existe, os arquivos individuais não
- **Impacto:** Validação de contratos pode falhar
- **Status:** Documentação desatualizada

---

## 4. COMPATIBILIDADE (Baixo risco)

### 4.1 `prioridade` com casing inconsistente
- `backend/esquemas/tarefa.schema.json` usa minúsculas (`baixa`, `media`, `alta`, `critica`)
- Outros schemas usam maiúsculas (`BAIXA`, `MEDIA`, `ALTA`, `CRITICA`)
- **Impacto:** Validação pode falhar dependendo do caso
- **Status:** Documentado em relatório de auditoria

### 4.2 `aprovacao.estado` com valor fantasma
- Código usa `'nao_solicitada'` hardcoded
- Não existe em `AprovacaoSolicitacao` type nem em schemas
- **Impacto:** Estado não tipado e não validado
- **Status:** Documentado em relatório de auditoria

### 4.3 `getDirPorEstado` com fallback perigoso
- Estados não mapeados caem em `'rascunho'`
- **Impacto:** Possível perda de dados de tarefas
- **Status:** Documentado em relatório de auditoria

---

## 5. O QUE JÁ FOI CORRIGIDO (histórico)

| Item | Status | Commit |
|------|--------|--------|
| Código morto: ExecutionService, KiloRuntimeAdapter | ✅ Removido | `1ae1dec` |
| Tipos duplicados: TipoEvento, ModoAutonomia, EstadoTarefa | ✅ Corrigido | `a54c01f` |
| Schema tarefa incompleto (faltavam 7 estados) | ✅ Corrigido | `1ae1dec` |
| MCP tools não registradas (worktree.ts) | ✅ Corrigido | `1ae1dec` |
| Retornos de erro MCP inconsistentes | ✅ Corrigido | `1ae1dec` |
| Documentação: modos AUTOMÁTICO/HÍBRIDO | ✅ Corrigido | `1ae1dec` |
| Documentação: referências a CLI Kilo | ✅ Corrigido | `1ae1dec` |
| Segurança: path traversal, API key exposta | ✅ Corrigido | commits anteriores |
| Build e testes verdes | ✅ Verde | `1ae1dec` |

---

## 6. AÇÕES RECOMENDADAS (próximos passos)

1. **P0:** Corrigir command injection em `/api/arquivos/explorer`
2. **P0:** Implementar `verifyClient` no WebSocket
3. **P1:** Remover ou refatorar `.ia/procedimentos/` e `.ia/orquestrador/` da documentação até implementados
4. **P1:** Remover serviços deprecated (`DaemonManager`, `ExecutorKiloDaemon`, `KiloDispatcherService`)
5. **P1:** Corrigir casing de `prioridade` nos schemas
6. **P2:** Implementar rate limit persistente (não apenas em memória)
7. **P2:** Corrigir `aprovacao.estado` fantasma e `getDirPorEstado` fallback
