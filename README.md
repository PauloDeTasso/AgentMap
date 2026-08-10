# AgentMap

> Sistema local de coordenação, memória operacional e rastreabilidade para projetos desenvolvidos por múltiplos agentes de IA.

## 📌 Visão geral

O **AgentMap** é um sistema local criado para organizar e coordenar o trabalho de diferentes agentes de Inteligência Artificial que participam do desenvolvimento de um mesmo projeto.

Seu objetivo é evitar que cada agente trabalhe isoladamente, sem conhecer:

* o que os outros agentes estão fazendo;
* quais decisões já foram tomadas;
* quais contratos existem;
* quais tarefas estão pendentes;
* quais alterações foram solicitadas;
* quais recursos estão sendo utilizados;
* quais agentes dependem de outros;
* quais trabalhos foram concluídos;
* quais resultados precisam ser validados;
* quais problemas, bloqueios e conflitos existem.

O AgentMap funciona como uma **memória operacional compartilhada do projeto**.

Os agentes não precisam conversar diretamente entre si.

Eles consultam e atualizam o AgentMap através de um protocolo estruturado.

```text
                    ┌──────────────────────┐
                    │       AGENTMAP       │
                    │                      │
                    │ Memória operacional  │
                    │ Estado do projeto    │
                    │ Coordenação          │
                    │ Protocolos           │
                    │ Histórico            │
                    └──────────┬───────────┘
                               │
                         ┌─────┴─────┐
                         │    MCP    │
                         └─────┬─────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
             KILO CODE      AGENTE A       AGENTE B
                │              │              │
                └──────────────┼──────────────┘
                               │
                         PROJETO REAL
```

---

# 🎯 Objetivo

O objetivo do AgentMap é permitir que múltiplos agentes trabalhem sobre um mesmo projeto de forma:

* organizada;
* rastreável;
* previsível;
* desacoplada;
* segura;
* auditável;
* recuperável;
* extensível.

O sistema deve permitir que um agente seja substituído por outro sem que o conhecimento operacional acumulado seja perdido.

---

# 🧠 Conceito principal

O AgentMap não é um sistema de chat entre agentes.

Ele funciona como uma **camada de coordenação e memória operacional**.

Em vez de:

```text
Agente A
   ↓
"Perguntar" ao Agente B
   ↓
Agente B
```

o fluxo é:

```text
Agente A
   ↓
AgentMap
   ↓
registro estruturado
   ↓
AgentMap
   ↓
Agente B
```

Por exemplo:

```text
Frontend
   │
   │ identifica necessidade
   ▼
Solicitação de Alteração
   │
   ▼
AgentMap
   │
   │ pendência do Backend
   ▼
Backend
   │
   │ consulta
   ▼
AgentMap
   │
   │ executa trabalho
   ▼
Resultado
   │
   ▼
Handoff
   │
   ▼
Frontend
```

---

# 🏗️ Arquitetura

O AgentMap utiliza uma arquitetura baseada em responsabilidades bem definidas.

```text
┌───────────────────────────────────────────────┐
│                  INTERFACE WEB                │
│                                               │
│ Visualização • Monitoramento • Administração  │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                    AGENTMAP                    │
│                                               │
│ Projetos                                      │
│ Agentes                                       │
│ Tarefas                                       │
│ Contratos                                     │
│ Decisões                                      │
│ Solicitações de alteração                     │
│ Dependências                                  │
│ Reservas                                      │
│ Bloqueios                                     │
│ Conflitos                                     │
│ Handoffs                                      │
│ Resultados                                    │
│ Validações                                    │
│ Checkpoints                                   │
│ Riscos                                        │
│ Histórico                                     │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                     MCP                       │
│                                               │
│ Tools • Resources • Prompts                   │
└──────────────────────┬────────────────────────┘
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
          KILO      AGENTE      AGENTE
```

---

# 🔌 MCP

O **Model Context Protocol (MCP)** é utilizado como camada de integração entre os agentes e o AgentMap.

O MCP não possui a responsabilidade de se tornar uma segunda base de dados ou um segundo sistema de coordenação.

A arquitetura é:

```text
Agente
   ↓
MCP
   ↓
Serviços do AgentMap
   ↓
Regras do AgentMap
   ↓
Persistência
```

O AgentMap permanece como autoridade sobre:

* estado;
* tarefas;
* agentes;
* solicitações;
* contratos;
* decisões;
* handoffs;
* validações;
* histórico;
* permissões;
* integridade.

---

# 🤖 Agentes

Cada agente possui uma identidade dentro do projeto.

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

O agente não deve precisar conhecer toda a estrutura física do AgentMap.

Ele descobre suas capacidades através do protocolo.

---

# 🔄 Ciclo de trabalho

Todo agente deve seguir um ciclo operacional.

```text
INICIAR SESSÃO
      ↓
DESCOBRIR AGENTMAP
      ↓
IDENTIFICAR AGENTE
      ↓
CONSULTAR PENDÊNCIAS
      ↓
CONSULTAR TAREFA
      ↓
OBTER CONTEXTO
      ↓
VERIFICAR DEPENDÊNCIAS
      ↓
VERIFICAR BLOQUEIOS
      ↓
VERIFICAR CONFLITOS
      ↓
CONSULTAR CONTRATOS
      ↓
CONSULTAR DECISÕES
      ↓
VERIFICAR ALTERAÇÕES
      ↓
EXECUTAR TRABALHO
      ↓
REGISTRAR RESULTADO
      ↓
REGISTRAR ARTEFATOS
      ↓
CRIAR HANDOFF
      ↓
SOLICITAR VALIDAÇÃO
      ↓
FINALIZAR TRABALHO
      ↓
ENCERRAR SESSÃO
```

---

# 📋 Solicitações de alteração

Uma das funcionalidades centrais do AgentMap é o sistema de **Solicitações de Alteração**.

Ele permite que um agente identifique uma alteração que afeta outro agente ou outro domínio do projeto sem modificar silenciosamente o recurso compartilhado.

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
	"requerAprovacao": true
}
```

Isso permite que o agente responsável encontre a solicitação posteriormente através do AgentMap.

---

# 🔗 Handoffs

O AgentMap possui o conceito de **Handoff** para transferir contexto operacional entre agentes.

Um agente pode terminar sua participação e registrar:

```text
o que foi feito
o que não foi feito
quais arquivos foram alterados
quais decisões foram tomadas
quais riscos existem
quais problemas permanecem
qual agente deve continuar
```

Outro agente pode então assumir o trabalho sem depender da memória do agente anterior.

---

# 🔒 Reservas

Agentes diferentes podem trabalhar simultaneamente.

Para reduzir conflitos, o AgentMap permite registrar reservas lógicas sobre recursos.

Exemplo:

```text
AGT-BACKEND
     │
     ▼
Reserva:
Contrato cliente-resposta
     │
     ▼
AgentMap
```

Outro agente pode consultar a reserva antes de realizar uma alteração.

A reserva não substitui Git e não bloqueia fisicamente arquivos.

Ela representa o estado operacional conhecido pelo AgentMap.

---

# ⚠️ Bloqueios

Quando um agente não consegue continuar, ele pode registrar um bloqueio.

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

Outro agente poderá consultar esse bloqueio e trabalhar para resolvê-lo.

---

# ⚔️ Conflitos

O AgentMap também acompanha conflitos conhecidos entre:

* agentes;
* tarefas;
* contratos;
* decisões;
* alterações;
* dependências;
* recursos.

O objetivo não é resolver automaticamente todos os conflitos.

O objetivo é **torná-los explícitos e rastreáveis**.

---

# 📦 Contratos

Contratos representam interfaces compartilhadas entre partes do sistema.

Exemplos:

```text
API REST
DTO
JSON
eventos
estrutura de banco
interfaces
serviços
integrações
```

Um agente deve consultar o contrato vigente antes de modificar uma parte que dependa dele.

---

# 🧠 Decisões

Decisões arquiteturais importantes ficam registradas no AgentMap.

Exemplo:

```text
DECISÃO-001

Título:
Utilizar JWT com access token e refresh token.

Motivo:
Separação entre autenticação de curta e longa duração.

Impacto:
Backend
Frontend
Segurança
```

Isso evita que agentes diferentes tomem decisões contraditórias.

---

# 🧪 Validação

A conclusão de uma tarefa não significa automaticamente que ela está validada.

Fluxo:

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

Essa separação permite que um agente implemente e outro agente valide.

---

# 💾 Persistência

O AgentMap mantém seus dados operacionais em uma estrutura persistente.

A implementação deve manter uma única fonte oficial dos dados.

O MCP não mantém uma cópia independente do estado.

A interface web também não deve manter uma segunda fonte de verdade.

```text
                    AGENTMAP
                       │
            ┌──────────┼──────────┐
            ▼          ▼          ▼
           WEB        MCP       OUTROS
            │          │
            ▼          ▼
         consulta    agentes
```

---

# 🗂️ Organização conceitual

O projeto deve organizar as informações por domínio.

Exemplo conceitual:

```text
AgentMap/
│
├── projetos/
│
├── agentes/
│
├── tarefas/
│
├── contratos/
│
├── decisoes/
│
├── solicitacoes-alteracao/
│
├── dependencias/
│
├── reservas/
│
├── bloqueios/
│
├── conflitos/
│
├── handoffs/
│
├── resultados/
│
├── validacoes/
│
├── checkpoints/
│
├── riscos/
│
├── aprendizados/
│
├── historico/
│
├── schemas/
│
├── docs/
│
├── mcp/
│
└── web/
```

A estrutura física definitiva pode ser diferente.

O importante é manter a separação conceitual dos domínios.

---

# 👥 Trabalho multiagente

O AgentMap foi projetado para permitir cenários como:

```text
AGT-ARQUITETURA
        │
        ▼
Define arquitetura
        │
        ▼
AGT-BACKEND
        │
        ▼
Implementa API
        │
        ▼
AGT-FRONTEND
        │
        ▼
Implementa interface
        │
        ▼
AGT-TESTES
        │
        ▼
Valida
```

Todos trabalham sobre o mesmo estado operacional.

---

# 🔁 Substituição de agentes

Um dos princípios fundamentais do projeto é permitir substituição de agentes.

Exemplo:

```text
AGT-BACKEND-01
       │
       ▼
   interrompido
       │
       ▼
AGENTMAP
       │
       ▼
AGT-BACKEND-02
       │
       ▼
continua o trabalho
```

O novo agente consulta:

* tarefa;
* contexto;
* checkpoint;
* resultado parcial;
* artefatos;
* bloqueios;
* decisões;
* contratos;
* handoffs.

Ele não depende da memória do agente anterior.

---

# 🔍 Rastreabilidade

Todas as operações importantes devem possuir rastreabilidade.

Quando aplicável:

```text
projetoId
agenteId
sessaoId
tarefaId
correlationId
requestId
timestamp
```

Isso permite reconstruir o histórico operacional do projeto.

---

# 🛡️ Segurança

O AgentMap foi projetado para funcionar localmente e deve seguir princípios de segurança desde o início.

Entre eles:

* validação de entradas;
* controle de permissões;
* isolamento do workspace;
* proteção contra path traversal;
* controle de operações;
* proteção contra alterações arbitrárias;
* logs seguros;
* ausência de credenciais no código;
* controle de acesso às Tools;
* validação de identidade dos agentes.

O MCP não deve oferecer uma Tool genérica para execução irrestrita de comandos do sistema.

---

# 🚫 O que o AgentMap não é

O AgentMap não é:

* um chatbot;
* um sistema de conversa entre agentes;
* uma IDE;
* um substituto do Git;
* um terminal remoto;
* uma IA autônoma única;
* um segundo banco independente do projeto;
* um simples gerenciador de arquivos.

Ele é uma **camada de coordenação e memória operacional para trabalho multiagente**.

---

# 🔌 Kilo Code

O Kilo Code pode atuar como cliente MCP.

Fluxo:

```text
Kilo Code
    │
    ▼
Agente IA
    │
    ▼
MCP
    │
    ▼
AgentMap
```

O agente utiliza as Tools e Resources disponíveis para consultar e registrar informações do projeto.

O Kilo continua sendo responsável pela interação do agente com o ambiente de desenvolvimento.

---

# 🌐 Interface Web

O AgentMap possui uma interface web local para permitir ao desenvolvedor:

* visualizar agentes;
* acompanhar tarefas;
* visualizar solicitações;
* acompanhar handoffs;
* visualizar bloqueios;
* acompanhar conflitos;
* consultar decisões;
* consultar contratos;
* visualizar histórico;
* acompanhar validações;
* editar informações quando autorizado;
* monitorar o projeto em tempo real ou quase real.

A interface web é uma camada de visualização e administração.

Ela não deve possuir uma fonte de verdade independente.

---

# 🧩 Filosofia do projeto

O AgentMap segue alguns princípios fundamentais:

### Uma única fonte de verdade

O estado operacional pertence ao AgentMap.

### Agentes desacoplados

Agentes não precisam conversar diretamente.

### Comunicação estruturada

A comunicação operacional ocorre através de registros estruturados.

### Responsabilidades claras

Quem solicita, executa, aprova e valida pode ser diferente.

### Rastreabilidade

Alterações importantes devem possuir histórico.

### Recuperabilidade

Um agente pode ser substituído sem perder o contexto operacional.

### Segurança

Agentes não recebem autoridade além da necessária.

### Extensibilidade

Novos agentes, IDEs e clientes MCP podem ser adicionados sem reconstruir o núcleo.

---

# 🚧 Estado atual

Projeto em desenvolvimento.

Principais componentes:

```text
[ ] Núcleo AgentMap
[ ] Estrutura de projetos
[ ] Estrutura de agentes
[ ] Tarefas
[ ] Contratos
[ ] Decisões
[x] Solicitações de Alteração
[ ] Dependências
[ ] Reservas
[ ] Bloqueios
[ ] Conflitos
[ ] Handoffs
[ ] Resultados
[ ] Validações
[ ] Checkpoints
[ ] Riscos
[ ] Histórico
[ ] Interface Web
[ ] MCP
[ ] Integração Kilo Code
[ ] Testes multiagente
```

Os itens devem ser atualizados conforme a implementação real.

---

# 🛣️ Roadmap

## Fase 1 — Núcleo

* estrutura do projeto;
* agentes;
* tarefas;
* contratos;
* decisões;
* solicitações de alteração.

## Fase 2 — Coordenação

* dependências;
* reservas;
* bloqueios;
* conflitos;
* handoffs;
* resultados;
* validações.

## Fase 3 — Memória operacional

* checkpoints;
* histórico;
* riscos;
* aprendizados;
* recuperação de sessões.

## Fase 4 — MCP

* servidor MCP;
* Tools;
* Resources;
* Prompts;
* schemas;
* permissões;
* idempotência;
* concorrência.

## Fase 5 — Integração

* Kilo Code;
* primeiro agente real;
* múltiplos agentes;
* testes de comunicação;
* testes de recuperação.

## Fase 6 — Interface

* dashboard;
* monitoramento;
* visualização do fluxo;
* histórico;
* edição;
* acompanhamento de agentes.

---

# 🧪 Critério de sucesso

O AgentMap será considerado funcional quando for possível:

```text
1. cadastrar agentes;
2. atribuir tarefas;
3. iniciar sessões;
4. fornecer contexto aos agentes;
5. permitir que agentes consultem suas pendências;
6. permitir trabalho independente;
7. registrar solicitações de alteração;
8. acompanhar contratos;
9. acompanhar decisões;
10. controlar dependências;
11. registrar reservas;
12. registrar bloqueios;
13. detectar conflitos;
14. criar handoffs;
15. registrar resultados;
16. solicitar validações;
17. recuperar trabalho interrompido;
18. visualizar tudo pela interface web;
19. conectar agentes através do MCP;
20. permitir que outro agente continue um trabalho sem depender da memória do agente anterior.
```

---

# 🔭 Visão futura

A arquitetura foi planejada para permitir a evolução do AgentMap para um ambiente onde diferentes agentes especializados possam trabalhar sobre um mesmo projeto:

```text
             ┌─────────────────┐
             │    AGENTMAP     │
             └────────┬────────┘
                      │
       ┌──────────────┼──────────────┐
       │              │              │
       ▼              ▼              ▼
  Arquitetura      Backend       Frontend
       │              │              │
       └──────────────┼──────────────┘
                      │
                ┌─────▼─────┐
                │   Testes  │
                └─────┬─────┘
                      │
                ┌─────▼─────┐
                │ Validação │
                └───────────┘
```

O objetivo não é criar agentes que simplesmente "conversem".

O objetivo é criar um ambiente no qual agentes diferentes possam **colaborar de maneira coordenada, rastreável, recuperável e previsível**, mesmo quando executados em momentos diferentes ou substituídos durante o desenvolvimento.

---

# 📄 Licença

Definir conforme a estratégia do projeto.

---

# 👤 Projeto

**AgentMap**

Sistema local de coordenação e memória operacional para desenvolvimento multiagente.

Status: **Em desenvolvimento**.
