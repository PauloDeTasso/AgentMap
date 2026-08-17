# Referência da API REST

Documento completo com todos os endpoints da API do AgentMap, agrupados por domínio.

**Base URL:** `http://localhost:3150`

## Sumário

- [Geral](#geral)
- [Projetos](#projetos)
- [Agentes](#agentes)
- [Tarefas](#tarefas)
- [Arquivos](#arquivos)
- [Contratos](#contratos)
- [Solicitações de Alteração](#solicitações-de-alteração)
- [Critérios](#critérios)
- [Resultados](#resultados)
- [Artefatos](#artefatos)
- [Handoffs](#handoffs)
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
- [Handoffs Centrais](#handoffs-centrais)
- [Observabilidade](#observabilidade)
- [Temporários](#temporários)

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
  "dados": { "status": "online", "versao": "1.0.0" }
}
```

---

## Projetos

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/projetos` | Lista todos os projetos registrados |
| `GET` | `/api/projetos/scan` | Escaneia pasta de projetos |
| `GET` | `/api/projetos/atual` | Retorna o projeto atualmente aberto |
| `GET` | `/api/projetos/settings` | Retorna configurações |
| `PUT` | `/api/projetos/settings` | Atualiza configurações |
| `POST` | `/api/projetos` | Cria um novo projeto |
| `GET` | `/api/projetos/:id` | Obtém projeto por ID |
| `PUT` | `/api/projetos/:id` | Atualiza projeto |
| `POST` | `/api/projetos/:id/abrir` | Abre um projeto |
| `POST` | `/api/projetos/:id/fechar` | Fecha um projeto |
| `DELETE` | `/api/projetos/:id` | Remove projeto |
| `GET` | `/api/projetos/:id/configuracao` | Obtém configuração do projeto |
| `GET` | `/api/projetos/:id/fluxo/checklist` | Valida checklist de fluxo |
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

---

## Agentes

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/agentes` | Lista todos os agentes do projeto |
| `GET` | `/api/agentes/:id` | Obtém agente por ID |
| `POST` | `/api/agentes` | Cria um novo agente |
| `PUT` | `/api/agentes/:id` | Atualiza agente |
| `DELETE` | `/api/agentes/:id` | Remove agente |
| `GET` | `/api/agentes/:id/dominio/:caminho(*)` | Valida se agente pode acessar caminho |

**Exemplo - listar agentes:**
```bash
curl http://localhost:3150/api/agentes
```

**Exemplo - validar domínio:**
```bash
curl http://localhost:3150/api/agentes/backend/dominio/backend/src/servicos
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

---

## Arquivos

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/arquivos` | Lista arquivos em um diretório |
| `GET` | `/api/arquivos/conteudo` | Lê conteúdo de um arquivo |
| `POST` | `/api/arquivos` | Cria arquivo |
| `PUT` | `/api/arquivos` | Atualiza arquivo |
| `DELETE` | `/api/arquivos` | Remove arquivo |
| `GET` | `/api/arquivos/validar-json` | Valida se arquivo é JSON |
| `GET` | `/api/arquivos/validar-schema` | Valida JSON contra schema |
| `GET` | `/api/arquivos/explorer` | Abre caminho no explorer |

**Exemplo - listar arquivos:**
```bash
curl "http://localhost:3150/api/arquivos?path=backend/src"
```

**Exemplo - ler arquivo:**
```bash
curl "http://localhost:3150/api/arquivos/conteudo?path=backend/src/servicos/NovoServico.ts"
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

**Validação de contratos:**
| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/contratos/validar/:contratoId` | Valida contrato específico |
| `GET` | `/api/contratos/validar` | Valida todos os contratos |

**Exemplo:**
```bash
curl http://localhost:3150/api/contratos
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
| `GET` | `/api/criterios` | Lista critérios (filtra por `tarefaId`) |
| `GET` | `/api/criterios/:id` | Obtém critério por ID |
| `POST` | `/api/criterios` | Cria critério |
| `DELETE` | `/api/criterios/:id` | Remove critério |

---

## Resultados

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/resultados` | Lista resultados (filtra por `tarefaId`) |
| `GET` | `/api/resultados/:id` | Obtém resultado por ID |
| `POST` | `/api/resultados` | Cria resultado |
| `PUT` | `/api/resultados/:id` | Atualiza resultado |
| `DELETE` | `/api/resultados/:id` | Remove resultado |

---

## Artefatos

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/artefatos` | Lista artefatos (filtra por `tarefaId`) |
| `GET` | `/api/artefatos/:id` | Obtém artefato por ID |
| `GET` | `/api/artefatos/:id/versoes` | Lista versões do artefato |
| `POST` | `/api/artefatos` | Cria artefato |
| `DELETE` | `/api/artefatos/:id` | Remove artefato |

---

## Handoffs

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/handoffs` | Lista handoffs (filtra por `destino`) |
| `GET` | `/api/handoffs/:id` | Obtém handoff por ID |
| `POST` | `/api/handoffs` | Cria handoff |
| `PUT` | `/api/handoffs/:id` | Atualiza handoff |
| `DELETE` | `/api/handoffs/:id` | Remove handoff |

---

## Pendências

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/pendencias` | Lista pendências (filtra por `tarefaId`) |
| `GET` | `/api/pendencias/:id` | Obtém pendência por ID |
| `POST` | `/api/pendencias` | Cria pendência |
| `PUT` | `/api/pendencias/:id/resolver` | Resolve pendência |
| `PUT` | `/api/pendencias/:id` | Atualiza pendência |
| `DELETE` | `/api/pendencias/:id` | Remove pendência |

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

---

## Reservas

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/reservas` | Lista reservas (filtra por `agenteId`) |
| `GET` | `/api/reservas/:id` | Obtém reserva por ID |
| `POST` | `/api/reservas` | Cria reserva |
| `PUT` | `/api/reservas/:id/liberar` | Libera reserva |
| `PUT` | `/api/reservas/:id` | Atualiza reserva |
| `DELETE` | `/api/reservas/:id` | Remove reserva |

---

## Sessões

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/sessoes` | Lista sessões (filtra por `agenteId`) |
| `GET` | `/api/sessoes/:id` | Obtém sessão por ID |
| `POST` | `/api/sessoes` | Inicia sessão |
| `PUT` | `/api/sessoes/:id/finalizar` | Finaliza sessão |
| `DELETE` | `/api/sessoes/:id` | Remove sessão |

---

## Checkpoints

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/checkpoints` | Lista checkpoints (filtra por `tarefaId`) |
| `GET` | `/api/checkpoints/:id` | Obtém checkpoint por ID |
| `POST` | `/api/checkpoints` | Cria checkpoint |
| `DELETE` | `/api/checkpoints/:id` | Remove checkpoint |

---

## Aprendizados

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/aprendizados` | Lista aprendizados |
| `GET` | `/api/aprendizados/:id` | Obtém aprendizado por ID |
| `POST` | `/api/aprendizados` | Cria aprendizado |
| `DELETE` | `/api/aprendizados/:id` | Remove aprendizado |

---

## Dependências

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/dependencias` | Lista dependências (filtra por `fonteId`/`destinoId`) |
| `GET` | `/api/dependencias/:id` | Obtém dependência por ID |
| `POST` | `/api/dependencias` | Cria dependência |
| `DELETE` | `/api/dependencias/:id` | Remove dependência |

---

## Responsabilidades

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/responsabilidades` | Lista responsabilidades (filtra por `agenteId`/`alvoId`) |
| `GET` | `/api/responsabilidades/:id` | Obtém responsabilidade por ID |
| `POST` | `/api/responsabilidades` | Cria responsabilidade |
| `DELETE` | `/api/responsabilidades/:id` | Remove responsabilidade |

---

## Decisões

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/decisoes` | Lista decisões |
| `GET` | `/api/decisoes/:id` | Obtém decisão por ID |
| `POST` | `/api/decisoes` | Cria decisão |
| `PUT` | `/api/decisoes/:id` | Atualiza decisão |
| `DELETE` | `/api/decisoes/:id` | Remove decisão |

---

## Riscos

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/riscos` | Lista riscos |
| `GET` | `/api/riscos/:id` | Obtém risco por ID |
| `POST` | `/api/riscos` | Cria risco |
| `PUT` | `/api/riscos/:id` | Atualiza risco |
| `DELETE` | `/api/riscos/:id` | Remove risco |

---

## Bloqueios

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/bloqueios` | Lista bloqueios |
| `GET` | `/api/bloqueios/:id` | Obtém bloqueio por ID |
| `POST` | `/api/bloqueios` | Cria bloqueio |
| `PUT` | `/api/bloqueios/:id/resolver` | Resolve bloqueio |
| `DELETE` | `/api/bloqueios/:id` | Remove bloqueio |

---

## Eventos

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/eventos` | Lista eventos (filtra por `destino`/`estado`) |
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

---

## Monitoramento

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/monitor` | Visão consolidada do monitoramento |
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

---

## Instâncias

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/instancias` | Lista instâncias (filtra por `agenteId`/`projetoId`/`status`) |
| `GET` | `/api/instancias/:id` | Obtém instância por ID |
| `POST` | `/api/instancias` | Cria instância |
| `PUT` | `/api/instancias/:id` | Atualiza instância |
| `DELETE` | `/api/instancias/:id` | Remove instância |

---

## Orquestrador

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/orquestrador/status` | Obtém status do orquestrador |
| `POST` | `/api/orquestrador/handoffs/auto` | Dispara handoff automático |
| `PUT` | `/api/orquestrador/instancias/:id/modo` | Altera modo de autonomia |

---

## Admin

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/admin/transicoes` | Lista transições de estado |
| `PUT` | `/api/admin/transicoes/:origem` | Atualiza transições |
| `GET` | `/api/admin/transicoes/validar` | Valida transição |
| `GET` | `/api/admin/cors` | Obtém configuração CORS |
| `PUT` | `/api/admin/cors` | Atualiza configuração CORS |
| `GET` | `/api/admin/metricas` | Obtém métricas do sistema |
| `POST` | `/api/admin/backup` | Cria backup |
| `GET` | `/api/admin/readiness` | Verifica readiness |
| `GET` | `/api/admin/estado-projeto` | Obtém estado completo do projeto |

---

## Health

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/health` | Health check completo |

---

## Handoffs Centrais

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/handoffs-centrais/pendentes` | Lista handoffs pendentes |
| `GET` | `/api/handoffs-centrais/priorizados` | Lista handoffs priorizados |

---

## Observabilidade

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/observabilidade/metricas` | Obtém métricas de ferramentas e agentes |

---

## Temporários

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/temp/arquivos` | Lista arquivos temporários |
| `POST` | `/api/temp/limpar` | Limpa arquivos temporários |
| `GET` | `/api/temp/caminho` | Retorna caminho da pasta temp |

---

## Endpoints Gerais

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/estado` | Obtém estado atual do projeto |
| `GET` | `/api/auditoria` | Lista eventos de auditoria |
| `GET` | `/api/estado-projeto` | Obtém estado calculado do projeto |
| `GET` | `/api/integridade` | Verifica integridade do projeto |

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
