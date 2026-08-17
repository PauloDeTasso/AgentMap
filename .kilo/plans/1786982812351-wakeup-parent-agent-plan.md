# Plano v5 (implementação) — Wake-up automático do agente principal Kilo Code

**Consolidado de v1–v4-2 + análise do codebase real do AgentMap.**  
Foco: fazer funcionar contra o código existente, sem modificar o Kilo Code, com fallback pragmático para o Gate -1.

---

## 0. O problema em termos do AgentMap

Quando um agente filho (Agent Manager worktree) termina uma tarefa e reporta resultado via `kilohub_report_result` ou `POST /api/monitoramento/mensagens`, a tela de monitoramento recebe a resposta. O agente principal (pai), que está na aba do VS Code / Kilo Code, precisa ser manualmente acordado para ler essa resposta. Queremos eliminar esse passo manual.

---

## 1. Arquitetura alvo (3 caminhos, do mais confiável ao menos)

### Caminho A — MCP Subscription no próprio agente pai (preferido, sem dependência externa)

O agente principal já está conectado ao AgentMap via MCP stdio. Se ele tiver emitido `subscriptions/listen` para um recurso de monitoramento, o AgentMap pode enviar `notifications/resources/updated` diretamente para ele. O Kilo Code, ao receber a notificação, reativa o agente e ele processa a nova mensagem.

**Vantagem:** zero dependência de `kilo serve` externo, zero descoberta de porta/senha, funciona com a infraestrutura que já existe.  
**Desafio:** o agente pai precisa estar inscrito no recurso antes de ficar ocioso.  
**Status no codebase:** parcialmente implementado — EventBus + SubscriptionManager funcionam, mas não há recurso de monitoramento assinável ainda.

### Caminho B — Watcher externo + `kilo run --attach` (v1–v4, mantido como fallback)

Um processo Node.js separado (`watcher-wakeup.js`) faz polling na API do AgentMap e, ao detectar mensagem nova relevante, injeta um prompt na sessão do Kilo Code via `kilo run --attach`. Requer conhecer porta, senha e session ID.

**Desafio:** Gate -1 — a extensão VS Code sobe `kilo serve --port 0` com senha gerada automaticamente. Sem modificar o Kilo, a única rota sustentável no Windows é o usuário rodar seu próprio `kilo serve` com porta/senha fixas e configurar a extensão para apontar para ele (se a extensão suportar). Se não suportar, esse caminho vira inviável sem fork.

### Caminho C — WebSocket + extensão do agente pai (pragmático, intermediário)

O backend já tem WebSocket (`/ws/monitoramento`) que empurra `mensagem_nova` para todos os clientes conectados. Se a tela de monitoramento (ou um cliente WebSocket dedicado) estiver aberta, o watcher pode detectar a mensagem por WebSocket em vez de polling. Em seguida, o mesmo watcher injeta via `kilo run --attach`. Reduz latência mas não resolve o Gate -1.

---

## 2. Decisão de arquitetura recomendada

Implementar **Caminho A** como solução principal e **Caminho B** como fallback opcional:

- **Fase 1 (obrigatória):** expor monitoramento como recurso MCP assinável + garantir que o EventBus publique nele. O agente pai se inscreve antes de enviar o filho. Quando o filho reporta, o pai recebe `notifications/resources/updated` e automaticamente consulta o recurso para ler a resposta.
- **Fase 2 (opcional, condicional a Gate -1):** implementar watcher-wakeup.js com `kilo run --attach`. O usuário opta por esse caminho apenas se quiser injeção direta na UI do VS Code sem passar pelo fluxo MCP do agente.

Se o Caminho A for suficiente para o uso real (o agente pai lê a resposta automaticamente via MCP), o Caminho B pode ser adiado ou descartado.

---

## 3. Fases de implementação

### Fase 1 — Cursor/monotonicidade em mensagens de monitoramento

**Objetivo:** permitir polling incremental sem timestamp heurístico.

**Arquivo alterado:** `backend/src/servicios/MonitoramentoService.ts`, `backend/src/api/monitoramento.ts`

**Mudanças:**
- Adicionar campo `eventSequence` (number, global, monotônico) a cada `MensagemMonitoramento`.
- Incrementar automaticamente ao `adicionarMensagem()`. Usar um contador em memória + arquivo `.ia/contexto/monitoramento-sequence.json` para persistir entre restarts.
- No `listarMensagens()`, manter ordem cronológica crescente (não `reverse()`).
- Novo endpoint `GET /api/monitoramento/mensagens?after=<sequence>` retorna apenas mensagens com `eventSequence > after`.
- Retornar também o `ultimoEventSequence` disponível no headers ou no body para o cliente saber até onde leu.

**Validação:** criar 3 mensagens, consultar `?after=0`, confirmar que retorna só as novas.

---

### Fase 2 — Recurso MCP de monitoramento assinável

**Objetivo:** permitir que o agente pai receba notificações em tempo real quando o filho reportar.

**Arquivos alterados/criados:**
- `backend/src/mcp-server/resources/monitoramento-resource.ts` (novo)
- `backend/src/mcp-server/resources/index.ts` (registrar novo resource)
- `backend/src/servicios/MonitoramentoService.ts` (publish no EventBus ao adicionar mensagem)

**Mudanças:**
- Registrar recurso `agentmap://monitoramento/mensagens` com template `agentmap://monitoramento/mensagens/{projetoId?}`.
- O handler do resource retorna as últimas N mensagens de monitoramento.
- No `MonitoramentoService.adicionarMensagem()`, após salvar, publicar no `globalEventBus`:
  ```ts
  globalEventBus.publish({ uri: 'agentmap://monitoramento/mensagens', timestamp: Date.now(), reason: 'nova_mensagem' });
  ```
- Garantir que o `EventBus` já está conectado ao `SubscriptionManager` em `resources/index.ts` (já está, manter).
- O agente pai, antes de enviar o filho, executa:
  ```
  subscriptions/listen com resourceSubscriptions: ["agentmap://monitoramento/mensagens"]
  ```
  Isso mantém uma promise pendente. Quando o filho reportar, o servidor envia `notifications/resources/updated` com `_meta.subscriptionId`. O cliente Kilo Code recebe, resolve a promise, e o agente é reativado para processar.

**Validação:** 
1. Abrir projeto no AgentMap.
2. Cliente MCP executa `subscriptions/listen` para o recurso.
3. Outro cliente (ou o mesmo via API) cria mensagem de monitoramento.
4. Cliente MCP recebe `notifications/resources/updated` e pode ler o recurso atualizado.

---

### Fase 3 — Auto-subscribe do agente pai no início do trabalho

**Objetivo:** garantir que o pai esteja inscrito quando o filho for enviado.

**Arquivo alterado:** `backend/src/mcp-server/tools/workflows.ts`

**Mudanças:**
- Em `agentmap_workflows_iniciar_trabalho`, após criar a sessão, adicionar ao resultado uma instrução/ hint de que o agente deve se inscrever em `agentmap://monitoramento/mensagens` via `subscriptions/listen` antes de proseguir.
- Alternativamente (mais automático): se o MCP server suportar, o `iniciar_trabalho` pode retornar uma `prompt` ou `instruction` que orienta o agente a executar o subscribe. Mas isso depende de o Kilo Code processar instruções do MCP server — não documentado oficialmente.
- **Abordagem segura:** documentar no onboarding/playbook do AgentMap que agentes que enviam filhos devem se inscrever no recurso de monitoramento.

**Validação:** simular fluxo completo — pai inicia trabalho, filho reporta, pai recebe notificação.

---

### Fase 4 — Tipos de mensagem e filtro de relevância

**Objetivo:** distinguir "mensagem de wake-up" de outras mensagens de monitoramento.

**Arquivos alterados:** `backend/src/tipos/index.ts`, `backend/src/servicios/MonitoramentoService.ts`

**Mudanças:**
- Adicionar ao enum/tipos de `MensagemMonitoramento.tipo` os valores:
  - `KILO_CHAT_REPLY` — resposta de um agente filho para o pai (já existe no código da API)
  - `AGENTE_FILHO_RESULTADO` — resultado final de tarefa executada por filho
  - `WAKEUP_PARENT` — notificação interna de wake-up
- No watcher (Fase 5) e no filtro do pai, considerar relevante apenas `tipo IN (KILO_CHAT_REPLY, AGENTE_FILHO_RESULTADO, WAKEUP_PARENT)`.

**Validação:** postar mensagens de cada tipo, confirmar filtragem.

---

### Fase 5 — Watcher-wakeup.js (Caminho B, opcional)

**Objetivo:** processo externo que injeta prompt na sessão do Kilo Code via CLI.

**Pré-requisito:** Gate -1 resolvido (usuário tem `kilo serve` externo com porta/senha fixas, ou descobriu porta da extensão).

**Arquivos alterados/criados:**
- `PLANO GERAL/UPDATE/watcher-wakeup.js` (reescrever, substituir TODOs por implementação real)

**Mudanças:**
- Carregar config de `.agentmap/kilo-session.json` (porta, username, password, sessionId).
- Implementar polling em `/api/monitoramento/mensagens?after=<eventSequence>` (usar `eventSequence` da Fase 1).
- Filtro real: `destinatario === pai AND tipo IN (KILO_CHAT_REPLY, AGENTE_FILHO_RESULTADO) AND eventSequence > ultimo_processado`.
- Debounce/coalescing: janela de 3s. Primeiro evento abre janela, eventos adicionais entram no lote, um único prompt resume tudo.
- Três níveis de autonomia via env `WATCHER_AUTONOMY_LEVEL`:
  - `WAKE_ONLY` — sem `--auto`
  - `WAKE_AND_CONTINUE` — sem `--auto`, permissões normais
  - `FULL_AUTONOMY` — com `--auto`
- Persistir estado em `.agentmap/watcher-state.json` (`ultimoEventSequence`, `ultimoTimestamp`).
- Logs em `.agentmap/watcher-wakeup.log`.

**Validação:** ver seção 5 dos planos v1–v4.

---

### Fase 6 — Auto-detecção e re-subscribe após restart

**Objetivo:** robustez contra quedas.

**Mudanças:**
- No MCP client do agente pai (lado do Kilo Code, não controlado por nós): após reconnect stdio, re-emitir `subscriptions/listen`. Isso é responsabilidade do cliente MCP, não do servidor.
- No backend: o `EventBus` já é in-process, então se o servidor MCP reiniciar, inscrições são perdidas. Adicionar um endpoint ou mecanismo para o cliente re-subscribir automaticamente ao reconectar.
- No watcher: estado em arquivo (`watcher-state.json`) sobrevive a restart do processo.

**Validação:** matar o backend e religar, confirmar que watcher retoma do ponto certo.

---

## 4. Gate -1: viabilidade do Caminho B

Este é o único gate que não é resolvido dentro do AgentMap. O agente responsável por implementar as Fases 1–5 deve, **antes de anything mais**, executar:

1. Abrir `settings.json` do VS Code e procurar por configurações `kilo-code.*` que permitam apontar para um servidor já existente (ex.: `kilo-code.server.url`, `kilo-code.server.port`).
2. Se existir: documentar a config e seguir com Fase 5.
3. Se não existir: Caminho B fica bloqueado. Implementar apenas Fases 1–4 (Caminho A) e reportar como limitação documentada.

---

## 5. Filtro de relevância (compartilhado entre Fases 2, 4 e 5)

Critério mínimo para disparar wake-up:

```
tipo IN (KILO_CHAT_REPLY, AGENTE_FILHO_RESULTADO, WAKEUP_PARENT)
AND destinatario == agente_principal (ou agenteId do pai)
AND projeto == projeto_atual
AND eventSequence > ultimo_processado
```

Se a mensagem não tiver `destinatario` explícito, usar `agenteId` do emissor vs. lista de agentes pai/filho do projeto.

---

## 6. Níveis de autonomia do watcher (Fase 5)

Configurar via variável de ambiente `WATCHER_AUTONOMY_LEVEL`:

| Valor | Comportamento |
|-------|--------------|
| `WAKE_ONLY` | Injeta mensagem sem `--auto`. Agente pai pede aprovação normalmente. |
| `WAKE_AND_CONTINUE` | Injeta sem `--auto`. Respeita permissões do `kilo.jsonc` do projeto. |
| `FULL_AUTONOMY` | Injeta com `--auto`. Apenas se usuário habilitar explicitamente. |

Default: `WAKE_ONLY`.

---

## 7. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Concorrência: pai digitando enquanto watcher injeta | Testar no Gate 0 do Caminho B. Caminho A não tem esse risco (notificação MCP é não-bloqueante). |
| Senha do `kilo serve` da extensão não descoberta | Caminho A elimina esse risco. Caminho B exige Gate -1. |
| Perda de eventos se backend cair | `eventSequence` global + estado do watcher em arquivo permite recuperação exata. |
| Duplicação de wake-up | `KiloIdempotencyService` já existe para `kilohub_report_*`. Watcher usa `ultimoEventSequence` como cursor idempotente. |
| Agente pai não processa notificação MCP | Documentar que o pai deve executar `subscriptions/listen` antes de enviar filhos. Adicionar ao onboarding. |

---

## 8. Ordem de execução recomendada

```
Fase 1 — eventSequence em mensagens de monitoramento
    ↓
Fase 4 — tipos de mensagem e filtro (pode ser paralelo à Fase 1)
    ↓
Fase 2 — recurso MCP assinável + EventBus publish
    ↓
Fase 3 — auto-subscribe no início do trabalho
    ↓
Fase 6 — recuperação/restart
    ↓
[Validar Caminho A fim a fim]
    ↓
Gate -1 — investigar viabilidade do Caminho B
    ↓ (se aprovado)
Fase 5 — watcher-wakeup.js funcional
```

Fases 1, 2, 3, 4, 6 são backend puro e implementáveis agora.  
Fase 5 é condicional ao Gate -1.

---

## 9. Validação obrigatória

Para cada fase, registrar evidência em `.agentmap/gates/<gate>-result.json`:

```json
{
  "gate": "FASE-1",
  "status": "APROVADO",
  "data": "<ISO>",
  "evidencia": "<descrição do teste e resultado>"
}
```

Testes específicos:

- **Fase 1:** criar 5 mensagens, consultar `?after=0`, `?after=3`, confirmar contagem correta. Após restart do backend, consultar `?after=ultimo` e confirmar que retorna vazio (não duplica).
- **Fase 2:** cliente MCP faz `subscriptions/listen` para `agentmap://monitoramento/mensagens`. Outro processo cria mensagem. Cliente recebe `notifications/resources/updated`. Cliente lê recurso e vê a nova mensagem.
- **Fase 3:** pai executa `workflows_iniciar_trabalho`. Confirmar que instrução de subscribe está presente no resultado. Filho executa `kilohub_report_result`. Pai recebe notificação.
- **Fase 4:** criar mensagens de cada tipo novo. Confirmar que filtro aceita apenas os tipos esperados.
- **Fase 5:** (condicional) watcher detecta mensagem nova, injeta via `kilo run --attach`, mensagem aparece na aba do VS Code.
- **Fase 6:** matar backend, religar, criar mensagem, cliente MCP re-subscribe e recebe notificação.

---

## 10. Referências

- Codebase analisado: `backend/src/api/monitoramento.ts`, `backend/src/api/eventos.ts`, `backend/src/servicios/MonitoramentoService.ts`, `backend/src/mcp-server/` (server, resources, subscriptions, events), `backend/src/servicios/KiloDiscoveryService.ts`, `backend/src/servicios/KiloIdempotencyService.ts`, `backend/src/tipos/index.ts`
- Planos anteriores: `PLANO GERAL/UPDATE/PLANO-WAKEUP-AGENTE-PRINCIPAL-KILOCODE-v1.md` até `v4-2.md`
- Stub existente: `PLANO GERAL/UPDATE/watcher-wakeup.js`
- Kilo CLI reference: `kilo.ai/docs/code-with-ai/platforms/cli-reference`
- Kilo VS Code extension architecture: `kilo.ai/docs/contributing/architecture/vscode-extension`
- MCP 2026 subscriptions: `@modelcontextprotocol/sdk` v1.30.0 (já em uso no projeto)
