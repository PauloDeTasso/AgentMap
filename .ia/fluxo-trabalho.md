# Fluxo de Trabalho

## Visão Geral

Este documento define o fluxo de trabalho padrão para projetos gerenciados pelo AgentMap.

## Estrutura Mínima

- `.ia/fluxo-trabalho.md` — este arquivo
- `.ia/contratos/` — contratos do projeto
- `.ia/tarefas/` — tarefas do projeto
- `.ia/dependencias/` — dependências entre tarefas

## Regras

1. Novos projetos devem respeitar o fluxo padrão definido neste documento.
2. O planejador deve criar tarefas e dependências explicitamente antes de iniciar implementações.
3. Agentes devem consultar dependências no início de cada ciclo e só prosseguir quando elas estiverem concluídas.
4. Sem dependências, tarefas podem executar em paralelo; com dependências, a execução é sequencial.
