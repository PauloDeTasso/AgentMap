# Guia de Contribuição

> **Versão:** 2.0.0  
> **Data:** 2026-08-28  
> **Branch:** v0044

---

## 1. Código de Conduta

- Seja respeitoso e colaborativo
- Aceite feedback construtivo
- Foque no que é melhor para o projeto
- Mostre empatia com outros membros da comunidade

---

## 2. Como Contribuir

### 2.1 Reportar Bugs

1. Verifique se o bug já foi reportado em [Issues](../../issues)
2. Crie uma nova issue com:
   - Título descritivo
   - Passos para reproduzir
   - Comportamento esperado vs atual
   - Ambiente (OS, Node.js, versão do AgentMap)
   - Logs relevantes

### 2.2 Sugerir Features

1. Abra uma issue com a tag `enhancement`
2. Descreva o problema que a feature resolve
3. Proponha uma solução
4. Aguarde feedback da equipe

### 2.3 Contribuir com Código

1. Fork o repositório
2. Crie uma branch:
   ```bash
   git checkout -b feat/minha-feature
   ```
3. Faça suas alterações
4. Rode os testes:
   ```bash
   npm run quality
   ```
5. Commit:
   ```bash
   git commit -m "feat: adiciona minha feature"
   ```
6. Push:
   ```bash
   git push origin feat/minha-feature
   ```
7. Abra um Pull Request

---

## 3. Padrões de Código

### 3.1 TypeScript

- Use TypeScript strict mode
- Evite `any` — prefira tipos explícitos
- Documente interfaces públicas com JSDoc

### 3.2 Commits

Siga [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona filtro de tarefas
fix: corrige validação de dependências
docs: atualiza guia de instalação
refactor: simplifica ProjetoService
test: adiciona testes de integração
chore: atualiza dependências
```

### 3.3 Branches

| Tipo | Prefixo | Exemplo |
|------|---------|---------|
| Feature | `feat/` | `feat/filtro-tarefas` |
| Bugfix | `fix/` | `fix/validacao-dependencias` |
| Docs | `docs/` | `docs/guia-instalacao` |
| Refactor | `refactor/` | `refactor/projeto-service` |
| Test | `test/` | `test/handoffs-integration` |
| Chore | `chore/` | `chore/update-deps` |

---

## 4. Testes

### 4.1 Obrigatório

- Todos os PRs devem incluir testes
- Testes unitários para novas features
- Testes de integração para novas rotas/tools
- Cobertura não pode diminuir

### 4.2 Comandos

```bash
# Testes unitários
npm test

# Com coverage
npm run test:coverage

# Quality gates (obrigatório antes de PR)
npm run quality
```

---

## 5. Documentação

### 5.1 Obrigatório

- Atualize `docs/` quando adicionar/modificar features
- Atualize `CHANGELOG.md` com a mudança
- Adicione exemplos de uso

### 5.2 Estrutura

```
docs/
├── architecture.md      ← Arquitetura
├── installation.md      ← Instalação
├── cli.md              ← CLI
├── development.md      ← Guia de dev
├── testing.md          ← Estratégia de testes
├── quality-gates.md    ← Quality gates
├── release.md          ← Processo de release
├── migration.md        ← Migração
├── troubleshooting.md  ← Troubleshooting
└── contributing.md     ← Este arquivo
```

---

## 6. Revisão de Código

### 6.1 Checklist do Revisor

- [ ] Código segue os padrões do projeto
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] Sem secrets ou credenciais
- [ ] Sem código comentado desnecessário
- [ ] Performance considerada
- [ ] Segurança considerada

### 6.2 Aprovação

- Mínimo 1 aprovação para PRs de documentação
- Mínimo 2 aprovações para PRs de código
- CI deve estar verde

---

## 7. Ambiente de Desenvolvimento

### 7.1 Setup

```bash
# 1. Clone
git clone https://github.com/seu-usuario/AgentMap.git
cd AgentMap

# 2. Instale dependências
cd backend
npm install

# 3. Inicie o ambiente
npm run dev
```

### 7.2 Worktree por Feature

```bash
# Crie worktrees isolados para features grandes
git worktree add .kilo/worktrees/feat-x -b feat/x
```

---

## 8. Issues e Labels

| Label | Descrição |
|-------|-----------|
| `bug` | Algo não funciona como esperado |
| `enhancement` | Nova feature ou solicitação |
| `documentation` | Melhorias ou adições na documentação |
| `good first issue` | Bom para iniciantes |
| `help wanted` | Precisa de ajuda da comunidade |
| `P0` | Crítico, bloqueia release |
| `P1` | Importante, deve ser feito no sprint |
| `P2` | Menor, pode esperar |

---

## 9. Segurança

### 9.1 Reportar Vulnerabilidades

**NÃO abra issues públicas para vulnerabilidades de segurança.**

Envie um email para: security@agentmap.local

Inclua:
- Descrição da vulnerabilidade
- Passos para reproduzir
- Impacto potencial
- Sugestão de correção (se houver)

### 9.9 Boas Práticas

- Nunca commite secrets ou credenciais
- Valide todas as entradas de usuário
- Siga o princípio do menor privilégio
- Consulte o agente de Segurança para mudanças sensíveis

---

## 10. Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a licença MIT do projeto.

---

## 11. Contato

- **Issues:** [GitHub Issues](../../issues)
- **Discussões:** [GitHub Discussions](../../discussions)
- **Documentação:** [`docs/`](../)

---

## 12. Referências

- [`docs/development.md`](development.md)
- [`docs/testing.md`](testing.md)
- [`docs/quality-gates.md`](quality-gates.md)
- [`AGENTS.md`](../AGENTS.md)
