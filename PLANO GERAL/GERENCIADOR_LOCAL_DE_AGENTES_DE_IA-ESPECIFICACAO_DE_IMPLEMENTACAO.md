# GERENCIADOR LOCAL DE PROJETOS PARA AGENTES DE IA
## Especificação de Implementação — Documento para o Agente Arquiteto

> Este documento é a especificação completa para que um agente de IA, atuando como **Arquiteto responsável**, projete e implemente o sistema descrito. Ele consolida três fontes: a ideia original do **AgentMap** (organizador de arquivos), a visão ampla do **Gerenciador Local de Projetos para Agentes de IA** (governança) e os **Modelos JSON** que formalizam os dados. O Arquiteto deve tratar este documento como o **contrato-mãe** do projeto: nenhuma decisão de implementação deve contradizê-lo sem registrar uma decisão arquitetural (ADR) explicando o motivo.

---

# 1. VISÃO GERAL

O sistema a ser construído é um **Gerenciador Local de Projetos para Agentes de IA**, rodando **exclusivamente na máquina local (Windows 11)** de um único usuário (o Proprietário do Produto).

Ele nasce da fusão de duas ideias complementares:

- **AgentMap** — a camada prática e simples: organizar, em arquivos reais e legíveis (Markdown, JSON, TXT, YAML, XML, CSV), tudo o que cada agente de IA precisa saber sobre cada projeto (instruções, personalidade, habilidades, regras, contratos, contexto, memória).
- **Gerenciador Local** — a camada de governança: transformar esse conjunto de arquivos em um sistema real de organização de trabalho, com contratos versionados, tarefas estruturadas, permissões, domínios de arquivo, controle de dependências e conflitos, Git, auditoria e aprovação humana.

O princípio fundamental que une as duas ideias:

```text
GERENCIADOR
      ↓
CONTRATOS
      ↓
TAREFA
      ↓
CONTEXTO
      ↓
AGENTE
      ↓
IMPLEMENTAÇÃO
      ↓
TESTES
      ↓
REVISÃO
      ↓
APROVAÇÃO
      ↓
GIT
      ↓
NOVO ESTADO
```

- O **gerenciador** organiza.
- O **agente** executa.
- O **Git** registra.
- Os **testes** verificam.
- A **revisão** valida.
- O **ser humano** decide sobre mudanças críticas.

**O sistema NÃO é um orquestrador automático de agentes.** Ele não executa agentes, não decide quem trabalha, não distribui tarefas automaticamente e não roda LLMs. Todo o trabalho de execução continua manual, através das ferramentas que o Proprietário já usa (VS Code, Kilo Code, Android Studio, etc.). O gerenciador entrega ao agente um **pacote de contexto correto** e registra o que aconteceu depois.

---

# 2. ESCOPO E NÃO-ESCOPO

## 2.1 Dentro do escopo

- Aplicação local para Windows 11 (sem servidor remoto, sem multiusuário).
- Gestão de múltiplos **projetos**, cada um com sua própria pasta `.ia/`.
- Gestão de múltiplos **agentes** por projeto (perfis reutilizáveis entre projetos).
- Gestão de **contratos**, **tarefas**, **contexto**, **decisões arquiteturais**, **riscos**, **problemas conhecidos**, **base de conhecimento**, **procedimentos**, **permissões**, **ferramentas**, **qualidade/testes**, **Git** (leitura de estado) e **auditoria**.
- Interface local (HTML/CSS/JS) servida pelo próprio backend.
- Backend Node.js + TypeScript expondo uma API HTTP local.
- PostgreSQL local para metadados, relacionamentos e índices — nunca como única fonte de verdade.

## 2.2 Fora do escopo (explicitamente)

O gerenciador **não deve**:

- executar agentes de IA automaticamente;
- criar agentes automaticamente;
- escolher ou hospedar modelos de IA;
- decidir sozinho qual agente deve trabalhar em qual tarefa;
- distribuir tarefas automaticamente entre agentes;
- criar workflows totalmente automáticos sem checkpoint humano;
- criar filas de mensagens ou arquitetura distribuída/microsserviços;
- coordenar agentes em tempo real (conversas entre agentes);
- hospedar ou executar LLMs;
- virar um serviço online, multiusuário ou SaaS;
- escalar horizontalmente ou virar plataforma comercial;
- permitir que qualquer agente execute comandos arbitrários no computador sem autorização explícita.

Essas responsabilidades pertencem às ferramentas que efetivamente executam os agentes (IDE, extensão, terminal), não ao gerenciador.

---

# 3. STACK TECNOLÓGICA

```text
Frontend:  HTML5 + CSS3 + JavaScript (sem framework obrigatório na v1)
Backend:   Node.js + TypeScript
Banco:     PostgreSQL (auxiliar — metadados, não conteúdo)
Dados:     Arquivos reais no sistema de arquivos (Markdown, JSON, TXT, YAML, XML, CSV)
Controle:  Git (o próprio Git do sistema operacional; o gerenciador só lê/consulta)
Execução:  100% local, sem infraestrutura de nuvem
```

Justificativa: o objetivo é uso pessoal, simplicidade e manutenção fácil. Não há necessidade de frameworks pesados de frontend nem de arquitetura distribuída no backend.

---

# 4. PRINCÍPIO DE DADOS: "O ARQUIVO É A INFORMAÇÃO PRINCIPAL"

Esta é a regra mais importante herdada do AgentMap e deve orientar toda decisão técnica do Arquiteto:

> O gerenciador deve trabalhar **principalmente com arquivos reais** no sistema de arquivos — o Proprietário deve poder abrir a pasta no Windows Explorer e enxergar exatamente o que o sistema está usando.

```text
                 GERENCIADOR
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
      PostgreSQL            Sistema de arquivos
          │                       │
      metadados               documentos (.md)
      referências             configuração (.json)
      relacionamentos         conhecimento
      caminhos das pastas     contratos
      categorias              tarefas
      identificadores         decisões
      versões (índice)        riscos / problemas
```

Regras derivadas:

- Nenhuma informação de conteúdo (instruções, contratos, tarefas, decisões, etc.) deve existir **apenas** no PostgreSQL. O arquivo `.json`/`.md` é sempre a fonte de verdade; o banco indexa e relaciona.
- Se, durante a implementação, o Arquiteto perceber que determinada informação não precisa do PostgreSQL, ela pode permanecer só como arquivo.
- O backend deve preservar os arquivos originais e seus formatos — nunca forçar tudo para um único formato.
- Cada tipo de dado usa o formato mais adequado ao seu propósito:

| Formato | Uso preferencial |
|---|---|
| **JSON** | Informações estruturadas: configuração, habilidades, contratos, perfis de agente, tarefas |
| **Markdown** | Informações para leitura humana e por agentes: instruções, personalidade, regras, contexto, memória, documentação |
| **TXT / YAML / XML / CSV** | Quando necessário, preservando formatos originais importados |

---

# 5. ESTRUTURA DO REPOSITÓRIO DO GERENCIADOR (o próprio produto)

```text
GerenciadorAgentes/
│
├── backend/
│   ├── src/
│   │   ├── api/              # rotas HTTP
│   │   ├── servicos/         # regras de negócio
│   │   ├── arquivos/         # acesso ao sistema de arquivos
│   │   ├── banco/            # acesso ao PostgreSQL
│   │   ├── validacao/        # validação de entrada, JSON, caminhos
│   │   ├── seguranca/        # path traversal, sanitização, auditoria
│   │   └── tipos/            # tipos TypeScript compartilhados
│   ├── testes/
│   └── package.json
│
├── frontend/
│   ├── css/
│   ├── js/
│   ├── ativos/
│   └── index.html
│
├── banco/
│   ├── migracoes/
│   └── dados-iniciais/
│
├── esquemas/                 # JSON Schemas de validação (ver seção 10)
├── documentos/
├── exemplos/
├── scripts/
│
├── .editorconfig
├── .gitignore
├── CONTRIBUTING.md
├── LICENSE
└── SECURITY.md
```

---

# 6. ESTRUTURA DE UM PROJETO GERENCIADO

Cada projeto gerenciado (ex.: `PauloConsorcio`) recebe uma pasta `.ia/` na sua raiz. Esta é a estrutura **definitiva** que o Arquiteto deve implementar, unindo a proposta simplificada do AgentMap com a proposta completa do Gerenciador Local:

```text
projeto/
│
├── .ia/
│   │
│   ├── configuracao/
│   │   ├── projeto.json
│   │   ├── ambiente.json
│   │   └── gerenciador.json
│   │
│   ├── agentes/
│   │   ├── agentes.json              # registro central
│   │   ├── planejador/
│   │   │   ├── planejador.json       # perfil estruturado
│   │   │   ├── instrucoes.md
│   │   │   ├── personalidade.md
│   │   │   ├── habilidades.json
│   │   │   ├── regras.md
│   │   │   ├── contexto.md
│   │   │   ├── memoria.md
│   │   │   ├── conhecimento/
│   │   │   └── recursos/
│   │   ├── frontend/   (mesmo padrão de arquivos)
│   │   ├── backend/    (mesmo padrão de arquivos)
│   │   ├── banco/
│   │   ├── android/
│   │   ├── infraestrutura/
│   │   ├── testes/
│   │   ├── seguranca/
│   │   ├── revisor/
│   │   ├── documentacao/
│   │   ├── observabilidade/
│   │   └── desempenho/
│   │
│   ├── contratos/
│   │   ├── contratos.json
│   │   ├── contrato-projeto.json
│   │   ├── contrato-arquitetura.json
│   │   ├── contrato-api.json
│   │   ├── contrato-banco.json
│   │   ├── contrato-frontend.json
│   │   ├── contrato-android.json
│   │   ├── contrato-seguranca.json
│   │   ├── contrato-infraestrutura.json
│   │   ├── contrato-testes.json
│   │   ├── contrato-documentacao.json
│   │   └── contrato-interface.json
│   │
│   ├── tarefas/
│   │   ├── tarefas.json
│   │   ├── modelos/
│   │   │   └── modelo-tarefa.json
│   │   └── rascunho/ planejadas/ prontas/ execucao/ testes/ revisao/
│   │       aprovacao/ bloqueadas/ concluidas/   (subpastas por estado, opcional)
│   │
│   ├── estado/
│   │   ├── estado-atual.json
│   │   ├── progresso.json
│   │   └── bloqueios.json
│   │
│   ├── decisoes/
│   │   └── decisoes.json             # + DECISAO-000N.md individuais, se desejado
│   │
│   ├── riscos/
│   │   └── riscos.json
│   │
│   ├── problemas/
│   │   └── problemas.json
│   │
│   ├── conhecimento/
│   │   └── conhecimento.json
│   │
│   ├── procedimentos/
│   │   ├── procedimentos.json
│   │   ├── CRIAR_TAREFA.md
│   │   ├── IMPLEMENTAR_TAREFA.md
│   │   ├── REVISAR_CODIGO.md
│   │   ├── EXECUTAR_TESTES.md
│   │   ├── CRIAR_MIGRACAO.md
│   │   ├── ALTERAR_API.md
│   │   ├── IMPLANTAR.md
│   │   └── REVERTER_IMPLANTACAO.md
│   │
│   ├── permissoes/
│   │   ├── permissoes.json
│   │   └── ferramentas.json
│   │
│   ├── contexto/
│   │   └── contextos.json
│   │
│   ├── qualidade/
│   │   ├── criterios.json
│   │   ├── testes.json
│   │   └── revisoes.json
│   │
│   ├── git/
│   │   └── estado-git.json
│   │
│   ├── politicas/
│   │   ├── politicas.json
│   │   ├── POLITICA_SEGURANCA.md
│   │   ├── POLITICA_GIT.md
│   │   ├── POLITICA_QUALIDADE.md
│   │   ├── POLITICA_PERMISSOES.md
│   │   └── POLITICA_MUDANCAS.md
│   │
│   └── auditoria/
│       └── eventos.json
│
├── frontend/
├── backend/
├── android/
├── banco/
├── infraestrutura/
├── implantacao/
├── testes/
└── docs/
```

Observação para o Arquiteto: os arquivos `.md` (instruções, personalidade, regras, contexto, memória) e os arquivos `.json` (habilidades, perfil estruturado, contratos, tarefas) **coexistem por design** — o `.md` é para leitura/cópia direta em configurações de agente; o `.json` é para o gerenciador indexar, validar e montar telas/contexto.

---

# 7. HIERARQUIA ORGANIZACIONAL DE AGENTES

```text
                         PROPRIETÁRIO DO PRODUTO
                                  │
                                  ▼
                       PLANEJADOR / ARQUITETO
                                  │
               ┌──────────────────┼──────────────────┐
               ▼                  ▼                  ▼
           FRONTEND            BACKEND             ANDROID
               │                  │                  │
               └──────────────────┼──────────────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             ▼                    ▼                    ▼
           BANCO                TESTES              DEVOPS
             │                    │                    │
             └────────────────────┼────────────────────┘
                                  ▼
                              SEGURANÇA
                                  │
                                  ▼
                               REVISÃO
                                  │
                                  ▼
                           DOCUMENTAÇÃO
```

Não é necessário um modelo de IA diferente por papel: **o mesmo agente pode assumir funções diferentes** através da combinação de:

```text
PERFIL + CONTRATO + PERMISSÕES + CONTEXTO + FERRAMENTAS + TAREFA
```

## 7.1 Conjunto inicial de agentes (v1)

```text
01. Planejador / Arquiteto
02. Frontend
03. Backend
04. Banco de Dados
05. Android
06. Infraestrutura
07. Qualidade e Testes
08. Segurança
09. Revisor de Código
10. Documentação
```

## 7.2 Evolução posterior

```text
11. Observabilidade
12. Desempenho
13. Automação de Testes
```

## 7.3 Proprietário do Produto (autoridade humana — não é um agente)

**Responsabilidades:** definir objetivos e prioridades; aprovar requisitos; aprovar mudanças importantes, arquiteturais e de segurança crítica; resolver conflitos de requisitos; aceitar ou rejeitar entregas; autorizar exceções.

**Regra:** nenhum agente pode assumir autoridade humana em decisões críticas.

## 7.4 Planejador / Arquiteto

Transforma necessidades em engenharia executável.

- **Responsabilidades:** analisar requisitos; identificar ambiguidades; decompor funcionalidades; definir arquitetura; identificar dependências; criar tarefas; definir ordem de execução e critérios de aceitação; identificar riscos; propor contratos; criar ADRs; planejar testes, segurança e implantação.
- **Produções:** plano, roteiro, tarefas, dependências, contratos, decisões arquiteturais, critérios de aceitação, riscos, plano de testes, plano de implantação.
- **Não deve:** inventar requisitos; alterar arquitetura sem aprovação; executar fora de sua responsabilidade; ignorar restrições existentes.
- **Diretórios permitidos:** `/.ia/**`, `/docs/arquitetura/**`. **Proibidos:** `/frontend/**`, `/backend/**`, `/android/**`, `/infraestrutura/**`.

## 7.5 Frontend

- **Ambiente:** VS Code, Kilo Code. **Domínio:** `/frontend/**`.
- **Conhecimentos:** HTML5, CSS3, JavaScript, DOM, Fetch, JSON, acessibilidade, responsividade, UX, validação, tratamento de erros, autenticação/autorização, integração com API, segurança no navegador (XSS, CSRF), armazenamento seguro, desempenho.
- **Contratos obrigatórios:** projeto, frontend, API, segurança, interface.
- **Não pode alterar sem autorização:** `/backend/**`, `/android/**`, `/infraestrutura/**`.

## 7.6 Backend

- **Ambiente:** VS Code, Kilo Code. **Domínio:** `/backend/**`.
- **Conhecimentos:** Java 17+, Spring Boot, Spring Security, Spring Data JPA, Hibernate, API REST, JSON, DTOs, validação, PostgreSQL, migrações, JWT, controle de acesso, BCrypt, tratamento de exceções, registros, testes, rate limiting, CORS, segurança, observabilidade.
- **Arquitetura:** DDD, Arquitetura Limpa, Arquitetura em Camadas, SOLID, GRASP, padrões de projeto, baixo acoplamento, alta coesão.
- **Contratos obrigatórios:** projeto, arquitetura, API, banco, segurança.

## 7.7 Banco de Dados

Pode inicialmente ser responsabilidade do agente de backend; pode ser separado depois.

- **Domínio:** `/banco/**`.
- **Conhecimentos:** PostgreSQL, modelagem, normalização, índices, chaves, restrições, relacionamentos, transações, concorrência, desempenho, migrações, integridade, recuperação, segurança.
- **Regra fundamental:** nenhuma alteração estrutural direto em produção. Fluxo obrigatório:

```text
ALTERAÇÃO → MIGRAÇÃO → TESTE → REVISÃO → APROVAÇÃO → PRODUÇÃO
```

## 7.8 Android

- **Ambiente:** Android Studio, Kilo Code. **Domínio:** `/android/**`.
- **Conhecimentos:** Kotlin, Android, Gradle, componentes/ciclo de vida, corrotinas, HTTP, JSON, API REST, autenticação, armazenamento seguro, permissões, câmera, arquivos, notificações, testes, desempenho, compatibilidade.
- **Contratos obrigatórios:** projeto, Android, API, segurança, interface.

## 7.9 Infraestrutura e Implantação

- **Ambiente:** VS Code, Terminal, Linux, VPS. **Domínio:** `/infraestrutura/**`, `/docker/**`, `/implantacao/**`.
- **Conhecimentos:** Linux, Docker, Docker Compose, Nginx, HTTPS/certificados, firewall, rede, DNS, variáveis de ambiente, segredos, backup/restauração, implantação, reversão, registros, monitoramento.
- **Regra:** segredos nunca são armazenados no código ou no Git.
- **Requer aprovação para:** implantação em produção, alteração em produção, alteração de rede crítica.

## 7.10 Qualidade e Testes

Responsável pela validação do produto — **código compilando não significa funcionalidade concluída**.

- **Verifica:** requisitos, critérios de aceitação, comportamento esperado, casos normais e extremos, erros, segurança, regressões, compatibilidade, integração.
- **Tipos de teste:** unitário, integração, API, contrato, segurança, interface, ponta a ponta, regressão, desempenho.

## 7.11 Segurança

Transversal a todos os agentes e a todas as fases (planejamento → desenvolvimento → testes → revisão → implantação → monitoramento).

- **Verifica:** autenticação, autorização, controle de acesso, JWT, renovação de sessão, BCrypt, XSS, CSRF, SQL Injection, falsificação de requisições, rate limiting, exposição de informações, CORS, validação, sanitização, criptografia, proteção de segredos, dependências, registros, permissões.

## 7.12 Revisor de Código

Atua como engenheiro sênior — **não pode simplesmente dizer "está bom"**; deve produzir uma revisão verificável.

- **Verifica:** arquitetura, legibilidade, simplicidade, SOLID, coesão, acoplamento, duplicação, desempenho, segurança, testes, tratamento de erros, contratos, padrões do projeto.
- **Domínio de leitura:** `/**` (lê tudo, mas não altera).

## 7.13 Documentação

Mantém a documentação sincronizada com o sistema real. **Regra:** não documentar comportamento que não existe.

- **Documenta:** arquitetura, instalação, configuração, desenvolvimento, API, banco, implantação, segurança, decisões, solução de problemas, histórico, processos.

## 7.14 Observabilidade (evolução)

Registros, métricas, verificações de saúde, monitoramento, alertas, desempenho, disponibilidade, diagnóstico. Pode inicialmente pertencer à infraestrutura.

## 7.15 Desempenho (evolução)

Analisa tempo de resposta, memória, processamento, consultas, índices, rede, carregamento do frontend, desempenho Android, gargalos, escalabilidade.

---

# 8. TAREFA ESTRUTURADA — O CONTRATO ENTRE GERENCIADOR E AGENTE

Um agente **nunca** deve receber apenas `"Faça o login."`. Toda tarefa entregue a um agente deve conter:

```text
objetivo
contexto
contratos
restrições
dependências
arquivos permitidos
arquivos proibidos
critérios de aceitação
testes necessários
critérios de conclusão
```

## 8.1 Estados da tarefa

```text
RASCUNHO → PLANEJADA → PRONTA → EM EXECUÇÃO → EM TESTE → EM REVISÃO
    → AGUARDANDO APROVAÇÃO → CONCLUÍDA
```

Estados especiais: `BLOQUEADA`, `CANCELADA`, `REJEITADA`.

## 8.2 Critérios de aceitação

Toda tarefa deve responder:

```text
O que deve funcionar?
Como saberemos que funciona?
Quais entradas são válidas?
Quais entradas são inválidas?
Qual resultado esperamos?
Quais erros devem ocorrer?
```

## 8.3 Critério de conclusão (checklist obrigatório)

Uma tarefa não é concluída só porque o código foi escrito. Deve atender:

```text
[ ] requisito implementado
[ ] critérios de aceitação atendidos
[ ] testes realizados e aprovados
[ ] segurança verificada
[ ] contratos respeitados
[ ] documentação atualizada
[ ] revisão realizada
[ ] alterações registradas
[ ] nenhuma pendência crítica
```

## 8.4 Condições de parada

O agente deve **parar** (nunca inventar) quando encontrar:

```text
requisito ambíguo · contrato conflitante · dependência inexistente
mudança arquitetural · risco crítico · alteração destrutiva
migração perigosa · necessidade de segredo · arquivo fora do domínio
permissão insuficiente · teste crítico falhando · API incompatível
informação insuficiente
```

Comportamento correto: `PARAR → REGISTRAR → EXPLICAR → SOLICITAR DECISÃO`.

## 8.5 Dependências entre tarefas

```text
TAREFA-001
    ↓
TAREFA-002
    ↓
TAREFA-003
    ├──→ TAREFA-004
    └──→ TAREFA-005
```

Uma tarefa bloqueada por outra não deve ser liberada automaticamente.

---

# 9. PACOTE DE CONTEXTO E MEMÓRIA

## 9.1 Pacote de contexto

O gerenciador **nunca** entrega o projeto inteiro ao agente. Ele monta o **contexto mínimo necessário**:

```text
IDENTIDADE + CONTRATOS + TAREFA + ESTADO + DEPENDÊNCIAS
+ ARQUIVOS RELEVANTES + DECISÕES + RESTRIÇÕES + CRITÉRIOS DE ACEITAÇÃO
```

Isso reduz consumo de contexto, distração, erros, informações conflitantes e alterações indevidas. O gerenciador deve **selecionar** (contratos relevantes, tarefa, arquivos relevantes, dependências, decisões relevantes, estado atual, histórico necessário) e **evitar** (arquivos irrelevantes, histórico excessivo, documentação duplicada, informações conflitantes).

## 9.2 Memória em três camadas

```text
CONHECIMENTO PERMANENTE     ESTADO ATUAL              HISTÓRICO
arquitetura                 tarefas                   decisões
contratos                   progresso                 alterações
padrões                     bloqueios                 revisões
regras                      versão                    commits
                             problemas                 eventos
```

Essa separação evita uma memória única gigantesca e conflitante.

---

# 10. CONTRATOS

Arquivo raiz: `.ia/contratos/contrato-projeto.md` (versão legível) + `contrato-projeto.json` (versão estruturada) — este é a **constituição do projeto**. Nenhum agente pode ignorá-lo.

## 10.1 O que todo contrato deve conter

```text
versão · data · autor · estado · dependências · regras · exceções · histórico de alterações
```

## 10.2 Contratos especializados obrigatórios

```text
CONTRATO_PROJETO · CONTRATO_ARQUITETURA · CONTRATO_API · CONTRATO_BANCO
CONTRATO_FRONTEND · CONTRATO_ANDROID · CONTRATO_SEGURANCA
CONTRATO_INFRAESTRUTURA · CONTRATO_TESTES · CONTRATO_DOCUMENTACAO
CONTRATO_INTERFACE
```

## 10.3 Contrato da API (crítico — ponto de integração)

```text
FRONTEND ──▶ API ◀── ANDROID
```

Deve definir: endereços, métodos, parâmetros, cabeçalhos, autenticação, autorização, requisições, respostas, códigos HTTP, mensagens de erro, paginação, filtros, ordenação, versões, limites, formatos JSON. **A API deve estar definida antes de qualquer consumidor implementar comportamento dependente dela.**

Exemplo estruturado (`contratos/contrato-api.json`):

```json
{
	"id": "contrato-api", "nome": "Contrato da API", "versao": "1.0.0", "estado": "ativo",
	"objetivo": "Definir a comunicação entre os sistemas consumidores e o backend.",
	"padrao": "API REST", "formato": "JSON",
	"regras": [
		"Todas as respostas devem possuir formato definido.",
		"Todos os dados recebidos devem ser validados.",
		"Erros devem utilizar códigos HTTP apropriados.",
		"Contratos incompatíveis exigem nova versão.",
		"Endpoints devem possuir autenticação quando necessário.",
		"Dados sensíveis nunca devem ser retornados desnecessariamente."
	],
	"componentes": ["enderecos", "metodos", "cabecalhos", "autenticacao", "autorizacao",
		"requisicoes", "respostas", "erros", "paginacao", "filtros", "ordenacao",
		"versionamento", "limites"],
	"consumidores": ["frontend", "android"],
	"provedor": "backend"
}
```

## 10.4 Contrato de Segurança

Define obrigatoriamente:

```text
autenticação · autorização · funções · permissões · senhas · sessões · tokens
criptografia · chaves · segredos · validação · sanitização · limites
registros · retenção · tratamento de incidentes
```

Exemplo estruturado (`contratos/contrato-seguranca.json`):

```json
{
	"id": "contrato-seguranca", "nome": "Contrato de Segurança", "versao": "1.0.0", "estado": "ativo",
	"objetivo": "Definir requisitos mínimos de segurança.",
	"principios": ["Defesa em profundidade", "Menor privilégio", "Validação de entrada",
		"Segurança desde o início", "Não confiar no cliente", "Segredos fora do código"],
	"controles": ["Autenticação", "Autorização", "Controle de acesso", "JWT", "RBAC", "BCrypt",
		"XSS", "CSRF", "SQL Injection", "Limitação de requisições", "CORS", "Criptografia",
		"Gestão de segredos", "Auditoria"],
	"requerAprovacaoPara": ["aceitacao_de_risco_critico", "alteracao_de_autenticacao",
		"alteracao_de_autorizacao", "alteracao_de_criptografia"]
}
```

## 10.5 Controle de versão dos contratos

Contratos evoluem (v1, v2, v3). Uma tarefa criada para uma versão anterior deve saber disso — isso evita frontend usando API antiga enquanto backend já está na nova. Quando um contrato muda, o gerenciador deve identificar **quem depende dele** e gerar/atualizar tarefas de impacto:

```text
ALTERAÇÃO API → BACKEND → FRONTEND → ANDROID → TESTES → DOCUMENTAÇÃO
```

---

# 11. PERMISSÕES, DOMÍNIOS E FERRAMENTAS

## 11.1 Permissões (por agente)

```text
LER · CRIAR · ALTERAR · EXCLUIR · EXECUTAR · TESTAR · REVISAR · APROVAR · IMPLANTAR
```

Cada agente recebe somente o necessário — nunca o conjunto completo por padrão.

## 11.2 Domínios de arquivos

```text
FRONTEND         /frontend/**
BACKEND          /backend/**
ANDROID          /android/**
BANCO            /banco/**
INFRAESTRUTURA   /infraestrutura/** /docker/** /implantacao/**
DOCUMENTAÇÃO     /docs/**
TESTES           /testes/**
```

Um agente não deve ultrapassar seu domínio sem autorização explícita.

## 11.3 Ferramentas

Cada agente tem um conjunto de ferramentas permitido (ex.: ler arquivo, criar arquivo, alterar arquivo, executar teste, executar compilador, consultar Git, criar commit) — e um conjunto **não** permitido por padrão (alterar infraestrutura, executar comandos administrativos, alterar segredos, implantar produção). Ferramentas fazem parte da governança tanto quanto permissões.

## 11.4 Ambientes

```text
DESENVOLVIMENTO · TESTE · HOMOLOGAÇÃO · PRODUÇÃO
```

Um agente de desenvolvimento não tem acesso automático à produção.

---

# 12. GOVERNANÇA: CONFLITOS, DECISÕES, RISCOS, PROBLEMAS

## 12.1 Controle de conflitos

Se dois agentes quiserem alterar a mesma área, o gerenciador deve: **detectar → bloquear a execução conflitante → informar os agentes → identificar as tarefas envolvidas → solicitar revisão → evitar sobrescrita silenciosa.**

## 12.2 Decisões arquiteturais (ADR)

`.ia/decisoes/DECISAO-000N.md` (+ registro em `decisoes.json`). Cada decisão registra: problema, contexto, alternativas, decisão, justificativa, impactos, consequências, estado. Uma decisão não desaparece só porque um novo agente entrou no projeto.

## 12.3 Registro de riscos

`.ia/riscos/`: descrição, probabilidade, impacto, gravidade, causa, mitigação, responsável, estado.

## 12.4 Problemas conhecidos

`.ia/problemas/`: separados de tarefas, para o agente saber "existe um problema conhecido nesta área — não tente corrigi-lo automaticamente se não fizer parte da tarefa." Evita alterações inesperadas.

## 12.5 Base de conhecimento e procedimentos

`.ia/conhecimento/`: padrões, exemplos, decisões, regras, procedimentos, soluções conhecidas, limitações, convenções.
`.ia/procedimentos/`: procedimentos operacionais padronizados (equivalente aos procedimentos internos de uma empresa) — `CRIAR_TAREFA.md`, `IMPLEMENTAR_TAREFA.md`, `REVISAR_CODIGO.md`, `EXECUTAR_TESTES.md`, `CRIAR_MIGRACAO.md`, `ALTERAR_API.md`, `IMPLANTAR.md`, `REVERTER_IMPLANTACAO.md`.

## 12.6 Controle de alterações

Toda alteração relevante deve registrar: quem alterou, o que, quando, por quê, qual tarefa originou, qual contrato foi afetado, qual decisão autorizou, qual versão resultou.

## 12.7 Aprovação humana

Operações que exigem autorização do Proprietário:

```text
alteração arquitetural · alteração destrutiva no banco
alteração de segurança crítica · alteração de contrato incompatível
implantação em produção · remoção de dados
alteração de infraestrutura crítica
```

O gerenciador deve apresentar: **o que será alterado, por quê, impacto, riscos, agente responsável, tarefa, arquivos afetados** — e então registrar `APROVAR` ou `REJEITAR`.

## 12.8 Recuperação e reversão

Toda operação importante (banco, infraestrutura, implantação, contratos, configurações) deve prever: backup, histórico, versão anterior, reversão, restauração, cancelamento.

## 12.9 Qualidade dos agentes

O gerenciador deve permitir avaliar (não "salário", mas qualidade operacional): tarefas concluídas/rejeitadas, quantidade de correções, testes aprovados, falhas, violações de contrato, alterações fora do domínio, tempo de execução, retrabalho.

## 12.10 Controle de modelo (desacoplamento função × modelo)

O perfil do agente separa **função** de **modelo**:

```text
FUNÇÃO: Agente Frontend
MODELO: Modelo A
FERRAMENTAS: leitura + escrita + testes
DOMÍNIO: /frontend/**
```

Assim é possível trocar o modelo/provedor sem alterar a função do agente.

---

# 13. GIT E AUDITORIA

## 13.1 Git como histórico técnico oficial

O gerenciador **consulta** (não substitui) o Git: ramo, estado, alterações, diferenças entre versões, commits, tarefas, revisões, conflitos, integrações, versões. Fluxo ideal:

```text
TAREFA → RAMO → IMPLEMENTAÇÃO → TESTES → REVISÃO → INTEGRAÇÃO
```

## 13.2 Auditoria

Registro de eventos: agente criado, tarefa criada/atribuída, contrato alterado, agente executado, arquivo alterado, teste executado, revisão realizada, aprovação realizada, alteração rejeitada, implantação realizada. Objetivo: sempre poder responder **quem fez o quê, quando, por quê e em qual tarefa**.

---

# 14. SEGURANÇA DO PRÓPRIO GERENCIADOR

Mesmo sendo pessoal, o sistema precisa de cuidados básicos, aplicados tanto no AgentMap quanto no Gerenciador Local:

```text
validação de entradas
proteção contra path traversal
validação de caminhos
validação de JSON
proteção contra acesso a arquivos fora das áreas permitidas
tratamento seguro de erros
não executar arquivos arbitrários
não executar comandos do sistema sem autorização explícita
proteção contra sobrescrita acidental
confirmação para exclusões
cópia de segurança quando necessário
autenticação/autorização local
isolamento de processos
proteção de segredos (nunca no código ou no Git)
```

**Regra central:** o gerenciador não pode virar uma porta para qualquer agente executar qualquer comando no computador.

---

# 15. BACKEND — RESPONSABILIDADES E API LOCAL

## 15.1 Responsabilidades do backend

- acessar o sistema de arquivos (criar, ler, editar, excluir diretórios/arquivos);
- validar JSON e caminhos;
- acessar PostgreSQL;
- fornecer API local para o frontend;
- abrir/gerenciar projetos;
- manter metadados de projetos e agentes;
- montar pacotes de contexto mínimos;
- detectar conflitos e dependências;
- consultar estado do Git;
- registrar eventos de auditoria.

Não haverá arquitetura distribuída, microsserviços, filas de mensagens, orquestração ou infraestrutura de servidor remoto.

## 15.2 Endpoints conceituais (a detalhar durante a implementação)

```text
GET    /api/projetos
POST   /api/projetos
GET    /api/projetos/{id}
GET    /api/projetos/{id}/agentes

GET    /api/agentes
POST   /api/agentes
GET    /api/agentes/{id}

GET    /api/contratos
POST   /api/contratos
GET    /api/contratos/{id}
GET    /api/contratos/{id}/dependentes

GET    /api/tarefas
POST   /api/tarefas
PUT    /api/tarefas/{id}
GET    /api/tarefas/{id}/contexto

GET    /api/estado
GET    /api/decisoes
GET    /api/riscos
GET    /api/problemas
GET    /api/qualidade
GET    /api/auditoria

GET    /api/arquivos
GET    /api/arquivos/conteudo
POST   /api/arquivos
PUT    /api/arquivos
DELETE /api/arquivos

POST   /api/aprovacoes
PUT    /api/aprovacoes/{id}
```

## 15.3 Interface (frontend)

Deve permitir: criar/abrir projeto; criar/visualizar agentes; criar/editar/abrir arquivos; visualizar estrutura de pastas; copiar conteúdo; pesquisar informações; visualizar e validar JSON formatado; importar/exportar arquivos; abrir a pasta no Windows; visualizar o caminho real dos arquivos; e os painéis descritos na seção 17.

---

# 16. MODELOS JSON — ESQUEMAS DE DADOS

Estes são os esquemas de referência que o Arquiteto deve usar como base para os validadores (JSON Schema) e para os tipos TypeScript do backend. Todos vivem sob `.ia/` dentro de cada projeto gerenciado.

## 16.1 `configuracao/projeto.json`

```json
{
	"id": "projeto-principal",
	"nome": "Nome do Projeto",
	"descricao": "Descrição geral do projeto.",
	"versao": "1.0.0",
	"estado": "em_desenvolvimento",
	"idioma": "pt-BR",
	"fusoHorario": "America/Sao_Paulo",
	"proprietario": { "tipo": "humano", "nome": "Proprietário do Projeto" },
	"objetivos": ["Objetivo principal do projeto."],
	"escopo": { "incluso": [], "excluido": [] },
	"tecnologias": {
		"frontend": [], "backend": [], "android": [],
		"bancoDeDados": [], "infraestrutura": [], "testes": []
	},
	"arquiteturas": ["DDD", "Arquitetura Limpa", "Arquitetura em Camadas"],
	"padroes": ["SOLID", "GRASP", "Padrões de Projeto"],
	"diretorios": {
		"frontend": "/frontend", "backend": "/backend", "android": "/android",
		"banco": "/banco", "infraestrutura": "/infraestrutura",
		"implantacao": "/implantacao", "testes": "/testes", "documentacao": "/docs"
	},
	"configuracaoIa": {
		"diretorio": "/.ia",
		"contratoPrincipal": "/.ia/contratos/contrato-projeto.json",
		"estadoAtual": "/.ia/estado/estado-atual.json"
	},
	"datas": { "criacao": null, "ultimaAtualizacao": null }
}
```

## 16.2 `configuracao/gerenciador.json`

```json
{
	"nome": "Gerenciador Local de Projetos para Agentes",
	"versao": "1.0.0",
	"modo": "local",
	"idioma": "pt-BR",
	"formatoDados": "json",
	"controleVersao": "git",
	"requerAprovacaoHumana": true,
	"registroAuditoria": true,
	"controlePermissoes": true,
	"controleContexto": true,
	"controleDependencias": true,
	"controleConflitos": true,
	"controleContratos": true,
	"controleQualidade": true,
	"controleSeguranca": true,
	"ambientes": ["desenvolvimento", "teste", "homologacao", "producao"],
	"estadosTarefa": [
		"rascunho", "planejada", "pronta", "em_execucao", "em_teste",
		"em_revisao", "aguardando_aprovacao", "concluida",
		"bloqueada", "cancelada", "rejeitada"
	]
}
```

## 16.3 `configuracao/ambiente.json`

```json
{
	"ambientes": [
		{ "id": "desenvolvimento", "nome": "Desenvolvimento", "tipo": "local",
		  "permitirAlteracaoCodigo": true, "permitirTestes": true,
		  "permitirImplantacao": false, "permitirAcessoProducao": false },
		{ "id": "teste", "nome": "Teste", "tipo": "local",
		  "permitirAlteracaoCodigo": false, "permitirTestes": true,
		  "permitirImplantacao": false, "permitirAcessoProducao": false },
		{ "id": "homologacao", "nome": "Homologação", "tipo": "remoto",
		  "permitirAlteracaoCodigo": false, "permitirTestes": true,
		  "permitirImplantacao": true, "permitirAcessoProducao": false },
		{ "id": "producao", "nome": "Produção", "tipo": "remoto",
		  "permitirAlteracaoCodigo": false, "permitirTestes": false,
		  "permitirImplantacao": true, "permitirAcessoProducao": true,
		  "requerAprovacaoHumana": true }
	]
}
```

## 16.4 `agentes/agentes.json` (registro central)

```json
{
	"agentes": [
		{ "id": "planejador-arquiteto", "nome": "Planejador / Arquiteto",
		  "funcao": "planejamento", "estado": "ativo",
		  "arquivoPerfil": "/.ia/agentes/planejador/planejador.json" },
		{ "id": "frontend", "nome": "Frontend", "funcao": "desenvolvimento_frontend",
		  "estado": "ativo", "arquivoPerfil": "/.ia/agentes/frontend/frontend.json" },
		{ "id": "backend", "nome": "Backend", "funcao": "desenvolvimento_backend",
		  "estado": "ativo", "arquivoPerfil": "/.ia/agentes/backend/backend.json" },
		{ "id": "banco", "nome": "Banco de Dados", "funcao": "banco_de_dados",
		  "estado": "ativo", "arquivoPerfil": "/.ia/agentes/banco/banco.json" },
		{ "id": "android", "nome": "Android", "funcao": "desenvolvimento_android",
		  "estado": "ativo", "arquivoPerfil": "/.ia/agentes/android/android.json" },
		{ "id": "infraestrutura", "nome": "Infraestrutura", "funcao": "infraestrutura_implantacao",
		  "estado": "ativo", "arquivoPerfil": "/.ia/agentes/infraestrutura/infraestrutura.json" },
		{ "id": "testes", "nome": "Qualidade e Testes", "funcao": "qualidade_testes",
		  "estado": "ativo", "arquivoPerfil": "/.ia/agentes/testes/testes.json" },
		{ "id": "seguranca", "nome": "Segurança", "funcao": "seguranca",
		  "estado": "ativo", "arquivoPerfil": "/.ia/agentes/seguranca/seguranca.json" },
		{ "id": "revisor", "nome": "Revisor de Código", "funcao": "revisao",
		  "estado": "ativo", "arquivoPerfil": "/.ia/agentes/revisor/revisor.json" },
		{ "id": "documentacao", "nome": "Documentação", "funcao": "documentacao",
		  "estado": "ativo", "arquivoPerfil": "/.ia/agentes/documentacao/documentacao.json" },
		{ "id": "observabilidade", "nome": "Observabilidade", "funcao": "observabilidade",
		  "estado": "disponivel", "arquivoPerfil": "/.ia/agentes/observabilidade/observabilidade.json" },
		{ "id": "desempenho", "nome": "Desempenho", "funcao": "desempenho",
		  "estado": "disponivel", "arquivoPerfil": "/.ia/agentes/desempenho/desempenho.json" }
	]
}
```

## 16.5 `modelo-agente.json` — template-base de todo perfil de agente

```json
{
	"id": "identificador-do-agente",
	"nome": "Nome do Agente",
	"funcao": "funcao_do_agente",
	"descricao": "Descrição da função.",
	"estado": "ativo",
	"responsabilidades": [],
	"objetivos": [],
	"conhecimentos": [],
	"dominios": [],
	"diretoriosPermitidos": [],
	"diretoriosProibidos": [],
	"contratosObrigatorios": [],
	"procedimentosObrigatorios": [],
	"permissoes": {
		"ler": true, "criar": true, "alterar": true, "excluir": false,
		"executar": true, "testar": true, "revisar": false,
		"aprovar": false, "implantar": false
	},
	"ferramentasPermitidas": [],
	"comandosPermitidos": [],
	"comandosProibidos": [],
	"ambientesPermitidos": ["desenvolvimento", "teste"],
	"requerAprovacaoPara": [],
	"condicoesDeParada": [],
	"criteriosDeQualidade": [],
	"criteriosDeConclusao": [],
	"protocoloDeEntrega": {
		"exigeResumo": true, "exigeArquivosAlterados": true,
		"exigeTestes": true, "exigeRiscos": true, "exigePendencias": true
	},
	"modelo": { "provedor": "", "nome": "", "modo": "", "limiteContexto": 0 },
	"datas": { "criacao": null, "ultimaAtualizacao": null }
}
```

## 16.6 Exemplos de perfis específicos (padrão a repetir para os demais agentes)

`agentes/frontend/frontend.json` (resumido — segue o `modelo-agente.json`):

```json
{
	"id": "frontend", "nome": "Frontend", "funcao": "desenvolvimento_frontend",
	"descricao": "Responsável pela interface web e integração com a API.",
	"estado": "ativo",
	"responsabilidades": [
		"Implementar interface", "Implementar comportamentos do navegador",
		"Integrar com API", "Validar entradas", "Tratar erros",
		"Implementar responsividade", "Implementar acessibilidade",
		"Aplicar segurança no navegador", "Executar testes"
	],
	"conhecimentos": ["HTML5", "CSS3", "JavaScript", "DOM", "Fetch", "JSON",
		"Responsividade", "Acessibilidade", "XSS", "CSRF", "Autenticação", "Autorização"],
	"diretoriosPermitidos": ["/frontend/**"],
	"diretoriosProibidos": ["/backend/**", "/android/**", "/banco/**", "/infraestrutura/**"],
	"contratosObrigatorios": ["contrato-projeto", "contrato-frontend", "contrato-api",
		"contrato-seguranca", "contrato-interface"],
	"permissoes": { "ler": true, "criar": true, "alterar": true, "excluir": true,
		"executar": true, "testar": true, "revisar": false, "aprovar": false, "implantar": false },
	"ferramentasPermitidas": ["editor", "terminal", "git", "testes"],
	"condicoesDeParada": ["api_incompativel", "contrato_conflitante",
		"arquivo_fora_do_dominio", "requisito_ambiguo"]
}
```

`agentes/backend/backend.json` (resumido):

```json
{
	"id": "backend", "nome": "Backend", "funcao": "desenvolvimento_backend",
	"descricao": "Responsável pela API, regras de negócio, segurança e integração com banco.",
	"estado": "ativo",
	"conhecimentos": ["Java", "Spring Boot", "Spring Security", "Spring Data JPA", "Hibernate",
		"PostgreSQL", "API REST", "JSON", "DTO", "Validação", "JWT", "RBAC", "BCrypt",
		"Testes", "DDD", "Arquitetura Limpa", "SOLID", "GRASP", "Padrões de Projeto"],
	"diretoriosPermitidos": ["/backend/**"],
	"diretoriosProibidos": ["/frontend/**", "/android/**", "/infraestrutura/**"],
	"contratosObrigatorios": ["contrato-projeto", "contrato-arquitetura", "contrato-api",
		"contrato-banco", "contrato-seguranca"],
	"permissoes": { "ler": true, "criar": true, "alterar": true, "excluir": true,
		"executar": true, "testar": true, "revisar": false, "aprovar": false, "implantar": false },
	"condicoesDeParada": ["mudanca_arquitetural", "alteracao_de_contrato",
		"alteracao_destrutiva", "risco_de_seguranca", "migracao_necessaria"]
}
```

Os demais perfis seguem exatamente o mesmo `modelo-agente.json`. Perfis completos de referência:

`agentes/banco/banco.json`:

```json
{
	"id": "banco", "nome": "Banco de Dados", "funcao": "banco_de_dados",
	"descricao": "Responsável pela estrutura, integridade e desempenho do banco.",
	"estado": "ativo",
	"responsabilidades": ["Modelar dados", "Criar migrações", "Definir relacionamentos",
		"Definir índices", "Preservar integridade", "Analisar consultas",
		"Analisar desempenho", "Aplicar segurança"],
	"conhecimentos": ["PostgreSQL", "Modelagem", "Normalização", "Índices", "Transações",
		"Concorrência", "Integridade", "Desempenho", "Migrações"],
	"diretoriosPermitidos": ["/banco/**"],
	"diretoriosProibidos": ["/frontend/**", "/android/**"],
	"contratosObrigatorios": ["contrato-projeto", "contrato-banco", "contrato-seguranca"],
	"permissoes": { "ler": true, "criar": true, "alterar": true, "excluir": false,
		"executar": true, "testar": true, "revisar": false, "aprovar": false, "implantar": false },
	"requerAprovacaoPara": ["alteracao_destrutiva", "alteracao_producao"]
}
```

`agentes/android/android.json`:

```json
{
	"id": "android", "nome": "Android", "funcao": "desenvolvimento_android",
	"descricao": "Responsável pelo aplicativo Android.",
	"estado": "ativo",
	"responsabilidades": ["Implementar aplicativo", "Integrar API", "Implementar autenticação",
		"Tratar permissões", "Implementar armazenamento seguro",
		"Implementar funcionalidades Android", "Executar testes", "Validar desempenho"],
	"conhecimentos": ["Kotlin", "Android", "Gradle", "Componentes Android", "Ciclo de Vida",
		"Corrotinas", "HTTP", "JSON", "API REST", "Autenticação", "Armazenamento Seguro", "Testes"],
	"diretoriosPermitidos": ["/android/**"],
	"diretoriosProibidos": ["/backend/**", "/frontend/**", "/banco/**", "/infraestrutura/**"],
	"contratosObrigatorios": ["contrato-projeto", "contrato-android", "contrato-api",
		"contrato-seguranca", "contrato-interface"],
	"permissoes": { "ler": true, "criar": true, "alterar": true, "excluir": true,
		"executar": true, "testar": true, "revisar": false, "aprovar": false, "implantar": false }
}
```

`agentes/infraestrutura/infraestrutura.json`:

```json
{
	"id": "infraestrutura", "nome": "Infraestrutura", "funcao": "infraestrutura_implantacao",
	"descricao": "Responsável pela infraestrutura, contêineres, servidores e implantação.",
	"estado": "ativo",
	"responsabilidades": ["Configurar infraestrutura", "Configurar contêineres",
		"Configurar servidor", "Configurar rede", "Configurar HTTPS", "Implantar aplicações",
		"Executar cópias de segurança", "Executar restauração", "Monitorar infraestrutura",
		"Executar reversão"],
	"conhecimentos": ["Linux", "Docker", "Docker Compose", "Nginx", "HTTPS", "DNS", "Firewall",
		"VPS", "Segredos", "Cópias de Segurança", "Monitoramento"],
	"diretoriosPermitidos": ["/infraestrutura/**", "/implantacao/**"],
	"diretoriosProibidos": ["/frontend/**", "/android/**"],
	"contratosObrigatorios": ["contrato-projeto", "contrato-infraestrutura", "contrato-seguranca"],
	"permissoes": { "ler": true, "criar": true, "alterar": true, "excluir": false,
		"executar": true, "testar": true, "revisar": false, "aprovar": false, "implantar": true },
	"requerAprovacaoPara": ["implantacao_producao", "alteracao_producao", "alteracao_rede_critica"]
}
```

`agentes/testes/testes.json`:

```json
{
	"id": "testes", "nome": "Qualidade e Testes", "funcao": "qualidade_testes",
	"descricao": "Responsável por verificar se o sistema atende aos requisitos.",
	"estado": "ativo",
	"responsabilidades": ["Executar testes", "Criar testes", "Validar requisitos",
		"Validar critérios de aceitação", "Detectar regressões", "Validar contratos",
		"Validar segurança"],
	"tiposDeTeste": ["unitario", "integracao", "api", "contrato", "seguranca", "interface",
		"ponta_a_ponta", "regressao", "desempenho"],
	"diretoriosPermitidos": ["/testes/**"],
	"contratosObrigatorios": ["contrato-projeto", "contrato-testes", "contrato-api", "contrato-seguranca"],
	"permissoes": { "ler": true, "criar": true, "alterar": true, "excluir": false,
		"executar": true, "testar": true, "revisar": true, "aprovar": false, "implantar": false }
}
```

`agentes/seguranca/seguranca.json`:

```json
{
	"id": "seguranca", "nome": "Segurança", "funcao": "seguranca",
	"descricao": "Responsável pela análise transversal de segurança.",
	"estado": "ativo",
	"responsabilidades": ["Analisar autenticação", "Analisar autorização",
		"Analisar entrada de dados", "Analisar exposição de dados", "Analisar dependências",
		"Analisar configuração", "Analisar código", "Analisar infraestrutura", "Registrar riscos"],
	"conhecimentos": ["Autenticação", "Autorização", "JWT", "RBAC", "BCrypt", "XSS", "CSRF",
		"SQL Injection", "Limitação de Requisições", "CORS", "Criptografia", "Gestão de Segredos",
		"Segurança de Dependências"],
	"diretoriosPermitidos": ["/.ia/**"],
	"diretoriosProibidos": [],
	"contratosObrigatorios": ["contrato-projeto", "contrato-seguranca"],
	"permissoes": { "ler": true, "criar": false, "alterar": false, "excluir": false,
		"executar": true, "testar": true, "revisar": true, "aprovar": false, "implantar": false },
	"requerAprovacaoPara": ["aceitacao_de_risco_critico"]
}
```

`agentes/revisor/revisor.json`:

```json
{
	"id": "revisor", "nome": "Revisor de Código", "funcao": "revisao",
	"descricao": "Responsável por revisar alterações antes da integração.",
	"estado": "ativo",
	"responsabilidades": ["Revisar código", "Verificar arquitetura", "Verificar segurança",
		"Verificar testes", "Verificar contratos", "Detectar duplicação",
		"Detectar complexidade", "Registrar recomendações"],
	"criterios": ["correcao", "seguranca", "legibilidade", "arquitetura", "baixo_acoplamento",
		"alta_coesao", "testabilidade", "desempenho", "manutenibilidade"],
	"diretoriosPermitidos": ["/**"],
	"contratosObrigatorios": ["contrato-projeto", "contrato-arquitetura", "contrato-seguranca", "contrato-testes"],
	"permissoes": { "ler": true, "criar": false, "alterar": false, "excluir": false,
		"executar": true, "testar": true, "revisar": true, "aprovar": false, "implantar": false }
}
```

`agentes/documentacao/documentacao.json`:

```json
{
	"id": "documentacao", "nome": "Documentação", "funcao": "documentacao",
	"descricao": "Responsável por manter a documentação sincronizada com o projeto.",
	"estado": "ativo",
	"responsabilidades": ["Documentar arquitetura", "Documentar API", "Documentar instalação",
		"Documentar configuração", "Documentar implantação", "Documentar decisões",
		"Documentar problemas", "Atualizar histórico"],
	"diretoriosPermitidos": ["/docs/**", "/README.md", "/CHANGELOG.md"],
	"contratosObrigatorios": ["contrato-projeto", "contrato-documentacao"],
	"permissoes": { "ler": true, "criar": true, "alterar": true, "excluir": false,
		"executar": false, "testar": false, "revisar": false, "aprovar": false, "implantar": false }
}
```

`agentes/observabilidade/observabilidade.json` (evolução):

```json
{
	"id": "observabilidade", "nome": "Observabilidade", "funcao": "observabilidade",
	"descricao": "Responsável por registros, métricas, monitoramento e diagnóstico.",
	"estado": "disponivel",
	"responsabilidades": ["Definir registros", "Definir métricas", "Definir verificações de saúde",
		"Definir alertas", "Analisar disponibilidade", "Analisar falhas", "Analisar desempenho"],
	"diretoriosPermitidos": ["/infraestrutura/**", "/docs/observabilidade/**"],
	"contratosObrigatorios": ["contrato-projeto", "contrato-infraestrutura"],
	"permissoes": { "ler": true, "criar": true, "alterar": true, "excluir": false,
		"executar": true, "testar": true, "revisar": true, "aprovar": false, "implantar": false }
}
```

`agentes/desempenho/desempenho.json` (evolução):

```json
{
	"id": "desempenho", "nome": "Desempenho", "funcao": "desempenho",
	"descricao": "Responsável por identificar e reduzir gargalos.",
	"estado": "disponivel",
	"responsabilidades": ["Analisar tempo de resposta", "Analisar consumo de memória",
		"Analisar processamento", "Analisar consultas", "Analisar rede",
		"Analisar carregamento", "Identificar gargalos", "Propor melhorias"],
	"diretoriosPermitidos": ["/**"],
	"contratosObrigatorios": ["contrato-projeto", "contrato-arquitetura"],
	"permissoes": { "ler": true, "criar": false, "alterar": false, "excluir": false,
		"executar": true, "testar": true, "revisar": true, "aprovar": false, "implantar": false }
}
```

Pontos que **não** podem ser generalizados a partir do template-base: Banco nunca recebe `excluir = true`; Infraestrutura é o único perfil com `implantar = true` por padrão; Segurança e Desempenho não criam nem alteram arquivos (`criar = false`, `alterar = false` — atuam só por leitura e análise); Revisor lê `/**` mas nunca cria/altera; Documentação nunca executa nem testa.

## 16.7 `contratos/modelo-contrato.json`

```json
{
	"id": "contrato-exemplo", "nome": "Contrato de Exemplo",
	"descricao": "Define regras para determinado domínio.",
	"versao": "1.0.0", "estado": "ativo", "obrigatorio": true,
	"aplicavelA": ["frontend", "backend"],
	"objetivo": "", "escopo": [], "regras": [], "restricoes": [],
	"padroesObrigatorios": [], "padroesProibidos": [], "dependencias": [],
	"criteriosValidacao": [], "condicoesDeExcecao": [], "requerAprovacaoPara": [],
	"historico": [{ "versao": "1.0.0", "data": null, "alteracao": "Criação" }]
}
```

`contratos/contrato-projeto.json` (constituição do projeto — exemplo de regras):

```json
{
	"id": "contrato-projeto", "nome": "Contrato do Projeto", "versao": "1.0.0", "estado": "ativo",
	"objetivo": "Definir as regras gerais que todos os agentes devem obedecer.",
	"regras": [
		"Todo agente deve conhecer sua função.",
		"Todo agente deve respeitar seu domínio.",
		"Todo agente deve respeitar os contratos.",
		"Todo agente deve executar somente tarefas autorizadas.",
		"Todo agente deve respeitar as regras de segurança.",
		"Todo agente deve registrar sua entrega.",
		"Alterações críticas exigem aprovação humana.",
		"Segredos nunca devem ser armazenados no código.",
		"Alterações devem ser rastreáveis.",
		"Uma tarefa somente pode ser concluída após atender seus critérios de conclusão."
	],
	"padroes": ["DDD", "Arquitetura Limpa", "Arquitetura em Camadas", "SOLID", "GRASP", "Padrões de Projeto"],
	"politicas": ["politica-seguranca", "politica-git", "politica-qualidade",
		"politica-permissoes", "politica-mudancas"]
}
```

## 16.8 `tarefas/modelos/modelo-tarefa.json`

```json
{
	"id": "TAREFA-0001", "titulo": "Título da tarefa", "descricao": "Descrição detalhada.",
	"objetivo": "Objetivo da tarefa.", "tipo": "desenvolvimento", "estado": "rascunho",
	"prioridade": "media", "agenteResponsavel": "frontend", "dominio": "frontend",
	"ambiente": "desenvolvimento",
	"dependencias": [], "contratosObrigatorios": [], "procedimentosObrigatorios": [],
	"arquivosPermitidos": [], "arquivosProibidos": [], "contextoNecessario": [],
	"criteriosAceitacao": [], "testesObrigatorios": [], "riscos": [], "restricoes": [],
	"condicoesDeParada": [],
	"criteriosConclusao": [
		"Implementação concluída", "Critérios de aceitação atendidos",
		"Testes aprovados", "Segurança verificada", "Contratos respeitados",
		"Documentação atualizada", "Revisão realizada"
	],
	"resultado": {
		"resumo": "", "arquivosAlterados": [], "testesExecutados": [], "testesAprovados": [],
		"riscosEncontrados": [], "pendencias": [], "observacoes": "", "commit": ""
	},
	"aprovacao": { "necessaria": false, "estado": "nao_solicitada", "aprovador": "", "data": null, "observacao": "" },
	"datas": { "criacao": null, "inicio": null, "ultimaAtualizacao": null, "conclusao": null }
}
```

## 16.9 Demais modelos de dados (uma linha de esquema por arquivo)

O Arquiteto deve implementar cada um destes como schema TypeScript + validador JSON Schema, seguindo o padrão de campos já demonstrado acima:

| Arquivo | Conteúdo principal |
|---|---|
| `tarefas/tarefas.json` | lista de tarefas + `estatisticas` por estado |
| `estado/estado-atual.json` | `projetoId, estado, fase, versao, agentesAtivos, tarefasAtivas/Bloqueadas, ultimasAlteracoes, problemasConhecidos, riscosAtivos, decisoesRecentes, contratosAlterados, testes{total,aprovados,reprovados}, qualidade{percentual,pendenciasCriticas}, seguranca{estado,riscosCriticos,riscosAltos}` |
| `estado/progresso.json` | `projeto{percentual,tarefasConcluidas,tarefasTotais}` + `areas{...percentual}` por área |
| `estado/bloqueios.json` | lista de bloqueios: `id, tarefaId, tipo, gravidade, descricao, origem, responsavelResolucao, estado, criadoEm, resolvidoEm` |
| `decisoes/decisoes.json` | `id, titulo, estado, data, problema, contexto, alternativas, decisao, justificativa, impactos, consequencias, tarefasRelacionadas, contratosAfetados, aprovacao{...}` |
| `riscos/riscos.json` | `id, titulo, descricao, categoria, probabilidade, impacto, gravidade, causa, consequencias, mitigacao, responsavel, tarefasRelacionadas, estado, criadoEm, resolvidoEm` |
| `problemas/problemas.json` | `id, titulo, descricao, categoria, gravidade, impacto, estado, naoCorrigirAutomaticamente, responsavel, tarefasRelacionadas, solucaoConhecida, criadoEm, resolvidoEm` |
| `conhecimento/conhecimento.json` | `id, titulo, categoria, descricao, conteudo, palavrasChave, agentesAplicaveis, contratosRelacionados, tarefasRelacionadas, estado, versao, criadoEm, atualizadoEm` |
| `procedimentos/procedimentos.json` | `id, nome, descricao, estado, versao, aplicavelA, etapas[], criteriosConclusao` |
| `permissoes/permissoes.json` | lista de permissões + `perfis[]` (proprietario, agente, revisor) com `permissoes[]` |
| `permissoes/ferramentas.json` | `id, nome, tipo, descricao, permissoes[], requerRestricao?` |
| `contexto/contextos.json` | `id, agenteId, tarefaId, versao, contratos[], arquivos[], decisoes[], conhecimento[], estado, restricoes[], criteriosAceitacao[], geradoEm` |
| `qualidade/criterios.json` | `id, nome, descricao, obrigatorio` (correção, segurança, testabilidade, manutenibilidade, arquitetura) |
| `qualidade/testes.json` | `id, tarefaId, nome, tipo, descricao, comando, resultadoEsperado, resultadoObtido, estado, obrigatorio, executadoEm, duracao, mensagemErro` |
| `qualidade/revisoes.json` | `id, tarefaId, agenteRevisor, estado, arquivosAnalisados, pontosPositivos, problemas, recomendacoes, criterios{...}, resultado, criadoEm, concluidoEm` |
| `git/estado-git.json` | `repositorio{caminho,ramoAtual,estado,ultimoCommit{...}}, alteracoes{modificados,criados,excluidos}, conflitos[], tarefasRelacionadas, ultimaVerificacao` |
| `auditoria/eventos.json` | `id, tipo, origem, agenteId, usuarioId, tarefaId, descricao, dados{}, resultado, data` |
| `resultado-tarefa.json` | `tarefaId, agenteId, estado, resumo, implementacoes, arquivosAlterados[{caminho,operacao,descricao}], testes{...}, seguranca{verificada,problemas}, contratos{respeitados,violacoes}, documentacao{atualizada,arquivos}, riscos, pendencias, observacoes, commit{identificador,mensagem}, data` |
| `aprovacoes/aprovacoes.json` | `id, tipo, tarefaId, solicitante, responsavel, estado, motivo, impacto, riscos, alteracoes, decisao, observacao, solicitadaEm, respondidaEm` |
| `conflitos/conflitos.json` | `id, tipo, estado, agentes[], tarefas[], arquivos[], descricao, impacto, resolucao, responsavelResolucao, criadoEm, resolvidoEm` |
| `politicas/politicas.json` + `modelo-politica.json` | `id, nome, descricao, versao, estado, objetivo, regras[], proibicoes[], excecoes[], requerAprovacaoPara[], agentesAplicaveis[], ambientesAplicaveis[], consequenciasViolacao[], historico[]` |
| `protocolo-execucao.json` | lista ordenada de etapas (`ordem, nome, obrigatorio`): receber tarefa → ler contratos → ler estado → verificar dependências → inspecionar arquivos → planejar execução → implementar → executar testes → validar segurança → validar contratos → documentar → entregar resultado |
| `criterio-conclusao.json` | lista de critérios (`id, descricao, obrigatorio`): implementação, aceitação, testes, segurança, contratos, documentação, revisão, pendências |

## 16.10 Regra importante sobre os JSON

Esses JSON **não são obrigatoriamente a única fonte de verdade do sistema inteiro**. Na primeira versão local, funcionam bem como arquivos de configuração e estado compartilhado. Conforme o gerenciador crescer, o ideal é separar:

```text
CONFIGURAÇÃO      → arquivos JSON
DOCUMENTAÇÃO       → Markdown
CÓDIGO             → Git
DADOS OPERACIONAIS → banco de dados local (PostgreSQL)
HISTÓRICO          → Git + auditoria
CONTEXTO TEMPORÁRIO → arquivos de execução
```

Isso evita transformar um único conjunto de JSON em um banco de dados improvisado.

---

# 17. PAINÉIS DA INTERFACE

O JSON não é pensado só para os agentes — também precisa alimentar a interface. Por isso os objetos possuem, quando aplicável: `id, nome, descricao, estado, versao, data, responsavel, relacionamentos`.

```text
PAINEL
├── Projetos
├── Agentes
├── Tarefas
├── Contratos
├── Estado
├── Dependências
├── Riscos
├── Problemas
├── Decisões
├── Testes
├── Revisões
├── Git
├── Auditoria
└── Configurações
```

| Painel | Mostra | Fonte de dados |
|---|---|---|
| **Projeto** | Nome, versão, estado, progresso, tarefas, agentes, riscos, problemas, testes, segurança, Git, últimas atividades | `projeto.json`, `estado-atual.json`, `progresso.json`, `tarefas.json`, `agentes.json`, `riscos.json`, `problemas.json`, `estado-git.json`, `eventos.json` |
| **Agentes** | Nome, função, estado, modelo, tarefas, progresso, domínio, permissões, ferramentas, contratos, última atividade, problemas | `agentes.json`, perfil do agente, `tarefas.json`, `permissoes.json`, `ferramentas.json`, `eventos.json` |
| **Tarefas** | Identificador, título, estado, prioridade, agente, dependências, progresso, critérios, testes, revisão, aprovação, resultado | `tarefas.json`, `resultado-tarefa.json`, `testes.json`, `revisoes.json`, `aprovacoes.json` |
| **Segurança** | Estado, riscos críticos/altos, problemas, revisões, violações, última análise | `contrato-seguranca.json`, `riscos.json`, `problemas.json`, `revisoes.json`, `eventos.json` |
| **Qualidade** | Testes totais/aprovados/reprovados, cobertura, revisões, pendências, estado geral | `testes.json`, `revisoes.json`, `criterios.json`, `estado-atual.json` |
| **Auditoria** | Data, agente, tarefa, evento, arquivo, resultado | `eventos.json` |

---

# 18. FLUXO COMPLETO DO SISTEMA

```text
NECESSIDADE
    ↓
PROPRIETÁRIO DO PRODUTO
    ↓
PLANEJADOR / ARQUITETO
    ↓
ANÁLISE → ARQUITETURA → CONTRATOS → TAREFAS → DEPENDÊNCIAS → CONTEXTO
    ↓
AGENTE RESPONSÁVEL
    ↓
IMPLEMENTAÇÃO → TESTES → SEGURANÇA → REVISÃO → APROVAÇÃO
    ↓
GIT → ATUALIZAÇÃO DO ESTADO → DOCUMENTAÇÃO
    ↓
PRÓXIMA TAREFA
```

## 18.1 Comunicação entre agentes — sempre via artefatos, nunca em tempo real

```text
CONTRATOS · TAREFAS · ESTADO · DECISÕES · DOCUMENTAÇÃO · CÓDIGO · TESTES · GIT
```

Exemplo: `AGENTE FRONTEND → CONTRATO DA API → AGENTE BACKEND`, e `AGENTE BACKEND → CONTRATO DA API → AGENTE ANDROID`. Isso reduz drasticamente a complexidade — os agentes não precisam "conversar" entre si.

## 18.2 Fluxo de utilização prático (herdado do AgentMap)

```text
1. Criar projeto → 2. Criar agente → 3. Definir informações do agente
→ 4. Criar os arquivos → 5. Escrever instruções → 6. Definir personalidade
→ 7. Definir habilidades → 8. Definir regras → 9. Definir contratos
→ 10. Definir contexto → 11. Adicionar documentação → 12. Utilizar com o agente
```

Depois, o uso do conteúdo com a ferramenta de IA acontece de duas formas:

1. **Copiar e colar** — abrir `instrucoes.md`, copiar o conteúdo, colar na configuração do agente.
2. **Apontar a pasta** — quando a ferramenta permite acesso a arquivos, fornecer o caminho (`.ia/agentes/backend/`) para o agente ler diretamente.

---

# 19. O QUE O GERENCIADOR DEVE FAZER

**Projetos:** criar, abrir, clonar, configurar, arquivar, versionar.
**Agentes:** cadastrar, configurar, ativar, desativar, definir função/permissões/ferramentas/modelo/domínio.
**Contratos:** criar, editar, versionar, validar, aprovar, acompanhar dependências.
**Tarefas:** criar, planejar, dividir, atribuir, priorizar, bloquear, liberar, acompanhar, revisar, concluir.
**Contexto:** selecionar, montar, versionar, reduzir, atualizar.
**Git:** acompanhar, consultar, registrar, comparar, detectar conflitos.
**Qualidade:** acompanhar testes, revisões, critérios de aceitação/conclusão.
**Segurança:** permissões, comandos, arquivos, ambientes, auditoria.
**Auditoria:** registrar eventos, manter histórico, rastrear alterações.

---

# 20. O QUE O GERENCIADOR NÃO DEVE FAZER (reforço final)

```text
ser uma IA gigante
substituir todos os agentes
tomar decisões humanas críticas
editar código automaticamente sem autorização
permitir acesso irrestrito ao computador
misturar todos os contextos
manter toda a memória somente em banco interno
criar dependência obrigatória de um único modelo
```

O gerenciador é **a infraestrutura de governança e organização** — não o cérebro que decide ou executa.

---

# 21. ROTEIRO DE IMPLEMENTAÇÃO PARA O AGENTE ARQUITETO

## Etapa 1 — Estrutura base
- [ ] Criar repositório do gerenciador (seção 5)
- [ ] Criar esqueleto do backend (Node.js + TypeScript)
- [ ] Criar esqueleto do frontend (HTML/CSS/JS)
- [ ] Implementar criação da estrutura `.ia/` completa (seção 6) ao criar um novo projeto
- [ ] Implementar criação da estrutura de agentes por projeto

## Etapa 2 — Arquivos e validação
- [ ] Gerenciamento de arquivos e pastas (criar, ler, editar, excluir) com proteção contra path traversal
- [ ] Editor Markdown e editor JSON na interface
- [ ] Validação de JSON contra os esquemas da seção 16
- [ ] Pesquisa de informações entre projetos/agentes/tarefas

## Etapa 3 — Banco (PostgreSQL)
- [ ] Configurar PostgreSQL local
- [ ] Criar tabelas mínimas de metadados (projetos, agentes, tarefas — índices e relacionamentos, não conteúdo)
- [ ] Criar relacionamento projeto/agente/tarefa
- [ ] Sincronizar metadados a partir dos arquivos `.json` (arquivo como fonte, banco como índice)

## Etapa 4 — Núcleo de governança
- [ ] Implementar modelo de tarefa estruturada e máquina de estados (seção 8)
- [ ] Implementar montagem do pacote de contexto mínimo (seção 9)
- [ ] Implementar contratos versionados e mapa de dependências (seção 10)
- [ ] Implementar permissões, domínios e ferramentas por agente (seção 11)
- [ ] Implementar detecção de conflitos entre tarefas/agentes (seção 12.1)
- [ ] Implementar registro de decisões, riscos e problemas conhecidos (seção 12.2–12.4)
- [ ] Implementar fluxo de aprovação humana (seção 12.7)

## Etapa 5 — Git e auditoria
- [ ] Consulta de estado do Git (ramo, alterações, commits, conflitos)
- [ ] Registro de eventos de auditoria para toda ação relevante

## Etapa 6 — Interface
- [ ] Painel de projetos, agentes, tarefas, contratos, estado, riscos, problemas, decisões, testes, revisões, Git, auditoria, configurações (seção 17)
- [ ] Explorador de arquivos + visualizador/validador JSON e Markdown
- [ ] Copiar conteúdo / abrir pasta no Windows / visualizar caminho real

## Etapa 7 — Integração manual com agentes de IA
- [ ] Copiar instruções / configurações / caminho da pasta
- [ ] Gerar conjunto de contexto consolidado por tarefa
- [ ] Exportar configuração de agente

## Etapa 8 — Segurança do gerenciador
- [ ] Validação de entradas e caminhos em todas as rotas
- [ ] Proteção contra sobrescrita acidental e confirmação de exclusões
- [ ] Backups automáticos de `.ia/` antes de operações destrutivas

---

# 22. PRINCÍPIO FINAL

```text
                         SER HUMANO
                              │
                              ▼
                     GERENCIADOR LOCAL
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
          CONTRATOS         TAREFAS         ESTADO
             │                │                │
             └────────────────┼────────────────┘
                              ▼
                           CONTEXTO
                              │
                              ▼
                           AGENTE
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
                 CÓDIGO              TESTES
                    │                   │
                    └─────────┬─────────┘
                              ▼
                           REVISÃO
                              │
                              ▼
                          APROVAÇÃO
                              │
                              ▼
                             GIT
                              │
                              ▼
                       NOVO ESTADO
```

O objetivo não é criar **"várias IAs conversando"**. O objetivo é criar:

> Uma empresa de software virtual organizada, onde agentes especializados recebem tarefas, seguem contratos, respeitam limites, produzem resultados verificáveis e deixam um histórico completo de tudo que fizeram — enquanto o Proprietário mantém, em todo momento, o controle sobre decisões críticas.

Complementarmente, a raiz de tudo (herdada do AgentMap) permanece simples:

```text
PROJETO → AGENTES → INFORMAÇÕES → ARQUIVOS LOCAIS → AGENTE DE IA
```

**Organize os arquivos. Organize o contexto. Governe o trabalho. Trabalhe melhor com seus agentes.**

---

# 23. STATUS

**Projeto pessoal em desenvolvimento para Windows 11**, priorizando simplicidade, organização, facilidade de manutenção, acesso direto aos arquivos e governança verificável do trabalho dos agentes de IA. Licença a definir posteriormente.
