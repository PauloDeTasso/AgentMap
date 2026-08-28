# Mega Auditoria — Tools MCP do AgentMap

> Branch: v0042
> Data: 2026-08-27
> Objetivo: catalogar, verificar, corrigir e documentar todas as 173 tools MCP.

---

## 1. Categorização Completa

### 1.1 Projetos (6)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 1 | agentmap_projetos_listar | R | Lista projetos registrados |
| 2 | agentmap_projetos_criar | C | Cria novo projeto |
| 3 | agentmap_projetos_abrir | U | Abre projeto existente |
| 4 | agentmap_projetos_fechar | D | Fecha projeto aberto |
| 5 | agentmap_projetos_atual | R | Retorna projeto aberto |
| 6 | agentmap_projetos_excluir_todos | D | Exclui todos os projetos |

### 1.2 Tarefas (10)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 7 | agentmap_tarefas_listar | R | Lista tarefas do projeto |
| 8 | agentmap_tarefas_obter | R | Obtém tarefa por ID |
| 9 | agentmap_tarefas_criar | C | Cria nova tarefa |
| 10 | agentmap_tarefas_atualizar | U | Atualiza tarefa existente |
| 11 | agentmap_tarefas_alterar_estado | U | Altera estado da tarefa |
| 12 | agentmap_tarefas_excluir | D | Exclui tarefa |
| 13 | agentmap_tarefas_excluir_todos | D | Exclui todas as tarefas |
| 14 | agentmap_tarefas_contexto | R | Monta contexto completo |
| 15 | agentmap_tarefas_prontas_para_worktree | R | Lista tarefas sem deps pendentes |
| 16 | agentmap_verificar_dependencias_pendentes | R | Verifica deps pendentes de uma tarefa |

### 1.3 Agentes (5)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 17 | agentmap_agentes_listar | R | Lista agentes do projeto |
| 18 | agentmap_agentes_obter | R | Obtém agente por ID |
| 19 | agentmap_agentes_criar | C | Cria novo agente |
| 20 | agentmap_agentes_atualizar | U | Atualiza agente |
| 21 | agentmap_agentes_excluir | D | Exclui agente |

### 1.4 Solicitações (10)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 22 | agentmap_solicitacoes_listar | R | Lista solicitações |
| 23 | agentmap_solicitacoes_obter | R | Obtém solicitação por ID |
| 24 | agentmap_solicitacoes_criar | C | Cria solicitação |
| 25 | agentmap_solicitacoes_atualizar | U | Atualiza solicitação |
| 26 | agentmap_solicitacoes_aprovar | U | Aprova solicitação |
| 27 | agentmap_solicitacoes_rejeitar | U | Rejeita solicitação |
| 28 | agentmap_solicitacoes_cancelar | U | Cancela solicitação |
| 29 | agentmap_solicitacoes_excluir | D | Exclui solicitação |
| 30 | agentmap_solicitacoes_excluir_todos | D | Exclui todas |
| 31 | agentmap_solicitacoes_historico | R | Histórico de eventos |

### 1.5 Handoffs (6)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 32 | agentmap_handoffs_listar | R | Lista handoffs |
| 33 | agentmap_handoffs_obter | R | Obtém handoff por ID |
| 34 | agentmap_handoffs_criar | C | Cria handoff |
| 35 | agentmap_handoffs_atualizar | U | Atualiza handoff |
| 36 | agentmap_handoffs_excluir | D | Exclui handoff |
| 37 | agentmap_handoffs_excluir_todos | D | Exclui todos |

### 1.6 Sessões (7)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 38 | agentmap_sessoes_listar | R | Lista sessões |
| 39 | agentmap_sessoes_obter | R | Obtém sessão por ID |
| 40 | agentmap_sessoes_criar | C | Cria sessão |
| 41 | agentmap_sessoes_atualizar | U | Atualiza sessão |
| 42 | agentmap_sessoes_finalizar | U | Finaliza sessão |
| 43 | agentmap_sessoes_excluir | D | Exclui sessão |
| 44 | agentmap_sessoes_excluir_todos | D | Exclui todas |

### 1.7 Checkpoints (6)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 45 | agentmap_checkpoints_listar | R | Lista checkpoints |
| 46 | agentmap_checkpoints_obter | R | Obtém checkpoint |
| 47 | agentmap_checkpoints_criar | C | Cria checkpoint |
| 48 | agentmap_checkpoints_excluir | D | Exclui checkpoint |
| 49 | agentmap_checkpoints_atualizar | U | Atualiza checkpoint |
| 50 | agentmap_checkpoints_excluir_todos | D | Exclui todos |

### 1.8 Riscos (6)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 51 | agentmap_riscos_listar | R | Lista riscos |
| 52 | agentmap_riscos_obter | R | Obtém risco |
| 53 | agentmap_riscos_criar | C | Cria risco |
| 54 | agentmap_riscos_atualizar | U | Atualiza risco |
| 55 | agentmap_riscos_excluir | D | Exclui risco |
| 56 | agentmap_riscos_excluir_todos | D | Exclui todos |

### 1.9 Bloqueios (7)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 57 | agentmap_bloqueios_listar | R | Lista bloqueios |
| 58 | agentmap_bloqueios_obter | R | Obtém bloqueio |
| 59 | agentmap_bloqueios_criar | C | Cria bloqueio |
| 60 | agentmap_bloqueios_resolver | U | Resolve bloqueio |
| 61 | agentmap_bloqueios_excluir | D | Exclui bloqueio |
| 62 | agentmap_bloqueios_atualizar | U | Atualiza bloqueio |
| 63 | agentmap_bloqueios_excluir_todos | D | Exclui todos |

### 1.10 Pendências (7)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 64 | agentmap_pendencias_listar | R | Lista pendências |
| 65 | agentmap_pendencias_obter | R | Obtém pendência |
| 66 | agentmap_pendencias_criar | C | Cria pendência |
| 67 | agentmap_pendencias_atualizar | U | Atualiza pendência |
| 68 | agentmap_pendencias_resolver | U | Resolve pendência |
| 69 | agentmap_pendencias_excluir | D | Exclui pendência |
| 70 | agentmap_pendencias_excluir_todos | D | Exclui todas |

### 1.11 Reservas (7)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 71 | agentmap_reservas_listar | R | Lista reservas |
| 72 | agentmap_reservas_obter | R | Obtém reserva |
| 73 | agentmap_reservas_criar | C | Cria reserva |
| 74 | agentmap_reservas_atualizar | U | Atualiza reserva |
| 75 | agentmap_reservas_liberar | U | Libera reserva |
| 76 | agentmap_reservas_excluir | D | Exclui reserva |
| 77 | agentmap_reservas_excluir_todos | D | Exclui todas |

### 1.12 Decisões (6)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 78 | agentmap_decisoes_listar | R | Lista decisões |
| 79 | agentmap_decisoes_obter | R | Obtém decisão |
| 80 | agentmap_decisoes_criar | C | Cria decisão |
| 81 | agentmap_decisoes_atualizar | U | Atualiza decisão |
| 82 | agentmap_decisoes_excluir | D | Exclui decisão |
| 83 | agentmap_decisoes_excluir_todos | D | Exclui todas |

### 1.13 Dependências (6)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 84 | agentmap_dependencias_listar | R | Lista dependências |
| 85 | agentmap_dependencias_obter | R | Obtém dependência |
| 86 | agentmap_dependencias_criar | C | Cria dependência |
| 87 | agentmap_dependencias_excluir | D | Exclui dependência |
| 88 | agentmap_dependencias_atualizar | U | Atualiza dependência |
| 89 | agentmap_dependencias_excluir_todos | D | Exclui todas |

### 1.14 Responsabilidades (6)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 90 | agentmap_responsabilidades_listar | R | Lista responsabilidades |
| 91 | agentmap_responsabilidades_obter | R | Obtém responsabilidade |
| 92 | agentmap_responsabilidades_criar | C | Cria responsabilidade |
| 93 | agentmap_responsabilidades_excluir | D | Exclui responsabilidade |
| 94 | agentmap_responsabilidades_atualizar | U | Atualiza responsabilidade |
| 95 | agentmap_responsabilidades_excluir_todos | D | Exclui todas |

### 1.15 Artefatos (7)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 96 | agentmap_artefatos_listar | R | Lista artefatos |
| 97 | agentmap_artefatos_obter | R | Obtém artefato |
| 98 | agentmap_artefatos_criar | C | Cria artefato |
| 99 | agentmap_artefatos_excluir | D | Exclui artefato |
| 100 | agentmap_artefatos_atualizar | U | Atualiza artefato |
| 101 | agentmap_artefatos_versoes | R | Lista versões |
| 102 | agentmap_artefatos_excluir_todos | D | Exclui todos |

### 1.16 Resultados (7)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 103 | agentmap_resultados_listar | R | Lista resultados |
| 104 | agentmap_resultados_obter | R | Obtém resultado |
| 105 | agentmap_resultados_criar | C | Cria resultado |
| 106 | agentmap_resultados_atualizar | U | Atualiza resultado |
| 107 | agentmap_resultados_excluir | D | Exclui resultado |
| 108 | agentmap_resultados_excluir_todos | D | Exclui todos |

### 1.17 Critérios (6)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 109 | agentmap_criterios_listar | R | Lista critérios |
| 110 | agentmap_criterios_obter | R | Obtém critério |
| 111 | agentmap_criterios_criar | C | Cria critério |
| 112 | agentmap_criterios_excluir | D | Exclui critério |
| 113 | agentmap_criterios_atualizar | U | Atualiza critério |
| 114 | agentmap_criterios_excluir_todos | D | Exclui todos |

### 1.18 Aprendizados (6)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 115 | agentmap_aprendizados_listar | R | Lista aprendizados |
| 116 | agentmap_aprendizados_obter | R | Obtém aprendizado |
| 117 | agentmap_aprendizados_criar | C | Cria aprendizado |
| 118 | agentmap_aprendizados_excluir | D | Exclui aprendizado |
| 119 | agentmap_aprendizados_atualizar | U | Atualiza aprendizado |
| 120 | agentmap_aprendizados_excluir_todos | D | Exclui todos |

### 1.19 Validações (6)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 121 | agentmap_validacoes_listar | R | Lista validações |
| 122 | agentmap_validacoes_obter | R | Obtém validação |
| 123 | agentmap_validacoes_criar | C | Cria validação |
| 124 | agentmap_validacoes_excluir | D | Exclui validação |
| 125 | agentmap_validacoes_atualizar | U | Atualiza validação |
| 126 | agentmap_validacoes_excluir_todos | D | Exclui todas |

### 1.20 Contatos (6)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 127 | agentmap_contatos_listar | R | Lista contatos |
| 128 | agentmap_contatos_obter | R | Obtém contato |
| 129 | agentmap_contatos_criar | C | Cria contato |
| 130 | agentmap_contatos_atualizar | U | Atualiza contato |
| 131 | agentmap_contatos_excluir | D | Exclui contato |
| 132 | agentmap_contatos_excluir_todos | D | Exclui todos |

### 1.21 Arquivos (4)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 133 | agentmap_arquivos_listar | R | Lista arquivos |
| 134 | agentmap_arquivos_ler | R | Lê arquivo |
| 135 | agentmap_arquivos_excluir | D | Exclui arquivo |
| 136 | agentmap_arquivos_excluir_todos | D | Exclui todos |

### 1.22 Conflitos (7)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 137 | agentmap_conflitos_listar | R | Lista conflitos |
| 138 | agentmap_conflitos_obter | R | Obtém conflito |
| 139 | agentmap_conflitos_criar | C | Cria conflito |
| 140 | agentmap_conflitos_atualizar | U | Atualiza conflito |
| 141 | agentmap_conflitos_resolver | U | Resolve conflito |
| 142 | agentmap_conflitos_excluir | D | Exclui conflito |
| 143 | agentmap_conflitos_excluir_todos | D | Exclui todos |

### 1.23 Auditoria (1)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 144 | agentmap_auditoria_listar | R | Lista eventos de auditoria |

### 1.24 Eventos (3)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 145 | agentmap_eventos_pendentes | R | Lista eventos pendentes por agente |
| 146 | agentmap_eventos_listar | R | Lista eventos |
| 147 | agentmap_eventos_confirmar | U | Confirma consumo de evento |

### 1.25 Workflows (4)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 148 | agentmap_workflows_iniciar_trabalho | C | Inicia trabalho de agente |
| 149 | agentmap_workflows_finalizar_trabalho | U | Finaliza trabalho |
| 150 | agentmap_workflows_consultar_pendencias | R | Consulta pendencias por agente |
| 151 | agentmap_workflows_obter_mapa_projeto | R | Mapa completo do projeto |

### 1.26 Contexto / Arquitetura / Busca (8)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 152 | agentmap_obter_contexto_projeto | R | Contexto completo do projeto |
| 153 | agentmap_obter_arquitetura | R | Arquitetura do projeto |
| 154 | agentmap_obter_agente | R | Perfil completo de agente |
| 155 | agentmap_recomendar_agente | R | Recomenda agente para tarefa |
| 156 | agentmap_ler_trecho_arquivo | R | Lê trecho de arquivo |
| 157 | agentmap_buscar_simbolo | R | Busca símbolos no código |
| 158 | agentmap_buscar_referencias | R | Busca referências |
| 159 | agentmap_buscar_conhecimento | R | Busca na base de conhecimento |

### 1.27 Monitoramento / Orquestração (5)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 160 | agentmap_monitoramento_verificar_pendentes | R | Verifica mensagens pendentes |
| 161 | agentmap_orquestracao_listar_fases | R | Lista fases do projeto |
| 162 | agentmap_orquestracao_iniciar_fase | C | Inicia fase |
| 163 | agentmap_orquestracao_aprovar_checkpoint | U | Aprova checkpoint |
| 164 | agentmap_orquestracao_listar_handoffs | R | Lista handoffs do projeto |

### 1.28 KiloHub / Chat (4)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 165 | kilohub_report_status | C | Reporta status de sessão |
| 166 | kilohub_report_progress | C | Reporta progresso |
| 167 | kilohub_report_result | C | Reporta resultado final |
| 168 | kilohub_receive_chat_message | R | Recebe mensagens de chat |

### 1.29 Utilitários (3)
| # | Tool | CRUD | Descrição |
|---|------|------|-----------|
| 169 | agentmap_abrir_worktree | C | Abre worktree para tarefa |
| 170 | agentmap_sugerir_fluxo | R | Sugere fluxo de tools |
| 171 | agentmap_integridade_verificar | R | Verifica integridade do projeto |

### 1.30 Recursos / Prompts / Subscriptions (não tools)
- Resources: 9
- Prompts: 5
- Subscriptions: legacy + modern

---

## 2. Distribuição por Agentes (Planejamento)

| Agente | Categoria | Tools | Estimativa |
|--------|-----------|-------|-----------|
| backend | Projetos, Tarefas, Sessões, Workflows, Recursos | 35 | 2h |
| frontend | Arquivos, Artefatos, Contatos, Contexto | 15 | 1h |
| banco | Dependências, Bloqueios, Pendências, Reservas | 20 | 1h |
| seguranca | Auditoria, Eventos, Integridade | 12 | 1h |
| testes | Riscos, Conflitos, Decisões, Critérios, Validações | 30 | 2h |
| infra | Orquestração, Monitoramento, KiloHub | 15 | 1h |
| revisor | CRUD transversal, recomendar_agente, sugerir_fluxo | 25 | 2h |

**Total estimado: 8–9 horas de verificação paralela**

---

## 3. Bugs Encontrados e Corrigidos (commits iniciais)

| Arquivo | Bug | Correção |
|---------|-----|----------|
| backend/src/observability/tool-tracing.ts | `delete sanitizedSchema.outputSchema` removia o schema de saída antes do registro | Preservar `outputSchema` e repassar ao `server.registerTool` |
| backend/src/mcp-server/tools/orchestrator.ts | Leitura duplicada do mesmo arquivo `estado-fases.json` | Remover leitura duplicada; usar um único fetch |
| backend/src/mcp-server/tools/kilohub.ts | Path de status usava `agenteId || sessionId` podendo gerar path inválido | Sanitizar identificador com fallback `'unknown'` |
| backend/src/mcp-server/tools/kilohub.ts | Status desconhecido mapeado para `'ERRO'` | Mapear para `status.toUpperCase()` |
| backend/src/mcp-server/tools/sugerirFluxo.ts | Referência a tool inexistente `agentmap_obter_mapa_projeto` | Corrigir para `agentmap_workflows_obter_mapa_projeto` |
| backend/src/mcp-server/tools/worktree.ts | Uso de `path.win32.join` quebrando cross-platform | Trocar para `path.posix.join` |
| backend/src/mcp-server/tools/worktree.ts | Falta de verificação de `escreverJson` | Validar resultado e retornar erro MCP se falhar |
| backend/src/mcp-server/tools/buscarConhecimento.ts | Indentação quebrada no `registerTracedTool` | Corrigir indentação |
| backend/src/mcp-server/tools/buscarConhecimento.ts | `limite || config.limites...` falha com `limite=0` | Usar `typeof limite === 'number' ? limite : ...` |
| backend/src/mcp-server/tools/monitoramento-wakeup.ts | `input.limite || 20` falha com `limite=0` | Usar `typeof input.limite === 'number' ? input.limite : 20` |
| backend/src/mcp-server/tools/monitoramento-wakeup.ts | Falta de `McpAuditoria` e registros de tool call | Adicionar auditoria e normalizar saída |
| backend/src/mcp-server/tools/aprendizados.ts, validacoes.ts, resultados.ts | Operações async sem `await` em alguns caminhos | Garantir `await` e casting correto de `dados` |

**Commits:** `664f32a` (fix: multiple MCP tool bugs found during mega audit)

---

## 4. Status Inicial

- [x] Backend: iniciar verificação controllers/services de cada tool
- [ ] Frontend: verificar uso correto em modais e forms
- [ ] Banco: verificar schemas e constraints
- [ ] Segurança: verificar auth, validação Zod, path traversal
- [ ] Testes: verificar cobertura, qualidade, edge cases
- [ ] Infra: verificar orquestração, eventos, MCP wiring
- [ ] Revisor: verificar coerência de nomes, contratos, docs

---

*Documento gerado automaticamente — v0042*
