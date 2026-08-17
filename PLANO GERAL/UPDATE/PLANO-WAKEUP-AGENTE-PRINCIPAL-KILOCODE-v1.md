# Plano: Acordar automaticamente o agente principal do Kilo Code (VS Code) quando chega mensagem no AgentMap

**Para:** agente principal do Kilo Code, modo Auto Free
**Objetivo:** eliminar a necessidade de acionamento manual quando um agente filho do worktree (Agent Manager) demora e reporta resultado tarde. Um watcher externo deve conseguir injetar um novo prompt na MESMA sessão que já está aberta na aba do VS Code, sem abrir uma sessão nova.

> Este documento foi montado a partir da documentação oficial do Kilo CLI (`kilo.ai/docs/code-with-ai/platforms/cli` e `cli-reference`) e da documentação de arquitetura da extensão VS Code (`kilo.ai/docs/contributing/architecture/vscode-extension`). Um ponto (Passo 2) usa também um relato comunitário não-oficial sobre um bug de autenticação conhecido — está marcado como tal.

---

## 0. Por que isso funciona (arquitetura real, não suposição)

A extensão VS Code do Kilo Code **não** é um processo isolado: ao abrir, ela sobe internamente um servidor headless local:

```
bin/kilo serve --port 0
```

Esse servidor expõe HTTP + SSE na porta efêmera escolhida, autenticado com usuário `kilo` e uma senha gerada automaticamente. A aba de chat da extensão é só um cliente (SDK + SSE) que fala com esse servidor — exatamente como o `kilo attach` ou `kilo run --attach` fariam de fora.

Ou seja: **a mesma sessão que está aberta na aba do VS Code pode receber mensagens de um processo CLI externo**, desde que esse processo se conecte ao servidor certo (porta + credenciais) e informe o `session id` certo. Não é preciso "ler a tela" — a identidade é por `porta do servidor + session id`.

---

## 1. Passo 1 — Descobrir porta, credenciais e session ID da sessão ativa

Antes de qualquer automação, o agente principal precisa confirmar, na prática, os três dados de que o watcher vai precisar:

1. **Porta do servidor local da extensão** — verificar processo `kilo serve` filho do VS Code (ex.: `ps aux | grep "kilo serve"` no Linux/macOS, ou `Get-Process | Where-Object {$_.Path -like "*kilo*"}` + `netstat -ano` no Windows) para identificar a porta efêmera em uso.
2. **Senha do servidor** — a extensão gera e injeta a senha automaticamente; verificar se ela fica acessível via `kilo debug info`, `kilo debug paths` (para achar onde a extensão guarda config/estado) ou nas variáveis de ambiente do processo filho. Se não for exposta de forma direta, documentar isso como limitação e usar a variável de ambiente `KILO_SERVER_PASSWORD` como fallback caso o agente principal seja iniciado com uma senha fixa nossa (ver Passo 2).
3. **Session ID da conversa ativa** — obter com:
   ```bash
   kilo session list --format json
   ```
   (ou `kilo session list -a --format json` se precisar listar sessões de todos os projetos). Filtrar pela sessão do workspace do agente principal — a mais recente costuma ser a certa, mas confirmar pelo título/timestamp.

**Ação do agente:** registrar esses três valores (porta, usuário/senha, session id) em uma variável de configuração local do AgentMap (ex.: `.agentmap/kilo-session.json`), para o watcher usar sem precisar redescobrir a cada execução. Adicionar lógica de re-descoberta automática caso a porta mude (ela é efêmera — muda a cada reinício do VS Code).

---

## 2. Passo 2 — Resolver o problema conhecido de autenticação (`Unauthorized`)

⚠️ **Não-oficial, mas relevante:** há relato comunitário de que o servidor gerenciado pela extensão autentica como `kilo:<senha>`, mas o comando `kilo attach` (e por extensão `kilo run --attach`) nem sempre aplica esse usuário-padrão corretamente, causando `401 Unauthorized` mesmo com a senha certa.

**Ação do agente:** ao montar o comando de injeção (Passo 4), sempre passar EXPLICITAMENTE ambos os flags, não confiar no default:
```bash
--username kilo --password <senha-capturada-no-passo-1>
```
Se mesmo assim der `Unauthorized`, testar:
- Rodar `kilo run --attach http://127.0.0.1:<porta> --session <id> "teste"` manualmente primeiro, fora do watcher, para isolar o problema de autenticação antes de automatizar.
- Como alternativa mais robusta e sob controle total: em vez de depender do servidor efêmero gerado pela extensão, considerar rodar o agente principal via `kilo serve --port <porta-fixa>` iniciado por nós mesmos (não pela extensão) com senha fixa nossa, e abrir a aba do VS Code apontando/anexando a esse servidor. Isso remove a variável "senha gerada automaticamente pela extensão" da equação. Avaliar viabilidade e documentar a decisão tomada.

---

## 3. Passo 3 — Sinal de "mensagem nova" vindo do AgentMap

Duas opções, em ordem de preferência:

### Opção A (preferencial) — Notificação MCP real
Se o AgentMap MCP server já implementa (ou vier a implementar) `resources/subscribe` com notificação `notifications/resources/updated` para o recurso de monitoramento/mensagens entre agentes:
- O watcher externo se conecta como client MCP a esse mesmo servidor (separado da sessão do Kilo) e assina o recurso relevante (ex.: `agentmap://monitoramento/mensagens`).
- Ao receber o evento, dispara o Passo 4 imediatamente — latência mínima, sem polling.

### Opção B (fallback simples e já testável hoje)
Se a subscription MCP ainda não estiver pronta:
- O watcher faz **polling** na API REST do AgentMap (endpoint de monitoramento/mensagens) a cada N segundos (sugestão inicial: 15–30s, ajustável).
- Guarda o último `message_id`/timestamp processado para não disparar duplicado.

**Ação do agente:** implementar a Opção B primeiro (rápida, sem dependências), deixando a Opção A como upgrade quando a feature de resource subscriptions do AgentMap estiver validada — como já está no roadmap.

---

## 4. Passo 4 — O watcher que injeta o prompt na sessão

Script (Node.js, para reaproveitar o mesmo runtime do AgentMap) que roda como processo separado, fora do Kilo Code:

```js
// watcher-wakeup.js — pseudocódigo estrutural, o agente deve implementar de fato
const { spawn } = require("child_process");

async function acordarAgentePrincipal(mensagemResumo) {
  const { porta, senha, sessionId } = await carregarConfigSessao(); // lida do Passo 1

  const args = [
    "run",
    "--attach", `http://127.0.0.1:${porta}`,
    "--session", sessionId,
    "--username", "kilo",
    "--password", senha,
    "--auto",                 // não travar esperando aprovação humana
    "--format", "json",       // facilita parsear a resposta/erros no log
    mensagemResumo
  ];

  const proc = spawn("kilo", args, { stdio: "pipe" });
  // capturar stdout/stderr, logar no AgentMap como evento de "wake-up disparado"
  // tratar exit code: 0 = ok, 124 = timeout, 1 = erro (ver seção de riscos)
}
```

**Conteúdo da mensagem injetada:** não mandar só "acorda" — mandar um resumo estruturado do que chegou (ex.: "Agente Backend concluiu handoff #123: <resumo>. Consulte o AgentMap para detalhes completos antes de prosseguir."), para o agente principal já ter contexto mínimo sem precisar ele mesmo re-consultar tudo do zero.

---

## 5. Passo 5 — Validação prática (obrigatório antes de considerar "pronto")

O agente deve testar, nesta ordem, e documentar o resultado de cada teste:

1. **Teste manual isolado:** com a aba do VS Code aberta e ociosa, rodar o comando do Passo 4 manualmente no terminal e confirmar que a mensagem aparece na conversa da aba, sem precisar reabrir nada.
2. **Teste de concorrência:** repetir o teste 1 enquanto o usuário está digitando/interagindo na aba ao mesmo tempo — checar se há conflito, mensagem perdida ou erro.
3. **Teste de porta mudada:** fechar e reabrir o VS Code (nova porta efêmera) e confirmar que a re-descoberta do Passo 1 pega a porta nova automaticamente.
4. **Teste end-to-end:** com o watcher rodando de verdade (polling ou subscription), simular um agente filho demorado reportando no AgentMap, e confirmar que o agente principal recebe e reage sem intervenção manual.

Só marcar essa funcionalidade como concluída depois que os 4 testes passarem e estiverem documentados (mesmo que só com um log simples), não apenas pela leitura da documentação.

---

## 6. Riscos e limitações conhecidas (não ignorar)

- **Porta efêmera muda a cada restart do VS Code** — a config do Passo 1 precisa de re-descoberta automática, não pode ser hardcoded.
- **Autenticação (`Unauthorized`)** é um problema relatado pela comunidade, não confirmado como resolvido na documentação oficial — testar antes de confiar.
- **Concorrência painel aberto + injeção externa simultânea** não tem comportamento documentado oficialmente — validar na prática (Passo 5, teste 2) antes de assumir que é seguro.
- **`--auto` no `kilo run` aprova permissões automaticamente** ("dangerous!" segundo a própria documentação) — revisar as regras de `permission` no `kilo.jsonc` do projeto antes de usar, para não abrir mão de aprovação em ações destrutivas (ex.: `rm *`, force-push).
- Isso NÃO deve ser confundido com `kilo --continue`/`-c` do modo TUI interativo — aquele modo é só para retomar sessão manualmente no terminal e **não pode** ser combinado com `--auto` nem com mensagem. O mecanismo certo para automação é `kilo run --session <id> --attach <url> --auto "<mensagem>"`, que são flags diferentes e compatíveis entre si.

---

## 7. Referências oficiais consultadas

- Kilo CLI — visão geral, modo autônomo e continuação de sessão: `https://kilo.ai/docs/code-with-ai/platforms/cli`
- Kilo CLI — referência completa de comandos (`kilo run`, `kilo attach`, `kilo serve`, `kilo session`): `https://kilo.ai/docs/code-with-ai/platforms/cli-reference`
- Arquitetura da extensão VS Code (confirma que a extensão sobe `kilo serve --port 0` internamente): `https://kilo.ai/docs/contributing/architecture/vscode-extension`
- Usando MCP no Kilo Code: `https://kilo.ai/docs/automate/mcp/using-in-kilo-code`
