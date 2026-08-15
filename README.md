# AgentMap

> Sistema local de coordenação, memória operacional e rastreabilidade para projetos desenvolvidos por múltiplos agentes de IA.

## Visão geral

O **AgentMap** é um sistema local criado para permitir que múltiplos agentes de Inteligência Artificial trabalhem de forma coordenada sobre o mesmo projeto.

O AgentMap funciona como uma **memória operacional compartilhada e uma camada de coordenação do projeto**, permitindo que os agentes consultem, registrem e atualizem informações estruturadas sobre o trabalho em andamento.

A comunicação operacional não depende de conversas diretas entre agentes.

Cada agente pode consultar o estado do projeto, executar sua tarefa, registrar resultados e deixar informações estruturadas para os próximos agentes.

```text
                    ┌──────────────────────┐
                    │       AGENTMAP       │
                    │                      │
                    │ Projetos             │
                    │ Agentes              │
                    │ Tarefas              │
                    │ Contratos            │
                    │ Decisões             │
                    │ Solicitações         │
                    │ Dependências         │
                    │ Reservas             │
                    │ Bloqueios            │
                    │ Conflitos            │
                    │ Handoffs             │
                    │ Resultados           │
                    │ Validações           │
                    │ Checkpoints          │
                    │ Riscos               │
                    │ Histórico             │
                    └──────────┬───────────┘
                               │
                               ▼
                         ┌───────────┐
                         │    MCP    │
                         └─────┬─────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
          AGENTE A         AGENTE B         AGENTE C
              │                │                │
              └────────────────┼────────────────┘
                               │
                         PROJETO REAL
```

---

# Objetivo

O AgentMap foi desenvolvido para resolver um problema comum em ambientes multiagente:

> Como fazer agentes diferentes trabalharem sobre o mesmo projeto sem perder contexto, decisões, responsabilidades, dependências e histórico?

Para isso, o sistema centraliza as informações operacionais do projeto.

Os agentes podem descobrir:

* quais tarefas possuem;
* quais tarefas estão pendentes;
* quais tarefas foram concluídas;
* quais alterações foram solicitadas;
* quais contratos existem;
* quais decisões foram tomadas;
* quais recursos estão sendo utilizados;
* quais dependências existem;
* quais agentes são responsáveis;
* quais bloqueios existem;
* quais conflitos foram identificados;
* quais resultados foram produzidos;
* quais trabalhos precisam ser validados;
* quais informações foram deixadas por agentes anteriores.

---

# Conceito central

O AgentMap não foi projetado como um simples sistema de mensagens entre agentes.

A comunicação acontece através do **estado estruturado do projeto**.

Em vez de:

```text
Agente A
   │
   │ conversa diretamente
   ▼
Agente B
```

o fluxo é:

```text
Agente A
   │
   ▼
AgentMap
   │
   ▼
Registro estruturado
   │
   ▼
AgentMap
   │
   ▼
Agente B
```

Isso permite que os agentes trabalhem de forma desacoplada.

Um agente pode terminar seu trabalho e outro agente pode continuar posteriormente sem depender da memória da conversa anterior.

---

# Arquitetura

O AgentMap é dividido conceitualmente em três camadas principais:

```text
┌───────────────────────────────────────────────┐
│                  INTERFACE WEB                │
│                                               │
│ Visualização • Monitoramento • Administração  │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                   AGENTMAP                    │
│                                               │
│ Núcleo de coordenação e memória operacional   │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                     MCP                       │
│                                               │
│ Tools • Resources • Prompts • Integração      │
└──────────────────────┬────────────────────────┘
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
          AGENTE     AGENTE     AGENTE
```

O AgentMap permanece como autoridade sobre o estado operacional do projeto.

O MCP funciona como camada de integração entre os agentes e o AgentMap.

A interface Web funciona como camada de visualização, monitoramento e administração.

---

# MCP

O **Model Context Protocol (MCP)** fornece a camada padronizada de comunicação entre os agentes e o AgentMap.

O MCP não funciona como uma segunda fonte de verdade.

O fluxo é:

```text
Agente
   ↓
MCP
   ↓
AgentMap
   ↓
Regras do sistema
   ↓
Dados do projeto
```

Isso permite que diferentes clientes e agentes utilizem o mesmo núcleo operacional.

A arquitetura também permite que novos clientes sejam adicionados futuramente sem alterar a estrutura conceitual do AgentMap.

---

# Agentes

Cada agente possui uma identidade própria dentro do projeto.

Exemplo:

```json
{
	"id": "AGT-BACKEND",
	"nome": "Agente Backend",
	"responsabilidades": [
		"API",
		"Java",
		"Spring",
		"Banco de dados"
	]
}
```

A identidade do agente permite determinar:

* quem executa uma tarefa;
* quem solicitou uma alteração;
* quem é responsável por uma pendência;
* quem produziu determinado resultado;
* quem realizou determinada ação;
* quem deve validar determinado trabalho.

---

# Ciclo operacional do agente

O AgentMap estabelece um fluxo operacional para os agentes.

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

Esse processo permite que cada agente tenha acesso ao contexto necessário antes de modificar o projeto.

---

# Tarefas

As tarefas representam unidades de trabalho do projeto.

Cada tarefa pode possuir:

* identificação;
* título;
* descrição;
* agente responsável;
* prioridade;
* status;
* dependências;
* artefatos;
* critérios de conclusão;
* resultados;
* validação;
* histórico.

As tarefas formam uma das principais estruturas de coordenação entre os agentes.

---

# Solicitações de alteração

O AgentMap possui um sistema estruturado de **Solicitações de Alteração**.

Esse mecanismo permite que um agente registre uma alteração necessária que afete outro agente, domínio ou recurso compartilhado.

Exemplo:

```json
{
	"id": "ALT-2026-00001",
	"titulo": "Adicionar campo status ao contrato",
	"descricao": "O contrato da API precisa disponibilizar o estado atual do contrato.",

	"agenteSolicitante": {
		"id": "AGT-FRONTEND"
	},

	"agenteResponsavel": {
		"id": "AGT-BACKEND"
	},

	"alvo": {
		"tipo": "CONTRATO_API",
		"nome": "Contrato de cliente",
		"identificador": "cliente-resposta"
	},

	"alteracao": {
		"tipo": "ADICAO",
		"descricao": "Adicionar o campo status ao contrato de resposta.",
		"motivo": "O frontend precisa receber o estado atual do contrato.",
		"arquivosAfetados": [
			"ContratoRespostaDTO.java",
			"cliente-resposta.json"
		]
	},

	"impactos": [
		"BACKEND",
		"FRONTEND",
		"API"
	],

	"prioridade": "MEDIA",
	"status": "PENDENTE",
	"requerAprovacao": true,

	"aprovacao": {
		"status": "PENDENTE",
		"agenteId": null,
		"data": null,
		"observacao": null
	}
}
```

O agente responsável consulta as solicitações destinadas a ele durante seu ciclo de trabalho.

Isso evita alterações silenciosas em recursos compartilhados.

---

# Contratos

Contratos representam estruturas compartilhadas entre diferentes partes do sistema.

Exemplos:

* contratos de API;
* DTOs;
* estruturas JSON;
* interfaces;
* eventos;
* modelos compartilhados;
* estruturas de banco;
* integrações.

Antes de alterar um recurso compartilhado, o agente deve verificar o contrato vigente e suas dependências.

---

# Decisões

Decisões importantes do projeto são registradas para evitar que agentes diferentes adotem soluções incompatíveis.

Uma decisão pode registrar:

* identificação;
* contexto;
* problema;
* decisão tomada;
* justificativa;
* impactos;
* agentes envolvidos;
* data;
* status.

Dessa forma, uma decisão importante deixa de depender da memória de uma única sessão de IA.

---

# Dependências

O AgentMap permite registrar dependências entre:

* tarefas;
* agentes;
* módulos;
* contratos;
* recursos;
* etapas de desenvolvimento.

Exemplo:

```text
Tarefa B
   │
   └── depende de ──► Tarefa A
```

Um agente pode verificar suas dependências antes de iniciar uma tarefa.

---

# Reservas

As reservas representam a intenção de um agente trabalhar sobre determinado recurso.

Exemplo:

```text
AGT-BACKEND
     │
     ▼
Reserva
     │
     ▼
Contrato cliente-resposta
```

Outro agente pode consultar a reserva antes de modificar o mesmo recurso.

As reservas são mecanismos de coordenação lógica.

Elas não substituem o Git e não representam bloqueio físico do arquivo.

---

# Bloqueios

Quando um agente não consegue continuar, pode registrar um bloqueio.

Exemplo:

```text
Tarefa:
Implementar integração com API

Bloqueio:
Contrato da API ainda não foi aprovado.

Responsável:
AGT-BACKEND

Impacto:
Implementação não pode ser finalizada.
```

Isso permite que outros agentes descubram por que determinada tarefa não está avançando.

---

# Conflitos

Conflitos podem ocorrer entre:

* agentes;
* tarefas;
* contratos;
* decisões;
* alterações;
* dependências;
* recursos.

O AgentMap registra esses conflitos para torná-los explícitos e rastreáveis.

O sistema não depende de conversas informais para comunicar problemas entre agentes.

---

# Handoffs

O **Handoff** permite transferir contexto operacional de um agente para outro.

Um agente pode registrar:

* trabalho realizado;
* trabalho pendente;
* arquivos modificados;
* decisões tomadas;
* problemas encontrados;
* riscos;
* próximos passos;
* agente recomendado para continuidade.

Assim, outro agente pode assumir o trabalho sem depender da memória do agente anterior.

---

# Resultados

Ao concluir uma tarefa, o agente registra o resultado produzido.

O resultado pode conter:

* descrição;
* arquivos modificados;
* recursos criados;
* decisões tomadas;
* testes realizados;
* limitações;
* pendências;
* observações.

Isso cria rastreabilidade entre tarefa e resultado.

---

# Validação

Uma tarefa concluída não é automaticamente considerada validada.

O fluxo é:

```text
TAREFA
   ↓
CONCLUÍDA
   ↓
VALIDAÇÃO
   ↓
APROVADA
```

ou:

```text
TAREFA
   ↓
CONCLUÍDA
   ↓
VALIDAÇÃO
   ↓
REPROVADA
   ↓
CORREÇÃO
```

Isso permite separar:

* quem implementou;
* quem revisou;
* quem aprovou.

---

# Checkpoints

Checkpoints permitem registrar o estado intermediário de um trabalho.

Eles são especialmente importantes para trabalhos longos ou interrompidos.

Um checkpoint pode registrar:

```text
estado atual
progresso
arquivos alterados
decisões
problemas
próximos passos
```

Isso facilita a recuperação do trabalho.

---

# Riscos

Riscos identificados durante o desenvolvimento podem ser registrados no AgentMap.

Exemplos:

* alteração incompatível;
* dependência externa;
* risco de regressão;
* contrato indefinido;
* conflito arquitetural;
* recurso compartilhado;
* problema de segurança.

O registro permite acompanhar o risco até sua resolução.

---

# Histórico e rastreabilidade

O AgentMap mantém informações necessárias para reconstruir o histórico operacional do projeto.

Quando aplicável, registros podem estar associados a:

```text
projetoId
agenteId
sessaoId
tarefaId
correlationId
requestId
timestamp
```

Isso permite identificar:

* quem realizou uma ação;
* quando realizou;
* em qual contexto;
* sobre qual tarefa;
* qual resultado foi produzido.

---

# Interface Web

O AgentMap possui uma interface Web local para visualizar e administrar o estado do projeto.

A interface permite acompanhar informações como:

* projetos;
* agentes;
* tarefas;
* solicitações;
* contratos;
* decisões;
* dependências;
* reservas;
* bloqueios;
* conflitos;
* handoffs;
* resultados;
* validações;
* checkpoints;
* riscos;
* histórico.

O desenvolvedor pode acompanhar o trabalho dos agentes através do navegador local sem depender da interface do próprio agente.

---

---

# Estrutura de projetos gerenciados

- Pasta base de projetos: `G:\PROJETOS\AgenteMap_Projetos\`
- Cada projeto recebe sua própria pasta com o **mesmo nome do projeto**
- Exemplo: projeto `PAGINA_PESSOAL` → `G:\PROJETOS\AgenteMap_Projetos\PAGINA_PESSOAL`

Cada projeto gerencia uma pasta `.ia/` com contratos, tarefas, decisões, handoffs e demais entidades do AgentMap.

## Regra obrigatória: fluxo e dependências

Novos projetos devem respeitar o fluxo padrão definido em `.ia/fluxo-desenvolvimento.json`.
O planejador deve criar tarefas e dependências explicitamente antes de iniciar implementações.
Agentes devem consultar dependências no início de cada ciclo e só prosseguir quando elas estiverem concluídas.
Sem dependências, tarefas podem executar em paralelo; com dependências, a execução é sequencial.

## Checklist automático de novos projetos

O AgentMap valida automaticamente a estrutura mínima de fluxo ao criar ou abrir um projeto:
- `.ia/fluxo-desenvolvimento.json` obrigatório
- `.ia/fluxo-trabalho.md` obrigatório
- Pastas `.ia/contratos`, `.ia/tarefas`, `.ia/dependencias` obrigatórias
- Pelo menos 1 contrato e 1 tarefa registrados
- Sem dependências circulares

Se o checklist não estiver completo, a criação/abertura do projeto é bloqueada.
Endpoint: `GET /api/projetos/:id/fluxo/checklist`

## Preparação e entrega por agente

Cada agente possui documento de preparação e entrega em `.ia/procedimentos/`:
- `preparacao-<papel>.md` — o que ler e verificar antes de começar
- `entrega-<papel>.md` — o que registrar e entregar depois de terminar

Papéis cobertos:
planejador, backend, banco, frontend, android, infraestrutura, testes, seguranca, revisor, documentacao, observabilidade, desempenho

## Agente Orquestrador

O projeto pode incluir um agente orquestrador em `.ia/agentes/orquestrador/` para automatizar o fluxo de trabalho.

Funções:
- Consultar estado do projeto periodicamente
- Identificar tarefas prontas para execução
- Verificar dependências pendentes
- Criar handoffs e eventos automaticamente
- Enviar prompts para agentes responsáveis
- Registrar bloqueios quando necessário
- Aplicar circuit breaker contra loops infinitos

Estrutura:
- `.ia/agentes/orquestrador/orquestrador-perfil.json`
- `.ia/agentes/orquestrador/habilidades.json`
- `.ia/agentes/orquestrador/instrucoes.md`
- `.ia/agentes/orquestrador/personalidade.md`
- `.ia/agentes/orquestrador/regras.md`
- `.ia/agentes/orquestrador/contexto.md`
- `.ia/agentes/orquestrador/memoria.md`
- `.ia/orquestrador/estado.json`
- `.ia/orquestrador/polling.js`
- `.ia/orquestrador/filewatcher.js`
- `.ia/orquestrador/package.json`
- `.ia/orquestrador/logs.md`

Limites de segurança:
- Máximo de 5 comandos por minuto por agente
- Máximo de 3 tentativas de reenvio por tarefa
- Timeout de 30 minutos por tarefa
- Se loop detectado: pausar por 5 minutos

Como usar:
```bash
cd .ia/orquestrador
npm install
node polling.js
```

## Regra de corporação/equipe

Em projetos com múltiplos agentes:
- O planejador define a ordem e as dependências.
- Cada agente só inicia quando seus pré-requisitos estão prontos.
- O monitoramento é a fonte de verdade para o estado do projeto.
- Bloqueios devem ser registrados no AgentMap, não resolvidos informalmente.
- Handoffs devem ser usados para transferir contexto entre agentes.
- O revisor valida aderência aos contratos antes da documentação final.

---

# Organização do repositório

A organização física pode variar conforme a implementação, mas os principais domínios do AgentMap são representados conceitualmente por:

```text
AgentMap/
│
├── projetos/
├── agentes/
├── tarefas/
├── contratos/
├── decisoes/
├── solicitacoes-alteracao/
├── dependencias/
├── reservas/
├── bloqueios/
├── conflitos/
├── handoffs/
├── resultados/
├── validacoes/
├── checkpoints/
├── riscos/
├── aprendizados/
├── historico/
├── schemas/
├── docs/
├── mcp/
└── web/
```

A estrutura real do repositório deve ser considerada a autoridade.

---

# Integração com Kilo Code

O AgentMap foi projetado para funcionar com agentes utilizados através do Kilo Code e de outros clientes compatíveis com MCP.

O fluxo é:

```text
Kilo Code
    ↓
Agente IA
    ↓
MCP
    ↓
AgentMap
    ↓
Estado do projeto
```

O agente utiliza as ferramentas disponibilizadas pelo MCP para consultar e atualizar o estado operacional.

O AgentMap não depende exclusivamente do Kilo Code.

Outros clientes podem ser integrados posteriormente.

## Configuração do Kilo

O arquivo `kilo.jsonc` define a integração com o MCP do AgentMap.

O campo `data_collection_enabled` controla se dados de uso são coletados pelos provedores. Por padrão, está desabilitado no arquivo `kilo.local.jsonc` (não versionado).

Variáveis de ambiente e configurações locais devem ser definidas em `kilo.local.jsonc`, que é ignorado pelo Git.

---

# Segurança

O sistema foi projetado com segurança desde sua concepção.

Entre os princípios adotados estão:

* validação de entradas;
* controle de permissões;
* isolamento do workspace;
* proteção contra path traversal;
* controle das operações disponíveis;
* validação das operações de escrita;
* logs;
* proteção de informações sensíveis;
* ausência de credenciais diretamente no código;
* controle de acesso às ferramentas MCP;
* princípio do menor privilégio;
* separação entre consulta e alteração;
* prevenção de execução arbitrária de comandos.

O MCP não deve oferecer aos agentes acesso irrestrito ao sistema operacional.

---

# Git

O Git continua sendo responsável pelo controle de versão do código.

O AgentMap não substitui o Git.

A relação entre os dois sistemas é:

```text
Git
│
├── Código
├── Commits
├── Branches
├── Diff
└── Histórico de versões

AgentMap
│
├── Tarefas
├── Agentes
├── Decisões
├── Contratos
├── Solicitações
├── Dependências
├── Bloqueios
├── Handoffs
├── Validações
└── Estado operacional
```

Eles possuem responsabilidades diferentes e complementares.

---

# Princípios arquiteturais

O AgentMap segue os seguintes princípios:

### Uma única fonte de verdade

O estado operacional do projeto pertence ao AgentMap.

### Agentes desacoplados

Agentes não precisam manter comunicação direta entre si.

### Comunicação estruturada

Informações importantes são registradas em estruturas previsíveis.

### Responsabilidades explícitas

Solicitante, responsável e validador podem ser agentes diferentes.

### Rastreabilidade

Operações importantes possuem identificação e contexto.

### Recuperabilidade

O trabalho pode ser retomado por outro agente.

### Segurança

Cada agente deve possuir somente as permissões necessárias.

### Extensibilidade

Novos agentes e clientes podem ser adicionados sem alterar o conceito central.

### Observabilidade

O desenvolvedor deve conseguir acompanhar o estado do projeto.

---

# Estado do projeto

O AgentMap encontra-se em desenvolvimento e possui os mecanismos centrais de coordenação e memória operacional implementados.

As funcionalidades principais incluem:

* gerenciamento de projetos;
* gerenciamento de agentes;
* gerenciamento de tarefas;
* contratos;
* decisões;
* solicitações de alteração;
* dependências;
* reservas;
* bloqueios;
* conflitos;
* handoffs;
* resultados;
* validações;
* checkpoints;
* riscos;
* histórico;
* interface Web;
* integração MCP;
* estrutura para integração com agentes.

A documentação deve sempre acompanhar o estado real da implementação.

---

# Evolução futura

O projeto foi estruturado para permitir futuras extensões sem alterar seu núcleo conceitual.

Possíveis evoluções:

* novos tipos de agentes;
* novos clientes MCP;
* novas ferramentas;
* automação de validações;
* análises de dependências;
* detecção automática de conflitos;
* métricas de produtividade;
* visualizações avançadas;
* auditoria avançada;
* recuperação automática de trabalhos;
* integração com outras IDEs;
* integração com outros orquestradores.

Essas funcionalidades devem ser adicionadas somente quando fizerem sentido para o uso real do projeto.

---

# Filosofia

O AgentMap parte de uma ideia simples:

> Agentes diferentes não precisam conversar para colaborar. Eles precisam compartilhar um estado confiável, estruturado e rastreável do projeto.

Um agente pode iniciar um trabalho.

Outro pode continuar.

Um terceiro pode validar.

Um quarto pode corrigir.

E todos podem utilizar o mesmo contexto operacional registrado no AgentMap.

```text
AGENTE
   │
   ▼
CONSULTA
   │
   ▼
TRABALHA
   │
   ▼
REGISTRA
   │
   ▼
AGENTMAP
   │
   ▼
PRÓXIMO AGENTE
```

O resultado é um ambiente onde o conhecimento operacional deixa de pertencer à memória individual de cada agente e passa a pertencer ao projeto.

---

# Licença

Este projeto é distribuído sob a licença **MIT**.

Consulte o arquivo `LICENSE` para obter o texto completo da licença.

---

# Projeto

**AgentMap**

Sistema local de coordenação, memória operacional e rastreabilidade para desenvolvimento multiagente.

**Licença:** MIT

**Status:** Em desenvolvimento.
