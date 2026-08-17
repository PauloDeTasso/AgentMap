# Plano v2 (corrigido) — Acordar automaticamente o agente principal do Kilo Code

**Muda em relação à v1:** substitui a suposição de que a senha do servidor da extensão seria descobrível via `kilo debug info`/`kilo debug paths` (não confirmado) por uma investigação real no código-fonte, que revelou um bloqueio mais sério. Também incorpora: filtro real de relevância, cursor/sequência de eventos em vez de `since_id`, debounce/coalescing para múltiplos filhos, e níveis de autonomia — sugestões validadas como boa prática, vindas de uma revisão externa do plano v1.

---

## 0. O achado crítico (Gate -1, antes de tudo)

Confirmado no código-fonte da extensão (`packages/kilo-vscode/src/services/cli-backend/server-manager.ts`, indexado publicamente):

- Ao abrir, a extensão gera uma senha de 64 caracteres hex (`crypto.randomBytes(32)`) e sobe `kilo serve --port 0` passando essa senha **só via variável de ambiente `KILO_SERVER_PASSWORD` do processo filho**.
- Não há evidência de que essa senha seja persistida em disco, exposta por comando `kilo debug`, ou disponibilizada de qualquer forma documentada para um processo externo.
- O servidor exige HTTP Basic Auth quando a senha está definida (usuário padrão `kilo`, ou `KILO_SERVER_USERNAME`) — isso está bem documentado e funciona como esperado; o problema não é o mecanismo de auth em si, é **como obter a senha de fora**.

Isso muda a ordem de prioridade do plano. Antes de qualquer código de watcher, o agente precisa resolver isto — e há duas rotas, não uma:

### Rota A — Não brigar com o servidor da extensão; assumir o controle
Em vez de tentar extrair a senha gerada pela extensão, rodar **seu próprio** `kilo serve` com porta e senha fixas, definidas por você:
```bash
KILO_SERVER_PASSWORD="minha-senha-fixa" kilo serve --port 4096 --hostname 127.0.0.1
```
A pergunta em aberto (não confirmada pela documentação, precisa ser testada empiricamente): a extensão VS Code tem alguma configuração para **apontar para um servidor já existente** em vez de sempre subir o próprio (`kilo serve --port 0` automático)? Isso deve ser verificado nas configurações da extensão (`kilo-code.*` no `settings.json` do VS Code) antes de prosseguir. Se existir, essa é a solução mais limpa — remove a variável "senha gerada pela extensão" da equação inteira.

### Rota B — Inspeção do processo em nível de SO (fallback, mais frágil)
Se a Rota A não for viável (extensão sempre gera o próprio servidor, sem opção de apontar para um externo):
- **Linux/macOS:** ler `/proc/<pid>/environ` do processo filho `kilo serve` (mesmo usuário, sem elevação) para extrair `KILO_SERVER_PASSWORD`.
- **Windows (seu ambiente):** não há equivalente simples e nativo. Exigiria ferramenta como Sysinternals (`handle`/`procexp`) ou WMI com privilégios elevados — nada disso é suportado oficialmente pelo Kilo Code, e é frágil o suficiente para não ser uma base confiável de automação.

**Ação do agente:** testar a Rota A primeiro (é a única realmente sustentável no Windows). Só investir na Rota B se a Rota A for tecnicamente impossível — e mesmo assim, tratar como solução temporária, não definitiva.

---

## 1. Descoberta de porta e session ID (mantido da v1, com uma correção)

Com a Rota A (servidor próprio, senha conhecida), a descoberta simplifica bastante — você já sabe a porta e a senha porque foi você quem definiu. Falta só:

```bash
kilo session list --format json
```
para pegar o `session id` da conversa ativa que o agente principal está usando.

**Correção em relação à v1:** eu havia sugerido `kilo debug info`/`kilo debug paths` como fonte da senha — não encontrei essa funcionalidade confirmada na documentação real. Removido.

---

## 2. Autenticação — risco rebaixado, mas ainda testar

A auth em si (Basic Auth, usuário `kilo` por padrão) é documentada e direta. O relato comunitário de `Unauthorized` provavelmente é sobre username/senha incorretos ou não passados explicitamente, não uma falha do mecanismo. Mesmo assim:

**Ação do agente:** sempre passar `--username` e `--password` explicitamente no comando (nunca confiar em default silencioso), e validar com um teste manual isolado antes de automatizar (ver Gate 0, seção 5).

---

## 3. Sinal de "mensagem nova" — cursor, não só `since_id`

Ponto correto levantado na revisão externa: depender só de `since_id`/`ultimoMessageIdProcessado` é frágil se a API do AgentMap não garantir ordenação monotônica estrita nas respostas.

**Ação do agente:** verificar se a API/schema atual do AgentMap já expõe algum campo de sequência monotônica (`eventSequence`, `version`, ou similar) para os registros de monitoramento/mensagens. Isso é algo que só o código real do AgentMap pode confirmar — eu não tenho visibilidade sobre o schema atual dele, então não dá pra verificar contra "documentação oficial" aqui; é uma decisão de design interna do próprio Paulo/agente. Se não existir, recomendo adicionar um contador incremental (`event_sequence`) na tabela de eventos do AgentMap — mudança pequena e resolve a fragilidade de vez.

Manter Opção B (polling) como MVP, Opção A (MCP `resources/subscribe`) como evolução — isso já estava certo na v1 e a revisão concordou.

---

## 4. Filtro de relevância — obrigatório, não `return true`

Correto na revisão: o placeholder `ehRelevanteParaAgentePrincipal() { return true; }` do script v1 não pode ir para uso real. Critério mínimo:

```text
destinatario === "agente_principal"
E projeto === projeto_atual
E tipo IN (TASK_COMPLETED, HANDOFF_COMPLETED, BLOCKED, APPROVAL_REQUIRED)
E status === "PENDENTE"
```

**Ação do agente:** implementar esse filtro de verdade contra os campos reais que o AgentMap já usa (consultar o schema atual de mensagens/eventos no próprio código do AgentMap).

---

## 5. Debounce/coalescing — evitar acordar 5x em 5 segundos

Também correto: se vários agentes filhos terminam quase juntos, o watcher não deve disparar um wake-up por mensagem. Adicionar uma janela de agrupamento (2–5s) antes de montar o prompt, juntando todas as mensagens pendentes em um resumo único. Isso é ajuste de engenharia direto no `cicloDeChecagem()` do script v1 — dá pra implementar sem depender de nenhuma documentação externa.

---

## 6. Níveis de autonomia — bom design, adotar

Em vez de `--auto` sempre ligado por padrão, o watcher deveria suportar 3 modos configuráveis:

- `WAKE_ONLY` — só injeta a mensagem, sem `--auto` (o agente decide e pede aprovação normalmente).
- `WAKE_AND_CONTINUE` — injeta e deixa seguir com as permissões já configuradas no projeto (sem forçar auto-approve extra).
- `FULL_AUTONOMY` — usa `--auto`, só quando explicitamente habilitado por você.

**Ação do agente:** adicionar essa configuração (`WATCHER_AUTONOMY_LEVEL` no `.env`, por exemplo) e mapear para os flags certos do `kilo run` — `--auto` só entra no modo `FULL_AUTONOMY`.

---

## 7. Gate 0 — teste manual isolado (antes de qualquer automação)

Ordem obrigatória de validação, sem pular etapas:

1. Subir `kilo serve --port 4096` com senha fixa sua (Rota A).
2. Verificar (nas configurações da extensão) se dá pra apontar a aba do VS Code para esse servidor, em vez do automático. **Este é o teste que decide se o plano inteiro é viável como desenhado, ou se precisa de uma abordagem diferente.**
3. Se funcionar: `kilo session list --format json` para achar o session id, depois `kilo run --attach http://127.0.0.1:4096 --session <id> --username kilo --password minha-senha-fixa "teste"` manualmente, e confirmar que a mensagem aparece na aba aberta.
4. Só depois disso, plugar o watcher (script v1, com os ajustes das seções 3–6 acima).

Se o passo 2 não for possível (extensão não aceita servidor externo), o plano precisa ser revisto do zero — nesse caso, a via mais realista muda para: o agente principal rodar via CLI puro (`kilo` no terminal, não na aba do VS Code), abrindo mão da UI gráfica em troca de controle total sobre porta/senha/sessão.

---

## 8. Riscos remanescentes

- Concorrência painel aberto + injeção externa simultânea — segue sem documentação oficial, testar na prática (mesmo se a Rota A funcionar).
- Porta/sessão mudam a cada reinício do VS Code — se a Rota A for usada com servidor próprio de vida longa, isso deixa de ser problema (a porta é fixa e sob seu controle).
- `kilo --continue`/`-c` (modo TUI) não pode ser combinado com `--auto` nem mensagem — mecanismo certo continua sendo `kilo run --session <id> --attach <url> --auto "<mensagem>"`.

---

## 9. Referências (fontes reais consultadas nesta revisão)

- Código-fonte da extensão VS Code, componente `ServerManager` (geração de senha, spawn do servidor): indexado via DeepWiki, `Kilo-Org/kilocode`, página "CLI Backend Connection" (`packages/kilo-vscode/src/services/cli-backend/server-manager.ts`)
- Autenticação HTTP Basic do servidor (`KILO_SERVER_PASSWORD`/`KILO_SERVER_USERNAME`): DeepWiki, página "HTTP Server and REST API" (`packages/opencode/src/server/server.ts`)
- `SECURITY.md` oficial do repositório `Kilo-Org/kilocode` — confirma que modo servidor é opt-in e roda sem auth se a senha não for definida
- `TESTING.md` oficial — confirma sintaxe real de `bun dev serve --port 0` com `KILO_SERVER_PASSWORD`
- Kilo CLI — referência de comandos (`kilo run`, `kilo attach`, `kilo serve`): `kilo.ai/docs/code-with-ai/platforms/cli-reference`
