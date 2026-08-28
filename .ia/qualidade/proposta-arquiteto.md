# Proposta Arquitetural — Arquiteto de Software

> **Versão:** 1.0.0  
> **Data:** 2026-08-27  
> **Autor:** Arquiteto de Software (AgentMap)  
> **Branch:** v0044  
> **Status:** Proposta para aprovação  

---

## 1. Diagnóstico Arquitetural Atual

### 1.1 Pontos Fortes

- **Separação de camadas:** API HTTP e MCP Server separados
- **State machines centralizadas:** transições validadas por domínio
- **Filesystem + JSON:** filosofia alinhada com "arquivo é informação principal"
- **Validação dupla:** Zod (runtime) + JSON Schema (estrutural)
- **Observabilidade:** OpenTelemetry já presente
- **Multiplataforma:** path.win32 normalizado para path.join

### 1.2 Gaps Arquiteturais

| Gap | Severidade | Descrição |
|-----|------------|-----------|
| **Arquitetura em camadas não explícita** | Alta | Código organizado por tipo (services, schemas) não por domínio |
| **Acoplamento API↔MCP** | Alta | Mesma regra de negócio em 2 lugares (REST + MCP tools) |
| **Serviços por requisição** | Alta | `projectMiddleware` recria ~30 serviços a cada request |
| **Duas instâncias de MonitoramentoService** | Alta | Router antes do middleware + instância por request |
| **Sem interface de repositório** | Média | Serviços acessam filesystem diretamente |
| **Configuração global singleton** | Média | `loadSettings()` com cache mutável |
| **Sem event bus formal** | Média | EventEmitter local, não há barramento de domínio |
| **Sem estratégia de cache** | Baixa | Leituras repetitivas de JSON sem cache |

### 1.3 Acoplamentos Excessivos

- `ProjetoService` como façade para todos os domínios
- Frontend servido pelo backend (impossibilita deploy separado)
- Configuração global acessível de qualquer ponto
- Monitoramento acoplado a instância de serviço

### 1.4 Violações de Princípios

- **SRP:** `ProjetoService` com múltiplas responsabilidades
- **OCP:** Alterações em regras de negócio requerem mudanças em múltiplos arquivos
- **DIP:** Serviços dependem de implementações concretas (filesystem), não de abstrações
- **ISP:** Interfaces grandes não segregadas por domínio

---

## 2. Proposta de Arquitetura Alvo

### 2.1 Arquitetura Hexagonal (Ports & Adapters)

```
                    ┌─────────────────────────────┐
                    │     Framework / Drivers      │
                    │  (Express, MCP, CLI, UI)     │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │    Application Layer        │
                    │  (Use Cases / Services)     │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Domain Layer (Core)       │
                    │  (Entities, Rules, Events)  │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Infrastructure Layer      │
                    │  (Filesystem, JSON, OTel)   │
                    └─────────────────────────────┘
```

### 2.2 Princípios

- **Clean Architecture:** regras de domínio não dependem de frameworks
- **DDD Lite:** agregados por domínio (Projeto, Tarefa, Agente, etc.)
- **Event-Driven:** eventos como fonte de verdade para mudanças
- **CQRS:** comandos e consultas separados
- **SOLID:** aplicação rigorosa dos 5 princípios

### 2.3 Camadas

| Camada | Responsabilidade | Dependências |
|--------|-----------------|--------------|
| **Domain** | Entidades, value objects, regras, eventos | Nenhuma (pura) |
| **Application** | Use cases, orquestração, DTOs | Domain |
| **Infrastructure** | Repositórios, adapters, serviços externos | Domain, Application |
| **Presentation** | Controllers HTTP, MCP tools, UI | Application |

---

## 3. Evolução por Camada

### 3.1 Apresentação

- **Frontend desacoplado:** repositório separado com React + Vite
- **API Gateway:** Fastify como substituto do Express
- **MCP Server:** mantém-se, mas shared com mesma camada de aplicação
- **SSE/WebSocket:** substitui polling para wake-up

### 3.2 Aplicação

- **Use Cases explícitos:** um por operação de negócio
- **Command/Query separados:** CQRS
- **Event Handlers:** reagem a eventos de domínio
- **Sem serviço monolítico:** decomposição por domínio

### 3.3 Domínio

- **Agregados:** Projeto, Tarefa, Agente, Contrato, Handoff
- **Eventos de Domínio:** `ProjetoCriado`, `TarefaCriada`, `HandoffIniciado`
- **Value Objects:** `ProjetoId`, `TarefaId`, `AgenteId`
- **Regras:** state machines por entidade

### 3.4 Infraestrutura

- **Repositórios:** interfaces no domínio, implementação em infra
- **Filesystem:** adapter para JSON + futuramente PostgreSQL
- **Mensageria:** EventBus formal com DLQ
- **Cache:** Redis opcional para consultas

---

## 4. Novos Componentes Propostos

### 4.1 Event Bus / Message Broker

```typescript
interface DomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  timestamp: Date;
  payload: unknown;
}

interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(type: string, handler: (event: DomainEvent) => Promise<void>): void;
}
```

**Benefícios:**
- Desacoplamento entre domínios
- Audit trail automático
- Replay de eventos para debugging

### 4.2 CQRS

**Command Side:**
- `POST /api/v1/tarefas` → valida + cria evento `TarefaCriada`
- `PUT /api/v1/tarefas/:id` → valida transição + atualiza

**Query Side:**
- `GET /api/v1/tarefas` → consulta índice/materialized view
- `GET /api/v1/projetos/:id/mapa` → mapa otimizado para leitura

### 4.3 Plugin System

```typescript
interface AgentMapPlugin {
  name: string;
  version: string;
  onEvent(event: DomainEvent): Promise<void>;
  onCommand(command: Command): Promise<Result>;
}
```

**Benefícios:**
- Extensibilidade sem modificar core
- Integração com ferramentas externas
- Hooks para customização

### 4.4 Pipeline de Eventos

```
Command → Validator → EventPublisher → EventStore → Projector → ReadModel
```

---

## 5. Roadmap de Migração

### Fase 1: Fundação (Sprints 1-2)
- Criar estrutura de pastas por domínio
- Definir interfaces de repositório
- Implementar Event Bus básico

### Fase 2: Desacoplamento (Sprints 3-4)
- Migrar serviços para use cases
- Implementar CQRS básico
- Separar frontend em repositório próprio

### Fase 3: Event-Driven (Sprints 5-6)
- Substituir EventEmitter por Event Bus
- Implementar projections
- Adicionar SSE para comunicação

### Fase 4: Otimização (Sprints 7-8)
- Cache e indexação
- PostgreSQL opcional
- Performance tuning

### Riscos de Migração

| Risco | Mitigação |
|-------|-----------|
| Regressão funcional | Feature flags + testes de contrato |
| Performance | Migração gradual por domínio |
| Complexidade | Documentação ADR + pair programming |

---

## 6. ADRs Propostos

### ADR-0001: Arquitetura Hexagonal
**Contexto:** Código atual acoplado a Express e filesystem  
**Decisão:** Adotar Clean Architecture / Hexagonal  
**Consequências:** Código mais testável, curva de aprendizado

### ADR-0002: Event Bus como Barramento de Domínio
**Contexto:** EventEmitter local, sem persistência  
**Decisão:** Implementar Event Bus formal com Event Store  
**Consequências:** Desacoplamento, audit trail, replay

### ADR-0003: CQRS para Consultas
**Contexto:** Leitura e escrita misturadas, performance degrada com volume  
**Decisão:** Separar comandos e consultas, usar materialized views  
**Consequências:** Performance, complexidade adicional

### ADR-0004: Frontend Desacoplado
**Contexto:** Frontend servido pelo backend  
**Decisão:** Repositório separado com React + Vite  
**Consequências:** Deploy independente, CDN, SSR futuro

### ADR-0005: Fastify como HTTP Framework
**Contexto:** Express com performance limitada  
**Decisão:** Migrar para Fastify  
**Consequências:** Performance, validação nativa, tipagem

### ADR-0006: PostgreSQL como Índice Opcional
**Contexto:** Filesystem não escala para busca  
**Decisão:** PostgreSQL apenas para leitura/índice  
**Consequências:** Mantém filosofia filesystem-first

### ADR-0007: Plugin System
**Contexto:** Necessidade de extensibilidade  
**Decisão:** Sistema de plugins com hooks  
**Consequências:** Ecossistema, flexibilidade

---

## 7. Métricas de Arquitetura

| Métrica | Baseline | Alvo |
|---------|----------|------|
| Acoplamento (afferent/efferent) | Alto | Baixo |
| Cobertura de testes | ~15% | ≥80% |
| Tempo de startup | N/A | <5s |
| Tempo de resposta P95 | N/A | <200ms |

---

*Documento gerado pelo Arquiteto de Software do AgentMap*  
*Branch: v0044 | Data: 2026-08-27*
