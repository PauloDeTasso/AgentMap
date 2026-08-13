# Plano: Módulo de Eventos e Coordenação Assíncrona (EventoService + Tools MCP + API + SSE)

## Resumo
Implementar entidade `Evento` persistida em disco, serviço `EventoService`, 3 tools MCP, hooks de emissão automática no `HandoffService` e `SolicitacaoService`, rotas REST, SSE para dashboard, e atualização do protocolo do agente.

## Decisões de design tomadas durante o planejamento

1. **Prefix/schema**: `evento` (`$id: "evento"`), prefixo de ID `EVT-`. O `SchemaValidator` auto-carrega schemas da pasta `esquemas/`, então nenhum registro manual é necessário.
2. **Armazenamento**: `.ia/eventos/eventos.json` (registry) + `.ia/eventos/EVT-....json` (arquivos individuais), exatamente como `handoffs/`.
3. **Tipos**: Adicionar `Evento`, `EventosRegistry`, `TipoEvento`, `EstadoEvento` em `backend/src/tipos/index.ts`. NÃO criar `evento.ts` separado — manter um único arquivo de tipos.
4. **Dependência entre serviços**: `EventoService` será passado como parâmetro **opcional** no construtor dos serviços que emitem eventos (`HandoffService`, `SolicitacaoService`). Isso evita quebrar instanciações existentes (testes, middleware antigo) e segue o padrão já usado por `TarefaService` com `DependenciaService`.
5. **Gatilhos implementados nesta fase**:
   - `HandoffService.criar()` → `HANDOFF_CRIADO`
   - `HandoffService.atualizar()` quando `estado` muda para `ACEITO` → `HANDOFF_ACEITO`
   - `HandoffService.atualizar()` quando `estado` muda para `CONCLUIDO` → `HANDOFF_CONCLUIDO`
   - `SolicitacaoService.criar()` quando `agenteResponsavel.id` não é null → `SOLICITACAO_CRIADA`
6. **Gatilhos deliberadamente adiados** (documentar no relatório final):
   - `TarefaService`: schema atual não tem campo `responsavelSeguinte`; adicionar campo novo é fora do escopo mínimo viável.
   - `BloqueioService`: não tem campo claro de destino (`responsavelResolucao` é gravidade, não destinatário).
   - `ConflitoService`: `agenteId` pode ser null e representa agente envolvido, não destinatário.
7. **SchemaValidator**: não precisa de alteração — o construtor lê todos os `.schema.json` de `esquemas/` recursivamente.
8. **SSE**: usar `fs.watch` nativo (não adicionar `chokidar`). Watcher apenas na pasta `.ia/eventos/`.
9. **Tools MCP**: Não expor tool de criar evento manualmente — eventos são efeito colateral.

## Ordem de implementação (para o agente executor)

### 1. `esquemas/evento.schema.json`
Criar schema no estilo exato de `handoff.schema.json`:
- `$id`: `evento`
- Campos: `id` (pattern `^EVT-[A-Z0-9-]+$`), `tipo` (enum dos tipos), `origem`, `destino`, `referenciaTipo`, `referenciaId`, `mensagem`, `estado` (enum `PENDENTE|CONSUMIDO`), `datas` (`criadoEm`, `consumidoEm`)

### 2. `backend/src/tipos/index.ts`
Adicionar ao final do arquivo (antes dos exports de constantes, ou após — manter coerência):
```ts
export interface Evento {
  id: string;
  tipo: TipoEvento;
  origem: string;
  destino: string;
  referenciaTipo: string;
  referenciaId: string;
  mensagem: string;
  estado: EstadoEvento;
  datas: { criadoEm: string | null; consumidoEm: string | null };
}
export interface EventosRegistry {
  eventos: Evento[];
}
export type EstadoEvento = 'PENDENTE' | 'CONSUMIDO';
export type TipoEvento = 'HANDOFF_CRIADO' | 'HANDOFF_ACEITO' | 'HANDOFF_CONCLUIDO' | 'TAREFA_CONCLUIDA' | 'BLOQUEIO_CRIADO' | 'CONFLITO_DETECTADO' | 'SOLICITACAO_CRIADA';
```

### 3. `backend/src/servicios/EventoService.ts`
Seguir exatamente o padrão de `HandoffService.ts`:
- Construtor: `(private fs: FileService, private auditoria: AuditoriaService, private validator: SchemaValidator)`
- `getRegistryPath()`: `.ia/eventos/eventos.json`
- `getEventoPath(id)`: `.ia/eventos/${id}.json`
- `gerarId()`: prefixo `EVT`
- `registrar(dados: Partial<Evento>)`: cria evento, valida, escreve arquivo + registry, registra auditoria
- `listar(filtros?: { destino?, estado? })`: lista com filtros opcionais
- `obter(id)`: lê arquivo individual
- `marcarConsumido(id)`: muda `estado` para `CONSUMIDO` e preenche `consumidoEm`

### 4. `backend/src/servicios/index.ts`
Adicionar `export * from './EventoService';`

### 5. `backend/src/servicios/HandoffService.ts`
- Adicionar `private eventoService?: EventoService` no construtor (opcional)
- Em `criar()`, após sucesso: se `this.eventoService` existir, chamar `this.eventoService.registrar({ tipo: 'HANDOFF_CRIADO', origem: handoff.origem, destino: handoff.destino, referenciaTipo: 'handoff', referenciaId: id, mensagem: `Novo handoff de ${handoff.origem} para ${handoff.destino}` })`
- Em `atualizar()`, após sucesso e persistência: detectar transição de estado
  - Se `dados.estado === 'ACEITO'` e anterior era diferente: emitir `HANDOFF_ACEITO` com `origem: handoff.destino, destino: handoff.origem`
  - Se `dados.estado === 'CONCLUIDO'` e anterior era diferente: emitir `HANDOFF_CONCLUIDO` com `origem: handoff.destino, destino: handoff.origem`
  - Importante: não emitir se o estado não mudou (idempotência)

### 6. `backend/src/servicios/SolicitacaoService.ts`
- Adicionar `private eventoService?: EventoService` no construtor (opcional)
- Em `criar()`, após sucesso: se `this.eventoService` existir E `solicitacao.agenteResponsavel.id` não for null, emitir `SOLICITACAO_CRIADA` com `destino: solicitacao.agenteResponsavel.id`

### 7. `backend/src/servicios/TarefaService.ts`, `BloqueioService.ts`, `ConflitoService.ts`
Adicionar `private eventoService?: EventoService` no construtor (opcional) para preparar extensão futura, mas não adicionar emits ainda.

### 8. `backend/src/api/middleware.ts`
- Adicionar `EventoService` aos imports
- Adicionar `evento: EventoService` à interface `Servicos`
- Em `projectMiddleware`, instanciar `new EventoService(projeto.fileService, projeto.auditoria, projeto.validator)` e passar para os serviços que aceitam:
  - `new HandoffService(projeto.fileService, projeto.auditoria, projeto.validator, req.servicos!.evento)`
  - `new SolicitacaoService(projeto.fileService, projeto.auditoria, projeto.validator, req.servicos!.evento)` — **atenção**: `SolicitacaoService` atualmente não recebe 4º parâmetro. Precisamos adicioná-lo como opcional.
  - Os outros serviços recebem como 4º param opcional também.

### 9. `backend/src/mcp-server/contexto.ts`
Mesmas alterações de `middleware.ts`: importar `EventoService`, adicionar ao `Servicos`, instanciar e passar para `HandoffService` e `SolicitacaoService`.

### 10. `backend/src/mcp-server/tools/eventos.ts`
Seguir exatamente o padrão de `handoffs.ts`:
```ts
mcpServer.registerTool('agentmap_eventos_pendentes', ...)
mcpServer.registerTool('agentmap_eventos_listar', ...)
mcpServer.registerTool('agentmap_eventos_confirmar', ...)
```

Tool `agentmap_eventos_pendentes`:
- Input: `{ agenteId: string }`
- Chama `ctx.dados!.servicos.evento.listar({ destino: agenteId, estado: 'PENDENTE' })`

Tool `agentmap_eventos_listar`:
- Input: `{ filtros?: { destino?, estado? } }` (tudo opcional)
- Chama `ctx.dados!.servicos.evento.listar(filtros)`

Tool `agentmap_eventos_confirmar`:
- Input: `{ id: string }`
- Chama `ctx.dados!.servicos.evento.marcarConsumido(id)`

### 11. `backend/src/mcp-server/tools/index.ts`
Adicionar `import './eventos';`

### 12. `backend/src/api/eventos.ts`
Seguir exatamente `backend/src/api/handoffs.ts`:
- `GET /` → `evento.listar()` (ler `destino` e `estado` de query params)
- `GET /:id` → `evento.obter(id)`
- (Não precisa de POST/PUT/DELETE públicos — eventos são criados internamente. Mas pode ter `PUT /:id/consumir` para o agente confirmar via REST se quiser.)

### 13. `backend/src/api/index.ts`
Adicionar `import { criarEventoRouter } from './eventos';`
Adicionar `router.use('/api/eventos', criarEventoRouter());`

### 14. SSE + frontend (opcional, fazer por último)
- `backend/src/api/eventos.ts`: adicionar `GET /stream` usando `fs.watch` em `.ia/eventos/`
- `frontend/js/api.js`: adicionar métodos `getEventos()`, `confirmarEvento(id)`
- `frontend/js/app.js`: adicionar painel "Eventos" no menu lateral, função `renderizarEventos()`
- **Nota**: SSE é cosmético. O mecanismo de coordenação real é o polling via MCP tool.

### 15. Protocolo do agente (docs)
- `AGENTS.md`: adicionar seção "Coordenação entre Agentes" com a regra de polling
- `docs/protocolo-mcp.md`: adicionar tools `agentmap_eventos_*` na lista
- `docs/guia-agente-mcp.md`: adicionar passo "Consultar Eventos Pendentes" no ciclo de trabalho
- `backend/src/mcp-server/prompts/index.ts`: atualizar prompt `agentmap-iniciar-trabalho` para mencionar `agentmap_eventos_pendentes`

### 16. Testes
- `backend/src/testes/EventoService.test.ts`: seguir padrão de `SolicitacaoService.test.ts`
  - Criar ambiente de teste temporário com pasta `.ia/eventos/`
  - Testar criar, listar (com/sem filtros), obter, marcarConsumido
  - Testar geração de ID `EVT-...`
- `backend/src/testes/HandoffService.test.ts`: adicionar teste que cria handoff e verifica que um evento `HANDOFF_CRIADO` é gerado automaticamente quando `EventoService` é fornecido

## Critérios de aceitação
- `agentmap_handoffs_criar` gera automaticamente um `Evento` persistido
- `agentmap_eventos_pendentes({ agenteId: "back" })` retorna eventos destinados a `back`
- `agentmap_eventos_confirmar({ id })` marca como `CONSUMIDO`
- Nenhuma tool/schema/serviço existente quebra
- `AGENTS.md` deixa claro quando consultar eventos

## Riscos e mitigações
- **Risco**: Injetar `EventoService` em serviços existentes pode quebrar testes que instanciam serviços diretamente sem o 4º parâmetro.
  - **Mitigação**: Tornar o 4º parâmetro **opcional** com valor padrão `undefined`. Os serviços verificam `if (this.eventoService)` antes de emitir.
- **Risco**: HandoffService.atualizar() pode emitir evento duplicado se chamado múltiplas vezes com o mesmo estado.
  - **Mitigação**: Comparar `dados.estado` com `existente.dados.estado` — só emitir quando realmente houver transição.

## Arquivos afetados (lista completa para o executor)

**Novos:**
- `esquemas/evento.schema.json`
- `backend/src/servicios/EventoService.ts`
- `backend/src/mcp-server/tools/eventos.ts`
- `backend/src/api/eventos.ts`
- `backend/src/testes/EventoService.test.ts`

**Modificados:**
- `backend/src/tipos/index.ts`
- `backend/src/servicios/index.ts`
- `backend/src/servicios/HandoffService.ts`
- `backend/src/servicios/SolicitacaoService.ts`
- `backend/src/servicios/TarefaService.ts` (apenas adicionar param opcional)
- `backend/src/servicios/BloqueioService.ts` (apenas adicionar param opcional)
- `backend/src/servicios/ConflitoService.ts` (apenas adicionar param opcional)
- `backend/src/api/middleware.ts`
- `backend/src/mcp-server/contexto.ts`
- `backend/src/mcp-server/tools/index.ts`
- `backend/src/api/index.ts`
- `backend/src/mcp-server/prompts/index.ts`
- `AGENTS.md`
- `docs/protocolo-mcp.md`
- `docs/guia-agente-mcp.md`
- `frontend/js/api.js` (opcional)
- `frontend/js/app.js` (opcional)
