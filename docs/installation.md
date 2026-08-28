# Instalação e Setup

> **Versão:** 2.0.0  
> **Data:** 2026-08-28  
> **Branch:** v0044

---

## 1. Pré-requisitos

| Requisito | Versão Mínima | Descrição |
|-----------|---------------|-----------|
| **Node.js** | 18+ | Runtime JavaScript |
| **npm** | 8+ | Gerenciador de pacotes |
| **Git** | 2+ | Controle de versão |
| **VS Code** | 1.115+ | *(Opcional)* Para integração com Kilo Code / Agent Manager |

---

## 2. Instalação Rápida (Ready-to-Use)

O AgentMap é distribuído **pronto para usar**. Não requer `npm install` manual na primeira experiência.

### 2.1 Copiar Template para Projeto

```bash
# 1. Copie o AgentMap para a raiz do seu projeto
cp -r /caminho/AgentMap/* MEU_PROJETO/

# 2. Acesse a pasta do backend
cd MEU_PROJETO/backend

# 3. Instale dependências (primeira vez apenas)
npm install

# 4. Inicie o servidor
npm run dev
```

Acesse: http://localhost:3150

### 2.2 Verificação

```bash
# Verificar integridade
agentmap doctor
```

---

## 3. Instalação via CLI

### 3.1 Inicializar em Projeto Existente

```bash
# Navegue para a raiz do projeto existente
cd MEU_PROJETO

# Inicialize o AgentMap
npx agentmap init [--force] [--skip-mcp]
```

**O que o `init` faz:**
1. Cria `.ia/` (estrutura mínima)
2. Gera `.kilo/agents/agentmap/*.md` a partir de `.ia/agentes/*.json`
3. Gera `.kilo/rules/agentmap/*.md` a partir de `.ia/policies/`
4. Gera `.kilo/commands/agentmap/*.md` a partir de `.ia/procedimentos/`
5. Gera `AGENTS.md` com seção protegida
6. Gera `kilo.jsonc` a partir de `.ia/agentmap.json`
7. Executa bootstrap do MCP (se `.ia/runtime/mcp/` existir)

### 3.2 Atualizar AgentMap

```bash
# Simular atualização (dry-run)
agentmap update --dry-run

# Aplicar atualização
agentmap update
```

**Comportamento do `update`:**
- Arquivos gerenciados são atualizados a partir das fontes em `.ia/`
- Arquivos do usuário são preservados (seções customizadas em `AGENTS.md`, configurações pessoais em `kilo.jsonc`)

---

## 4. Estrutura de Pastas

### 4.1 Pasta do Projeto

```
MEU_PROJETO/
├── .ia/                    ← AgentMap (template/base)
│   ├── agentmap.json       ← Config local
│   ├── fluxo-trabalho.md
│   ├── contratos/
│   ├── tarefas/
│   ├── agentes/
│   ├── handoffs/
│   ├── sessoes/
│   ├── checkpoints/
│   ├── riscos/
│   ├── bloqueios/
│   ├── pendencias/
│   ├── reservas/
│   ├── decisoes/
│   ├── dependencias/
│   ├── responsabilidades/
│   ├── artefatos/
│   ├── resultados/
│   ├── criterios/
│   ├── aprendizados/
│   ├── validacoes/
│   ├── conflitos/
│   ├── auditoria/
│   ├── solicitacoes/
│   ├── instancias/
│   ├── orquestrador/
│   ├── estado/
│   ├── conhecimento/
│   ├── docs/
│   ├── procedimentos/
│   ├── permissoes/
│   ├── politicas/
│   ├── git/
│   ├── qualidade/
│   ├── historico/
│   └── temp/
├── backend/                ← Servidor do projeto (opcional)
│   ├── src/
│   │   ├── api/
│   │   ├── mcp-server/
│   │   ├── servicios/
│   │   ├── tipos/
│   │   ├── validacao/
│   │   └── main.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/               ← UI do projeto (opcional)
│   ├── index.html
│   ├── css/
│   └── js/
├── docs/                   ← Documentação do projeto (opcional)
│   ├── README.md
│   ├── API.md
│   └── ...
├── .kilo/                  ← Configuração Kilo Code
│   ├── agents/
│   │   └── agentmap/
│   ├── rules/
│   │   └── agentmap/
│   ├── commands/
│   │   └── agentmap/
│   └── plugin/
│       └── agentmap-wakeup.ts
├── AGENTS.md               ← Entry point (Kilo carrega automaticamente)
├── kilo.jsonc              ← Config Kilo + MCP
└── package.json            ← Workspace root (opcional)
```

### 4.2 Pasta do AgentMap (Sistema)

A pasta do **AgentMap** (sistema) contém o código fonte, docs e scripts. Ex.: `G:\PROJETOS\WEB\AgentMap\`

A pasta de **projetos gerenciados** contém os dados de cada projeto. Ex.: `G:\PROJETOS\AgenteMap_Projetos\`

> **Nota:** O sistema não permite criar projetos dentro da própria pasta do AgentMap. Essa validação evita mistura de código com dados operacionais.

---

## 5. Configuração do Kilo Code

### 5.1 Arquivo `kilo.jsonc`

O `kilo.jsonc` é gerado automaticamente pelo `agentmap init`. Ele define:

```jsonc
{
  "mcp": {
    "agentmap": {
      "type": "local",
      "command": [
        "cmd", "/c", "npx", "tsx",
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
  ],
  "agent": {
    // Definições dos agentes
  }
}
```

### 5.2 Plugin de Wake-up

O plugin `.kilo/plugin/agentmap-wakeup.ts` implementa:
1. **Detecção de idle** — escuta `session.idle` do Kilo
2. **Polling** — consulta mensagens pendentes no AgentMap
3. **Injeção** — acorda o agente com `promptAsync`

**Variáveis de ambiente:**

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `AGENTMAP_API_URL` | `http://localhost:3150` | URL do backend HTTP |
| `AGENTMAP_WAKEUP_DEBOUNCE_MS` | `3000` | Janela de debounce (ms) |
| `AGENTMAP_HEALTH_CHECK_INTERVAL_MS` | `15000` | Intervalo do health check (ms) |
| `AGENTMAP_HTTP_TIMEOUT_MS` | `8000` | Timeout HTTP (ms) |
| `AGENTMAP_BACKEND_DIR` | `backend` | Diretório do backend |

---

## 6. Comandos CLI

### 6.1 Inicializar

```bash
agentmap init [--force] [--skip-mcp]
```

### 6.2 Atualizar

```bash
agentmap update [--dry-run] [--force]
```

### 6.3 Verificar Status

```bash
agentmap status [--json]
```

### 6.4 Validar Integridade

```bash
agentmap doctor [--json] [--repair]
```

### 6.5 Reparar Problemas

```bash
agentmap repair
```

---

## 7. Verificação da Instalação

### 7.1 Checklist de Saúde

```bash
# 1. Verificar estrutura
agentmap doctor

# 2. Verificar status de sincronização
agentmap status

# 3. Testar MCP
# No Kilo Code, verifique se as tools do AgentMap aparecem
```

### 7.2 Checklist Manual

- [ ] `.ia/` existe na raiz do projeto
- [ ] `.ia/fluxo-trabalho.md` existe
- [ ] `.kilo/agents/agentmap/` contém arquivos `.md`
- [ ] `AGENTS.md` existe na raiz
- [ ] `kilo.jsonc` existe na raiz
- [ ] Backend inicia em `http://localhost:3150`
- [ ] Frontend acessível em `http://localhost:3150`
- [ ] MCP server responde via STDIO

---

## 8. Troubleshooting de Instalação

### MCP não aparece no Kilo Code

1. Verifique se `kilo.jsonc` está na raiz do projeto
2. Verifique se o comando MCP está correto
3. Recarregue a janela: `Ctrl+Shift+P` → `Developer: Reload Window`

### `agentmap doctor` reporta `MCP_NOT_BUILT`

```bash
cd .ia/runtime/mcp
npm install
npm run build
```

### Porta 3150 já em uso

```bash
# Verificar processo na porta
netstat -ano | findstr :3150

# Matar processo (Windows)
taskkill /PID <PID> /F
```

---

## 9. Próximos Passos

1. Leia o [Guia de Desenvolvimento](development.md)
2. Consulte a [Documentação de Arquitetura](architecture.md)
3. Explore a [Referência da API](api-reference.md)
4. Entenda os [Comandos CLI](cli.md)

---

## 10. Referências

- [`docs/cli.md`](cli.md)
- [`docs/architecture.md`](architecture.md)
- [`docs/development.md`](development.md)
- [`AGENTS.md`](../AGENTS.md)
- [`kilo.jsonc`](../kilo.jsonc)
