# Organização do Projeto AgentMap

Este documento organiza o projeto AgentMap por categorias, funções e partes distintas
para facilitar a compreensão da arquitetura, domínios e fluxos.

---

## 1. O que é o AgentMap

Sistema local de coordenação, memória operacional e rastreabilidade para projetos
desenvolvidos por múltiplos agentes de IA.

- **NÃO** executa agentes
- **NÃO** escolhe modelos
- **NÃO** distribui tarefas automaticamente
- Entregua contexto correto e registra o que acontece
- Git é somente leitura (consulta)
- Proteção contra path traversal, validação de JSON, backups automáticos

---

## 2. Arquitetura de Alto Nível

```text
┌───────────────────────────────────────────────┐
│                  INTERFACE WEB                │
│  Visualização • Monitoramento • Administração │
└──────────────────────┬────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│                   AGENTMAP                    │
│     Núcleo de coordenação e memória operacional│
└──────────────────────┬────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│                     MCP                       │
│         Tools • Resources • Prompts           │
└──────────────────────┬────────────────────────┘
                        │
              ┌─────────┼─────────┐
              ▼         ▼         ▼
           AGENTE     AGENTE     AGENTE
```

---

## 3. Estrutura do Repositório (Categorias)

### 3.1 Backend (`backend/`)
Responsável por toda a lógica de servidor, API, MCP e serviços.

```
backend/
├── src/
│   ├── app.ts                     # Criação da app Express
│   ├── index.ts                   # Ponto de entrada do servidor
│   ├── config/                    # Configurações da aplicação
│   ├── api/                       # Rotas HTTP (REST)
│   ├── servicios/                 # Regras de negócio (services)
│   ├── arquivos/                  # Acesso ao sistema de arquivos
│   ├── validacao/                 # Validação de schemas JSON
│   ├── mcp-server/                # Servidor MCP (tools, resources, prompts)
│   ├── websocket/                 # WebSocket para monitoramento
│   ├── seguridad/                 # Validação de paths e auth
│   ├── tipos/                     # Tipos TypeScript compartilhados
│   └── ...
├── package.json
├── tsconfig.json
└── testes/                        # Testes unitários e de integração
```

**Função principal**: Receber requisições HTTP, aplicar regras de negócio, ler/escrever
arquivos do projeto, expor ferramentas MCP e servir o frontend estático.

---

### 3.2 Frontend (`frontend/`)
Interface web local para visualizar e administrar o estado do projeto.

```
frontend/
├── index.html
├── css/
│   ├── style.css
│   └── monitoramento.css
└── js/
    ├── app.js
    ├── api.js
    ├── monitoramento.js
    └── guia-completo-mcp.js
```

**Função principal**: Visualizar projetos, agentes, tarefas, contratos, decisões,
solicitações, dependências, reservas, bloqueios, conflitos, handoffs, resultados,
validações, checkpoints, riscos e histórico.

---

### 3.3 Esquemas JSON (`esquemas/`)
Schemas de validação para todas as entidades do AgentMap.

```
esquemas/
├── projeto.schema.json
├── agente-perfil.schema.json
├── tarefa.schema.json
├── contrato.schema.json
├── solicitacao-alteracao.schema.json
├── dependencia.schema.json
├── decisao.schema.json
├── risco.schema.json
├── resultado.schema.json
├── validacao.schema.json
├── bloqueio.schema.json
├── conflito.schema.json
├── handoff.schema.json
├── reserva.schema.json
├── sessao.schema.json
├── evento.schema.json
├── checkpoint.schema.json
├── artefato.schema.json
├── aprendizado.schema.json
├── criterio-aceitacao.schema.json
├── contato.schema.json
├── responsabilidade.schema.json
├── instancia.schema.json
├── gerenciador.schema.json
├── validacao.schema.json
├── contratos-registry.schema.json
└── agentes-registry.schema.json
```

**Função principal**: Garantir que todos os arquivos JSON do projeto estão bem formados
e seguem a estrutura esperada antes de serem processados.

---

### 3.4 Banco (`banco/`)
PostgreSQL opcional — usado apenas para metadados, índices e relacionamentos.

- Nunca é a fonte de verdade
- O arquivo no sistema de arquivos sempre prevalece
- Usado para acelerar consultas e relacionamentos complexos

---

### 3.5 Documentação e Planejamento
```
PLANO GERAL/
├── GERENCIADOR_LOCAL_DE_AGENTES_DE_IA-ESPECIFICACAO_DE_IMPLEMENTACAO.md
├── MODELOS JSON DO GERENCIADOR LOCAL DE PROJETOS PARA AGENTES.md
├── Gerenciador LOCAL DE PROJETOS PARA AGENTES - IDEIA GERAL AMPLA.md
└── PROPOSTA-FLUXO-NOVOS-PROJETOS.md

documentos/
├── protocolo-agentes.md
└── solicitacao-alteracao-guia.md
```

**Função principal**: Especificação autoritativa, modelos JSON e guias de uso.

---

### 3.6 Scripts (`scripts/`)
Scripts de automação para Windows.

```
scripts/
├── start-agentmap.ps1 / .bat
├── stop-agentmap.ps1 / .bat
├── restart-agentmap.ps1 / .bat
└── create-shortcuts.ps1
```

**Função principal**: Facilitar start/stop/restart do backend no Windows.

---

### 3.7 Governança Interna do AgentMap (`.ia/`)
A própria aplicação AgentMap usa sua própria estrutura `.ia/` para se governar.

```
.ia/
├── configuracao/
│   ├── projeto.json
│   ├── agentes-config.json
│   └── transicoes.json
├── contexto/
│   ├── mapeamento-inicial-agentmap.json
│   ├── mapeamento-tools-agentmap.json
│   ├── mapeamento-transicoes-agentmap.json
│   └── tools-quebradas-agentmap.json
├── docs/
│   ├── runbook.md
│   └── guias/
│       ├── quick-reference.md
│       ├── guia-usuario-monitoramento.md
│       ├── guia-tools-monitoramento.md
│       ├── guia-agentes-monitoramento.md
│       └── guia-novos-agentes-monitoramento.md
└── outbox/
    ├── arquiteto/prompt.md
    └── backend/prompt.md
```

**Função principal**: O AgentMap se auto-gerencia usando seus próprios conceitos.

---

## 4. Domínios e Entidades (O que o sistema gerencia)

Cada entidade representa um conceito do fluxo de trabalho multiagente.

| Categoria | Entidade | Função |
|-----------|----------|--------|
| **Governança** | Projeto | Configuração e escopo do projeto |
| **Governança** | Agente | Perfil, permissões, responsabilidades |
| **Governança** | Sessao | Ciclo de trabalho de um agente |
| **Governança** | Instancia | Execução concreta de um agente |
| **Planejamento** | Tarefa | Unidade de trabalho |
| **Planejamento** | Dependencia | Relacionamento entre tarefas/recursos |
| **Planejamento** | Fluxo | Regras de transição de estados |
| **Planejamento** | Estado | Estado atual do projeto |
| **Contratos** | Contrato | Estruturas compartilhadas (API, DTOs, JSON) |
| **Contratos** | Criterio | Critérios de aceitação |
| **Coordenação** | Handoff | Transferência de contexto entre agentes |
| **Coordenação** | Reserva | Intenção de trabalhar sobre um recurso |
| **Coordenação** | Evento | Eventos assíncronos para coordenação |
| **Controle** | Solicitacao | Alteração necessária em recurso compartilhado |
| **Controle** | Validacao | Aprovação/reprovação de trabalho |
| **Controle** | Bloqueio | Impedimento para continuar |
| **Controle** | Conflito | Conflito entre agentes/recursos |
| **Rastreabilidade** | Resultado | Saída produzida por uma tarefa |
| **Rastreabilidade** | Artefato | Arquivo ou recurso produzido |
| **Rastreabilidade** | Checkpoint | Estado intermediário de trabalho |
| **Rastreabilidade** | Auditoria | Log de operações |
| **Rastreabilidade** | Aprendizado | Conhecimento acumulado |
| **Rastreabilidade** | Risco | Problema potencial |
| **Rastreabilidade** | Decisao | Decisão arquitetural |
| **Rastreabilidade** | Contato | Contatos do projeto |
| **Rastreabilidade** | Responsabilidade | Responsável por algo |
| **Rastreabilidade** | Pendencia | Trabalho pendente |

---

## 5. Backend: Serviços (Regras de Negócio)

Cada entidade geralmente tem um Service correspondente.

```
servicios/
├── ProjetoService.ts             # CRUD de projetos
├── AgenteService.ts              # CRUD de agentes
├── TarefaService.ts              # CRUD de tarefas + state machine
├── StateMachineService.ts        # Transições de estado de tarefas
├── FluxoService.ts               # Validação de fluxo e checklist
├── ContratoService.ts            # CRUD de contratos
├── SolicitacaoService.ts         # Fluxo de aprovação de alterações
├── DependenciaService.ts         # CRUD de dependências
├── DecisaoService.ts             # CRUD de decisões
├── RiscoService.ts               # CRUD de riscos
├── ResultadoService.ts           # CRUD de resultados
├── ValidacaoService.ts           # CRUD de validações
├── HandoffService.ts             # CRUD de handoffs
├── ReservaService.ts             # CRUD de reservas
├── SessaoService.ts              # CRUD de sessões
├── EventoService.ts              # CRUD de eventos
├── CheckpointService.ts          # CRUD de checkpoints
├── BloqueioService.ts            # CRUD de bloqueios
├── ConflitoService.ts            # CRUD de conflitos
├── ArtefatoService.ts            # CRUD de artefatos
├── AprendizadoService.ts         # CRUD de aprendizados
├── AuditoriaService.ts           # Log de auditoria
├── BackupService.ts              # Backups automáticos
├── IntegridadeService.ts         # Verificação de integridade
├── ContatoService.ts             # CRUD de contatos
├── ResponsabilidadeService.ts    # CRUD de responsabilidades
├── InstanciaService.ts           # Instâncias de agentes
├── CriterioService.ts            # CRUD de critérios de aceitação
├── ValidacaoService.ts           # (já listado)
├── MonitoramentoService.ts       # Agregação para dashboard
├── KiloDispatcherService.ts      # Integração com Kilo Code
├── KiloAgentGeneratorService.ts  # Geração de agentes
├── CorsService.ts                # Configuração de CORS
├── DaemonManager.ts              # Gerenciamento de daemons
├── ExecutorKiloDaemon.ts         # Execução de daemons Kilo
└── OrquestradorService.ts        # Lógica do orquestrador
```

---

## 6. Backend: APIs HTTP (Rotas REST)

Cada módulo exporta um router com endpoints CRUD + operações específicas.

```
api/
├── index.ts                      # Agrupamento de todas as rotas
├── projetos.ts                   # /api/projetos
├── agentes.ts                    # /api/agentes
├── tarefas.ts                    # /api/tarefas
├── arquivos.ts                   # /api/arquivos
├── contratos.ts                  # /api/contratos
├── contratos-validacao.ts        # /api/contratos (validação)
├── solicitacoes.ts               # /api/solicitacoes
├── criterios.ts                  # /api/criterios
├── resultados.ts                 # /api/resultados
├── artefatos.ts                  # /api/artefatos
├── handoffs.ts                   # /api/handoffs
├── handoffs-centrais.ts          # /api/handoffs-centrais
├── pendencias.ts                 # /api/pendencias
├── validacoes.ts                 # /api/validacoes
├── conflitos.ts                  # /api/conflitos
├── reservas.ts                   # /api/reservas
├── sessoes.ts                    # /api/sessoes
├── checkpoints.ts                # /api/checkpoints
├── aprendizados.ts               # /api/aprendizados
├── dependencias.ts               # /api/dependencias
├── responsabilidades.ts          # /api/responsabilidades
├── decisoes.ts                   # /api/decisoes
├── riscos.ts                     # /api/riscos
├── bloqueios.ts                  # /api/bloqueios
├── eventos.ts                    # /api/eventos
├── contatos.ts                   # /api/contatos
├── admin.ts                      # /api/admin
├── health.ts                     # /api/health
├── monitoramento.ts              # /api/monitoramento
├── instancias.ts                 # /api/instancias
├── orquestrador.ts               # /api/orquestrador
└── middleware.ts                 # Middlewares (project, async, responder)
```

**Função principal**: Receber requisições HTTP, validar entrada, chamar services,
retornar JSON padronizado.

---

## 7. Backend: MCP Server

Servidor MCP que expõe tools, resources e prompts para agentes de IA.

```
mcp-server/
├── index.ts                      # Ponto de entrada (stdio transport)
├── server.ts                     # Configuração do McpServer
├── contexto.ts                   # Contexto do projeto para tools
├── tools/
│   ├── index.ts                  # Registro de todas as tools
│   ├── agentes.ts
│   ├── arquivos.ts
│   ├── artefatos.ts
│   ├── auditoria.ts
│   ├── aprendizados.ts
│   ├── bloqueios.ts
│   ├── buscarConhecimento.ts
│   ├── buscarReferencias.ts
│   ├── buscarSimbolo.ts
│   ├── checkpoints.ts
│   ├── contratos.ts
│   ├── contatos.ts
│   ├── criterios.ts
│   ├── decisoes.ts
│   ├── dependencias.ts
│   ├── eventos.ts
│   ├── handoffs.ts
│   ├── instancias.ts
│   ├── lerTrechoArquivo.ts
│   ├── obterAgente.ts
│   ├── obterArquitetura.ts
│   ├── obterContextoProjeto.ts
│   ├── obterContextoTarefa.ts
│   ├── orquestrador.ts
│   ├── pendencias.ts
│   ├── projeto.ts
│   ├── recomendarAgente.ts
│   ├── reservas.ts
│   ├── responsabilidades.ts
│   ├── resultados.ts
│   ├── riscos.ts
│   ├── sessoes.ts
│   ├── solicitacoes.ts
│   ├── tarefas.ts
│   ├── validacoes.ts
│   └── workflows.ts
├── resources/                    # Recursos MCP (dados expostos)
├── prompts/                      # Prompts MCP
├── security/
│   ├── projectAuth.ts            # Autenticação de projeto
│   └── pathValidator.ts          # Proteção contra path traversal
├── utils/
│   ├── search.ts                 # Busca em código
│   └── helpers.ts                # Helpers gerais
├── audit/
│   └── auditoria.ts              # Auditoria MCP
├── mapper/
│   └── mapeadores.ts             # Mapeamento de tipos
└── erros/
    └── mcp-erros.ts              # Erros customizados MCP
```

**Função principal**: Permitir que agentes de IA consultem e atualizem o estado do
projeto através do protocolo MCP padronizado.

---

## 8. Backend: Acesso a Arquivos

```
arquivos/
├── FileService.ts                 # Leitura/escrita de arquivos do projeto
├── ScaffoldService.ts             # Criação da estrutura inicial de pastas
├── IdGenerator.ts                 # Geração de IDs padronizados
└── templates/
    ├── tarefas.ts                 # Templates de arquivos de tarefa
    └── governanca.ts              # Templates de arquivos de governança
```

**Função principal**: Todo acesso ao sistema de arquivos é centralizado aqui.
Garante path traversal protection, formatação correta e templates consistentes.

---

## 9. Backend: Validação

```
validacao/
└── SchemaValidator.ts             # Validação de JSON contra schemas
```

**Função principal**: Validar todos os arquivos JSON do projeto antes de processá-los.

---

## 10. Backend: Segurança

```
seguridad/
└── paths.ts                       # Validação de paths, bloqueio de traversal
```

**Função principal**: Garantir que nenhuma operação acesse pastas fora do projeto.

---

## 11. Backend: WebSocket

```
websocket/
└── monitoramento.ts               # WebSocket para atualizações em tempo real
```

**Função principal**: Enviar atualizações do estado do projeto para o frontend em tempo real.

---

## 12. Frontend: Funcionalidades

- **app.js**: Lógica principal da SPA
- **api.js**: Cliente HTTP para consumir a API do backend
- **monitoramento.js**: Dashboard de monitoramento em tempo real
- **guia-completo-mcp.js**: Guia interativo das tools MCP

---

## 13. Estrutura de um Projeto Gerenciado

Cada projeto aberto no AgentMap possui uma pasta `.ia/`:

```
<NOME_DO_PROJETO>/
├── .ia/
│   ├── configuracao/
│   │   ├── projeto.json          # Configuração do projeto
│   │   ├── agentes-config.json   # Configuração de agentes
│   │   └── transicoes.json       # Transições de estado permitidas
│   ├── contratos/                # Contratos versionados (JSON/MD)
│   ├── tarefas/                  # Tarefas (JSON)
│   ├── dependencias/             # Dependências (JSON)
│   ├── decisoes/                 # Decisões arquiteturais (JSON)
│   ├── handoffs/                 # Handoffs (JSON)
│   ├── resultados/               # Resultados (JSON)
│   ├── validacoes/               # Validações (JSON)
│   ├── bloqueios/                # Bloqueios (JSON)
│   ├── conflitos/                # Conflitos (JSON)
│   ├── reservas/                 # Reservas (JSON)
│   ├── sessoes/                  # Sessões de trabalho (JSON)
│   ├── eventos/                  # Eventos (JSON)
│   ├── checkpoints/              # Checkpoints (JSON)
│   ├── riscos/                   # Riscos (JSON)
│   ├── aprendizados/             # Aprendizados (JSON)
│   ├── criterios/                # Critérios de aceitação (JSON)
│   ├── contatos/                 # Contatos (JSON)
│   ├── responsabilidades/        # Responsabilidades (JSON)
│   ├── artefatos/                # Artefatos (JSON)
│   ├── solicitacoes/             # Solicitações de alteração (JSON)
│   ├── conhecimento/             # Base de conhecimento (MD)
│   ├── procedimentos/            # Procedimentos por papel (MD)
│   ├── agentes/                  # Perfis de agentes (JSON/MD)
│   ├── fluxo-desenvolvimento.json # Fluxo obrigatório
│   ├── fluxo-trabalho.md         # Fluxo obrigatório
│   ├── estado/
│   │   └── estado-atual.json     # Estado consolidado
│   └── orquestrador/             # Opcional: automação
│       ├── estado.json
│       ├── polling.js
│       ├── filewatcher.js
│       ├── package.json
│       └── logs.md
└── [código fonte do projeto real...]
```

---

## 14. Ciclo Operacional de um Agente

```text
INICIAR
   ↓
IDENTIFICAR AGENTE
   ↓
CONSULTAR CONTEXTO
   ↓
CONSULTAR TAREFAS
   ↓
CONSULTAR SOLICITAÇÕES
   ↓
CONSULTAR CONTRATOS
   ↓
CONSULTAR DECISÕES
   ↓
VERIFICAR DEPENDÊNCIAS
   ↓
VERIFICAR BLOQUEIOS
   ↓
VERIFICAR CONFLITOS
   ↓
VERIFICAR RESERVAS
   ↓
EXECUTAR TRABALHO
   ↓
REGISTRAR RESULTADOS
   ↓
REGISTRAR ARTEFATOS
   ↓
CRIAR HANDOFF
   ↓
SOLICITAR VALIDAÇÃO
   ↓
FINALIZAR
```

---

## 15. Fluxo de Dados Principal

```text
Agente IA
   ↓ (MCP)
AgentMap Backend
   ↓ (FileService)
Arquivos JSON/MD no sistema de arquivos
   ↓ (SchemaValidator)
Validação de estrutura
   ↓ (Serviços)
Regras de negócio
   ↓ (API HTTP / MCP)
Frontend / Outros Agentes
```

---

## 16. Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Backend | Node.js + TypeScript + Express |
| Frontend | HTML5 + CSS3 + JavaScript (vanilla ES modules) |
| Banco | PostgreSQL (opcional, metadados) |
| Dados | Arquivos reais (JSON, Markdown, TXT, YAML, XML, CSV) |
| Integração | MCP (Model Context Protocol) |
| Controle de versão | Git (somente leitura) |
| Validação | JSON Schema (ajv) |
| Testes | Jest |
| WebSocket | ws |

---

## 17. Porta e Execução

- **Porta**: `3150`
- **Start**: `cd backend && npm run dev`
- **URL**: `http://localhost:3150`
- **MCP**: `cd backend && npm run mcp`

---

## 18. Regras de Governança

1. **Arquivo é a informação principal** — PostgreSQL é apenas índice
2. **Git é somente leitura** — o AgentMap não modifica código, apenas registra estado
3. **Path traversal protection** — todas as operações de arquivo são validadas
4. **Validação de JSON** — todos os arquivos estruturados passam por schema
5. **Backups automáticos** — antes de alterações críticas
6. **Checklist de fluxo** — projetos novos são bloqueados se estrutura mínima faltar
7. **Handoffs obrigatórios** — contexto sempre é transferido formalmente
8. **Solicitações de alteração** — alterações em recursos compartilhados precisam de aprovação
9. **Eventos assíncronos** — coordenação entre agentes via eventos, não conversas diretas

---

## 19. Orquestrador (Opcional)

Pode ser incluído em `.ia/orquestrador/` para automatizar fluxos:

- Polling periódico do estado
- Identificação de tarefas prontas
- Criação automática de handoffs
- Envio de prompts para agentes
- Circuit breaker contra loops
- Limites: 5 comandos/min, 3 reenvios, 30min timeout

---

## 20. Como os Agentes Usam o AgentMap

Agentes de IA (como os do Kilo Code) usam as **tools MCP** para interagir:

```json
// Exemplo: consultar contexto do projeto
{
  "name": "agentmap_obter_contexto_projeto",
  "arguments": { "projetoId": "PROJ-001" }
}

// Exemplo: criar tarefa
{
  "name": "agentmap_tarefas_criar",
  "arguments": {
    "dados": {
      "titulo": "Implementar X",
      "descricao": "...",
      "agenteId": "AGT-BACKEND"
    }
  }
}
```

O agente **não acessa arquivos diretamente** — usa tools MCP que abstraem a camada de arquivos.
