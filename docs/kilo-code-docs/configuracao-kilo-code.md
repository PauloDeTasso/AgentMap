# Configuração do Kilo Code — AgentMap

## 1. Por que essa configuração é necessária

Quando um usuário clona o AgentMap, a integração com o Kilo Code **não é instalada automaticamente**. O Kilo Code utiliza o arquivo `kilo.jsonc` na raiz do projeto para descobrir servidores MCP. Como o AgentMap é um sistema independente, essa configuração precisa ser adicionada manualmente pelo usuário.

Este guia documenta o procedimento correto para que qualquer usuário possa configurar a integração em menos de 2 minutos.

## 2. Pré-requisitos

- VS Code com extensão **Kilo Code** instalada
- Node.js 18+ e `npm` disponíveis no PATH
- Backend do AgentMap iniciado pelo menos uma vez (`npm run dev` ou `npm run mcp`)

## 3. Configuração

### 3.1 Arquivo de referência

O repositório inclui `kilo.jsonc.example` com a configuração mínima funcional.

```jsonc
{
  "$schema": "https://app.kilo.ai/config.json",
  "mcp": {
    "agentmap": {
      "type": "local",
      "command": ["cmd", "/c", "cd", "backend", "&&", "npx", "tsx", "src/mcp-server/index.ts"],
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

### 3.2 Instruções

1. Verifique se `kilo.jsonc` existe na raiz do AgentMap
2. Abra o arquivo e adicione a chave `mcp.agentmap` conforme o exemplo acima
3. Se `plugin` já existir, mantenha-o; caso contrário, adicione a lista `plugin`
4. Salve o arquivo
5. Recarregue a janela do VS Code: `Ctrl+Shift+P` → `Developer: Reload Window`
6. Verifique na extensão Kilo Code se o servidor `agentmap` aparece na lista de MCPs

### 3.3 Comando alternativo (Linux / macOS)

Se o usuário estiver em Linux ou macOS, ajuste o campo `command` para:

```jsonc
"command": ["bash", "-c", "cd backend && npx tsx src/mcp-server/index.ts"]
```

## 4. Referência de campos

| Campo | Tipo | Descrição |
|---|---|---|
| `mcp.agentmap.type` | `"local"` | Transporte local STDIO. Não utilize `"remote"` ou `"sse"`. |
| `mcp.agentmap.command` | `string[]` | Comando para iniciar o MCP Server. Deve apontar para `src/mcp-server/index.ts`. |
| `mcp.agentmap.environment` | `object` | Variáveis de ambiente passadas ao processo. `NODE_ENV=production` é recomendado para estabilidade. |
| `mcp.agentmap.enabled` | `boolean` | Habilita ou desabilita o servidor. Deve ser `true`. |
| `mcp.agentmap.timeout` | `number` | Timeout em milissegundos para inicialização do processo. Padrão: `30000`. |
| `plugin` | `string[]` | Caminhos para plugins Kilo. O plugin `agentmap-wakeup.ts` é obrigatório para wake-up automático do agente principal e monitoramento de saúde da conexão com o AgentMap. |

## 5. Variáveis locais (não versionadas)

Configurações específicas da máquina, como coleção de dados e credenciais de provedores, devem ser definidas em `kilo.local.jsonc` (arquivo ignorado pelo Git).

```jsonc
{
  "provider": {
    "openrouter": {
      "data_collection_enabled": false
    },
    "kilo": {
      "data_collection_enabled": false
    }
  }
}
```

## 6. Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| MCP `agentmap` não aparece na lista | `kilo.jsonc` não foi salvo ou contém erro de sintaxe | Valide o JSON; recarregue a janela |
| MCP aparece mas tools não carregam | Backend não foi iniciado ou porta `3150` ocupada | Execute `npm run dev` em `backend/` e confira `http://localhost:3150/api/health` |
| `command` não é encontrado | Caminho relativo incorreto ou `npx` não disponível | Verifique se está na raiz do AgentMap; confira `npx --version` |
| Plugin não carrega | Caminho `./.kilo/plugin/agentmap-wakeup.ts` inexistente | Verifique se o arquivo existe em `.kilo/plugin/` |
| Tools caem após restart do backend | Plugin não está reconectando automaticamente | Verifique logs do plugin (`[agentmap-health]`); confira se `client.mcp.status` está disponível |
| Backend não reinicia sozinho | `child_process.spawn` bloqueado no ambiente | Inicie o backend manualmente com `npm run dev`; o plugin continuará funcionando via HTTP |

## 7. Validação

Após configurar:

1. Abra o painel do Kilo Code → seção **MCP**
2. Confirme que `agentmap` está listado com status `connected`
3. Execute uma tool de teste, por exemplo `agentmap_descobrir`
4. Se a tool retornar capabilities, a integração está funcional

## 8. Referências

- [`docs/kilo-code-docs/comunicacao-agentmap-kilo.md`](comunicacao-agentmap-kilo.md) — Protocolo de comunicação HTTP/MCP entre AgentMap e agentes Kilo
- [`docs/kilo-code-docs/guia-agente-mcp.md`](guia-agente-mcp.md) — Guia do agente MCP
- [`docs/arquitetura-mcp.md`](arquitetura-mcp.md) — Arquitetura MCP do AgentMap
- `PLANO GERAL/arquivo/PLANO-WAKEUP-AGENTE-PRINCIPAL-KILOCODE.md` — Especificação do plugin de wake-up
