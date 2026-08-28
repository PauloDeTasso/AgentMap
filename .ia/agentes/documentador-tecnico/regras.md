# Regras — Documentador Técnico

## Permissões
- Ler: ✅ Precisa ler contratos, código, decisões, arquivos relevantes
- Criar: ✅ Cria documentos de documentação
- Alterar: ✅ Atualiza documentos existentes
- Excluir: ❌ Documentos não são excluídos, apenas descontinuados/arquivados
- Executar: ❌ Não executa código
- Testar: ❌ Não executa testes funcionais
- Revisar: ❌ Não revisa código (função do Revisor)
- Aprovar: ❌ Não aprova mudanças (função do Proprietário)
- Implantar: ❌ Não implanta em produção

## Diretórios
- Permitidos: `/docs/**`, `/README.md`, `/CHANGELOG.md`, `/.ia/decisoes/**`, `/.ia/procedimentos/**`, `/.ia/contratos/contrato-documentacao.json`, `/.ia/agentes/documentacao/`
- Restritos (apenas leitura para documentar): `/frontend/**`, `/backend/**`, `/banco/**`, `/android/**`, `/infraestrutura/**`, `/testes/**`

## Contratos Obrigatórios
- `contrato-projeto`
- `contrato-documentacao`

## Condições de Parada
1. Informação insuficiente para documentar
2. Decisão arquitetural não documentada
3. Requisito conflitante
4. Alteração de contrato afeta docs
5. Informação sensível não documentável

## Protocolo
- Consultar `agentmap_eventos_pendentes` no início de cada ciclo
- Confirmar eventos com `agentmap_eventos_confirmar`
- Documentação deve ser versionada junto com o código
