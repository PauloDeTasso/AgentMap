import { api } from '../../api.js';

const FASES = [
  { id: 'fase-1-planejamento', nome: 'Planejamento de Projeto', icone: '📋', cor: '#4a90d9' },
  { id: 'fase-2-viabilidade', nome: 'Análise de Viabilidade', icone: '🧮', cor: '#6c5ce7' },
  { id: 'fase-3-requisitos', nome: 'Requisitos', icone: '📝', cor: '#00b894' },
  { id: 'fase-4-design-contratos', nome: 'Design e Contratos', icone: '✍️', cor: '#fd79a8' },
  { id: 'fase-5-design-uxui', nome: 'Design UX/UI', icone: '🎨', cor: '#e17055' },
  { id: 'fase-6-banco-dados', nome: 'Banco de Dados', icone: '🗄️', cor: '#00cec9' },
  { id: 'fase-7-implementacao', nome: 'Arquitetura e Implementação', icone: '⚙️', cor: '#fdcb6e' },
  { id: 'fase-8-testes', nome: 'Testes e Qualidade', icone: '🧪', cor: '#a29bfe' },
  { id: 'fase-9-devsecops', nome: 'DevSecOps / Segurança', icone: '🛡️', cor: '#55a3e8' },
  { id: 'fase-10-deploy', nome: 'Deploy e Infraestrutura', icone: '🚀', cor: '#00b4d8' },
  { id: 'fase-11-documentacao', nome: 'Documentação e Manutenção', icone: '📚', cor: '#ff9f43' }
];

function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

export async function renderDetalhes(el) {
  try {
    const [projetoRes, estadoRes, tarefasRes, agentesRes, handoffsRes, checkpointsRes] = await Promise.all([
      api.getProjetoAtual(),
      api.getEstadoProjeto(),
      api.getTarefas(),
      api.getAgentes(),
      api.getHandoffs(),
      api.getCheckpoints()
    ]);

    if (!projetoRes.sucesso || !projetoRes.dados) {
      el.innerHTML = '<p class="painel-vazio">Nenhum projeto aberto.</p>';
      return;
    }

    const projeto = projetoRes.dados;
    const estado = estadoRes.sucesso ? estadoRes.dados : null;
    const tarefas = tarefasRes.sucesso ? (tarefasRes.dados || []) : [];
    const agentes = agentesRes.sucesso ? (agentesRes.dados || []) : [];
    const handoffs = handoffsRes.sucesso ? (handoffsRes.dados || []) : [];
    const checkpoints = checkpointsRes.sucesso ? (checkpointsRes.dados || []) : [];

    const tarefasConcluidas = tarefas.filter(t => t.estado === 'CONCLUIDA' || t.estado === 'concluida').length;
    const progressoGeral = tarefas.length > 0 ? Math.round((tarefasConcluidas / tarefas.length) * 100) : 0;
    const faseAtual = estado?.faseAtual || estado?.fase || '';
    const indiceFaseAtual = FASES.findIndex(f => f.id === faseAtual);

    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 style="margin:0;">📊 Detalhes do Projeto</h2>
      <span class="badge badge--ativo">${escapeHtml(projeto.nome || '')}</span>
    </div>`;

    html += `<div class="card" style="margin-bottom:16px;">
      <h3 style="margin:0 0 8px 0;">${escapeHtml(projeto.nome || '')}</h3>
      <p style="color:var(--text-muted);margin-bottom:8px;">${escapeHtml(projeto.descricao || 'Sem descrição')}</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
        <div><strong>ID:</strong> ${escapeHtml(projeto.id)}</div>
        <div><strong>Ambiente:</strong> ${escapeHtml(projeto.config?.ambiente || 'N/A')}</div>
        <div><strong>Versão:</strong> ${escapeHtml(projeto.config?.versao || 'N/A')}</div>
        <div><strong>Idioma:</strong> ${escapeHtml(projeto.config?.idioma || 'N/A')}</div>
        <div><strong>Fase:</strong> ${escapeHtml(faseAtual || 'N/A')}</div>
        <div><strong>Agentes:</strong> ${agentes.length}</div>
        <div><strong>Tarefas:</strong> ${tarefas.length} (${tarefasConcluidas} concluídas)</div>
        <div><strong>Handoffs:</strong> ${handoffs.length}</div>
        <div><strong>Checkpoints:</strong> ${checkpoints.length}</div>
      </div>
    </div>`;

    html += `<div class="card" style="margin-bottom:16px;">
      <h3 style="margin:0 0 12px 0;">Progresso das 11 Fases</h3>
      <div style="display:flex;flex-direction:column;gap:10px;">`;

    for (const fase of FASES) {
      const isAtual = indiceFaseAtual >= 0 && FASES[indiceFaseAtual].id === fase.id;
      const isConcluida = indiceFaseAtual >= 0 && FASES[indiceFaseAtual].id > fase.id;
      const statusBadge = isConcluida ? '<span class="badge badge--ativo">Concluída</span>' : isAtual ? '<span class="badge badge--ativo" style="background:#f39c12;">Atual</span>' : '<span class="badge badge--inativo">Pendente</span>';
      const largura = isConcluida ? '100%' : isAtual ? '60%' : '10%';
      const opacity = isConcluida ? '1' : isAtual ? '1' : '0.6';

      html += `<div style="display:flex;align-items:center;gap:10px;opacity:${opacity};">
        <span style="font-size:1.2rem;width:30px;text-align:center;">${fase.icone}</span>
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-weight:600;">${escapeHtml(fase.nome)}</span>
            ${statusBadge}
          </div>
          <div style="background:var(--surface-alt);border-radius:4px;height:8px;overflow:hidden;">
            <div style="background:${fase.cor};width:${largura};height:100%;border-radius:4px;transition:width 0.3s;"></div>
          </div>
        </div>
      </div>`;
    }

    html += `</div></div>`;

    if (estado) {
      html += `<div class="card" style="margin-bottom:16px;">
        <h3 style="margin:0 0 12px 0;">📈 Métricas</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
          <div class="card" style="background:var(--surface-alt);"><h4>Tarefas</h4><p>${tarefasConcluidas}/${tarefas.length} concluídas • ${progressoGeral}%</p></div>
          <div class="card" style="background:var(--surface-alt);"><h4>Agentes Ativos</h4><p>${estado.agentesAtivos || 0}</p></div>
          <div class="card" style="background:var(--surface-alt);"><h4>Tarefas Bloqueadas</h4><p>${estado.tarefasBloqueadas || 0}</p></div>
          <div class="card" style="background:var(--surface-alt);"><h4>Riscos Ativos</h4><p>${estado.riscosAtivos || 0}</p></div>
          <div class="card" style="background:var(--surface-alt);"><h4>Qualidade</h4><p>${estado.qualidade?.percentual || 0}% (${estado.qualidade?.pendenciasCriticas || 0} críticas)</p></div>
          <div class="card" style="background:var(--surface-alt);"><h4>Testes</h4><p>${estado.testes?.aprovados || 0}/${estado.testes?.total || 0} aprovados</p></div>
        </div>
      </div>`;
    }

    el.innerHTML = html;
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}
