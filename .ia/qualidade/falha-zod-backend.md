# Spike/Incidente — Falha de Validação Zod no Backend/MCP

> **Data:** 2026-08-28  
> **Sistema:** AgentMap  
> **Impacto:** Tools MCP retornam erro `Cannot read properties of undefined (reading '_zod')`  
> **Status:** Em investigação

---

## 1. Sintoma

Múltiplas tools do AgentMap falham com o mesmo erro:

```
Cannot read properties of undefined (reading '_zod')
```

**Tools afetadas (confirmado):**
- `agentmap_eventos_pendentes`
- `agentmap_eventos_listar`
- `agentmap_arquivos_listar`
- `agentmap_auditoria_listar`
- `agentmap_obter_agente` (falha diferente: `Invalid structured content`)

**Impacto:**
- Impossível listar eventos pendentes
- Impossível listar arquivos do projeto
- Impossível consultar auditoria
- Impossível obter perfil de agente via tool

---

## 2. Causa Provável

O erro `_zod` sugere que o backend/MCP server está tentando acessar uma propriedade de validação Zod em um objeto `undefined`. Isso pode ocorrer quando:

1. **Schema de output quebrado:** O `outputSchema` ou `structuredContent` de uma tool está com formato inválido ou campo ausente.
2. **Validação pós-execução:** O wrapper `registerTracedTool` tenta validar o resultado da tool com Zod, mas o schema está `undefined` ou malformado.
3. **Backend desatualizado:** O MCP server compilado (`dist/` ou `node_modules`) não corresponde ao código-fonte atual.
4. **Falta de rebuild:** Após alterações nos schemas/types, o backend não foi rebuildado.

---

## 3. Evidências

| Tool | Erro |
|------|------|
| `agentmap_eventos_pendentes` | `Cannot read properties of undefined (reading '_zod')` |
| `agentmap_eventos_listar` | `Cannot read properties of undefined (reading '_zod')` |
| `agentmap_arquivos_listar` | `Cannot read properties of undefined (reading '_zod')` |
| `agentmap_auditoria_listar` | `Cannot read properties of undefined (reading '_zod')` |
| `agentmap_obter_agente` | `MCP error -32602: Output validation error... Invalid input: expected string, received undefined at dataCriacao` |

O erro do `agentmap_obter_agente` é diferente, mas ambos apontam para **validação de output/schema quebrada**.

---

## 4. Decisão Arquiteto

**PARAR operações de leitura via MCP tools até correção.**

Motivo:
- Ferramentas de governança estão indisponíveis.
- Qualquer decisão baseada em eventos/pendências/auditoria pode ser incorreta.
- O sintoma é sistêmico, não isolado.

**Próximos passos recomendados:**
1. Verificar se o backend está rodando a versão compilada correta.
2. Rebuildar o backend: `cd backend && npm run build`.
3. Verificar `backend/src/mcp-server/tools/index.ts` e wrappers de validação.
4. Verificar se `outputSchema` e `structuredContent` estão corretos em todas as tools.
5. Testar `agentmap_descobrir` para verificar tools básicas.

---

## 5. Ação Imediata para o DBA

Você pode continuar na **análise estática** dos arquivos `.ia/` diretamente no filesystem, sem depender das tools MCP.

**Arquivos relevantes para leitura direta:**
- `.ia/estado/estado-atual.json` — existe, mas está vazio (`[]`)
- `.ia/agentes/` — contém perfis JSON dos agentes
- `.ia/tarefas/` — contém tarefas
- `.ia/handoffs/` — handoffs
- `.ia/qualidade/` — documentos de qualidade

**Tarefas pendentes de banco (identificadas via listagem direta anterior):**
- `TAR-2026-00014` — Analisar modelo de dados
- `TAR-2026-00015` — Estratégia de migração PostgreSQL
- `TAR-2026-00016` — Verificar integridade dos dados

**Por enquanto:** Aguarde a correção do backend antes de prosseguir com ações que dependam de tools MCP.
