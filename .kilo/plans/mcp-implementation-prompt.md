# Prompt para Próximo Agente — Implementação MCP no AgentMap

## Contexto
Você está trabalhando no projeto **AgentMap** em `G:\PROJETOS\WEB\AgentMap`.
O objetivo é adicionar uma camada MCP (Model Context Protocol) como extensão modular, read-only na primeira fase, sem recriar ou quebrar o que já funciona.

## Arquivo do Plano
Leia OBRIGATORIAMENTE antes de qualquer alteração:
`G:\PROJETOS\WEB\AgentMap\docs\plano-implementacao-mcp.md`

## Estado Atual
- Backend Express + TypeScript em `backend/`
- Frontend HTML/CSS/JS em `frontend/`
- MCP já tem estrutura parcial em `backend/src/mcp-server/`, mas está **quebrada** porque foi feita com Zod incorreto e depois removida
- Backend funciona em `http://localhost:3150`
- Inicialização por desktop: `AgentMap.html` + scripts em `scripts/`
- `kilo.jsonc` já configurado com MCP, mas tools não funcionam

## Estado Atual do Trabalho
- **ETAPA 1: Fundação** — Em andamento
- Estrutura `backend/src/mcp/` criada
- Próximo: implementar `security/pathValidator.ts` e `security/projectAuth.ts`
- Nenhuma modificação feita no core do AgentMap até agora

## Regras Absolutas
1. NÃO recrie o AgentMap
2. NÃO substitua arquitetura existente
3. NÃO remova funcionalidades existentes
4. NÃO reestruture desnecessariamente
5. MCP é uma EXTENSÃO, não um substituto
6. Primeiro fase: READ-ONLY (9 tools da seção 15)
7. Sempre reutilizar serviços existentes (`ProjetoService`, `AgenteService`, `FileService`, `AuditoriaService`, etc.)
8. Nunca duplicar regras de negócio
9. Segurança primeiro: path traversal protection, project allowlist, input validation, output limits
10. O AgentMap deve continuar funcionando se MCP estiver desligado

## Onde Começar
ETAPA 1 do plano: **Fundação** (sem modificar core)

Criar estrutura em `backend/src/mcp/`:
```
mcp/
├── server/
│   ├── index.ts
│   └── config.ts
├── tools/
│   ├── index.ts
│   ├── obterContextoProjeto.ts
│   ├── obterContextoTarefa.ts
│   ├── buscarConhecimento.ts
│   ├── obterArquitetura.ts
│   ├── buscarSimbolo.ts
│   ├── buscarReferencias.ts
│   ├── lerTrechoArquivo.ts
│   ├── obterAgente.ts
│   └── recomendarAgente.ts
├── security/
│   ├── pathValidator.ts
│   └── projectAuth.ts
├── context/
│   └── contexto.ts
├── mapper/
│   └── mapeadores.ts
├── audit/
│   └── auditoria.ts
└── schemas/
    └── validacao.ts
```

## Ordem de Implementação
1. `security/pathValidator.ts` — proteção contra path traversal, whitelist de diretórios
2. `security/projectAuth.ts` — verificação de projeto autorizado
3. `context/contexto.ts` — carregar `ProjetoAberto` via `ProjetoService.getProjetoAtual()`
4. `mapper/mapeadores.ts` — converter entidades para formato MCP limpo
5. `audit/auditoria.ts` — logs de tools MCP sem segredos
6. `schemas/validacao.ts` — schemas de entrada/saída
7. `server/config.ts` — configuração centralizada MCP
8. `server/index.ts` — servidor MCP mínimo com stdio
9. Tools read-only na ordem: `obterContextoProjeto` → `obterArquitetura` → `obterAgente` → `recomendarAgente` → `lerTrechoArquivo` → `buscarSimbolo` → `buscarReferencias` → `buscarConhecimento` → `obterContextoTarefa`

## Problemas Conhecidos
- Não use `inputSchema` com Zod no formato antigo; use `z.object({...})`
- Não remova `inputSchema` — o SDK atual exige Zod
- TypeScript: não use `globalThis` com index signature; use `declare global`
- `Router` não tem `handle()` — não chame `router.handle()` dentro de rotas
- Backend usa `path.win32` — respeite isso em paths
- `FileService` já tem `resolveProjectPath()` e `isPathSafe()` — use-os
- Serviços seguem padrão: `constructor(fs, auditoria, validator, dependencia?)`
- `ProjetoAberto` em `ProjetoService.ts` tem tudo que o MCP precisa

## Validação
Após cada etapa:
```bash
cd G:\PROJETOS\WEB\AgentMap\backend
npx tsc --noEmit
```

Antes de testar integração MCP:
```bash
npm run mcp
```

## Documentação
Atualize `docs/arquitetura-mcp.md` após cada etapa significativa.

## Quando Parar
Se encontrar conflito com arquitetura existente, PARE e documente o conflito antes de prosseguir.
