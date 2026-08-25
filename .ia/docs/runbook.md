# Runbook do AgentMap

## Visão geral
- Servidor backend: `http://localhost:3150`
- Inicialização do projeto: `agentmap_projetos_abrir`
- Health check: `GET /api/health`
- Tarefas, agentes, contratos, handoffs, pendencias, bloqueios, riscos, decisões, eventos, sessões, reservas, checkpoints, dependências, responsabilidades, aprendizados, contatos, critérios, resultados, artefatos, conflitos, integridade.

## Papel do Agent Manager

O Agent Manager é o mecanismo de paralelismo real. Cada agente opera em um worktree isolado.

## Passo a passo: abrir worktree, consultar AgentMap, fechar/mergear

### 1. Abrir worktree
- Abra o Agent Manager no VS Code.
- Crie um worktree para a tarefa atribuída.
- O worktree é criado em `.kilo/worktrees/` com branch própria.

### 2. Consultar AgentMap
- No worktree, use as tools MCP para consultar o estado do projeto.
- Verifique dependências pendentes com `verificarDependenciasPendentes`.
- Consulte tarefas prontas com `tarefasProntasParaWorktree`.

### 3. Executar trabalho
- Execute a tarefa dentro do contrato e permissões do agente.
- Registre progresso no AgentMap via MCP.

### 4. Fechar/mergear
- Ao finalizar, registre handoff e resultado no AgentMap.
- Feche o worktree no Agent Manager.
- Merge a branch para a branch principal.

## Operação
1. Abra o projeto antes de operar.
2. Use as tools do AgentMap/MCP para ações específicas.
3. Somente altere código quando necessário e documente no handoff.
4. CORS dinâmico: `GET/PUT /api/admin/cors`
5. Transições de estado: `GET/PUT /api/admin/transicoes`
6. Limpeza de temporários: `POST /api/temp/limpar` ou botão "🧹 Limpar Temp" no frontend

## Incidentes comuns
- Porta ocupada: reinicie o backend `npm run dev` (backend) ou `npm run dev` na raiz do backend
- CORS bloqueando: origens configuradas dinamicamente via `CorsService`
- Transição travada: valide com `agentmap_tarefas_alterar_estado` (respeita máquina de estados)
- WebSocket não conecta: verifique `ws://localhost:3150/ws/monitoramento`

## Contatos
- Arquiteto/Gerente: `arquiteto`
- Administrador do AgentMap: `agentmap-admin`
- Frontend: `frontend`
- Backend: `backend`
