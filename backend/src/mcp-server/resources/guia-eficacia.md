# 🎯 AgentMap — Guia de Eficácia

> **Propósito:** não listar o que existe, mas ensinar **quando, por que e como** usar cada capability do AgentMap para produzir mais, errar menos e evoluir mais rápido.

## 1. Filosofia

O AgentMap não é um chat. Não é um fórum. É um **sistema de estado compartilhado** para agentes.

- **Estado > Conversa**: se uma informação importante não estiver no estado do projeto, ela não existe.
- **Desacoplamento > Sincronismo**: agentes não precisam conversar; eles consultam e registram estado.
- **Rastreabilidade > Memória individual**: tudo deve ser rastreável por `projetoId`, `agenteId`, `sessaoId`, `timestamp`.
- **Governança > Caos**: contratos, dependências, handoffs e validações existem para evitar trabalho perdido.

## 2. Os 5 Princípios de Ouro

| Princípio | Regra |
|---|---|
| **1. Contexto primeiro** | Nunca execute sem antes consultar `agentmap_obter_contexto_projeto` ou `agentmap_obter_contexto_tarefa`. |
| **2. Resultado sempre** | Toda tarefa deve ter `resultados_criar`. Sem resultado = trabalho invisível. |
| **3. Handoff na fronteira** | Se o trabalho cruza domínio (backend → frontend, banco → backend), use `handoffs_criar`. |
| **4. Validação separada** | Implementação ≠ aprovação. Quem implementa não é quem valida. |
| **5. Subscrição ativa** | Use `resources/subscribe` ou `subscriptions/listen` para receber mudanças; não fique polling. |

## 3. Como Escolher a Ferramenta Certa

Use este fluxo de decisão:

```
Preciso de contexto?
├── SIM → agentmap_obter_contexto_projeto / tarefa / agente / arquitetura
└── NAO → Vou modificar algo?
    ├── SIM → Tem contrato/dependência?
    │   ├── SIM → Leia o contrato + verifique dependencias
    │   └── NAO → Execute, depois registre resultado
    └── NAO → Vou coordenar com outro agente?
        ├── SIM → eventos / handoffs / solicitacoes
        └── NAO → Vou receber atualizações automáticas?
            ├── SIM → resources/subscribe ou subscriptions/listen
            └── NAO → Consulte agentmap_descobrir
```

## 4. Workflows por Cenário Real

### 4.1 Planejamento de Feature

**Objetivo:** transformar uma ideia em tarefas executáveis.

1. `agentmap_obter_contexto_projeto` — entenda o estado atual
2. `agentmap_obter_arquitetura` — veja tecnologias e padrões
3. `agentmap_tarefas_criar` — crie tarefas com critérios de aceitação
4. `agentmap_dependencias_criar` — declare dependências entre tarefas
5. `agentmap_decisoes_criar` — registre decisões arquiteturais
6. `agentmap_contratos_criar` (se necessário) — formalize contratos compartilhados

**Dica:** use `agentmap_sugerir_fluxo({ objetivo: 'iniciar_trabalho' })` se estiver perdido.

### 4.2 Implementação Backend

**Objetivo:** codificar com segurança e rastreabilidade.

1. `agentmap_workflows_iniciar_trabalho` — obtenha contexto completo
2. `agentmap_obter_contexto_tarefa` — leia contratos obrigatórios
3. `agentmap_verificar_dependencias_pendentes` — confira pré-requisitos
4. `resources/subscribe` em `agentmap://solicitacoes/{seu-id}` — receba alterações pendentes
5. **Implemente** respeitando diretórios permitidos
6. `agentmap_arquivos_escrever` (se precisar registrar arquivos)
7. `agentmap_resultados_criar` — registre o resultado
8. `agentmap_workflows_finalizar_trabalho` — finalize com handoff se necessário

### 4.3 Implementação Frontend

**Objetivo:** desenvolver interface alinhada com contratos.

1. `agentmap_workflows_iniciar_trabalho`
2. `agentmap_obter_contexto_tarefa` — verifique contrato de API
3. `agentmap_solicitacoes_listar` — veja se há solicitações pendentes do backend
4. Implemente
5. `agentmap_resultados_criar`
6. `agentmap_handoffs_criar` se precisar de integração com backend

### 4.4 Testes

**Objetivo:** validar qualidade sem quebrar o que já funciona.

1. `agentmap_workflows_iniciar_trabalho`
2. `agentmap_tarefas_listar` — veja tarefas em `EM_TESTE`
3. `agentmap_validacoes_listar` — veja o que já foi validado
4. Execute testes
5. `agentmap_validacoes_criar` — registre resultado dos testes
6. `agentmap_validacoes_aprovar` ou `rejeitar` conforme resultado
7. `agentmap_resultados_criar` — registre métricas

### 4.5 Debug / Investigação

**Objetivo:** encontrar causa raiz sem alterar estado.

1. `agentmap_obter_contexto_projeto` — estado atual
2. `agentmap_auditoria_listar` — últimas ações
3. `agentmap_eventos_listar` — eventos recentes
4. `agentmap_bloqueios_listar` — há bloqueios ativos?
5. `agentmap_riscos_listar` — há riscos conhecidos?
6. `agentmap_buscar_conhecimento` — busque conhecimento anterior
7. `agentmap_buscar_simbolo` / `referencias` — encontre definições
8. `agentmap_ler_trecho_arquivo` — leia trechos suspeitos

**Dica:** use `agentmap_sugerir_fluxo({ objetivo: 'bloqueio' })` para diagnóstico estruturado.

### 4.6 Code Review

**Objetivo:** validar aderência a contratos e qualidade.

1. `agentmap_workflows_iniciar_trabalho` (como revisor)
2. `agentmap_tarefas_listar` — tarefas aguardando validação
3. `agentmap_validacoes_listar` — validações pendentes
4. `agentmap_contratos_listar` — contratos vigentes
5. `agentmap_decisoes_listar` — decisões que devem ser respeitadas
6. Revise código
7. `agentmap_validacoes_aprovar` ou `rejeitar` com observação
8. `agentmap_handoffs_criar` se precisar retornar para autor

### 4.7 Handoff (Transferência de Contexto)

**Objetivo:** transferir trabalho sem perder contexto.

1. `agentmap_handoffs_criar` — crie o handoff com:
   - `resumo`: o que foi feito
   - `pendente`: o que falta
   - `artefatos`: arquivos relevantes
   - `decisoes`: decisões tomadas
   - `riscos`: riscos identificados
2. `agentmap_resultados_criar` — registre o resultado do seu trabalho
3. `agentmap_sessoes_finalizar` — encerre sua sessão
4. O receptor usa `agentmap_handoffs_obter` + `agentmap_workflows_iniciar_trabalho`

### 4.8 Processamento de Solicitação

**Objetivo:** executar alteração solicitada por outro agente.

1. `agentmap_solicitacoes_listar` — veja solicitações pendentes
2. `agentmap_solicitacoes_obter` — detalhes da solicitação
3. `agentmap_verificar_dependencias_pendentes` — pré-requisitos
4. `agentmap_contratos_obter` — contrato afetado
5. Execute a alteração
6. `agentmap_solicitacoes_aprovar` ou `rejeitar`
7. `agentmap_resultados_criar`

## 5. Combinações Poderosas

| Combinação | Resultado |
|---|---|
| `eventos_pendentes` + `subscriptions/listen` | Coordenação em tempo real sem polling |
| `obter_contexto_projeto` + `obter_mapa_projeto` | Visão completa + detalhes |
| `tarefas_prontas_para_worktree` + `abrir_worktree` + `workflows_iniciar_trabalho` | Paralelismo real instantâneo |
| `buscar_conhecimento` + `buscar_simbolo` + `buscar_referencias` | Navegação inteligente no código |
| `handoffs_criar` + `resultados_criar` + `sessoes_finalizar` | Ciclo completo de transferência |
| `solicitacoes_aprovar` + `validacoes_criar` + `resultados_criar` | Fluxo de validação completo |

## 6. Erros Fatais (o que NÃO fazer)

| Erro | Consequência | Solução |
|---|---|---|
| Executar sem contexto | Quebra contratos, causa retrabalho | Sempre `obter_contexto_*` antes |
| Não registrar resultado | Trabalho invisível, próximo agente não sabe | Sempre `resultados_criar` |
| Ignorar dependências | Execução prematura, falhas | `verificar_dependencias_pendentes` |
| Fazer handoff informal | Contexto perdido, retrabalho | Use `handoffs_criar` sempre |
| Polling manual | Desperdício, lentidão | Use `resources/subscribe` ou `subscriptions/listen` |
| Alterar sem contrato | Incompatibilidade entre domínios | Leia contratos antes de alterar |
| Não validar | Bugs em produção | Separe implementação de validação |
| Trabalhar sem projeto aberto | Falhas em todas as tools | `projetos_abrir` primeiro |

## 7. Métricas de Sucesso

Você está usando o AgentMap com eficácia quando:

- ✅ Toda tarefa tem contexto lido antes da execução
- ✅ Toda tarefa tem resultado registrado
- ✅ Handoffs são usados em fronteiras de domínio
- ✅ Dependências são verificadas antes de iniciar
- ✅ Subscriptions são usadas em vez de polling
- ✅ Decisões são registradas, não assumidas
- ✅ Validações são feitas por agente diferente do autor
- ✅ Eventos pendentes são consultados no início de cada ciclo

## 8. Níveis de Maestria

### Nível 1 — Iniciante
- Abre projeto
- Lista tarefas
- Executa uma tarefa simples
- Registra resultado

### Nível 2 — Operacional
- Usa workflows completos
- Consulta contexto antes de executar
- Cria handoffs quando necessário
- Usa subscriptions para notificações

### Nível 3 — Estratégico
- Usa `agentmap_descobrir` para explorar capabilities
- Usa `agentmap_sugerir_fluxo` para escolher a ferramenta certa
- Combina subscriptions + eventos para coordenação avançada
- Usa `agentmap_obter_mapa_projeto` para visão global
- Diagnostica bloqueios com `buscar_conhecimento` + `auditoria`

### Nível 4 — Mestre
- Ensina outros agentes via `agentmap_aprendizados_criar`
- Otimiza fluxos baseado em métricas
- Usa worktrees para paralelismo real
- Integra CLI + MCP + WebSocket para monitoramento completo
- Antecipa riscos e bloqueios antes que aconteçam

## 9. Manifesto

> **O AgentMap não executa agentes. Ele fornece contexto, ferramentas e governança.**
>
> A eficácia não vem do agente mais rápido, mas do agente que **consulta antes de agir**, **registra depois de executar** e **transfere contexto sem perder informação**.
>
> Use o sistema. Não lute contra ele.

---

**Próximo passo:** use `agentmap_sugerir_fluxo({ objetivo: 'seu-objetivo' })` ou consulte `agentmap://playbook` para fluxos específicos.
