const fs = require('fs');
const path = require('path');
const projectPath = 'G:\\PROJETOS\\AgenteMap_Projetos\\Projeto-Alpha\\.ia';
const files = {
  'agentes/agentes.json': JSON.stringify({agentes:[]}),
  'tarefas/tarefas.json': JSON.stringify({tarefas:[],estatisticas:{}}),
  'contratos/contratos.json': JSON.stringify({contratos:[]}),
  'decisoes/decisoes.json': JSON.stringify({decisoes:[]}),
  'estado/estado-atual.json': JSON.stringify({projetoId:'',estado:'',fase:'',versao:'',agentesAtivos:0,tarefasAtivas:0,tarefasBloqueadas:0,ultimasAlteracoes:[],problemasConhecidos:0,riscosAtivos:0,decisoesRecentes:0,contratosAlterados:0,testes:{total:0,aprovados:0,reprovados:0},qualidade:{percentual:0,pendenciasCriticas:0},seguranca:{estado:'',riscosCriticos:0,riscosAltos:0}}),
  'conhecimento/conhecimento.json': JSON.stringify({conhecimento:[]}),
  'procedimentos/procedimentos.json': JSON.stringify({procedimentos:[]}),
  'dependencias/dependencias.json': JSON.stringify({dependencias:[]}),
  'handoffs/handoffs.json': JSON.stringify({handoffs:[]}),
  'sessoes/sessoes.json': JSON.stringify({sessoes:[]}),
  'checkpoints/checkpoints.json': JSON.stringify({checkpoints:[]}),
  'riscos/riscos.json': JSON.stringify({riscos:[]}),
  'bloqueios/bloqueios.json': JSON.stringify({bloqueios:[]}),
  'pendencias/pendencias.json': JSON.stringify({pendencias:[]}),
  'reservas/reservas.json': JSON.stringify({reservas:[]}),
  'resultados/resultados.json': JSON.stringify({resultados:[]}),
  'criterios/criterios.json': JSON.stringify({criterios:[]}),
  'aprendizados/aprendizados.json': JSON.stringify({aprendizados:[]}),
  'validacoes/validacoes.json': JSON.stringify({validacoes:[]}),
  'contatos/contatos.json': JSON.stringify({contatos:[]}),
  'artefatos/artefatos.json': JSON.stringify({artefatos:[]}),
  'responsabilidades/responsabilidades.json': JSON.stringify({responsabilidades:[]}),
  'auditoria/eventos.json': JSON.stringify({eventos:[]})
};
for (const [rel, content] of Object.entries(files)) {
  const full = path.join(projectPath, rel);
  fs.writeFileSync(full, content, 'utf8');
  console.log('Wrote', rel);
}
