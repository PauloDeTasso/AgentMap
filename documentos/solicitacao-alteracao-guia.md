# Guia de Solicitação de Alteração — AgentMap

## O que é

Uma **Solicitação de Alteração** (identificador técnico: `solicitacaoAlteracao`) é um registro
permanente no sistema de projetos AgentMap que documenta qualquer mudança necessária que afete
componentes, agentes, contratos, banco de dados, arquitetura, infraestrutura, configuração,
dependências, documentação ou outras áreas do projeto — sempre que a alteração exija coordenação,
aprovação ou atuação de outro agente ou equipe.

Ela **não** é uma tarefa, uma decisão ou um comentário. É um artefato com ciclo de vida próprio,
responsável próprio, prioridade própria e fluxo de aprovação próprio.

---

## Quando criar

Crie uma Solicitação de Alteração sempre que, durante a execução de uma tarefa, você identificar
que precisa:

- Alterar um **contrato de API** consumido ou produzido por outro agente.
- Alterar o **banco de dados** (tabela, coluna, índice, migração).
- Alterar **arquivos** que pertencem a outro agente ou outro módulo.
- Alterar a **arquitetura** ou decisões arquiteturais vigentes.
- Alterar **configuração** global ou ambiental.
- Alterar **infraestrutura** (deployment, recursos, redes).
- Alterar **documentação** de outra área.
- Alterar **dependências** (bibliotecas, pacotes, versões).
- Produzir impacto em **outra área** do projeto.
- Qualquer mudança que exija **aprovação** de outro agente.

### Quando NÃO criar

- Para mudanças que afetam apenas seus próprios arquivos e não requerem aprovação.
- Para correções de bugs documentadas em tarefas já aprovadas e dentro do escopo seguro.
- Para alterações de documentação que você mesmo mantém e que não impactam outros agentes.

---

## Quem pode criar

**Qualquer agente** do projeto pode criar uma Solicitação de Alteração. O agente que cria é o
**agente solicitante** (`agenteSolicitante`). Ele não precisa ser o responsável pela execução.

### Quem executa

O agente definido em `agenteResponsavel` é o responsável por analisar, executar e validar a
alteração. Se `agenteResponsavel.id` for `null`, a solicitação fica em `PENDENTE` aguardando
atribuição manual.

### Quem aprova

A aprovação é **independente** do agente solicitante e do agente responsável. Pode ser feita por:
- Um agente com permissão `aprovar`.
- Um revisor arquitetural.
- Um orquestrador manual (humano ou agente planejador).

O fluxo de aprovação está **funcional e testado** em produção. Uma solicitação com
`requerAprovacao: true` **não** é automaticamente aprovada. Ela precisa passar pelo estado
`APROVADA` antes da execução.

---

## Como identificar o alvo

O campo `alvo` identifica exatamente o que será afetado:

| Campo           | Descrição                                  | Exemplo                              |
|-----------------|--------------------------------------------|--------------------------------------|
| `tipo`          | Categoria do alvo (enum estendível)        | `CONTRATO_API`, `BANCO_DADOS`, etc.  |
| `nome`          | Nome descritivo                            | `Contrato da API`                    |
| `identificador` | Identificador único dentro do tipo (opt.)  | `contrato-api`                       |
| `localizacao`   | Caminho relativo no repositório (opt.)     | `backend/contratos/api.json`         |

Tipos de alvo suportados:

```
BANCO_DADOS | TABELA | COLUNA | INDICE | CONTRATO_API | ARQUIVO | CLASSE |
METODO | MODULO | COMPONENTE | PROJETO | CONFIGURACAO | DEPENDENCIA |
INFRAESTRUTURA | DOCUMENTACAO | ARQUITETURA
```

---

## Como definir a alteração

O campo `alteracao` descreve o que será feito:

| Campo               | Descrição                              |
|---------------------|----------------------------------------|
| `tipo`              | Tipo de mudança (ADICAO, REMOCAO, etc.)|
| `descricao`         | O quê será alterado                     |
| `motivo`            | Por que é necessário                    |
| `arquivosAfetados`  | Lista de arquivos envolvidos            |

Tipos de alteração:

```
ADICAO | ALTERACAO | REMOCAO | CORRECAO | MIGRACAO | SUBSTITUICAO | REESTRUTURACAO
```

---

## Como definir prioridade

| Valor    | Quando usar                                                  |
|----------|--------------------------------------------------------------|
| `BAIXA`  | Melhoria não urgente, sem impacto em outros agentes.         |
| `MEDIA`  | Melhoria ou correção que pode aguardar uma iteração.         |
| `ALTA`   | Correção ou recurso que impacta outros agentes imediatamente.|
| `CRITICA`| Incidente em produção, segurança ou quebra de contrato.      |

---

## Como definir impactos

Na interface, os impactos são apresentados como **checkboxes**. Selecione um ou mais:

```
BACKEND | FRONTEND | API | BANCO_DADOS |
INFRAESTRUTURA | DOCUMENTACAO | TESTES | ARQUITETURA | CONFIGURACAO
```

---

## Como informar dependências

O campo `dependencias` lista IDs de outras solicitações (`ALT-*`) ou tarefas (`TAR-*`) das quais
esta alteração depende. Útil para orquestradores entenderem a ordem de execução.

Exemplo:

```json
"dependencias": ["TAR-2026-00005"]
```

---

## Como atualizar status

O ciclo de vida segue este fluxo:

```
PENDENTE → EM_ANALISE → AGUARDANDO_APROVACAO → APROVADA → EM_EXECUCAO → AGUARDANDO_VALIDACAO → CONCLUIDA

Transições adicionais e de retorno:
PENDENTE → CANCELADA
EM_ANALISE → PENDENTE, CANCELADA
AGUARDANDO_APROVACAO → EM_ANALISE, REJEITADA
APROVADA → CANCELADA
REJEITADA → PENDENTE (reativação), CANCELADA
EM_EXECUCAO → CANCELADA, BLOQUEADA
AGUARDANDO_VALIDACAO → EM_EXECUCAO, BLOQUEADA
BLOQUEADA → EM_EXECUCAO, CANCELADA
```

Se houver bloqueio:

```
EM_EXECUCAO → BLOQUEADA → EM_EXECUCAO, CANCELADA
```

Transições válidas:

| De                  | Para                                              |
|---------------------|---------------------------------------------------|
| PENDENTE            | EM_ANALISE, CANCELADA                              |
| EM_ANALISE          | AGUARDANDO_APROVACAO, PENDENTE, CANCELADA         |
| AGUARDANDO_APROVACAO| APROVADA, REJEITADA, EM_ANALISE                   |
| APROVADA            | EM_EXECUCAO, CANCELADA                             |
| REJEITADA           | PENDENTE (reativação), CANCELADA                  |
| EM_EXECUCAO          | AGUARDANDO_VALIDACAO, CANCELADA, BLOQUEADA        |
| AGUARDANDO_VALIDACAO| CONCLUIDA, EM_EXECUCAO, BLOQUEADA                 |
| CONCLUIDA           | (nenhuma — terminal)                              |
| CANCELADA           | (nenhuma — terminal)                              |
| BLOQUEADA           | EM_EXECUCAO, CANCELADA                            |

### Aprovação

Para aprovar: `PUT /api/solicitacoes/:id/aprovar` com body `{ agenteId, observacao }`.
Para rejeitar: `PUT /api/solicitacoes/:id/rejeitar` com body `{ agenteId, motivo }`.

---

## Como concluir

Uma solicitação é concluída quando:

1. A alteração foi implementada.
2. A alteração foi validada (testes, contrato compatível, etc.).
3. O status foi atualizado para `CONCLUIDA`.
4. A data `concluidaEm` foi preenchida automaticamente.

---

## Como relacionar com uma tarefa

Use o campo `tarefaOrigem.id` para apontar a tarefa que originou a necessidade. Exemplo:

```json
"tarefaOrigem": { "id": "TAR-2026-00005" }
```

Não duplique informações completas da tarefa dentro da solicitação. Guarde apenas a referência.

Na interface, o campo de Tarefa de Origem é um **seletor** populado com as tarefas existentes
do projeto. Selecione a tarefa na lista ou deixe como "Nenhuma".

---

## Como identificar agentes

Na interface, os campos **Agente Solicitante** e **Agente Responsável** são **seletores**
populados com os agentes disponíveis no projeto atual. O agente solicitante deve selecionar seu
próprio ID. O agente responsável deve selecionar quem executará a alteração, ou deixar como
"Nenhum (aguardando atribuição)" se ainda não foi definido.

Para consultar suas próprias solicitações, use o **filtro de agente** no painel de Solicitações:
1. Digite seu ID de agente (ex: `frontend`).
2. Selecione o tipo de filtro:
   - **Todas** — mostra todas as solicitações.
   - **Sou o Solicitante** — mostra apenas as que você criou.
   - **Sou o Responsável** — mostra apenas as atribuídas a você.

---

## Estrutura de arquivos

Dentro de cada projeto (`.ia/`):

```
.ia/
└── solicitacoes/
    ├── solicitacoes.json           # Registro de todas as solicitações (lista)
    ├── historico-alteracoes.json   # Eventos históricos (criação, alteração, etc.)
    ├── modelo-solicitacao.json     # Modelo vazio para referência
    └── ALT-2026-00001.json         # Arquivo individual por solicitação
    └── ALT-2026-00002.json
```

- `solicitacoes.json` — **estado atual** da lista. Não é um arquivo de log.
- `historico-alteracoes.json` — eventos imutáveis para auditoria e rastreabilidade.
- Cada solicitação também é salva individualmente como `ALT-AAAA-NNNNN.json`.

---

## Eventos de histórico

| Evento                        | Quando ocorre                         |
|-------------------------------|---------------------------------------|
| `SOLICITACAO_CRIADA`          | Ao criar uma nova solicitação         |
| `SOLICITACAO_ALTERADA`        | Ao atualizar dados da solicitação     |
| `SOLICITACAO_EXCLUIDA`        | Ao excluir uma solicitação            |
| `SOLICITACAO_APROVADA`        | Ao aprovar uma solicitação            |
| `SOLICITACAO_REJEITADA`       | Ao rejeitar uma solicitação           |

---

## Fluxo completo

```
AGENTE RECEBE TAREFA
    ↓
IDENTIFICA NECESSIDADE DE ALTERAÇÃO
    ↓
DEFINE ALVO (tipo, nome, identificador, localização)
    ↓
DEFINE ALTERAÇÃO (tipo, descrição, motivo, arquivos afetados)
    ↓
DEFINE IMPACTOS
    ↓
DEFINE DEPENDÊNCIAS
    ↓
DEFINE AGENTE RESPONSÁVEL (ou deixa null → aguarda atribuição)
    ↓
DEFINE PRIORIDADE
    ↓
INFORMAR SE REQUER APROVAÇÃO
    ↓
REGISTRA TAREFA DE ORIGEM
    ↓
CRIA SOLICITAÇÃO DE ALTERAÇÃO (status: PENDENTE)
    ↓
[Se aprovação necessária] → EM_ANALISE → AGUARDANDO_APROVACAO
    ↓
APROVADA
    ↓
EM_EXECUCAO → AGUARDANDO_VALIDACAO → CONCLUIDA
```

---

## API

### Endpoints

| Método  | Endpoint                          | Ação                                      |
|---------|-----------------------------------|-------------------------------------------|
| GET     | `/api/solicitacoes`               | Lista todas as solicitações               |
| GET     | `/api/solicitacoes/:id`           | Obtém uma solicitação pelo ID             |
| GET     | `/api/solicitacoes/:id/historico` | Lista eventos do histórico                |
| POST    | `/api/solicitacoes`               | Cria uma nova solicitação                 |
| PUT     | `/api/solicitacoes/:id`           | Atualiza dados de uma solicitação         |
| PUT     | `/api/solicitacoes/:id/aprovar`   | Aprova uma solicitação                    |
| PUT     | `/api/solicitacoes/:id/rejeitar`  | Rejeita uma solicitação                   |
| DELETE  | `/api/solicitacoes/:id`           | Exclui uma solicitação                    |

---

## Exemplo prático

### Cenário

O agente **Frontend** está executando a tarefa `TAR-2026-00005` (Verificar renderização de
todos os painéis de navegação) e identifica que o contrato de API `contrato-api` não inclui o
campo `status`, e o frontend precisa desse campo para exibir o estado atual de cada painel.

### Passos

1. O agente Frontend cria uma Solicitação de Alteração:
   - Alvo: `CONTRATO_API`, nome: `Contrato da API`, identificador: `contrato-api`
   - Alteração: `ADICAO`, descrição: `Adicionar campo status ao contrato de resposta`
   - Motivo: `O frontend precisa exibir o estado atual do contrato`
   - Impactos: `BACKEND`, `FRONTEND`, `API`
   - Prioridade: `MEDIA`
   - Requer aprovação: `true`
    - Agente responsável: `backend`
   - Tarefa de origem: `TAR-2026-00005`

2. O status fica `PENDENTE` → `EM_ANALISE` → `AGUARDANDO_APROVACAO`

3. O agente **Backend** analisa e aprova a solicitação.

4. O status muda para `APROVADA` → `EM_EXECUCAO`

5. O agente responsável implementa a alteração no contrato.

6. O status muda para `AGUARDANDO_VALIDACAO` → `CONCLUIDA`

---

## Regras de validação

O sistema valida:
- `id` no formato `ALT-AAAA-NNNNN` e único no projeto
- `titulo` obrigatório (não vazio)
- `descricao` obrigatória (não vazia)
- `agenteSolicitante.id` obrigatório (não vazio)
- `agenteResponsavel.id` opcional (`null` permitido)
- `alvo.tipo` obrigatório
- `alteracao.tipo` válido (enum)
- `prioridade` válida (enum)
- `status` válido (enum)
- `impactos` não pode ser vazio
- Aprovação coerente com `requerAprovacao`
- `tarefaOrigem` opcional
- Datas em ISO-8601
- JSON válido

---

## Convenções

- **Nunca** altere contratos, banco de dados, arquitetura ou componentes críticos silenciosamente.
- **Sempre** crie uma Solicitação de Alteração antes de qualquer alteração coordenada.
- **Sempre** aguarde aprovação quando `requerAprovacao` for `true`.
- **Nunca** reutilize IDs de solicitações excluídas.
- **Sempre** registre eventos relevantes no histórico.
