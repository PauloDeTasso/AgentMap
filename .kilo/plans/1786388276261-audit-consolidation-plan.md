# Plano de Auditoria, Consolidação e Evolução do AgentMap

## Objetivo
Consolidar a arquitetura existente do AgentMap, eliminar duplicações, unificar implementações paralelas e preparar o sistema para evolução contínua como memória operacional compartilhada de agentes.

## Estado Atual Descoberto

### Stack
- Backend: Node.js + TypeScript + Express
- Frontend: HTML5 + CSS3 + JavaScript (vanilla ES modules)
- Persistência: Arquivos JSON em `.ia/` (PostgreSQL opcional, não implementado)
- MCP: Model Context Protocol via `@modelcontextprotocol/sdk`
- Testes: Jest

### Arquitetura Identificada
```
backend/
├── src/
│   ├── api/              → Rotas Express (20+ routers)
│   ├── archivos/         → FileService, ScaffoldService, IdGenerator
│   ├── banco/            → Vazio (PostgreSQL não implementado)
│   ├── config/           → Configurações e registro de projetos
│   ├── mcp/              → MCP NOVO (9 tools read-only, com segurança/audit/mapper)
│   ├── mcp-server/       → MCP ANTIGO (22+ tools CRUD completo)
│   ├── seguranca/        → Validação de paths
│   ├── servicios/        → Services (usado pela API)
│   ├── servicos/         → Services (usado pelo mcp-server) ⚠️ DUPLICATA
│   ├── tipos/            → Tipos TypeScript (31 tipos/estados)
│   ├── validacao/        → SchemaValidator (JSON Schema)
│   ├── app.ts            → Criação da app Express
│   └── index.ts          → Entrada do backend
├── testes/               → 7 test files
└── package.json
```

### Problemas Críticos Identificados

| # | Problema | Severidade | Impacto |
|---|----------|-----------|---------|
| 1 | Duplicação `servicios/` vs `servicos/` | Alta | Manutenção duplicada, risco de divergência |
| 2 | Dois MCPs paralelos (`mcp/` vs `mcp-server/`) | Alta | `kilo.jsonc` aponta para MCP incompleto (9 tools) |
| 3 | `kilo.jsonc` aponta para MCP sem ferramentas de escrita | Alta | Agentes não conseguem registrar tarefas, handoffs, etc. |
| 4 | PostgreSQL declarado mas não implementado | Média | `banco/` vazio, dependências opcionais sem uso |
| 5 | Testes limitados (7 files, sem MCP/API integration tests) | Média | Risco de regressão em alterações estruturais |
| 6 | Duplicação de `carregarContexto` (mcp-server/contexto.ts vs mcp/context/contexto.ts) | Alta | Lógica replicada, manutenção duplicada |

### MCP Tools Existentes

**MCP `mcp/` (configurado em kilo.jsonc) — 9 tools read-only:**
- `agentmap_obter_contexto_projeto`
- `agentmap_obter_arquitetura`
- `agentmap_obter_agente`
- `agentmap_recomendar_agente`
- `agentmap_ler_trecho_arquivo`
- `agentmap_buscar_simbolo`
- `agentmap_buscar_referencias`
- `agentmap_buscar_conhecimento`
- `agentmap_obter_contexto_tarefa`

**MCP `mcp-server/` (não configurado) — 22 tool files com CRUD completo:**
- projeto (5), tarefas (7), agentes, solicitacoes, handoffs, sessoes, checkpoints, riscos, bloqueios, pendencias, reservas, decisoes, dependencias, responsabilidades, artefatos, resultados, criterios, aprendizados, validacoes, arquivos, auditoria, workflows

## Decisões de Projeto

### D1: Qual MCP é a fonte de verdade?
**Decisão**: O `mcp-server/` é a implementação com CRUD completo e é o que realmente permite ao agente operar sobre o AgentMap. O `mcp/` é uma tentativa mais nova com foco em contexto/segurança, mas está incompleto.

**Recomendação**: Unificar em `mcp-server/`, absorvendo as melhorias de segurança/auditoria do `mcp/` novo.

### D2: Serviços — qual diretório manter?
**Decisão**: Manter `servicios/` (usado pela API) e eliminar `servicos/`, atualizando o `mcp-server` para importar de `servicios/`.

### D3: Como unificar os MCPs?
**Decisão**: 
1. Mover as ferramentas de `mcp/tools/` para `mcp-server/tools/` (ou criar uma camada de compatibilidade)
2. Absorver as melhorias do `mcp/` (pathValidator, projectAuth, auditoria MCP, mapeadores) no `mcp-server`
3. Atualizar `kilo.jsonc` para apontar para `mcp-server`

## Plano de Execução

### Fase 1: Consolidação de Serviços
**Objetivo**: Eliminar duplicação entre `servicios/` e `servicos/`.

**Tarefas:**
1. Verificar se `servicos/` é referenciado apenas pelo `mcp-server/`
2. Atualizar todas as importações do `mcp-server/` para usar `servicios/`
3. Remover diretório `servicos/`
4. Executar `npm run lint` para validar

### Fase 2: Unificação do MCP
**Objetivo**: Ter um único MCP funcional com todas as ferramentas.

**Tarefas:**
1. Mover utilitários de `mcp/` para `mcp-server/`:
   - `mcp/security/pathValidator.ts` → `mcp-server/security/`
   - `mcp/security/projectAuth.ts` → `mcp-server/security/`
   - `mcp/audit/auditoria.ts` → `mcp-server/audit/`
   - `mcp/mapper/mapeadores.ts` → `mcp-server/mapper/`
   - `mcp/schemas/validacao.ts` → `mcp-server/schemas/`
   - `mcp/utils/search.ts` → `mcp-server/utils/`
   - `mcp/context/contexto.ts` → `mcp-server/contexto.ts`
2. Atualizar importações no `mcp-server`
3. Remover diretório `mcp/`
4. Atualizar `kilo.jsonc` para apontar para `backend/src/mcp-server/index.ts`
5. Adicionar as 9 tools read-only do `mcp/` ao `mcp-server/tools/`
6. Validar que todas as 30+ tools estão registradas

### Fase 3: Correção de Configuração
**Objetivo**: Garantir que o MCP configurado é o completo.

**Tarefas:**
1. Atualizar `kilo.jsonc` com o comando correto do `mcp-server`
2. Verificar se há referência ao `mcp/` em qualquer documentação
3. Atualizar scripts de teste MCP (`test-mcp*.ps1`, `test-mcp*.mjs`, etc.)

### Fase 4: Melhorias de Teste
**Objetivo**: Aumentar cobertura e adicionar testes de integração.

**Tarefas:**
1. Adicionar testes para `mcp-server` (pelo menos 1 teste por tool principal)
2. Adicionar testes de integração API → Service
3. Adicionar teste de carregamento de projeto via API
4. Validar com `npm test`

### Fase 5: Documentação
**Objetivo**: Alinhar documentação com implementação real.

**Tarefas:**
1. Atualizar `docs/guia-agente-mcp.md` com as tools unificadas
2. Atualizar `docs/protocolo-mcp.md`
3. Atualizar `docs/arquitetura-mcp.md`
4. Registrar decisões de consolidação

### Fase 6: Validação Final
**Objetivo**: Garantir que o sistema funciona após consolidação.

**Tarefas:**
1. Executar `npm run lint`
2. Executar `npm test`
3. Iniciar backend e validar API
4. Iniciar MCP e validar tools
5. Testar fluxo básico: criar projeto → abrir → criar tarefa → listar via MCP

## Riscos

| Risco | Mitigação |
|--------|-----------|
| Quebra de imports durante consolidação | Executar lint após cada passo |
| MCP configurado com caminho errado | Validar com `test-mcp.ps1` antes e depois |
| Perda de ferramentas do `mcp/` novo | Mapear todas antes de remover |
| Frontend quebrado por mudanças de API | Testar fluxos principais no browser |

## Critérios de Sucesso

1. Apenas um diretório de services (`servicios/`)
2. Apenas um MCP (`mcp-server/`) com todas as tools
3. `kilo.jsonc` apontando para o MCP correto
4. `npm run lint` sem erros
5. `npm test` passando
6. API respondendo em `http://localhost:3150`
7. MCP conectando via stdio
8. Frontend carregando e funcionando

## Fora do Escopo (nesta fase)

- Implementação de PostgreSQL
- Novas features de domínio
- Refatoração arquitetural maior
- Migração de dados existentes

## Próximos Passos Após Consolidação

1. Implementar camada de banco opcional (PostgreSQL)
2. Adicionar testes de concorrência
3. Implementar cache de projetos abertos
4. Adicionar métricas e observabilidade
5. Evoluir ferramentas MCP com base no uso real
