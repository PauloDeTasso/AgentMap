# Runbook do AgentMap

## Visão geral
- Servidor backend: `http://localhost:3150`
- Inicialização do projeto: `agentmap_agentmap_projetos_abrir`
- Health check: `GET /api/health`
- Tarefas, agentes, contratos, handoffs, pendencias, bloqueios, riscos, decisões, eventos, sessões, reservas, checkpoints, dependências, responsabilidades, aprendizados, contatos, critérios, resultados, artefatos, conflitos, integridade.

## Operação
1. Abra o projeto antes de operar.
2. Use as tools do AgentMap/MCP para ações específicas.
3. Somente altere código quando necessário e documente no handoff.
4. CORS dinâmico: `GET/PUT /api/admin/cors`
5. Transições de estado: `GET/PUT /api/admin/transicoes`

## Incidentes comuns
- Porta ocupada: reinicie o backend `npm run dev`
- CORS bloqueando: atualize origins via `/api/admin/cors`
- Transição travada: valide em `/api/admin/transicoes/validar`

## Contatos
- Arquiteto/Gerente: `arquiteto`
- Administrador do AgentMap: `agentmap-admin`
- Frontend: `frontend`
- Backend: `backend`
