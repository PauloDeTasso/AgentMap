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
       |--- Caminho B (fallback): watcher-wakeup.js polla ?after=<eventSequence>,
            filtra tipos relevantes e injeta prompt via `kilo run --attach`
```

## O que já está implementado no backend

- `eventSequence` global + persistência em `.ia/contexto/monitoramento-sequence.json`
- Polling incremental: `GET /api/monitoramento/mensagens?after=<sequence>`
- Recurso MCP assinável: `agentmap://monitoramento/mensagens/{projetoId}`
- EventBus publish automático em `adicionarMensagem()`
- Auto-subscribe instruction em `agentmap_workflows_iniciar_trabalho`
- Filtro de relevância por tipos (`KILO_CHAT_REPLY`, `AGENTE_FILHO_RESULTADO`, etc.)

## O que ainda falta (Caminho B — watcher)

O watcher `PLANO GERAL/UPDATE/watcher-wakeup.js` está funcional, mas precisa de
configuração manual do usuário para funcionar contra a extensão VS Code.

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
| `WATCHER_DEBOUNCE_MS` | Janela de agrupamento (ms) | `3000` |
| `WATCHER_AUTONOMY_LEVEL` | `WAKE_ONLY`, `WAKE_AND_CONTINUE`, `FULL_AUTONOMY` | `WAKE_ONLY` |

### Como rodar

```bash
node "PLANO GERAL/UPDATE/watcher-wakeup.js"
```

Logs em `.agentmap/watcher-wakeup.log`.

## Validação

- **Fase 1** — `eventSequence` + polling incremental: validado via script `backend/validar-wakeup.cjs`
- **Fase 4** — Filtro de relevância: validado via API
- **Fase 2/3** — Recurso MCP + EventBus + auto-subscribe: código implementado e compilando
- **Fase 5** — Watcher: código funcional, depende de configuração manual da sessão Kilo (Gate -1)

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
