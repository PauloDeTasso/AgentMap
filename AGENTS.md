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

## Estrutura de um projeto gerenciado

Cada projeto recebe uma pasta `.ia/` com a estrutura completa de governança.
Veja: `PLANO GERAL/GERENCIADOR_LOCAL_DE_AGENTES_DE_IA-ESPECIFICACAO_DE_IMPLEMENTACAO.md`

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
