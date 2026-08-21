# Plano de atualização do AgentMap Wakeup

## Objetivo

Atualizar o `.kilo/plugin/agentmap-wakeup.ts` para transformar o mecanismo atual de wake-up em um controlador robusto de estado de sessão, recuperação de erros, entrega direcionada de mensagens do AgentMap e heartbeat.

Não alterar o objetivo principal do plugin:

* detectar `session.idle`;
* verificar se existem mensagens/trabalho relevantes no AgentMap;
* acordar a sessão correta;
* recuperar sessões afetadas por erros recuperáveis;
* respeitar interrupções explícitas do usuário;
* utilizar heartbeat somente como mecanismo de segurança;
* evitar prompts duplicados;
* evitar que uma sessão receba mensagens destinadas a outra sessão.

Antes de modificar qualquer código, leia e compreenda:

1. `.kilo/plugin/agentmap-wakeup.ts`;
2. toda a documentação existente do AgentMap relacionada a monitoramento, mensagens, eventos, sessões, agentes, tarefas e handoffs;
3. contratos/tipos das respostas da API do AgentMap;
4. código que produz os eventos/mensagens consumidos pelo endpoint `/api/monitoramento/mensagens`;
5. documentação oficial atual do Kilo sobre Plugins, Events, Sessions, Agent Manager e SDK;
6. implementação atual do Kilo relacionada a `session.idle`, `session.error`, `tool.execute.after`, `chat.message` e envio de prompts para sessões.

Não invente campos ou endpoints do AgentMap. Se algum dado necessário não existir, primeiro identifique exatamente onde ele pode ser obtido ou qual contrato precisa ser estendido.

---

# 1. Arquitetura desejada

O plugin deve ser tratado como uma máquina de estados de sessão.

Estados conceituais:

* ATIVO
* IDLE
* INTERRUPÇÃO_USUARIO
* RECOVERY
* HEARTBEAT
* WAKEUP
* FINALIZADO

Eventos principais:

* `session.idle`
* `session.error`
* `session.next.interrupt.requested`
* `tool.execute.after`
* `chat.message`

O fluxo deve ser orientado por estado e não por uma sequência de timers independentes.

---

# 2. Regra fundamental de isolamento

Nunca entregar uma mensagem do AgentMap para uma sessão simplesmente porque ela é uma mensagem nova.

A mensagem deve ser direcionada à sessão correta sempre que os dados existentes permitirem.

Priorizar a identificação nesta ordem:

1. `sessionId`
2. `projeto + sessão`
3. `agente destinatário + projeto`
4. outro identificador explícito previsto pelo contrato do AgentMap

Não criar heurísticas frágeis baseadas somente em texto da mensagem.

Se o AgentMap atualmente não fornece o vínculo necessário, investigar o contrato existente antes de alterar o plugin.

Objetivo:

```text
AgentMap
   |
   +--> mensagem destinada à sessão A
   |
   +--> mensagem destinada à sessão B
   |
   +--> mensagem destinada à sessão C
            |
            v
       filtro correto
            |
      +-----+-----+
      |     |     |
      A     B     C
```

Uma sessão nunca deve consumir silenciosamente uma mensagem pertencente a outra.

---

# 3. Corrigir o cursor de eventSequence

O código atual utiliza:

```text
ultimoEventSequenceProcessado
```

como estado global.

Isso não é adequado para múltiplas sessões/projetos.

Substituir por estado isolado por contexto.

Preferência:

```text
projectId + sessionId
```

ou, se o contrato do AgentMap determinar outra chave:

```text
sessionId
```

O estado deve permitir algo conceitualmente equivalente a:

```text
projetoA + sessãoA -> sequence 150
projetoA + sessãoB -> sequence 94
projetoB + sessãoC -> sequence 31
```

Nunca permitir que uma sessão avance o cursor de outra.

Também verificar como o AgentMap trata mensagens já consumidas.

Não assumir que incrementar `eventSequence` significa necessariamente confirmar a entrega.

---

# 4. Separar "mensagem disponível" de "mensagem consumida"

O fluxo deve distinguir:

```text
mensagem encontrada
```

de:

```text
mensagem efetivamente entregue/processada
```

O plugin não deve avançar definitivamente o cursor apenas porque conseguiu fazer uma requisição.

A confirmação deve acontecer somente após o mecanismo de entrega definido pelo contrato do AgentMap/Kilo.

Se o AgentMap já possuir mecanismo de consumo/acknowledgement, utilizar o mecanismo existente.

Se não possuir, documentar claramente a limitação e evitar introduzir uma falsa garantia de entrega.

---

# 5. session.idle

Quando ocorrer:

```text
session.idle
```

executar:

```text
session.idle
    |
    +--> limpar estado de interrupção anterior
    |
    +--> verificar mensagens destinadas à sessão
    |
    +--> se houver mensagens:
    |       |
    |       +--> preparar wake-up
    |
    +--> se não houver mensagens:
    |       |
    |       +--> verificar se existe trabalho pendente
    |
    +--> se houver trabalho:
    |       |
    |       +--> iniciar/manter heartbeat
    |
    +--> se não houver trabalho:
            |
            +--> não manter heartbeat
```

Não iniciar múltiplos heartbeats para a mesma sessão.

---

# 6. session.error

Tratar `session.error` como uma máquina de classificação.

Fluxo:

```text
session.error
      |
      v
classificar erro
      |
      +-----------------------------+
      |                             |
      v                             v
interrupção do usuário       erro real
      |                             |
      v                             v
   IGNORAR                   é recuperável?
                                    |
                         +----------+----------+
                         |                     |
                        NÃO                   SIM
                         |                     |
                         v                     v
                     registrar             RECOVERY
                     estado                    |
                                               v
                                      verificar cooldown
                                               |
                                  +------------+------------+
                                  |                         |
                                ativo                     inativo
                                  |                         |
                                  v                         v
                              não repetir             injetar recovery
```

Considerar como interrupção do usuário os casos já identificados pelo código atual, incluindo `MessageAbortedError` e indicadores de abort/cancel/interrupção.

Não fazer recovery automático quando o usuário explicitamente interrompeu a execução.

---

# 7. Corrigir definitivamente o cooldown de recovery

O código atual possui:

```text
sessoesComRecovery
recoveryTimers
RECOVERY_COOLDOWN_MS
```

mas a proteção precisa ser efetivamente consultada antes de executar outro recovery.

Implementar:

```text
session.error
     |
     v
sessão interrompida?
     |
    SIM --> ignorar
     |
    NÃO
     |
     v
recovery já ativo?
     |
    SIM --> ignorar segundo recovery
     |
    NÃO
     |
     v
injetar recovery
     |
     v
marcar recovery ativo
     |
     v
iniciar cooldown
```

O cooldown deve impedir loops como:

```text
error
recovery
error
recovery
error
recovery
```

---

# 8. Recovery não deve reiniciar a tarefa

O prompt de recuperação deve instruir o agente a continuar do último estado válido.

Princípios:

* não reiniciar a tarefa;
* não duplicar alterações;
* verificar o estado atual antes de repetir operações;
* consultar o AgentMap quando necessário;
* continuar a partir do último estado consistente;
* não tentar resolver o erro original cegamente;
* não criar uma nova tarefa para substituir a anterior.

O recovery deve ser uma retomada controlada.

---

# 9. Considerar corretamente o comportamento de promptAsync

Não assumir:

```text
await promptAsync()
```

como prova absoluta de que o modelo já começou ou terminou a execução.

A documentação/código do Kilo mostra que o endpoint `promptAsync` pode responder antes da execução efetiva terminar.

Portanto:

```text
promptAsync retornou
```

não deve ser interpretado automaticamente como:

```text
sessão retomada com sucesso
```

Criar uma estratégia segura de confirmação baseada nos eventos/estado disponíveis no Kilo.

Não criar polling agressivo.

Preferir os eventos de sessão disponíveis para confirmar mudança de estado.

Se uma confirmação confiável não puder ser obtida pela API pública disponível, documentar essa limitação em vez de inventar uma garantia.

---

# 10. tool.execute.after

Continuar utilizando:

```text
tool.execute.after
```

para indicar atividade recente da sessão.

Porém, a atividade deve representar que a sessão está potencialmente ocupada.

Não usar esse evento para consumir mensagens do AgentMap.

Responsabilidade:

```text
tool.execute.after
        |
        v
marcar atividade da sessão
        |
        v
evitar wake-up/heartbeat simultâneo
```

---

# 11. chat.message

Continuar utilizando:

```text
chat.message
```

para registrar atividade iniciada pelo usuário.

Responsabilidade:

```text
chat.message
      |
      v
marcar sessão como ativa
```

Não usar `chat.message` como gatilho para consumir indiscriminadamente mensagens do AgentMap.

---

# 12. Janela de atividade

Reavaliar:

```text
ATIVIDADE_MAX_MS
```

A janela atual de 60 segundos deve ser mantida somente se fizer sentido após analisar o comportamento real do Kilo.

Não escolher um valor arbitrário apenas para fazer o fluxo funcionar.

Se necessário, tornar configurável por variável de ambiente.

A regra é:

```text
sessão recentemente ativa
        |
        v
não injetar wake-up concorrente
```

---

# 13. Heartbeat

O heartbeat deve ser apenas um mecanismo de segurança.

Fluxo:

```text
session.idle
     |
     v
há trabalho pendente?
     |
   NÃO ------> nenhum heartbeat
     |
    SIM
     |
     v
iniciar heartbeat
     |
     v
aguardar intervalo
     |
     v
sessão está ocupada?
     |
    SIM ------> aguardar próximo ciclo
     |
    NÃO
     |
     v
há mensagem destinada à sessão?
     |
    SIM ------> wake-up da mensagem
     |
    NÃO
     |
     v
há trabalho pendente?
     |
   NÃO ------> parar heartbeat
     |
    SIM
     |
     v
heartbeat controlado
```

Não permitir que o heartbeat gere uma sequência infinita de prompts.

---

# 14. Prevenir concorrência

Garantir que uma sessão não tenha simultaneamente:

```text
wake-up
+
recovery
+
heartbeat
```

sendo enviados.

Criar uma proteção de execução por sessão.

Conceitualmente:

```text
session A
   |
   +--> operação wake-up em andamento
            |
            +--> heartbeat bloqueado
            +--> recovery bloqueado
```

Depois que a operação terminar ou for confirmada como encerrada:

```text
liberar sessão
```

Isso é especialmente importante porque `promptAsync` pode ter comportamento assíncrono no backend.

---

# 15. Limpeza de timers e estado

Ao receber:

```text
session.deleted
```

ou outro evento oficial equivalente de encerramento da sessão, limpar:

* debounce timer;
* heartbeat timer;
* recovery timer;
* interrupt timer;
* atividade recente;
* estado de recovery;
* estado de operação em andamento;
* cursor específico daquela sessão.

Não deixar referências de sessões antigas em memória.

---

# 16. Estado global mínimo

Reduzir o máximo possível o estado global.

Evitar estruturas globais que misturem sessões.

Preferir:

```text
Map<sessionKey, SessionWakeupState>
```

onde cada sessão possua estado isolado.

Exemplo conceitual:

```text
SessionWakeupState

- sessionId
- projectId
- ultimoEventSequence
- ultimaAtividade
- recoveryAtivo
- interrompida
- wakeupEmAndamento
- heartbeatAtivo
```

Adaptar os campos ao que realmente existir no projeto.

Não criar propriedades sem necessidade.

---

# 17. Não alterar contratos do AgentMap sem necessidade

Antes de criar novos endpoints ou campos:

1. procurar os contratos existentes;
2. verificar tipos;
3. verificar DTOs;
4. verificar serviços;
5. verificar rotas;
6. verificar persistência;
7. verificar como os eventos são produzidos.

Se o AgentMap já possui os dados necessários, utilizar os existentes.

Se faltar um vínculo crítico, documentar exatamente:

```text
dado necessário
onde deveria existir
quem produz
quem consome
```

e somente então implementar a menor alteração necessária.

---

# 18. Logs

IMPORTANTE:

Remover os NÓS DE LOG dos diagramas de fluxo.

Não quero fluxogramas poluídos com:

```text
Log: atividade registrada
Log: nenhuma mensagem
Log: wake-up enviado
Log: heartbeat...
```

Logs não são etapas de negócio.

No fluxo visual devem permanecer somente:

* eventos;
* estados;
* decisões;
* ações;
* chamadas;
* transições;
* resultados relevantes.

Não remover automaticamente todo mecanismo de observabilidade do código.

Os logs do código somente devem ser removidos/reduzidos se forem realmente redundantes, excessivos ou contrários à arquitetura atual do projeto.

A observabilidade necessária deve permanecer de forma limpa e controlada.

---

# 19. Testes obrigatórios

Criar ou atualizar testes para pelo menos estes cenários:

### Teste 1 — idle sem mensagens

```text
session.idle
    |
    v
nenhuma mensagem
    |
    v
nenhum wake-up
```

### Teste 2 — idle com mensagem destinada à sessão

```text
session.idle
    |
    v
mensagem da própria sessão
    |
    v
wake-up
```

### Teste 3 — mensagem de outra sessão

```text
session.idle A
    |
    v
mensagem destinada B
    |
    v
NÃO acordar A
```

### Teste 4 — erro recuperável

```text
session.error
    |
    v
recovery
```

### Teste 5 — erro repetido

```text
session.error
    |
    v
recovery

session.error
    |
    v
não duplicar recovery
```

### Teste 6 — interrupção do usuário

```text
session.next.interrupt.requested
        |
        v
session.error
        |
        v
não executar recovery
```

### Teste 7 — heartbeat sem trabalho

```text
heartbeat
   |
   v
sem trabalho
   |
   v
parar heartbeat
```

### Teste 8 — heartbeat com trabalho

```text
heartbeat
   |
   v
trabalho pendente
   |
   v
continuar ciclo
```

### Teste 9 — concorrência

Garantir que:

```text
heartbeat
recovery
wakeup
```

não sejam enviados simultaneamente para a mesma sessão.

### Teste 10 — sessões independentes

Criar pelo menos duas sessões simuladas e garantir que:

```text
cursor A != cursor B
estado A != estado B
mensagem A != mensagem B
```

---

# 20. Documentação final

Depois de implementar e testar, atualizar/criar documentação do mecanismo.

Documentar:

* objetivo;
* arquitetura;
* eventos Kilo utilizados;
* relação com AgentMap;
* estados;
* regras de wake-up;
* regras de recovery;
* regras de heartbeat;
* isolamento de sessões;
* controle de concorrência;
* tratamento de interrupção;
* consumo de mensagens;
* limitações conhecidas;
* comportamento de `promptAsync`;
* configuração;
* testes.

---

# 21. Criar os novos diagramas no final

Depois que o código estiver finalizado e validado, criar os diagramas com o FLUXO REAL IMPLEMENTADO.

Não desenhar o diagrama antes da implementação final.

Criar pelo menos estes diagramas em Mermaid, preferencialmente dentro da documentação do projeto.

## Diagrama 1 — Visão geral

Mostrar:

```text
Kilo
 |
 +--> eventos
 |
 v
AgentMap Wakeup
 |
 +--> Session Idle
 +--> Session Error
 +--> User Interrupt
 +--> Tool Activity
 +--> Chat Activity
 |
 v
AgentMap
 |
 +--> mensagens
 +--> tarefas
 +--> handoffs
 +--> bloqueios
 |
 v
Wake-up / Recovery / Heartbeat
 |
 v
Sessão Kilo
```

## Diagrama 2 — Máquina de estados

Representar:

```text
ATIVO
IDLE
WAKEUP
RECOVERY
HEARTBEAT
INTERRUPÇÃO_USUARIO
FINALIZADO
```

e todas as transições reais.

## Diagrama 3 — Fluxo detalhado de session.idle

Mostrar passo a passo:

```text
session.idle
   |
   v
validar sessão
   |
   v
verificar atividade
   |
   v
buscar mensagens destinadas
   |
   v
há mensagem?
   |
  SIM --> wake-up
   |
  NÃO
   |
   v
há trabalho?
   |
  SIM --> heartbeat
   |
  NÃO --> permanecer idle
```

## Diagrama 4 — Fluxo detalhado de session.error

Mostrar:

```text
session.error
     |
     v
classificação
     |
     +--> interrupção do usuário --> ignorar
     |
     +--> erro não recuperável --> registrar estado
     |
     +--> erro recuperável
              |
              v
        recovery ativo?
              |
             SIM --> não duplicar
              |
             NÃO
              |
              v
        recovery controlado
```

## Diagrama 5 — Fluxo de heartbeat

Mostrar claramente:

```text
heartbeat
   |
   v
sessão ocupada?
   |
  SIM --> aguardar
   |
  NÃO
   |
   v
mensagem?
   |
  SIM --> wake-up
   |
  NÃO
   |
   v
trabalho?
   |
  NÃO --> parar
   |
  SIM --> próximo ciclo
```

## Diagrama 6 — Isolamento entre sessões

Demonstrar visualmente:

```text
Projeto A
 ├── Sessão A
 │     └── mensagens A
 │
 └── Sessão B
       └── mensagens B

Projeto B
 └── Sessão C
       └── mensagens C
```

E deixar explícito no diagrama que uma sessão não consome mensagens de outra.

---

# 22. Explicação de cada nó

Depois dos diagramas, criar uma seção explicando TODOS os nós.

Para cada nó informar:

* Nome;
* Tipo: evento, estado, decisão, ação ou resultado;
* Entrada;
* Condição;
* O que executa;
* Saída;
* Próximo estado;
* Responsável: Kilo, plugin ou AgentMap;
* Por que existe;
* O que acontece em caso de falha.

Exemplo:

```text
session.idle

Tipo:
Evento Kilo.

Responsável:
Kilo -> Plugin.

Entrada:
Sessão terminou sua atividade atual.

Ação:
O Wakeup verifica se existem mensagens destinadas àquela sessão.

Saída:
Wake-up, heartbeat ou permanência em idle.

Objetivo:
Permitir que o AgentMap retome automaticamente uma sessão sem exigir intervenção manual.
```

Fazer isso para TODOS os nós dos diagramas.

---

# 23. Critérios de aceite

Só considerar a implementação concluída quando:

* [ ] nenhuma sessão recebe mensagem destinada a outra sessão;
* [ ] o cursor de eventos não é compartilhado indevidamente entre sessões;
* [ ] recovery possui deduplicação/cooldown real;
* [ ] interrupção explícita do usuário não dispara recovery;
* [ ] heartbeat não executa indefinidamente;
* [ ] heartbeat não concorre com wake-up/recovery;
* [ ] sessão encerrada limpa seus timers e estados;
* [ ] `session.idle` continua sendo o principal gatilho de wake-up;
* [ ] `session.error` possui recuperação controlada;
* [ ] `tool.execute.after` e `chat.message` continuam indicando atividade;
* [ ] o mecanismo não depende de CLI externo;
* [ ] não são criados endpoints fictícios;
* [ ] contratos reais do AgentMap são respeitados;
* [ ] testes dos cenários críticos passam;
* [ ] documentação é atualizada;
* [ ] os diagramas representam exatamente o código final;
* [ ] os diagramas não possuem nós de LOG;
* [ ] cada nó dos diagramas possui explicação;
* [ ] nenhuma mudança desnecessária é feita fora do escopo do Wakeup.

---

# 24. Regra final para a implementação

Não faça uma simples alteração incremental baseada somente no fluxograma antigo.

Primeiro compreenda:

```text
Kilo
  |
  v
Plugin
  |
  v
AgentMap
  |
  v
mensagens / eventos / tarefas / sessões
```

Depois compare o comportamento atual com o comportamento desejado.

Faça as menores alterações necessárias para chegar à arquitetura descrita acima.

Não remova funcionalidades existentes que não estejam diretamente relacionadas ao problema.

Não invente contratos.

Não mascarar falhas.

Não considerar `promptAsync` como confirmação absoluta de execução concluída.

Ao terminar:

1. revisar o código;
2. executar os testes;
3. corrigir problemas encontrados;
4. revisar concorrência;
5. revisar isolamento de sessões;
6. revisar recovery;
7. revisar heartbeat;
8. atualizar documentação;
9. criar os diagramas Mermaid;
10. explicar cada nó e item;
11. apresentar um resumo final das alterações realizadas e dos testes executados.
