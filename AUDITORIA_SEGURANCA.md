# Relatório de Auditoria de Segurança — AgentMap

**Data:** 2026-08-15  
**Auditor:** Agente de Segurança (Kilo)  
**Escopo:** Backend Node.js/TypeScript, API REST, WebSocket, MCP Server, Configurações  
**Metodologia:** Varredura estática de código, análise de fluxo de dados, revisão de headers e configurações

---

## Sumário Executivo

Foram identificadas **3 vulnerabilidades CRÍTICAS**, **5 ALTA**, **9 MÉDIA** e **8 BAIXA**.  
Os riscos mais graves concentram-se em **command injection** (endpoints de arquivos e orquestrador) e **bypass de autorização** (endpoint público de enumeração de diretórios). A arquitetura de path traversal está majoritariamente bem protegida, mas há falhas em camadas adjacentes (CORS, CSRF, rate limiting).

---

## 1. Vulnerabilidades CRÍTICAS

### 1.1 Command Injection — `/api/arquivos/explorer`
- **Severidade:** CRÍTICA
- **Arquivo e linha:** `backend/src/api/arquivos.ts:102`
- **Descrição:** O endpoint `GET /api/arquivos/explorer` recebe um parâmetro `path` do usuário, resolve o caminho absoluto e executa `explorer "<absPath>"` via `child_process.exec()`. Embora `absPath` passe por `resolveProjectPath()`, o uso de `exec()` com interpolação de string utiliza `cmd.exe` como shell no Windows. Qualquer quote ou caractere de escape malicioso no caminho resolveito pode quebrar o comando.
- **Impacto potencial:** Execução arbitrária de comandos no sistema operacional do host com os privilégios do processo Node.js. Um invasor com acesso à API poderia abrir aplicativos, ler arquivos outside the project root ou executar payloads maliciosos.
- **Correção recomendada:**
  1. Remover completamente o endpoint `explorer` ou protegê-lo com flag administrativa.
  2. Se mantido, usar `execFile` ou `spawn` com array de argumentos, nunca `exec` com string concatenada.
  3. Adicionar validação rigorosa de allowlist de caminhos permitidos antes de qualquer execução.

### 1.2 Command Injection — `KiloDispatcherService.executarPendente`
- **Severidade:** CRÍTICA
- **Arquivo e linha:** `backend/src/servicios/KiloDispatcherService.ts:145-159`
- **Descrição:** O método `executarPendente` lê o conteúdo de `prompt.md` (controlado pelo usuário/agente) e o concatena diretamente em um comando shell: `const comandoStr = \`${comandoObj.cmd} ${comandoObj.args.join(' ')}\``, depois executa com `execSync(comandoStr, { cwd: configAgente.workspacePath, env: { ...process.env } })`. O conteúdo do prompt não é sanitizado contra injeção de comandos.
- **Impacto potencial:** Execução arbitrária de comandos no `cwd` do workspace do agente. Como o comando herda `process.env`, segredos do ambiente (tokens, chaves) podem ser vazados para processos filhos.
- **Correção recomendada:**
  1. Jamais concatenar input do usuário em comandos shell. Usar `spawn`/`execFile` com array de argumentos.
  2. Sanitizar ou rejeitar prompts contendo caracteres especiais (`;`, `|`, `&`, `` ` ``, `$()`, etc.).
  3. Limitar o `env` herdado: passar apenas variáveis explicitamente necessárias (`PATH`, `HOME`), nunca `...process.env`.

### 1.3 Command Injection — `ExecutorKiloDaemon.dispatch`
- **Severidade:** CRÍTICA
- **Arquivo e linha:** `backend/src/servicios/ExecutorKiloDaemon.ts:118-154`
- **Descrição:** Similar ao item 1.2, o método `dispatch` constrói `const comandoStr = \`${KILO_CMD} ${args.join(' ')}\`` onde `args` inclui `opts.mensagem` (mensagem do usuário) e `opts.title`. Em Windows, usa `cmd.exe /c kilo ...` via `spawnSync`. A mensagem do usuário é passada como argumento final sem sanitização de shell metacharacters.
- **Impacto potencial:** Execução arbitrária de comandos via injeção na mensagem de dispatch.
- **Correção recomendada:**
  1. Usar `spawn` com array de argumentos (`spawn('kilo', args, { cwd, shell: false })`) evitando `cmd.exe`.
  2. Validar/escape de `opts.mensagem` e `opts.title` contra shell injection.
  3. Rejeitar mensagens contendo sequences perigosas.

---

## 2. Vulnerabilidades ALTA

### 2.1 CSRF Bypass — Validação Incompleta de Origin/Referer
- **Severidade:** ALTA
- **Arquivo e linha:** `backend/src/seguranca/csrf.ts:14-24`
- **Descrição:** O middleware CSRF valida `origin` e `referer` apenas quando **ambos** estão presentes (`if (origin && referer)`). Se um atacante enviar uma requisição com `Origin` válido mas sem `Referer` (ou com `Referer` removido por política de privacidade do navegador), a validação é totalmente ignorada e a requisição prossegue.
- **Impacto potencial:** Ataques CSRF em endpoints de estado (POST/PUT/DELETE) quando a vítima usa navegadores/comportamentos que omitem `Referer` mas enviam `Origin`.
- **Correção recomendada:**
  1. Validar `origin` independentemente da presença de `referer`.
  2. Implementar token CSRF síncrono (double-submit cookie ou header `X-CSRF-Token`).
  3. Considerar `SameSite` cookies se houver sessão baseada em cookie.

### 2.2 CORS Mal Configurado — Atualização Dinâmica sem Restrição
- **Severidade:** ALTA
- **Arquivo e linha:** `backend/src/servicios/CorsService.ts:44-46` e `backend/src/api/admin.ts:48-62`
- **Descrição:** O endpoint `PUT /api/admin/cors` permite a qualquer usuário autenticado modificar a configuração CORS, incluindo `origins`, `credentials`, `allowedHeaders`. Não há validação de origem ou limite de confiança. Se um invasor obtiver a API key, pode configurar CORS para aceitar qualquer origem com credenciais, habilitando exfiltração de dados via XSS ou ataques cross-origin.
- **Impacto potencial:** Exfiltração de dados sensíveis do projeto via requests cross-origin com credenciais.
- **Correção recomendada:**
  1. Remover o endpoint de atualização dinâmica de CORS ou restringi-lo a uma flag de desenvolvimento.
  2. Validar `origins` contra uma allowlist hardcoded antes de aplicar.
  3. Nunca permitir `credentials: true` com origens curinga (`*`).

### 2.3 Rate Limiting Ineficaz
- **Severidade:** ALTA
- **Arquivo e linha:** `backend/src/app.ts:34-52`
- **Descrição:** O rate limiting usa um `Map` em memória (`rateLimitMap`) com janela de 60s e limite de 120 req/min. Isso não persiste entre restarts, não funciona em cluster/multi-processo, e o limite de 120 é excessivamente alto para endpoints sensíveis (exclusão, escrita, admin).
- **Impacto potencial:** Ataques de força bruta contra API key, DoS, ou abuso de endpoints sensíveis sem bloqueio efetivo.
- **Correção recomendada:**
  1. Usar solução distribuída (Redis, `rate-limit-redis`, ou sticky-session com `cluster`).
  2. Reduzir limite global e aplicar limites específicos por endpoint (ex: 20 req/min para writes).
  3. Implementar bloqueio progressivo (exponential backoff) para IPs reincidentes.

### 2.4 Autenticação WebSocket Fraca
- **Severidade:** ALTA
- **Arquivo e linha:** `backend/src/websocket/monitoramento.ts:20-25`
- **Descrição:** O WebSocket autentica com o mesmo `API_KEY` do header HTTP (`Authorization: Bearer` ou `x-api-key`). Não há validação de origem WebSocket (`verifyClient`), não há suporte a `wss://` (TLS), e a conexão não está vinculada a uma sessão HTTP prévia.
- **Impacto potencial:** Ataques de cross-site WebSocket hijacking, sniffing de tráfego em rede local, uso indevido do canal de monitoramento.
- **Correção recomendada:**
  1. Adicionar verificação de origem no handshake (`verifyClient` com `Origin` header).
  2. Suportar TLS (`wss://`) em produção.
  3. Considerar autenticação baseada em cookie `SameSite` ou token de curta duração.

### 2.5 Exposição de Caminho e Informações em Endpoints Públicos
- **Severidade:** ALTA
- **Arquivo e linha:** `backend/src/app.ts:17-23` e `backend/src/api/projetos.ts:37-76, 90-94`
- **Descrição:** Vários endpoints GET são públicos sem autenticação:
  - `GET /api/projetos` — lista todos os projetos registrados com `caminhoRaiz` (caminhos completos do Windows).
  - `GET /api/projetos/scan` — permite enumerar diretórios arbitrários do sistema procurando pastas `.ia`. A checagem `targetDir.includes('..')` é insuficiente: caminhos absolutos como `C:\Users\Admin\Documents` não contêm `..` e são aceitos.
  - `GET /api/projetos/settings` — expõe `diretorioProjetosDefault` (caminho completo `G:\PROJETOS\AgenteMap_Projetos`).
- **Impacto potencial:** Enumeração de estrutura de diretórios do sistema, revelação de caminhos de usuário, mapeamento de projetos para ataques direcionados.
- **Correção recomendada:**
  1. Remover `/api/projetos/scan` da lista de bypass de autenticação ou restringir a diretórios específicos.
  2. Sanitizar `caminhoRaiz` antes de retornar em respostas públicas (mostrar apenas nome/id).
  3. Nunca expor caminhos absolutos em endpoints não autenticados.

---

## 3. Vulnerabilidades MÉDIA

### 3.1 API Key com Permissões Ineficazes no Windows
- **Severidade:** MÉDIA
- **Arquivo e linha:** `backend/src/seguranca/auth.ts:13`
- **Descrição:** O arquivo `.api-key` é criado com `mode: 0o600`. No Windows NTFS, permissões POSIX não são aplicadas da mesma forma. O arquivo fica com permissões padrão da pasta, potencialmente legível por outros usuários ou processos.
- **Impacto potencial:** Vazamento da API key para outros usuários do sistema ou processos com privilégios equivalentes.
- **Correção recomendada:** Usar a API nativa do Windows (`fs.open` com flags e ACLs) ou criptografar a API key com uma chave derivada de credenciais do usuário (DPAPI no Windows).

### 3.2 Mass Assignment — Configurações Sobrescritas sem Validação
- **Severidade:** MÉDIA
- **Arquivo e linha:** `backend/src/api/projetos.ts:96-100`
- **Descrição:** `PUT /api/projetos/settings` aplica `{ ...settings, ...req.body }` sem validação de campos permitidos. Um usuário autenticado pode modificar `portaApi`, `diretorioProjetosDefault`, `postgresConfig` (incluindo host/banco/usuario), etc.
- **Impacto potencial:** Redirecionamento de projetos para diretórios maliciosos, modificação de configuração de banco de dados, negação de serviço ao alterar porta.
- **Correção recomendada:** Usar schema de validação explícito (ex: Zod/AJV) permitindo apenas campos conhecidos e rejeitando o resto.

### 3.3 Information Disclosure em Logs
- **Severidade:** MÉDIA
- **Arquivo e linha:** `backend/src/app.ts:68-86`, `backend/src/servicios/KiloDispatcherService.ts:147,167,177,188`, `backend/src/arquivos/arquivos.ts:91-103`
- **Descrição:**
  - O logger global registra `userAgent` e `ip` em todas as requisições.
  - `KiloDispatcherService` registra comandos completos (`comandoStr`) em audit e stdout/stderr de dispatch.
  - `/api/arquivos/explorer` loga o caminho absoluto do arquivo.
- **Impacto potencial:** Vazamento de caminhos internos, comandos executados, IPs de clientes e user-agents em arquivos de log que podem ser coletados por terceiros.
- **Correção recomendada:**
  1. Implementar níveis de log configuráveis (debug/info/warn/error) e mascarar caminhos sensíveis.
  2. Nunca logar comandos completos com argumentos de usuário; logar apenas hash ou ID de referência.
  3. Rotacionar logs e aplicar permissões restritas.

### 3.4 Content Security Policy Permite `unsafe-inline`
- **Severidade:** MÉDIA
- **Arquivo e linha:** `backend/src/app.ts:30`
- **Descrição:** O header CSP inclui `script-src 'self' 'unsafe-inline'`. Isso anula a proteção contra XSS refletido e armazenado, permitindo injeção de `<script>` inline.
- **Impacto potencial:** Se qualquer parte do frontend refletir input do usuário sem escape, XSS é trivial.
- **Correção recomendada:** Remover `'unsafe-inline'` e usar nonces ou hashes para scripts inline necessários.

### 3.5 Falta de HSTS e HTTPS Enforcement
- **Severidade:** MÉDIA
- **Arquivo e linha:** `backend/src/app.ts:25-32`
- **Descrição:** Os security headers incluem `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, mas **não** incluem `Strict-Transport-Security`. O servidor roda em HTTP por padrão (`http://localhost:3150`).
- **Impacto potencial:** Ataques de downgrade, sniffing de tráfego em rede local, especially quando acessado via IP ao invés de localhost.
- **Correção recomendada:** Adicionar `Strict-Transport-Security: max-age=31536000; includeSubDomains` e forçar HTTPS em produção.

### 3.6 Validação de Input Limitada
- **Severidade:** MÉDIA
- **Arquivo e linha:** `backend/src/seguranca/paths.ts:124-127` e diversos endpoints em `backend/src/api/*.ts`
- **Descrição:** `sanitizeInput` apenas faz `slice(0, maxLength).trim()`. Não há validação de tipos, formatos ou caracteres perigosos em query parameters (`req.query`), body (`req.body`) ou params (`req.params`). Endpoints como `/api/arquivos` aceitam `path` arbitrário sem validação de allowlist específica.
- **Impacto potencial:** Injeção de payloads maliciosos em arquivos JSON/Markdown, bypass de validação de schema, comportamento inesperado em parsers downstream.
- **Correção recomendada:** Implementar validação estrita por endpoint (esquemas JSON ou Zod) com tipos, tamanhos e padrões (regex) específicos.

### 3.7 Erro Handler Pode Vazar Stack Traces
- **Severidade:** MÉDIA
- **Arquivo e linha:** `backend/src/app.ts:119-127`
- **Descrição:** O error handler global loga `err?.message || err` e `err?.codigoErro`. Em modo `development`, o Express default behavior também pode expor stack traces. A resposta ao cliente é genérica (`INTERNAL_ERROR`), mas logs em disco podem conter detalhes internos.
- **Impacto potencial:** Vazamento de estrutura interna do código, bibliotecas utilizadas e caminhos de arquivo via logs ou respostas de erro em ambiente de debug.
- **Correção recomendada:** Garantir que `NODE_ENV=production` suprime stack traces em logs e respostas. Implementar log scrubbing para remover paths e detalhes sensíveis.

### 3.8 Credenciais Hardcoded em Defaults
- **Severidade:** MÉDIA
- **Arquivo e linha:** `backend/src/config/index.ts:23-34`
- **Descrição:** O objeto `DEFAULT_SETTINGS` contém `postgresConfig` com `usuario: 'postgres'` e `host: 'localhost'`. Se um projeto for versionado acidentalmente com `settings.json` baseado em defaults, credenciais parciais são expostas.
- **Impacto potencial:** Facilitação de ataques de força bruta contra PostgreSQL usando a conta `postgres` padrão.
- **Correção recomendada:** Remover defaults de banco de dados ou usar valores vazios obrigando configuração explícita.

### 3.9 CSP com `unsafe-inline` para Styles também
- **Severidade:** MÉDIA
- **Arquivo e linha:** `backend/src/app.ts:30`
- **Descrição:** `style-src 'self' 'unsafe-inline'` permite estilos inline, que podem ser vetor para XSS via `style` attributes ou `<style>` tags.
- **Impacto potencial:** XSS via estilos inline se houver reflection de CSS em componentes do frontend.
- **Correção recomendada:** Remover `'unsafe-inline'` de `style-src` e usar nonces/hashes.

---

## 4. Vulnerabilidades BAIXA

### 4.1 Duplicação de Middleware CSRF
- **Severidade:** BAIXA
- **Arquivo e linha:** `backend/src/seguranca/auth.ts:30-48`
- **Descrição:** Existe uma cópia do `csrfMiddleware` dentro de `auth.ts` e outro arquivo `csrf.ts`. Apenas o de `csrf.ts` é usado em `app.ts`. A duplicação causa risco de manutenção (correção aplicada em um, esquecida no outro).
- **Correção recomendada:** Remover a duplicação de `auth.ts` e importar exclusivamente de `seguranca/csrf.ts`.

### 4.2 Geração de Código com URLs Hardcoded
- **Severidade:** BAIXA
- **Arquivo e linha:** `backend/src/arquivos/ScaffoldService.ts:780`
- **Descrição:** O scaffold gera `polling.js` com `const API_BASE = process.env.AGENTMAP_API || 'http://localhost:3150/api'`. Se o `AGENTMAP_API` não for configurado, o orquestrador tentará comunicação com localhost, falhando em deploys remotos.
- **Impacto potencial:** Falha silenciosa do orquestrador em ambientes não-localhost.
- **Correção recomendada:** Usar URL relativa ou exigir configuração obrigatória de `AGENTMAP_API`.

### 4.3 Lock File Ineficaz
- **Severidade:** BAIXA
- **Arquivo e linha:** `backend/src/api/projetos.ts:9-28`
- **Descrição:** O lock file `agentmap-projetos-lock` usa PID no arquivo sem verificação de validade do PID. Se o processo crashar, o lock permanece, causando falsos positivos de "concorrência".
- **Impacto potencial:** Operações legítimas bloqueadas temporariamente.
- **Correção recomendada:** Usar `fs.open` com flag `O_EXCL` (quando disponível) ou verificar se o PID ainda está rodando via `process.kill(pid, 0)`.

### 4.4 Ausência de Validação de `origin` no WebSocket
- **Severidade:** BAIXA
- **Arquivo e linha:** `backend/src/websocket/monitoramento.ts:19`
- **Descrição:** O `WebSocketServer` não usa `verifyClient` para validar a origem do handshake. Apenas o header `Authorization` é verificado após a conexão ser aceita.
- **Impacto potencial:** Handshakes maliciosos consomem recursos antes da autenticação.
- **Correção recomendada:** Implementar `verifyClient` que valida `Origin` contra allowlist antes de aceitar a conexão.

### 4.5 Nenhum `X-Content-Type-Options` para Arquivos Estáticos
- **Severidade:** BAIXA
- **Arquivo e linha:** `backend/src/app.ts:93-103`
- **Descrição:** O `express.static` serve arquivos do frontend. Apenas arquivos `.html`, `.js`, `.css` recebem `Cache-Control: no-store`. Não há `X-Content-Type-Options: nosniff` aplicado explicitamente para assets estáticos.
- **Impacto potencial:** MIME type sniffing em arquivos estáticos (ex: JSON servido como `text/plain`).
- **Correção recomendada:** Aplicar `res.setHeader('X-Content-Type-Options', 'nosniff')` globalmente (já existe em `securityHeaders`) ou via `setHeaders` do static.

### 4.6 `health` Endpoint Vaza Estrutura Interna
- **Severidade:** BAIXA
- **Arquivo e linha:** `backend/src/api/health.ts:35-71`
- **Descrição:** O endpoint `/api/health` retorna `services: { stateMachine, auditoria, contractValidator, backup, fileSystem }` e detalhes de git (`ramoAtual`, `ultimoCommit`). Requer projeto aberto + auth, mas expõe arquitetura interna.
- **Impacto potencial:** Reconnhecimento da stack interna por atacantes autenticados.
- **Correção recomendada:** Reduzir detalhes em health check (apenas status up/down e timestamp).

### 4.7 `X-XSS-Protection` Depreciado
- **Severidade:** BAIXA
- **Arquivo e linha:** `backend/src/app.ts:28`
- **Descrição:** O header `X-XSS-Protection: 1; mode=block` é obsoleto e removido de navegadores modernos (Chrome, Edge). Criar falsa sensação de segurança.
- **Impacto potencial:** Nenhum impacto direto, mas gera confiança em controle obsoleto.
- **Correção recomendada:** Remover o header e confiar em CSP moderno.

### 4.8 Ausência de `Referrer-Policy` Ajustada
- **Severidade:** BAIXA
- **Arquivo e linha:** `backend/src/app.ts:29`
- **Descrição:** `Referrer-Policy: no-referrer` bloqueia completamente o envio de `Referer`, o que pode quebrar funcionalidades legítimas (ex: debug, analytics). O valor `strict-origin-when-cross-origin` é mais balanceado.
- **Impacto potencial:** Nenhum impacto de segurança direto, mas política muito restritiva pode forçar fallbacks inseguros.
- **Correção recomendada:** Usar `strict-origin-when-cross-origin` ou `same-origin`.

---

## 5. Inconsistências entre Documentação e Código

### 5.1 SECURITY.md Afirma que API Key Nunca é Exposta, mas Logs Contêm Caminhos
- **Severidade:** MÉDIA
- **Arquivo e linha:** `SECURITY.md:48` vs `backend/src/arquivos/arquivos.ts:91-103`
- **Descrição:** A documentação afirma que a API key "NUNCA é exposta via query string ou endpoints públicos". Isso é tecnicamente verdadeiro, mas os logs de request/response em `app.ts` e `arquivos.ts` expõem caminhos absolutos de arquivos e comandos executados, violando o princípio de "não coletar informações da máquina sem operação explícita".
- **Correção recomendada:** Atualizar `SECURITY.md` para refletir que caminhos absolutos não devem ser logados em produção.

### 5.2 `.gitignore` Cobre `.api-key` mas não Cobre Outros Segredos
- **Severidade:** BAIXA
- **Arquivo e linha:** `.gitignore:205`
- **Descrição:** `.gitignore` ignora `**/.api-key`, `.env.*`, `credentials.json`, etc. Porém, não há `.env.example` no repositório, e o scaffold não gera `.env.example`. Também não há validação pré-commit para detectar segredos.
- **Impacto potencial:** Commits acidentais de `.env` ou `settings.json` com dados reais.
- **Correção recomendada:** Adicionar `.env.example`, implementar `pre-commit` com `detect-secrets` ou `gitleaks`.

---

## 6. Problemas com WebSocket Segurança

### 6.1 Falta de Validação de Origem no Handshake
- **Severidade:** BAIXA (coberto em 4.4)
- **Arquivo e linha:** `backend/src/websocket/monitoramento.ts:17`
- **Descrição:** `new WebSocketServer({ server, path: caminho })` não valida `Origin` antes de aceitar conexão.
- **Correção recomendada:** Usar `verifyClient` com allowlist de origins.

### 6.2 Canal WebSocket sem TLS
- **Severidade:** BAIXA
- **Descrição:** O WebSocket roda sobre a mesma porta HTTP. Não há suporte a `wss://`.
- **Impacto potencial:** Sniffing de mensagens de monitoramento em rede não confiável.
- **Correção recomendada:** Em produção, terminar TLS no servidor HTTP e habilitar `wss://`.

---

## 7. Injeção de Comandos — Resumo

| Ponto | Arquivo | Linha | Severidade |
|-------|---------|-------|------------|
| `exec(\`explorer "${absPath}"\`)` | `backend/src/api/arquivos.ts` | 102 | CRÍTICA |
| `execSync(comandoStr)` com prompt.md | `backend/src/servicios/KiloDispatcherService.ts` | 159 | CRÍTICA |
| `spawnSync(cmd, args)` com mensagem | `backend/src/servicios/ExecutorKiloDaemon.ts` | 149 | CRÍTICA |
| `spawnSync(KILO_CMD, args)` | `backend/src/servicios/DaemonManager.ts` | 104, 165, 220 | BAIXA* |

\* DaemonManager usa argumentos hardcoded (`daemon start/status/stop`), risco menor, mas ainda depende de `KILO_CMD` do ambiente.

---

## 8. Autenticação/Autorização — Resumo

| Endpoint | Método | Status | Observação |
|----------|--------|--------|------------|
| `/api/status` | GET | Público | Informacional, OK |
| `/api/projetos` | GET | Público | Lista projetos com caminhos — **vazamento** |
| `/api/projetos/scan` | GET | Público | Enumeração de diretórios — **crítico** |
| `/api/projetos/settings` | GET | Público | Exclui postgresConfig mas expõe `diretorioProjetosDefault` |
| `/api/projetos/settings` | PUT | Autenticado | Mass assignment — **crítico** |
| `/api/admin/cors` | PUT | Autenticado | CORS dinâmico sem validação |
| `/api/arquivos/explorer` | GET | Autenticado | Execução de comando — **crítico** |
| `/api/orquestrador/*` | POST/PUT | Autenticado | Execução de dispatch com input do usuário |

---

## 9. Recomendações Prioritárias

1. **Remover ou reescrever `/api/arquivos/explorer`** — eliminar `exec` ou usar `execFile` com allowlist rigorosa.
2. **Refatorar orquestrador** — migrar `execSync`/`spawnSync` para API de argumentos array, sanitizar mensagens de usuário.
3. **Bloquear `/api/projetos/scan`** — remover do bypass de auth ou restringir ao diretório default.
4. **Corrigir CSRF** — validar `Origin` independentemente de `Referer` e implementar tokens.
5. **Remover atualização dinâmica de CORS** — ou validar origins contra allowlist hardcoded.
6. **Implementar rate limiting distribuído** — Redis + limites por endpoint.
7. **Adicionar HSTS e remover `unsafe-inline` do CSP** — fortalecer defesa em profundidade.
8. **Implementar pre-commit hooks** — `detect-secrets` / `gitleaks` para prevenir commits de segredos.
9. **Sanitizar logs** — nunca logar caminhos absolutos ou comandos completos em produção.
10. **Adicionar `verifyClient` ao WebSocket** — validar origem antes de handshake.

---

## 10. Pontos Positivos

- Path traversal está bem mitigado em `FileService` e `PathValidator` com `fs.realpathSync`.
- API key é gerada com 256 bits de entropia (`crypto.randomBytes(32)`).
- MCP Server inclui sanitização de parâmetros sensíveis (`sanitizarParametros`).
- Security headers básicos estão presentes (`X-Content-Type-Options`, `X-Frame-Options`).
- `.gitignore` cobre arquivos de segredos (`**/.api-key`, `.env.*`).
- Validação de schema JSON via AJV está implementada na maioria dos endpoints.

---

*Fim do relatório.*
