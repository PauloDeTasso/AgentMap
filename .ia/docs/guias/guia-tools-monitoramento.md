# Guia de Ferramentas (Tools) — Monitoramento do AgentMap

**Versão:** 1.0  
**Data:** 2026-08-13  
**Destinatário:** Agentes e usuários do AgentMap

---

## 1. Lista Completa de Tools Disponíveis

### Tools de Administração

| Tool | Descrição | Uso |
|------|-----------|-----|
| `agentmap_agentmap_integridade_verificar` | Verifica consistência do projeto | Detecção de inconsistências |
| `agentmap_agentmap_health_check` | Verifica saúde do sistema | Status geral |
| `agentmap_agentmap_projetos_listar` | Lista projetos existentes | Descobrir projetos |
| `agentmap_agentmap_metricas` | Exibe métricas do backend | Monitoring |

### Tools de Agentes

| Tool | Descrição | Uso |
|------|-----------|-----|
| `agentmap_agentmap_agentes_listar` | Lista todos os agentes | Ver agentes disponíveis |
| `agentmap_agentmap_agentes_obter` | Obtém detalhes de um agente | Ver config de um agente |
| `agentmap_agentmap_agentes_criar` | Cria um novo agente | Onboarding |
| `agentmap_agentmap_agentes_atualizar` | Atualiza configuração de agente | Alterar modo |
| `agentmap_agentmap_agentes_excluir` | Remove um agente | Limpeza |

### Tools de Tarefas

| Tool | Descrição | Uso |
|------|-----------|-----|
| `agentmap_agentmap_tarefas_listar` | Lista todas as tarefas | Ver tarefas pendentes |
| `agentmap_agentmap_tarefas_obter` | Obtém detalhes de uma tarefa | Ver especificação |
| `agentmap_agentmap_tarefas_atualizar` | Atualiza tarefa | Mudar estado |
| `agentmap_agentmap_tarefas_alterar_estado` | Altera estado de tarefa | Avançar fluxo |

### Tools de Handoffs

| Tool | Descrição | Uso |
|------|-----------|-----|
| `agentmap_agentmap_handoffs_criar` | Cria um handoff entre agentes | Transferir contexto |
| `agentmap_agentmap_handoffs_atualizar` | Atualiza estado de handoff | Confirmar/Aceitar/Concluir |
| `agentmap_agentmap_handoffs_obter` | Obtém detalhes de handoff | Ler mais |
| `agentmap_agentmap_handoffs_listar` | Lista handoffs | Ver pendentes |

### Tools de Eventos

| Tool | Descrição | Uso |
|------|-----------|-----|
| `agentmap_agentmap_eventos_pendentes` | Lista eventos não processados pelo agente | Consultar no início do ciclo |
| `agentmap_agentmap_eventos_confirmar` | Confirma processamento de evento | Após processar |

### Tools de Arquivos

| Tool | Descrição | Uso |
|------|-----------|-----|
| `agentmap_agentmap_arquivos_ler` | Lê um arquivo | Ler especificações |
| `agentmap_agentmap_arquivos_escrever` | Escreve arquivo | Criar artefatos |
| `agentmap_agentmap_arquivos_atualizar` | Atualiza arquivo existente | Modificar conteúdo |
| `agentmap_agentmap_arquivos_listar` | Lista arquivos em diretório | Navegar estrutura |

### Tools de Monitoramento (Nova)

| Tool | Descrição | Uso |
|------|-----------|-----|
| `agentmap_agentmap_eventos_pendentes` | Eventos HANDOFF_CRIADO para agente | Consultar pendentes |
| `agentmap_agentmap_integridade_verificar` | Verifica consistência do projeto | Validar estado |

---

## 2. Como Consultar Status

### Listar Agentes

```
agentmap_agentmap_agentes_listar
```

Retorna: `[{ id, nome, funcao, estado, ... }]`

### Ver Estado do Projeto

```
agentmap_agentmap_integridade_verificar
```

### Health Check

```
agentmap_agentmap_health_check
```

### Métricas

```
agentmap_agentmap_metricas
```

---

## 3. Como Criar Handoffs

```
agentmap_agentmap_handoffs_criar
```

**Arguments:**
```json
{
  "origem": "backend",
  "destino": "frontend",
  "tarefaId": "TAR-2026-00001",
  "resumo": "API pronta",
  "concluido": ["..."],
  "pendente": ["..."],
  "observacoes": "..."
}
```

### Confirmar Handoff Recebido

Sempre que receber um handoff, confirme com:

```
agentmap_agentmap_handoffs_atualizar
```

**Arguments:**
```json
{
  "id": "HOF-2026-00091",
  "estado": "ACEITO"
}
```

Depois de concluir:
```json
{
  "id": "HOF-2026-00091",
  "estado": "CONCLUIDO"
}
```

---

## 4. Como Consultar Eventos

### No início de cada ciclo:

```
agentmap_agentmap_eventos_pendentes
 Arguments: { "agenteId": "seu-agente-id" }
```

### Após processar:

```
agentmap_agentmap_eventos_confirmar
 Arguments: { "id": "EVT-2026-00091" }
```

Eventos possíveis:
- `HANDOFF_CRIADO` — novo handoff para seu agente
- `HANDOFF_ACEITO` — handoff aceito pelo destinatário
- `HANDOFF_CONCLUIDO` — handoff concluído
- `TAREFA_CONCLUIDA` — tarefa concluída
- `SOLICITACAO_CRIADA` — nova solicitação
- `DISPATCH_*` — eventos de dispatcher

---

## 5. Como Alterar Modo

Altere modo via API REST:

```bash
curl -X POST http://localhost:3150/api/monitoramento/modo \
  -H "Content-Type: application/json" \
  -d '{
    "modo": "HIBRIDO",
    "escopo": "GLOBAL"
  }'
```

Para um agente específico:
```bash
curl -X POST http://localhost:3150/api/monitoramento/modo \
  -H "Content-Type: application/json" \
  -d '{
    "modo": "MANUAL",
    "escopo": "AGENTE",
    "agenteId": "dba"
  }'
```

---

## 6. Exemplos de Uso de Cada Tool

### agentmap_agentmap_agentes_listar

Listar todos os agentes:
```
agentmap_agentmap_agentes_listar
```

### agentmap_agentmap_tarefas_listar

Listar todas as tarefas:
```
agentmap_agentmap_tarefas_listar
```

### agentmap_agentmap_arquivos_ler

Ler um arquivo:
```
agentmap_agentmap_arquivos_ler { caminho: ".ia/handoffs/HOF-2026-00091.json" }
```

### agentmap_agentmap_handoffs_criar

Criar um handoff:
```
agentmap_agentmap_handoffs_criar {
  origem: "arquiteto",
  destino: "frontend",
  tarefaId: "TAR-2026-00015",
  resumo: "Nova tarefa de implementacao",
  observacoes: "Verificar interface responsiva"
}
```

### agentmap_agentmap_eventos_pendentes

Consultar eventos pendentes:
```
agentmap_agentmap_eventos_pendentes { agenteId: "agentmap-admin" }
```
