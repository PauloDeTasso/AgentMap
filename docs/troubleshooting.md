# Troubleshooting

> **Versão:** 1.0.0  
> **Data:** 2026-08-28  
> **Branch:** v0044

---

## 1. Instalação e Setup

### 1.1 `agentmap doctor` reporta `MCP_NOT_BUILT`

**Sintoma:** O MCP server não foi buildado.

**Solução:**
```bash
cd .ia/runtime/mcp
npm install
npm run build
```

### 1.2 Porta 3150 já em uso

**Sintoma:** `Error: listen EADDRINUSE: address already in use :::3150`

**Solução:**
```bash
# Windows
netstat -ano | findstr :3150
taskkill /PID <PID> /F

# Linux/macOS
lsof -i :3150
kill -9 <PID>
```

### 1.3 `npm install` falha com erro de permissão

**Sintoma:** `EACCES` ou `EPERM` durante `npm install`

**Solução:**
```bash
# Windows (PowerShell como Admin)
npm install

# Linux/macOS
sudo npm install
# ou
npm install --prefix ~/.npm-global
```

---

## 2. MCP e Kilo Code

### 2.1 MCP não aparece no Kilo Code

**Sintoma:** Tools do AgentMap não aparecem no Kilo Code.

**Solução:**
1. Verifique se `kilo.jsonc` está na raiz do projeto
2. Verifique se o comando MCP está correto:
   ```jsonc
   {
     "mcp": {
       "agentmap": {
         "type": "local",
         "command": ["cmd", "/c", "npx", "tsx", "--tsconfig", "backend/tsconfig.json", "backend/src/mcp-server/index.ts"]
       }
     }
   }
   ```
3. Recarregue a janela: `Ctrl+Shift+P` → `Developer: Reload Window`

### 2.2 Plugin de wake-up não funciona

**Sintoma:** Agente não acorda automaticamente.

**Solução:**
1. Verifique se `.kilo/plugin/agentmap-wakeup.ts` existe
2. Verifique se `plugin` está configurado em `kilo.jsonc`:
   ```jsonc
   {
     "plugin": ["./.kilo/plugin/agentmap-wakeup.ts"]
   }
   ```
3. Verifique variáveis de ambiente:
   - `AGENTMAP_API_URL` deve apontar para `http://localhost:3150`
4. Verifique logs do plugin no console do Kilo Code

### 2.3 Tools MCP retornam erro

**Sintoma:** `isError: true` em tools MCP.

**Solução:**
1. Verifique se o backend está rodando: `http://localhost:3150/api/status`
2. Verifique logs do backend
3. Verifique se `kilo.jsonc` tem `NODE_ENV: "production"`
4. Teste a API diretamente:
   ```bash
   curl http://localhost:3150/api/status
   ```

---

## 3. Arquivos e Caminhos

### 3.1 Path Traversal

**Sintoma:** Erro de path traversal ao acessar arquivos.

**Solução:**
- O AgentMap valida todos os caminhos para evitar acesso fora do projeto
- Verifique se o caminho solicitado está dentro da raiz do projeto
- Use caminhos relativos à raiz do projeto

### 3.2 Arquivos JSON inválidos

**Sintoma:** Erro de validação ao ler arquivos `.ia/`.

**Solução:**
1. Valide o JSON:
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('.ia/tarefas/tarefas.json', 'utf8'))"
   ```
2. Verifique encoding (deve ser UTF-8)
3. Verifique se há JSONC (comentários) em arquivos que devem ser JSON puro

---

## 4. Agentes e Handoffs

### 4.1 Agente não aparece na lista

**Sintoma:** Agente criado não aparece no AgentMap.

**Solução:**
1. Verifique se o arquivo JSON do agente está em `.ia/agentes/`
2. Verifique se o JSON é válido
3. Verifique se o agente tem `id` e `nome`
4. Reinicie o backend

### 4.2 Handoff não é criado

**Sintoma:** Erro ao criar handoff.

**Solução:**
1. Verifique se o agente de destino existe
2. Verifique se a tarefa existe
3. Verifique se há dependências pendentes
4. Verifique logs do backend

---

## 5. Performance

### 5.1 Backend lento

**Sintoma:** Requisições demoram mais de 1s.

**Solução:**
1. Verifique se há lock files (`*.lock`) em `.ia/`
2. Verifique se há arquivos JSON muito grandes
3. Verifique se há processos Node.js acumulados
4. Considere aumentar memória: `NODE_OPTIONS=--max-old-space-size=4096`

### 5.2 Frontend não carrega

**Sintoma:** Página em branco ou erro 404.

**Solução:**
1. Verifique se o backend serve arquivos estáticos
2. Verifique se `index.html` existe em `frontend/`
3. Verifique rotas do Express

---

## 6. Banco de Dados

### 6.1 PostgreSQL não conecta

**Sintoma:** Erro de conexão com PostgreSQL.

**Solução:**
1. Verifique se o PostgreSQL está rodando
2. Verifique credenciais em `.env`
3. Verifique se o banco existe:
   ```sql
   SELECT datname FROM pg_database;
   ```

> **Nota:** PostgreSQL é opcional e não implementado no momento. O AgentMap usa filesystem + JSON como armazenamento primário.

---

## 7. Qualidade e CI/CD

### 7.1 Testes falham localmente mas passam no CI

**Sintoma:** Testes falham no Windows mas passam no Linux (CI).

**Solução:**
1. Verifique paths (Windows usa `\`, Linux usa `/`)
2. Verifique case sensitivity de arquivos
3. Verifique encoding de arquivos (CRLF vs LF)

### 7.2 Coverage baixo

**Sintoma:** Cobertura abaixo de 80%.

**Solução:**
1. Execute `npm run test:coverage`
2. Identifique arquivos não cobertos
3. Adicione testes para cenários críticos
4. Priorize: services, repositories, rotas HTTP

---

## 8. Comunicação entre Agentes

### 8.1 Agente filho não consegue enviar mensagem

**Sintoma:** Erro ao enviar mensagem via HTTP.

**Solução:**
1. Verifique se o backend está rodando
2. Verifique se a porta 3150 está acessível
3. Verifique CORS (origins configuradas para desenvolvimento local)
4. Use HTTP direto:
   ```bash
   curl -X POST http://localhost:3150/api/monitoramento/mensagens \
     -H "Content-Type: application/json" \
     -d '{"tipo":"KILO_CHAT","emissor":"agente","agenteId":"backend","conteudo":"teste"}'
   ```

### 8.2 Mensagens não são recebidas

**Sintoma:** Agente não recebe respostas.

**Solução:**
1. Verifique se o agente está consultando mensagens:
   ```bash
   curl "http://localhost:3150/api/monitoramento/kilo/receive-chat?agenteId=backend&limite=20"
   ```
2. Verifique se há mensagens no painel Monitor
3. Verifique se o agente confirmou eventos anteriores

---

## 9. Git e Versionamento

### 9.1 Arquivos `.ia/` não commitados

**Sintoma:** `.ia/` não está no Git.

**Solução:**
```bash
git add .ia/
git commit -m "feat: adiciona estrutura .ia/"
```

### 9.2 Conflitos em arquivos JSON

**Sintoma:** Conflitos de merge em `tarefas.json`.

**Solução:**
1. Use ferramentas de merge JSON
2. Valide JSON após merge
3. Considere fragmentar arquivos grandes (um arquivo por tarefa)

---

## 10. Comandos CLI

### 10.1 `agentmap update` sobrescreve edições

**Sintoma:** Edições do usuário são perdidas.

**Solução:**
- O `update` preserva seções customizadas em `AGENTS.md`
- O `update` preserva configurações pessoais em `kilo.jsonc`
- Use `--dry-run` para ver o que será alterado

### 10.2 `agentmap init` falha em projeto não vazio

**Sintoma:** Erro ao inicializar em projeto existente.

**Solução:**
```bash
# Use --force para sobrescrever
agentmap init --force
```

---

## 11. Referências

- [`docs/installation.md`](installation.md)
- [`docs/development.md`](development.md)
- [`docs/cli.md`](cli.md)
- [`docs/migration.md`](migration.md)
