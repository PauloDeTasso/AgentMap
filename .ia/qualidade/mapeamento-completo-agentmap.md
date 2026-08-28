# Mapeamento Completo — AgentMap

> Versão: 1.0.0
> Data: 2026-08-27
> Branch: v0044

---

## 1. Visão Geral

O **AgentMap** é um gerenciador local de agentes de IA para Windows, Linux e macOS. Ele organiza projetos, agentes, contratos, tarefas, contexto, conhecimento e governança através de arquivos reais no sistema de arquivos. O arquivo é a informação principal; PostgreSQL é opcional (não implementado no momento).

**Filosofia:**
- O gerenciador **não executa agentes**, não escolhe modelos, não distribui tarefas.
- Ele entrega contexto correto e registra o que acontece.
- Git é somente leitura (consulta).
- Proteção contra path traversal, validação de JSON, backups automáticos.

---

## 2. Arquitetura Atual

```
backend/    → Node.js + TypeScript + Express
frontend/   → HTML5 + CSS3 + JavaScript (vanilla ES modules)
banco/      → PostgreSQL opcional (não implementado)
esquemas/   → JSON Schemas de validação
temp/       → Arquivos temporários do projeto (limpeza automática/manual)
```

**Armazenamento operacional:** predominantemente **filesystem + JSON**. Os dados reais do projeto vivem em arquivos dentro de `.ia/`. PostgreSQL, se usado no futuro, será apenas para metadados/índice.

### 2.1 Backend
- **Framework:** Express
- **Linguagem:** TypeScript
- **Porta padrão:** 3150
- **Comando de desenvolvimento:** `cd backend && npm run dev`

### 2.2 Frontend
- **Tecnologia:** HTML5 + CSS3 + JavaScript vanilla (ES modules)
- **Acesso:** `http://localhost:3150/home.html`
- **Estrutura:** Páginas HTML com JS modular

### 2.3 Armazenamento
- **Filesystem + JSON** como fonte primária de dados
- Cada projeto tem uma pasta `.ia/` com estrutura completa
- PostgreSQL: pasta existe mas não implementada

---

## 3. Estrutura de Pastas de Projetos

- Pasta base de projetos: configurável por projeto (caminho absoluto ou relativo)
- Cada projeto recebe sua própria pasta com o **mesmo nome do projeto**
- Exemplo Windows: projeto `PAGINA_PESSOAL` → `G:\PROJETOS\AgenteMap_Projetos\PAGINA_PESSOAL`
- Exemplo Linux/macOS: projeto `PAGINA_PESSOAL` → `~/projetos/agentmap/PAGINA_PESSOAL`

### 3.1 Estrutura `.ia/` de um projeto gerenciado

```
.ia/
├── contratos/
├── tarefas/
├── dependencias/
├── contexto/
├── conhecimento/
├── docs/
├── procedimentos/
├── permissoes/
├── politicas/
├── git/
├── qualidade/
├── historico/
├── estado/
├── configuracao/
├── agentes/
├── handoffs/
├── sessoes/
├── checkpoints/
├── riscos/
├── bloqueios/
├── pendencias/
├── reservas/
├── decisoes/
├── responsabilidades/
├── artefatos/
├── resultados/
├── criterios/
├── aprendizados/
├── validacoes/
├── conflitos/
├── auditoria/
├── solicitacoes/
├── instancias/
├── orquestrador/
├── temp/
└── fluxo-trabalho.md (obrigatório)
```

---

## 4. API HTTP

### 4.1 Rotas por Domínio

**Projetos** (`/api/projetos`):
- `GET /`, `GET /scan`, `GET /atual`, `GET /settings`, `POST /`, `GET /:id`, `PUT /:id`, `POST /:id/abrir`, `POST /:id/fechar`, `DELETE /:id`, `GET /:id/configuracao`, `GET /:id/fluxo/checklist`, `PUT /:id/configuracao`

**Agentes** (`/api/agentes`):
- `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `GET /:id/dominio/:caminho(*)`, `DELETE /:id`, `DELETE /`

**Tarefas** (`/api/tarefas`):
- `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `POST /:id/estado`, `GET /:id/contexto`, `DELETE /:id`, `DELETE /`

**Arquivos** (`/api/arquivos`):
- `GET /`, `GET /conteudo`, `POST /`, `PUT /`, `DELETE /`, `GET /validar-json`, `GET /validar-schema`, `GET /explorer`

**Contratos** (`/api/contratos`):
- `GET /`, `GET /:id`, `GET /:id/dependentes`, `POST /`, `PUT /:id`, `DELETE /:id`, `DELETE /`

**Contratos Validação** (`/api/contratos/validar`):
- `GET /:contratoId`, `GET /`

**Gerenciador de Agentes** (`/api/gerenciador-agentes`):
- `GET /agentes`, `GET /agentes/:id`, `GET /fluxo-padrao`

**Handoffs** (`/api/handoffs`):
- `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `DELETE /`

**Sessões** (`/api/sessoes`):
- `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `PUT /:id/finalizar`, `DELETE /:id`, `DELETE /`

**Checkpoints** (`/api/checkpoints`):
- `GET /`, `GET /:id`, `POST /`, `DELETE /:id`, `PUT /:id`, `DELETE /`

**Eventos** (`/api/eventos`):
- `GET /`, `GET /:id`, `PUT /:id/consumir`, `POST /`, `POST /custom`

**Handoffs Centrais** (`/api/handoffs-centrais`):
- `GET /pendentes`, `GET /priorizados`

**Riscos** (`/api/riscos`):
- `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `DELETE /`

**Bloqueios** (`/api/bloqueios`):
- `GET /`, `GET /:id`, `POST /`, `PUT /:id/resolver`, `DELETE /:id`, `PUT /:id`, `DELETE /`

**Pendencias** (`/api/pendencias`):
- `GET /`, `GET /:id`, `POST /`, `PUT /:id/resolver`, `PUT /:id`, `DELETE /:id`, `DELETE /`

**Reservas** (`/api/reservas`):
- `GET /`, `GET /:id`, `POST /`, `PUT /:id/liberar`, `PUT /:id`, `DELETE /:id`, `DELETE /`

**Decisoes** (`/api/decisoes`):
- `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `DELETE /`

**Dependencias** (`/api/dependencias`):
- `GET /`, `GET /:id`, `POST /`, `DELETE /:id`, `PUT /:id`, `DELETE /`

**Responsabilidades** (`/api/responsabilidades`):
- `GET /`, `GET /:id`, `POST /`, `DELETE /:id`, `PUT /:id`, `DELETE /`

**Artefatos** (`/api/artefatos`):
- `GET /`, `GET /:id`, `GET /:id/versoes`, `POST /`, `DELETE /:id`, `PUT /:id`, `DELETE /`

**Resultados** (`/api/resultados`):
- `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `DELETE /`

**Criterios** (`/api/criterios`):
- `GET /`, `GET /:id`, `POST /`, `DELETE /:id`, `PUT /:id`, `DELETE /`

**Aprendizados** (`/api/aprendizados`):
- `GET /`, `GET /:id`, `POST /`, `DELETE /:id`, `PUT /:id`, `DELETE /`

**Validacoes** (`/api/validacoes`):
- `GET /`, `GET /:id`, `POST /`, `PUT /:id/aprovar`, `PUT /:id/rejeitar`, `PUT /:id`, `DELETE /:id`, `DELETE /`

**Contatos** (`/api/contatos`):
- `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `DELETE /`

**Conflitos** (`/api/conflitos`):
- `GET /`, `GET /:id`, `POST /`, `PUT /:id/resolver`, `PUT /:id`, `DELETE /:id`, `DELETE /`

**Auditoria** (`/api/auditoria`):
- `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `DELETE /`

**Monitoramento** (`/api/monitoramento`):
- `GET /mensagens`, `POST /mensagens`, `GET /agentes`, `GET /modo`, `POST /modo`, `POST /intervir`, `PUT /agente/:agenteId/status`, `GET /dispatcher/pendentes`, `POST /dispatcher/executar`, `GET /dispatcher/logs`, `GET /kilo/receive-chat`, `DELETE /mensagens/:id`, `DELETE /mensagens`, `DELETE /agentes`, `DELETE /agentes/:agenteId`

**Admin** (`/api/admin`):
- `GET /transicoes`, `PUT /transicoes/:origem`, `GET /transicoes/validar`, `GET /cors`, `PUT /cors`, `GET /metricas`, `POST /backup`, `POST /limpar-obsoletos`, `GET /estado-projeto`

**Health** (`/api/health`):
- `GET /`

**Readiness** (`/api/readiness`):
- `GET /`

**Instâncias** (`/api/instancias`):
- `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `DELETE /`

**Orquestrador** (`/api/orquestrador`):
- `GET /status`, `POST /handoffs/auto`, `PUT /instancias/:id/modo`

**Observabilidade** (`/api/observabilidade`):
- `GET /metricas`

**Temp** (`/api/temp`):
- `GET /arquivos`, `POST /limpar`, `GET /caminho`

**Estado** (`/api/estado`):
- `GET /`, `GET /notas`, `GET /notas/:id`, `POST /notas`, `PUT /notas/:id`, `DELETE /notas/:id`, `DELETE /notas`

**Integridade** (`/api/integridade`):
- `GET /`, `GET /regras`, `GET /regras/:id`, `POST /regras`, `PUT /regras/:id`, `DELETE /regras/:id`, `DELETE /regras`, `POST /verificar`

**Status**:
- `GET /api/status`

**Monitor**:
- `GET /api/monitor`

---

## 5. MCP Tools

### 5.1 Quantidade e Organização

- **~170 tools MCP** registradas
- Organizadas em arquivos por domínio em `backend/src/mcp-server/tools/`
- Registradas via `registerTracedTool` (wrapper com tracing OpenTelemetry)

### 5.2 Tools por Domínio

**Projetos:** `agentmap_projetos_listar`, `agentmap_projetos_criar`, `agentmap_projetos_abrir`, `agentmap_projetos_fechar`, `agentmap_projetos_atual`, `agentmap_projetos_excluir_todos`, `agentmap_integridade_verificar`

**Agentes:** `agentmap_agentes_listar`, `agentmap_agentes_obter`, `agentmap_agentes_criar`, `agentmap_agentes_atualizar`, `agentmap_agentes_excluir`, `agentmap_agentes_excluir_todos`

**Tarefas:** `agentmap_tarefas_listar`, `agentmap_tarefas_obter`, `agentmap_tarefas_criar`, `agentmap_tarefas_atualizar`, `agentmap_tarefas_alterar_estado`, `agentmap_tarefas_contexto`, `agentmap_tarefas_excluir`, `agentmap_tarefas_excluir_todos`, `agentmap_tarefas_prontas_para_worktree`

**Arquivos:** `agentmap_arquivos_listar`, `agentmap_arquivos_ler`, `agentmap_arquivos_excluir`, `agentmap_arquivos_excluir_todos`

**Handoffs:** `agentmap_handoffs_listar`, `agentmap_handoffs_obter`, `agentmap_handoffs_criar`, `agentmap_handoffs_atualizar`, `agentmap_handoffs_excluir`, `agentmap_handoffs_excluir_todos`

**Sessões:** `agentmap_sessoes_listar`, `agentmap_sessoes_obter`, `agentmap_sessoes_criar`, `agentmap_sessoes_atualizar`, `agentmap_sessoes_finalizar`, `agentmap_sessoes_excluir`, `agentmap_sessoes_excluir_todos`

**Checkpoints:** `agentmap_checkpoints_listar`, `agentmap_checkpoints_obter`, `agentmap_checkpoints_criar`, `agentmap_checkpoints_excluir`, `agentmap_checkpoints_atualizar`, `agentmap_checkpoints_excluir_todos`

**Eventos:** `agentmap_eventos_pendentes`, `agentmap_eventos_listar`, `agentmap_eventos_confirmar`

**Riscos:** `agentmap_riscos_listar`, `agentmap_riscos_obter`, `agentmap_riscos_criar`, `agentmap_riscos_atualizar`, `agentmap_riscos_excluir`, `agentmap_riscos_excluir_todos`

**Bloqueios:** `agentmap_bloqueios_listar`, `agentmap_bloqueios_obter`, `agentmap_bloqueios_criar`, `agentmap_bloqueios_resolver`, `agentmap_bloqueios_excluir`, `agentmap_bloqueios_atualizar`, `agentmap_bloqueios_excluir_todos`

**Pendencias:** `agentmap_pendencias_listar`, `agentmap_pendencias_obter`, `agentmap_pendencias_criar`, `agentmap_pendencias_atualizar`, `agentmap_pendencias_resolver`, `agentmap_pendencias_excluir`, `agentmap_pendencias_excluir_todos`

**Reservas:** `agentmap_reservas_listar`, `agentmap_reservas_obter`, `agentmap_reservas_criar`, `agentmap_reservas_atualizar`, `agentmap_reservas_liberar`, `agentmap_reservas_excluir`, `agentmap_reservas_excluir_todos`

**Decisoes:** `agentmap_decisoes_listar`, `agentmap_decisoes_obter`, `agentmap_decisoes_criar`, `agentmap_decisoes_atualizar`, `agentmap_decisoes_excluir`, `agentmap_decisoes_excluir_todos`

**Dependencias:** `agentmap_dependencias_listar`, `agentmap_dependencias_obter`, `agentmap_dependencias_criar`, `agentmap_dependencias_excluir`, `agentmap_dependencias_atualizar`, `agentmap_dependencias_excluir_todos`

**Responsabilidades:** `agentmap_responsabilidades_listar`, `agentmap_responsabilidades_obter`, `agentmap_responsabilidades_criar`, `agentmap_responsabilidades_excluir`, `agentmap_responsabilidades_atualizar`, `agentmap_responsabilidades_excluir_todos`

**Artefatos:** `agentmap_artefatos_listar`, `agentmap_artefatos_obter`, `agentmap_artefatos_criar`, `agentmap_artefatos_excluir`, `agentmap_artefatos_atualizar`, `agentmap_artefatos_versoes`, `agentmap_artefatos_excluir_todos`

**Resultados:** `agentmap_resultados_listar`, `agentmap_resultados_obter`, `agentmap_resultados_criar`, `agentmap_resultados_atualizar`, `agentmap_resultados_excluir`, `agentmap_resultados_excluir_todos`

**Criterios:** `agentmap_criterios_listar`, `agentmap_criterios_obter`, `agentmap_criterios_criar`, `agentmap_criterios_atualizar`, `agentmap_criterios_excluir`, `agentmap_criterios_excluir_todos`

**Aprendizados:** `agentmap_aprendizados_listar`, `agentmap_aprendizados_obter`, `agentmap_aprendizados_criar`, `agentmap_aprendizados_atualizar`, `agentmap_aprendizados_excluir`, `agentmap_aprendizados_excluir_todos`

**Validacoes:** `agentmap_validacoes_listar`, `agentmap_validacoes_obter`, `agentmap_validacoes_criar`, `agentmap_validacoes_atualizar`, `agentmap_validacoes_excluir`, `agentmap_validacoes_excluir_todos`, `agentmap_validacoes_aprovar`, `agentmap_validacoes_rejeitar`

**Contatos:** `agentmap_contatos_listar`, `agentmap_contatos_obter`, `agentmap_contatos_criar`, `agentmap_contatos_atualizar`, `agentmap_contatos_excluir`, `agentmap_contatos_excluir_todos`

**Conflitos:** `agentmap_conflitos_listar`, `agentmap_conflitos_obter`, `agentmap_conflitos_criar`, `agentmap_conflitos_atualizar`, `agentmap_conflitos_resolver`, `agentmap_conflitos_excluir`, `agentmap_conflitos_excluir_todos`

**Auditoria:** `agentmap_auditoria_listar`

**Monitoramento:** `agentmap_monitoramento_verificar_pendentes`

**Descobrir:** `agentmap_descobrir`

**Workflows:** `agentmap_workflows_iniciar_trabalho`, `agentmap_workflows_finalizar_trabalho`, `agentmap_workflows_consultar_pendencias`, `agentmap_workflows_obter_mapa_projeto`

**Worktree:** `agentmap_abrir_worktree`, `agentmap_tarefas_prontas_para_worktree`, `agentmap_verificar_dependencias_pendentes`

**Contexto:** `agentmap_obter_contexto_projeto`, `agentmap_obter_contexto_tarefa`

**Arquitetura:** `agentmap_obter_arquitetura`

**Agente:** `agentmap_obter_agente`, `agentmap_recomendar_agente`

**Busca:** `agentmap_buscar_simbolo`, `agentmap_buscar_referencias`, `agentmap_buscar_conhecimento`

**Leitura:** `agentmap_ler_trecho_arquivo`

**Fluxo:** `agentmap_sugerir_fluxo`

**Kilohub:** `kilohub_receive_chat_message`, `kilohub_report_progress`, `kilohub_report_result`, `kilohub_report_status`

**Admin:** `agentmap_admin_metricas`, `agentmap_admin_backup`

**Integridade:** `agentmap_integridade_verificar`, `agentmap_integridade_listar_regras`

**Estado:** `agentmap_estado_listar_notas`, `agentmap_estado_obter_nota`

**Temp:** `agentmap_temp_listar_arquivos`, `agentmap_temp_limpar`

---

## 6. Agentes e Perfis

### 6.1 Perfis Padrão

| Papel | Função | Foco Principal |
|-------|--------|----------------|
| Gerente de Projeto | `gerente-projeto` | Escopo, prazo, custo, qualidade |
| Analista de Sistemas | `analista-sistemas` | Tradução técnica de requisitos |
| Arquiteto de Software | `planejador-arquiteto` | Estrutura técnica do sistema |
| Analista de Negócios | `analista-negocios` | Requisitos de negócio |
| Engenheiro de Software | `engenheiro-software` | Engenharia técnica completa |
| Analista de Banco de Dados | `analista-banco-dados` | Dados e persistência |
| Testador/QA | `testador-qa` | Qualidade e prevenção |
| Documentador Técnico | `documentador-tecnico` | Documentação estruturada |

### 6.2 Outros Papéis
- Segurança
- Backend
- Frontend
- Mobile
- Infraestrutura
- DevOps
- Revisor
- Observabilidade
- Desempenho

---

## 7. Fluxo de Trabalho

### 7.1 Onboarding
1. Leitura do `agentmap://onboarding`
2. Uso de `agentmap_descobrir` para listar capabilities
3. Abertura de projeto com `agentmap_projetos_abrir`
4. Consulta de `agentmap_agentes_listar` e `agentmap_obter_contexto_projeto`

### 7.2 Criação de Projeto
1. Validação de estrutura mínima:
   - `.ia/fluxo-trabalho.md` obrigatório
   - Pastas `.ia/contratos`, `.ia/tarefas`, `.ia/dependencias` obrigatórias
   - Pelo menos 1 contrato e 1 tarefa registrados
   - Sem dependências circulares
2. Se checklist não estiver completo, criação/abertura é bloqueada
3. Endpoint: `GET /api/projetos/:id/fluxo/checklist`

### 7.3 Fases do Projeto
1. Planejamento de Projeto
2. Análise de Viabilidade
3. Requisitos
4. Design e Contratos
5. Design UX/UI
6. Banco de Dados
7. Implementação
8. Testes e Qualidade
9. DevSecOps / Segurança
10. Deploy e Infraestrutura
11. Documentação e Manutenção

### 7.4 Governança
- **Contratos:** definem o que cada agente pode fazer
- **Dependências:** mapeiam relações entre tarefas
- **Riscos:** registram riscos identificados
- **Bloqueios:** registram impedimentos
- **Pendencias:** registram pendências de decisão
- **Reservas:** controlam acesso a recursos
- **Handoffs:** transferências de contexto entre agentes
- **Eventos:** comunicação assíncrona entre agentes
- **Checkpoints:** marcos de validação humana

---

## 8. Comunicação e Wake-up

### 8.1 Fluxo de Wake-up
1. **Detecção de idle:** plugin escuta `session.idle`
2. **Polling:** consulta `GET /api/monitoramento/mensagens?after=<eventSequence>` ou `agentmap_monitoramento_verificar_pendentes`
3. **Injeção:** se houver mensagem relevante, injeta prompt na sessão via `client.session.promptAsync()`

### 8.2 Comunicação AgentMap ↔ Agent Manager
- **Pai → Filho:** prompt do Agent Manager no VS Code
- **Filho → AgentMap (escrita):** HTTP `POST /api/monitoramento/mensagens`
- **Filho ← AgentMap (leitura):** HTTP `GET /api/monitoramento/kilo/receive-chat?agenteId=<id>&limite=20`

---

## 9. Segurança

- **CORS:** origins configuradas para desenvolvimento local
- **Path Traversal:** proteção contra path traversal em todos os caminhos de arquivo
- **Validação:** schemas Zod em todas as escritas
- **Observabilidade:** traces e métricas OpenTelemetry

---

## 10. Problemas Conhecidos e Limitações

1. **Multi-tenancy artificial:** sistema tenta gerenciar múltiplos projetos mas é usado principalmente como instância única
2. **Complexidade de projeto aberto/fechado:** camada desnecessária para uso real
3. **Falta de ferramentas MCP para vários domínios:** Admin, Integridade, Estado, Temp não tinham tools (já corrigido em v0044)
4. **`path.win32.join` em massa:** problemas de portabilidade (já corrigido em v0044)
5. **`/api/health` e `/api/admin/readiness` requeriam projeto aberto:** problema para CI/CD (já corrigido em v0044)
6. **Bypass do service layer em `/eventos/custom`:** violação de arquitetura (já corrigido em v0044)
7. **`outputSchema` vs `toMcpStructured`:** documentado e ajustado onde havia clara divergência
8. **Falta de scaffolds/init:** não existe comando para criar novo projeto rapidamente
9. **Propagação de atualizações:** quando o AgentMap base atualiza, projetos não recebem as mudanças
10. **Frontend acoplado:** frontend é parte do backend, não pode ser servido separadamente

---

## 11. O que o AgentMap pode fazer

### 11.1 Gerenciamento de Projetos
- Criar/abrir/fechar projetos
- Validar estrutura mínima de projeto
- Gerenciar configurações de projeto
- Scan de diretórios

### 11.2 Gerenciamento de Agentes
- CRUD de agentes
- Perfis de agente por papel
- Domínios de arquivo por agente
- Gerenciamento de instruções, personalidade, regras

### 11.3 Governança
- Contratos com validação
- Dependências entre tarefas
- Riscos com transições de estado
- Bloqueios com resolução
- Pendencias de decisão
- Reservas de recursos
- Handoffs entre agentes
- Eventos assíncronos

### 11.4 Execução
- Tarefas com estados
- Sessões de trabalho
- Checkpoints de validação
- Workflows automáticos
- Worktrees isoladas

### 11.5 Documentação
- Resultados de tarefas
- Critérios de aceitação
- Aprendizados
- Validações
- Artefatos com versionamento
- Decisões arquiteturais
- Responsabilidades

### 11.6 Monitoramento
- Mensagens entre agentes
- Status de agentes
- Modo de operação
- Intervenções
- Dispatcher de tarefas
- Wake-up automático

### 11.7 Qualidade
- Regras de integridade
- Verificação de estado
- Auditoria de ações
- Estado do projeto

### 11.8 Infraestrutura
- Backups
- Limpeza de temporários
- Métricas
- CORS
- Transições de state machine

---

## 12. Integração com Kilo Code

- **Plugin wake-up:** `.kilo/plugin/agentmap-wakeup.ts`
- **MCP Server:** `backend/src/mcp-server/index.ts`
- **Transporte:** STDIO local
- **SDK:** `@modelcontextprotocol/sdk` v1.30.0
- **Tools:** ~170 tools registradas
- **Agent Manager:** worktrees isoladas por agente
- **VS Code 1.115+:** preview de Agents app com sessões paralelas

---

## 13. Configuração

- **Projeto:** `.ia/configuracao/projeto.json`
- **Agentes:** `.ia/agentes/agentes.json`
- **Fluxo:** `.ia/fluxo-trabalho.md`
- **Kilo Code:** `.kilo/` (plugin, worktrees, agent-manager)
- **Variáveis de ambiente:** `NODE_ENV`, `BACKEND_DIR`, `GERENCIADOR_DIR`

---

## 14. Comandos e Scripts

```bash
cd backend
npm install
npm run dev      # inicia backend + frontend na porta 3150
npm run typecheck # verifica tipos TypeScript
npm run lint      # verifica tipos TypeScript (mesmo que typecheck)
```

---

## 15. Estado Atual (v0044)

- **Branch:** v0044
- **Commit base:** v0043
- **Mudanças aplicadas:**
  - Eliminação total de `path.win32.join` (0 ocorrências)
  - Health/Readiness funcionam sem projeto aberto
  - `/eventos/custom` usa service layer
  - 4 novas tools MCP (admin, integridade, estado, temp)
  - Filtros MCP adicionados (reservas, dependencias, responsabilidades, artefatos)
  - Metadata completa em tools de sessões
  - `describe.skip` removido do teste orquestrador
  - Typecheck e lint limpos

---

*Documento gerado para análise dos 7 conselheiros arquiteturais*
