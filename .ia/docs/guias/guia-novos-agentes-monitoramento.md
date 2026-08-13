# Guia para Novos Agentes — Monitoramento do AgentMap

**Versão:** 1.0  
**Data:** 2026-08-13  
**Destinatário:** Novos agentes que estão entrando no sistema AgentMap

---

## 1. Como Se Cadastrar

### Passo 1: Conheça os Agentes Existentes

Liste agentes via API ou consulte o arquivo:

```
GET /api/agentes
```

Ou consulte:
```
.ia/agentes/{agenteId}.json
```

### Passo 2: Crie Seu Agente

```
POST /api/agentes
```

**Body:**
```json
{
  "id": "novo-agente",
  "nome": "Novo Agente",
  "funcao": "sua_funcao",
  "dominio": "seu_dominio",
  "estado": "ativo",
  "prioridade": "media",
  "responsabilidades": ["responsabilidade1"]
}
```

### Passo 3: Configure na Outbox

Adicione sua configuração no `.ia/configuracao/agentes-config.json`:

```json
{
  "novo-agente": {
    "kiloAgent": "orchestrator",
    "workspacePath": "G:\\PROJETOS\\AgenteMap_Projetos\\PAGINA_PESSOAL\\novo-diretorio",
    "sessionId": null,
    "modoAutonomia": "AUTONOMA",
    "autoApprove": true
  }
}
```

Criar diretório de workspace e pastas de outbox:

```
.ia/outbox/novo-agente/
  ├── prompt.md (quando tiver tarefa)
  ├── enviado/
  └── erros/
```

---

## 2. Como Obter Session ID

### Via CLI

```bash
kilo run --agent orchestrator --format json "ola"
```

O `sessionId` é retornado no output JSON do Kilo:

```json
{"type":"step_start","sessionID":"ses_001abc...","part":{"sessionID":"ses_001abc..."}}
```

### Registrar na Configuração

Atualize `.ia/configuracao/agentes-config.json` com seu sessionId:

```json
{
  "novo-agente": {
    "sessionId": "ses_001abc...",
    ...
  }
}
```

---

## 3. Como Testar a Conexão

### Passo 1: Envie um Prompt de Teste

Crie `.ia/outbox/novo-agente/prompt.md`:

```
Você é o agente `novo-agente` no AgentMap. Responda apenas: TESTE_CONEXAO_OK
```

### Passo 2: Dispare via API

```bash
curl -X POST http://localhost:3150/api/admin/dispatch/novo-agente
```

**Resultado esperado:**
```json
{
  "sucesso": true,
  "dados": {
    "id": "DSP-1234567890",
    "status": "SUCESSO",
    "sessionId": "ses_001...",
    "exitCode": 0
  }
}
```

### Passo 3: Verifique o Log

```bash
curl http://localhost:3150/api/admin/dispatch-log
```

---

## 4. Como Reportar Primeira Tarefa

### Via API (PUT status)

```bash
curl -X PUT http://localhost:3150/api/monitoramento/agente/novo-agente/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ATIVO",
    "tarefaId": "TAR-2026-00015",
    "conteudo": "Primeira tarefa iniciada",
    "tipo": "TAREFA_INICIADA",
    "progresso": 0
  }'
```

### Via WebSocket

Se conectado via WebSocket:

```json
{
  "type": "mensagem",
  "data": {
    "tipo": "TAREFA_INICIADA",
    "emissor": "novo-agente",
    "agenteId": "novo-agente",
    "tarefaId": "TAR-2026-00015",
    "conteudo": "Primeira tarefa iniciada",
    "progresso": 0
  }
}
```

### Comandos no Prompt

Dentro do prompt do Kilo, reporte status:

```
TAREFA_INICIADA: Iniciando implementacao
ATUALIZAR_STATUS: 50% concluido
TAREFA_FINALIZADA: Implementacao concluida
```

---

## 5. Boas Práticas de Comunicação

1. **Sempre reporte início e fim de tarefas.**
   - Use `TAREFA_INICIADA` ao começar.
   - Use `TAREFA_CONCLUIDA` ao finalizar.

2. **Reporte progresso regularmente.**
   - A cada 20-30% de progresso, envie `ATUALIZAR_STATUS`.

3. **Reportar erros imediatamente.**
   - Use `ERRO` sempre que encontrar um problema.

4. **Solicite aprovação para ações críticas no modo HÍBRIDO/MANUAL.**
   - Deploy, drop de tabelas, delete massivo, mudanças de schema.

5. **Use filtros na interface de monitoramento.**
   - A interface suporta filtro por agente e tipo de mensagem.

6. **Não ignore mensagens de `AGUARDANDO`.**
   - No modo HÍBRIDO/MANUAL, o sistema pausa até você obter aprovação.

---

## 6. Checklist de Onboarding

- [ ] Criar agente via `POST /api/agentes`
- [ ] Adicionar configuração em `agentes-config.json`
- [ ] Criar diretório workspace e pasta `.ia/outbox/{agenteId}/`
- [ ] Obter sessionId via `kilo run`
- [ ] Testar dispatch via `POST /api/admin/dispatch/{agenteId}`
- [ ] Reportar status inicial via `PUT /api/monitoramento/agente/{agenteId}/status`
- [ ] Conectar ao WebSocket `/ws/monitoramento`
- [ ] Enviar primeira mensagem no chat
