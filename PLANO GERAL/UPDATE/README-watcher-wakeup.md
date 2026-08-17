# Wake-up automático do agente principal

## Objetivo

Quando um agente filho reporta resultado no AgentMap, o agente principal (pai)
deve ser acordado automaticamente na UI do VS Code / Kilo Code, sem intervenção
manual.

## Arquitetura final

```
Filho (Agent Manager worktree)
  -> HTTP POST /api/monitoramento/mensagens
  -> Backend salva + EventBus publish
  -> MCP notifications/resources/updated
       |
       |--- Caminho A (preferido): Kilo Code recebe notificação MCP e reativa o agente
       |
       |--- Caminho B (fallback): watcher-wakeup.js polla via HTTP,
            filtra client-side por eventSequence e tipos relevantes,
            e injeta prompt via `kilo run --attach`
```

## O que já está implementado no backend

- `eventSequence` global e monotônico, gerado automaticamente em `adicionarMensagem()` no `MonitoramentoService.ts`
- Persistência do cursor em `.ia/contexto/monitoramento-sequence.json` como `{ ultimoSequence: number }`
- Service method `listarMensagensApos(after: number, limite = 100)` retorna `{ mensagens, ultimoEventSequence }`
- Polling via HTTP: `GET /api/monitoramento/mensagens` suporta `limite`, `agenteId`, `tipo`. **Nota:** o parâmetro `after` não está exposto no HTTP endpoint — o watcher faz fetch e filtra client-side por `eventSequence > ultimo_processado`.
- Polling via MCP tool: `agentmap_monitoramento_verificar_pendentes` suporta `aposEventSequence` para polling incremental com filtro de relevância embutido.
- Recurso MCP assinável: `agentmap://monitoramento/mensagens/{projetoId?}`
- EventBus publish automático em `adicionarMensagem()` para `agentmap://monitoramento/mensagens`
- Tipos relevantes filtrados: `KILO_CHAT_REPLY`, `AGENTE_FILHO_RESULTADO`, `WAKEUP_PARENT`, `KILO_CHAT`, `KILO_REPLY`, `KILO_RESULT`

> **Nota:** o prompt de `agentmap_workflows_iniciar_trabalho` ainda não instrui o auto-subscribe no recurso de monitoramento. Isso é um passo pendente de integração, não um bloqueio do watcher.

## O que ainda falta (Caminho B — watcher)

O watcher `PLANO GERAL/UPDATE/watcher-wakeup.js` existe como esqueleto funcional de polling. **Estado atual após revisão:**

- Filtro de relevância implementado com tipos `TASK_COMPLETED`, `HANDOFF_COMPLETED`, `BLOCKED`, `APPROVAL_REQUIRED`
- Usa `eventSequence` como cursor incremental (client-side, pois o HTTP endpoint não expõe `after`)
- Estado local salvo em `.agentmap/watcher-state.json` com `ultimoEventSequence`
- Janela de debounce/coalescing implementada (`WATCHER_DEBOUNCE_MS`, default 5000ms)
- Três níveis de autonomia implementados (`WATCHER_AUTONOMY_LEVEL`: `WAKE_ONLY`, `WAKE_AND_CONTINUE`, `FULL_AUTONOMY`)
- Default de `AGENTMAP_API_URL` corrigido para `3150`
- Ainda dependente de configuração manual da sessão Kilo (Gate -1)

### Gate -1 (você precisa fazer)

A extensão Kilo Code sobe `kilo serve --port 0` com senha gerada
automaticamente. Para o watcher injetar na sessão existente, você tem duas
opções:

**Opção 1 (recomendada): usar o próprio watcher como servidor Kilo**
- Rode `kilo serve --port 4096` (ou outra porta fixa) em um terminal separado.
- Apontar a extensão VS Code para esse servidor, se a extensão permitir.
- O watcher já usa essa porta/config em `.agentmap/kilo-session.json`.

**Opção 2: agente principal roda via CLI puro**
- Não usa a aba gráfica da extensão.
- O watcher injeta no processo CLI diretamente.

### Configuração do watcher

Crie `.agentmap/kilo-session.json` na raiz do projeto ou no `cwd` do watcher:

```json
{
  "port": 4096,
  "username": "kilo",
  "password": "sua-senha-aqui",
  "sessionId": "ses_abc123",
  "updatedAt": "2026-08-17T12:00:00.000Z"
}
```

Para descobrir `sessionId`:
```bash
kilo session list --format json
```

Para descobrir a porta/senha do servidor da extensão (Windows):
```powershell
Get-Process -Name "kilo*" -ErrorAction SilentlyContinue
# ou procurar porta em uso pelo processo filho da extensão
```

### Variáveis de ambiente

| Variável | Descrição | Default |
|---|---|---|
| `AGENTMAP_API_URL` | URL da API do AgentMap | `http://localhost:3150` |
| `AGENTMAP_API_TOKEN` | API key se configurada | `null` |
| `KILO_SESSION_CONFIG_PATH` | Caminho do config de sessão | `.agentmap/kilo-session.json` |
| `WATCHER_POLL_INTERVAL_MS` | Intervalo de polling (ms) | `20000` |

> **Nota:** `WATCHER_DEBOUNCE_MS` e `WATCHER_AUTONOMY_LEVEL` estão documentados no plano v4 mas **ainda não implementados** no `watcher-wakeup.js`.

### Como rodar

```bash
node "PLANO GERAL/UPDATE/watcher-wakeup.js"
```

Logs em `.agentmap/watcher-wakeup.log`.

## Validação

- **Fase 1** — `eventSequence` + polling incremental: validado via script `backend/validar-wakeup.cjs`
- **Fase 4** — Filtro de relevância por tipo: validado via API (`?tipo=WAKEUP_PARENT`)
- **Fase 2/3** — Recurso MCP + EventBus: código implementado e compilando. Auto-subscribe instruction no prompt de `agentmap_workflows_iniciar_trabalho` ainda **não implementado**.
- **Fase 5** — Watcher: polling funcional com `eventSequence`, filtro de relevância, debounce/coalescing e níveis de autonomia implementados. Depende de configuração manual da sessão Kilo (Gate -1).

## Riscos conhecidos

- Extensão VS Code pode não aceitar servidor externo → sem essa config, o watcher
  não consegue injetar na aba gráfica.
- `kilo run --attach` pode ter problema de auth se porta/senha estiverem erradas.
- Concorrência entre UI aberta e injeção externa não é documentada oficialmente.

## Próximos passos

1. Você configura `.agentmap/kilo-session.json` com a sessão ativa.
2. Rode o watcher: `node "PLANO GERAL/UPDATE/watcher-wakeup.js"`
3. Envie um agente filho reportar resultado.
4. Confira se o pai acordou automaticamente.

> **Aviso:** o watcher atual é um esqueleto. Ele consulta a API do AgentMap, mas ainda falta implementar filtro de relevância, troca de `since_id` por `eventSequence`, debounce/coalescing e níveis de autonomia antes de considerar o wake-up confiável.
