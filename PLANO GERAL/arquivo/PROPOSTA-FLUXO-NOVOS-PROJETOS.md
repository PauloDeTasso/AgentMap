# Proposta: Fluxo de Novos Projetos Sincronizado

Baseado em:
- Documentação do Kilo sobre worktree: `.kilo/agent-manager.json` não orquestra dependências entre worktrees; o usuário deve sequenciá-los.
- AgentMap: protocolo de execução já prevê verificação de dependências.
- Problema real do teste: criar tarefas sem dependências fez agentes começarem em paralelo sem pré-requisito.

## Objetivo

Novos projetos devem ser criados já com fluxo, dependências e regras de execução, evitando trabalho paralelo inadequado.

## Modelo proposto

### 1. Estrutura mínima obrigatória no projeto

```
projeto/
  .ia/
    fluxo-desenvolvimento.json
    fluxo-trabalho.md
    contratos/
    tarefas/
    dependencias/
```

### 2. Regras de criação de tarefas

- O planejador sempre cria as tarefas do projeto.
- O planejador sempre cria as dependências entre tarefas antes de qualquer implementação.
- Tarefas sem dependência podem executar em paralelo.
- Tarefas com dependência devem esperar a conclusão da tarefa vinculada.

### 3. Regras de execução

- Todo agente deve consultar suas dependências no início do ciclo de trabalho.
- Se houver dependência pendente, o agente deve:
  - registrar bloqueio no AgentMap;
  - informar no monitoramento;
  - aguardar desbloqueio humano ou automático.
- O usuário/revisor deve usar o monitoramento para iniciar worktrees na ordem correta.

### 4. Sincronização com Kilo Code / Agent Manager

- Não criar worktrees para tarefas com dependência pendente.
- Criar worktrees apenas para tarefas prontas para execução.
- Validar o estado no AgentMap antes de iniciar novos worktrees.

### 5. Template de fluxo padrão

Reutilizar `.ia/fluxo-desenvolvimento.json` como base para todo novo projeto, adaptando responsáveis conforme agentes disponíveis.

## Próximos passos

1. Aplicar esse modelo no projeto TESTE.
2. Replicar para novos projetos automaticamente.
3. Atualizar `AGENTS.md` e `README.md` com a regra obrigatória.
