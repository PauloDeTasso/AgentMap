# Plano v3 (consolidado) — Acordar automaticamente o agente principal do Kilo Code

**Muda em relação à v2:** formaliza os Gates como uma cadeia de dependência explícita, corrige a decomposição de testes do Gate 0 (achado: `/global/health` exige Basic Auth quando a senha está definida — não existe endpoint verdadeiramente público quando o servidor roda protegido), adiciona regra explícita de não modificar o código-fonte do Kilo, separa claramente o que depende do resultado do Gate -1/0 do que não depende, e organiza tudo em um roadmap de fases sequenciais.

A arquitetura em si (watcher externo e independente, servidor Kilo com porta/senha sob seu controle, `kilo run --attach` para injetar na sessão existente, filtro de relevância, cursor de eventos, debounce, níveis de autonomia) **não muda** — está validada e mantida da v2.

---

## Regra explícita — não modificar o Kilo

O AgentMap e o watcher não devem depender de patch, fork ou alteração de código-fonte da extensão/CLI do Kilo Code para o MVP. Tudo deve funcionar contra o Kilo Code oficial, usando apenas a superfície pública (CLI, HTTP API, configurações documentadas). Se em algum ponto a única solução for modificar o Kilo, isso é sinal para revisar a abordagem, não para forkar o projeto.

---

## Cadeia de Gates (não pular etapa)

```
GATE -1 — Servidor externo é aceito pela extensão VS Code?
    │
    ├── NÃO → mecanismo de wake-up via UI precisa ser repensado
    │          (AgentMap/MCP/eventos continuam válidos de qualquer forma — ver seção final)
    │
    └── SIM
         ↓
GATE 0 — kilo run --attach injeta na sessão certa? (decomposto em 4 testes, ver seção 1)
         ↓
GATE 1 — AgentMap entrega eventos de forma confiável (com event_sequence)?
         ↓
GATE 2 — Watcher acorda a sessão certa, com filtro correto, fim a fim?
         ↓
GATE 3 — Funciona com múltiplos agentes filhos terminando quase juntos (debounce)?
         ↓
MVP em produção
```

Cada gate só é atacado depois que o anterior passou e foi documentado (mesmo que só um log simples).

---

## 1. Gate -1 e Gate 0 — decompostos em testes isolados

### Gate -1
Verificar nas configurações da extensão Kilo Code no VS Code (`kilo-code.*` em `settings.json`) se existe opção para apontar o backend para um servidor já em execução, em vez de sempre subir `kilo serve --port 0` automaticamente. Esse é o único ponto que decide se a arquitetura "servidor externo + attach" é viável como desenhada.

### Gate 0 — quatro testes isolados, nesta ordem exata

**Teste A — servidor sobe e responde, sem variável de autenticação envolvida:**
```bash
kilo serve --port 4096
curl http://127.0.0.1:4096/global/health
```
Confirma só que o binário/servidor funciona. **Correção importante:** isso só funciona sem senha nenhuma definida — o servidor roda sem proteção (com aviso), conforme a própria documentação de segurança do projeto. Não usar essa configuração fora de teste local isolado.

**Teste B — autenticação:**
```bash
KILO_SERVER_PASSWORD="minha-senha-fixa" kilo serve --port 4096
curl -u kilo:minha-senha-fixa http://127.0.0.1:4096/global/health
```
**Achado confirmado:** `/global/health` exige Basic Auth quando a senha está definida — mesmo sendo um endpoint de health check, não há bypass. Confirmar que dá `200` com credencial certa e `401` sem ela.

**Teste C — sessão:**
```bash
kilo session list --format json
```
Confirmar que lista a(s) sessão(ões) do workspace e que dá pra identificar qual é a do agente principal.

**Teste D — attach de verdade:**
```bash
kilo run --attach http://127.0.0.1:4096 --session <id> --username kilo --password minha-senha-fixa "teste"
```
Com a aba do VS Code aberta (se o Gate -1 permitir apontar pra esse servidor) — confirmar que a mensagem aparece na conversa sem reabrir nada.

Se qualquer teste falhar, o problema fica isolado exatamente naquela camada — não precisa investigar tudo de novo.

---

## 2. O que muda se o Gate -1 der "não"

Se a extensão não aceitar apontar para um servidor externo, isso **não invalida o AgentMap nem a arquitetura de eventos**. Só o mecanismo específico de "acordar a conversa visual já aberta na aba" precisa de outro caminho — por exemplo, o agente principal rodando via CLI puro em vez da aba gráfica (abrindo mão da UI em troca de porta/senha/sessão sob controle total). O restante — AgentMap como memória operacional, MCP, comunicação com os agentes filhos — continua de pé independentemente do resultado desse teste específico.

---

## 3. Gate 1 — AgentMap e cursor de eventos

Verificar se o schema atual de eventos/mensagens do AgentMap já tem um campo de sequência monotônica. Se não tiver, adicionar algo como:
```sql
event_sequence BIGINT UNIQUE
```
na tabela/domínio de eventos, e o watcher passa a consultar `GET /eventos?after=<ultimo_event_sequence>` em vez de depender de `since_id`. Isso é decisão de schema do próprio AgentMap — não há documentação externa pra validar isso, é escolha de design interna.

---

## 4. Gate 2 — Watcher fim a fim (retomando o script v1, com os ajustes já combinados)

- Filtro real: `destinatario === agente_principal AND projeto === projeto_atual AND tipo IN (TASK_COMPLETED, HANDOFF_COMPLETED, BLOCKED, APPROVAL_REQUIRED) AND status === PENDENTE AND event_sequence > ultimo_processado`
- Sempre `--username`/`--password` explícitos no comando `kilo run`
- Três níveis de autonomia configuráveis (`WATCHER_AUTONOMY_LEVEL`): `WAKE_ONLY` (sem `--auto`), `WAKE_AND_CONTINUE` (sem `--auto`, permissões normais do projeto), `FULL_AUTONOMY` (com `--auto`, só quando habilitado explicitamente)

## 5. Gate 3 — múltiplos agentes

Janela de debounce/coalescing de 2–5 segundos: ao chegar o primeiro evento relevante, esperar a janela fechar coletando outros eventos que cheguem no meio tempo, e montar um único prompt resumindo tudo, em vez de um wake-up por mensagem.

---

## 6. Roadmap de fases (ordem de execução recomendada)

```
Fase 0 — investigar configuração da extensão (Gate -1)
Fase 1 — subir kilo serve externo, porta/senha fixas
Fase 2 — validar autenticação (Teste B)
Fase 3 — kilo session list (Teste C)
Fase 4 — kilo run --attach manual (Teste D)
Fase 5 — event_sequence no AgentMap (Gate 1)
Fase 6 — watcher com polling simples
Fase 7 — filtro de relevância + debounce
Fase 8 — níveis de autonomia
Fase 9 — teste com 2 agentes filhos
Fase 10 — teste com 5 agentes filhos
```

Não avançar de fase sem o gate correspondente confirmado e documentado.

---

## 7. Riscos remanescentes (herdados da v2, ainda sem solução definitiva)

- Concorrência entre painel aberto e injeção externa simultânea — sem documentação oficial, só teste prático resolve.
- Rota B (inspeção de processo em nível de SO para extrair senha) permanece fora da arquitetura oficial — só uso pontual de diagnóstico, nunca dependência de produção.

---

## 8. Referências (fontes reais consultadas)

- `ServerManager`, geração de senha e spawn do servidor da extensão — DeepWiki, `Kilo-Org/kilocode`, "CLI Backend Connection" (`packages/kilo-vscode/src/services/cli-backend/server-manager.ts`)
- Rotas `/global/*` e exigência de Basic Auth — DeepWiki, "HTTP Server and REST API" (`packages/opencode/src/server/server.ts`)
- Confirmação de que `/global/health` exige Basic Auth mesmo sendo endpoint de health check — issue pública no repositório upstream do mesmo motor (`anomalyco/opencode`, issue #12805)
- `SECURITY.md` e `TESTING.md` oficiais do repositório `Kilo-Org/kilocode`
- Kilo CLI — referência de comandos: `kilo.ai/docs/code-with-ai/platforms/cli-reference`
