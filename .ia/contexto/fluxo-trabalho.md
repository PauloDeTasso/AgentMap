# Fluxo de Trabalho — AgentMap

## Papel do Agent Manager

O **Agent Manager** é o mecanismo real de paralelismo no AgentMap. Ele gerencia worktrees isolados para cada agente, permitindo execução paralela de tarefas independentes.

## Fluxo Real

```text
Planejador
    │
    ▼
Cria tarefas + dependências no AgentMap
    │
    ▼
tarefasProntasParaWorktree() → retorna tarefas sem dependência pendente
    │
    ▼
Agentes abrem worktrees via Agent Manager
    │
    ▼
Agentes consultam verificarDependenciasPendentes() no início de cada ciclo
    │
    ▼
Agentes executam trabalho real via MCP stdio
    │
    ▼
Ao finalizar: registram handoff + resultado no AgentMap via MCP
    │
    ▼
Validação + auditoria no AgentMap
```

## Regras

1. O planejador define a ordem e as dependências.
2. Cada agente só inicia quando seus pré-requisitos estão prontos.
3. O monitoramento é a fonte de verdade para o estado do projeto.
4. Bloqueios devem ser registrados no AgentMap, não resolvidos informalmente.
5. Handoffs devem ser usados para transferir contexto entre agentes.
6. O revisor valida aderência aos contratos antes da documentação final.

## Sem dependências

Tarefas sem dependências podem executar em paralelo via worktrees separados.

## Com dependências

A execução é sequencial: a tarefa dependente só inicia quando a predecessora estiver concluída.
