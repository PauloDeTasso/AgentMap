# Referência da API REST

Documento completo com todos os endpoints da API do AgentMap, agrupados por domínio.

**Base URL:** `http://localhost:3150`

## Sumário

- [Geral](#geral)
- [Projetos](#projetos)
- [Agentes](#agentes)
- [Gerenciador de Agentes](#gerenciador-de-agentes)
- [Tarefas](#tarefas)
- [Arquivos](#arquivos)
- [Contratos](#contratos)
- [Validação de Contratos](#validação-de-contratos)
- [Solicitações de Alteração](#solicitações-de-alteração)
- [Critérios](#critérios)
- [Resultados](#resultados)
- [Artefatos](#artefatos)
- [Handoffs](#handoffs)
- [Handoffs Centrais](#handoffs-centrais)
- [Pendências](#pendências)
- [Validações](#validações)
- [Conflitos](#conflitos)
- [Reservas](#reservas)
- [Sessões](#sessoes)
- [Checkpoints](#checkpoints)
- [Aprendizados](#aprendizados)
- [Dependências](#dependências)
- [Responsabilidades](#responsabilidades)
- [Decisões](#decisões)
- [Riscos](#riscos)
- [Bloqueios](#bloqueios)
- [Eventos](#eventos)
- [Contatos](#contatos)
- [Monitoramento](#monitoramento)
- [Instâncias](#instâncias)
- [Orquestrador](#orquestrador)
- [Admin](#admin)
- [Health](#health)
- [Observabilidade](#observabilidade)
- [Temporários](#temporários)
- [Endpoints Gerais](#endpoints-gerais)

---

## Geral

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/status` | Status básico da API |

**Exemplo:**
```bash
curl http://localhost:3150/api/status
```

**Resposta:**
```json
{
  "sucesso": true,
  "dados": { "status": "online", "versao": "1.0.0", "gerenciadorDir": "..." }
}
```

---

## Projetos

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/projetos` | Lista todos os projetos registrados |
| `GET` | `/api/projetos/scan` | Escaneia pasta de projetos |
| `GET` | `/api/projetos/atual` | Retorna o projeto atualmente aberto |
| `GET` | `/api/projetos/settings` | Retorna configurações do gerenciador |
| `PUT` | `/api/projetos/settings` | Atualiza configurações do gerenciador |
| `POST` | `/api/projetos` | Cria um novo projeto |
| `GET` | `/api/projetos/:id` | Obtém projeto por ID |
| `PUT` | `/api/projetos/:id` | Atualiza projeto |
| `POST` | `/api/projetos/:id/abrir` | Abre um projeto |
| `POST` | `/api/projetos/:id/fechar` | Fecha um projeto |
| `DELETE` | `/api/projetos/:id` | Remove projeto |
| `DELETE` | `/api/projetos/todos` | Remove todos os projetos |
| `DELETE` | `/api/projetos` | Remove todos os projetos (alias) |
| `GET` | `/api/projetos/:id/configuracao` | Obtém configuração do projeto |
| `GET` | `/api/projetos/:id/fluxo/checklist` | Valida checklist de fluxo do projeto |
| `PUT` | `/api/projetos/:id/configuracao` | Atualiza configuração do projeto |

**Exemplo - listar projetos:**
```bash
curl http://localhost:3150/api/projetos
```

**Exemplo - abrir projeto:**
```bash
curl -X POST http://localhost:3150/api/projetos/ID/abrir \
  -H "Content-Type: application/json" \
  -d '{"caminho": "G:\\PROJETOS\\AgenteMap_Projetos\\MEU_PROJETO"}'
```

**Exemplo - scan de pasta:**
```bash
curl "http://localhost:3150/api/projetos/scan?pasta=C:\\meus-projetos"
```

---

## Agentes

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/agentes` | Lista todos os agentes do projeto |
| `GET` | `/api/agentes/:id` | Obtém agente por ID |
| `POST` | `/api/agentes` | Cria um novo agente |
| `PUT` | `/api/agentes/:id` | Atualiza agente |
| `DELETE` | `/api/agentes/:id` | Remove agente |
| `DELETE` | `/api/agentes` | Remove todos os agentes |
| `GET` | `/api/agentes/:id/dominio/:caminho(*)` | Valida se agente pode acessar caminho |

**Exemplo - listar agentes:**
```bash
curl http://localhost:3150/api/agentes
```

**Exemplo - validar domínio:**
```bash
curl http://localhost:3150/api/agentes/backend/dominio/backend/src/servicos
```

**Exemplo - criar agente:**
```bash
curl -X POST http://localhost:3150/api/agentes \
  -H "Content-Type: application/json" \
  -d '{
    "id": "backend",
    "nome": "Backend",
    "funcao": "backend",
    "estado": "ATIVO",
    "permissoes": { "leitura": true, "escrita": true }
  }'
```

---

## Gerenciador de Agentes

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/gerenciador-agentes/agentes` | Lista agentes com contexto completo |
| `GET` | `/api/gerenciador-agentes/agentes/:id` | Obtém agente com perfis e fluxo padrão |
| `GET` | `/api/gerenciador-agentes/fluxo-padrao` | Retorna fluxo de prompt e domínios padrão |

**Exemplo - listar agentes com contexto:**
```bash
curl http://localhost:3150/api/gerenciador-agentes/agentes
```

---

## Tarefas

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/tarefas` | Lista todas as tarefas |
| `GET` | `/api/tarefas/:id` | Obtém tarefa por ID |
| `POST` | `/api/tarefas` | Cria uma nova tarefa |
| `PUT` | `/api/tarefas/:id` | Atualiza tarefa |
| `POST` | `/api/tarefas/:id/estado` | Altera estado da tarefa |
| `GET` | `/api/tarefas/:id/contexto` | Obtém contexto completo da tarefa |
| `DELETE` | `/api/tarefas/:id` | Remove tarefa |
| `DELETE` | `/api/tarefas` | Remove todas as tarefas |

**Exemplo - listar tarefas:**
```bash
curl http://localhost:3150/api/tarefas
```

**Exemplo - alterar estado:**
```bash
curl -X POST http://localhost:3150/api/tarefas/TAR-2026-00001/estado \
  -H "Content-Type: application/json" \
  -d '{"estado": "EM_EXECUCAO"}'
```

**Exemplo - obter contexto:**
```bash
curl http://localhost:3150/api/tarefas/TAR-2026-00001/contexto
```

---

## Arquivos

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/arquivos` | Lista arquivos em um diretório (`path` query) |
| `GET` | `/api/arquivos/conteudo` | Lê conteúdo de um arquivo (`path` query) |
| `POST` | `/api/arquivos` | Cria arquivo |
| `PUT` | `/api/arquivos` | Atualiza arquivo |
| `DELETE` | `/api/arquivos` | Remove arquivo |
| `GET` | `/api/arquivos/validar-json` | Valida se arquivo é JSON (`path` query) |
| `GET` | `/api/arquivos/validar-schema` | Valida JSON contra schema (`path` e `schema` query) |
| `GET` | `/api/arquivos/explorer` | Abre caminho no explorer (`path` query) |

**Exemplo - listar arquivos:**
```bash
curl "http://localhost:3150/api/arquivos?path=backend/src"
```

**Exemplo - ler arquivo:**
```bash
curl "http://localhost:3150/api/arquivos/conteudo?path=backend/src/servicos/NovoServico.ts"
```

**Exemplo - criar arquivo:**
```bash
curl -X POST http://localhost:3150/api/arquivos \
  -H "Content-Type: application/json" \
  -d '{
    "caminho": "backend/src/servicos/NovoServico.ts",
    "conteudo": "export class NovoServico {}"
  }'
```

**Exemplo - validar schema:**
```bash
curl "http://localhost:3150/api/arquivos/validar-schema?path=backend/src/servicos/schema.json&schema=meu-schema"
```

---

## Contratos

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/contratos` | Lista contratos |
| `GET` | `/api/contratos/:id` | Obtém contrato por ID |
| `GET` | `/api/contratos/:id/dependentes` | Lista contratos dependentes |
| `POST` | `/api/contratos` | Cria contrato |
| `PUT` | `/api/contratos/:id` | Atualiza contrato |
| `DELETE` | `/api/contratos/:id` | Remove contrato |
| `DELETE` | `/api/contratos` | Remove todos os contratos |

**Exemplo:**
```bash
curl http://localhost:3150/api/contratos
curl "http://localhost:3150/api/contratos/validar/contrato-api"
```

---

## Validação de Contratos

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/contratos/validar/:contratoId` | Valida contrato específico |
| `GET` | `/api/contratos/validar` | Valida todos os contratos |

**Exemplo:**
```bash
curl http://localhost:3150/api/contratos/validar
curl "http://localhost:3150/api/contratos/validar/contrato-api"
```

---

## Solicitações de Alteração

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/solicitacoes` | Lista solicitações |
| `GET` | `/api/solicitacoes/:id` | Obtém solicitação por ID |
| `GET` | `/api/solicitacoes/:id/historico` | Obtém histórico da solicitação |
| `POST` | `/api/solicitacoes` | Cria solicitação |
| `PUT` | `/api/solicitacoes/:id` | Atualiza solicitação |
| `PUT` | `/api/solicitacoes/:id/aprovar` | Aprova solicitação |
| `PUT` | `/api/solicitacoes/:id/rejeitar` | Rejeita solicitação |
| `DELETE` | `/api/solicitacoes/:id` | Remove solicitação |
| `DELETE` | `/api/solicitacoes` | Remove todas as solicitações |

**Exemplo - aprovar:**
```bash
curl -X PUT http://localhost:3150/api/solicitacoes/ALT-2026-00001/aprovar \
  -H "Content-Type: application/json" \
  -d '{"agenteId": "backend", "observacao": "Aprovado"}'
```

---

## Critérios

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/criterios` | Lista critérios (filtra por `tarefaId` query) |
| `GET` | `/api/criterios/:id` | Obtém critério por ID |
| `POST` | `/api/criterios` | Cria critério |
| `DELETE` | `/api/criterios/:id` | Remove critério |
| `PUT` | `/api/criterios/:id` | Atualiza critério |
| `DELETE` | `/api/criterios` | Remove todos os critérios |

---

## Resultados

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/resultados` | Lista resultados (filtra por `tarefaId` query) |
| `GET` | `/api/resultados/:id` | Obtém resultado por ID |
| `POST` | `/api/resultados` | Cria resultado |
| `PUT` | `/api/resultados/:id` | Atualiza resultado |
| `DELETE` | `/api/resultados/:id` | Remove resultado |
| `DELETE` | `/api/resultados` | Remove todos os resultados |

---

## Artefatos

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/artefatos` | Lista artefatos (filtra por `tarefaId` query) |
| `GET` | `/api/artefatos/:id` | Obtém artefato por ID |
| `GET` | `/api/artefatos/:id/versoes` | Lista versões do artefato |
| `POST` | `/api/artefatos` | Cria artefato |
| `DELETE` | `/api/artefatos/:id` | Remove artefato |
| `PUT` | `/api/artefatos/:id` | Atualiza artefato |
| `DELETE` | `/api/artefatos` | Remove todos os artefatos |

---

## Handoffs

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/handoffs` | Lista handoffs (filtra por `destino` query) |
| `GET` | `/api/handoffs/:id` | Obtém handoff por ID |
| `POST` | `/api/handoffs` | Cria handoff |
| `PUT` | `/api/handoffs/:id` | Atualiza handoff |
| `DELETE` | `/api/handoffs/:id` | Remove handoff |
| `DELETE` | `/api/handoffs` | Remove todos os handoffs |

---

## Handoffs Centrais

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/handoffs-centrais/pendentes` | Lista handoffs pendentes |
| `GET` | `/api/handoffs-centrais/priorizados` | Lista handoffs pendentes priorizados |

**Exemplo:**
```bash
curl http://localhost:3150/api/handoffs-centrais/pendentes
```

---

## Pendências

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/pendencias` | Lista pendências (filtra por `tarefaId` query) |
| `GET` | `/api/pendencias/:id` | Obtém pendência por ID |
| `POST` | `/api/pendencias` | Cria pendência |
| `PUT` | `/api/pendencias/:id/resolver` | Resolve pendência |
| `PUT` | `/api/pendencias/:id` | Atualiza pendência |
| `DELETE` | `/api/pendencias/:id` | Remove pendência |
| `DELETE` | `/api/pendencias` | Remove todas as pendências |

**Exemplo - resolver pendência:**
```bash
curl -X PUT http://localhost:3150/api/pendencias/PEN-2026-00001/resolver \
  -H "Content-Type: application/json" \
  -d '{"resolucao": "Dependência concluída"}'
```

---

## Validações

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/validacoes` | Lista validações |
| `GET` | `/api/validacoes/:id` | Obtém validação por ID |
| `POST` | `/api/validacoes` | Cria validação |
| `PUT` | `/api/validacoes/:id/aprovar` | Aprova validação |
| `PUT` | `/api/validacoes/:id/rejeitar` | Rejeita validação |
| `PUT` | `/api/validacoes/:id` | Atualiza validação |
| `DELETE` | `/api/validacoes/:id` | Remove validação |
| `DELETE` | `/api/validacoes` | Remove todas as validações |

---

## Conflitos

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/conflitos` | Lista conflitos |
| `GET` | `/api/conflitos/:id` | Obtém conflito por ID |
| `POST` | `/api/conflitos` | Cria conflito |
| `PUT` | `/api/conflitos/:id/resolver` | Resolve conflito |
| `PUT` | `/api/conflitos/:id` | Atualiza conflito |
| `DELETE` | `/api/conflitos/:id` | Remove conflito |
| `DELETE` | `/api/conflitos` | Remove todos os conflitos |

---

## Reservas

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/reservas` | Lista reservas (filtra por `agenteId` query) |
| `GET` | `/api/reservas/:id` | Obtém reserva por ID |
| `POST` | `/api/reservas` | Cria reserva |
| `PUT` | `/api/reservas/:id/liberar` | Libera reserva |
| `PUT` | `/api/reservas/:id` | Atualiza reserva |
| `DELETE` | `/api/reservas/:id` | Remove reserva |
| `DELETE` | `/api/reservas` | Remove todas as reservas |

---

## Sessões

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/sessoes` | Lista sessões (filtra por `agenteId` query) |
| `GET` | `/api/sessoes/:id` | Obtém sessão por ID |
| `POST` | `/api/sessoes` | Inicia sessão |
| `PUT` | `/api/sessoes/:id/finalizar` | Finaliza sessão |
| `DELETE` | `/api/sessoes/:id` | Remove sessão |
| `PUT` | `/api/sessoes/:id` | Atualiza sessão |
| `DELETE` | `/api/sessoes` | Remove todas as sessões |

---

## Checkpoints

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/checkpoints` | Lista checkpoints (filtra por `tarefaId` query) |
| `GET` | `/api/checkpoints/:id` | Obtém checkpoint por ID |
| `POST` | `/api/checkpoints` | Cria checkpoint |
| `DELETE` | `/api/checkpoints/:id` | Remove checkpoint |
| `PUT` | `/api/checkpoints/:id` | Atualiza checkpoint |
| `DELETE` | `/api/checkpoints` | Remove todos os checkpoints |

---

## Aprendizados

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/aprendizados` | Lista aprendizados |
| `GET` | `/api/aprendizados/:id` | Obtém aprendizado por ID |
| `POST` | `/api/aprendizados` | Cria aprendizado |
| `DELETE` | `/api/aprendizados/:id` | Remove aprendizado |
| `PUT` | `/api/aprendizados/:id` | Atualiza aprendizado |
| `DELETE` | `/api/aprendizados` | Remove todos os aprendizados |

---

## Dependências

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/dependencias` | Lista dependências (filtra por `fonteId`/`destinoId` query) |
| `GET` | `/api/dependencias/:id` | Obtém dependência por ID |
| `POST` | `/api/dependencias` | Cria dependência |
| `DELETE` | `/api/dependencias/:id` | Remove dependência |
| `PUT` | `/api/dependencias/:id` | Atualiza dependência |
| `DELETE` | `/api/dependencias` | Remove todas as dependências |

---

## Responsabilidades

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/responsabilidades` | Lista responsabilidades (filtra por `agenteId`/`alvoId` query) |
| `GET` | `/api/responsabilidades/:id` | Obtém responsabilidade por ID |
| `POST` | `/api/responsabilidades` | Cria responsabilidade |
| `DELETE` | `/api/responsabilidades/:id` | Remove responsabilidade |
| `PUT` | `/api/responsabilidades/:id` | Atualiza responsabilidade |
| `DELETE` | `/api/responsabilidades` | Remove todas as responsabilidades |

---

## Decisões

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/decisoes` | Lista decisões |
| `GET` | `/api/decisoes/:id` | Obtém decisão por ID |
| `POST` | `/api/decisoes` | Cria decisão |
| `PUT` | `/api/decisoes/:id` | Atualiza decisão |
| `DELETE` | `/api/decisoes/:id` | Remove decisão |
| `DELETE` | `/api/decisoes` | Remove todas as decisões |

---

## Riscos

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/riscos` | Lista riscos |
| `GET` | `/api/riscos/:id` | Obtém risco por ID |
| `POST` | `/api/riscos` | Cria risco |
| `PUT` | `/api/riscos/:id` | Atualiza risco |
| `DELETE` | `/api/riscos/:id` | Remove risco |
| `DELETE` | `/api/riscos` | Remove todos os riscos |

---

## Bloqueios

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/bloqueios` | Lista bloqueios |
| `GET` | `/api/bloqueios/:id` | Obtém bloqueio por ID |
| `POST` | `/api/bloqueios` | Cria bloqueio |
| `PUT` | `/api/bloqueios/:id/resolver` | Resolve bloqueio |
| `DELETE` | `/api/bloqueios/:id` | Remove bloqueio |
| `PUT` | `/api/bloqueios/:id` | Atualiza bloqueio |
| `DELETE` | `/api/bloqueios` | Remove todos os bloqueios |

**Exemplo - resolver bloqueio:**
```bash
curl -X PUT http://localhost:3150/api/bloqueios/BLO-2026-00001/resolver \
  -H "Content-Type: application/json" \
  -d '{"resolucao": "Dependência externa liberada"}'
```

---

## Eventos

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/eventos` | Lista eventos (filtra por `destino`/`estado` query) |
| `GET` | `/api/eventos/:id` | Obtém evento por ID |
| `PUT` | `/api/eventos/:id/consumir` | Marca evento como consumido |
| `POST` | `/api/eventos` | Cria evento validado |
| `POST` | `/api/eventos/custom` | Cria evento custom |

**Exemplo - evento custom:**
```bash
curl -X POST http://localhost:3150/api/eventos/custom \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "MEU_EVENTO_CUSTOM",
    "origem": "backend",
    "destino": "frontend",
    "mensagem": "Integração pronta para teste",
    "campoExtra": "valor"
  }'
```

---

## Contatos

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/contatos` | Lista contatos |
| `GET` | `/api/contatos/:id` | Obtém contato por ID |
| `POST` | `/api/contatos` | Cria contato |
| `PUT` | `/api/contatos/:id` | Atualiza contato |
| `DELETE` | `/api/contatos/:id` | Remove contato |
| `DELETE` | `/api/contatos` | Remove todos os contatos |

---

## Monitoramento

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/monitoramento/mensagens` | Lista mensagens de monitoramento |
| `POST` | `/api/monitoramento/mensagens` | Cria mensagem de monitoramento |
| `GET` | `/api/monitoramento/agentes` | Lista agentes monitorados |
| `GET` | `/api/monitoramento/modo` | Obtém modo global |
| `POST` | `/api/monitoramento/modo` | Altera modo global |
| `POST` | `/api/monitoramento/intervir` | Executa intervenção manual |
| `PUT` | `/api/monitoramento/agente/:agenteId/status` | Atualiza status de agente |
| `GET` | `/api/monitoramento/dispatcher/pendentes` | Lista itens pendentes do dispatcher |
| `POST` | `/api/monitoramento/dispatcher/executar` | Executa item pendente |
| `GET` | `/api/monitoramento/dispatcher/logs` | Lista logs do dispatcher |
| `GET` | `/api/monitoramento/kilo/receive-chat` | Busca mensagens Kilo por agente/tarefa |
| `DELETE` | `/api/monitoramento/mensagens/:id` | Remove mensagem de monitoramento |
| `DELETE` | `/api/monitoramento/mensagens` | Limpa todas as mensagens |
| `DELETE` | `/api/monitoramento/agentes` | Limpa agentes monitorados |
| `DELETE` | `/api/monitoramento/agentes/:agenteId` | Remove agente monitorado |

**Parâmetros de consulta:**
- `GET /api/monitoramento/mensagens` aceita `limite` (número), `agenteId` (string), `tipo` (string) e `after` (number — `eventSequence` para polling incremental).
- `GET /api/monitoramento/dispatcher/pendentes` aceita `agenteId` (string, opcional).
- `GET /api/monitoramento/dispatcher/logs` aceita `limite` (número, opcional).
- `GET /api/monitoramento/kilo/receive-chat` aceita `agenteId` (string), `tarefaId` (string, opcional), `messageId` (string, opcional) e `limite` (number, opcional).

**Tipos de mensagem (`tipo`):** `KILO_CHAT`, `KILO_REPLY`, `KILO_RESULT`, `KILO_CHAT_REPLY`, `WAKEUP_PARENT`.

**Exemplo - enviar mensagem:**
```bash
curl -X POST http://localhost:3150/api/monitoramento/mensagens \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "KILO_CHAT",
    "emissor": "agente-kilo",
    "agenteId": "backend-teste",
    "tarefaId": "TAR-2026-00001",
    "conteudo": "[backend-teste][TAR-2026-00001] Iniciando implementação...",
    "dados": {"messageId": "msg-001"}
  }'
```

**Exemplo - ler mensagens Kilo:**
```bash
curl "http://localhost:3150/api/monitoramento/kilo/receive-chat?agenteId=backend-teste&limite=20"
```

**Exemplo - alterar modo:**
```bash
curl -X POST http://localhost:3150/api/monitoramento/modo \
  -H "Content-Type: application/json" \
  -d '{
    "modo": "AUTO",
    "escopo": "GLOBAL",
    "agenteId": "backend"
  }'
```

---

## Instâncias

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/instancias` | Lista instâncias (filtra por `agenteId`/`projetoId`/`status` query) |
| `GET` | `/api/instancias/:id` | Obtém instância por ID |
| `POST` | `/api/instancias` | Cria instância |
| `PUT` | `/api/instancias/:id` | Atualiza instância |
| `DELETE` | `/api/instancias/:id` | Remove instância |
| `DELETE` | `/api/instancias` | Remove todas as instâncias |

---

## Orquestrador

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/orquestrador/status` | Obtém status do orquestrador |
| `POST` | `/api/orquestrador/handoffs/auto` | Dispara handoff automático |
| `PUT` | `/api/orquestrador/instancias/:id/modo` | Altera modo de autonomia |

**Exemplo - handoff automático:**
```bash
curl -X POST http://localhost:3150/api/orquestrador/handoffs/auto \
  -H "Content-Type: application/json" \
  -d '{"tarefaId": "TAR-2026-00001", "agenteId": "backend"}'
```

---

## Admin

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/admin/transicoes` | Lista transições de estado |
| `PUT` | `/api/admin/transicoes/:origem` | Atualiza transições |
| `GET` | `/api/admin/transicoes/validar` | Valida transição (`origem` e `destino` query) |
| `GET` | `/api/admin/cors` | Obtém configuração CORS |
| `PUT` | `/api/admin/cors` | Atualiza configuração CORS |
| `GET` | `/api/admin/metricas` | Obtém métricas do sistema |
| `POST` | `/api/admin/backup` | Cria backup |
| `GET` | `/api/admin/readiness` | Verifica readiness |
| `GET` | `/api/admin/estado-projeto` | Obtém estado completo do projeto |

**Exemplo - atualizar transição:**
```bash
curl -X PUT http://localhost:3150/api/admin/transicoes/PENDENTE \
  -H "Content-Type: application/json" \
  -d '{"destinos": ["EM_EXECUCAO", "CANCELADO"]}'
```

**Exemplo - validar transição:**
```bash
curl "http://localhost:3150/api/admin/transicoes/validar?origem=PENDENTE&destino=EM_EXECUCAO"
```

---

## Health

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/health` | Health check completo |

**Exemplo:**
```bash
curl http://localhost:3150/api/health
```

---

## Observabilidade

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/observabilidade/metricas` | Obtém métricas de ferramentas e agentes |

**Exemplo:**
```bash
curl http://localhost:3150/api/observabilidade/metricas
```

---

## Temporários

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/temp/arquivos` | Lista arquivos temporários |
| `POST` | `/api/temp/limpar` | Limpa arquivos temporários (`olderThanDays` no body) |
| `GET` | `/api/temp/caminho` | Retorna caminho da pasta temp |

**Exemplo - limpar temporários:**
```bash
curl -X POST http://localhost:3150/api/temp/limpar \
  -H "Content-Type: application/json" \
  -d '{"olderThanDays": 7}'
```

---

## Endpoints Gerais

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/estado` | Obtém estado atual do projeto |
| `GET` | `/api/auditoria` | Lista eventos de auditoria |
| `GET` | `/api/estado-projeto` | Obtém estado calculado do projeto |
| `GET` | `/api/integridade` | Verifica integridade do projeto |
| `GET` | `/api/monitor` | Visão consolidada do monitoramento |

**Exemplo - estado do projeto:**
```bash
curl http://localhost:3150/api/estado-projeto
```

**Exemplo - monitor consolidado:**
```bash
curl http://localhost:3150/api/monitor
```

---

## Formato de Resposta

Todas as respostas seguem o padrão `ResultadoOperacao<T>`:

**Sucesso:**
```json
{
  "sucesso": true,
  "dados": { ... }
}
```

**Erro:**
```json
{
  "sucesso": false,
  "erro": "Descrição do erro",
  "codigoErro": "CODIGO_ERRO"
}
```

## Códigos de Erro Comuns

| Código | Significado |
|---|---|
| `NOT_FOUND` | Entidade não encontrada |
| `MISSING_FIELDS` | Campos obrigatórios faltando |
| `VALIDATION_ERROR` | Erro de validação |
| `PATH_TRAVERSAL` | Tentativa de path traversal |
| `FILE_NOT_FOUND` | Arquivo não encontrado |
| `CONFLICT` | Conflito de concorrência |
| `SERVICE_UNAVAILABLE` | Serviço indisponível |
| `DUPLICATE_MESSAGE` | Mensagem duplicada (idempotency) |
| `UNKNOWN_SESSION` | Sessão Kilo desconhecida |
| `NO_PROJECT_OPEN` | Nenhum projeto aberto |
| `INVALID_BODY` | Body inválido |
| `CONFIRMATION_REQUIRED` | Confirmação necessária |
| `FORBIDDEN` | Sem permissão |
| `MISSING_PATH` | Caminho obrigatório faltando |
| `PARSE_ERROR` | Erro ao parsear JSON |
| `PROJECT_STATE_UNAVAILABLE` | Estado do projeto indisponível |
| `HEALTH_CHECK_FAILED` | Falha no health check |
| `DIR_NOT_FOUND` | Diretório não encontrado |
| `INVALID_PATH` | Caminho inválido |
| `LIST_ERROR` | Erro ao listar |
| `NOT_OPEN` | Projeto não está aberto |
