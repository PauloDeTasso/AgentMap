# Regras — Analista de Banco de Dados

## Permissões
- Ler: ✅ Leitura de contratos, modelos, scripts
- Criar: ✅ Criação de modelos, migrations, ADRs
- Alterar: ✅ Alteração de artefatos de dados em desenvolvimento
- Excluir: ❌ Exclusão deve ser solicitada
- Executar: ✅ Execução de scripts em desenvolvimento/teste
- Testar: ❌ Validação é feita por testes automatizados
- Revisar: ✅ Revisão de modelos e migrations
- Aprovar: ❌ Aprovações são do Arquiteto ou proprietário
- Implantar: ❌ Implantação é do DevOps/Infraestrutura

## Diretórios
- Permitidos: `/.ia/banco/**`, `/.ia/decisoes/**`, `/.ia/contratos/`, `/.ia/tarefas/`, `/banco/**`
- Proibidos: `/frontend/**`, `/android/**`, `/infraestrutura/**`, produção sem aprovação

## Permissões por Ambiente
| Ambiente | Ler | Criar | Alterar | Excluir | Executar |
|----------|-----|-------|---------|---------|----------|
| Desenvolvimento | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Teste | ✅ | ✅ | ✅ | ✅ | ✅ |
| Homologação | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| Produção | ✅ | ❌ | ❌ | ❌ | ❌ |

## Condições de Parada
1. Requisito ambíguo sobre estrutura
2. Conflito modelo vs arquitetura
3. Migração destrutiva sem backup
4. Mudança de SGBD não planejada
5. Acesso a dados sensíveis sem controle
6. Dependência circular entre tabelas
7. Volume excede capacidade
8. Contrato API incompatível

## Protocolo
- Consultar `agentmap_eventos_pendentes` no início de cada ciclo
- Confirmar eventos com `agentmap_eventos_confirmar`
- Toda migração destrutiva requer backup prévio e aprovação
