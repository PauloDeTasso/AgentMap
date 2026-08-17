# GERENCIADOR LOCAL DE PROJETOS PARA AGENTES DE IA
## Modelo de organização, contratos, agentes, tarefas, governança e execução

---

# 1. VISÃO GERAL

O sistema será um **Gerenciador Local de Projetos para Agentes de IA**.

Ele não será um concentrador de conversas entre agentes.

Ele será responsável por organizar:

- projetos;
- agentes;
- contratos;
- tarefas;
- contexto;
- conhecimento;
- estado do projeto;
- dependências;
- permissões;
- ferramentas;
- documentos;
- decisões;
- testes;
- revisões;
- Git;
- auditoria;
- qualidade;
- segurança;
- aprovação humana.

O princípio fundamental será:

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

O gerenciador organiza.

O agente executa.

O Git registra.

Os testes verificam.

A revisão valida.

O ser humano decide sobre mudanças críticas.

---

# 2. PRINCÍPIO DE FUNCIONAMENTO

Os agentes devem funcionar como funcionários especializados de uma empresa.

Cada agente possui:

- identidade;
- função;
- responsabilidades;
- conhecimentos;
- domínio;
- permissões;
- ferramentas;
- contratos;
- procedimentos;
- limites;
- critérios de qualidade;
- critérios de segurança;
- critérios de conclusão.

Um agente não deve simplesmente receber:

```text
"Faça o login."
```

Ele deverá receber uma tarefa estruturada contendo:

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

---

# 3. HIERARQUIA ORGANIZACIONAL

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

Nem todos precisam ser agentes diferentes.

Um mesmo agente de IA pode assumir diferentes funções através de:

- perfil;
- contrato;
- instruções;
- permissões;
- contexto;
- ferramentas;
- domínio.

---

# 4. PROPRIETÁRIO DO PRODUTO

Representa a autoridade humana.

## Responsabilidades

- definir objetivos;
- definir prioridades;
- aprovar requisitos;
- aprovar mudanças importantes;
- aprovar mudanças arquiteturais;
- aprovar alterações de segurança críticas;
- resolver conflitos de requisitos;
- aceitar ou rejeitar entregas;
- autorizar exceções.

## Regra

O agente nunca deve assumir autoridade humana em decisões críticas.

---

# 5. AGENTE PLANEJADOR / ARQUITETO

Responsável por transformar necessidades em engenharia executável.

## Responsabilidades

- analisar requisitos;
- identificar ambiguidades;
- decompor funcionalidades;
- definir arquitetura;
- identificar dependências;
- criar tarefas;
- definir ordem de execução;
- definir critérios de aceitação;
- identificar riscos;
- propor contratos;
- criar decisões arquiteturais;
- identificar impactos;
- planejar testes;
- planejar segurança;
- planejar implantação.

## Produções

```text
PLANO
ROTEIRO
TAREFAS
DEPENDÊNCIAS
CONTRATOS
DECISÕES ARQUITETURAIS
CRITÉRIOS DE ACEITAÇÃO
RISCOS
PLANO DE TESTES
PLANO DE IMPLANTAÇÃO
```

## Não deve

- inventar requisitos;
- alterar arquitetura sem aprovação;
- executar alterações fora de sua responsabilidade;
- ignorar restrições existentes.

---

# 6. AGENTE FRONTEND

Ambiente principal:

```text
VS Code
Kilo Code
```

## Responsabilidade

```text
/frontend/**
```

## Conhecimentos

- HTML5;
- CSS3;
- JavaScript;
- DOM;
- Fetch;
- JSON;
- acessibilidade;
- responsividade;
- experiência do usuário;
- validação;
- tratamento de erros;
- integração com API;
- segurança no navegador;
- prevenção contra XSS;
- armazenamento seguro;
- desempenho.

## Deve consultar

```text
CONTRATO DO PROJETO
CONTRATO DO FRONTEND
CONTRATO DA API
CONTRATO DE SEGURANÇA
CONTRATO VISUAL
ESTADO ATUAL
TAREFA
```

## Não pode alterar

```text
/backend/**
/android/**
/infraestrutura/**
```

sem autorização.

---

# 7. AGENTE BACKEND

Ambiente:

```text
VS Code
Kilo Code
```

## Responsabilidade

```text
/backend/**
```

## Conhecimentos

- Node.js;
- TypeScript;
- Express;
- API REST;
- JSON;
- DTOs;
- validação;
- PostgreSQL;
- migrações;
- tratamento de exceções;
- registros;
- testes;
- CORS;
- segurança;
- observabilidade.

## Arquitetura

- DDD;
- Arquitetura Limpa;
- Arquitetura em Camadas;
- SOLID;
- GRASP;
- padrões de projeto;
- separação de responsabilidades;
- baixo acoplamento;
- alta coesão.

---

# 8. AGENTE DE BANCO DE DADOS

Pode inicialmente ser responsabilidade do agente de backend.

Posteriormente pode ser separado.

## Responsabilidade

```text
/banco/**
```

## Conhecimentos

- PostgreSQL;
- modelagem;
- normalização;
- índices;
- chaves;
- restrições;
- relacionamentos;
- transações;
- concorrência;
- desempenho;
- migrações;
- integridade;
- recuperação;
- segurança.

## Regra fundamental

Nenhuma alteração estrutural deve ser feita diretamente em produção.

Fluxo:

```text
ALTERAÇÃO
   ↓
MIGRAÇÃO
   ↓
TESTE
   ↓
REVISÃO
   ↓
APROVAÇÃO
   ↓
PRODUÇÃO
```

---

# 9. AGENTE ANDROID

Ambiente:

```text
Android Studio
Kilo Code
```

## Responsabilidade

```text
/android/**
```

## Conhecimentos

- Kotlin;
- Android;
- Gradle;
- componentes do Android;
- ciclo de vida;
- modelos de estado;
- corrotinas;
- comunicação HTTP;
- JSON;
- API REST;
- armazenamento seguro;
- permissões;
- câmera;
- arquivos;
- notificações;
- testes;
- desempenho;
- compatibilidade.

## Deve respeitar

```text
CONTRATO DO ANDROID
CONTRATO DA API
CONTRATO DE SEGURANÇA
CONTRATO VISUAL
```

---

# 10. AGENTE DE INFRAESTRUTURA E IMPLANTAÇÃO

Ambiente:

```text
VS Code
Terminal
Linux
VPS
```

## Responsabilidade

```text
/infraestrutura/**
/docker/**
/implantacao/**
```

## Conhecimentos

- Linux;
- Docker;
- Docker Compose;
- Nginx;
- HTTPS;
- certificados;
- firewall;
- rede;
- DNS;
- variáveis de ambiente;
- segredos;
- cópias de segurança;
- restauração;
- implantação;
- reversão;
- registros;
- monitoramento.

## Regra

Segredos nunca devem ser armazenados no código ou no Git.

---

# 11. AGENTE DE QUALIDADE E TESTES

Responsável pela validação do produto.

## Deve verificar

- requisitos;
- critérios de aceitação;
- comportamento esperado;
- casos normais;
- casos extremos;
- erros;
- segurança;
- regressões;
- compatibilidade;
- integração.

## Tipos de testes

```text
TESTE UNITÁRIO
TESTE DE INTEGRAÇÃO
TESTE DE API
TESTE DE CONTRATO
TESTE DE SEGURANÇA
TESTE DE INTERFACE
TESTE DE PONTA A PONTA
TESTE DE REGRESSÃO
TESTE DE DESEMPENHO
```

Código compilando não significa funcionalidade concluída.

---

# 12. AGENTE DE SEGURANÇA

A segurança será transversal a todos os agentes.

## Deve verificar

- XSS;
- SQL Injection;
- exposição de informações;
- CORS;
- validação;
- sanitização;
- criptografia;
- proteção de segredos;
- dependências;
- registros;
- permissões.

## Segurança acontece em todas as fases

```text
PLANEJAMENTO
      ↓
DESENVOLVIMENTO
      ↓
TESTES
      ↓
REVISÃO
      ↓
IMPLANTAÇÃO
      ↓
MONITORAMENTO
```

---

# 13. AGENTE DE REVISÃO DE CÓDIGO

Atua como um engenheiro sênior.

## Verifica

- arquitetura;
- legibilidade;
- simplicidade;
- SOLID;
- coesão;
- acoplamento;
- duplicação;
- desempenho;
- segurança;
- testes;
- tratamento de erros;
- contratos;
- padrões do projeto.

Não deve simplesmente dizer:

```text
"Está bom."
```

Deve produzir uma revisão verificável.

---

# 14. AGENTE DE DOCUMENTAÇÃO

Responsável por manter a documentação sincronizada com o sistema real.

## Documenta

- arquitetura;
- instalação;
- configuração;
- desenvolvimento;
- API;
- banco;
- implantação;
- segurança;
- decisões;
- solução de problemas;
- histórico;
- processos.

## Regra

Não documentar comportamento que não existe.

---

# 15. AGENTE DE OBSERVABILIDADE

Pode inicialmente pertencer à infraestrutura.

Responsável por:

- registros;
- métricas;
- verificações de saúde;
- monitoramento;
- alertas;
- desempenho;
- disponibilidade;
- diagnóstico.

---

# 16. AGENTE DE DESEMPENHO

Pode ser adicionado posteriormente.

Responsável por analisar:

- tempo de resposta;
- consumo de memória;
- processamento;
- consultas;
- índices;
- rede;
- carregamento do frontend;
- desempenho Android;
- gargalos;
- escalabilidade.

---

# 17. CONTRATO DO PROJETO

Arquivo:

```text
.ia/contratos/CONTRATO_PROJETO.md
```

É a constituição do projeto.

## Contém

- objetivo;
- escopo;
- tecnologias;
- arquitetura;
- padrões;
- convenções;
- nomenclatura;
- segurança;
- Git;
- testes;
- documentação;
- qualidade;
- governança;
- permissões;
- processo de mudanças;
- regras dos agentes;
- critérios de conclusão.

Nenhum agente deve ignorá-lo.

---

# 18. CONTRATOS ESPECIALIZADOS

```text
.ia/contratos/
│
├── CONTRATO_PROJETO.md
├── CONTRATO_ARQUITETURA.md
├── CONTRATO_API.md
├── CONTRATO_BANCO.md
├── CONTRATO_FRONTEND.md
├── CONTRATO_ANDROID.md
├── CONTRATO_SEGURANCA.md
├── CONTRATO_INFRAESTRUTURA.md
├── CONTRATO_TESTES.md
├── CONTRATO_DOCUMENTACAO.md
└── CONTRATO_INTERFACE.md
```

Cada contrato deve possuir:

```text
versão
data
autor
estado
dependências
regras
exceções
histórico de alterações
```

---

# 19. CONTRATO DA API

Esse é um dos contratos mais importantes.

A API será o ponto de integração entre:

```text
FRONTEND
    │
    ▼
   API
    ▲
    │
ANDROID
```

O contrato deverá definir:

- endereços;
- métodos;
- parâmetros;
- cabeçalhos;
- requisições;
- respostas;
- códigos HTTP;
- mensagens de erro;
- paginação;
- filtros;
- ordenação;
- versões;
- limites;
- formatos JSON.

A definição da API deve existir antes de consumidores implementarem comportamentos dependentes dela.

---

# 20. CONTRATO DE SEGURANÇA

Define obrigatoriamente:

- criptografia;
- chaves;
- segredos;
- validação;
- sanitização;
- limites;
- registros;
- retenção;
- tratamento de incidentes.

---

# 21. IDENTIDADE DO AGENTE

Cada agente terá um perfil.

Exemplo:

```text
.ia/agentes/frontend.md
```

Deve conter:

```text
NOME
FUNÇÃO
RESPONSABILIDADE
DOMÍNIO
CONHECIMENTOS
CONTRATOS OBRIGATÓRIOS
ARQUIVOS PERMITIDOS
ARQUIVOS PROIBIDOS
FERRAMENTAS PERMITIDAS
COMANDOS PERMITIDOS
REGRAS DE SEGURANÇA
REGRAS DE QUALIDADE
REGRAS DE ENTREGA
CONDIÇÕES DE PARADA
```

---

# 22. PACOTE DE CONTEXTO

Todo agente recebe um contexto controlado.

```text
IDENTIDADE
      +
CONTRATOS
      +
TAREFA
      +
ESTADO
      +
DEPENDÊNCIAS
      +
ARQUIVOS RELEVANTES
      +
DECISÕES
      +
RESTRIÇÕES
      +
CRITÉRIOS DE ACEITAÇÃO
```

Não devemos simplesmente entregar o projeto inteiro ao modelo.

O gerenciador deverá montar o **contexto mínimo necessário**.

Isso reduz:

- consumo de contexto;
- distração;
- erros;
- informações conflitantes;
- alterações indevidas.

---

# 23. MEMÓRIA DO PROJETO

A memória será dividida em três grupos.

## Conhecimento permanente

```text
arquitetura
contratos
padrões
regras
```

## Estado atual

```text
tarefas
progresso
bloqueios
versão
problemas
```

## Histórico

```text
decisões
alterações
revisões
commits
eventos
```

Essa separação evita uma memória única gigantesca.

---

# 24. TAREFAS

Toda tarefa deverá possuir:

```text
identificador
título
objetivo
descrição
agente responsável
domínio
prioridade
estado
dependências
arquivos permitidos
arquivos proibidos
contratos obrigatórios
contexto
critérios de aceitação
testes obrigatórios
riscos
restrições
critério de conclusão
```

---

# 25. ESTADOS DA TAREFA

```text
RASCUNHO
↓
PLANEJADA
↓
PRONTA
↓
EM EXECUÇÃO
↓
EM TESTE
↓
EM REVISÃO
↓
AGUARDANDO APROVAÇÃO
↓
CONCLUÍDA
```

Estados especiais:

```text
BLOQUEADA
CANCELADA
REJEITADA
```

---

# 26. DEPENDÊNCIAS

O gerenciador deve compreender relações entre tarefas.

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

# 27. CRITÉRIOS DE ACEITAÇÃO

Cada tarefa precisa responder:

```text
O que deve funcionar?
Como saberemos que funciona?
Quais entradas são válidas?
Quais entradas são inválidas?
Qual resultado esperamos?
Quais erros devem ocorrer?
```

Isso evita interpretações diferentes entre agentes.

---

# 28. CRITÉRIO DE CONCLUSÃO

Uma tarefa não é concluída simplesmente porque o agente terminou de escrever código.

Deve atender:

```text
[ ] requisito implementado
[ ] critérios de aceitação atendidos
[ ] testes realizados
[ ] testes aprovados
[ ] segurança verificada
[ ] contratos respeitados
[ ] documentação atualizada
[ ] revisão realizada
[ ] alterações registradas
[ ] nenhuma pendência crítica
```

---

# 29. CONDIÇÕES DE PARADA

O agente deve parar quando encontrar:

```text
requisito ambíguo
contrato conflitante
dependência inexistente
mudança arquitetural
risco crítico
alteração destrutiva
migração perigosa
necessidade de segredo
arquivo fora do domínio
permissão insuficiente
teste crítico falhando
API incompatível
informação insuficiente
```

O comportamento correto não é inventar.

É:

```text
PARAR
↓
REGISTRAR
↓
EXPLICAR
↓
SOLICITAR DECISÃO
```

---

# 30. PERMISSÕES DOS AGENTES

As permissões devem ser separadas em:

```text
LER
CRIAR
ALTERAR
EXCLUIR
EXECUTAR
TESTAR
REVISAR
APROVAR
IMPLANTAR
```

Cada agente terá somente o necessário.

---

# 31. DOMÍNIOS DE ARQUIVOS

Exemplo:

```text
FRONTEND
/frontend/**

BACKEND
/backend/**

ANDROID
/android/**

BANCO
/banco/**

INFRAESTRUTURA
/infraestrutura/**
/docker/**
/implantacao/**

DOCUMENTAÇÃO
/docs/**

TESTES
/testes/**
```

Um agente não deve ultrapassar seu domínio sem autorização.

---

# 32. CONTROLE DE ALTERAÇÕES

Toda alteração relevante deve possuir:

```text
quem alterou
o que alterou
quando alterou
por que alterou
qual tarefa originou a alteração
qual contrato foi afetado
qual decisão autorizou
qual versão resultou
```

---

# 33. DECISÕES ARQUITETURAIS

Utilizar registros de decisão.

```text
.ia/decisoes/
├── DECISAO-001.md
├── DECISAO-002.md
└── DECISAO-003.md
```

Cada decisão deverá registrar:

```text
problema
contexto
alternativas
decisão
justificativa
impactos
consequências
estado
```

Uma decisão arquitetural não deve desaparecer apenas porque um novo agente entrou no projeto.

---

# 34. CONTROLE DE CONFLITOS

Se dois agentes quiserem alterar a mesma área:

```text
AGENTE A
      │
      ├── alteração
      │
      ▼
    conflito
      ▲
      │
      └── alteração
AGENTE B
```

O gerenciador deve:

1. detectar;
2. bloquear a execução conflitante;
3. informar os agentes;
4. identificar as tarefas envolvidas;
5. solicitar revisão;
6. evitar sobrescrita silenciosa.

---

# 35. GIT

O Git será o histórico técnico oficial.

O gerenciador deverá acompanhar:

- ramo;
- estado;
- alterações;
- diferença entre versões;
- commits;
- tarefas;
- revisões;
- conflitos;
- integrações;
- versões.

Idealmente:

```text
TAREFA
   ↓
RAMO
   ↓
IMPLEMENTAÇÃO
   ↓
TESTES
   ↓
REVISÃO
   ↓
INTEGRAÇÃO
```

---

# 36. AUDITORIA

O gerenciador deverá possuir registro de eventos.

Exemplos:

```text
agente criado
tarefa criada
tarefa atribuída
contrato alterado
agente executado
arquivo alterado
teste executado
revisão realizada
aprovação realizada
alteração rejeitada
implantação realizada
```

Isso permite descobrir:

> Quem fez o quê, quando, por quê e em qual tarefa.

---

# 37. SEGURANÇA DO PRÓPRIO GERENCIADOR

O gerenciador também precisa ser seguro.

Deve considerar:

- proteção de arquivos;
- validação de caminhos;
- prevenção contra travessia de diretórios;
- proteção contra execução arbitrária;
- proteção contra comandos perigosos;
- isolamento de processos;
- controle de permissões;
- proteção de segredos;
- registros de auditoria;
- cópias de segurança;
- recuperação.

O gerenciador não pode virar uma porta para qualquer agente executar qualquer comando no computador.

---

# 38. FERRAMENTAS DOS AGENTES

Cada agente terá um conjunto de ferramentas permitido.

Exemplo:

```text
LER ARQUIVO
CRIAR ARQUIVO
ALTERAR ARQUIVO
EXECUTAR TESTE
EXECUTAR COMPILADOR
CONSULTAR GIT
CRIAR COMMIT
```

Mas não necessariamente:

```text
ALTERAR INFRAESTRUTURA
EXECUTAR COMANDOS ADMINISTRATIVOS
ALTERAR SEGREDOS
IMPLANTAR PRODUÇÃO
```

Ferramentas também fazem parte da governança.

---

# 39. AMBIENTES

Separar:

```text
DESENVOLVIMENTO
TESTE
HOMOLOGAÇÃO
PRODUÇÃO
```

Um agente de desenvolvimento não deve ter automaticamente acesso à produção.

---

# 40. APROVAÇÃO HUMANA

Algumas operações exigirão autorização.

Exemplos:

```text
alteração arquitetural
alteração destrutiva no banco
alteração de segurança crítica
alteração de contrato incompatível
implantação em produção
remoção de dados
alteração de infraestrutura crítica
```

O gerenciador deverá apresentar:

```text
O QUE SERÁ ALTERADO
POR QUE
IMPACTO
RISCOS
AGENTE RESPONSÁVEL
TAREFA
ARQUIVOS AFETADOS
```

E então:

```text
APROVAR
ou
REJEITAR
```

---

# 41. RECUPERAÇÃO E REVERSÃO

Toda operação importante deve permitir recuperação.

Devemos prever:

```text
cópia de segurança
histórico
versão anterior
reversão
restauração
cancelamento
```

Especialmente para:

- banco;
- infraestrutura;
- implantação;
- contratos;
- configurações.

---

# 42. QUALIDADE DOS AGENTES

O gerenciador deverá permitir avaliar:

- tarefas concluídas;
- tarefas rejeitadas;
- quantidade de correções;
- testes aprovados;
- falhas;
- violações de contrato;
- alterações fora do domínio;
- tempo de execução;
- retrabalho.

Isso não significa transformar a IA em um funcionário com "salário".

É uma forma de medir a **qualidade operacional do agente**.

---

# 43. CONTROLE DE MODELOS

O agente deve possuir configuração separada de:

```text
função
modelo
provedor
modo
limite de contexto
temperatura
ferramentas
permissões
```

Assim podemos trocar o modelo sem alterar a função.

Exemplo:

```text
FUNÇÃO:
Agente Frontend

MODELO:
Modelo A

FERRAMENTAS:
leitura + escrita + testes

DOMÍNIO:
/frontend/**
```

A função não fica presa ao modelo.

---

# 44. CONTROLE DE CONTEXTO

O gerenciador deve evitar enviar informações desnecessárias.

Deve selecionar:

```text
contratos relevantes
tarefa
arquivos relevantes
dependências
decisões relevantes
estado atual
histórico necessário
```

E evitar:

```text
arquivos irrelevantes
histórico excessivo
documentação duplicada
informações conflitantes
```

---

# 45. CONTROLE DE VERSÕES DOS CONTRATOS

Contratos também evoluem.

Exemplo:

```text
Contrato da API
versão 1
versão 2
versão 3
```

Uma tarefa criada para a versão anterior deve saber disso.

Isso evita:

```text
Frontend usando API antiga
Backend usando API nova
Android usando outra interpretação
```

---

# 46. COMPATIBILIDADE

Quando um contrato mudar, o gerenciador deverá identificar:

```text
QUEM DEPENDE DESTE CONTRATO?
```

E gerar ou atualizar tarefas de impacto.

Exemplo:

```text
ALTERAÇÃO API
      ↓
BACKEND
      ↓
FRONTEND
      ↓
ANDROID
      ↓
TESTES
      ↓
DOCUMENTAÇÃO
```

---

# 47. REGISTRO DE RISCOS

O projeto terá:

```text
.ia/riscos/
```

Cada risco deverá possuir:

```text
descrição
probabilidade
impacto
gravidade
causa
mitigação
responsável
estado
```

---

# 48. PROBLEMAS CONHECIDOS

Separar problemas conhecidos de tarefas.

```text
.ia/problemas/
```

Assim o agente sabe:

```text
Existe um problema conhecido nesta área.
Não tente "corrigi-lo" automaticamente se ele não fizer parte da tarefa.
```

Isso evita alterações inesperadas.

---

# 49. BASE DE CONHECIMENTO

Além dos contratos, o projeto poderá possuir:

```text
.ia/conhecimento/
```

Com:

- padrões;
- exemplos;
- decisões;
- regras;
- procedimentos;
- soluções conhecidas;
- limitações;
- convenções.

---

# 50. PROCEDIMENTOS OPERACIONAIS

Criar procedimentos padronizados.

Exemplo:

```text
.ia/procedimentos/
├── CRIAR_TAREFA.md
├── IMPLEMENTAR_TAREFA.md
├── REVISAR_CODIGO.md
├── EXECUTAR_TESTES.md
├── CRIAR_MIGRACAO.md
├── ALTERAR_API.md
├── IMPLANTAR.md
└── REVERTER_IMPLANTACAO.md
```

Isso é equivalente aos procedimentos internos de uma empresa.

---

# 51. ESTRUTURA REVISADA DO PROJETO

```text
projeto/
│
├── .ia/
│   │
│   ├── agentes/
│   │   ├── planejador.md
│   │   ├── frontend.md
│   │   ├── backend.md
│   │   ├── banco.md
│   │   ├── android.md
│   │   ├── infraestrutura.md
│   │   ├── testes.md
│   │   ├── seguranca.md
│   │   ├── revisor.md
│   │   ├── documentacao.md
│   │   ├── observabilidade.md
│   │   └── desempenho.md
│   │
│   ├── contratos/
│   │   ├── CONTRATO_PROJETO.md
│   │   ├── CONTRATO_ARQUITETURA.md
│   │   ├── CONTRATO_API.md
│   │   ├── CONTRATO_BANCO.md
│   │   ├── CONTRATO_FRONTEND.md
│   │   ├── CONTRATO_ANDROID.md
│   │   ├── CONTRATO_SEGURANCA.md
│   │   ├── CONTRATO_INFRAESTRUTURA.md
│   │   ├── CONTRATO_TESTES.md
│   │   ├── CONTRATO_DOCUMENTACAO.md
│   │   └── CONTRATO_INTERFACE.md
│   │
│   ├── tarefas/
│   │   ├── rascunho/
│   │   ├── planejadas/
│   │   ├── prontas/
│   │   ├── execucao/
│   │   ├── testes/
│   │   ├── revisao/
│   │   ├── aprovacao/
│   │   ├── bloqueadas/
│   │   └── concluidas/
│   │
│   ├── estado/
│   │   ├── ESTADO_ATUAL.md
│   │   └── STATUS_PROJETO.json
│   │
│   ├── decisoes/
│   │   └── ADR/
│   │
│   ├── riscos/
│   │
│   ├── problemas/
│   │
│   ├── conhecimento/
│   │
│   ├── procedimentos/
│   │
│   ├── contexto/
│   │   └── agentes/
│   │
│   ├── politicas/
│   │   ├── POLITICA_SEGURANCA.md
│   │   ├── POLITICA_GIT.md
│   │   ├── POLITICA_QUALIDADE.md
│   │   ├── POLITICA_PERMISSOES.md
│   │   └── POLITICA_MUDANCAS.md
│   │
│   └── auditoria/
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

---

# 52. FLUXO COMPLETO

```text
NECESSIDADE
    ↓
PROPRIETÁRIO DO PRODUTO
    ↓
PLANEJADOR / ARQUITETO
    ↓
ANÁLISE
    ↓
ARQUITETURA
    ↓
CONTRATOS
    ↓
TAREFAS
    ↓
DEPENDÊNCIAS
    ↓
CONTEXTO
    ↓
AGENTE RESPONSÁVEL
    ↓
IMPLEMENTAÇÃO
    ↓
TESTES
    ↓
SEGURANÇA
    ↓
REVISÃO
    ↓
APROVAÇÃO
    ↓
GIT
    ↓
ATUALIZAÇÃO DO ESTADO
    ↓
DOCUMENTAÇÃO
    ↓
PRÓXIMA TAREFA
```

---

# 53. COMUNICAÇÃO ENTRE AGENTES

Os agentes não precisam conversar diretamente.

A comunicação acontece através de artefatos:

```text
CONTRATOS
TAREFAS
ESTADO
DECISÕES
DOCUMENTAÇÃO
CÓDIGO
TESTES
GIT
```

Portanto:

```text
AGENTE FRONTEND
       ↓
CONTRATO DA API
       ↓
AGENTE BACKEND
```

e:

```text
AGENTE BACKEND
       ↓
CONTRATO DA API
       ↓
AGENTE ANDROID
```

Isso reduz drasticamente a complexidade.

---

# 54. O QUE O GERENCIADOR DEVE FAZER

O gerenciador será responsável por:

## Projetos

- criar;
- abrir;
- clonar;
- configurar;
- arquivar;
- versionar.

## Agentes

- cadastrar;
- configurar;
- ativar;
- desativar;
- definir função;
- definir permissões;
- definir ferramentas;
- definir modelo;
- definir domínio.

## Contratos

- criar;
- editar;
- versionar;
- validar;
- aprovar;
- acompanhar dependências.

## Tarefas

- criar;
- planejar;
- dividir;
- atribuir;
- priorizar;
- bloquear;
- liberar;
- acompanhar;
- revisar;
- concluir.

## Contexto

- selecionar;
- montar;
- versionar;
- reduzir;
- atualizar.

## Git

- acompanhar;
- consultar;
- registrar;
- comparar;
- detectar conflitos.

## Qualidade

- acompanhar testes;
- revisões;
- critérios de aceitação;
- critérios de conclusão.

## Segurança

- permissões;
- comandos;
- arquivos;
- ambientes;
- auditoria.

## Auditoria

- registrar eventos;
- manter histórico;
- rastrear alterações.

---

# 55. O QUE O GERENCIADOR NÃO DEVE FAZER

Ele não deve tentar:

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

Ele deve ser **a infraestrutura de governança e organização**.

---

# 56. PRINCÍPIO FINAL

A arquitetura completa pode ser resumida assim:

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

---

# 57. CONJUNTO INICIAL DE AGENTES

Para a primeira versão do gerenciador:

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

Para evolução posterior:

```text
11. Observabilidade
12. Desempenho
13. Automação de Testes
```

Não é necessário possuir treze modelos diferentes.

O mesmo Kilo Code pode executar funções diferentes utilizando:

```text
PERFIL
+
CONTRATO
+
PERMISSÕES
+
CONTEXTO
+
FERRAMENTAS
+
TAREFA
```

---

# 58. PRINCÍPIO DE ENGENHARIA DO SISTEMA

O objetivo não é criar:

```text
"várias IAs conversando"
```

O objetivo é criar:

```text
"uma empresa de software virtual organizada,
onde agentes especializados recebem tarefas,
seguem contratos, respeitam limites,
produzem resultados verificáveis e deixam
um histórico completo de tudo que fizeram."
```

Essa é a base que deverá orientar toda a engenharia do **Gerenciador Local de Projetos para Agentes**.