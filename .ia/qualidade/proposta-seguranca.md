# Proposta de Segurança — Agente Segurança

> **Versão:** 1.0.0  
> **Data:** 2026-08-27  
> **Autor:** Agente Segurança (AgentMap)  
> **Branch:** v0044  
> **Status:** Proposta para aprovação  

---

## 1. Diagnóstico de Segurança Atual

### 1.1 Pontos Fortes

- Proteção contra path traversal
- CORS configurável
- Validação Zod em escritas
- OpenTelemetry para auditoria
- Princípio "arquivo é informação principal" reduz superfície

### 1.2 Vulnerabilidades Identificadas

| ID | Vulnerabilidade | Severidade | Descrição |
|----|-----------------|------------|-----------|
| VUL-01 | Secrets hardcoded | Alta | Credenciais PostgreSQL em código |
| VUL-02 | Sem rate limiting | Alta | Endpoints públicos suscetíveis a DoS |
| VUL-03 | Logging via console | Média | Sem agregação, dificulta forense |
| VUL-04 | tslint descontinuado | Média | Sem atualizações de segurança |
| VUL-05 | Dispatcher executa comandos | Alta | Superfície de ataque sem sandbox |
| VUL-06 | Sem dependency scanning | Média | Vulnerabilidades em dependências |
| VUL-07 | Sem input sanitization | Média | Validação Zod pode ser insuficiente |
| VUL-08 | Sem autenticação/autorização | Alta | Qualquer acesso local tem acesso total |
| VUL-09 | CORS amplo em dev | Baixa | Pode ser esquecido em prod |
| VUL-10 | Sem backup automatizado | Média | Perda de dados em incidente |

### 1.3 Gaps de Segurança

- Sem política de secrets
- Sem SAST/DAST automatizado
- Sem plano de incident response
- Sem testes de segurança
- Sem rate limiting
- Sem autenticação
- Sem auditoria de acesso

---

## 2. Análise de Ameaças

### 2.1 Threat Model

| Ameaça | Vetor | Impacto | Probabilidade |
|--------|-------|---------|---------------|
| Path traversal | HTTP | Alto | Baixa |
| DoS (sem rate limit) | HTTP | Alto | Média |
| Exposição de secrets | Código/Git | Crítico | Baixa |
| Execução remota (dispatcher) | HTTP | Crítico | Baixa |
| Injeção (logs) | Input | Médio | Média |
| Dependency compromise | Supply chain | Alto | Média |

### 2.2 Superfície de Ataque

```
Internet
  ↓
localhost:3150 (CORS)
  ↓
/api/* (sem auth)
  ↓
projectMiddleware
  ↓
filesystem (path traversal risk)
  ↓
JSON files (injection risk)
  ↓
dispatcher/executar (command injection risk)
```

---

## 3. Controles de Segurança

### 3.1 Autenticação e Autorização

**Atual:** Sem autenticação (acesso local assumed)  
**Proposta:**

```typescript
// Middleware de autenticação básica
interface AuthConfig {
  enabled: boolean;
  method: 'token' | 'oauth2';
  token?: string;
}

// Rate limiting
app.register(rateLimit, {
  max: 100,
  timeWindow: '1m',
  keyGenerator: (req) => req.ip
});
```

### 3.2 Criptografia

- HTTPS em produção (TLS reverso proxy)
- Secrets em variáveis de ambiente (nunca em código)
- HMAC para webhooks
- Senhas nunca armazenadas (não aplicável atualmente)

### 3.3 Validação de Entrada

```typescript
// Sanitização em camadas
const sanitize = (input: string): string => {
  return input.replace(/[<>{}]/g, '').trim();
};

// Validação Zod + sanitização
const schema = z.object({
  nome: z.string().min(1).max(100).transform(sanitize)
});
```

### 3.4 Rate Limiting

```typescript
// Proteção por endpoint
app.register(rateLimit, {
  max: 100,
  timeWindow: '1m'
});

// MCP tools com limite próprio
app.register(rateLimit, {
  max: 50,
  timeWindow: '1m',
  keyGenerator: (req) => `mcp:${req.headers['x-agent-id']}`
});
```

### 3.5 CORS

```typescript
// Configuração por ambiente
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://agentmap.app']
    : ['http://localhost:3150', 'http://localhost:5173'],
  credentials: true
};
```

---

## 4. Segurança by Design

### 4.1 Princípios

1. **Least Privilege:** permissões mínimas necessárias
2. **Defense in Depth:** múltiplas camadas de proteção
3. **Fail Secure:** falhas não expõem dados
4. **Audit Everything:** tudo registrado
5. **Secure by Default:** configurações seguras por padrão

### 4.2 Secure Coding Guidelines

- Nunca confiar em input do usuário
- Validar e sanitizar tudo
- Nunca expor stack traces em produção
- Usar prepared statements (se usar DB)
- Principio de menor privilégio para arquivos

### 4.3 Security Testing

- SAST: ESLint security plugin
- DAST: OWASP ZAP em staging
- Dependency scanning: Snyk
- Pen-test: trimestral

### 4.4 DevSecOps

```yaml
# CI pipeline security
security-scan:
  - npm audit
  - snyk test
  - eslint-plugin-security
  - owasp zap scan
```

---

## 5. Conformidade

### 5.1 LGPD

- ✅ Sem dados pessoais armazenados
- ✅ Direito ao esquecimento (exclusão de projeto)
- ⚠️ Logs podem conter dados sensíveis — mascarar

### 5.2 OWASP Top 10

| Risco | Status | Mitigação |
|-------|--------|-----------|
| A01: Broken Access Control | ⚠️ | Implementar auth |
| A02: Cryptographic Failures | ✅ | TLS + secrets em env |
| A03: Injection | ⚠️ | Sanitização + validação |
| A04: Insecure Design | ⚠️ | Threat modeling |
| A05: Security Misconfiguration | ⚠️ | Hardening checklist |
| A06: Vulnerable Components | ⚠️ | Snyk + npm audit |
| A07: Auth Failures | ❌ | Implementar auth |
| A08: Data Integrity Failures | ⚠️ | Checksums em arquivos |
| A09: Logging Failures | ⚠️ | Pino + máscara de PII |
| A10: SSRF | ✅ | Sem requisições externas não controladas |

---

## 6. Monitoramento de Segurança

### 6.1 Logs de Segurança

```typescript
logger.info({
  type: 'SECURITY',
  action: 'path_traversal_attempt',
  path: attemptedPath,
  ip: req.ip
});
```

### 6.2 Alertas

- Tentativas de path traversal
- Rate limit excedido
- Erros de autenticação
- Acesso a arquivos sensíveis

### 6.3 Incident Response

```markdown
1. DETECTAR — Alerta ou anomalia
2. CONTER — Isolar afetado
3. ERADICAR — Remover causa
4. RECUPERAR — Restaurar serviço
5. LIÇÕES — Post-mortem
```

---

## 7. Gestão de Vulnerabilidades

### 7.1 Scanning

| Ferramenta | Frequência | Tipo |
|------------|------------|------|
| npm audit | CI diário | Dependency |
| Snyk | CI diário | Dependency |
| ESLint security | Pre-commit | SAST |
| OWASP ZAP | Pós-deploy | DAST |

### 7.2 Patch Management

- Dependabot para atualizações automáticas
- Critical patches em 24h
- High patches em 7 dias
- Medium/Low em próximo sprint

---

## 8. Backup e Recovery

### 8.1 Política de Backup

```yaml
backup:
  frequency: daily
  retention: 30 days
  storage: local + remote (S3/future)
  encryption: true
```

### 8.2 RPO/RTO

| Cenário | RPO | RTO |
|---------|-----|-----|
| Perda de arquivos JSON | 1 dia | 30min |
| Corrupção de projeto | 1 dia | 1h |
| Falha completa | 7 dias | 2h |

### 8.3 Disaster Recovery

- Backup automático antes de migrações
- Script de restore testado mensalmente
- Documentação de procedimentos

---

## 9. Backlog de Segurança

| ID | Tarefa | Prioridade | Esforço |
|----|--------|-----------|---------|
| S1 | Externalizar secrets para .env | Alta | 4h |
| S2 | Implementar rate limiting | Alta | 4h |
| S3 | Sanitização de input | Alta | 4h |
| S4 | Configurar ESLint security | Média | 2h |
| S5 | Configurar Snyk | Média | 2h |
| S6 | Implementar logging estruturado | Média | 4h |
| S7 | Sandbox para dispatcher | Alta | 8h |
| S8 | Autenticação básica | Média | 8h |
| S9 | CORS por ambiente | Média | 2h |
| S10 | Política de backup | Média | 4h |

**Total:** 42h (~5 dias úteis)

---

## 10. Métricas de Segurança

| KPI | Meta | Medição |
|-----|------|---------|
| Vulnerabilidades críticas | 0 | Snyk/npm audit |
| Vulnerabilidades high | < 5 | Snyk/npm audit |
| Tempo de patch (critical) | < 24h | Issue tracker |
| Cobertura de testes de segurança | 100% endpoints | ZAP scan |
| Secrets em código | 0 | GitLeaks |

---

*Documento gerado pelo Agente Segurança do AgentMap*  
*Branch: v0044 | Data: 2026-08-27*
