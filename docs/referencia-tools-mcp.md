# Referência de Tools MCP

Este documento lista as **169 tools MCP** (165 `agentmap_` + 4 `kilohub_`) disponíveis para integração com agentes externos via Model Context Protocol.

> **Nota:** O AgentMap disponibiliza um conjunto completo de tools padronizadas para que agentes de IA possam interagir com projetos, tarefas, agentes, workflows, handoffs e demais entidades do gerenciador. Todas as operações seguem convenções consistentes de entrada, saída e validação.

## Convenções

- **Tool names:** `agentmap_<entidade>_<acao>` ou `kilohub_<acao>` para comunicação Kilo
- **Argumentos:** objeto JSON único `arguments` no método MCP `tools/call`
- **Projeto:** quase todas as tools exigem um projeto aberto no AgentMap
- **Ambiente:** local, sem autenticação obrigatória
- **Validação:** tools com múltiplos parâmetros obrigatórios funcionam corretamente; o SDK MCP e o wrapper `registerTracedTool` repassam o objeto `arguments` completo para validação Zod

## Catálogo completo

### Projetos

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_projetos_listar` | Lista todos os projetos registrados | `{}` |
| `agentmap_projetos_criar` | Cria um novo projeto | `{ "nome": string, "caminhoParental": string, "descricao": string }` |
| `agentmap_projetos_abrir` | Abre um projeto existente por caminho ou ID | `{ "caminhoOuId": string }` |
| `agentmap_projetos_fechar` | Fecha o projeto atualmente aberto | `{ "id": string }` |
| `agentmap_projetos_atual` | Retorna o projeto atualmente aberto | `{}` |
| `agentmap_projetos_excluir_todos` | Exclui todos os projetos registrados | `{}` |
| `agentmap_integridade_verificar` | Verifica integridade do projeto | `{ "projetoId"?: string }` |

### Agentes

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_agentes_listar` | Lista todos os agentes do projeto aberto | `{}` |
| `agentmap_agentes_obter` | Obtém um agente pelo ID | `{ "id": string }` |
| `agentmap_agentes_criar` | Cria um novo agente | `{ "dados": Record<string, unknown> }` |
| `agentmap_agentes_atualizar` | Atualiza um agente existente | `{ "id": string, ...dados }` |
| `agentmap_agentes_excluir` | Exclui um agente | `{ "id": string }` |
| `agentmap_obter_agente` | Obtém agente com permissões, conhecimentos e diretrizes | `{ "id": string }` |
| `agentmap_recomendar_agente` | Recomenda agentes para uma tarefa | `{ "tarefaId"?: string, "criterios"?: Record<string, unknown> }` |

### Tarefas

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_tarefas_listar` | Lista todas as tarefas do projeto aberto | `{}` |
| `agentmap_tarefas_obter` | Obtém uma tarefa pelo ID | `{ "id": string }` |
| `agentmap_tarefas_criar` | Cria uma nova tarefa | `{ "dados": Record<string, unknown> }` |
| `agentmap_tarefas_atualizar` | Atualiza uma tarefa existente | `{ "id": string, ...dados }` |
| `agentmap_tarefas_alterar_estado` | Altera o estado de uma tarefa | `{ "id": string, "novoEstado": string }` |
| `agentmap_tarefas_excluir` | Exclui uma tarefa | `{ "id": string }` |
| `agentmap_tarefas_excluir_todos` | Exclui todas as tarefas do projeto | `{}` |
| `agentmap_tarefas_contexto` | Monta pacote de contexto completo para uma tarefa | `{ "id": string }` |

### Workflows

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_workflows_iniciar_trabalho` | Valida agente + tarefa e monta contexto completo | `{ "agenteId": string, "tarefaId": string }` |
| `agentmap_workflows_finalizar_trabalho` | Registra resultado, artefatos, handoff e finaliza sessão | `{ "agenteId": string, "tarefaId": string, "sessaoId"?: string, "resumo": string, "estado"?: string }` |
| `agentmap_workflows_consultar_pendencias` | Consulta pendências, handoffs, validações e bloqueios por agente | `{ "agenteId": string }` |
| `agentmap_workflows_obter_mapa_projeto` | Obtém o mapa completo do projeto | `{}` |

### Worktree / Paralelismo

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_tarefas_prontas_para_worktree` | Lista tarefas sem dependência pendente | `{}` |
| `agentmap_verificar_dependencias_pendentes` | Verifica se uma tarefa tem dependências pendentes | `{ "tarefaId": string }` |
| `agentmap_abrir_worktree` | Registra intenção de criação de worktree para uma tarefa | `{ "messageId": string, "tarefaId": string }` |

### Handoffs

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_handoffs_listar` | Lista todos os handoffs do projeto | `{ "destino"?: string }` |
| `agentmap_handoffs_obter` | Obtém um handoff pelo ID | `{ "id": string }` |
| `agentmap_handoffs_criar` | Cria um novo handoff | `{ "dados": Record<string, unknown> }` |
| `agentmap_handoffs_atualizar` | Atualiza um handoff existente | `{ "id": string, ...dados }` |
| `agentmap_handoffs_excluir` | Exclui um handoff | `{ "id": string }` |
| `agentmap_handoffs_excluir_todos` | Exclui todas as transferências (handoffs) do projeto | `{}` |

### Solicitações de alteração

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_solicitacoes_listar` | Lista todas as solicitações de alteração | `{ "filtros"?: { "prioridade"?: string, "status"?: string } }` |
| `agentmap_solicitacoes_obter` | Obtém uma solicitação pelo ID | `{ "id": string }` |
| `agentmap_solicitacoes_criar` | Cria uma nova solicitação de alteração | `{ "dados": Record<string, unknown> }` |
| `agentmap_solicitacoes_atualizar` | Atualiza uma solicitação | `{ "id": string, ...dados }` |
| `agentmap_solicitacoes_aprovar` | Aprova uma solicitação de alteração | `{ "id": string, "agenteId": string, "observacao": string }` |
| `agentmap_solicitacoes_rejeitar` | Rejeita uma solicitação de alteração | `{ "id": string, "agenteId": string, "motivo": string }` |
| `agentmap_solicitacoes_cancelar` | Cancela uma solicitação | `{ "id": string }` |
| `agentmap_solicitacoes_excluir` | Exclui uma solicitação | `{ "id": string }` |
| `agentmap_solicitacoes_excluir_todos` | Exclui todas as solicitações do projeto | `{}` |
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
| `agentmap_sessoes_excluir_todos` | Exclui todas as sessões do projeto | `{}` |

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
| `agentmap_bloqueios_atualizar` | Atualiza um bloqueio | `{ "id": string, ...dados }` |
| `agentmap_bloqueios_excluir` | Exclui um bloqueio | `{ "id": string }` |
| `agentmap_bloqueios_excluir_todos` | Exclui todos os bloqueios do projeto | `{}` |

### Reservas

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_reservas_listar` | Lista reservas | `{}` |
| `agentmap_reservas_obter` | Obtém uma reserva | `{ "id": string }` |
| `agentmap_reservas_criar` | Cria uma reserva | `{ "dados": Record<string, unknown> }` |
| `agentmap_reservas_atualizar` | Atualiza uma reserva | `{ "id": string, ...dados }` |
| `agentmap_reservas_liberar` | Libera uma reserva | `{ "id": string }` |
| `agentmap_reservas_excluir` | Exclui uma reserva | `{ "id": string }` |
| `agentmap_reservas_excluir_todos` | Exclui todas as reservas do projeto | `{}` |

### Decisões

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_decisoes_listar` | Lista decisões | `{}` |
| `agentmap_decisoes_obter` | Obtém uma decisão | `{ "id": string }` |
| `agentmap_decisoes_criar` | Cria uma decisão | `{ "dados": Record<string, unknown> }` |
| `agentmap_decisoes_atualizar` | Atualiza uma decisão | `{ "id": string, ...dados }` |
| `agentmap_decisoes_excluir` | Exclui uma decisão | `{ "id": string }` |
| `agentmap_decisoes_excluir_todos` | Exclui todas as decisões do projeto | `{}` |

### Dependências

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_dependencias_listar` | Lista dependências | `{}` |
| `agentmap_dependencias_obter` | Obtém uma dependência | `{ "id": string }` |
| `agentmap_dependencias_criar` | Cria uma dependência | `{ "dados": Record<string, unknown> }` |
| `agentmap_dependencias_atualizar` | Atualiza uma dependência | `{ "id": string, ...dados }` |
| `agentmap_dependencias_excluir` | Exclui uma dependência | `{ "id": string }` |
| `agentmap_dependencias_excluir_todos` | Exclui todas as dependências do projeto | `{}` |

### Riscos

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_riscos_listar` | Lista riscos | `{}` |
| `agentmap_riscos_obter` | Obtém um risco | `{ "id": string }` |
| `agentmap_riscos_criar` | Cria um risco | `{ "dados": Record<string, unknown> }` |
| `agentmap_riscos_atualizar` | Atualiza um risco | `{ "id": string, ...dados }` |
| `agentmap_riscos_excluir` | Exclui um risco | `{ "id": string }` |
| `agentmap_riscos_excluir_todos` | Exclui todos os riscos do projeto | `{}` |

### Checkpoints

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_checkpoints_listar` | Lista checkpoints | `{ "tarefaId"?: string }` |
| `agentmap_checkpoints_obter` | Obtém um checkpoint | `{ "id": string }` |
| `agentmap_checkpoints_criar` | Cria um checkpoint | `{ "dados": Record<string, unknown> }` |
| `agentmap_checkpoints_atualizar` | Atualiza um checkpoint | `{ "id": string, ...dados }` |
| `agentmap_checkpoints_excluir` | Exclui um checkpoint | `{ "id": string }` |
| `agentmap_checkpoints_excluir_todos` | Exclui todas as checkpoints (marcos) do projeto | `{}` |

### Pendências

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_pendencias_listar` | Lista pendencias | `{ "tarefaId"?: string }` |
| `agentmap_pendencias_obter` | Obtém uma pendencia | `{ "id": string }` |
| `agentmap_pendencias_criar` | Cria uma pendencia | `{ "dados": Record<string, unknown> }` |
| `agentmap_pendencias_atualizar` | Atualiza uma pendencia | `{ "id": string, ...dados }` |
| `agentmap_pendencias_resolver` | Resolve uma pendencia | `{ "id": string, "resolucao": string }` |
| `agentmap_pendencias_excluir` | Exclui uma pendencia | `{ "id": string }` |
| `agentmap_pendencias_excluir_todos` | Exclui todas as pendencias do projeto | `{}` |

### Resultados

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_resultados_listar` | Lista resultados | `{}` |
| `agentmap_resultados_obter` | Obtém um resultado | `{ "id": string }` |
| `agentmap_resultados_criar` | Cria um resultado | `{ "dados": Record<string, unknown> }` |
| `agentmap_resultados_atualizar` | Atualiza um resultado | `{ "id": string, ...dados }` |
| `agentmap_resultados_excluir` | Exclui um resultado | `{ "id": string }` |
| `agentmap_resultados_excluir_todos` | Exclui todas as resultados do projeto | `{}` |

### Validações

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_validacoes_listar` | Lista validações | `{}` |
| `agentmap_validacoes_obter` | Obtém uma validação | `{ "id": string }` |
| `agentmap_validacoes_criar` | Cria uma validação | `{ "dados": Record<string, unknown> }` |
| `agentmap_validacoes_atualizar` | Atualiza uma validação | `{ "id": string, ...dados }` |
| `agentmap_validacoes_excluir` | Exclui uma validação | `{ "id": string }` |
| `agentmap_validacoes_excluir_todos` | Exclui todas as validações do projeto | `{}` |

### Artefatos

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_artefatos_listar` | Lista artefatos | `{}` |
| `agentmap_artefatos_obter` | Obtém um artefato | `{ "id": string }` |
| `agentmap_artefatos_criar` | Cria um artefato | `{ "dados": Record<string, unknown> }` |
| `agentmap_artefatos_atualizar` | Atualiza um artefato | `{ "id": string, ...dados }` |
| `agentmap_artefatos_excluir` | Exclui um artefato | `{ "id": string }` |
| `agentmap_artefatos_versoes` | Lista versões de um artefato | `{ "id": string }` |
| `agentmap_artefatos_excluir_todos` | Exclui todos os artefatos do projeto | `{}` |

### Aprendizados

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_aprendizados_listar` | Lista aprendizados | `{}` |
| `agentmap_aprendizados_obter` | Obtém um aprendizado | `{ "id": string }` |
| `agentmap_aprendizados_criar` | Cria um aprendizado | `{ "dados": Record<string, unknown> }` |
| `agentmap_aprendizados_atualizar` | Atualiza um aprendizado | `{ "id": string, ...dados }` |
| `agentmap_aprendizados_excluir` | Exclui um aprendizado | `{ "id": string }` |
| `agentmap_aprendizados_excluir_todos` | Exclui todas as aprendizados do projeto | `{}` |

### Critérios

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_criterios_listar` | Lista critérios | `{}` |
| `agentmap_criterios_obter` | Obtém um critério | `{ "id": string }` |
| `agentmap_criterios_criar` | Cria um critério | `{ "dados": Record<string, unknown> }` |
| `agentmap_criterios_atualizar` | Atualiza um critério | `{ "id": string, ...dados }` |
| `agentmap_criterios_excluir` | Exclui um critério | `{ "id": string }` |
| `agentmap_criterios_excluir_todos` | Exclui todas as critérios do projeto | `{}` |

### Contatos

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_contatos_listar` | Lista todos os contatos do projeto | `{}` |
| `agentmap_contatos_obter` | Obtém um contato pelo ID | `{ "id": string }` |
| `agentmap_contatos_criar` | Cria um novo contato | `{ "nome": string, "email": string, "telefone": string }` |
| `agentmap_contatos_atualizar` | Atualiza um contato | `{ "id": string, "nome"?: string, "email"?: string, "telefone"?: string }` |
| `agentmap_contatos_excluir` | Exclui um contato | `{ "id": string }` |
| `agentmap_contatos_excluir_todos` | Exclui todos os contatos do projeto | `{}` |

### Responsabilidades

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_responsabilidades_listar` | Lista responsabilidades | `{}` |
| `agentmap_responsabilidades_obter` | Obtém uma responsabilidade | `{ "id": string }` |
| `agentmap_responsabilidades_criar` | Cria uma responsabilidade | `{ "dados": Record<string, unknown> }` |
| `agentmap_responsabilidades_atualizar` | Atualiza uma responsabilidade | `{ "id": string, ...dados }` |
| `agentmap_responsabilidades_excluir` | Exclui uma responsabilidade | `{ "id": string }` |
| `agentmap_responsabilidades_excluir_todos` | Exclui todas as responsabilidades do projeto | `{}` |

### Conflitos

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_conflitos_listar` | Lista conflitos | `{}` |
| `agentmap_conflitos_obter` | Obtém um conflito | `{ "id": string }` |
| `agentmap_conflitos_criar` | Cria um conflito | `{ "dados": Record<string, unknown> }` |
| `agentmap_conflitos_atualizar` | Atualiza um conflito | `{ "id": string, ...dados }` |
| `agentmap_conflitos_resolver` | Resolve um conflito | `{ "id": string, "resolucao": string }` |
| `agentmap_conflitos_excluir` | Exclui um conflito | `{ "id": string }` |
| `agentmap_conflitos_excluir_todos` | Exclui todos os conflitos do projeto | `{}` |

### Arquivos

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_arquivos_listar` | Lista arquivos em um diretório do projeto | `{ "caminho": string }` |
| `agentmap_arquivos_ler` | Lê o conteúdo de um arquivo do projeto | `{ "caminho": string }` |
| `agentmap_arquivos_excluir` | Exclui um arquivo ou diretório do projeto | `{ "caminho": string }` |
| `agentmap_arquivos_excluir_todos` | Exclui todos os arquivos de um diretório do projeto | `{ "caminho": string }` |
| `agentmap_ler_trecho_arquivo` | Lê um trecho de arquivo com limite de linhas | `{ "caminho": string, "linhaInicio"?: number, "linhaFim"?: number, "limite"?: number }` |

### Busca

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_buscar_conhecimento` | Busca termos na base de conhecimento do projeto | `{ "termo": string, "limite"?: number, "incluirProjetos"?: boolean }` |
| `agentmap_buscar_referencias` | Busca referências a um símbolo em arquivos do projeto | `{ "simbolo": string, "diretorio"?: string, "limite"?: number }` |
| `agentmap_buscar_simbolo` | Busca definições de símbolos no código | `{ "simbolo": string, "tipo"?: string, "diretorio"?: string, "limite"?: number }` |

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
| `agentmap_auditoria_listar` | Lista últimos eventos de auditoria | `{ "limite"?: number }` |

### Descoberta

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_descobrir` | Lista capabilities, agents, docs, CLI, worktree e onboarding | `{}` |
| `agentmap_sugerir_fluxo` | Recomenda sequência de tools por objetivo | `{ "objetivo": string, "contexto"?: string }` |

### Monitoramento / Wake-up

| Tool | Descrição | Parâmetros |
|---|---|---|
| `agentmap_monitoramento_verificar_pendentes` | Verifica mensagens novas no monitoramento para wake-up de agente principal | `{ "aposEventSequence"?: number, "limite"?: number }` |

### Kilo Hub (comunicação)

| Tool | Descrição | Parâmetros |
|---|---|---|
| `kilohub_receive_chat_message` | Busca respostas/mensagens direcionadas a um agente Kilo | `{ "agenteId"?: string, "tarefaId"?: string, "messageId"?: string, "limite"?: number }` |
| `kilohub_report_status` | Reporta status de uma sessão Kilo | `{ "messageId": string, "sessionId": string, "status": "ativo" | "pausado" | "finalizado" | "erro", "message"?: string }` |
| `kilohub_report_progress` | Reporta progresso de uma tarefa | `{ "messageId": string, "tarefaId": string, "progress": number, "message"?: string }` |
| `kilohub_report_result` | Reporta resultado final de uma tarefa | `{ "messageId": string, "tarefaId": string, "resultado": { "resumo": string, "arquivosAlterados"?: string[], "testesExecutados"?: string[], "testesAprovados"?: string[], "riscosEncontrados"?: string[], "pendencias"?: string[], "observacoes"?: string, "commit"?: string } }` |

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

## Nota sobre tools removidas / não-existentes

As seguintes tools **não existem** no código atual e foram removidas deste documento:
- `agentmap_monitoramento_obter`
- `agentmap_monitoramento_mensagens_listar`
- `agentmap_monitoramento_mensagens_criar`
- `agentmap_monitoramento_agente_status`
- `agentmap_monitoramento_agentes_listar`
- `agentmap_monitoramento_modo_obter`
- `agentmap_monitoramento_modo_alterar`
- `agentmap_monitoramento_intervir`
- `agentmap_monitoramento_dispatcher_pendentes`
- `agentmap_monitoramento_dispatcher_executar`
- `agentmap_monitoramento_dispatcher_logs`
- `kilohub_send_chat_message` (removida; agentes filhos devem usar HTTP para envio)
