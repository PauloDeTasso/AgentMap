# GUIA INICIAL DO AGENTMAP
## Leia isto antes de qualquer ação. É o seu manual completo.

---

## 1. O QUE É O AGENTMAP

O AgentMap é um **Gerenciador Local de Agentes de IA** para Windows 11. Ele organiza projetos, agentes, contratos, tarefas, contexto, conhecimento e governança através de arquivos reais no sistema de arquivos.

**Premissa fundamental:** O arquivo é a informação principal. PostgreSQL é opcional (não implementado no momento; apenas pasta para futura expansão).

**O AgentMap NÃO executa agentes, NÃO escolhe modelos, NÃO distribui tarefas.**
Ele entrega contexto correto e registra o que acontece.

---

## 2. ARQUITETURA REAL DO SISTEMA

### 2.1 Backend (Node.js + TypeScript + Express)
- **API REST:** `backend/src/api/*.ts` — rotas HTTP para todas as entidades
- **Serviços:** `backend/src/servicios/*.ts` — lógica de negócio
- **MCP Server:** `backend/src/mcp-server/` — servidor Model Context Protocol
- **WebSocket:** `backend/src/websocket/monitoramento.ts` — monitoramento em tempo real
- **Validação:** `backend/src/validacao/SchemaValidator.ts` — validação JSON Schema
- **Arquivos:** `backend/src/arquivos/FileService.ts` — acesso seguro ao sistema de arquivos

### 2.2 Frontend (HTML5 + CSS3 + JavaScript vanilla)
- Interface web local em `frontend/`
- Acesse: `http://localhost:3150/index.html`
- Páginas: `index.html` (principal) e `monitoramento.html` (dashboard)

### 2.3 Dados (`.ia/` por projeto)
Cada projeto gerenciado tem uma pasta `.ia/` com:
- `tarefas/tarefas.json` — tarefas
- `contratos/contratos.json` — contratos
- `agentes/agentes.json` — registry de agentes
- `handoffs/handoffs.json` — handoffs
- `dependencias/dependencias.json` — dependências
- `eventos/eventos.json` — eventos
- `configuracao/transicoes.json` — máquina de estados
- `contexto/` — contexto do projeto

### 2.4 Temporários (`temp/` por projeto)
A pasta `temp/` na raiz do repositório armazena arquivos transitórios gerados durante o desenvolvimento:
- Limpeza automática por TTL (padrão: 7 dias) via `TempCleanupService`
- Limpeza manual via botão "🧹 Limpar Temp" no header do frontend
- Endpoints de API: `GET /api/temp/arquivos`, `POST /api/temp/limpar`, `GET /api/temp/caminho`
- `.gitignore` já ignora `temp/`

### 2.4 Configuração Global
- `kilo.jsonc` — configuração principal (NÃO edite diretamente)
- `kilo.local.jsonc` — overrides locais (NÃO versionar)
- `SECURITY.md` — política de segurança

### 2.5 Integração com Kilo Code (2026)

O AgentMap é consumido pelo **Kilo Code** via MCP. A configuração segue o padrão oficial:

**Níveis de configuração:**
- **Global:** `~/.config/kilo/kilo.jsonc` — aplica a todos os projetos
- **Projeto:** `kilo.jsonc` na raiz — aplica apenas a este projeto
- **Local:** `kilo.local.jsonc` — overrides locais, não versionado

**Formato MCP (local STDIO):**
```json
{
  "mcp": {
    "agentmap": {
      "type": "local",
      "command": ["cmd", "/c", "cd", "backend", "&&", "npx", "tsx", "src/mcp-server/index.ts"],
      "environment": {
        "NODE_ENV": "production"
      },
      "enabled": true,
      "timeout": 30000
    }
  }
}
```

**Agent Manager:** painel do Kilo Code para paralelismo real via worktrees isolados. Suporta modos `worktree` (isolamento git) e `local` (mesmo workspace).

**VS Code 1.115+:** inclui preview de **Agents app** com sessões paralelas em worktrees, diffs inline e revisão integrada.

---

## 3. FLUXO DE TRABALHO REAL (COMO AS COISAS FUNCIONAM HOJE)

### 3.1 O mecanismo oficial de paralelismo: Agent Manager + Worktrees
O AgentMap **NÃO usa mais CLI `kilo`** para executar agentes. O paralelismo real é feito via **Agent Manager** (extensão VS Code) criando worktrees isolados.

**Fluxo completo:**
1. Planejador cria tarefas e dependências em `.ia/tarefas/tarefas.json`
2. Validador confere critérios de aceitação e contratos
3. Quando uma tarefa está pronta, o sistema pode criar um worktree via Agent Manager
4. O agente trabalha no worktree isolado (branch próprio)
5. Resultados são registrados via MCP tools ou API REST
6. Monitoramento em tempo real via WebSocket

### 3.2 Estados de Tarefa (18 estados)
```
RASCUNHO → PLANEJADA → PRONTA → PREPARANDO → EM_EXECUCAO → EM_TESTE → EM_REVISAO → AGUARDANDO_APROVACAO → CONCLUIDA
                                                                                                        ↓
                                                                                                    BLOQUEADA ←┐
                                                                                                        ↓      │
                                                                                                    TIMEOUT    │
                                                                                                        ↓      │
                                                                                                     ORFA ────┘
                                                                                                        ↓
                                                                                                   RECUPERANDO → PRONTA/EM_EXECUCAO/BLOQUEADA

Estados terminais (sem saída):
- CONCLUIDA
- CANCELADA
- REJEITADA
```

### 3.3 Modos de Autonomia
- `MANUAL` — agente pede aprovação para cada ação
- `ASSISTIDA` — agente executa com supervisão
- `AUTONOMA` — agente executa sozinho

### 3.4 Serviços Ativos vs Deprecated

**ATIVOS (usar estes):**
- `TarefaService` — gerenciamento de tarefas
- `ProjetoService` — gerenciamento de projetos
- `AgenteService` — gerenciamento de agentes
- `StateMachineService` — máquina de estados de tarefas
- `MonitoramentoService` — monitoramento e heartbeats
- `OrquestradorService` — orquestração (worktree-based)
- `InstanciaService` — instâncias de agentes
- `EventoService` — eventos do sistema
- `HandoffService` — handoffs entre agentes
- `DependenciaService` — dependências de tarefas

---

## 4. TODAS AS FERRAMENTAS DISPONÍVEIS

### 4.1 MCP Tools (131 tools registradas)

Estas tools são chamadas por agentes via protocolo MCP. Estão registradas em `backend/src/mcp-server/tools/index.ts`.

**Gerenciamento de Projeto:**
- `agentmap_projetos_listar` — lista projetos
- `agentmap_projetos_criar` — cria projeto
- `agentmap_projetos_abrir` — abre projeto (`POST /api/projetos/:id/abrir`)
- `agentmap_projetos_fechar` — fecha projeto (`POST /api/projetos/:id/fechar`)
- `agentmap_projetos_atual` — projeto atual

**Gerenciamento de Agentes:**
- `agentmap_agentes_listar` — lista agentes
- `agentmap_agentes_criar` — cria agente
- `agentmap_agentes_obter` — obtém agente
- `agentmap_agentes_atualizar` — atualiza agente
- `agentmap_agentes_excluir` — exclui agente

**Gerenciamento de Tarefas:**
- `agentmap_tarefas_listar` — lista tarefas
- `agentmap_tarefas_criar` — cria tarefa
- `agentmap_tarefas_obter` — obtém tarefa
- `agentmap_tarefas_atualizar` — atualiza tarefa
- `agentmap_tarefas_excluir` — exclui tarefa
- `agentmap_tarefas_alterar_estado` — altera estado (respeita transições)
- `agentmap_tarefas_contexto` — pacote de contexto completo para tarefa

**Worktree (paralelismo real):**
- `agentmap_tarefas_prontas_para_worktree` — lista tarefas prontas para worktree
- `agentmap_verificar_dependencias_pendentes` — verifica dependências pendentes
- `agentmap_abrir_worktree` — abre worktree para agente

**Handoffs:**
- `agentmap_handoffs_listar` — lista handoffs
- `agentmap_handoffs_criar` — cria handoff
- `agentmap_handoffs_obter` — obtém handoff
- `agentmap_handoffs_atualizar` — atualiza handoff
- `agentmap_handoffs_excluir` — exclui handoff

**Solicitações de Alteração:**
- `agentmap_solicitacoes_listar` — lista solicitações
- `agentmap_solicitacoes_criar` — cria solicitação
- `agentmap_solicitacoes_aprovar` — aprova solicitação
- `agentmap_solicitacoes_rejeitar` — rejeita solicitação
- `agentmap_solicitacoes_atualizar` — atualiza solicitação
- `agentmap_solicitacoes_excluir` — exclui solicitação
- `agentmap_solicitacoes_historico` — histórico de solicitação

**Dependências:**
- `agentmap_dependencias_listar` — lista dependências
- `agentmap_dependencias_criar` — cria dependência
- `agentmap_dependencias_obter` — obtém dependência
- `agentmap_dependencias_excluir` — exclui dependência

**Eventos:**
- `agentmap_eventos_listar` — lista eventos
- `agentmap_eventos_pendentes` — eventos pendentes para agente
- `agentmap_eventos_confirmar` — confirma consumo de evento

**Sessões:**
- `agentmap_sessoes_listar` — lista sessões
- `agentmap_sessoes_criar` — cria sessão
- `agentmap_sessoes_obter` — obtém sessão
- `agentmap_sessoes_atualizar` — atualiza sessão
- `agentmap_sessoes_finalizar` — finaliza sessão
- `agentmap_sessoes_excluir` — exclui sessão

**Reservas:**
- `agentmap_reservas_listar` — lista reservas
- `agentmap_reservas_criar` — cria reserva
- `agentmap_reservas_obter` — obtém reserva
- `agentmap_reservas_liberar` — libera reserva
- `agentmap_reservas_excluir` — exclui reserva

**Bloqueios:**
- `agentmap_bloqueios_listar` — lista bloqueios
- `agentmap_bloqueios_criar` — cria bloqueio
- `agentmap_bloqueios_obter` — obtém bloqueio
- `agentmap_bloqueios_resolver` — resolve bloqueio
- `agentmap_bloqueios_excluir` — exclui bloqueio

**Conflitos:**
- `agentmap_conflitos_listar` — lista conflitos
- `agentmap_conflitos_criar` — cria conflito
- `agentmap_conflitos_obter` — obtém conflito
- `agentmap_conflitos_resolver` — resolve conflito
- `agentmap_conflitos_excluir` — exclui conflito

**Critérios:**
- `agentmap_criterios_listar` — lista critérios
- `agentmap_criterios_criar` — cria critério
- `agentmap_criterios_obter` — obtém critério
- `agentmap_criterios_excluir` — exclui critério

**Validações:**
- `agentmap_validacoes_listar` — lista validações
- `agentmap_validacoes_criar` — cria validação
- `agentmap_validacoes_obter` — obtém validação
- `agentmap_validacoes_excluir` — exclui validação

**Checkpoints:**
- `agentmap_checkpoints_listar` — lista checkpoints
- `agentmap_checkpoints_criar` — cria checkpoint
- `agentmap_checkpoints_obter` — obtém checkpoint
- `agentmap_checkpoints_excluir` — exclui checkpoint

**Pendências:**
- `agentmap_pendencias_listar` — lista pendências
- `agentmap_pendencias_criar` — cria pendência
- `agentmap_pendencias_obter` — obtém pendência
- `agentmap_pendencias_resolver` — resolve pendência
- `agentmap_pendencias_excluir` — exclui pendência

**Riscos:**
- `agentmap_riscos_listar` — lista riscos
- `agentmap_riscos_criar` — cria risco
- `agentmap_riscos_obter` — obtém risco
- `agentmap_riscos_atualizar` — atualiza risco
- `agentmap_riscos_excluir` — exclui risco

**Resultados:**
- `agentmap_resultados_listar` — lista resultados
- `agentmap_resultados_criar` — cria resultado
- `agentmap_resultados_obter` — obtém resultado

**Artefatos:**
- `agentmap_artefatos_listar` — lista artefatos
- `agentmap_artefatos_criar` — cria artefato
- `agentmap_artefatos_obter` — obtém artefato
- `agentmap_artefatos_excluir` — exclui artefato
- `agentmap_artefatos_versoes` — versões de artefato

**Aprendizados:**
- `agentmap_aprendizados_listar` — lista aprendizados
- `agentmap_aprendizados_criar` — cria aprendizado
- `agentmap_aprendizados_obter` — obtém aprendizado
- `agentmap_aprendizados_excluir` — exclui aprendizado

**Contatos:**
- `agentmap_contatos_listar` — lista contatos
- `agentmap_contatos_criar` — cria contato
- `agentmap_contatos_obter` — obtém contato
- `agentmap_contatos_atualizar` — atualiza contato
- `agentmap_contatos_excluir` — exclui contato

**Responsabilidades:**
- `agentmap_responsabilidades_listar` — lista responsabilidades
- `agentmap_responsabilidades_criar` — cria responsabilidade
- `agentmap_responsabilidades_obter` — obtém responsabilidade
- `agentmap_responsabilidades_excluir` — exclui responsabilidade

**Arquivos:**
- `agentmap_arquivos_listar` — lista arquivos de um diretório
- `agentmap_arquivos_ler` — lê arquivo
- `agentmap_arquivos_excluir` — exclui arquivo/diretório

**Busca:**
- `agentmap_buscar_conhecimento` — busca na base de conhecimento
- `agentmap_buscar_referencias` — busca referências a símbolo
- `agentmap_buscar_simbolo` — busca definições de símbolos

**Contexto:**
- `agentmap_obter_agente` — obtém perfil completo de agente
- `agentmap_obter_arquitetura` — obtém arquitetura do projeto
- `agentmap_obter_contexto_projeto` — contexto completo do projeto
- `agentmap_obter_contexto_tarefa` — pacote de contexto para tarefa
- `agentmap_recomendar_agente` — recomenda agente para tarefa
- `agentmap_ler_trecho_arquivo` — lê trecho de arquivo

**Auditoria:**
- `agentmap_auditoria_listar` — lista eventos de auditoria

**Workflows:**
- `agentmap_workflows_iniciar_trabalho` — inicia trabalho (valida agente + tarefa + monta contexto)
- `agentmap_workflows_finalizar_trabalho` — finaliza trabalho (registra resultado, artefatos, handoff)
- `agentmap_workflows_consultar_pendencias` — consulta pendências/handoffs/validações/bloqueios
- `agentmap_workflows_obter_mapa_projeto` — obtém mapa completo do projeto

### 4.2 API REST (principais endpoints)

Base: `http://localhost:3150/api`

**Projetos:**
- `GET /api/projetos` — lista projetos
- `POST /api/projetos` — cria projeto
- `GET /api/projetos/atual` — projeto atual
- `POST /api/projetos/:id/abrir` — abre projeto
- `POST /api/projetos/:id/fechar` — fecha projeto

**Tarefas:**
- `GET /api/tarefas` — lista tarefas
- `POST /api/tarefas` — cria tarefa
- `GET /api/tarefas/:id` — obtém tarefa
- `PUT /api/tarefas/:id` — atualiza tarefa
- `DELETE /api/tarefas/:id` — exclui tarefa
- `POST /api/tarefas/:id/estado` — altera estado

**Agentes:**
- `GET /api/agentes` — lista agentes
- `POST /api/agentes` — cria agente
- `GET /api/agentes/:id` — obtém agente
- `PUT /api/agentes/:id` — atualiza agente
- `DELETE /api/agentes/:id` — exclui agente

**Handoffs:**
- `GET /api/handoffs` — lista handoffs
- `POST /api/handoffs` — cria handoff
- `GET /api/handoffs/:id` — obtém handoff
- `PUT /api/handoffs/:id` — atualiza handoff
- `DELETE /api/handoffs/:id` — exclui handoff

**Monitoramento:**
- `GET /api/monitor` — dashboard completo
- `GET /api/estado` — estado atual
- `WebSocket /ws/monitoramento` — monitoramento em tempo real

**Outros:**
- `GET /api/health` — health check
- `GET /api/integridade` — verificação de integridade
- `GET /api/auditoria` — eventos de auditoria

### 4.3 WebSocket
- **URL:** `ws://localhost:3150/ws/monitoramento`
- **Eventos:** heartbeats, status de agentes, intervenções

### 4.4 Agent Manager (extensão VS Code)
O Agent Manager é a interface para gerenciar sessões de agente e worktrees.

**Conceitos:**
- **Worktree:** branch isolado com diretório próprio (`.kilo/worktrees/<nome>/`)
- **Sessão:** instância de agente rodando em um worktree
- **Branch:** sempre criada a partir de `v0006` (ou branch atual)

**Comandos principais (via MCP tools):**
```json
{
  "name": "agent_manager",
  "arguments": {
    "action": "list"
  }
}
```

```json
{
  "name": "agent_manager",
  "arguments": {
    "mode": "worktree",
    "tasks": [
      {
        "name": "nome-da-tarefa",
        "prompt": "Instruções detalhadas para o agente...",
        "branchName": "feature/nome-da-tarefa"
      }
    ]
  }
}
```

**Ações possíveis:**
- `list` — lista worktrees e sessões
- `move` — move worktree para seção
- `prompt` — envia instrução para sessão
- `stop` — para sessão

---

## 5. REGRAS FUNDAMENTAIS

### 5.1 Segurança
- **NUNCA** commitar segredos (API keys, tokens, senhas)
- **NUNCA** usar `exec` ou `spawn` com entrada de usuário sem sanitização
- **SEMPRE** validar caminhos com `fs.realpathSync` para evitar path traversal
- **SEMPRE** usar o `SchemaValidator` para validar dados antes de persistir
- **SEMPRE** registrar ações na auditoria
- **NUNCA** expor stack traces em produção

### 5.2 Convenções de Código
- **TypeScript** — tipagem forte obrigatória
- **Serviços** em `backend/src/servicios/`
- **Tools MCP** em `backend/src/mcp-server/tools/`
- **Nomes de arquivo:** camelCase para services, kebab-case para ferramentas
- **Commits:** mensagens imperativas, em português ou inglês
- **Testes:** arquivos `*.test.ts` na mesma pasta do código

### 5.3 Convenções de Dados
- **IDs:** formato `TAR-2026-00001`, `AGT-001`, `PROJ-001`
- **Estados:** usar constantes de `tipos/index.ts`, nunca hardcoded
- **Datas:** sempre ISO 8601 (`new Date().toISOString()`)
- **Erros:** sempre retornar `{ sucesso: false, codigoErro, erro }`

### 5.4 Fluxo de Trabalho com Worktrees
1. **Planejador** cria tarefas e dependências
2. **Validação** confere critérios de aceitação
3. **Worktree** é criado via Agent Manager para agente executor
4. **Agente** executa no worktree isolado
5. **Handoff** registra transferência de contexto
6. **Monitoramento** acompanha via WebSocket
7. **Validação** confere resultado
8. **Fechamento** registra artefatos e aprendizados

---

## 6. COMANDOS ÚTEIS

### 6.1 Desenvolvimento Backend
```bash
cd backend
npm install
npm run dev      # inicia backend + frontend na porta 3150
npm run build    # compila TypeScript
npm test         # executa testes
npm run mcp      # inicia MCP server
```

### 6.2 Verificação de Integridade
```bash
npm run build    # deve passar sem erros
npm test         # deve passar (alguns testes deprecated são skip)
```

### 6.3 Git
```bash
git status
git log --oneline -10
git branch --show-current
```

---

## 7. TROUBLESHOOTING

### 7.1 Backend não inicia
- Verifique se a porta 3150 está livre
- Verifique se `node_modules` existe (`npm install`)
- Verifique logs no console

### 7.2 Erro de build TypeScript
- Execute `npm run build` e leia o erro
- Erros comuns: imports quebrados, tipos duplicados, arquivos mortos

### 7.3 Testes falhando
- Alguns testes de código deprecated são pulados (`.skip`)
- Verifique se não está testando funcionalidade removida
- Execute `npm test -- --testNamePattern="nome"` para teste específico

### 7.4 MCP tool não funciona
- Verifique se está registrada em `backend/src/mcp-server/tools/index.ts`
- Verifique se o arquivo `.ts` existe na pasta `tools/`
- Verifique imports no arquivo da tool

---

## 8. ESTRUTURA DE DOCUMENTOS

### 8.1 Documentos Principais (leia primeiro)
- **`README.md`** — visão geral do projeto
- **`AGENTS.md`** — regras do sistema para agentes
- **`SECURITY.md`** — política de segurança
- **`.ia/docs/GUIA_INICIAL_AGENTES.md`** — este documento

### 8.2 Documentos de Referência
- **`docs/protocolo-mcp.md`** — protocolo MCP
- **`docs/guia-agente-mcp.md`** — ciclo de trabalho via MCP
- **`docs/arquitetura-mcp.md`** — arquitetura e tools MCP
- **`.ia/contexto/fluxo-trabalho.md`** — fluxo de trabalho real

### 8.3 Documentos Históricos
- **`PLANO GERAL/arquivo/`** — especificações e diagnósticos arquivados
- **`PLANO GERAL/`** — planejamento original consolidado

---

## 9. CHECKLIST ANTES DE QUALQUER AÇÃO

1. **Leu este guia?** Se não, pare e leia.
2. **Projeto está aberto?** Use `agentmap_projetos_abrir` ou API
3. **Agente está registrado?** Use `agentmap_agentes_listar`
4. **Tarefa tem contexto?** Use `agentmap_tarefas_contexto`
5. **Dependências estão OK?** Use `agentmap_verificar_dependencias_pendentes`
6. **Critérios de aceitação estão definidos?** Use `agentmap_criterios_listar`
7. **Contratos relevantes existem?** Use `agentmap_buscar_conhecimento`
8. **Você está no worktree correto?** Use `agent_manager list`

---

## 10. PRINCÍPIOS QUE NUNCA MUDAM

1. **O arquivo é a verdade.** Não confie em estado em memória.
2. **Git é somente leitura** para agentes (consulta).
3. **Validação antes de escrita.** Sempre valide antes de persistir.
4. **Auditoria de tudo.** Registre ações importantes.
5. **Segurança primeiro.** Path traversal, secrets, validação de input.
6. **Worktree é o paralelismo real.** Não use CLI inexistente.
7. **Documente o que fez.** Handoffs, aprendizados, artefatos.

---

## 11. EXEMPLOS PRÁTICOS

### 11.1 Agente recebe: "Crie uma tarefa"
```
1. agentmap_projetos_atual → confere projeto aberto
2. agentmap_agentes_listar → lista agentes disponíveis
3. agentmap_tarefas_criar → cria tarefa com dados completos
4. agentmap_dependencias_criar → cria dependências se necessário
5. agentmap_criterios_criar → define critérios de aceitação
6. agentmap_handoffs_criar → cria handoff para próximo agente (se necessário)
```

### 11.2 Agente recebe: "Execute uma tarefa"
```
1. agentmap_workflows_iniciar_trabalho → valida e monta contexto
2. agentmap_tarefas_contexto → obtém pacote completo
3. agentmap_tarefas_alterar_estado → move para EM_EXECUCAO
4. [executa trabalho no worktree]
5. agentmap_workflows_finalizar_trabalho → registra resultado e handoff
```

### 11.3 Agente recebe: "Revise um handoff"
```
1. agentmap_handoffs_listar → lista handoffs pendentes
2. agentmap_handoffs_obter → obtém detalhes
3. agentmap_obter_contexto_tarefa → entende a tarefa
4. [realiza revisão]
5. agentmap_handoffs_atualizar → atualiza estado
6. agentmap_validacoes_criar → cria validação se necessário
```

---

## 12. REFERÊNCIAS RÁPIDAS

| Conceito | Onde Encontrar |
|----------|---------------|
| Todos os estados de tarefa | `backend/src/tipos/index.ts` → `EstadoTarefa` |
| Transições válidas | `backend/src/tipos/index.ts` → `TRANSICOES_ESTADO_TAREFA` |
| Schemas de validação | `backend/esquemas/*.schema.json` |
| Configuração do projeto | `.ia/configuracao/transicoes.json` |
| Lista de agents | `backend/src/servicios/agentes.json` |
| Logs de auditoria | `.ia/contexto/auditoria.json` |
| Workflows definidos | `.ia/fluxo-trabalho.md` |

---

## 13. O QUE NÃO FAZER

1. **NÃO** criar novas ferramentas MCP sem antes verificar se já existe
2. **NÃO** executar comandos shell arbitrários (não há CLI `kilo`)
3. **NÃO** modificar `kilo.jsonc` diretamente (use `kilo.local.jsonc` para overrides)
4. **NÃO** commitar arquivos da pasta `.kilo/` ou `.ia/` com dados sensíveis
5. **NÃO** usar `Date.now()` para IDs — use `IdGenerator`
6. **NÃO** hardcodear caminhos absolutos
7. **NÃO** modificar estados de tarefa fora da máquina de estados
8. **NÃO** ignorar validação de schema

---

## 14. CONTATO E SUPORTE

- **Issues:** reporte em `erros/` ou via `agentmap_bloqueios_criar`
- **Decisões:** registre em `agentmap_decisoes_criar`
- **Riscos:** registre em `agentmap_riscos_criar`
- **Aprendizados:** registre em `agentmap_aprendizados_criar`

---

**Última atualização:** 2026-08-15
**Versão do guia:** 1.0
**Compatível com:** AgentMap v0006
