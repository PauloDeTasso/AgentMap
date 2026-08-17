# AgentMap

> Gerenciador local de informações de agentes de IA por projeto.

## 📌 O que é

O **AgentMap** é uma aplicação pessoal e local para Windows, Linux e macOS criada para organizar todas as informações que utilizo com meus agentes de Inteligência Artificial.

O objetivo é simples:

> **Manter, em um único lugar, as instruções, personalidades, habilidades, regras, contratos, contexto, documentação, memória e outros arquivos necessários para cada agente em cada projeto.**

O AgentMap **não é um orquestrador de agentes**.

Ele não executa agentes automaticamente, não distribui tarefas, não decide qual agente deve trabalhar e não tenta automatizar o desenvolvimento.

Todo o trabalho dos agentes continuará sendo realizado manualmente através das ferramentas utilizadas no desenvolvimento.

---

# 🎯 Objetivo

O problema que o AgentMap resolve é a organização das informações utilizadas pelos agentes.

Em um projeto posso utilizar vários agentes diferentes.

Por exemplo:

```text
Projeto
│
├── Agente Arquiteto
├── Agente Backend
├── Agente Frontend
├── Agente Android
├── Agente Banco de Dados
├── Agente Segurança
└── Agente Testes
```

Cada agente pode precisar de informações diferentes.

O AgentMap permite manter essas informações separadas e organizadas.

```text
Projeto
│
├── Agente Arquiteto
│   ├── instruções
│   ├── personalidade
│   ├── habilidades
│   ├── regras
│   ├── contratos
│   └── contexto
│
├── Agente Backend
│   ├── instruções
│   ├── personalidade
│   ├── habilidades
│   ├── regras
│   ├── contratos
│   └── contexto
│
└── Agente Frontend
    ├── instruções
    ├── personalidade
    ├── habilidades
    ├── regras
    ├── contratos
    └── contexto
```

---

# 🖥️ Funcionamento local

O AgentMap será executado **somente na máquina local com Windows, Linux e macOS**.

Não existe, neste momento, objetivo de:

- disponibilizar o sistema na Internet;
- criar um serviço SaaS;
- atender vários usuários;
- criar infraestrutura em nuvem;
- criar um sistema multiusuário;
- criar uma plataforma comercial;
- escalar para milhares de projetos;
- orquestrar agentes automaticamente.

O objetivo é facilitar meu próprio trabalho.

```text
Windows, Linux e macOS
   │
   ▼
AgentMap
   │
   ├── Projetos
   │
   ├── Agentes
   │
   └── Arquivos de configuração
```

---

# 📂 O principal são os arquivos

O AgentMap deverá trabalhar principalmente com **arquivos reais no sistema de arquivos**.

Os formatos poderão incluir:

```text
JSON
Markdown
TXT
YAML
XML
CSV
```

e outros formatos que sejam úteis.

Exemplos:

```text
instrucoes.json
personalidade.md
habilidades.json
regras.md
contratos.json
contexto.md
memoria.md
README.md
arquitetura.md
```

O objetivo não é esconder essas informações dentro do banco de dados.

Quero poder abrir a pasta no Windows e enxergar os arquivos.

---

# 📁 Estrutura dos projetos

Uma estrutura inicial poderá ser:

```text
AgentMap/
│
├── projetos/
│
│   ├── ProjetoA/
│   │
│   │   ├── agentes/
│   │   │
│   │   │   ├── arquiteto/
│   │   │   │   ├── instrucoes.md
│   │   │   │   ├── personalidade.md
│   │   │   │   ├── habilidades.json
│   │   │   │   ├── regras.md
│   │   │   │   ├── contratos.json
│   │   │   │   ├── contexto.md
│   │   │   │   └── memoria.md
│   │   │   │
│   │   │   ├── backend/
│   │   │   │   ├── instrucoes.md
│   │   │   │   ├── personalidade.md
│   │   │   │   ├── habilidades.json
│   │   │   │   ├── regras.md
│   │   │   │   ├── contratos.json
│   │   │   │   └── contexto.md
│   │   │   │
│   │   │   └── frontend/
│   │   │       ├── instrucoes.md
│   │   │       ├── personalidade.md
│   │   │       ├── habilidades.json
│   │   │       ├── regras.md
│   │   │       └── contexto.md
│   │   │
│   │   ├── projeto.json
│   │   └── README.md
│   │
│   └── ProjetoB/
│       └── ...
│
└── configuracao.json
```

A estrutura definitiva será definida durante a implementação.

---

# 🤖 Agentes

Um agente é simplesmente uma coleção organizada de informações.

Por exemplo:

```text
agentes/
└── arquiteto/
    ├── instrucoes.md
    ├── personalidade.md
    ├── habilidades.json
    ├── regras.md
    ├── contratos.json
    ├── contexto.md
    └── memoria.md
```

Esses arquivos podem posteriormente ser utilizados de duas formas.

## 1. Copiar e colar

Posso abrir o arquivo:

```text
instrucoes.md
```

copiar seu conteúdo e colocar diretamente nas configurações do agente.

---

## 2. Fazer o agente ler a pasta

Quando a ferramenta utilizada permitir acesso aos arquivos do projeto, o agente poderá receber a localização da pasta:

```text
projetos/ProjetoA/agentes/backend/
```

e ler os arquivos necessários.

Dessa forma, o próprio conjunto de arquivos funciona como a configuração/documentação do agente.

---

# 🧠 Informações de cada agente

Cada agente poderá possuir:

### Instruções

O que o agente deve fazer.

```text
instrucoes.md
```

### Personalidade

Como o agente deve se comportar.

```text
personalidade.md
```

### Habilidades

Conhecimentos e capacidades esperadas.

```text
habilidades.json
```

### Regras

Regras que devem ser obedecidas.

```text
regras.md
```

### Contratos

Estruturas e padrões que devem ser respeitados.

```text
contratos.json
```

### Contexto

Informações sobre o projeto que o agente precisa conhecer.

```text
contexto.md
```

### Memória

Informações persistentes que foram acumuladas durante o trabalho.

```text
memoria.md
```

### Conhecimento

Documentação adicional.

```text
conhecimento/
```

### Recursos

Arquivos e referências adicionais.

```text
recursos/
```

---

# 📄 JSON, Markdown e outros arquivos

O AgentMap não obrigará todas as informações a utilizarem o mesmo formato.

Cada formato será utilizado de acordo com sua finalidade.

## JSON

Preferencialmente para informações estruturadas.

Exemplo:

```text
habilidades.json
contratos.json
configuracao.json
projeto.json
agente.json
```

## Markdown

Preferencialmente para informações destinadas à leitura humana e pelos agentes.

Exemplo:

```text
instrucoes.md
personalidade.md
regras.md
contexto.md
memoria.md
arquitetura.md
```

## Outros formatos

Quando necessário:

```text
TXT
YAML
XML
CSV
```

O AgentMap deverá preservar os arquivos originais.

---

# 🗃️ PostgreSQL

O PostgreSQL fará parte do projeto, mas não será utilizado para armazenar obrigatoriamente todo o conteúdo dos agentes.

A prioridade será manter os arquivos no sistema de arquivos.

O PostgreSQL poderá armazenar informações auxiliares, como:

```text
projetos
agentes
relacionamentos
caminhos das pastas
metadados
categorias
identificadores
datas
versões
configurações
```

A arquitetura poderá funcionar assim:

```text
                 AgentMap
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
      PostgreSQL          Sistema de arquivos
          │                   │
      metadados           documentos
      referências         instruções
      relacionamentos     configurações
      configurações       conhecimento
```

Se durante o desenvolvimento descobrirmos que determinada informação não precisa do PostgreSQL, ela poderá simplesmente permanecer como arquivo.

**O arquivo é a informação principal.**

---

# 🖥️ Interface

A interface será simples e objetiva.

Tecnologias:

```text
HTML5
CSS3
JavaScript
```

A interface deverá permitir:

- criar projeto;
- abrir projeto;
- criar agente;
- visualizar agentes;
- criar arquivos;
- editar arquivos;
- abrir arquivos;
- visualizar estrutura de pastas;
- copiar conteúdo;
- pesquisar informações;
- visualizar JSON formatado;
- validar JSON;
- importar arquivos;
- exportar arquivos;
- abrir a pasta no Windows;
- visualizar o caminho real dos arquivos.

---

# ⚙️ Backend

O backend será:

```text
Node.js
TypeScript
```

O backend terá como principal responsabilidade:

- acessar o sistema de arquivos;
- criar diretórios;
- criar arquivos;
- ler arquivos;
- editar arquivos;
- excluir arquivos;
- validar JSON;
- acessar PostgreSQL;
- fornecer API local para o frontend;
- abrir/gerenciar projetos;
- manter os metadados dos projetos e agentes.

Não haverá necessidade de uma arquitetura distribuída.

Não haverá microsserviços.

Não haverá filas de mensagens.

Não haverá sistema de orquestração.

Não haverá infraestrutura de servidor remoto.

---

# 🔌 API local

O frontend conversará com o backend através de uma API local.

```text
HTML
CSS
JavaScript
     │
     │ HTTP + JSON
     ▼
Node.js + TypeScript
     │
     ├── Arquivos
     │
     └── PostgreSQL
```

Exemplos conceituais:

```text
GET    /api/projetos
POST   /api/projetos

GET    /api/agentes
POST   /api/agentes

GET    /api/projetos/{id}/agentes

GET    /api/arquivos
GET    /api/arquivos/conteudo

POST   /api/arquivos
PUT    /api/arquivos
DELETE /api/arquivos
```

Os endpoints serão definidos durante a implementação.

---

# 🔄 Fluxo de utilização

O uso pretendido é simples.

```text
1. Criar projeto
        ↓
2. Criar agente
        ↓
3. Definir informações do agente
        ↓
4. Criar os arquivos
        ↓
5. Escrever instruções
        ↓
6. Definir personalidade
        ↓
7. Definir habilidades
        ↓
8. Definir regras
        ↓
9. Definir contratos
        ↓
10. Definir contexto
        ↓
11. Adicionar documentação
        ↓
12. Utilizar os arquivos com o agente
```

Depois:

```text
AgentMap
   │
   ├── copiar conteúdo
   │
   └── fornecer caminho da pasta
             │
             ▼
          Agente
             │
             ▼
        Trabalha no projeto
```

---

# 📌 O AgentMap não faz

Para manter o projeto simples, o AgentMap **não terá como objetivo**:

- executar agentes;
- criar agentes automaticamente;
- escolher modelos de IA;
- decidir qual agente deve trabalhar;
- distribuir tarefas;
- criar workflows automáticos;
- controlar agentes;
- criar filas;
- coordenar agentes;
- hospedar modelos;
- executar LLMs;
- oferecer serviço online;
- atender múltiplos usuários;
- funcionar como SaaS;
- escalar horizontalmente;
- funcionar como plataforma comercial.

Essas responsabilidades pertencem às ferramentas que executam os agentes.

---

# 🔐 Segurança local

Mesmo sendo um sistema pessoal, o projeto deverá possuir cuidados básicos:

- validação de entradas;
- proteção contra `path traversal`;
- validação de caminhos;
- validação de JSON;
- proteção contra acesso a arquivos fora das áreas permitidas;
- tratamento seguro de erros;
- não executar arquivos arbitrários;
- não executar comandos do sistema sem autorização explícita;
- proteção contra sobrescrita acidental;
- confirmação para exclusões;
- cópia de segurança quando necessário.

---

# 📂 Estrutura inicial do repositório

```text
AgentMap/
│
├── backend/
│   ├── src/
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
├── projetos/
│
├── esquemas/
│
├── documentos/
│
├── exemplos/
│
├── scripts/
│
├── .editorconfig
├── .gitignore
├── CONTRIBUTING.md
├── LICENSE
├── README.md
└── SECURITY.md
```

---

# 🗺️ Exemplo de utilização

Suponha o projeto:

```text
PauloConsorcio
```

E três agentes:

```text
Arquiteto
Backend
Frontend
```

O AgentMap poderá manter:

```text
projetos/
└── PauloConsorcio/
    │
    ├── projeto.json
    │
    ├── agentes/
    │
    │   ├── arquiteto/
    │   │   ├── instrucoes.md
    │   │   ├── personalidade.md
    │   │   ├── habilidades.json
    │   │   ├── regras.md
    │   │   ├── contratos.json
    │   │   ├── contexto.md
    │   │   ├── memoria.md
    │   │   ├── conhecimento/
    │   │   └── recursos/
    │   │
    │   ├── backend/
    │   │   ├── instrucoes.md
    │   │   ├── personalidade.md
    │   │   ├── habilidades.json
    │   │   ├── regras.md
    │   │   ├── contratos.json
    │   │   ├── contexto.md
    │   │   └── conhecimento/
    │   │
    │   └── frontend/
    │       ├── instrucoes.md
    │       ├── personalidade.md
    │       ├── habilidades.json
    │       ├── regras.md
    │       ├── contratos.json
    │       └── contexto.md
    │
    └── documentacao/
        ├── arquitetura.md
        ├── banco.md
        ├── api.md
        └── regras-do-projeto.md
```

Assim, cada agente possui seu próprio conjunto de informações.

---

# 🛣️ Desenvolvimento

## Etapa 1 — Estrutura

- [ ] Criar repositório
- [ ] Criar backend
- [ ] Criar frontend
- [ ] Criar estrutura de projetos
- [ ] Criar estrutura de agentes

## Etapa 2 — Arquivos

- [ ] Criar gerenciamento de arquivos
- [ ] Criar gerenciamento de pastas
- [ ] Criar editor Markdown
- [ ] Criar editor JSON
- [ ] Criar validação JSON
- [ ] Criar pesquisa

## Etapa 3 — Banco

- [ ] Configurar PostgreSQL
- [ ] Criar tabelas mínimas
- [ ] Criar relacionamento projeto/agente
- [ ] Armazenar metadados

## Etapa 4 — Interface

- [ ] Painel de projetos
- [ ] Painel de agentes
- [ ] Explorador de arquivos
- [ ] Editor de arquivos
- [ ] Visualizador JSON
- [ ] Visualizador Markdown
- [ ] Copiar conteúdo
- [ ] Abrir pasta no Windows

## Etapa 5 — Integração manual com agentes

- [ ] Copiar instruções
- [ ] Copiar configurações
- [ ] Copiar caminho da pasta
- [ ] Gerar conjunto de contexto
- [ ] Gerar arquivos consolidados quando necessário
- [ ] Exportar configuração de agente

---

# 📌 Princípio principal

O AgentMap deve permanecer simples.

```text
        PROJETO
           │
           ▼
        AGENTES
           │
           ▼
       INFORMAÇÕES
           │
           ▼
      ARQUIVOS LOCAIS
           │
           ▼
      AGENTE DE IA
```

O sistema não precisa fazer mais do que isso.

O objetivo é **organizar o conhecimento e as configurações**, deixando a execução e o trabalho para os agentes.

---

# 📜 Licença

A licença será definida posteriormente.

---

# 📌 Status

**Projeto pessoal em desenvolvimento para Windows, Linux e macOS.**

O AgentMap é desenvolvido para uso local e pessoal, priorizando simplicidade, organização, facilidade de manutenção e acesso direto aos arquivos.

---

# AgentMap

**Organize os arquivos. Organize o contexto. Trabalhe melhor com seus agentes.**