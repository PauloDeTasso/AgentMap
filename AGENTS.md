# AgentMap — Gerenciador Local de Agentes de IA

## O que é

Gerenciador local para Windows 11 que organiza projetos, agentes, contratos, tarefas,
contexto, conhecimento e governança através de arquivos reais no sistema de arquivos.

O arquivo é a informação principal. PostgreSQL é opcional (metadados/índice apenas).

## Princípios

- O gerenciador **não executa agentes**, não escolhe modelos, não distribui tarefas.
- Ele entrega contexto correto e registra o que acontece.
- Git é somente leitura (consulta).
- Proteção contra path traversal, validação de JSON, backups automáticos.

## Arquitetura

```
backend/    → Node.js + TypeScript + Express
frontend/   → HTML5 + CSS3 + JavaScript (vanilla ES modules)
banco/      → PostgreSQL (opcional, metadados)
esquemas/   → JSON Schemas de validação
```

## Desenvolvimento

```bash
cd backend
npm install
npm run dev      # inicia backend + backend na porta 3150
```

Acesse: http://localhost:3150

## Estrutura de pastas de projetos

- Pasta base de projetos: `G:\PROJETOS\AgenteMap_Projetos\`
- Cada projeto recebe sua própria pasta com o **mesmo nome do projeto**
- Exemplo: projeto `PAGINA_PESSOAL` → `G:\PROJETOS\AgenteMap_Projetos\PAGINA_PESSOAL`

## Estrutura de um projeto gerenciado

Cada projeto recebe uma pasta `.ia/` com a estrutura completa de governança.
Veja: `PLANO GERAL/GERENCIADOR_LOCAL_DE_AGENTES_DE_IA-ESPECIFICACAO_DE_IMPLEMENTACAO.md`

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

## Regra de corporação/equipe

Em projetos com múltiplos agentes:
- O planejador define a ordem e as dependências.
- Cada agente só inicia quando seus pré-requisitos estão prontos.
- O monitoramento é a fonte de verdade para o estado do projeto.
- Bloqueios devem ser registrados no AgentMap, não resolvidos informalmente.
- Handoffs devem ser usados para transferir contexto entre agentes.
- O revisor valida aderência aos contratos antes da documentação final.

## Coordenação entre Agentes

O AgentMap usa eventos assíncronos para coordenação entre agentes. Um agente deve consultar
seus eventos pendentes no início de cada ciclo de trabalho e confirmá-los após processamento.

```json
{
  "name": "agentmap_eventos_pendentes",
  "arguments": {
    "agenteId": "backend"
  }
}
```

Após processar o evento:
```json
{
  "name": "agentmap_eventos_confirmar",
  "arguments": {
    "id": "EVT-2026-00001"
  }
}
```

Eventos são gerados automaticamente como efeito colateral de:
- `agentmap_handoffs_criar` → `HANDOFF_CRIADO`
- `agentmap_handoffs_atualizar` (estado → ACEITO) → `HANDOFF_ACEITO`
- `agentmap_handoffs_atualizar` (estado → CONCLUIDO) → `HANDOFF_CONCLUIDO`
- `agentmap_solicitacoes_criar` (quando há agente responsável) → `SOLICITACAO_CRIADA`

## Especificação

- `PLANO GERAL/GERENCIADOR_LOCAL_DE_AGENTES_DE_IA-ESPECIFICACAO_DE_IMPLEMENTACAO.md` — spec autoritativa
- `PLANO GERAL/MODELOS JSON DO GERENCIADOR LOCAL DE PROJETOS PARA AGENTES.md` — schemas JSON
- `PLANO GERAL/GERENCIADOR LOCAL DE PROJETOS PARA AGENTES - IDEIA GERAL AMPLA.md` — visão ampla
- `README.md` — origem do AgentMap
