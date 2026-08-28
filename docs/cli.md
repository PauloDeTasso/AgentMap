# CLI do AgentMap

Manual de referência para os comandos `agentmap`.

## Instalação

```bash
cd backend
npm install
npm run build
npm link   # torna o comando `agentmap` disponível globalmente
```

## Comandos

### `agentmap init [--force] [--skip-mcp]`

Inicializa o AgentMap no diretório atual (ou no diretório alvo).

- **`--force`**: Sobrescreve arquivos existentes.
- **`--skip-mcp`**: Pula o bootstrap do MCP.

```bash
agentmap init
agentmap init --force
```

**O que faz:**
1. Cria `.ia/` (estrutura mínima)
2. Gera `.kilo/agents/agentmap/*.md` a partir de `.ia/agentes/*.json`
3. Gera `.kilo/rules/agentmap/*.md` a partir de `.ia/policies/`
4. Gera `.kilo/commands/agentmap/*.md` a partir de `.ia/procedures/`
5. Gera `AGENTS.md` com seção protegida
6. Gera `kilo.jsonc` a partir de `.ia/agentmap.json`
7. Executa bootstrap do MCP (se `.ia/runtime/mcp/` existir)

### `agentmap update [--dry-run] [--force]`

Atualiza arquivos gerenciados pelo AgentMap, preservando edições do usuário.

- **`--dry-run`**: Simula a atualização sem escrever arquivos.
- **`--force`**: Força sobrescrita de arquivos.

```bash
agentmap update
agentmap update --dry-run
```

**Comportamento:**
- Arquivos gerenciados (`.kilo/`, `AGENTS.md`, `kilo.jsonc`) são atualizados a partir das fontes em `.ia/`.
- Arquivos do usuário são preservados (seções customizadas em `AGENTS.md`, configurações pessoais em `kilo.jsonc`).

### `agentmap status [--json]`

Mostra o status de sincronização do AgentMap no projeto atual.

```bash
agentmap status
agentmap status --json
```

**Exibe:**
- ✅/❌/⚠️ para cada arquivo/pasta gerenciada
- Resumo de ok, warnings e erros

### `agentmap doctor [--json] [--repair]`

Valida a integridade do projeto AgentMap atual.

```bash
agentmap doctor
agentmap doctor --json
agentmap doctor --repair
```

**Verifica:**
- Estrutura mínima de diretórios (`.ia/contratos`, `.ia/tarefas`, etc.)
- Presença de `.ia/fluxo-trabalho.md`
- Definições JSON de agentes
- Dependências circulares
- Build do MCP
- Contratos válidos

### `agentmap repair`

Repara problemas comuns detectados pelo `doctor`.

```bash
agentmap repair
```

**Ações automáticas:**
- Cria diretórios obrigatórios ausentes
- Cria arquivos JSON mínimos vazios (`[]` ou `{}`)
- Cria `.ia/fluxo-trabalho.md` mínimo se ausente

## Fontes de verdade

| Arquivo gerado | Fonte |
|----------------|-------|
| `AGENTS.md` | Seção protegida + seção customizada do usuário |
| `kilo.jsonc` | `.ia/agentmap.json` + configurações MCP |
| `.kilo/agents/agentmap/*.md` | `.ia/agentes/*.json` |
| `.kilo/rules/agentmap/*.md` | `.ia/policies/` (ou regras padrão) |
| `.kilo/commands/agentmap/*.md` | `.ia/procedimentos/` |

## Arquivos protegidos

Os seguintes arquivos **não são sobrescritos** pelo `agentmap update`:

- `src/**`
- `backend/**`
- `frontend/**`
- `docs/**`
- `package.json`

## Exemplo de fluxo

```bash
# 1. Inicializa o AgentMap em um projeto existente
cd MEU_PROJETO
agentmap init --force

# 2. Desenvolve o projeto...

# 3. Quando o AgentMap for atualizado, sincroniza
agentmap update --dry-run   # ver o que mudou
agentmap update             # aplicar mudanças
```

## Troubleshooting

### `agentmap doctor` reporta `MCP_NOT_BUILT`

Execute `agentmap init` novamente ou build manualmente:

```bash
cd .ia/runtime/mcp
npm install
npm run build
```

### `kilo.jsonc` não é atualizado

Verifique se `.ia/agentmap.json` existe e é válido. O gerador faz merge seccional, preservando configurações personalizadas do usuário (modelos, providers).

### `.kilo/agents/agentmap/*.md` não são gerados

Verifique se `.ia/agentes/` contém subdiretórios com arquivos `.json`. Cada subdiretório deve ter um arquivo `<id>.json`.
