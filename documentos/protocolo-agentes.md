# Protocolo de Agentes — Regras de Governança AgentMap

## O que é

O **Protocolo de Agentes** é o conjunto de regras que garante que todos os agentes
(frontend, backend, android, banco, infra, testes, docs, planejador) operem de forma
coordenada, rastreável e segura dentro de um projeto AgentMap.

Ele cobre:
- Nomenclatura e formato de IDs
- Estados e transições válidas por entidade
- Regras de relacionamento e integridade
- Convenções de arquivos e diretórios
- Regras de auditoria e histórico

> **Nota:** Este protocolo está em operação contínua em ambiente de produção. Todas as regras aqui descritas são aplicadas automaticamente pelo sistema, com validação completa de dados e integridade referencial em cada operação de escrita.

---

## 1. Nomenclatura e IDs

### 1.1 Formato padrão

Todos os IDs de entidade seguem o formato:

```
PREFIXO-AAAA-NNNNN
```

| Componente | Descrição | Exemplo |
|------------|-----------|---------|
| `PREFIXO` | 3-5 letras maiúsculas identificando a entidade | `TAR`, `ALT`, `BLOQ` |
| `AAAA` | Ano de criação com 4 dígitos | `2026` |
| `NNNNN` | Sequencial com padding zero à esquerda (5 dígitos) | `00001` |

Exemplos:
- `TAR-2026-00001` — Tarefa
- `ALT-2026-00042` — Solicitação de Alteração
- `BLOQ-2026-00003` — Bloqueio
- `CRIT-2026-00015` — Critério de Aceitação
- `APR-2026-00007` — Aprendizado

### 1.2 Prefixos por entidade

| Entidade | Prefixo | Diretório |
|----------|---------|-----------|
| Tarefa | `TAR` | `.ia/tarefas/` |
| Solicitação de Alteração | `ALT` | `.ia/solicitacoes/` |
| Bloqueio | `BLOQ` | `.ia/estado/bloqueios/` |
| Critério de Aceitação | `CRIT` | `.ia/criterios/` |
| Resultado | `RES` | `.ia/resultados/` |
| Artefato | `ART` | `.ia/artefatos/` |
| Handoff | `HOF` | `.ia/handoffs/` |
| Pendência | `PEN` | `.ia/pendencias/` |
| Validação | `VAL` | `.ia/validacoes/` |
| Conflito | `CON` | `.ia/conflitos/` |
| Reserva | `RESV` | `.ia/reservas/` |
| Sessão | `SES` | `.ia/sessoes/` |
| Checkpoint | `CHK` | `.ia/checkpoints/` |
| Aprendizado | `APR` | `.ia/aprendizados/` |
| Dependência | `DEP` | `.ia/dependencias/` |
| Responsabilidade | `RESP` | `.ia/responsabilidades/` |
| Decisão | `DEC` | `.ia/decisoes/` |
| Risco | `RIS` | `.ia/riscos/` |

### 1.3 Geração automática

IDs são gerados automaticamente pelo `IdGenerator` quando não fornecidos.
O gerador consulta o registro da entidade para determinar o próximo número
sequencial no ano corrente.

**Nunca reutilize IDs de entidades excluídas.**

---

## 2. Estados e Transições

### 2.1 Tarefa

Estados: `RASCUNHO`, `PENDENTE`, `PLANEJADA`, `PRONTA`, `PREPARANDO`, `EM_EXECUCAO`, `PAUSANDO`, `CANCELANDO`, `EM_TESTE`, `EM_REVISAO`, `AGUARDANDO_APROVACAO`, `CONCLUIDA`, `BLOQUEADA`, `TIMEOUT`, `ORFA`, `RECUPERANDO`, `CANCELADA`, `REJEITADA`

```
RASCUNHO → PENDENTE → PLANEJADA → PRONTA → PREPARANDO → EM_EXECUCAO → PAUSANDO → CANCELANDO → EM_TESTE → EM_REVISAO → AGUARDANDO_APROVACAO → CONCLUIDA
                  ↓         ↓           ↓           ↓           ↓              ↓           ↓           ↓           ↓                    ↓                    ↓
               CANCELADA  BLOQUEADA  BLOQUEADA  BLOQUEADA  BLOQUEADA     BLOQUEADA  BLOQUEADA  BLOQUEADA  BLOQUEADA          BLOQUEADA            REJEITADA
                  ↓         ↓           ↓           ↓           ↓              ↓           ↓           ↓           ↓                    ↓                    ↓
               (terminal) (qualquer)  (qualquer)  (qualquer)  (qualquer)     (qualquer)  (qualquer)  (qualquer)  (qualquer)         (qualquer)         RASCUNHO, PENDENTE, PLANEJADA, PRONTA, PREPARANDO, EM_EXECUCAO
```

Regras:
- `CONCLUIDA` e `CANCELADA` são estados terminais (não permitem transições de saída).
- `REJEITADA` permite reabertura para `RASCUNHO`, `PLANEJADA`, `PRONTA` ou `EM_EXECUCAO`.
- `BLOQUEADA` permite retomar qualquer estado ativo anterior.

### 2.2 Solicitação de Alteração

Estados: `PENDENTE`, `EM_ANALISE`, `AGUARDANDO_APROVACAO`, `APROVADA`, `REJEITADA`, `EM_EXECUCAO`, `AGUARDANDO_VALIDACAO`, `CONCLUIDA`, `CANCELADA`, `BLOQUEADA`

```
PENDENTE → EM_ANALISE → AGUARDANDO_APROVACAO → APROVADA → EM_EXECUCAO → AGUARDANDO_VALIDACAO → CONCLUIDA
               ↓              ↓                      ↓           ↓
            REJEITADA       CANCELADA               CANCELADA   BLOQUEADA
               ↓
            (reativação via PENDENTE)
```

### 2.3 Bloqueio

Estados: `ATIVO`, `RESOLVIDO`, `CANCELADO`

```
ATIVO → RESOLVIDO
      → CANCELADO
```

### 2.4 Validação

Estados: `PENDENTE`, `APROVADO`, `REPROVADO`, `APROVADO_COM_RESSALVAS`

```
PENDENTE → APROVADO
        → REPROVADO
        → APROVADO_COM_RESSALVAS
```

### 2.5 Conflito

Estados: `ABERTO`, `EM_RESOLUCAO`, `RESOLVIDO`, `CANCELADO`

```
ABERTO → EM_RESOLUCAO → RESOLVIDO
      → RESOLVIDO (resolução direta)
      → CANCELADO
```

### 2.6 Handoff

Estados: `PENDENTE`, `ACEITO`, `RECUSADO`, `CONCLUIDO`

```
PENDENTE → ACEITO → CONCLUIDO
               ↓      ↓
            RECUSADO (terminal)
```

### 2.7 Reserva

Estados: `ATIVA`, `CANCELADA`, `CONCLUIDA`

```
ATIVA → CONCLUIDA
      → CANCELADA
```

### 2.8 Resultado

Estados: `COMPLETO`, `PARCIAL`, `INCOMPLETO`

```
PARCIAL → COMPLETO
        → INCOMPLETO
INCOMPLETO → PARCIAL
```

### 2.9 Artefato

Estados: `ATIVO`, `ARQUIVADO`, `OBSOLETO`, `EXCLUIDO`

```
ATIVO → ARQUIVADO
      → OBSOLETO
```

### 2.10 Risco

Estados: `ATIVO`, `MITIGADO`, `RESOLVIDO`, `CANCELADO`

```
ATIVO → MITIGADO → RESOLVIDO
      → RESOLVIDO
      → CANCELADO
MITIGADO → ATIVO (reabertura)
```

---

## 3. Validação de Dados e Integridade Referencial

### 3.1 Validação automática completa

O sistema realiza validação abrangente e automática em todas as operações por meio do `IntegridadeService.verificar()`, garantindo a integridade referencial do projeto:

- **Agentes referenciados**: toda entidade que referencia `agenteId` deve ter o agente existente.
- **Tarefas referenciadas**: toda entidade que referencia `tarefaId` deve ter a tarefa existente.
- **Contratos obrigatórios**: toda tarefa deve ter contratos existentes.
- **Critérios de aceitação**: toda tarefa deve ter critérios existentes.
- **Dependências**: toda dependência `fonteId`/`destinoId` deve apontar para entidades existentes.
- **Responsabilidades**: todo `agenteId` e `alvoId` deve existir.
- **Handoffs**: `origem` e `destino` devem ser agentes existentes.
- **Sessões**: `projetoId` deve existir no registro de projetos.

### 3.2 Dependências entre tarefas

Uma tarefa não pode transitar para `EM_EXECUCAO` se existirem dependências `ATIVA`
apontando dela para outras tarefas que não estão em estado terminal.

Uma tarefa não pode transitar para `CONCLUIDA` se existirem dependências `ATIVA`
de outras tarefas apontando para ela.

### 3.3 Estado do projeto

O `IntegridadeService.calcularEstadoProjeto()` produz um snapshot completo com:
- Contadores de tarefas por estado
- Contadores de solicitações por status
- Contadores de bloqueios, conflitos, riscos
- Estatísticas de handoffs, validações, reservas, sessões, aprendizados

---

## 4. Convenções de Código

### 4.1 Serviços

A arquitetura de serviços segue uma assinatura de construtor uniforme:

```typescript
constructor(
  private fs: FileService,
  private auditoria: AuditoriaService,
  private validator: SchemaValidator
) {}
```

### 4.2 Retornos

Todos os métodos retornam `ResultadoOperacao<T>`:

```typescript
interface ResultadoOperacao<T> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
  codigoErro?: string;
}
```

### 4.3 Arquivos

- Nomes de arquivos são `path.win32.join('.ia', ...)` — nunca barras hardcoded.
- Registros usam `{ entityName: [...] }` (ex: `{ tarefas: [...] }`).
- Cada entidade também tem um arquivo individual `ID.json`.
- Backups automáticos são criados antes de sobrescrever arquivos.

### 4.4 Auditoria

Eventos de auditoria usam nomenclatura `TIPO_EVENTO`:

```
TAREFA_CRIADA
TAREFA_ESTADO_ALTERADO
SOLICITACAO_CRIADA
SOLICITACAO_APROVADA
BLOQUEIO_RESOLVIDO
CONFLITO_RESOLVIDO
INTEGRIDADE_VERIFICADA
```

---

## 5. Diretórios e Estrutura

```
.ia/
├── agentes/                  # Perfis de agentes
├── contratos/                # Contratos de API
├── tarefas/                  # Tarefas (estado atual)
│   ├── tarefas.json
│   ├── rascunho/
│   ├── planejadas/
│   ├── prontas/
│   ├── execucao/
│   ├── testes/
│   ├── revisao/
│   ├── aprovacao/
│   ├── bloqueadas/
│   └── concluidas/
├── solicitacoes/             # Solicitações de alteração
├── criterios/                # Critérios de aceitação
├── resultados/               # Resultados de tarefas
├── artefatos/                # Artefatos gerados
├── handoffs/                 # Handoffs entre agentes
├── pendencias/               # Pendências
├── validacoes/               # Validações
├── conflitos/                # Conflitos
├── reservas/                 # Reservas de recursos
├── sessoes/                  # Sessões de execução
├── checkpoints/              # Checkpoints
├── aprendizados/             # Aprendizados
├── dependencias/             # Dependências entre entidades
├── responsabilidades/        # Responsabilidades
├── decisoes/                 # Decisões arquiteturais
├── riscos/                   # Riscos
├── estado/                   # Estado atual do projeto
│   ├── estado-atual.json
│   └── bloqueios.json
├── historico/                # Histórico imutável
│   └── historico.json
├── auditoria/                # Log de auditoria
│   └── eventos.json
├── contexto/                 # Contexto para agentes
│   └── contextos.json
├── qualidade/                # Métricas de qualidade
├── permissoes/               # Permissões por agente
├── conhecimento/             # Base de conhecimento
├── procedimentos/            # Procedimentos padrão
├── politicas/                # Políticas do projeto
├── problemas/                # Problemas conhecidos
├── git/                      # Metadados Git (somente leitura)
├── configuracao/             # Configurações
│   ├── projetos.json
│   └── agentes-perfil.json
└── contratos/                # Contratos locais
    └── contrato-projeto.json
```

---

## 6. Regras de Deleção

### 6.1 Cascata

Por padrão, exclusões seguem regras de cascata:

- **Tarefa cancelada**: bloqueios relacionados são cancelados, dependências são canceladas.
- **Solicitação cancelada**: nenhuma cascata adicional (é autônoma).
- **Conflito cancelado**: nenhuma cascata adicional.

### 6.2 Soft-delete

Entidades com estados terminais utilizam soft-delete:
- `CANCELADA` para tarefas, solicitações, reservas
- `CANCELADO` para bloqueios, conflitos
- `ARQUIVADO` / `OBSOLETO` para artefatos

O registro (`registry`) é atualizado, mas o arquivo individual é mantido
para rastreabilidade.

---

## 7. Checklist para Agentes

Ao trabalhar em uma tarefa:

1. **Leia o contrato** associado antes de alterar qualquer arquivo.
2. **Consulte o estado atual** da tarefa e suas dependências.
3. **Verifique bloqueios** ativos antes de iniciar execução.
4. **Registre handoff** ao transferir responsabilidade.
5. **Crie critérios de aceitação** antes de iniciar desenvolvimento.
6. **Atualize o estado** ao final de cada fase (não pule etapas).
7. **Registre aprendizados** após conclusão.
8. **Valide** antes de marcar como `CONCLUIDA`.

## 8. Monitoramento

O AgentMap oferece um painel de monitoramento em tempo real consolidado no painel **Monitor**, acessível pela interface web. Esse painel reúne informações de múltiplas fontes do sistema para permitir acompanhamento completo do projeto.

### 8.1 O que o painel Monitor exibe

- **Sessões ativas** — Agentes em execução com tarefa associada, horário de início e contexto consultado
- **Resumo do estado** — Cards com contadores de tarefas (concluídas, em execução, bloqueadas), solicitações, riscos e sessões
- **Alertas** — Handoffs pendentes, bloqueios ativos e riscos críticos, com detalhes expandidos
- **Mensagens de monitoramento** — Comunicações enviadas via API entre agentes e sistemas
- **Eventos recentes** — Log de eventos operacionais com resultado e descrição

### 8.2 API de Monitoramento

| Endpoint | Descrição |
|---|---|
| `GET /api/monitor` | Visão consolidada do monitoramento |
| `GET /api/monitoramento/mensagens` | Lista mensagens com filtros |
| `POST /api/monitoramento/mensagens` | Cria mensagem de monitoramento |
| `PUT /api/monitoramento/agente/:id/status` | Atualiza status de agente |
| `GET /api/monitoramento/agentes` | Lista agentes monitorados |
| `GET /api/monitoramento/modo` | Modo global (MANUAL/AUTO) |
| `POST /api/monitoramento/modo` | Altera modo global |
| `POST /api/monitoramento/intervir` | Executa intervenção manual |
| `GET /api/monitoramento/dispatcher/pendentes` | Itens pendentes do dispatcher |
| `POST /api/monitoramento/dispatcher/executar` | Executa item pendente |
| `GET /api/monitoramento/dispatcher/logs` | Logs do dispatcher |

### 8.3 Mensagens de Monitoramento

Mensagens são registros estruturados de comunicação. Campos:

| Campo | Descrição |
|---|---|
| `id` | Identificador único |
| `timestamp` | Data/hora da mensagem |
| `tipo` | Tipo (INFO, AVISO, ERRO, SUCESSO) |
| `emissor` | Origem da mensagem |
| `agenteId` | Agente relacionado |
| `tarefaId` | Tarefa relacionada |
| `conteudo` | Conteúdo da mensagem |
| `dados` | Dados estruturados adicionais |
| `acoes` | Ações associadas |

### 8.4 Modos de Operação

- **MANUAL** — Fluxo controlado pelo usuário ou planejador
- **AUTO** — Sistema executa operações automaticamente dentro de regras predefinidas

O modo pode ser alterado via `POST /api/monitoramento/modo` e é refletido em tempo real no painel Monitor.

### 8.5 WebSocket

O WebSocket `ws://localhost:3150/ws/monitoramento` oferece atualizações em tempo real. O serviço `MonitoramentoWebSocket` faz broadcast de mensagens para sessões conectadas, permitindo atualizações instantâneas sem polling.

### 8.6 Comunicação com Agent Manager / Kilo Code

Agentes rodando no **Agent Manager (VS Code)** usam worktrees isolados. Eles **não possuem tools MCP de escrita** para o monitoramento. O canal correto é **HTTP direto**.

**Enviar mensagem (filho → AgentMap):**
```bash
curl -X POST http://localhost:3150/api/monitoramento/mensagens \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "KILO_CHAT",
    "emissor": "agente-kilo",
    "agenteId": "backend-teste",
    "tarefaId": "TAR-2026-00001",
    "conteudo": "[backend-teste][TAR-2026-00001] Mensagem completa...",
    "dados": {"messageId": "msg-001"}
  }'
```

**Ler respostas (filho ← AgentMap):**
```bash
curl "http://localhost:3150/api/monitoramento/kilo/receive-chat?agenteId=backend-teste&limite=20"
```

**Tipos de mensagem Kilo:**
- `KILO_CHAT` — mensagem padrão
- `KILO_REPLY` — resposta a uma mensagem (`dados.replyTo`)
- `KILO_RESULT` — resultado final de tarefa
- `KILO_CHAT_REPLY` — resposta de chat simples

Documentação completa: [`docs/comunicacao-agentmap-kilo.md`](docs/comunicacao-agentmap-kilo.md)

---
