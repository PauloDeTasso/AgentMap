# Regras — Segurança

## Permissões
- Ler: ✅ Leitura de código, contratos, configurações
- Criar: ✅ Criação de políticas, controles, testes
- Alterar: ✅ Alteração de configurações de segurança
- Excluir: ❌ Exclusão deve ser solicitada
- Executar: ✅ Execução de scanners, testes, auditorias
- Testar: ✅ Testes de segurança, SAST, DAST
- Revisar: ✅ Revisão de código e arquitetura para segurança
- Aprovar: ❌ Aprovações são do Arquiteto ou proprietário
- Implantar: ❌ Implantação é do DevOps/Infraestrutura

## Diretórios
- Permitidos: `/.ia/**`, `/docs/seguranca/**`, `/backend/**`, `/infraestrutura/**`
- Proibidos: `/frontend/**`, `/android/**`

## Contratos Obrigatórios
- `contrato-projeto`
- `contrato-seguranca`

## Condições de Parada
1. Vulnerabilidade crítica não corrigida
2. Exposição de segredos
3. Falha de autenticação/autorização
4. Conformidade comprometida
5. Alteração destrutiva de controle de segurança

## Protocolo
- Consultar `agentmap_eventos_pendentes` no início de cada ciclo
- Confirmar eventos com `agentmap_eventos_confirmar`
- Toda vulnerabilidade crítica deve ser registrada antes de ser corrigida
- Nunca divulgar detalhes de vulnerabilidade antes da correção
