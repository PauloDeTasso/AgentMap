# TAREFA — AUDITORIA COMPLETA, CORREÇÃO DOS ERROS REMANESCENTES E CONSOLIDAÇÃO DO AGENTMAP

## Objetivo

Dentro da pasta raiz deste projeto existe a pasta:

`/erros/`

Leia **todos os arquivos existentes dentro dessa pasta**, sem ignorar nenhum.

Esses arquivos contêm relatórios e levantamentos anteriores sobre erros, incoerências, ambiguidades, problemas arquiteturais, problemas de execução, documentação obsoleta e funcionalidades que precisam ser verificadas.

Seu objetivo é:

1. identificar tudo que os relatórios apontam;
2. comparar cada item com o estado REAL atual do projeto;
3. identificar somente aquilo que AINDA NÃO FOI RESOLVIDO;
4. corrigir tudo que ainda estiver pendente;
5. verificar quais documentos antigos ficaram obsoletos;
6. atualizar ou remover somente documentos realmente obsoletos;
7. reconstruir a documentação da arquitetura atual;
8. descobrir e mapear TODAS as ferramentas MCP existentes;
9. descobrir quais ferramentas realmente funcionam;
10. descobrir quais ferramentas estão disponíveis para os agentes;
11. descobrir quais ferramentas estão instaladas mas não funcionam;
12. descobrir quais ferramentas são apenas declaradas/documentadas, mas não existem ou não estão funcionais;
13. compreender como todas as partes do AgentMap se relacionam;
14. utilizar todos os recursos disponíveis para acelerar a auditoria e as correções;
15. utilizar os agentes disponíveis em paralelo quando isso for tecnicamente seguro;
16. integrar corretamente todos os trabalhos realizados;
17. executar testes reais;
18. atualizar o AgentMap para representar a realidade atual do sistema;
19. deixar o projeto preparado para que futuros agentes consigam compreender o sistema sem depender de documentação antiga ou contraditória.

---

# 1. REGRA FUNDAMENTAL

NÃO assuma que os relatórios existentes estão corretos.

Os relatórios são fontes de diagnóstico, não fontes da verdade.

A verdade deve ser determinada pelo estado atual:

- código;
- arquivos;
- configuração;
- schemas;
- MCP;
- ferramentas;
- processos;
- testes;
- execução real;
- documentação;
- integração entre componentes.

Para cada problema encontrado, determine:

- RESOLVIDO;
- PARCIALMENTE_RESOLVIDO;
- NÃO_RESOLVIDO;
- NÃO_REPRODUZIDO;
- OBSOLETO;
- FALSO_POSITIVO;
- NECESSITA_VALIDACAO.

Não corrija algo simplesmente porque aparece em um relatório.

Primeiro confirme se o problema ainda existe.

---

# 2. LEITURA COMPLETA DOS RELATÓRIOS

Leia TODOS os arquivos existentes em:

`/erros/`

Não leia somente os arquivos que parecem mais importantes.

Não ignore arquivos menores.

Não ignore arquivos de documentação.

Não ignore arquivos de análise.

Não ignore arquivos de diagnóstico.

Depois da leitura, crie internamente uma matriz de rastreamento contendo, para cada problema:

- ID;
- origem;
- arquivo de origem;
- descrição;
- componente afetado;
- evidência;
- estado atual;
- correção necessária;
- dependências;
- agente responsável;
- arquivos afetados;
- teste necessário;
- resultado final.

NÃO considere a tarefa concluída enquanto todos os itens dos relatórios tiverem um estado final conhecido.

---

# 3. NÃO REPETIR CORREÇÕES JÁ REALIZADAS

Compare cada item dos relatórios com:

- código atual;
- commits/histórico quando disponível;
- documentação atual;
- testes atuais;
- configurações atuais;
- estrutura atual do projeto.

Se algo já foi corrigido, NÃO faça novamente uma alteração desnecessária.

Registre como:

`RESOLVIDO`

e identifique onde a correção atualmente existe.

Se uma correção antiga foi substituída por uma implementação melhor, registre isso como:

`SUBSTITUIDO`

explicando qual é a implementação atual.

---

# 4. AUDITORIA COMPLETA DO SISTEMA

Depois de analisar `/erros/`, faça uma auditoria do projeto inteiro.

Mapeie:

- backend;
- frontend;
- MCP;
- tools;
- Agent Manager;
- Worktree;
- CLI;
- executores;
- daemon;
- runtime;
- dispatcher;
- orquestrador;
- tarefas;
- instâncias;
- agentes;
- sessões;
- handoffs;
- contratos;
- dependências;
- estado;
- eventos;
- auditoria;
- WebSocket;
- REST;
- persistência;
- configurações;
- testes;
- scripts;
- documentação;
- arquivos de contexto;
- arquivos de configuração;
- mecanismos de recuperação.

Não se limite ao que os relatórios mencionam.

Procure também inconsistências que os relatórios não identificaram.

---

# 5. MAPEAR TODAS AS TOOLS MCP

Esta etapa é OBRIGATÓRIA.

Descubra todas as ferramentas MCP disponíveis no sistema.

Para cada tool, determine:

- nome;
- descrição;
- finalidade;
- parâmetros;
- retorno;
- agente que pode utilizá-la;
- componente que implementa;
- arquivo responsável;
- se está registrada;
- se está disponível;
- se realmente executa;
- se possui teste;
- se possui integração real;
- dependências;
- limitações;
- riscos;
- estado:

`FUNCIONAL`

`PARCIAL`

`QUEBRADA`

`DISPONIVEL_MAS_NAO_TESTADA`

`DECLARADA_MAS_INEXISTENTE`

`OBSOLETA`

Não considere uma tool funcional apenas porque existe uma definição dela.

Sempre que possível, execute um teste real e seguro.

---

# 6. MAPEAR TODAS AS OUTRAS FERRAMENTAS

Além do MCP, identifique todas as ferramentas realmente disponíveis para o sistema/agentes, incluindo, quando existentes:

- Agent Manager;
- Worktree;
- CLI;
- Kilo;
- Kilo runtime;
- daemon;
- executor;
- filesystem;
- Git;
- processos;
- terminal;
- scripts;
- APIs;
- WebSocket;
- ferramentas internas;
- ferramentas de diagnóstico;
- ferramentas de monitoramento;
- ferramentas de recuperação;
- ferramentas de gerenciamento de agentes.

Não assuma que uma ferramenta funciona apenas porque está documentada.

Teste quando for seguro.

---

# 7. UTILIZAÇÃO DOS AGENTES

Utilize TODOS os agentes disponíveis quando isso for possível e seguro.

NÃO distribua tarefas apenas pela especialidade nominal dos agentes.

O objetivo desta tarefa é velocidade e cobertura.

Divida os trabalhos em unidades independentes sempre que possível.

Exemplos:

- auditoria MCP;
- auditoria backend;
- auditoria frontend;
- auditoria runtime;
- auditoria documentação;
- auditoria segurança;
- auditoria testes;
- auditoria Agent Manager;
- auditoria Worktree;
- auditoria CLI;
- auditoria persistência;
- auditoria WebSocket;
- auditoria orquestração.

Quando duas tarefas não possuírem dependência entre si, execute-as em paralelo.

Quando houver dependência, respeite a ordem correta.

NÃO execute alterações concorrentes sobre os mesmos arquivos sem coordenação.

---

# 8. USAR AGENT MANAGER, WORKTREE, CLI E DEMAIS FERRAMENTAS

Utilize todas as ferramentas disponíveis e funcionais que possam contribuir para esta tarefa, incluindo:

- Agent Manager;
- Worktree;
- CLI;
- MCP;
- ferramentas de inspeção;
- ferramentas de teste;
- ferramentas de execução;
- ferramentas de diagnóstico;
- ferramentas de versionamento;
- ferramentas de gerenciamento de agentes.

Porém:

NÃO utilize uma ferramenta apenas para cumprir formalmente esta instrução.

Use-a quando ela realmente melhorar:

- velocidade;
- cobertura;
- segurança;
- isolamento;
- validação;
- rastreabilidade;
- qualidade.

Se uma ferramenta estiver disponível mas não funcionar, registre isso.

Não finja que ela funcionou.

---

# 9. EXECUÇÃO PARALELA

Antes de distribuir tarefas, construa um mapa de dependências.

Classifique cada tarefa como:

- INDEPENDENTE;
- DEPENDENTE;
- CONFLITANTE;
- CRÍTICA;
- BLOQUEADORA.

Execute em paralelo apenas tarefas independentes ou adequadamente isoladas.

Utilize Worktree quando necessário para evitar conflitos.

Depois faça a integração controlada dos resultados.

---

# 10. CORREÇÕES

Corrija TODOS os problemas que:

- ainda existirem;
- forem reproduzíveis;
- forem confirmados pelo código/testes;
- forem necessários para a arquitetura atual;
- forem necessários para segurança;
- forem necessários para funcionamento real.

NÃO faça alterações cosméticas sem necessidade.

NÃO reescreva o sistema inteiro.

NÃO substitua componentes funcionais sem justificativa.

Preserve funcionalidades existentes.

Prefira:

- correção incremental;
- consolidação;
- refatoração segura;
- eliminação de duplicidade;
- interfaces claras;
- baixo acoplamento;
- testes;
- compatibilidade.

---

# 11. DOCUMENTAÇÃO OBSOLETA

Depois das correções, faça uma auditoria de TODA a documentação.

Procure documentos que afirmem coisas que não correspondem mais ao sistema atual.

Exemplos:

- ferramentas que não existem;
- ferramentas que passaram a existir;
- arquitetura antiga;
- executores antigos;
- dispatcher antigo;
- daemon antigo;
- fluxo antigo;
- estados antigos;
- agentes antigos;
- endpoints antigos;
- MCP antigo;
- limitações que já foram removidas;
- funcionalidades que não existem;
- funcionalidades que agora existem.

Para cada documento:

`ATUAL`

`PRECISA_ATUALIZAR`

`OBSOLETO`

`DUPLICADO`

`HISTORICO`

NÃO apague documentação histórica automaticamente.

Se um documento tiver valor histórico, preserve-o e marque explicitamente como histórico.

Documentos usados por futuros agentes para compreender o sistema devem representar SOMENTE a arquitetura atual.

---

# 12. CRIAR UMA FONTE ÚNICA DA VERDADE

Depois da auditoria, atualize/crie uma documentação central que explique:

- arquitetura;
- componentes;
- responsabilidades;
- fluxo de execução;
- agentes;
- instâncias;
- tarefas;
- sessões;
- handoffs;
- contratos;
- MCP;
- todas as tools;
- runtime;
- executor;
- dispatcher;
- orquestrador;
- Agent Manager;
- Worktree;
- CLI;
- estados;
- autonomia;
- intervenção;
- recuperação;
- persistência;
- segurança;
- testes.

Um agente novo deve conseguir ler essa documentação e compreender:

1. O que é o AgentMap;
2. Como ele funciona;
3. Quais componentes existem;
4. Como os componentes se comunicam;
5. Quais tools existem;
6. Quais tools realmente funcionam;
7. Como um agente é criado;
8. Como uma tarefa é criada;
9. Como uma tarefa é executada;
10. Como um agente termina;
11. Como ocorre handoff;
12. Como ocorre recuperação;
13. Como um humano intervém;
14. Como executar testes;
15. Como adicionar novas ferramentas;
16. Como adicionar novos agentes.

---

# 13. NÃO INVENTAR FUNCIONALIDADES

Se algo não puder ser comprovado, não documente como funcional.

Utilize explicitamente:

`IMPLEMENTADO`

`TESTADO`

`IMPLEMENTADO_NAO_TESTADO`

`PARCIAL`

`NAO_IMPLEMENTADO`

`OBSOLETO`

`INDISPONIVEL`

Isso é extremamente importante para futuros agentes.

---

# 14. TESTES REAIS

Depois das correções:

1. instalar dependências limpas;
2. compilar;
3. executar testes unitários;
4. executar testes de integração;
5. testar MCP;
6. testar tools;
7. testar execução;
8. testar orquestração;
9. testar handoff;
10. testar autonomia;
11. testar intervenção;
12. testar recuperação;
13. testar WebSocket;
14. testar API;
15. testar fluxo multiagente.

Não declarar sucesso apenas porque o build passou.

---

# 15. TESTE END-TO-END

Faça pelo menos um fluxo completo real:

AGENTMAP

→ criação de tarefa

→ seleção de agente

→ criação da instância

→ criação da execução

→ dispatch

→ agente executando

→ evento

→ resultado

→ validação

→ conclusão

→ handoff

→ próxima tarefa

→ conclusão final.

Verifique também:

- pausa;
- retomada;
- cancelamento;
- falha;
- timeout;
- agente offline;
- recuperação.

---

# 16. RASTREABILIDADE

Cada correção deverá conseguir ser relacionada a:

- problema original;
- arquivo;
- alteração;
- teste;
- resultado.

Não faça correções sem conseguir explicar posteriormente por que foram feitas.

---

# 17. CRITÉRIO DE CONCLUSÃO

A tarefa somente poderá ser considerada CONCLUÍDA quando:

- todos os arquivos de `/erros/` tiverem sido analisados;
- todos os problemas tiverem estado final;
- todos os problemas resolvíveis ainda pendentes tiverem sido corrigidos;
- todas as tools MCP tiverem sido mapeadas;
- todas as tools possíveis tiverem sido testadas;
- ferramentas indisponíveis tiverem sido identificadas;
- ferramentas quebradas tiverem sido identificadas;
- documentação obsoleta tiver sido atualizada, arquivada ou removida adequadamente;
- existir uma fonte única da verdade atual;
- os testes estiverem passando ou suas falhas estiverem formalmente documentadas;
- o fluxo end-to-end tiver sido validado;
- o AgentMap refletir a realidade atual;
- nenhuma funcionalidade tiver sido declarada funcional sem evidência.

---

# 18. RELATÓRIO FINAL OBRIGATÓRIO

Ao terminar, produza um relatório contendo:

## A. Problemas encontrados

Lista completa.

## B. Problemas já resolvidos anteriormente

Lista separada.

## C. Problemas corrigidos nesta execução

Lista com arquivos e testes.

## D. Problemas não corrigidos

Explicar exatamente por quê.

## E. Problemas impossíveis de reproduzir

Explicar evidências.

## F. Tools MCP

Tabela completa com:

- tool;
- finalidade;
- implementação;
- disponibilidade;
- teste;
- resultado.

## G. Outras ferramentas

Mesmo formato.

## H. Documentação

Informar:

- atualizada;
- criada;
- arquivada;
- removida;
- obsoleta.

## I. Agentes utilizados

Informar quais agentes participaram e quais tarefas executaram.

## J. Ferramentas utilizadas

Informar:

- Agent Manager;
- Worktree;
- CLI;
- MCP;
- runtime;
- demais ferramentas.

## K. Testes

Informar exatamente:

- comandos;
- resultado;
- falhas;
- motivo.

## L. Estado final

Informar se o AgentMap está:

`OPERACIONAL`

`OPERACIONAL_COM_RESTRICOES`

`PARCIALMENTE_OPERACIONAL`

`BLOQUEADO`

Não utilize "100% funcional" sem evidência objetiva.

---

# REGRA FINAL

Não deixe nenhum item dos relatórios sem classificação.

Não deixe nenhuma tool sem classificação.

Não deixe documentação contraditória para futuros agentes.

Não esconda falhas.

Não invente resultados.

Não marque como concluído algo que não foi testado.

O objetivo não é apenas corrigir código.

O objetivo é fazer com que o **AgentMap passe a conhecer a si próprio com precisão**, incluindo:

- o que existe;
- o que funciona;
- o que não funciona;
- como funciona;
- quais agentes existem;
- quais ferramentas existem;
- quais ferramentas podem ser usadas;
- quais componentes executam cada função;
- quais limitações existem;
- quais problemas ainda existem.

Somente depois disso considere a auditoria e consolidação concluídas.