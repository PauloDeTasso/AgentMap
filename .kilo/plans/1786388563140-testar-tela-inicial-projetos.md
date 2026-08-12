# Plano: Testar tela inicial com nova pasta padrão

## Contexto
- Pasta padrão já foi alterada para `G:\PROJETOS\AgenteMap_Projetos`
- Backend endpoint `/api/projetos/scan` funciona e encontrou 3 projetos
- Tela inicial `renderizarTelaInicial()` já implementada para listar projetos
- Usuário quer apagar os 3 projetos atuais e criar 2-3 novos para validar o comportamento

## Passos
1. Apagar as pastas dos projetos existentes em `G:\PROJETOS\AgenteMap_Projetos`:
   - `A`
   - `aa`
   - `Novo-Projeto-Teste`
2. Criar 2-3 novos projetos diretamente nas pastas para simular projetos reais
3. Reiniciar o AgentMap (`scripts/restart-agentmap.ps1`)
4. Acessar `http://localhost:3150/index.html` sem projeto aberto
5. Verificar se a tela inicial lista automaticamente os novos projetos encontrados
6. Validar que o botão **Abrir** de cada projeto funciona corretamente

## Critérios de sucesso
- Tela inicial exibe a lista de projetos encontrados
- Caminho exibido corresponde a `G:\PROJETOS\AgenteMap_Projetos\<nome>`
- Botão **Abrir** abre o projeto corretamente
- Botão **Criar Novo Projeto** continua funcionando
- Modal **Configurações** abre e permite alterar a pasta padrão

## Riscos
- Frontend pode estar usando cache do browser; usar `Ctrl+F5` para forçar reload
- Se `settings.json` não existir, o backend usa o default do código
