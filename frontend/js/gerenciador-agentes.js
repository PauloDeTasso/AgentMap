const API_BASE = '/api/gerenciador-agentes';

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function escapeAttr(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  const res = await fetch(url, { headers, ...options });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw { status: res.status, ...(data || {}) };
  }
  return data;
}

async function carregarAgentes() {
  try {
    const data = await apiRequest('/agentes');
    if (data.sucesso && Array.isArray(data.dados)) {
      return data.dados;
    }
    return [];
  } catch (err) {
    console.error('Erro ao carregar agentes:', err);
    showToast('Erro ao carregar agentes', 'erro');
    return [];
  }
}

function showToast(mensagem, tipo = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#242833;border:1px solid #333;border-radius:6px;padding:12px 20px;color:#e4e6eb;font-size:0.875rem;z-index:9999;display:none;';
    document.body.appendChild(toast);
  }
  toast.textContent = mensagem;
  toast.style.display = 'block';
  toast.style.background = tipo === 'erro' ? '#c0392b' : tipo === 'sucesso' ? '#27ae60' : '#242833';
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

function atualizarStatus() {
  const statusEl = $('status-api');
  fetch('/api/status')
    .then((res) => res.json())
    .then((data) => {
      if (data?.sucesso) {
        statusEl.textContent = '🟢 Conectado';
        statusEl.style.color = '#27ae60';
      }
    })
    .catch(() => {
      statusEl.textContent = '🔴 Desconectado';
      statusEl.style.color = '#e74c3c';
    });
}

function renderizarAgentes(agentes) {
  const container = $('agent-list');
  const filtroDominio = $('filtro-dominio').value;
  const filtroTexto = ($('filtro-texto').value || '').trim().toLowerCase();

  let filtrados = agentes;
  if (filtroDominio !== 'todos') {
    filtrados = filtrados.filter((a) => (a.dominio || 'geral').toLowerCase() === filtroDominio);
  }
  if (filtroTexto) {
    filtrados = filtrados.filter((a) => {
      const texto = `${a.id} ${a.nome} ${a.funcao} ${a.dominio} ${a.estado}`.toLowerCase();
      return texto.includes(filtroTexto);
    });
  }

  if (filtrados.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum agente encontrado.</div>';
    return;
  }

  container.innerHTML = filtrados
    .map(
      (a) => `
    <div class="agent-card" data-agente-id="${escapeAttr(a.id)}">
      <div class="agent-card__header">
        <div>
          <h3 class="agent-card__title">${escapeHtml(a.nome || a.id)}</h3>
          <div class="agent-card__meta">
            <span class="domain-tag">${escapeHtml(a.dominio || 'geral')}</span>
            <span class="badge badge--${a.estado === 'ativo' ? 'ativo' : 'inativo'}">${escapeHtml(a.estado)}</span>
            <span style="color:var(--text-muted);font-size:0.85rem;">${escapeHtml(a.funcao)}</span>
          </div>
          <div style="margin-top:6px;color:var(--text-muted);font-size:0.8rem;">ID: ${escapeHtml(a.id)}</div>
        </div>
      </div>

      <div class="agent-card__section">
        <div class="agent-card__section-title">Caminhos de Personalização</div>
        <ul class="path-list">
          ${(a.caminhos || [])
            .filter((_, __, arr) => arr)
            .map((caminho) => {
              const isDir = caminho.endsWith('/');
              return `<li class="path-list__item">
                <code>${escapeHtml(caminho)}</code>
                <button class="copy-btn" data-path="${escapeAttr(caminho)}" onclick="copiarCaminho(this.getAttribute('data-path'))">Copiar</button>
              </li>`;
            })
            .join('')}
        </ul>
      </div>

      <div class="agent-card__section">
        <div class="agent-card__section-title">Arquivos por Domínio (referência)</div>
        <ul class="path-list">
          ${(a.dominioArquivos || [])
            .map(
              (caminho) => `
            <li class="path-list__item">
              <code>${escapeHtml(caminho)}</code>
              <button class="copy-btn" data-path="${escapeAttr(caminho)}" onclick="copiarCaminho(this.getAttribute('data-path'))">Copiar</button>
            </li>`
            )
            .join('')}
        </ul>
      </div>

      <div class="agent-card__section">
        <div class="agent-card__section-title">Fluxo Padrão ao Receber Prompt</div>
        <div>
          ${(a.fluxoPadrao || [])
            .map(
              (caminho) => `
            <span class="flow-badge">${escapeHtml(caminho)}</span>`
            )
            .join('')}
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

function copiarCaminho(caminho) {
  if (!caminho) return;
  navigator.clipboard.writeText(caminho).then(() => {
    showToast(`Copiado: ${caminho}`, 'sucesso');
  }).catch(() => {
    showToast('Erro ao copiar', 'erro');
  });
}

window.copiarCaminho = copiarCaminho;

async function init() {
  atualizarStatus();
  const agentes = await carregarAgentes();
  renderizarAgentes(agentes);

  $('filtro-dominio').addEventListener('change', () => {
    renderizarAgentes(agentes);
  });
  $('filtro-texto').addEventListener('input', debounce(() => {
    renderizarAgentes(agentes);
  }, 200));
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

document.addEventListener('DOMContentLoaded', init);
