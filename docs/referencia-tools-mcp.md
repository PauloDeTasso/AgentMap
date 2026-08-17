# Referência de Tools MCP

Este documento lista as 131 tools MCP disponíveis para integração com agentes externos via Model Context Protocol.

> **Nota:** O AgentMap disponibiliza um conjunto completo de tools padronizadas para que agentes de IA possam interagir com projetos, tarefas, agentes, workflows, handoffs e demais entidades do gerenciador. Todas as operações seguem convenções consistentes de entrada, saída e validação.

## Convenções

- **Tool names:** `agentmap_<entidade>_<acao>`
- **Argumentos:** objeto JSON único `arguments` no método MCP `tools/call`
- **Projeto:** quase todas as tools exigem um projeto aberto no AgentMap
- **Ambiente:** local, sem autenticação obrigatória

## Catálogo completo

### Monitoramento

| Tool / Endpoint | Descrição | Parâmetros |
|---|---|---|
| `agentmap_monitoramento_obter` | Obtém visão consolidada do monitoramento | `{}` |
| `agentmap_monitoramento_mensagens_listar` | Lista mensagens de monitoramento | `{ "limite"?: number, "agenteId"?: string, "tipo"?: string }` |
| `agentmap_monitoramento_mensagens_criar` | Cria mensagem de monitoramento | `{ "tipo": string, "emissor": string, "agenteId"?: string, "tarefaId"?: string, "conteudo": string, "dados"?: Record<string, unknown>, "acoes"?: unknown[] }` |
| `agentmap_monitoramento_agente_status` | Atualiza status de agente monitorado | `{ "agenteId": string, "status": string, ...dados }` |
| `agentmap_monitoramento_agentes_listar` | Lista agentes monitorados | `{}` |
| `agentmap_monitoramento_modo_obter` | Obtém modo global de operação | `{}` |
| `agentmap_monitoramento_modo_alterar` | Altera modo global de operação | `{ "modo": "MANUAL" | "AUTO", "escopo": string, "agenteId"?: string }` |
| `agentmap_monitoramento_intervir` | Executa intervenção manual | `{ "comando": string, "payload"?: Record<string, unknown> }` |
| `agentmap_monitoramento_dispatcher_pendentes` | Lista itens pendentes do dispatcher | `{ "agenteId"?: string }` |
| `agentmap_monitoramento_dispatcher_executar` | Executa item pendente do dispatcher | `{ "agenteId": string }` |
| `agentmap_monitoramento_dispatcher_logs` | Lista logs do dispatcher | `{ "limite"?: number }` |

#### Tools Kilo (somente leitura para agentes filhos)

| Tool | Descrição | Parâmetros |
|---|---|---|
| `kilohub_receive_chat_message` | Busca respostas/mensagens direcionadas a um agente Kilo | `{ "agenteId"?: string, "tarefaId"?: string, "messageId"?: string, "limite"?: number }` |
| `kilohub_report_status` | Reporta status de sessão Kilo | `{ "messageId": string, "sessionId": string, "status": "ativo" | "pausado" | "finalizado" | "erro", "message"?: string }` |
| `kilohub_report_progress` | Reporta progresso de tarefa | `{ "messageId": string, "tarefaId": string, "progress": number, "message"?: string }` |
| `kilohub_report_result` | Reporta resultado final de tarefa | `{ "messageId": string, "tarefaId": string, "resultado": { "resumo": string, "arquivosAlterados"?: string[], "testesExecutados"?: string[], "testesAprovados"?: string[], "riscosEncontrados"?: string[], "pendencias"?: string[], "observacoes"?: string, "commit"?: string } }` |

> **Importante:** `kilohub_send_chat_message` foi removida. Agentes filhos devem usar **HTTP** para enviar mensagens.

**Endpoint REST equivalente:** `GET /api/monitor` retorna visão consolidada com projeto, estado, sessões ativas, alertas, mensagens recentes e eventos.

**Envio de mensagens por HTTP (filho → AgentMap):**
```bash
curl -X POST http://localhost:3150/api/monitoramento/mensagens \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "KILO_CHAT",
    "emissor": "agente-kilo",
    "agenteId": "backend-teste",
    "tarefaId": "TAR-2026-00001",
    "conteudo": "[backend-teste][TAR-2026-00001] Mensagem completa...",
    "dados": {"messageId": "msg-001"}
  }'
```

**Leitura de mensagens por HTTP (filho ← AgentMap):**
```bash
curl "http://localhost:3150/api/monitoramento/kilo/receive-chat?agenteId=backend-teste&limite=20"
```

### Projetos

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_projetos_listar` | Lista todos os projetos registrados | `{}` |
| `agentmap_projetos_criar` | Cria um novo projeto | `{ "nome": string, "caminhoParental": string, "descricao": string }` |
| `agentmap_projetos_abrir` | Abre um projeto existente por caminho ou ID | `{ "caminhoOuId": string }` |
| `agentmap_projetos_fechar` | Fecha o projeto atualmente aberto | `{ "id": string }` |
| `agentmap_projetos_atual` | Retorna o projeto atualmente aberto | `{}` |
| `agentmap_integridade_verificar` | Verifica integridade do projeto aberto | `{ "projetoId"?: string }` |

### Agentes

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_agentes_listar` | Lista todos os agentes do projeto aberto | `{}` |
| `agentmap_agentes_obter` | Obtém um agente pelo ID | `{ "id": string }` |
| `agentmap_agentes_criar` | Cria um novo agente | `{ "dados": Record<string, unknown> }` |
| `agentmap_agentes_atualizar` | Atualiza um agente existente | `{ "id": string, ...dados }` |
| `agentmap_agentes_excluir` | Exclui um agente | `{ "id": string }` |

### Tarefas

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_tarefas_listar` | Lista todas as tarefas do projeto aberto | `{}` |
| `agentmap_tarefas_obter` | Obtém uma tarefa pelo ID | `{ "id": string }` |
| `agentmap_tarefas_criar` | Cria uma nova tarefa | `{ "dados": Record<string, unknown> }` |
| `agentmap_tarefas_atualizar` | Atualiza uma tarefa existente | `{ "id": string, ...dados }` |
| `agentmap_tarefas_alterar_estado` | Altera o estado de uma tarefa | `{ "id": string, "novoEstado": string }` |
| `agentmap_tarefas_excluir` | Exclui uma tarefa | `{ "id": string }` |
| `agentmap_tarefas_contexto` | Monta pacote de contexto completo para uma tarefa | `{ "id": string }` |

### Workflows

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_workflows_iniciar_trabalho` | Valida agente + tarefa e monta contexto completo | `{ "agenteId": string, "tarefaId": string }` |
| `agentmap_workflows_finalizar_trabalho` | Registra resultado, artefatos, handoff e finaliza sessão | `{ "sessaoId"?: string, "tarefaId": string, "agenteId": string, "resumo": string, "estado"?: string, "arquivosAlterados"?: string[], "testesExecutados"?: string[], "testesAprovados"?: string[] }` |
| `agentmap_workflows_consultar_pendencias` | Consulta pendências, handoffs, validações e bloqueios por agente | `{ "agenteId": string }` |
| `agentmap_workflows_obter_mapa_projeto` | Obtém o mapa completo do projeto | `{}` |

### Worktree / Paralelismo

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_tarefas_prontas_para_worktree` | Lista tarefas sem dependência pendente | `{}` |
| `agentmap_verificar_dependencias_pendentes` | Verifica dependências de uma tarefa | `{ "tarefaId": string }` |
| `agentmap_abrir_worktree` | Cria worktree automaticamente para uma tarefa | `{ "tarefaId": string, "agenteId"?: string }` |

### Handoffs

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_handoffs_listar` | Lista todos os handoffs do projeto | `{ "destino"?: string }` |
| `agentmap_handoffs_obter` | Obtém um handoff pelo ID | `{ "id": string }` |
| `agentmap_handoffs_criar` | Cria um novo handoff | `{ "dados": Record<string, unknown> }` |
| `agentmap_handoffs_atualizar` | Atualiza um handoff existente | `{ "id": string, ...dados }` |
| `agentmap_handoffs_excluir` | Exclui um handoff | `{ "id": string }` |

### Solicitações de alteração

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_solicitacoes_listar` | Lista todas as solicitações | `{}` |
| `agentmap_solicitacoes_obter` | Obtém uma solicitação pelo ID | `{ "id": string }` |
| `agentmap_solicitacoes_criar` | Cria uma nova solicitação | `{ "dados": Record<string, unknown> }` |
| `agentmap_solicitacoes_atualizar` | Atualiza uma solicitação | `{ "id": string, ...dados }` |
| `agentmap_solicitacoes_aprovar` | Aprova uma solicitação | `{ "id": string, "agenteId": string, "observacao": string }` |
| `agentmap_solicitacoes_rejeitar` | Rejeita uma solicitação | `{ "id": string, "agenteId": string, "motivo": string }` |
| `agentmap_solicitacoes_cancelar` | Cancela uma solicitação | `{ "id": string }` |
| `agentmap_solicitacoes_excluir` | Exclui uma solicitação | `{ "id": string }` |
| `agentmap_solicitacoes_historico` | Lista o histórico de eventos de uma solicitação | `{ "id": string }` |

### Sessões

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_sessoes_listar` | Lista todas as sessões do projeto | `{}` |
| `agentmap_sessoes_obter` | Obtém uma sessão pelo ID | `{ "id": string }` |
| `agentmap_sessoes_criar` | Cria uma nova sessão de trabalho | `{ "dados": Record<string, unknown> }` |
| `agentmap_sessoes_atualizar` | Atualiza uma sessão existente | `{ "id": string, ...dados }` |
| `agentmap_sessoes_finalizar` | Finaliza uma sessão de trabalho | `{ "id": string, "estadoFinal": string }` |
| `agentmap_sessoes_excluir` | Exclui uma sessão | `{ "id": string }` |

### Eventos

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_eventos_pendentes` | Lista eventos pendentes para um agente | `{ "agenteId": string }` |
| `agentmap_eventos_listar` | Lista eventos do projeto com filtros opcionais | `{ "filtros"?: { "destino"?: string, "estado"?: string } }` |
| `agentmap_eventos_confirmar` | Marca um evento como consumido | `{ "id": string }` |

### Bloqueios

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_bloqueios_listar` | Lista bloqueios | `{}` |
| `agentmap_bloqueios_obter` | Obtém um bloqueio | `{ "id": string }` |
| `agentmap_bloqueios_criar` | Cria um bloqueio | `{ "dados": Record<string, unknown> }` |
| `agentmap_bloqueios_resolver` | Resolve um bloqueio | `{ "id": string, "resolucao": string }` |
| `agentmap_bloqueios_excluir` | Exclui um bloqueio | `{ "id": string }` |

### Reservas

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_reservas_listar` | Lista reservas | `{}` |
| `agentmap_reservas_obter` | Obtém uma reserva | `{ "id": string }` |
| `agentmap_reservas_criar` | Cria uma reserva | `{ "dados": Record<string, unknown> }` |
| `agentmap_reservas_liberar` | Libera uma reserva | `{ "id": string }` |
| `agentmap_reservas_excluir` | Exclui uma reserva | `{ "id": string }` |

### Decisões

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_decisoes_listar` | Lista decisões | `{}` |
| `agentmap_decisoes_obter` | Obtém uma decisão | `{ "id": string }` |
| `agentmap_decisoes_criar` | Cria uma decisão | `{ "dados": Record<string, unknown> }` |
| `agentmap_decisoes_atualizar` | Atualiza uma decisão | `{ "id": string, ...dados }` |
| `agentmap_decisoes_excluir` | Exclui uma decisão | `{ "id": string }` |

### Dependências

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_dependencias_listar` | Lista dependências | `{}` |
| `agentmap_dependencias_obter` | Obtém uma dependência | `{ "id": string }` |
| `agentmap_dependencias_criar` | Cria uma dependência | `{ "dados": Record<string, unknown> }` |
| `agentmap_dependencias_excluir` | Exclui uma dependência | `{ "id": string }` |

### Riscos

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_riscos_listar` | Lista riscos | `{}` |
| `agentmap_riscos_obter` | Obtém um risco | `{ "id": string }` |
| `agentmap_riscos_criar` | Cria um risco | `{ "dados": Record<string, unknown> }` |
| `agentmap_riscos_atualizar` | Atualiza um risco | `{ "id": string, ...dados }` |
| `agentmap_riscos_excluir` | Exclui um risco | `{ "id": string }` |

### Checkpoints

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_checkpoints_listar` | Lista checkpoints | `{ "tarefaId"?: string }` |
| `agentmap_checkpoints_obter` | Obtém um checkpoint | `{ "id": string }` |
| `agentmap_checkpoints_criar` | Cria um checkpoint | `{ "dados": Record<string, unknown> }` |
| `agentmap_checkpoints_excluir` | Exclui um checkpoint | `{ "id": string }` |

### Pendencias

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_pendencias_listar` | Lista pendencias | `{ "tarefaId"?: string }` |
| `agentmap_pendencias_obter` | Obtém uma pendencia | `{ "id": string }` |
| `agentmap_pendencias_criar` | Cria uma pendencia | `{ "dados": Record<string, unknown> }` |
| `agentmap_pendencias_atualizar` | Atualiza uma pendencia | `{ "id": string, ...dados }` |
| `agentmap_pendencias_resolver` | Resolve uma pendencia | `{ "id": string, "resolucao": string }` |
| `agentmap_pendencias_excluir` | Exclui uma pendencia | `{ "id": string }` |

### Resultados

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_resultados_listar` | Lista resultados | `{}` |
| `agentmap_resultados_obter` | Obtém um resultado | `{ "id": string }` |
| `agentmap_resultados_criar` | Cria um resultado | `{ "dados": Record<string, unknown> }` |

### Validações

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_validacoes_listar` | Lista validações | `{}` |
| `agentmap_validacoes_obter` | Obtém uma validação | `{ "id": string }` |
| `agentmap_validacoes_criar` | Cria uma validação | `{ "dados": Record<string, unknown> }` |
| `agentmap_validacoes_excluir` | Exclui uma validação | `{ "id": string }` |

### Artefatos

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_artefatos_listar` | Lista artefatos | `{}` |
| `agentmap_artefatos_obter` | Obtém um artefato | `{ "id": string }` |
| `agentmap_artefatos_criar` | Cria um artefato | `{ "dados": Record<string, unknown> }` |
| `agentmap_artefatos_excluir` | Exclui um artefato | `{ "id": string }` |
| `agentmap_artefatos_versoes` | Lista versões de um artefato | `{ "id": string }` |

### Aprendizados

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_aprendizados_listar` | Lista aprendizados | `{}` |
| `agentmap_aprendizados_obter` | Obtém um aprendizado | `{ "id": string }` |
| `agentmap_aprendizados_criar` | Cria um aprendizado | `{ "dados": Record<string, unknown> }` |
| `agentmap_aprendizados_excluir` | Exclui um aprendizado | `{ "id": string }` |

### Criterios

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_criterios_listar` | Lista critérios | `{}` |
| `agentmap_criterios_obter` | Obtém um critério | `{ "id": string }` |
| `agentmap_criterios_criar` | Cria um critério | `{ "dados": Record<string, unknown> }` |
| `agentmap_criterios_excluir` | Exclui um critério | `{ "id": string }` |

### Contatos

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_contatos_listar` | Lista todos os contatos do projeto | `{}` |
| `agentmap_contatos_obter` | Obtém um contato pelo ID | `{ "id": string }` |
| `agentmap_contatos_criar` | Cria um novo contato | `{ "nome": string, "email": string, "telefone": string }` |
| `agentmap_contatos_atualizar` | Atualiza um contato | `{ "id": string, "nome"?: string, "email"?: string, "telefone"?: string }` |
| `agentmap_contatos_excluir` | Exclui um contato | `{ "id": string }` |

### Responsabilidades

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_responsabilidades_listar` | Lista responsabilidades | `{}` |
| `agentmap_responsabilidades_obter` | Obtém uma responsabilidade | `{ "id": string }` |
| `agentmap_responsabilidades_criar` | Cria uma responsabilidade | `{ "dados": Record<string, unknown> }` |
| `agentmap_responsabilidades_excluir` | Exclui uma responsabilidade | `{ "id": string }` |

### Arquivos

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_arquivos_listar` | Lista arquivos em um diretório do projeto | `{ "caminho": string }` |
| `agentmap_arquivos_ler` | Lê o conteúdo de um arquivo do projeto | `{ "caminho": string }` |
| `agentmap_arquivos_excluir` | Exclui um arquivo ou diretório do projeto | `{ "caminho": string }` |

### Ler trecho de arquivo

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_ler_trecho_arquivo` | Lê um trecho de arquivo com limite de linhas | `{ "caminho": string, "linhaInicio"?: number, "linhaFim"?: number, "limite"?: number }` |

### Busca

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_buscar_conhecimento` | Busca termos na base de conhecimento | `{ "termo": string, "limite"?: number, "incluirProjetos"?: boolean }` |
| `agentmap_buscar_simbolo` | Busca definições de símbolos no código | `{ "simbolo": string, "tipo"?: string, "diretorio"?: string, "limite"?: number }` |
| `agentmap_buscar_referencias` | Busca referências a um símbolo | `{ "simbolo": string, "diretorio"?: string, "limite"?: number }` |

### Contexto

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_obter_contexto_projeto` | Retorna contexto completo do projeto aberto | `{ "projetoId"?: string }` |
| `agentmap_obter_contexto_tarefa` | Monta pacote de contexto completo para uma tarefa | `{ "id": string }` |
| `agentmap_obter_agente` | Obtém perfil completo de um agente | `{ "id": string }` |
| `agentmap_obter_arquitetura` | Retorna informações de arquitetura do projeto | `{ "projetoId"?: string }` |
| `agentmap_recomendar_agente` | Recomenda agentes para uma tarefa | `{ "tarefaId"?: string, "criterios"?: Record<string, unknown> }` |

### Auditoria

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_auditoria_listar` | Lista últimos eventos de auditoria | `{ "limite": number }` |

### Descoberta

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_descobrir` | Lista capabilities, agents, docs, CLI e onboarding | `{}` |
| `agentmap_sugerir_fluxo` | Recomenda sequência de tools por objetivo | `{ "objetivo": string, "contexto"?: string }` |

## Formato de chamada MCP

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "agentmap_<entidade>_<acao>",
    "arguments": {
      "...": "..."
    }
  }
}
```

## Formato de resposta

### Sucesso

```json
{
  "content": [{ "type": "text", "text": "{\"sucesso\":true,\"dados\":{...}}" }],
  "structuredContent": { ... }
}
```

### Erro

```json
{
  "content": [{ "type": "text", "text": "{\"sucesso\":false,\"codigo\":\"...\",\"mensagem\":\"...\"}" }],
  "isError": true
}
```

## Códigos de erro comuns

| Código | Significado |
|---|---|
| `NO_PROJECT_OPEN` | Nenhum projeto aberto |
| `TASK_NOT_FOUND` | Tarefa não encontrada |
| `AGENT_NOT_FOUND` | Agente não encontrado |
| `INVALID_TRANSITION` | Transição de estado inválida |
| `PATH_TRAVERSAL` | Tentativa de path traversal bloqueada |
| `VALIDATION_ERROR` | Erro de validação de schema |
| `NOT_FOUND` | Entidade não encontrada |

