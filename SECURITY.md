# Segurança — AgentMap

Este documento descreve as premissas e regras de segurança do projeto.

## Princípios

1. Dados dos projetos são locais.
2. O AgentMap não envia dados para servidores externos.
3. O AgentMap não coleta telemetria.
4. O AgentMap não coleta informações do computador sem uma operação explícita do usuário.
5. Credenciais não fazem parte do repositório.
6. Configurações locais ficam fora do Git.
7. Projetos reais ficam fora do repositório.
8. Exemplos utilizados no Git são fictícios.
9. Caminhos reais do Windows não devem aparecer em documentação, testes ou exemplos versionados.
10. O banco de dados local não é versionado.

## O que não deve ser coletado automaticamente

- nome do usuário
- nome do computador
- IP
- MAC Address
- serial do hardware
- lista de programas instalados
- variáveis de ambiente
- tokens
- chaves SSH
- credenciais
- histórico do navegador
- arquivos pessoais

## Observação

Mesmo com o `.gitignore`, não devemos assumir que ele impede vazamentos. O repositório deve ser tratado como público por padrão.
