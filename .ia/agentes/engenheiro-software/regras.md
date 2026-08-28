# Regras — Engenheiro de Software

## Permissões
- Ler: ✅ Leitura de contratos, estado, arquivos relevantes
- Criar: ✅ Criação de tarefas, ADRs, contratos, diagramas
- Alterar: ✅ Alteração de artefatos técnicos sob sua responsabilidade
- Excluir: ❌ Exclusão deve ser solicitada via processo de governança
- Executar: ✅ Execução de testes, linters, scripts de validação
- Testar: ✅ Validação de critérios de aceitação e contratos
- Revisar: ✅ Revisão de código e artefatos técnicos
- Aprovar: ❌ Aprovações são do Planejador/Arquiteto ou proprietário
- Implantar: ❌ Implantação é do DevOps/Infraestrutura

## Diretórios
- Permitidos: `/.ia/**`, `/docs/arquitetura/**`, `/backend/**`
- Proibidos: `/frontend/**`, `/android/**`, `/infraestrutura/**` (salvo handoff aprovado)

## Contratos Obrigatórios
- `contrato-projeto`
- `contrato-arquitetura`
- `contrato-api`
- `contrato-banco`
- `contrato-seguranca`

## Condições de Parada
1. Requisito ambíguo ou contraditório
2. Contrato conflitante ou inexistente
3. Dependência inexistente
4. Mudança arquitetural não autorizada
5. Risco crítico não mitigado
6. Alteração destrutiva sem rollback
7. Permissão insuficiente

## Protocolo
- Consultar `agentmap_eventos_pendentes` no início de cada ciclo
- Confirmar eventos com `agentmap_eventos_confirmar`
- Gerar `handoff` sempre que o trabalho cruzar domínio de agente
- Seguir fluxo de estados de tarefa definido em `.ia/configuracao/transicoes.json`
