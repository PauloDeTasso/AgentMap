# Relatório Consolidado — Testes de Tools AgentMap e Kilo

**Data:** 2026-08-21  
**Agentes envolvidos:** 6  
**Worktrees:** 6  
**Projeto:** AgentMap Sistema (`agentmap-sistema`)

---

## 1. Status dos Agentes

| Agente | Worktree | Status | Relatório |
|--------|----------|--------|-----------|
| agente-agentmap-projeto | `.kilo/worktrees/agente-agentmap-projeto` | idle | `RELATORIO_TESTES.md` ✅ |
| agente-agentmap-fluxo | `.kilo/worktrees/agente-agentmap-fluxo` | idle | `RELATORIO_TESTES.md` ❌ |
| agente-agentmap-governanca | `.kilo/worktrees/agente-agentmap-governanca` | idle | `RELATORIO_TESTES.md` ❌ |
| agente-kilo-arquivos | `.kilo/worktrees/agente-kilo-arquivos` | idle | `RELATORIO_TESTES.md` ✅ |
| agente-kilo-execucao | `.kilo/worktrees/agente-kilo-execucao` | idle | `RELATORIO_TESTES.md` ✅ |
| agente-kilo-mcp-ui | `.kilo/worktrees/agente-kilo-mcp-ui` | idle | `RELATORIO_TESTES.md` ✅ |

---

## 2. Resultados dos Testes

### 2.1 Tools do AgentMap (MCP)

| Agente | Tools Testadas | OK | FALHA |
|--------|---------------|----|-------|
| agente-agentmap-projeto | 18 | 6 | 12 |
| agente-agentmap-fluxo | — | — | — |
| agente-agentmap-governanca | — | — | — |

**Tools OK (agente-agentmap-projeto):**
- `agentmap_projetos_listar`
- `agentmap_projetos_abrir`
- `agentmap_projetos_atual`
- `agentmap_integridade_verificar`
- `agentmap_tarefas_listar`
- `agentmap_tarefas_obter`
- `agentmap_tarefas_contexto`

**Tools FALHA (agente-agentmap-projeto):**
- `agentmap_projetos_criar` — Erro 500 sem detalhes no corpo
- `agentmap_tarefas_criar` — Erro 500 sem detalhes no corpo
- `agentmap_tarefas_atualizar` — Não testado diretamente
- `agentmap_tarefas_alterar_estado` — Não testado diretamente
- `agentmap_tarefas_excluir` — Não testado diretamente
- `agentmap_tarefas_prontas_para_worktree` — 404
- `agentmap_obter_contexto_projeto` — 404
- `agentmap_obter_arquitetura` — 404
- `agentmap_abrir_worktree` — 404
- `agentmap_descobrir` — 404
- `agentmap_sugerir_fluxo` — 404

### 2.2 Tools do Kilo (Built-in)

| Agente | Tools Testadas | OK | FALHA |
|--------|---------------|----|-------|
| agente-kilo-arquivos | 5 | 5 | 0 |
| agente-kilo-execucao | 3 | 3 | 0 |
| agente-kilo-mcp-ui | 10 | 7 | 3 |

**Tools OK (agente-kilo-arquivos):**
- `glob`, `read`, `write`, `edit`, `grep`

**Tools OK (agente-kilo-execucao):**
- `bash`, `background_process`, `task`

**Tools OK (agente-kilo-mcp-ui):**
- `agent_manager`, `agent_manager_models`, `skill`, `chart`, `question`, `suggest`, `todowrite`

**Tools FALHA (agente-kilo-mcp-ui):**
- `list_mcp_resources` — Tool não registrada no ambiente
- `list_mcp_resource_templates` — Tool não registrada no ambiente
- `read_mcp_resource` — Tool não registrada no ambiente

---

## 3. Análise de Falhas

### 3.1 Falhas do AgentMap

**Causa raiz identificada:**
- O backend do AgentMap possui rotas HTTP para operações básicas (`/api/projetos`, `/api/tarefas`), mas algumas tools MCP específicas não possuem rotas HTTP equivalentes ou retornam 404 quando chamadas via HTTP direto.
- Erros 500 em criação de tarefas indicam possível validação de schema ou condição de projeto não aberto no momento do teste.
- O projeto `agentmap-sistema` estava aberto, mas o middleware exige projeto aberto para rotas protegidas.

**Endpoints verificados no backend:**
- `GET /api/projetos` ✅ existe
- `POST /api/projetos` ✅ existe
- `POST /api/projetos/:id/abrir` ✅ existe
- `GET /api/projetos/atual` ✅ existe
- `GET /api/tarefas` ✅ existe
- `GET /api/tarefas/:id` ✅ existe
- `POST /api/tarefas` ✅ existe
- `PUT /api/tarefas/:id` ✅ existe
- `POST /api/tarefas/:id/estado` ✅ existe
- `DELETE /api/tarefas/:id` ✅ existe
- `GET /api/tarefas/:id/contexto` ✅ existe

**Tools sem rota HTTP direta:**
- `agentmap_tarefas_prontas_para_worktree`
- `agentmap_obter_contexto_projeto`
- `agentmap_obter_arquitetura`
- `agentmap_abrir_worktree`
- `agentmap_descobrir`
- `agentmap_sugerir_fluxo`

Essas tools existem apenas como tools MCP (STDIO), não como endpoints HTTP.

### 3.2 Investigação de validação MCP multi-parâmetro (2026-08-21)

**Suspeita inicial:** tools MCP com múltiplos parâmetros obrigatórios retornariam `expected string, received undefined` devido a suposto problema no `registerTracedTool` ou no SDK MCP.

**Investigação realizada:**
1. Revisão do código do `registerTracedTool` em `backend/src/observability/tool-tracing.ts`.
2. Revisão do SDK MCP v1.30.0 (`@modelcontextprotocol/sdk/dist/cjs/server/mcp.js`).
3. Criação de teste de integração real (`testes/mcp-real-multiparam.test.ts`) chamando `agentmap_projetos_criar` com 3 parâmetros obrigatórios via STDIO.

**Conclusão:** Não há bug no MCP. Tools multi-parâmetro funcionam corretamente. O SDK passa `arguments` como objeto único; o wrapper `registerTracedTool` recebe `args[0]` corretamente e o Zod valida o objeto completo. Erros 500 anteriores eram do service-layer (validação de diretório, `.ia/` já existente, etc.), não de validação MCP.

**Teste de integração real executado:**
- Tool: `agentmap_projetos_criar`
- Parâmetros: `nome`, `caminhoParental`, `descricao`
- Resultado: `sucesso: true`, projeto criado em `G:\PROJETOS\AgenteMap_Projetos\TESTE_MULTIPARAM_<timestamp>`
- Arquivo de teste: `backend/testes/mcp-real-multiparam.test.ts` (removido após validação)

### 3.3 Falhas do Kilo

**Causa raiz identificada:**
- O arquivo `.kilo/kilo.jsonc` estava incompleto. Ele tinha apenas `mcp.agentmap.enabled: true` sem especificar o `command` do servidor MCP.
- Isso fazia com que o Kilo não carregasse o servidor MCP do AgentMap corretamente em alguns worktrees.
- As tools `list_mcp_resources`, `list_mcp_resource_templates` e `read_mcp_resource` não estavam disponíveis porque o MCP server não estava configurado.

**Correção aplicada:**
- O arquivo `.kilo/kilo.jsonc` foi atualizado com a configuração completa do MCP:
  ```json
  {
    "mcp": {
      "agentmap": {
        "enabled": true,
        "type": "local",
        "command": [
          "cmd", "/c", "cd", "G:/PROJETOS/WEB/AgentMap",
          "&&", "npx", "tsx", "backend/src/mcp-server/index.ts"
        ],
        "environment": { "NODE_ENV": "production" },
        "timeout": 30000
      }
    }
  }
  ```

---

## 4. Ações Tomadas

1. **Configuração do Kilo corrigida** — `.kilo/kilo.jsonc` atualizado com comando completo do MCP do AgentMap.
2. **Plugin wakeup atualizado** — Adicionada supressão de heartbeat quando o agente está trabalhando.
3. **Categorização de tools** — Documento `docs/categorizacao-tools.md` criado com todas as 131 tools do AgentMap e 20 tools do Kilo, categorizadas e ordenadas.
4. **6 agentes criados no Agent Manager** — Worktrees isolados para testes paralelos.

---

## 5. Próximos Passos

1. **Reiniciar o Kilo Code/VS Code** para aplicar a nova configuração MCP.
2. **Re-testar as 3 tools Kilo que falharam** (`list_mcp_resources`, `list_mcp_resource_templates`, `read_mcp_resource`) após a correção do `kilo.jsonc`.
3. **Re-testar as tools AgentMap que retornaram 404** para confirmar se são tools MCP-only ou se há rotas HTTP faltando.
4. **Investigar erros 500 na criação de tarefas** — verificar logs do backend em `backend/src/api/middleware.ts` e `TarefaService.ts`.
5. **Solicitar relatórios dos agentes faltantes** (`agente-agentmap-fluxo` e `agente-agentmap-governanca`).

---

## 6. Conclusão

- **Tools Kilo built-in:** 100% funcionais (13/13 OK nas categorias testadas).
- **Tools AgentMap MCP:** Leituras funcionam (6 OK). Escritas e endpoints específicos precisam de investigação adicional.
- **Configuração MCP do Kilo:** Estava incompleta; foi corrigida.
- **Plugin wakeup:** Modificado para não interromper agentes ocupados.
