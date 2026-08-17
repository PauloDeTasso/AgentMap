# Kilo Hub Orquestrador — Plano de Arquitetura

**Ambiente alvo:** Windows 11
**Objetivo:** orquestrador local que coordena o Kilo Code entre a extensão VS Code e o plugin Android Studio (JetBrains), com Paulo como intermediário/aprovador.
**Base:** apenas mecanismos confirmados em documentação real (kilo.ai/docs, repositório `Kilo-Org/kilocode` no GitHub, DeepWiki do projeto e npm). Onde algo não está confirmado publicamente, isso é marcado explicitamente como risco a validar — não como fato.

---

## 1. Fundamentos reais confirmados

Isso é o que existe de verdade, com fonte.

### 1.1 Arquitetura cliente-servidor

Todo o ecossistema Kilo (VS Code, JetBrains, desktop, TUI, web, CLI) é cliente de um único backend: o **opencode CLI** (`packages/opencode/`), que roda o runtime do agente, gerencia sessões e expõe uma API HTTP + SSE. Cada cliente sobe ou se conecta a um processo `kilo serve` e fala com ele via `@kilocode/sdk`.

### 1.2 `kilo serve` — a API real

- Servidor Hono, **porta 4096 por padrão**, mas configurável (`kilo serve --port <n>`, `--port 0` = porta aleatória).
- Endpoints confirmados:
  - `GET /global/health` — status do servidor
  - `GET /global/event` — **stream SSE global**, notificações de todo o sistema
  - `GET/PATCH /global/config` — configurações globais
  - `POST /global/upgrade` — auto-upgrade do CLI
  - `GET /session` — lista sessões do workspace atual
  - `POST /session` — cria sessão nova
  - **`POST /session/{id}/prompt`** — **envia um prompt para uma sessão em execução**
  - `GET /session/{id}/event` — stream SSE por sessão (deltas de mensagem, eventos)
- Autenticação: Basic Auth **opcional**, torna-se obrigatória quando a variável `KILO_SERVER_PASSWORD` está definida. Usuário padrão `kilo` (sobrescrevível via `KILO_SERVER_USERNAME`).
- CLI expõe isso diretamente:
  ```
  kilo serve --port 4096
  kilo attach http://127.0.0.1:4096
  kilo run --attach http://127.0.0.1:4096 "Revisar o estado atual do repo"
  ```
  `kilo run --attach` já é, literalmente, **um processo externo empurrando um prompt para um servidor Kilo rodando** — a peça central do que você quer construir.

### 1.3 `@kilocode/sdk` — SDK oficial

Pacote npm público, MIT, mantido ativamente (`npm i @kilocode/sdk`). É um cliente TypeScript tipado para a API acima, com helper de spawn de processo e cliente fetch. É a mesma lib usada internamente por VS Code, JetBrains, desktop e web — não é engenharia reversa, é a interface oficial.

### 1.4 Agent Manager e a tool `agent_manager`

- Painel multi-sessão da extensão VS Code, com isolamento por **git worktree** (`.kilo/worktrees/`).
- Dentro do chat, o modelo tem acesso à tool `agent_manager` — **disponível apenas na extensão VS Code** (não existe no plugin JetBrains). Cria sessões (`worktree`/`local`), envia prompt a sessões existentes, lista overview, para e move sessões — tudo sob aprovação granular no Permission Dock.
- Em cada host de extensão existe **um único `KiloConnectionService`**, compartilhado entre sidebar, abas e Agent Manager, reaproveitando um `kilo serve` só. As sessões de worktree passam apenas um *contexto de diretório* pra esse backend — não sobem processo próprio.
- Agent Manager herda **as mesmas configurações de MCP, providers e permissões da sidebar**. Isso importa muito para a seção 2.

### 1.5 MCP — o mecanismo oficial de extensão

- Kilo Code se conecta a servidores MCP via **STDIO** (processo filho local) ou **SSE/HTTP** (remoto).
- Configuração em `mcp_settings.json` (global) ou `.kilocode/mcp.json` (projeto).
- Chamadas de tool MCP passam pelo mesmo sistema de permissão das tools nativas, namespaced como `{server}_{tool}`.
- Fundamental: é o **agente** que decide chamar a tool — não é um push do servidor MCP para o agente. O fluxo é sempre "o modelo decide, chama, recebe resultado".

### 1.6 JetBrains (Android Studio)

- O plugin JetBrains também é cliente do mesmo backend, conectando via HTTP + SSE com o SDK — arquitetura de cliente equivalente à do VS Code, mas implementada em Kotlin, com sua própria camada (`KiloBackendCliManager` e afins). Suporta *split mode* (backend remoto, front local).
- **Não há confirmação pública de que a tool `agent_manager` ou uma equivalente exista no lado JetBrains.** O que existe documentado é o cliente HTTP+SSE genérico — o mesmo backend, consumido de outra forma.

---

## 2. Respondendo à pergunta original com o que é real

**"Chat manda prompt pra dentro do worktree"** → confirmado por dois caminhos reais:
1. Tool `agent_manager` (só dentro do chat da extensão VS Code)
2. `POST /session/{id}/prompt` via SDK/API — de **qualquer processo externo** que tenha acesso ao servidor

**"O agente do worktree manda de volta pra tela"** → não existe um "push" simétrico, mas existem dois caminhos reais de retorno:
1. **Observação passiva via SSE compartilhado** — como todo cliente lê o mesmo `GET /global/event` ou `GET /session/{id}/event`, qualquer painel (incluindo um hub externo) vê mudanças de estado em tempo real, sem que o agente precise "enviar" nada ativamente.
2. **Chamada de tool MCP feita pelo próprio agente** — como sessões do Agent Manager herdam a configuração de MCP do editor, um agente rodando *dentro* de um worktree pode chamar uma tool exposta pelo seu hub (ex.: `kilohub_report_status`). Isso é uma chamada de ferramenta genuína, documentada, disponível hoje — não uma inferência sobre internals.

O segundo ponto é a peça que faltava no plano anterior: **o Kilo Hub não precisa só observar — ele pode ser, ele mesmo, um servidor MCP que o próprio Kilo (rodando no VS Code ou no Android Studio, dentro ou fora de um worktree) chama proativamente.**

---

## 3. Riscos reais — o que NÃO está confirmado

Sendo honesto sobre os limites do que a documentação garante:

| Risco | Detalhe | Impacto |
|---|---|---|
| Porta/senha dinâmicos | A extensão VS Code sobe `kilo serve --port 0` (porta aleatória) e injeta uma senha gerada. Não há documentação pública de como um processo externo descobre esses dois valores. | Bloqueia conectar direto na instância que a extensão já está rodando, sem investigação adicional. |
| Bug de auth conhecido | Há relato de mismatch entre o usuário Basic Auth usado por `kilo attach` (`opencode`) e o padrão do servidor (`kilo`) quando a extensão gera a senha. | Pode causar `401 Unauthorized` mesmo com senha certa — precisa validar na versão instalada. |
| `agent_manager` só no VS Code | Não há tool equivalente documentada para JetBrains. | O braço Android Studio do hub não pode depender dessa tool — precisa usar a API HTTP direta ou MCP. |
| Apontar extensão pra um `kilo serve` externo | Não encontrei confirmação pública de que a extensão aceita configurar um servidor já em execução em vez de subir o próprio processo filho. | Se não for possível, o hub tem que se conectar como **cliente adicional** à instância que cada editor já sobe — não como dono de um daemon único compartilhado. |

Nenhum desses riscos invalida o plano — eles definem **por onde começar a investigar** (Fase 0 abaixo) antes de construir em cima de suposições.

---

## 4. Arquitetura proposta

```
                    ┌─────────────────────────┐
                    │   Kilo Hub (Windows 11)  │
                    │  processo Node/TS local  │
                    └───────────┬──────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
   ┌──────────▼───────┐ ┌───────▼────────┐ ┌───────▼────────┐
   │ MCP Server do Hub │ │ Cliente SDK    │ │ Cliente SDK    │
   │ (STDIO, local)    │ │ → kilo serve   │ │ → kilo serve   │
   │ tools de status/  │ │ do VS Code     │ │ do Android     │
   │ handoff/log       │ │                │ │ Studio         │
   └──────────┬────────┘ └───────┬────────┘ └───────┬────────┘
              │                  │                   │
   agente chama tool     hub cria sessão /    hub cria sessão /
   de dentro de          envia prompt via     envia prompt via
   qualquer sessão       POST /session/       POST /session/
   (worktree incl.)      {id}/prompt          {id}/prompt
                                │                   │
                         hub assina SSE      hub assina SSE
                         (/global/event,     (/global/event,
                         /session/{id}/event) /session/{id}/event)
```

**Papel de cada peça:**

- **MCP Server do Hub** — registrado uma vez em `mcp_settings.json` (global), fica disponível em toda sessão de qualquer editor, incluindo sessões dentro de worktrees do Agent Manager. É o canal de **volta**: o agente chama, o hub responde.
- **Clientes SDK** (um por editor/instância) — o canal de **ida**: o hub cria sessões e envia prompts via API HTTP.
- **Assinatura SSE** — visão de estado em tempo real de tudo que está rodando, sem precisar que ninguém "avise" ativamente.
- **Paulo como intermediário** — o hub não toma decisão irreversível sozinho; toda ação que crie/pare sessão ou aplique mudança passa por uma confirmação explícita (o mesmo espírito do Permission Dock do próprio Kilo).

---

## 5. Fases de implementação

**Fase 0 — Descoberta (antes de codar o hub)**
- Rodar `kilo serve --port 4096` manualmente e confirmar os endpoints com `curl`/Postman.
- Testar `kilo attach http://127.0.0.1:4096` e `kilo run --attach ...` — validar se o bug de auth mencionado na seção 3 se aplica à versão instalada.
- Descobrir, inspecionando a extensão VS Code em execução (logs, output channel, `netstat` local), a porta real que ela usa para o `kilo serve` interno — e se há uma configuração para fixá-la.
- Testar registrar um MCP server STDIO simples (`echo`/`ping`) no `mcp_settings.json` global e confirmar que ele aparece disponível **dentro de uma sessão de worktree do Agent Manager**, não só na sidebar.

**Fase 1 — Hub mínimo como servidor MCP**
- Node/TS, transporte STDIO.
- Tools iniciais: `kilohub_report_status(session_id, status, message)`, `kilohub_log(text)`.
- Registrar no `mcp_settings.json` global e validar chamada real a partir de uma sessão comum.

**Fase 2 — Cliente SDK contra uma instância de teste**
- Usar `@kilocode/sdk` para: listar sessões, criar sessão, `POST /session/{id}/prompt`, assinar `/session/{id}/event`.
- Validar contra o `kilo serve --port 4096` manual da Fase 0 antes de tentar contra a instância real da extensão.

**Fase 3 — Integração real com VS Code**
- Resolver a descoberta de porta/senha (Fase 0). Se não for viável de forma confiável, alternativa documentada: o hub roda seu **próprio** `kilo serve` fixo (`--port` fixa, `KILO_SERVER_PASSWORD` fixa) e usa esse como ponto de encontro — aceitando que a extensão continua com o seu processo interno próprio, e a comunicação bidirecional passa a depender só do canal MCP (agente chama hub) e não de o hub controlar sessões da extensão diretamente.

**Fase 4 — Integração com Android Studio**
- Repetir Fase 3 do lado JetBrains. Como não há `agent_manager` confirmado nesse lado, o canal de ida (hub → Android Studio) provavelmente depende só da API HTTP genérica (criar sessão, mandar prompt), e o canal de volta continua sendo o MCP Server do Hub — que já funciona nos dois lados por igual, já que é configuração global do Kilo, não da extensão.

**Fase 5 — Orquestração e papel do Paulo**
- Mapeamento de sessões/worktrees por projeto.
- Toda criação de sessão, todo prompt automático e toda ação sobre worktree passam por uma etapa de confirmação explícita do Paulo antes de executar — nada de aprovação automática ampla nessa fase inicial.

---

## 6. Próximos passos imediatos

1. Executar a Fase 0 por completo antes de escrever qualquer código do hub — é curta e resolve as maiores incertezas do plano.
2. Decidir, com base no resultado da Fase 0, se o hub vai se conectar às instâncias `kilo serve` que os editores já sobem, ou se vai rodar a sua própria instância central como ponto de encontro.
3. Construir a Fase 1 (MCP server mínimo) em paralelo — ela não depende do resultado da Fase 0 e já valida o canal de volta.
