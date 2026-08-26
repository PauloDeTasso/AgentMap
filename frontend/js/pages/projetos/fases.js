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

function agenteNomePorId(id, agentes) {
  if (!id) return '-';
  const a = agentes.find(a => a.id === id);
  return a ? a.nome : id;
}

export async function renderFases(el) {
  try {
    const [estadoRes, tarefasRes, agentesRes, checkpointsRes, handoffsRes] = await Promise.all([
      api.getEstadoProjeto(),
      api.getTarefas(),
      api.getAgentes(),
      api.getCheckpoints(),
      api.getHandoffs()
    ]);

    if (!estadoRes.sucesso || !estadoRes.dados) {
      el.innerHTML = '<p class="painel-vazio">Nenhum projeto aberto.</p>';
      return;
    }

    const estado = estadoRes.dados;
    const tarefas = tarefasRes.sucesso ? (tarefasRes.dados || []) : [];
    const agentes = agentesRes.sucesso ? (agentesRes.dados || []) : [];
    const checkpoints = checkpointsRes.sucesso ? (checkpointsRes.dados || []) : [];
    const handoffs = handoffsRes.sucesso ? (handoffsRes.dados || []) : [];

    const faseAtualId = estado.faseAtual || estado.fase || '';
    const indiceFaseAtual = FASES.findIndex(f => f.id === faseAtualId);
    const faseAtual = indiceFaseAtual >= 0 ? FASES[indiceFaseAtual] : FASES[0];

    const tarefasFaseAtual = tarefas.filter(t => {
      const tarefaFase = t.fase || '';
      return tarefaFase.toLowerCase() === faseAtualId.toLowerCase();
    });

    const agentesFaseAtual = agentes.filter(a => {
      const dominio = (a.dominio || '').toLowerCase();
      return dominio === faseAtualId.toLowerCase() || dominio === faseAtual.nome.toLowerCase();
    });

    const checkpointsFase = checkpoints.filter(c => {
      return c.tarefaId && tarefasFaseAtual.some(t => t.id === c.tarefaId);
    });

    const handoffsPendentes = handoffs.filter(h => h.estado === 'PENDENTE');
    const handoffsConcluidos = handoffs.filter(h => h.estado === 'CONCLUIDO');

    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 style="margin:0;">📂 Detalhes da Fase</h2>
      <span class="badge badge--ativo" style="background:${faseAtual.cor};">${faseAtual.icone} ${escapeHtml(faseAtual.nome)}</span>
    </div>`;

    html += `<div class="card" style="margin-bottom:16px;border-left:3px solid ${faseAtual.cor};">
      <h3 style="margin:0 0 8px 0;">Fase Atual: ${faseAtual.icone} ${escapeHtml(faseAtual.nome)}</h3>
      <p style="color:var(--text-muted);margin-bottom:8px;">Esta é a fase ativa do projeto. As tarefas abaixo estão vinculadas a esta fase.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <div class="card" style="background:var(--surface-alt);flex:1;min-width:200px;">
          <h4>Tarefas na Fase</h4>
          <p style="font-size:1.5rem;font-weight:700;">${tarefasFaseAtual.length}</p>
        </div>
        <div class="card" style="background:var(--surface-alt);flex:1;min-width:200px;">
          <h4>Agentes Envolvidos</h4>
          <p style="font-size:1.5rem;font-weight:700;">${agentesFaseAtual.length}</p>
        </div>
        <div class="card" style="background:var(--surface-alt);flex:1;min-width:200px;">
          <h4>Checkpoints</h4>
          <p style="font-size:1.5rem;font-weight:700;">${checkpointsFase.length}</p>
        </div>
        <div class="card" style="background:var(--surface-alt);flex:1;min-width:200px;">
          <h4>Handoffs Pendentes</h4>
          <p style="font-size:1.5rem;font-weight:700;color:#f39c12;">${handoffsPendentes.length}</p>
        </div>
      </div>
    </div>`;

    if (agentesFaseAtual.length > 0) {
      html += `<div class="card" style="margin-bottom:16px;">
        <h3 style="margin:0 0 12px 0;">🤖 Agentes Envolvidos</h3>
        <table class="table">
          <thead><tr><th>ID</th><th>Nome</th><th>Função</th><th>Estado</th><th>Domínio</th></tr></thead>
          <tbody>`;
      for (const a of agentesFaseAtual) {
        const badgeClass = a.estado === 'ativo' ? 'badge--ativo' : 'badge--inativo';
        html += `<tr>
          <td>${escapeHtml(a.id)}</td>
          <td>${escapeHtml(a.nome)}</td>
          <td>${escapeHtml(a.funcao || '-')}</td>
          <td><span class="badge ${badgeClass}">${escapeHtml(a.estado)}</span></td>
          <td>${escapeHtml(a.dominio || '-')}</td>
        </tr>`;
      }
      html += `</tbody></table></div>`;
    }

    if (tarefasFaseAtual.length > 0) {
      html += `<div class="card" style="margin-bottom:16px;">
        <h3 style="margin:0 0 12px 0;">📋 Entregas / Tarefas</h3>
        <table class="table">
          <thead><tr><th>ID</th><th>Título</th><th>Estado</th><th>Prioridade</th><th>Agente</th><th>Ações</th></tr></thead>
          <tbody>`;
      for (const t of tarefasFaseAtual) {
        const badgeClass = t.estado === 'CONCLUIDA' || t.estado === 'concluida' ? 'badge--ativo' : t.estado === 'BLOQUEADA' ? 'badge--bloqueada' : 'badge--inativo';
        html += `<tr>
          <td>${escapeHtml(t.id)}</td>
          <td>${escapeHtml(t.titulo)}</td>
          <td><span class="badge ${badgeClass}">${escapeHtml(t.estado)}</span></td>
          <td>${escapeHtml(t.prioridade || '-')}</td>
          <td>${escapeHtml(agenteNomePorId(t.agenteResponsavel, agentes))}</td>
          <td>
            <button class="btn btn--small" onclick="window.verTarefa('${escapeAttr(t.id)}')">Ver</button>
            <button class="btn btn--small" onclick="window.verContexto('${escapeAttr(t.id)}')">Contexto</button>
          </td>
        </tr>`;
      }
      html += `</tbody></table></div>`;
    }

    if (checkpointsFase.length > 0) {
      html += `<div class="card" style="margin-bottom:16px;">
        <h3 style="margin:0 0 12px 0;">📍 Checkpoints da Fase</h3>
        <table class="table">
          <thead><tr><th>ID</th><th>Título</th><th>Tipo</th><th>Tarefa</th><th>Ações</th></tr></thead>
          <tbody>`;
      for (const c of checkpointsFase) {
        html += `<tr>
          <td>${escapeHtml(c.id)}</td>
          <td>${escapeHtml(c.titulo || '-')}</td>
          <td>${escapeHtml(c.tipo || '-')}</td>
          <td>${escapeHtml(c.tarefaId || '-')}</td>
          <td><button class="btn btn--small" onclick="window.editarCheckpoint('${escapeAttr(c.id)}')">Editar</button></td>
        </tr>`;
      }
      html += `</tbody></table></div>`;
    }

    if (handoffsPendentes.length > 0) {
      html += `<div class="card" style="margin-bottom:16px;border-left:3px solid #f39c12;">
        <h3 style="margin:0 0 12px 0;">⚠️ Handoffs Pendentes</h3>
        <table class="table">
          <thead><tr><th>ID</th><th>Origem</th><th>Destino</th><th>Tarefa</th><th>Resumo</th><th>Ações</th></tr></thead>
          <tbody>`;
      for (const h of handoffsPendentes) {
        html += `<tr>
          <td>${escapeHtml(h.id)}</td>
          <td>${escapeHtml(h.origem)}</td>
          <td>${escapeHtml(h.destino)}</td>
          <td>${escapeHtml(h.tarefaId || '-')}</td>
          <td>${escapeHtml(h.resumo || '')}</td>
          <td><button class="btn btn--small" onclick="window.verHandoff('${escapeAttr(h.id)}')">Ver</button></td>
        </tr>`;
      }
      html += `</tbody></table></div>`;
    }

    el.innerHTML = html;
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}
