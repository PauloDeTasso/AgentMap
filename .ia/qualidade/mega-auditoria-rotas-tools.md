# Mega Auditoria — Rotas HTTP + Tools MCP

## Objetivo
Auditar todas as rotas HTTP e tools MCP do AgentMap, identificar bugs, erros, inconsistências, falhas de correspondência, corrigir, melhorar, testar e documentar.

## Escopo
- **Backend**: `backend/src/api/*.ts` (rotas HTTP)
- **MCP Tools**: `backend/src/mcp-server/tools/*.ts`
- **Plugin**: `.kilo/plugin/agentmap-wakeup.ts`
- **Validação**: Schemas Zod, annotations, outputSchema, tratamento de erros, path traversal, auth

## Mapeamento preliminar

### Rotas HTTP (247 rotas)
| Grupo | Arquivo | Rotas | Métodos |
|-------|---------|-------|---------|
| Projetos | `api/projetos.ts` | 18 | GET/POST/PUT/DELETE |
| Agentes | `api/agentes.ts` | 6 | GET/POST/PUT/DELETE |
| Tarefas | `api/tarefas.ts` | 8 | GET/POST/PUT/DELETE |
| Arquivos | `api/arquivos.ts` | 7 | GET/POST/PUT/DELETE |
| Contratos | `api/contratos.ts` + `contratos-validacao.ts` | 9 | GET/POST/PUT/DELETE |
| Solicitações | `api/solicitacoes.ts` | 9 | GET/POST/PUT/DELETE |
| Critérios | `api/criterios.ts` | 6 | GET/POST/PUT/DELETE |
| Resultados | `api/resultados.ts` | 6 | GET/POST/PUT/DELETE |
| Artefatos | `api/artefatos.ts` | 7 | GET/POST/PUT/DELETE |
| Handoffs | `api/handoffs.ts` + `handoffs-centrais.ts` | 10 | GET/POST/PUT/DELETE |
| Pendências | `api/pendencias.ts` | 7 | GET/POST/PUT/DELETE |
| Validações | `api/validacoes.ts` | 8 | GET/POST/PUT/DELETE |
| Conflitos | `api/conflitos.ts` | 7 | GET/POST/PUT/DELETE |
| Reservas | `api/reservas.ts` | 7 | GET/POST/PUT/DELETE |
| Sessões | `api/sessoes.ts` | 7 | GET/POST/PUT/DELETE |
| Checkpoints | `api/checkpoints.ts` | 6 | GET/POST/PUT/DELETE |
| Aprendizados | `api/aprendizados.ts` | 6 | GET/POST/PUT/DELETE |
| Dependências | `api/dependencias.ts` | 6 | GET/POST/PUT/DELETE |
| Responsabilidades | `api/responsabilidades.ts` | 6 | GET/POST/PUT/DELETE |
| Decisões | `api/decisoes.ts` | 6 | GET/POST/PUT/DELETE |
| Riscos | `api/riscos.ts` | 6 | GET/POST/PUT/DELETE |
| Bloqueios | `api/bloqueios.ts` | 7 | GET/POST/PUT/DELETE |
| Integridade | `api/integridade.ts` | 7 | GET/POST/PUT/DELETE |
| Eventos | `api/eventos.ts` | 6 | GET/POST/PUT/DELETE |
| Contatos | `api/contatos.ts` | 6 | GET/POST/PUT/DELETE |
| Admin | `api/admin.ts` | 7 | GET/PUT/POST/DELETE |
| Health | `api/health.ts` | 1 | GET |
| Monitoramento | `api/monitoramento.ts` | 18 | GET/POST/PUT/DELETE |
| Instâncias | `api/instancias.ts` | 6 | GET/POST/PUT/DELETE |
| Orquestrador | `api/orquestrador.ts` | 3 | GET/POST/PUT |
| Orquestração | `api/orchestracao.ts` | 6 | GET/POST |
| Observabilidade | `api/observabilidade.ts` | 1 | GET |
| Temp | `api/temp.ts` | 3 | GET/POST |
| Estado | `api/estado.ts` | 6 | GET/POST/PUT/DELETE |
| Gerenciador-agentes | `api/gerenciador-agentes.ts` | 3 | GET |
| Auditoria | `api/index.ts` | 5 | GET/POST/PUT/DELETE |
| Monitor | `api/index.ts` | 1 | GET |
| Estado-projeto | `api/index.ts` | 1 | GET |
| Integridade | `api/index.ts` | 1 | GET |

### Tools MCP (167 tools)
| Grupo | Arquivo | Tools |
|-------|---------|-------|
| Projetos | `tools/projeto.ts` | 7 |
| Agentes | `tools/agentes.ts` | 5 |
| Tarefas | `tools/tarefas.ts` | 10 |
| Arquivos | `tools/arquivos.ts` | 4 |
| Contratos | `tools/contratos.ts` | ? |
| Solicitações | `tools/solicitacoes.ts` | 10 |
| Critérios | `tools/criterios.ts` | 6 |
| Resultados | `tools/resultados.ts` | 7 |
| Artefatos | `tools/artefatos.ts` | 7 |
| Handoffs | `tools/handoffs.ts` | 6 |
| Pendências | `tools/pendencias.ts` | 7 |
| Validações | `tools/validacoes.ts` | 6 |
| Conflitos | `tools/conflitos.ts` | 7 |
| Reservas | `tools/reservas.ts` | 7 |
| Sessões | `tools/sessoes.ts` | 7 |
| Checkpoints | `tools/checkpoints.ts` | 6 |
| Aprendizados | `tools/aprendizados.ts` | 6 |
| Dependências | `tools/dependencias.ts` | 6 |
| Responsabilidades | `tools/responsabilidades.ts` | 6 |
| Decisões | `tools/decisoes.ts` | 6 |
| Riscos | `tools/riscos.ts` | 6 |
| Bloqueios | `tools/bloqueios.ts` | 7 |
| Eventos | `tools/eventos.ts` | 3 |
| Workflows | `tools/workflows.ts` | 4 |
| Contexto | `tools/obterContextoProjeto.ts` | 1 |
| Arquitetura | `tools/obterArquitetura.ts` | 1 |
| Agente | `tools/obterAgente.ts` | 1 |
| Recomendar | `tools/recomendarAgente.ts` | 1 |
| LerTrecho | `tools/lerTrechoArquivo.ts` | 1 |
| BuscarSímbolo | `tools/buscarSimbolo.ts` | 1 |
| BuscarReferências | `tools/buscarReferencias.ts` | 1 |
| BuscarConhecimento | `tools/buscarConhecimento.ts` | 1 |
| ContextoTarefa | `tools/obterContextoTarefa.ts` | 1 |
| Worktree | `tools/worktree.ts` | 3 |
| Descobrir | `tools/descobrir.ts` | 1 |
| SugerirFluxo | `tools/sugerirFluxo.ts` | 1 |
| KiloHub | `tools/kilohub.ts` | 3 |
| KiloHubReceive | `tools/kilohub-receive.ts` | 1 |
| Monitoramento | `tools/monitoramento-wakeup.ts` | 1 |
| Orchestrator | `tools/orchestrator.ts` | 4 |

## Distribuição por worktree

| Worktree | Grupo | Responsável |
|----------|-------|-------------|
| audit-rotas-projetos-agentes-tarefas | Projetos, Agentes, Tarefas, Arquivos, Contratos, Gerenciador-agentes | backend |
| audit-rotas-handoffs-sessoes-checkpoints | Handoffs, Sessoes, Checkpoints, Eventos, Handoffs-centrais | backend |
| audit-rotas-riscos-bloqueios-pendencias | Riscos, Bloqueios, Pendencias, Reservas | backend |
| audit-rotas-decisoes-dependencias | Decisoes, Dependencias, Responsabilidades, Artefatos | backend |
| audit-rotas-resultados-criterios | Resultados, Criterios, Aprendizados, Validacoes | backend |
| audit-rotas-contatos-conflitos | Contatos, Conflitos, Auditoria, Monitoramento, Integridade, Estado | backend |
| audit-rotas-admin-orquestracao | Admin, Instancias, Orquestrador, Orchestracao, Observabilidade, Temp, Saude, Discover | backend |

## Critérios de aceitação
- [ ] Todas as rotas HTTP respondem sem erro
- [ ] Todas as tools MCP respondem sem erro
- [ ] Schemas Zod validam entrada corretamente
- [ ] Annotations corretas (readOnlyHint, destructiveHint, idempotentHint)
- [ ] Tratamento de erros consistente
- [ ] Path traversal protegido onde aplicável
- [ ] Cruzamento rotas/tools sem divergências críticas
- [ ] Relatório documentado em `.ia/qualidade/`

## Status
- [x] Mapeamento de rotas HTTP (247 rotas)
- [x] Mapeamento de tools MCP (167 tools)
- [x] Categorização por domínio
- [x] Distribuição por worktrees
- [ ] Auditoria em andamento (7 worktrees)
- [ ] Correções aplicadas
- [ ] Testes executados
- [ ] Documentação atualizada
