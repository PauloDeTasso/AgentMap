# Plano Wakeup — Acordar automaticamente o agente principal do Kilo Code

**Status:** consolidado (v1→v4 integrados). Arquitetura validada em duas rodadas de revisão.

> **Nota de estado (2026-08-17):** o backend já implementou `eventSequence` global, polling incremental (`?after=<sequence>`), recurso MCP `agentmap://monitoramento/mensagens/{projetoId}`, EventBus e a tool `agentmap_monitoramento_verificar_pendentes`. O watcher `watcher-wakeup.js` ainda não foi atualizado para usar `eventSequence`, nem implementou filtro de relevância, debounce ou níveis de autonomia. O plano de eventos (`agentmap_eventos_pendentes`/`agentmap_eventos_confirmar`) é um documento separado (`.kilo/plans/1786557839309-evento-coordenacao-plan.md`) e não deve ser confundido com o fluxo de monitoramento/wakeup.

---

## Regra explícita — não modificar o Kilo

O AgentMap e o watcher não devem depender de patch, fork ou alteração de código-fonte da extensão/CLI do Kilo Code para o MVP. Tudo deve funcionar contra o Kilo Code oficial, usando apenas a superfície pública (CLI, HTTP API, configurações documentadas). Se em algum ponto a única solução for modificar o Kilo, isso é sinal para revisar a abordagem, não para forkar o projeto.

---

## Cadeia de Gates

```
GATE -1 (Fase 0 — Viabilidade)
    ↓
GATE 0A/0B/0C/0D (Fase 1 — Transporte Kilo)
    ↓
GATE 1 (Fase 2 — Eventos AgentMap)
    ↓
GATE 2 (Fase 3 — Wake-up fim a fim)
    ↓
GATE 3 (Fase 4 — Coalescing / múltiplos agentes)
    ↓
GATE 4 (Fase 5 — Recuperação / restart)
    ↓
Fase 6 — Escala (2 agentes → 5 agentes)
```

**Regra de evidência:** cada gate, ao ser aprovado, grava um arquivo `gate-<nome>-result.json`, formato mínimo:

```json
{
  "gate": "GATE_-1",
  "status": "APROVADO",
  "data": "2026-08-17T00:00:00Z",
  "kiloVersion": "...",
  "extensionVersion": "...",
  "evidencia": "descrição curta do que foi observado/testado"
}
```

Não avançar para o próximo gate sem esse arquivo existir para o anterior.

---

## Fase 0 — Gate -1 (viabilidade)

Verificar nas configurações da extensão Kilo Code (`kilo-code.*` em `settings.json` do VS Code) se existe opção para apontar o backend para um servidor já em execução, em vez de sempre subir `kilo serve --port 0` automaticamente.

- **APROVADO** → segue para Fase 1.
- **REPROVADO** → o mecanismo de wake-up via UI precisa de outro caminho (ex.: agente principal via CLI puro, abrindo mão da aba gráfica). **Isso não invalida o AgentMap/MCP/eventos — só o mecanismo específico de acordar a conversa visual.**

---

## Fase 1 — Gate 0 (transporte Kilo), quatro testes isolados

**Teste A — servidor sobe:**
```bash
kilo serve --port 4096
curl http://127.0.0.1:4096/global/health
```
Sem senha definida (roda sem proteção, com aviso — só para este teste isolado).

**Teste B — autenticação:**
```bash
KILO_SERVER_PASSWORD="minha-senha-fixa" kilo serve --port 4096
curl -u kilo:minha-senha-fixa http://127.0.0.1:4096/global/health
```
Confirmado: `/global/health` exige Basic Auth quando a senha está definida, mesmo sendo health check — sem atalho. Validar `200` com credencial certa e `401` sem ela.

**Teste C — sessão:**
```bash
kilo session list --format json
```

**Teste D — attach com prova visual (critério reforçado):**
```bash
kilo run --attach http://127.0.0.1:4096 --session <id> --username kilo --password minha-senha-fixa "teste"
```
Não basta o comando retornar sucesso. O critério de aprovação é: **a mensagem precisa aparecer na conversa que já estava aberta na aba do VS Code antes do comando rodar**, e o agente precisa continuar a interação normalmente a partir dali. Comando bem-sucedido sem a mensagem aparecer na aba = Teste D reprovado, mesmo com exit code 0.

---

## Fase 2 — Gate 1 (eventos AgentMap)

**Estado atual (implementado):**

- `eventSequence` (camelCase) é um contador global e monotônico, gerado automaticamente em `adicionarMensagem()` no `MonitoramentoService.ts`.
- Persistido em `.ia/contexto/monitoramento-sequence.json` como `{ ultimoSequence: number }`.
- Todo novo evento recebe `eventSequence = ultimoSequence + 1`.
- O service expõe `listarMensagensApos(after: number, limite = 100)` que retorna `{ mensagens, ultimoEventSequence }`.
- O EventBus publica automaticamente em `agentmap://monitoramento/mensagens` a cada nova mensagem.
- O recurso MCP `agentmap://monitoramento/mensagens/{projetoId?}` existe e é assinável para notificações em tempo real.
- A tool MCP `agentmap_monitoramento_verificar_pendentes` suporta `aposEventSequence` para polling incremental via MCP.

**Limitação atual da API HTTP:**

O endpoint HTTP `GET /api/monitoramento/mensagens` suporta `limite`, `agenteId` e `tipo`, mas **não expõe** o parâmetro `after`/`eventSequence` diretamente. O cursor incremental via HTTP exige que o watcher faça fetch de mensagens e filtre client-side por `eventSequence > ultimo_processado`. O suporte a `after` no HTTP endpoint é um item de evolução futura.

---

## Fase 3 — Gate 2 (wake-up fim a fim)

Filtro do watcher (validação defensiva):
```
destinatario === agente_principal
AND projeto === projeto_atual
AND tipo IN (TASK_COMPLETED, HANDOFF_COMPLETED, BLOCKED, APPROVAL_REQUIRED)
AND status === PENDENTE
AND eventSequence > ultimo_processado   ← checagem defensiva
```

Três níveis de autonomia (`WATCHER_AUTONOMY_LEVEL`):
- `WAKE_ONLY` — sem `--auto`
- `WAKE_AND_CONTINUE` — sem `--auto`, permissões normais do projeto
- `FULL_AUTONOMY` — com `--auto`, só quando habilitado explicitamente

---

## Fase 4 — Gate 3 (coalescing)

Janela de debounce de 2–5 segundos: primeiro evento relevante abre a janela, eventos adicionais que cheguem no meio tempo entram no mesmo lote, um único prompt resume tudo ao fechar a janela.

---

## Fase 5 — Gate 4 (recuperação/restart)

Cenários a testar antes de considerar o MVP confiável:

1. AgentMap cai e volta — watcher, ao reconectar, consulta o cursor (`ultimoEventSequence`) e recupera exatamente os eventos perdidos, nem mais nem menos.
2. Kilo/VS Code reinicia — nova porta/sessão (se ainda depender do servidor automático da extensão) ou mesma porta/sessão (se Fase 0 permitiu servidor externo fixo); watcher precisa se re-adaptar sem intervenção manual.
3. O próprio processo do watcher reinicia — estado (`watcher-state.json`) precisa sobreviver ao restart e retomar do ponto certo, sem reprocessar nem perder eventos.

Critério de aprovação: em nenhum desses três cenários o sistema perde uma mensagem de agente filho nem duplica um wake-up.

---

## Fase 6 — Escala

Teste com 2 agentes filhos terminando quase juntos → depois com 5, validando o coalescing (Fase 4) sob carga real.

---

## Riscos remanescentes

- Concorrência painel aberto + injeção externa simultânea — sem documentação oficial, resolve só na prática (parte do Teste D).
- Rota B (inspeção de processo em nível de SO para extrair senha da extensão) permanece fora da arquitetura oficial — diagnóstico pontual apenas, nunca dependência de produção.

---

## Referências (fontes reais consultadas)

- `ServerManager`, geração de senha e spawn do servidor da extensão — DeepWiki, `Kilo-Org/kilocode`, "CLI Backend Connection" (`packages/kilo-vscode/src/services/cli-backend/server-manager.ts`)
- Rotas `/global/*` e exigência de Basic Auth — DeepWiki, "HTTP Server and REST API" (`packages/opencode/src/server/server.ts`)
- `/global/health` exige Basic Auth mesmo sendo health check — issue pública no repositório upstream do mesmo motor (`anomalyco/opencode`, issue #12805)
- `SECURITY.md` e `TESTING.md` oficiais do repositório `Kilo-Org/kilocode`
- Kilo CLI — referência de comandos: `kilo.ai/docs/code-with-ai/platforms/cli-reference`
- AgentMap backend: `MonitoramentoService.ts`, `monitoramento.ts` (API), `monitoramento-resource.ts` (MCP resource), `monitoramento-wakeup.ts` (MCP tool)
