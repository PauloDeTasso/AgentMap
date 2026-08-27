# Guia: Projetos Auto-Contidos no AgentMap

## Visão geral

A partir de agora, todo projeto novo criado pelo AgentMap é **totalmente auto-contido**. O scaffold gera automaticamente todos os arquivos necessários para que agentes Kilo Code conectem ao MCP sem precisar copiar/colar configurações da pasta raiz do AgentMap.

## Arquivos gerados automaticamente

Quando um projeto é criado via `POST /api/projetos` ou `agentmap_projetos_criar`, o scaffold gera:

| Arquivo/Diretório | Propósito |
|---|---|
| `kilo.jsonc` | Configuração MCP com caminho absoluto para a instalação do AgentMap |
| `.kilo/plugin/agentmap-wakeup.ts` | Plugin de wake-up automático para Kilo Code |
| `.kilo/worktrees/` | Diretório base para worktrees isolados por agente (Agent Manager) |
| `AGENTS.md` | Regras e instruções específicas do projeto |
| `.ia/` | Estrutura completa de governança (contratos, tarefas, agentes, etc.) |
| `README.md` | README básico do projeto |

## Estrutura de um projeto auto-contido

```
<projeto>/
├── kilo.jsonc
├── AGENTS.md
├── README.md
├── .kilo/
│   ├── plugin/
│   │   └── agentmap-wakeup.ts
│   └── worktrees/
└── .ia/
    ├── configuracao/
    │   ├── projeto.json
    │   ├── gerenciador.json
    │   ├── ambiente.json
    │   └── README.md
    ├── agentes/
    │   ├── agentes.json
    │   ├── planejador/
    │   ├── frontend/
    │   ├── backend/
    │   ├── banco/
    │   ├── android/
    │   ├── infraestrutura/
    │   ├── testes/
    │   ├── revisor/
    │   ├── documentacao/
    │   ├── observabilidade/
    │   ├── desempenho/
    │   └── orquestrador/
    ├── contratos/
    ├── tarefas/
    ├── dependencias/
    ├── estado/
    ├── procedimentos/
    ├── auditoria/
    ├── contexto/
    ├── fluxo-desenvolvimento.json
    └── fluxo-trabalho.md
```

## Como funciona o `kilo.jsonc`

O arquivo `kilo.jsonc` gerado contém **apenas** a configuração MCP e o plugin. Não inclui configuração de providers (modelos de IA), que permanece no `kilo.jsonc` global do usuário.

Exemplo de conteúdo:

```json
{
  "mcp": {
    "agentmap": {
      "type": "local",
      "command": [
        "cmd", "/c", "cd",
        "G:\\PROJETOS\\WEB\\AgentMap",
        "&&", "npx", "tsx",
        "--tsconfig", "backend/tsconfig.json",
        "backend/src/mcp-server/index.ts"
      ],
      "environment": {
        "NODE_ENV": "production"
      },
      "enabled": true,
      "timeout": 30000
    }
  },
  "plugin": [
    "./.kilo/plugin/agentmap-wakeup.ts"
  ]
}
```

O comando MCP usa `cmd /c cd <caminho_agentmap> && npx tsx ...` para garantir que o processo MCP seja iniciado a partir da pasta correta, independentemente de onde o projeto esteja aberto.

## Como funciona o plugin de wake-up

O plugin `.kilo/plugin/agentmap-wakeup.ts` é uma cópia exata do plugin oficial do AgentMap. Ele:

1. Escuta eventos do ciclo de vida do Kilo Code (`session.idle`, `session.created`, etc.)
2. Consulta `http://localhost:3150/api/monitoramento/mensagens` por mensagens relevantes
3. Injeta um prompt na sessão ociosa para acordar o agente automaticamente
4. Monitora a saúde da conexão com o AgentMap (`/api/status`, `client.mcp.status`) e tenta recuperar automaticamente em caso de queda
5. Em caso de queda do MCP, reconecta via `client.mcp.connect` / `client.mcp.add`
6. Em caso de queda do HTTP backend, reinicia automaticamente usando BunShell ou `child_process.spawn` com fallback para Windows
7. Notifica sessões ociosas da recuperação com um prompt automático

O plugin usa `process.env.AGENTMAP_API_URL` (padrão: `http://localhost:3150`) para descobrir o AgentMap, não dependendo de caminhos hardcoded.

### Variáveis de ambiente do plugin

| Variável | Padrão | Descrição |
|---|---|---|
| `AGENTMAP_API_URL` | `http://localhost:3150` | URL base do backend HTTP do AgentMap |
| `AGENTMAP_API_KEY` | *(vazio)* | Chave API (`x-api-key`) enviada no header |
| `AGENTMAP_WAKEUP_DEBOUNCE_MS` | `3000` | Janela de debounce entre verificações de wake-up (ms) |
| `AGENTMAP_HEALTH_CHECK_INTERVAL_MS` | `15000` | Intervalo do health check de saúde MCP/HTTP (ms) |
| `AGENTMAP_HTTP_TIMEOUT_MS` | `8000` | Timeout para requisições HTTP ao AgentMap (ms) |
| `AGENTMAP_HTTP_RESTART_RETRY_MS` | `5000` | Intervalo mínimo entre tentativas de restart do HTTP backend (ms) |
| `AGENTMAP_MCP_RECONNECT_MS` | `10000` | Intervalo mínimo entre tentativas de reconexão MCP (ms) |
| `AGENTMAP_BACKEND_DIR` | `backend` | Diretório do backend para restart automático |

## Migrando projetos existentes

Se você tem projetos criados **antes** dessa funcionalidade, siga estes passos para torná-los auto-contidos:

1. **Crie o `kilo.jsonc` na raiz do projeto:**

   ```json
   {
     "mcp": {
       "agentmap": {
         "type": "local",
         "command": [
           "cmd", "/c", "cd",
           "<CAMINHO_AGENTMAP>",
           "&&", "npx", "tsx",
           "--tsconfig", "backend/tsconfig.json",
           "backend/src/mcp-server/index.ts"
         ],
         "environment": { "NODE_ENV": "production" },
         "enabled": true,
         "timeout": 30000
       }
     },
     "plugin": ["./.kilo/plugin/agentmap-wakeup.ts"]
   }
   ```

2. **Copie o plugin:**
   ```bash
   cp <AGENTMAP>/.kilo/plugin/agentmap-wakeup.ts <projeto>/.kilo/plugin/agentmap-wakeup.ts
   ```

3. **Crie o diretório de worktrees:**
   ```bash
   mkdir -p <projeto>/.kilo/worktrees
   ```

4. **(Opcional) Crie o `AGENTS.md`:**
   ```bash
   cp <AGENTMAP>/backend/src/arquivos/templates/projeto-kilo.ts <projeto>/AGENTS.md
   ```
   Ou use o template `AGENTES_MD` do arquivo `projeto-kilo.ts` para gerar o conteúdo.

5. **Recarregue o VS Code** para que o Kilo Code detecte o novo `kilo.jsonc`.

## Benefícios

- **Sem cópia manual**: o `kilo.jsonc` já está na raiz do projeto
- **Sem risco de modificar arquivos do AgentMap**: todos os arquivos do projeto estão na pasta do projeto
- **Conexão MCP automática**: ao abrir o projeto no VS Code, o MCP conecta sozinho
- **Wake-up automático incluso**: o plugin já está no lugar certo
- **Worktrees organizados**: o diretório `.kilo/worktrees/` está pronto para uso

## Troubleshooting

### MCP não conecta

1. Verifique se o `kilo.jsonc` existe na raiz do projeto
2. Verifique se o caminho do AgentMap no `kilo.jsonc` está correto (caminho absoluto)
3. Verifique se o AgentMap está rodando em `http://localhost:3150`
4. Recarregue o VS Code: `Ctrl+Shift+P` → `Developer: Reload Window`

### Plugin de wake-up não funciona

1. Verifique se `.kilo/plugin/agentmap-wakeup.ts` existe
2. Verifique se o caminho no `kilo.jsonc` aponta para `.kilo/plugin/agentmap-wakeup.ts` (relativo à raiz do projeto)
3. Verifique os logs do Kilo Code para erros de carregamento de plugin

### Agentes ainda acessam arquivos do AgentMap

- Isso não deve acontecer com projetos auto-contidos
- O `FileService` do AgentMap protege contra path traversal
- Se um agente precisar de docs do AgentMap, use referências absolutas em vez de caminhos relativos que escapem do projeto
