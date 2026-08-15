# Guia do Agente MCP

## Introdução

Este guia descreve como um agente de IA deve interagir com o AgentMap através do protocolo MCP.

## Pré-requisitos

1. Projeto aberto no AgentMap (`agentmap_projetos_abrir`)
2. Agente registrado no projeto (`agentmap_agentes_listar`)
3. Sessão iniciada (`agentmap_sessoes_criar`)

## Ciclo de Trabalho

### 1. Iniciar Trabalho

Use o prompt `agentmap-iniciar-trabalho` ou a tool `agentmap_workflows_iniciar_trabalho`:

```json
{
  "name": "agentmap_workflows_iniciar_trabalho",
  "arguments": {
    "agenteId": "backend",
    "tarefaId": "TAR-2026-00042"
  }
}
```

Isso retorna:
- Dados do agente (perfil, permissões, diretórios permitidos)
- Dados da tarefa (contratos, critérios, contexto)
- Pacote de contexto completo
- Sessão criada

### 2. Executar Trabalho

- Leia os contratos obrigatórios da tarefa
- Respeite os diretórios permitidos/proibidos
- Siga os critérios de aceitação
- Documente alterações em arquivos relevantes

### 3. Finalizar Trabalho

Use `agentmap_workflows_finalizar_trabalho`. Esta tool aceita argumentos flexíveis via `passthrough`; os campos recomendados são:

```json
{
  "name": "agentmap_workflows_finalizar_trabalho",
  "arguments": {
    "sessaoId": "SES-2026-00001",
    "tarefaId": "TAR-2026-00042",
    "agenteId": "backend",
    "resumo": "Implementada feature X",
    "estado": "CONCLUIDA",
    "arquivosAlterados": ["backend/src/feature.ts"],
    "testesExecutados": ["unit-feature"],
    "testesAprovados": ["unit-feature"]
  }
}
```

### 4. Handoff

Se o trabalho precisa ser continuado por outro agente, use `agentmap_handoffs_criar`:

```json
{
  "name": "agentmap_handoffs_criar",
  "arguments": {
    "origem": "backend",
    "destino": "frontend",
    "tarefaId": "TAR-2026-00042",
    "resumo": "Backend concluído, aguardando integração",
    "pendente": ["Integração com API"],
    "estado": "PENDENTE"
  }
}
```

## Regras Obrigatórias

1. **Leitura obrigatória antes do trabalho**: sempre consulte o contexto da tarefa antes de executar
2. **Resultado obrigatório**: toda tarefa deve ter resultado registrado
3. **Handoff quando necessário**: se o trabalho crossing de domínio, gere handoff
4. **Validação separada da conclusão**: não conclua tarefa sem validação quando aplicável
5. **Coordenação entre agentes**: antes de iniciar trabalho, consulte `agentmap_eventos_pendentes({ agenteId: "<seu-id>" })` para verificar eventos pendentes destinados a você. Após processar um evento, marque-o como consumido com `agentmap_eventos_confirmar({ id: "<evento-id>" })`.

## Formato de Resposta MCP 2026

As tools do AgentMap seguem o padrão MCP 2026 (`@modelcontextprotocol/sdk` v1.30.0):

- **Sucesso:** retorna `content` (texto JSON) + `structuredContent` (dados validados por `outputSchema`)
- **Erro:** retorna `content` + `isError: true` com mensagem acionável para auto-correção
- **Validação:** `inputSchema` Zod valida argumentos antes da execução
- **Anotações:** tools read-only usam `readOnlyHint: true`

O agente pode consumir apenas o `structuredContent` quando precisar de dados estruturados, ou o `content` para legibilidade humana.

## Códigos de Erro

| Código | Significado |
|---|---|
| `NO_PROJECT_OPEN` | Nenhum projeto aberto |
| `TASK_NOT_FOUND` | Tarefa não encontrada |
| `AGENT_NOT_FOUND` | Agente não encontrado |
| `INVALID_TRANSITION` | Transição de estado inválida |
| `PATH_TRAVERSAL` | Tentativa de path traversal bloqueada |
| `VALIDATION_ERROR` | Erro de validação de schema |
| `NOT_FOUND` | Entidade não encontrada |
