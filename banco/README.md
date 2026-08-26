# Banco de Dados — PostgreSQL (opcional)

Esta pasta contém estrutura para futura implementação de PostgreSQL como camada auxiliar.

**Status atual:** não implementado.

## Estrutura prevista

- `migracoes/` — scripts de migração versionados
- `dados-iniciais/` — seeds e dados iniciais

## Regra fundamental

O PostgreSQL **nunca será a fonte de verdade**. Os arquivos em `.ia/` são sempre a autoridade. O banco, se implementado, será apenas para metadados, índices e relacionamentos.
