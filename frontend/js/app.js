import { api } from './api.js';

function joinPath(...parts) {
  return parts.map((part, i) => {
    if (i === 0) return part.replace(/[/\\]+$/, '');
    return part.replace(/^[/\\]+/, '').replace(/[/\\]+$/, '');
  }).join('/').replace(/\\/g, '/');
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

function sanitizePath(path) {
  if (!path || typeof path !== 'string') return '';
  const trimmed = path.trim().replace(/\\/g, '/');
  if (trimmed.includes('..') || trimmed.startsWith('/') || trimmed.startsWith('\\')) return '';
  return trimmed;
}

function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function formatDate(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const tz = estado.projetoAtual?.config?.fusoHorario || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  try {
    return date.toLocaleString('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return date.toLocaleString('pt-BR');
  }
}

let estado = {
  projetoAtual: null,
  agentes: [],
  tarefas: [],
  arquivos: [],
  settings: null,
  gerenciadorDir: null,
  opcoesAgente: { diretorios: [], contratos: [], ambientes: [] },
  solicitacoes: [],
  filtroAgenteSolicitacoes: { agenteId: null, tipo: 'todos' },
};

let projConfigEdit = {};

function $(id) { return document.getElementById(id); }

function isProjetoAgentMap(caminhoRaiz) {
  if (!estado.gerenciadorDir || !caminhoRaiz) return false;
  const gerenciador = (estado.gerenciadorDir || '').toLowerCase().replace(/\\/g, '/');
  const proj = (caminhoRaiz || '').toLowerCase().replace(/\\/g, '/');
  return proj === gerenciador || proj.startsWith(gerenciador + '/');
}

function showModal(id) { $(id).style.display = 'flex'; }
function hideModal(id) { $(id).style.display = 'none'; }

function agenteNomePorId(id) {
  if (!id) return '-';
  const a = estado.agentes.find(a => a.id === id);
  return a ? a.nome : id;
}

function setButtonLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.originalText = btn.textContent;
  btn.textContent = loading ? 'Salvando...' : (btn.dataset.originalText || btn.textContent);
}

function restoreButton(btn) {
  if (!btn) return;
  btn.disabled = false;
  if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
}

function setupModalAria() {
  document.querySelectorAll('.modal').forEach((modal, index) => {
    if (!modal.hasAttribute('role')) {
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      const titulo = modal.querySelector('.modal__titulo');
      if (titulo) {
        modal.setAttribute('aria-labelledby', titulo.id || `modal-titulo-${index}`);
        if (!titulo.id) titulo.id = `modal-titulo-${index}`;
      }
    }
  });
}

function showConfirmModal(title, fields, onConfirm) {
  const titulo = $('confirmacao-titulo');
  const corpo = $('confirmacao-corpo');
  const btnOk = $('confirmacao-btn-ok');
  titulo.textContent = title;
  corpo.innerHTML = '';
  const inputs = {};
  for (const [key, config] of Object.entries(fields)) {
    const grupo = document.createElement('div');
    grupo.className = 'form__grupo';
    const label = document.createElement('label');
    label.className = 'form__label';
    label.textContent = config.label;
    grupo.appendChild(label);
    const input = document.createElement('input');
    input.className = 'form__input';
    if (config.type === 'textarea') {
      const ta = document.createElement('textarea');
      ta.className = 'form__textarea';
      ta.rows = config.rows || 2;
      ta.value = config.value || '';
      grupo.appendChild(ta);
      inputs[key] = ta;
    } else {
      input.type = config.type || 'text';
      input.value = config.value || '';
      if (config.placeholder) input.placeholder = config.placeholder;
      grupo.appendChild(input);
      inputs[key] = input;
    }
    corpo.appendChild(grupo);
  }
  const newBtnOk = btnOk.cloneNode(true);
  btnOk.parentNode.replaceChild(newBtnOk, btnOk);
  newBtnOk.addEventListener('click', async () => {
    const data = {};
    for (const [key, el] of Object.entries(inputs)) {
      data[key] = el.value;
    }
    hideModal('modal-confirmacao');
    await onConfirm(data);
  });
  showModal('modal-confirmacao');
}

async function fetchGuide() {
  try {
    const res = await fetch('/frontend/guia-completo-mcp.txt');
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  }
}

function atualizarStatus() {
  const statusEl = $('status-api');
  api.getStatus().then((data) => {
    statusEl.textContent = '🟢 Conectado';
    statusEl.style.color = '#27ae60';
    if (data?.dados?.gerenciadorDir) {
      estado.gerenciadorDir = data.dados.gerenciadorDir;
    }
  }).catch(() => {
    statusEl.textContent = '🔴 Desconectado';
    statusEl.style.color = '#e74c3c';
  });
}

function renderizarProjetoAtual() {
  const nav = $('nav-projetos');
  const nomeEl = $('nome-projeto-ativo');
  if (estado.projetoAtual) {
    nav.style.display = 'block';
    nomeEl.textContent = estado.projetoAtual.nome || estado.projetoAtual.id || '';
  } else {
    nav.style.display = 'none';
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

async function carregarItensRelacionados(tipo, id) {
  const relacionados = { tarefas: [], solicitacoes: [], bloqueios: [], dependencias: [], criterios: [], resultados: [], artefatos: [], handoffs: [], validacoes: [], pendencias: [], checkpoints: [], sessoes: [], aprendizados: [], riscos: [], conflitos: [], reservas: [] };
  try {
    if (tipo === 'tarefa') {
      const [solRes, bloqRes, depRes, critRes, resRes, artRes, handRes, valRes, penRes, chkRes, sessRes, aprRes, risRes] = await Promise.all([
        api.getSolicitacoes(), api.getBloqueios(), api.getDependencias(null, id), api.getCriterios(id),
        api.getResultados(id), api.getArtefatos(id), api.getHandoffs(), api.getValidacoes(),
        api.getPendencias(id), api.getCheckpoints(id), api.getSessoes(), api.getAprendizados(), api.getRiscos()
      ]);
      if (solRes.sucesso) relacionados.solicitacoes = solRes.dados.filter(s => s.tarefaOrigem?.id === id);
      if (bloqRes.sucesso) relacionados.bloqueios = bloqRes.dados.filter(b => b.tarefaId === id);
      if (depRes.sucesso) relacionados.dependencias = depRes.dados.filter(d => d.fonteId === id || d.destinoId === id);
      if (critRes.sucesso) relacionados.criterios = critRes.dados;
      if (resRes.sucesso) relacionados.resultados = resRes.dados;
      if (artRes.sucesso) relacionados.artefatos = artRes.dados;
      if (handRes.sucesso) relacionados.handoffs = handRes.dados.filter(h => h.tarefaId === id);
      if (valRes.sucesso) relacionados.validacoes = valRes.dados.filter(v => v.tarefaId === id);
      if (penRes.sucesso) relacionados.pendencias = penRes.dados;
      if (chkRes.sucesso) relacionados.checkpoints = chkRes.dados;
      if (sessRes.sucesso) relacionados.sessoes = sessRes.dados.filter(s => s.tarefaId === id);
      if (aprRes.sucesso) relacionados.aprendizados = aprRes.dados.filter(a => a.tarefaId === id);
      if (risRes.sucesso) relacionados.riscos = risRes.dados.filter(r => r.tarefasRelacionadas?.includes(id));
    } else if (tipo === 'solicitacao') {
      const tarefasRes = await api.getTarefas();
      if (tarefasRes.sucesso) relacionados.tarefas = tarefasRes.dados.filter(t => t.dependencias?.includes(id));
    } else if (tipo === 'artefato') {
      const res = await api.getArtefato(id);
      if (res.sucesso && res.dados?.tarefaId) {
        const tarefasRes = await api.getTarefas();
        if (tarefasRes.sucesso) relacionados.tarefas = tarefasRes.dados.filter(t => t.id === res.dados.tarefaId);
      }
    }
    return relacionados;
  } catch (err) {
    console.error('Erro ao carregar itens relacionados:', err);
    return relacionados;
  }
}

function renderizarSecaoRelacionados(relacionados) {
  let html = '<div style="margin-top:24px;padding-top:16px;border-top:1px solid #333;"><h4>🔗 Itens Relacionados</h4><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">';
  const sections = [
    { label: 'Solicitações', items: relacionados.solicitacoes, tipo: 'solicitacao' },
    { label: 'Bloqueios', items: relacionados.bloqueios, tipo: 'bloqueio' },
    { label: 'Dependências', items: relacionados.dependencias, tipo: 'dependencia' },
    { label: 'Critérios', items: relacionados.criterios, tipo: 'criterio' },
    { label: 'Resultados', items: relacionados.resultados, tipo: 'resultado' },
    { label: 'Artefatos', items: relacionados.artefatos, tipo: 'artefato' },
    { label: 'Transferências', items: relacionados.handoffs, tipo: 'handoff' },
    { label: 'Validações', items: relacionados.validacoes, tipo: 'validacao' },
    { label: 'Pendências', items: relacionados.pendencias, tipo: 'pendencia' },
    { label: 'Marcos', items: relacionados.checkpoints, tipo: 'checkpoint' },
    { label: 'Sessões', items: relacionados.sessoes, tipo: 'sessao' },
    { label: 'Aprendizados', items: relacionados.aprendizados, tipo: 'aprendizado' },
    { label: 'Riscos', items: relacionados.riscos, tipo: 'risco' },
    { label: 'Conflitos', items: relacionados.conflitos, tipo: 'conflito' },
    { label: 'Reservas', items: relacionados.reservas, tipo: 'reserva' }
  ];
  for (const sec of sections) {
    if (sec.items && sec.items.length > 0) {
      html += `<div class="card"><h5>${sec.label} (${sec.items.length})</h5><ul style="margin:0;padding-left:16px;">`;
      for (const item of sec.items.slice(0, 5)) {
        html += `<li>${item.id}${item.titulo ? ' — ' + item.titulo : ''}${item.nome ? ' — ' + item.nome : ''}</li>`;
      }
      if (sec.items.length > 5) html += `<li>... e mais ${sec.items.length - 5}</li>`;
      html += '</ul></div>';
    }
  }
  html += '</div></div>';
  return html;
}

async function init() {
  console.log('[init] iniciando...');
  await atualizarStatus();
  await carregarSettings();
  console.log('[init] carregando projeto atual...');
  await carregarProjetoAtual();
  renderizarProjetoAtual();
  if (!estado.projetoAtual) {
    console.log('[init] nenhum projeto atual, renderizando tela inicial...');
    await renderizarTelaInicial();
  }
  console.log('[init] inicializacao finalizada');
  setupEventListeners();
  setupModalAria();
}

async function carregarSettings() {
  console.log('[carregarSettings] carregando settings...');
  try {
    const res = await api.getSettings();
    console.log('[carregarSettings] resposta:', { sucesso: res.sucesso, dir: res.dados?.diretorioProjetosDefault });
    if (res.sucesso && res.dados) {
      estado.settings = res.dados;
      const dir = res.dados.diretorioProjetosDefault;
      if (dir) {
        const abrir = $('caminho-abrir');
        if (abrir) abrir.value = dir;
        const parental = $('caminho-parental');
        if (parental) parental.value = dir;
      }
    }
  } catch (err) {
    console.error('[carregarSettings] EXCECAO:', err);
    showToast('Erro ao carregar configurações', 'erro');
  }
}

async function renderizarTelaInicial() {
  const main = $('main-content');
  if (!main || estado.projetoAtual) {
    console.log('[renderizarTelaInicial] ignorado, projeto atual:', !!estado.projetoAtual);
    return;
  }
  console.log('[renderizarTelaInicial] renderizando tela inicial...');
  const dir = estado.settings?.diretorioProjetosDefault || '';
  let projetosEncontrados = [];
  let erroEscaneamento = null;
  if (dir) {
    try {
      console.log('[renderizarTelaInicial] escaneando diretorio:', dir);
      const res = await api.scanProjetos(dir);
      console.log('[renderizarTelaInicial] scan resposta:', { sucesso: res.sucesso, total: res.dados?.length, erro: res.erro });
      if (res.sucesso && Array.isArray(res.dados)) {
        projetosEncontrados = res.dados;
      } else {
        erroEscaneamento = res.erro || 'Erro ao escanear projetos';
      }
    } catch (e) {
      erroEscaneamento = e?.erro || e?.message || 'Erro ao escanear projetos';
      console.error('Erro ao escanear projetos:', e);
    }
  }

  let html = `<div class="card"><h2 class="card__titulo">Bem-vindo</h2><p class="card__texto">Este é o Gerenciador Local de Projetos para Agentes de IA. Selecione um projeto existente ou crie um novo.</p>`;

  if (projetosEncontrados.length > 0) {
    html += `<div style="margin-top:16px;"><h3 style="margin:0 0 8px 0;">${projetosEncontrados.length} projeto(s) encontrado(s) em ${dir}</h3><div style="display:flex;flex-direction:column;gap:8px;">`;
    for (const p of projetosEncontrados) {
      const descricaoHtml = p.descricao ? `<br><small style="color:var(--text-muted);">${escapeHtml(p.descricao)}</small>` : '';
      const caminho = p.caminhoRaiz || p.caminho || '';
      const caminhoAttr = encodeURIComponent(caminho);
      console.log('[renderizarTelaInicial] projeto:', p.nome, '| caminho=', caminho, '| attr=', caminhoAttr);
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius);">
        <div><strong>${escapeHtml(p.nome)}</strong>${descricaoHtml}<br><small style="color:var(--text-muted);">${escapeHtml(caminho)}</small></div>
        <button class="btn btn--primario" onclick="abrirProjetoPasta('${caminhoAttr}')">Abrir</button>
      </div>`;
    }
    html += `</div></div>`;
  } else if (dir && !erroEscaneamento) {
    html += `<p style="color:var(--text-muted);margin-top:16px;">Nenhum projeto encontrado em ${dir}.</p>`;
  } else if (erroEscaneamento) {
    html += `<p style="color:var(--text-muted);margin-top:16px;">${erroEscaneamento}</p>`;
  }

  html += `<div class="card__actions" style="margin-top:16px;">
      <button class="btn btn--primario" id="btn-criar-projeto-inicial" style="width:100%;">Criar Novo Projeto</button>
      <button class="btn" id="btn-abrir-projeto-inicial" style="width:100%;">Abrir Projeto Manualmente</button>
      <button class="btn btn--info" id="btn-listar-projetos-inicial" style="width:100%;">Ver Projetos Existentes</button>
      <button class="btn btn--ghost" id="btn-configuracoes-inicial" style="width:100%;">Configuracoes</button>
    </div></div>`;

  main.innerHTML = html;

  document.getElementById('btn-criar-projeto-inicial')?.addEventListener('click', () => showModal('modal-novo-projeto'));
  document.getElementById('btn-abrir-projeto-inicial')?.addEventListener('click', () => showModal('modal-abrir-projeto'));
  document.getElementById('btn-configuracoes-inicial')?.addEventListener('click', () => abrirModalConfiguracao());
  document.getElementById('btn-listar-projetos-inicial')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-listar-projetos-inicial');
    if (btn) { btn.disabled = true; btn.textContent = 'Carregando...'; }
    await mostrarListaProjetosExistentes();
    if (btn) { btn.disabled = false; btn.textContent = 'Ver Projetos Existentes'; }
  });
}

async function mostrarListaProjetosExistentes() {
  const main = $('main-content');
  if (!main) return;
  const dir = estado.settings?.diretorioProjetosDefault || '';
  main.innerHTML = `<div class="card"><h2 class="card__titulo">Projetos Existentes</h2><p class="card__texto">Projetos encontrados em ${escapeHtml(dir || 'diretório não configurado')}</p><div id="lista-projetos-existentes"><p style="color:var(--text-muted);">Carregando...</p></div><div class="card__actions" style="margin-top:16px;"><button class="btn btn--ghost" id="btn-voltar-inicial" style="width:100%;">Voltar</button></div></div>`;
  document.getElementById('btn-voltar-inicial')?.addEventListener('click', () => { if (estado.projetoAtual) { renderizarDashboard(); } else { renderizarTelaInicial(); } });

  let projetos = [];
  try {
    const res = await api.listarProjetos();
    if (res.sucesso && Array.isArray(res.dados)) {
      projetos = res.dados;
    }
  } catch (e) {
    console.error('Erro ao listar projetos:', e);
  }

  const container = document.getElementById('lista-projetos-existentes');
  if (!container) return;
  if (projetos.length === 0) {
    container.innerHTML = '<p class="painel-vazio">Nenhum projeto cadastrado.</p>';
    return;
  }
  let html = '<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">';
  for (const p of projetos) {
    const caminho = p.caminhoRaiz || p.caminho || '';
    const isSystem = isProjetoAgentMap(caminho);
    const deleteBtn = isSystem
      ? `<button class="btn btn--small btn--danger" onclick="showToast('O projeto AgentMap não pode ser excluído.', 'erro')">Excluir</button>`
      : `<button class="btn btn--small btn--danger" onclick="excluirProjeto('${escapeAttr(p.id)}', '${escapeAttr((p.nome || '').replace(/'/g, "\\'"))}')">Excluir</button>`;
    html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius);">
      <div><strong>${escapeHtml(p.nome || '')}</strong><br><small style="color:var(--text-muted);">${escapeHtml(caminho)}</small></div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn--small btn--primario" onclick="abrirProjeto('${escapeAttr(p.id)}')">Abrir</button>
        ${deleteBtn}
      </div>
    </div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

function abrirModalConfiguracao() {
  if (!estado.settings) return;
  $('config-diretorio-padrao').value = estado.settings.diretorioProjetosDefault || '';
  $('config-idioma').value = estado.settings.idioma || 'pt-BR';
  $('config-porta').value = estado.settings.portaApi || 3150;
  showModal('modal-configuracao');
}

async function carregarOpcoesAgente() {
  console.log('[carregarOpcoesAgente] iniciando...');
  const dirs = [];
  const ambientes = ['desenvolvimento', 'homologacao', 'producao', 'teste'];
  if (estado.projetoAtual?.config?.diretorios) {
    Object.values(estado.projetoAtual.config.diretorios).forEach((v) => {
      dirs.push(v + '/**');
    });
  }
  console.log('[carregarOpcoesAgente] diretorios encontrados:', dirs);
  estado.opcoesAgente.diretorios = dirs;
  estado.opcoesAgente.ambientes = ambientes;
  try {
    const res = await api.getContratos();
    console.log('[carregarOpcoesAgente] resposta contratos:', JSON.stringify({ sucesso: res.sucesso, count: res.dados?.contratos?.length }));
    if (res.sucesso && res.dados?.contratos) {
      estado.opcoesAgente.contratos = res.dados.contratos.map((c) => c.id);
    } else {
      estado.opcoesAgente.contratos = ['contrato-projeto'];
    }
  } catch (err) {
    console.error('[carregarOpcoesAgente] erro ao carregar contratos:', err);
    estado.opcoesAgente.contratos = ['contrato-projeto'];
  }
  console.log('[carregarOpcoesAgente] finalizado. diretorios:', estado.opcoesAgente.diretorios.length, '| contratos:', estado.opcoesAgente.contratos.length, '| ambientes:', estado.opcoesAgente.ambientes.length);
}

async function carregarProjetoAtual() {
  console.log('[carregarProjetoAtual] chamando API /projetos/atual...');
  try {
    const res = await api.getProjetoAtual();
    console.log('[carregarProjetoAtual] resposta:', { sucesso: res.sucesso, temDados: !!res.dados, id: res.dados?.id, nome: res.dados?.nome, erro: res.erro });
    if (res.sucesso && res.dados) {
      estado.projetoAtual = res.dados;
      const cfgRes = await api.getConfiguracao(res.dados.id);
      if (cfgRes.sucesso && cfgRes.dados) {
        estado.projetoAtual.config = cfgRes.dados;
      }
      console.log('[carregarProjetoAtual] projeto carregado:', estado.projetoAtual.nome);
      await carregarAgentes();
      await carregarTarefas();
      await carregarOpcoesAgente();
      renderizarDashboard();
    } else {
      estado.projetoAtual = null;
      console.log('[carregarProjetoAtual] nenhum projeto atual');
    }
  } catch (err) {
    console.error('[carregarProjetoAtual] EXCECAO:', err?.message || err, '| erro:', err?.erro);
    showToast('Erro ao carregar projeto: ' + (err?.erro || err?.message || 'desconhecido'), 'erro');
    estado.projetoAtual = null;
  }
}

async function carregarAgentes() {
  console.log('[carregarAgentes] iniciando...');
  try {
    const res = await api.getAgentes();
    console.log('[carregarAgentes] resposta API:', JSON.stringify({ sucesso: res.sucesso, count: res.dados?.length }));
    if (res.sucesso && res.dados) {
      estado.agentes = Array.isArray(res.dados) ? res.dados : res.dados.agentes || [];
      console.log('[carregarAgentes] agentes carregados:', estado.agentes.length);
    } else {
      console.error('[carregarAgentes] falha:', res.erro);
      estado.agentes = [];
    }
  } catch (err) {
    console.error('[carregarAgentes] exceção:', err);
    showToast('Erro ao carregar agentes', 'erro');
    estado.agentes = [];
  }
}

async function carregarTarefas() {
  try {
    const res = await api.getTarefas();
    if (res.sucesso && res.dados) {
      estado.tarefas = res.dados;
    }
  } catch (err) {
    showToast('Erro ao carregar tarefas', 'erro');
  }
}

function setupEventListeners() {
  $('btn-criar-projeto')?.addEventListener('click', () => showModal('modal-novo-projeto'));
  $('btn-criar-projeto-inicial')?.addEventListener('click', () => showModal('modal-novo-projeto'));
  $('btn-abrir-projeto')?.addEventListener('click', () => showModal('modal-abrir-projeto'));
  $('btn-abrir-projeto-inicial')?.addEventListener('click', () => showModal('modal-abrir-projeto'));
  $('btn-fechar-projeto')?.addEventListener('click', async () => {
    if (estado.projetoAtual?.id) {
      try { await api.fecharProjeto(estado.projetoAtual.id); } catch {}
    }
    estado.projetoAtual = null;
    estado.agentes = [];
    estado.tarefas = [];
    estado.arquivos = [];
    renderizarProjetoAtual();
    await renderizarTelaInicial();
  });

  $('form-configuracao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter || $('form-configuracao').querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    const body = {
      diretorioProjetosDefault: $('config-diretorio-padrao').value.trim(),
      idioma: $('config-idioma').value,
      portaApi: Number($('config-porta').value) || 3150
    };
    try {
      const res = await api.updateSettings(body);
      if (res.sucesso) {
        estado.settings = res.dados;
        showToast('Configurações salvas!', 'sucesso');
        hideModal('modal-configuracao');
        await renderizarTelaInicial();
      } else {
        showToast(res.erro, 'erro');
      }
    } catch (err) {
      showToast(err?.erro || 'Erro ao salvar configurações', 'erro');
    } finally {
      restoreButton(btn);
    }
  });

  $('form-novo-projeto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter || $('form-novo-projeto').querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    const nome = $('nome-projeto').value.trim();
    const caminhoParental = $('caminho-parental').value.trim();
    const descricao = $('descricao-projeto').value.trim();
    if (!nome || !caminhoParental) { restoreButton(btn); return; }
    const editId = $('form-novo-projeto').dataset.editId;
    try {
      let res;
      if (editId) {
        res = await api.atualizarProjeto(editId, { nome, descricao });
        if (!res.sucesso) {
          showToast(res.erro || 'Erro ao atualizar projeto', 'erro');
          restoreButton(btn);
          return;
        }
        const config = {
          ambiente: $('projeto-ambiente').value,
          versao: $('projeto-versao').value,
          idioma: $('projeto-idioma').value,
          fusoHorario: $('projeto-fuso').value,
          proprietario: {
            tipo: $('projeto-proprietario-tipo').value,
            nome: $('projeto-proprietario-nome').value.trim()
          },
          objetivos: ($('projeto-objetivos').value || '').split('\n').map(s => s.trim()).filter(Boolean),
          escopo: {
            incluso: ($('projeto-escopo-incluso').value || '').split('\n').map(s => s.trim()).filter(Boolean),
            excluido: ($('projeto-escopo-excluido').value || '').split('\n').map(s => s.trim()).filter(Boolean)
          }
        };
        const configRes = await api.atualizarConfiguracao(editId, config);
        if (!configRes.sucesso) {
          showToast(configRes.erro || 'Erro ao atualizar configuração do projeto', 'erro');
          restoreButton(btn);
          return;
        }
        res = configRes;
        showToast(`Projeto '${nome}' atualizado!`, 'sucesso');
        delete $('form-novo-projeto').dataset.editId;
      } else {
        const objetivos = ($('projeto-objetivos').value || '').split('\n').map(s => s.trim()).filter(Boolean);
        const escopoIncluso = ($('projeto-escopo-incluso').value || '').split('\n').map(s => s.trim()).filter(Boolean);
        const escopoExcluido = ($('projeto-escopo-excluido').value || '').split('\n').map(s => s.trim()).filter(Boolean);
        const dadosExtra = {
          ambiente: $('projeto-ambiente').value,
          versao: $('projeto-versao').value,
          idioma: $('projeto-idioma').value,
          fusoHorario: $('projeto-fuso').value,
          proprietarioTipo: $('projeto-proprietario-tipo').value,
          proprietarioNome: $('projeto-proprietario-nome').value,
          objetivos,
          escopoIncluso,
          escopoExcluido
        };
        res = await api.criarProjeto(nome, caminhoParental, descricao, dadosExtra);
        if (res.sucesso) {
          showToast(`Projeto '${nome}' criado!`, 'sucesso');
        }
      }
      if (res.sucesso) {
        hideModal('modal-novo-projeto');
        e.target.reset();
        await carregarProjetoAtual();
        renderizarProjetoAtual();
        if (typeof carregarPainel === 'function' && document.querySelector('[data-painel="projetos"].painel-lateral__item--ativo')) {
          carregarPainel('projetos');
        }
      } else {
        showToast(res.erro || 'Erro ao salvar projeto', 'erro');
      }
    } catch (err) {
      showToast(err?.erro || 'Erro ao criar projeto', 'erro');
    } finally {
      restoreButton(btn);
    }
  });

  $('form-abrir-projeto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter || $('form-abrir-projeto').querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    const caminho = sanitizePath($('caminho-abrir').value);
    if (!caminho) { showToast('Caminho inválido', 'erro'); restoreButton(btn); return; }
    try {
      const res = await api.abrirProjeto(caminho, caminho);
      if (res.sucesso) {
        showToast(`Projeto aberto!`, 'sucesso');
        hideModal('modal-abrir-projeto');
        e.target.reset();
        await carregarProjetoAtual();
        renderizarProjetoAtual();
      } else {
        showToast(res.erro || 'Erro ao abrir projeto', 'erro');
      }
    } catch (err) {
      showToast(err?.erro || 'Erro ao abrir projeto', 'erro');
    } finally {
      restoreButton(btn);
    }
  });

  $('btn-cancelar-novo')?.addEventListener('click', () => {
    const form = $('form-novo-projeto');
    if (form) { delete form.dataset.editId; form.reset(); }
    hideModal('modal-novo-projeto');
  });
  $('btn-cancelar-abrir')?.addEventListener('click', () => { const form = $('form-abrir-projeto'); if (form) form.reset(); hideModal('modal-abrir-projeto'); });
  $('btn-cancelar-editor')?.addEventListener('click', () => hideModal('modal-editor'));

  // Folder browser for Abrir Projeto
  $('btn-procurar-abrir')?.addEventListener('click', () => {
    const picker = $('file-folder-picker');
    if (picker) { picker.value = ''; picker.click(); }
  });
  $('file-folder-picker')?.addEventListener('change', () => {
    const files = $('file-folder-picker')?.files;
    if (!files || files.length === 0) return;
    const firstPath = files[0].webkitRelativePath || '';
    const folderName = firstPath.split(/[\\/]/)[0] || '';
    const baseDir = estado.settings?.diretorioProjetosDefault || '';
    if (baseDir && folderName) {
      const caminho = $('caminho-abrir');
      if (caminho) caminho.value = baseDir + '\\' + folderName;
    } else if (folderName) {
      const caminho = $('caminho-abrir');
      if (caminho) caminho.value = folderName;
    }
  });

  $('btn-salvar-arquivo')?.addEventListener('click', salvarArquivo);
  $('btn-confirmar-salvar')?.addEventListener('click', salvarArquivo);

  const filtroAgenteId = $('filtro-agente-id');
  const filtroAgenteTipo = $('filtro-agente-tipo');
  if (filtroAgenteId && filtroAgenteTipo) {
    const aplicarFiltroSolicitacoes = debounce(() => {
      estado.filtroAgenteSolicitacoes = {
        agenteId: filtroAgenteId.value || null,
        tipo: filtroAgenteTipo.value
      };
      renderizarSolicitacoes($('painel-atividade'));
    }, 300);
    filtroAgenteId.addEventListener('input', aplicarFiltroSolicitacoes);
    filtroAgenteTipo.addEventListener('change', aplicarFiltroSolicitacoes);
  }
}

function renderizarDashboard() {
  const main = $('main-content');
  const container = document.createElement('div');
  container.className = 'painel-container';

  const lateral = document.createElement('div');
  lateral.className = 'painel-lateral';
  lateral.innerHTML = `
    <div class="painel-lateral__titulo">Navegação</div>
    <ul class="painel-lateral__lista">
      <li class="painel-lateral__item" data-painel="agentes">🤖 Agentes</li>
      <li class="painel-lateral__item" data-painel="tarefas">📋 Tarefas</li>
      <li class="painel-lateral__item" data-painel="contratos">📄 Contratos</li>
      <li class="painel-lateral__item" data-painel="arquivos">📁 Arquivos</li>
      <li class="painel-lateral__item" data-painel="projetos">📂 Projetos</li>
      <li class="painel-lateral__item" data-painel="estado">📊 Estado</li>
      <li class="painel-lateral__item" data-painel="auditoria">🔍 Auditoria</li>
       <li class="painel-lateral__item" data-painel="solicitacoes">📝 Solicitações</li>
       <li class="painel-lateral__item" data-painel="resultados">✅ Resultados</li>
       <li class="painel-lateral__item" data-painel="artefatos">📦 Artefatos</li>
        <li class="painel-lateral__item" data-painel="handoffs">🤝 Transferências</li>
       <li class="painel-lateral__item" data-painel="validacoes">🔒 Validações</li>
       <li class="painel-lateral__item" data-painel="bloqueios">🚫 Bloqueios</li>
       <li class="painel-lateral__item" data-painel="pendencias">⏳ Pendências</li>
       <li class="painel-lateral__item" data-painel="conflitos">⚡ Conflitos</li>
       <li class="painel-lateral__item" data-painel="riscos">⚠️ Riscos</li>
       <li class="painel-lateral__item" data-painel="reservas">🔒 Reservas</li>
       <li class="painel-lateral__item" data-painel="decisoes">💭 Decisões</li>
       <li class="painel-lateral__item" data-painel="dependencias">🔗 Dependências</li>
       <li class="painel-lateral__item" data-painel="responsabilidades">👥 Responsabilidades</li>
       <li class="painel-lateral__item" data-painel="sessoes">🖥️ Sessões</li>
        <li class="painel-lateral__item" data-painel="checkpoints">📍 Marcos</li>
        <li class="painel-lateral__item" data-painel="aprendizados">📚 Aprendizados</li>
        <li class="painel-lateral__item" data-painel="historico">📜 Histórico</li>
        <li class="painel-lateral__item" data-painel="integridade">🔍 Integridade</li>
        <li class="painel-lateral__item" data-painel="dashboard">🏠 Painel de Controle</li>
        <li class="painel-lateral__item" data-painel="monitor">📡 Monitor</li>
    </ul>
  `;

  const principal = document.createElement('div');
  principal.className = 'painel-principal';
  principal.id = 'painel-atividade';
  principal.innerHTML = '<p style="color:var(--text-muted);">Selecione uma opção ao lado.</p>';

  function closeModals() {
    document.querySelectorAll('[id^="modal-"]').forEach((m) => { m.style.display = 'none'; });
  }

  lateral.querySelectorAll('[data-painel]').forEach((item) => {
    item.addEventListener('click', () => {
      closeModals();
      lateral.querySelectorAll('[data-painel]').forEach((i) => i.classList.remove('painel-lateral__item--ativo'));
      item.classList.add('painel-lateral__item--ativo');
      carregarPainel(item.dataset.painel);
    });
  });

  container.appendChild(lateral);
  container.appendChild(principal);
  main.innerHTML = '';
  main.appendChild(container);
}

async function carregarPainel(painel) {
  const el = $('painel-atividade');
  if (!el) return;
  el.innerHTML = '<p style="color:var(--text-muted);">Carregando...</p>';
  switch (painel) {
    case 'agentes': await renderizarAgentes(el); break;
    case 'tarefas': await renderizarTarefas(el); break;
    case 'contratos': await renderizarContratos(el); break;
    case 'arquivos': await renderizarArquivos(el); break;
    case 'projetos': await renderizarProjetos(el); break;
    case 'estado': await renderizarEstado(el); break;
    case 'auditoria': await renderizarAuditoria(el); break;
    case 'solicitacoes': await renderizarSolicitacoes(el); break;
    case 'resultados': await renderizarResultados(el); break;
    case 'artefatos': await renderizarArtefatos(el); break;
    case 'handoffs': await renderizarHandoffs(el); break;
    case 'validacoes': await renderizarValidacoes(el); break;
    case 'bloqueios': await renderizarBloqueios(el); break;
    case 'pendencias': await renderizarPendencias(el); break;
    case 'conflitos': await renderizarConflitos(el); break;
    case 'riscos': await renderizarRiscos(el); break;
    case 'reservas': await renderizarReservas(el); break;
    case 'decisoes': await renderizarDecisoes(el); break;
    case 'dependencias': await renderizarDependencias(el); break;
    case 'responsabilidades': await renderizarResponsabilidades(el); break;
    case 'sessoes': await renderizarSessoes(el); break;
    case 'checkpoints': await renderizarCheckpoints(el); break;
    case 'aprendizados': await renderizarAprendizados(el); break;
    case 'historico': await renderizarHistorico(el); break;
    case 'integridade': await renderizarIntegridade(el); break;
    case 'dashboard': await renderizarDashboardCoordenacao(el); break;
    case 'monitor': await renderizarMonitor(el); break;
  }
}

async function renderizarProjetos(el) {
  try {
    const res = await api.listarProjetos();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const projetos = res.dados;
    const projetosNaoSistema = projetos.filter((p) => !isProjetoAgentMap(p.caminhoRaiz || p.caminho || ''));
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">Projetos (${projetos.length})</h3>
      <div>
        <button class="btn btn--small btn--primario" onclick="showModal('modal-novo-projeto')">+ Novo Projeto</button>
        ${projetosNaoSistema.length > 0 ? `<button class="btn btn--small btn--danger" onclick="excluirTodosProjetos()">Excluir Todos</button>` : ''}
      </div>
    </div>`;
    if (projetos.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhum projeto cadastrado.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>Nome</th><th>Caminho</th><th>Ações</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const p of projetos) {
      const tr = document.createElement('tr');
      const caminho = p.caminhoRaiz || p.caminho || '';
      const isAtual = estado.projetoAtual?.id === p.id;
      const isSystem = isProjetoAgentMap(caminho);
      const badge = isAtual ? ' <span class="badge badge--ativo">ATUAL</span>' : '';
      const deleteBtn = isSystem
        ? `<button class="btn btn--small btn--danger" onclick="showToast('O projeto AgentMap não pode ser excluído.', 'erro')">Excluir</button>`
        : `<button class="btn btn--small btn--danger" onclick="excluirProjeto('${escapeAttr(p.id)}', '${escapeAttr((p.nome || '').replace(/'/g, "\\'"))}')">Excluir</button>`;
      tr.innerHTML = `<td>${escapeHtml(p.nome || '')}${badge}</td><td>${escapeHtml(caminho)}</td>
        <td>
          <button class="btn btn--small" onclick="verProjeto('${escapeAttr(p.id)}')">Ver</button>
          <button class="btn btn--small" onclick="abrirProjeto('${escapeAttr(p.id)}')">Abrir</button>
          <button class="btn btn--small" onclick="editarProjeto('${escapeAttr(p.id)}')">Editar</button>
          ${deleteBtn}
        </td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

window.abrirProjeto = async function(id) {
  try {
    const res = await api.abrirProjeto(id);
    if (res.sucesso) {
      showToast('Projeto aberto!', 'sucesso');
      await carregarProjetoAtual();
      renderizarProjetoAtual();
      if (typeof carregarPainel === 'function' && document.querySelector('[data-painel="projetos"].painel-lateral__item--ativo')) {
        carregarPainel('projetos');
      }
    } else {
      showToast(res.erro, 'erro');
    }
  } catch (err) {
    showToast(err?.message || 'Erro', 'erro');
  }
};

window.abrirProjetoPasta = async function(caminho) {
  const caminhoDecodificado = decodeURIComponent(caminho);
  console.log('[abrirProjetoPasta] caminho recebido:', caminhoDecodificado);
  try {
    const res = await api.abrirProjeto(caminhoDecodificado, caminhoDecodificado);
    console.log('[abrirProjetoPasta] resposta API:', { sucesso: res.sucesso, dados: res.dados, erro: res.erro });
    if (res.sucesso) {
      showToast('Projeto aberto!', 'sucesso');
      await carregarProjetoAtual();
    } else {
      console.error('[abrirProjetoPasta] FALHOU ao abrir:', res.erro, res.codigoErro);
      showToast(res.erro, 'erro');
    }
  } catch (err) {
    console.error('[abrirProjetoPasta] EXCECAO:', err);
    showToast(err?.message || 'Erro', 'erro');
  }
};

window.verProjeto = async function(id) {
  try {
    const projetosRes = await api.listarProjetos();
    if (!projetosRes.sucesso) { showToast(projetosRes.erro, 'erro'); return; }
    const proj = projetosRes.dados.find(p => p.id === id);
    if (!proj) { showToast('Projeto não encontrado', 'erro'); return; }
    const el = document.getElementById('painel-atividade');
    const isAtual = estado.projetoAtual?.id === id;
    const caminho = proj.caminhoRaiz || '';
    const isSystem = isProjetoAgentMap(caminho);
    let configHtml = '';
    if (isAtual && estado.projetoAtual?.config) {
      const cfg = estado.projetoAtual.config;
      configHtml = `
        <p><strong>Ambiente:</strong> ${escapeHtml(cfg.ambiente || 'N/A')}</p>
        <p><strong>Versão:</strong> ${escapeHtml(cfg.versao || 'N/A')}</p>
        <p><strong>Idioma:</strong> ${escapeHtml(cfg.idioma || 'N/A')}</p>
        <p><strong>Fuso Horário:</strong> ${escapeHtml(cfg.fusoHorario || 'N/A')}</p>
        <p><strong>Proprietário:</strong> ${escapeHtml(cfg.proprietario?.nome || 'N/A')} (${escapeHtml(cfg.proprietario?.tipo || 'humano')})</p>
        <p><strong>Objetivos:</strong></p><ul>${(cfg.objetivos || []).map(o => `<li>${escapeHtml(o)}</li>`).join('') || '<li>N/A</li>'}</ul>
        <p><strong>Escopo Incluído:</strong></p><ul>${(cfg.escopo?.incluso || []).map(e => `<li>${escapeHtml(e)}</li>`).join('') || '<li>N/A</li>'}</ul>
        <p><strong>Escopo Excluído:</strong></p><ul>${(cfg.escopo?.excluido || []).map(e => `<li>${escapeHtml(e)}</li>`).join('') || '<li>N/A</li>'}</ul>`;
    }
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">${escapeHtml(proj.nome)} ${isAtual ? '<span class="badge badge--ativo">ATUAL</span>' : ''}</h3>
       <div>
        <button class="btn btn--small" onclick="abrirProjeto('${escapeAttr(proj.id)}')">Abrir</button>
        <button class="btn btn--small" onclick="editarProjeto('${escapeAttr(proj.id)}')">Editar</button>
        ${isSystem
          ? `<button class="btn btn--small btn--danger" onclick="showToast('O projeto AgentMap não pode ser excluído.', 'erro')">Excluir</button>`
          : `<button class="btn btn--small btn--danger" onclick="excluirProjeto('${escapeAttr(proj.id)}', '${escapeAttr((proj.nome || '').replace(/'/g, "\\'"))}')">Excluir</button>`
        }
      </div>
    </div>`;
    el.innerHTML += `<p><strong>ID:</strong> ${escapeHtml(proj.id)}</p>
      <p><strong>Caminho:</strong> ${escapeHtml(caminho)}<button class="btn btn--small btn--ghost" style="margin-left:8px" data-path="${escapeAttr(caminho)}" onclick="abrirPastaExplorer(this.getAttribute('data-path'))">📂 Explorar</button></p>
      <p><strong>Ativo:</strong> ${proj.ativo ? '✓' : ''}</p>
      <p><strong>Última abertura:</strong> ${escapeHtml(proj.ultimaAbertura || 'nunca')}</p>`;
    el.innerHTML += configHtml;
    console.log('[verProjeto] project found:', proj.id, '| caminhoRaiz=' + proj.caminhoRaiz, '| caminho passed to Explorer=' + caminho);
    if (!caminho || !proj.caminhoRaiz) {
      console.error('[verProjeto] AVISO: caminhoRaiz vazio ou undefined!');
    }
  } catch (err) {
    showToast(err?.message || 'Erro', 'erro');
  }
};

window.editarProjeto = async function(id) {
  try {
    const configuracaoRes = await api.getConfiguracao(id);
    const projetosRes = await api.listarProjetos();
    if (!projetosRes.sucesso) { showToast(projetosRes.erro, 'erro'); return; }
    const proj = projetosRes.dados.find(p => p.id === id);
    if (!proj) { showToast('Projeto não encontrado', 'erro'); return; }
    let config = {};
    if (configuracaoRes.sucesso && configuracaoRes.dados) {
      config = configuracaoRes.dados;
    }
    projConfigEdit = { ...config, nome: proj.nome || '', descricao: proj.descricao || '' };
    $('nome-projeto').value = proj.nome || '';
    $('caminho-parental').value = proj.caminhoRaiz || proj.caminho || '';
    $('descricao-projeto').value = proj.descricao || '';
    $('projeto-ambiente').value = config.ambiente || 'desenvolvimento';
    $('projeto-versao').value = config.versao || '1.0.0';
    $('projeto-idioma').value = config.idioma || 'pt-BR';
    $('projeto-fuso').value = config.fusoHorario || 'America/Sao_Paulo';
    $('projeto-proprietario-nome').value = config.proprietario?.nome || '';
    $('projeto-proprietario-tipo').value = config.proprietario?.tipo || 'humano';
    $('projeto-objetivos').value = (config.objetivos || []).join('\n');
    $('projeto-escopo-incluso').value = (config.escopo?.incluso || []).join('\n');
    $('projeto-escopo-excluido').value = (config.escopo?.excluido || []).join('\n');
    $('form-novo-projeto').dataset.editId = id;
    $('titulo-projeto').textContent = 'Editar Projeto';
    showModal('modal-novo-projeto');
  } catch (err) {
    showToast(err?.message || 'Erro', 'erro');
  }
};

window.excluirProjeto = async function(id, nome) {
  const projetosRes = await api.listarProjetos();
  if (projetosRes.sucesso) {
    const proj = projetosRes.dados.find((p) => p.id === id);
    if (proj && isProjetoAgentMap(proj.caminhoRaiz || proj.caminho || '')) {
      showToast('O projeto AgentMap não pode ser excluído.', 'erro');
      return;
    }
  }
  if (!confirm(`Excluir projeto "${nome}"? Esta ação remove todos os arquivos do projeto e não pode ser revertida.`)) return;
  try {
    const res = await api.removerProjeto(id);
    if (res.sucesso) {
      showToast('Projeto excluído!', 'sucesso');
      if (estado.projetoAtual && estado.projetoAtual.id === id) {
        estado.projetoAtual = null;
        estado.agentes = [];
        estado.tarefas = [];
        estado.arquivos = [];
        $('main-content').innerHTML = '<div class="card"><h2 class="card__titulo">Bem-vindo</h2><p class="card__texto">Nenhum projeto aberto. Crie ou abra um projeto para começar.</p><div class="card__actions"><button class="btn btn--primario" id="btn-criar-projeto-inicial">Criar Novo Projeto</button></div></div>';
        document.getElementById('btn-criar-projeto-inicial').addEventListener('click', () => showModal('modal-novo-projeto'));
        renderizarProjetoAtual();
      }
      if (typeof carregarPainel === 'function') {
        await carregarPainel('projetos');
      }
    } else {
      showToast(res.erro, 'erro');
    }
  } catch (err) {
    showToast(err?.message || 'Erro', 'erro');
  }
};

window.excluirTodosProjetos = async function() {
  if (!confirm('Excluir TODOS os projetos? Esta ação remove todos os arquivos de todos os projetos e não pode ser revertida.')) return;
  try {
    const res = await api.removerTodosProjetos();
    if (res.sucesso) {
      const removidos = res.dados === true ? 1 : (typeof res.dados === 'number' ? res.dados : 0);
      if (removidos > 0) {
        showToast('Todos os projetos foram excluídos!', 'sucesso');
      } else {
        showToast('Nenhum projeto excluído (projeto do AgentMap é protegido).', 'info');
      }
      estado.projetoAtual = null;
      estado.agentes = [];
      estado.tarefas = [];
      estado.arquivos = [];
      $('main-content').innerHTML = '<div class="card"><h2 class="card__titulo">Bem-vindo</h2><p class="card__texto">Nenhum projeto aberto. Crie ou abra um projeto para começar.</p><div class="card__actions"><button class="btn btn--primario" id="btn-criar-projeto-inicial">Criar Novo Projeto</button></div></div>';
      document.getElementById('btn-criar-projeto-inicial').addEventListener('click', () => showModal('modal-novo-projeto'));
      renderizarProjetoAtual();
      if (typeof carregarPainel === 'function') {
        await carregarPainel('projetos');
      }
    } else {
      showToast(res.erro, 'erro');
    }
  } catch (err) {
    showToast(err?.message || 'Erro', 'erro');
  }
};

async function renderizarAgentes(el) {
  console.log('[renderizarAgentes] renderizando, agentes em estado:', estado.agentes.length);
  try {
    const res = await api.getAgentes();
    console.log('[renderizarAgentes] resposta API:', JSON.stringify({ sucesso: res.sucesso, dadosLength: res.dados?.length, isArray: Array.isArray(res.dados) }));
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const agentes = Array.isArray(res.dados) ? res.dados : res.dados?.agentes || [];
    if (agentes.length === 0) {
      el.innerHTML = '<p class="painel-vazio">Nenhum agente cadastrado.</p><button class="btn btn--primario" style="margin-top:12px" onclick="abrirModalAgente()">+ Novo Agente</button>';
      return;
    }
  el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">Agentes (${agentes.length})</h3>
      <button class="btn btn--small btn--primario" onclick="abrirModalAgente()">+ Novo Agente</button>
    </div>`;
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>Nome</th><th>Função</th><th>Estado</th><th>Ações</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const a of agentes) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(a.nome)}</td><td>${escapeHtml(a.funcao)}</td><td><span class="badge badge--${a.estado === 'ativo' ? 'ativo' : 'inativo'}">${escapeHtml(a.estado)}</span></td>
        <td>
          <button class="btn btn--small" onclick="abrirAgente('${escapeAttr(a.id)}')">Ver Perfil</button>
          <button class="btn btn--small" onclick="editarAgente('${escapeAttr(a.id)}')">Editar</button>
          <button class="btn btn--small btn--info" onclick="gerarPromptAgente('${escapeAttr(a.id)}')">Prompt</button>
          <button class="btn btn--small btn--danger" onclick="excluirAgente('${escapeAttr(a.id)}')">Excluir</button>
        </td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarTarefas(el) {
  try {
    const res = await api.getTarefas();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const tarefas = res.dados;
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">Tarefas (${tarefas.length})</h3>
      <button class="btn btn--small btn--primario" onclick="abrirModalTarefa()">+ Nova Tarefa</button>
    </div>`;
    if (tarefas.length === 0) {
      el.innerHTML += '<p class="painel-vazio">Nenhuma tarefa cadastrada.</p>';
      return;
    }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Título</th><th>Estado</th><th>Prioridade</th><th>Agente</th><th>Ações</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const t of tarefas) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(t.id)}</td><td>${escapeHtml(t.titulo)}</td><td><span class="badge badge--${t.estado}">${escapeHtml(t.estado)}</span></td><td>${escapeHtml(t.prioridade)}</td><td>${escapeHtml(agenteNomePorId(t.agenteResponsavel))}</td>
        <td>
          <button class="btn btn--small" onclick="verTarefa('${escapeAttr(t.id)}')">Ver</button>
          <button class="btn btn--small" onclick="editarTarefa('${escapeAttr(t.id)}')">Editar</button>
          <button class="btn btn--small btn--info" onclick="gerarPromptTarefa('${escapeAttr(t.id)}')">Prompt</button>
          <button class="btn btn--small" onclick="verContexto('${escapeAttr(t.id)}')">Contexto</button>
          <button class="btn btn--small btn--danger" onclick="excluirTarefa('${escapeAttr(t.id)}')">Excluir</button>
        </td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarContratos(el) {
  try {
    const res = await api.getContratos();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const contratos = res.dados.contratos || [];
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">Contratos (${contratos.length})</h3>
      <button class="btn btn--small btn--primario" onclick="abrirModalContrato()">+ Novo Contrato</button>
    </div>`;
    if (contratos.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhum contrato cadastrado.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Nome</th><th>Versão</th><th>Estado</th><th>Obrigatório</th><th>Ações</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const c of contratos) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(c.id)}</td><td>${escapeHtml(c.nome)}</td><td>${escapeHtml(c.versao)}</td><td>${escapeHtml(c.estado)}</td><td>${c.obrigatorio ? '✓' : ''}</td>
        <td>
          <button class="btn btn--small" onclick="verContrato('${escapeAttr(c.id)}')">Ver</button>
          <button class="btn btn--small" onclick="editarContrato('${escapeAttr(c.id)}')">Editar</button>
          <button class="btn btn--small btn--danger" onclick="excluirContrato('${escapeAttr(c.id)}')">Excluir</button>
        </td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarSolicitacoes(el) {
  try {
    const res = await api.getSolicitacoes();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const todas = Array.isArray(res.dados) ? res.dados : [];
    estado.solicitacoes = todas;
    let solicitacoes = todas;

    if (estado.filtroAgenteSolicitacoes && estado.filtroAgenteSolicitacoes.agenteId) {
      const agenteId = estado.filtroAgenteSolicitacoes.agenteId;
      const filtro = estado.filtroAgenteSolicitacoes.tipo;
      solicitacoes = todas.filter((s) => {
        if (filtro === 'solicitante') return s.agenteSolicitante.id === agenteId;
        if (filtro === 'responsavel') return s.agenteResponsavel.id === agenteId;
        return true;
      });
    }

    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
      <h3 style="margin:0;">Solicitações de Alteração (${solicitacoes.length} de ${todas.length})</h3>
      <button class="btn btn--small btn--primario" onclick="abrirModalSolicitacao()">+ Nova Solicitação</button>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;padding:8px;background:#1a1a2e;border-radius:6px;">
      <input class="form__input" type="text" id="filtro-agente-id" placeholder="ID do agente (ex: AGENTE-01)" style="max-width:200px;" value="${escapeAttr(estado.filtroAgenteSolicitacoes?.agenteId || '')}" />
      <select class="form__input" id="filtro-agente-tipo" style="max-width:160px;">
        <option value="todos" ${!estado.filtroAgenteSolicitacoes?.tipo || estado.filtroAgenteSolicitacoes?.tipo === 'todos' ? 'selected' : ''}>Todas</option>
        <option value="solicitante" ${estado.filtroAgenteSolicitacoes?.tipo === 'solicitante' ? 'selected' : ''}>Sou o Solicitante</option>
        <option value="responsavel" ${estado.filtroAgenteSolicitacoes?.tipo === 'responsavel' ? 'selected' : ''}>Sou o Responsável</option>
      </select>
      ${estado.filtroAgenteSolicitacoes?.agenteId ? '<span style="font-size:0.8rem;color:var(--text-muted);">Filtrando...</span>' : ''}
    </div>`;
    if (solicitacoes.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhuma solicitação encontrada com os filtros atuais.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Título</th><th>Solicitante</th><th>Responsável</th><th>Prioridade</th><th>Status</th><th>Aprovação</th><th>Ações</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    const badgeStatus = (s) => {
      const map = { PENDENTE: 'pendente', EM_ANALISE: 'em-execucao', AGUARDANDO_APROVACAO: 'em-teste', APROVADA: 'ativo', REJEITADA: 'inativo', EM_EXECUCAO: 'em-execucao', AGUARDANDO_VALIDACAO: 'em-teste', CONCLUIDA: 'ativo', CANCELADA: 'inativo', BLOQUEADA: 'rejeitada' };
      return map[s] || 'pendente';
    };
    for (const s of solicitacoes) {
      const tr = document.createElement('tr');
      const badgeClass = s.prioridade === 'CRITICA' ? 'critico' : s.prioridade === 'ALTA' ? 'alerta' : s.prioridade === 'BAIXA' ? 'inativo' : 'ativo';
             tr.innerHTML = `<td>${escapeHtml(s.id)}</td><td>${escapeHtml(s.titulo)}</td><td>${escapeHtml(agenteNomePorId(s.agenteSolicitante?.id))}</td><td>${escapeHtml(agenteNomePorId(s.agenteResponsavel?.id || '-'))}</td><td><span class="badge badge--${badgeClass}">${escapeHtml(s.prioridade)}</span></td><td><span class="badge badge--${badgeStatus(s.status)}">${escapeHtml(s.status)}</span></td><td>${escapeHtml(s.aprovacao.status)}</td>
        <td>
          <button class="btn btn--small" onclick="verSolicitacao('${escapeAttr(s.id)}')">Ver</button>
          <button class="btn btn--small" onclick="editarSolicitacao('${escapeAttr(s.id)}')">Editar</button>
          ${s.status !== 'PENDENTE' ? '<button class="btn btn--small btn--danger" onclick="excluirSolicitacao(\'' + escapeAttr(s.id) + '\')">Excluir</button>' : ''}
        </td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

let arquivoContexto = null;
let pastaAtual = '.';

async function renderizarArquivos(el) {
  try {
    const res = await api.listarArquivos(pastaAtual);
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    el.innerHTML = `<div style="margin-bottom:12px;">
      <div class="painel-lateral__titulo">Navegação de Arquivos</div>
      <div style="display:flex;gap:8px;margin-top:8px;align-items:center;">
        <input class="form__input" type="text" id="caminho-pasta" placeholder="Caminho da pasta" value="${pastaAtual}" style="max-width:250px;">
        <button class="btn btn--small" onclick="navegarPasta()">Navegar</button>
        <button class="btn btn--small btn--ghost" onclick="navegarPasta('.')">Raiz</button>
        <button class="btn btn--small btn--success" onclick="showModal('modal-novo-arquivo')"> Novo Arquivo</button>
        <button class="btn btn--small btn--ghost" data-path="${escapeAttr(pastaAtual)}" onclick="abrirPastaExplorer(this.getAttribute('data-path'))">📂 Explorar</button>
      </div>
    </div><ul class="file-list">`;
    for (const f of res.dados) {
      const li = document.createElement('li');
      li.className = `file-list__item file-list__item--${f.tipo}`;
      li.innerHTML = `<span class="file-list__nome">${escapeHtml(f.nome)}${f.tipo === 'diretorio' ? '/' : ''}</span><span class="file-list__tamanho">${f.tipo === 'arquivo' ? f.tamanho + ' B' : ''}</span>`;
      if (f.tipo === 'diretorio') {
        li.innerHTML += `<button class="btn btn--small" onclick="abrirPasta('${escapeAttr(f.caminho)}')">Abrir</button>`;
      }
      if (f.tipo === 'arquivo' && (f.extensao === 'json' || f.extensao === 'md' || f.extensao === 'txt')) {
        li.innerHTML += `<button class="btn btn--small" onclick="editarArquivo('${escapeAttr(f.caminho)}')">Editar</button>`;
      }
      if (f.tipo === 'arquivo') {
        li.innerHTML += `<button class="btn btn--small btn--danger" onclick="excluirArquivo('${escapeAttr(f.caminho)}')">Excluir</button>`;
      }
      el.querySelector('ul').appendChild(li);
    }
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarEstado(el) {
  try {
    const res = await api.getEstado();
    if (!res.sucesso || !res.dados) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro || 'Nenhum estado')}</p>`; return; }
    const e = res.dados;
    el.innerHTML = `<h3>Estado do Projeto</h3>
      <p><strong>Projeto:</strong> ${escapeHtml(e.projetoId || e.nome || '')}</p>
      <p><strong>Estado:</strong> ${escapeHtml(e.estado || '')}</p>
      <p><strong>Fase:</strong> ${escapeHtml(e.fase || '')}</p>
      <p><strong>Versão:</strong> ${escapeHtml(e.versao || '')}</p>
      <p><strong>Agentes ativos:</strong> ${e.agentesAtivos}</p>
      <p><strong>Tarefas ativas:</strong> ${e.tarefasAtivas}</p>
      <p><strong>Tarefas bloqueadas:</strong> ${e.tarefasBloqueadas}</p>
      <p><strong>Testes:</strong> ${e.testes?.aprovados}/${e.testes?.total} aprovados</p>
      <p><strong>Qualidade:</strong> ${e.qualidade?.percentual}% (${e.qualidade?.pendenciasCriticas} críticas)</p>
      <p><strong>Segurança:</strong> ${escapeHtml(e.seguranca?.estado || '')} (${e.seguranca?.riscosCriticos} críticos, ${e.seguranca?.riscosAltos} altos)</p>`;
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarAuditoria(el) {
  try {
    const res = await api.getAuditoria();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const eventos = res.dados;
    el.innerHTML = `<h3>Auditoria (${eventos.length} eventos)</h3>`;
    if (eventos.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhum evento registrado.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Resultado</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const ev of eventos) {
      const tr = document.createElement('tr');
      const data = formatDate(ev.data);
      const cls = ev.resultado === 'sucesso' ? 'badge--ativo' : ev.resultado === 'falha' ? 'badge--bloqueada' : 'badge--inativo';
      tr.innerHTML = `<td>${escapeHtml(data)}</td><td>${escapeHtml(ev.tipo)}</td><td>${escapeHtml(ev.descricao)}</td><td><span class="badge ${cls}">${escapeHtml(ev.resultado)}</span></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
     el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarDashboardCoordenacao(el) {
  try {
    const res = await api.getEstadoProjeto();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const e = res.dados;
    el.innerHTML = `<h3>📊 Estado do Projeto</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
        <div class="card"><h4>Tarefas</h4><p>${e.tarefas.concluidas}/${e.tarefas.total} concluídas • ${e.tarefas.emExecucao} em execução • ${e.tarefas.bloqueadas} bloqueadas • ${e.tarefas.pendentes} pendentes</p></div>
        <div class="card"><h4>Solicitações</h4><p>${e.solicitacoes.pendentes} pendentes • ${e.solicitacoes.aprovadas} aprovadas • ${e.solicitacoes.rejeitadas} rejeitadas • ${e.solicitacoes.concluidas} concluídas</p></div>
        <div class="card"><h4>Artefatos</h4><p>${e.artefatos.ativos}/${e.artefatos.total} ativos</p></div>
        <div class="card"><h4>Transferências</h4><p>${e.handoffs.pendentes} pendentes • ${e.handoffs.concluidos} concluídos</p></div>
        <div class="card"><h4>Bloqueios</h4><p><strong>${e.bloqueios}</strong> ativos</p></div>
        <div class="card"><h4>Conflitos</h4><p>${e.conflitos.abertos}/${e.conflitos.total} abertos</p></div>
        <div class="card"><h4>Riscos</h4><p>${e.riscos.ativos} ativos • ${e.riscos.criticos} críticos</p></div>
        <div class="card"><h4>Validações</h4><p>${e.validacoes.pendentes} pendentes • ${e.validacoes.aprovadas} aprovadas</p></div>
        <div class="card"><h4>Reservas</h4><p>${e.reservas.ativas}/${e.reservas.total} ativas</p></div>
        <div class="card"><h4>Marcos</h4><p>${e.checkpoints.recentes} recentes</p></div>
        <div class="card"><h4>Sessões</h4><p>${e.sessoes.ativas}/${e.sessoes.total} ativas</p></div>
        <div class="card"><h4>Aprendizados</h4><p>${e.aprendizados.ativos}/${e.aprendizados.total} ativos</p></div>
        <div class="card" style="grid-column:1/-1;"><h4>🔗 Relacionamentos</h4><p>${(e.tarefas.total + e.solicitacoes.total + e.artefatos.total + e.handoffs.total + e.bloqueios + e.conflitos.total + e.riscos.total + e.validacoes.total + e.reservas.total + e.checkpoints.total + e.sessoes.total + e.aprendizados.total)} entidades com vínculos ativos</p></div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarMonitor(el) {
  try {
    const res = await api.getMonitor();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro || 'Nenhum dado')}</p>`; return; }
    const m = res.dados;
    const dataAtualizacao = formatDate(m.timestamp);

    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h3 style="margin:0;">📡 Monitor em Tempo Real</h3>
      <span style="color:var(--text-muted);font-size:0.8rem;">Atualizado: ${dataAtualizacao}</span>
      <button class="btn btn--small" onclick="carregarPainel('monitor')">🔄 Atualizar</button>
    </div>`;

    if (m.sessoesAtivas && m.sessoesAtivas.length > 0) {
      html += `<div class="card" style="margin-bottom:16px;border-left:3px solid #27ae60;">
        <h4>🖥️ Agentes Ativos (${m.sessoesAtivas.length})</h4>
        <table class="table">
          <thead><tr><th>Agente</th><th>Tarefa</th><th>Sessão</th><th>Início</th></tr></thead>
          <tbody>`;
      for (const s of m.sessoesAtivas) {
        const inicio = s.inicio ? formatDate(s.inicio) : '-';
        const tarefa = s.tarefaTitulo || s.tarefaId || '-';
        html += `<tr><td><strong>${escapeHtml(s.agenteNome || s.agenteId)}</strong></td><td>${escapeHtml(tarefa)}</td><td>${escapeHtml(s.id)}</td><td>${escapeHtml(inicio)}</td></tr>`;
      }
      html += `</tbody></table></div>`;
    } else {
      html += `<div class="card" style="margin-bottom:16px;border-left:3px solid #95a5a6;">
        <h4>🖥️ Nenhum agente ativo no momento</h4>
      </div>`;
    }

    if (m.estado) {
      html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px;">
        <div class="card"><h4>Tarefas</h4><p>${m.estado.tarefas.concluidas}/${m.estado.tarefas.total} concluídas • ${m.estado.tarefas.emExecucao} em execução • ${m.estado.tarefas.bloqueadas} bloqueadas</p></div>
        <div class="card"><h4>Solicitações</h4><p>${m.estado.solicitacoes.pendentes} pendentes • ${m.estado.solicitacoes.aprovadas} aprovadas • ${m.estado.solicitacoes.rejeitadas} rejeitadas</p></div>
        <div class="card"><h4>Riscos</h4><p>${m.estado.riscos.ativos} ativos • <strong style="color:#e74c3c;">${m.estado.riscos.criticos} críticos</strong></p></div>
        <div class="card"><h4>Sessões</h4><p>${m.estado.sessoes.ativas}/${m.estado.sessoes.total} ativas</p></div>
      </div>`;
    }

    if (m.alertas && (m.alertas.handoffsPendentes > 0 || m.alertas.bloqueiosAtivos > 0 || m.alertas.riscosCriticos > 0)) {
      html += `<div class="card" style="margin-bottom:16px;border-left:3px solid #e74c3c;">
        <h4>⚠️ Alertas</h4>
        <p><strong>Handoffs pendentes:</strong> ${m.alertas.handoffsPendentes} • <strong>Bloqueios ativos:</strong> ${m.alertas.bloqueiosAtivos} • <strong>Riscos críticos:</strong> ${m.alertas.riscosCriticos}</p>`;

      if (m.alertas.detalhes.handoffs && m.alertas.detalhes.handoffs.length > 0) {
        html += `<h5 style="margin-top:12px;">Transferências Pendentes</h5>
          <table class="table"><thead><tr><th>ID</th><th>Origem</th><th>Destino</th><th>Tarefa</th><th>Resumo</th></tr></thead><tbody>`;
        for (const h of m.alertas.detalhes.handoffs) {
          html += `<tr><td>${escapeHtml(h.id)}</td><td>${escapeHtml(h.origem)}</td><td>${escapeHtml(h.destino)}</td><td>${escapeHtml(h.tarefaId || '-')}</td><td>${escapeHtml(h.resumo || '')}</td></tr>`;
        }
        html += `</tbody></table>`;
      }

      if (m.alertas.detalhes.bloqueios && m.alertas.detalhes.bloqueios.length > 0) {
        html += `<h5 style="margin-top:12px;">Bloqueios Ativos</h5>
          <table class="table"><thead><tr><th>ID</th><th>Tarefa</th><th>Tipo</th><th>Gravidade</th><th>Descrição</th></tr></thead><tbody>`;
        for (const b of m.alertas.detalhes.bloqueios) {
          html += `<tr><td>${escapeHtml(b.id)}</td><td>${escapeHtml(b.tarefaId)}</td><td>${escapeHtml(b.tipo)}</td><td><span class="badge badge--bloqueada">${escapeHtml(b.gravidade)}</span></td><td>${escapeHtml(b.descricao || '')}</td></tr>`;
        }
        html += `</tbody></table>`;
      }

      if (m.alertas.detalhes.riscos && m.alertas.detalhes.riscos.length > 0) {
        html += `<h5 style="margin-top:12px;">Riscos Críticos</h5>
          <table class="table"><thead><tr><th>ID</th><th>Título</th><th>Gravidade</th><th>Descrição</th></tr></thead><tbody>`;
        for (const r of m.alertas.detalhes.riscos) {
          html += `<tr><td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.titulo)}</td><td><span class="badge badge--bloqueada">${escapeHtml(r.gravidade)}</span></td><td>${escapeHtml(r.descricao || '')}</td></tr>`;
        }
        html += `</tbody></table>`;
      }

      html += `</div>`;
    }

    if (m.mensagensRecentes && m.mensagensRecentes.length > 0) {
      html += `<div class="card">
        <h4>💬 Mensagens de Monitoramento</h4>
        <table class="table">
          <thead><tr><th>Data</th><th>Tipo</th><th>Emissor</th><th>Conteúdo</th></tr></thead>
          <tbody>`;
      for (const msg of m.mensagensRecentes) {
        const data = formatDate(msg.timestamp);
        html += `<tr><td>${escapeHtml(data)}</td><td>${escapeHtml(msg.tipo)}</td><td>${escapeHtml(msg.emissor)}</td><td>${escapeHtml(msg.conteudo || '')}</td></tr>`;
      }
      html += `</tbody></table></div>`;
    }

    if (m.eventosRecentes && m.eventosRecentes.length > 0) {
      html += `<div class="card">
        <h4>📜 Eventos Recentes</h4>
        <table class="table">
          <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Resultado</th></tr></thead>
          <tbody>`;
      for (const ev of m.eventosRecentes) {
        const data = formatDate(ev.data);
        const cls = ev.resultado === 'sucesso' ? 'badge--ativo' : ev.resultado === 'falha' ? 'badge--bloqueada' : 'badge--inativo';
        html += `<tr><td>${escapeHtml(data)}</td><td>${escapeHtml(ev.tipo)}</td><td>${escapeHtml(ev.descricao)}</td><td><span class="badge ${cls}">${escapeHtml(ev.resultado)}</span></td></tr>`;
      }
      html += `</tbody></table></div>`;
    }

    el.innerHTML = html;
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarResultados(el) {
  try {
    const res = await api.getResultados();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">✅ Resultados (${items.length})</h3>
      <button class="btn btn--small btn--primario" onclick="abrirModal('modal-resultado')">+ Novo Resultado</button>
    </div>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhum resultado registrado.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Tarefa</th><th>Agente</th><th>Resumo</th><th>Estado</th><th>Ações</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const r of items) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.tarefaId)}</td><td>${escapeHtml(r.agenteId)}</td><td>${escapeHtml(r.resumo)}</td>
        <td><span class="badge badge--ativo">${escapeHtml(r.estado)}</span></td>
        <td><button class="btn btn--small" onclick="verResultado('${escapeAttr(r.id)}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarArtefatos(el) {
  try {
    const res = await api.getArtefatos();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">📦 Artefatos (${items.length})</h3>
      <button class="btn btn--small btn--primario" onclick="abrirModal('modal-artefato')">+ Novo Artefato</button>
    </div>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhum artefato registrado.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Nome</th><th>Tipo</th><th>Agente</th><th>Tarefa</th><th>Estado</th><th>Ações</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const a of items) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(a.id)}</td><td>${escapeHtml(a.nome)}</td><td>${escapeHtml(a.tipo)}</td><td>${escapeHtml(a.agenteId)}</td><td>${escapeHtml(a.tarefaId || '')}</td>
        <td><span class="badge badge--ativo">${escapeHtml(a.estado)}</span></td>
        <td><button class="btn btn--small" onclick="verArtefato('${escapeAttr(a.id)}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarHandoffs(el) {
  try {
    const res = await api.getHandoffs();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">🤝 Transferências (${items.length})</h3>
      <button class="btn btn--small btn--primario" onclick="abrirModal('modal-handoff')">+ Nova Transferência</button>
    </div>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhuma transferência registrada.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Origem</th><th>Destino</th><th>Tarefa</th><th>Resumo</th><th>Estado</th><th>Ações</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const h of items) {
      const tr = document.createElement('tr');
      const badgeClass = h.estado === 'PENDENTE' ? 'badge--ativo' : h.estado === 'CONCLUIDO' ? 'badge--ativo' : 'badge--inativo';
      tr.innerHTML = `<td>${escapeHtml(h.id)}</td><td>${escapeHtml(h.origem)}</td><td>${escapeHtml(h.destino)}</td><td>${escapeHtml(h.tarefaId || '')}</td><td>${escapeHtml(h.resumo)}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(h.estado)}</span></td>
        <td><button class="btn btn--small" onclick="verHandoff('${escapeAttr(h.id)}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarValidacoes(el) {
  try {
    const res = await api.getValidacoes();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">🔒 Validações (${items.length})</h3>
      <button class="btn btn--small btn--primario" onclick="abrirModal('modal-validacao')">+ Nova Validação</button>
    </div>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhuma validação registrada.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Alvo</th><th>Tipo</th><th>Responsável</th><th>Estado</th><th>Ações</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const v of items) {
      const tr = document.createElement('tr');
      const badgeClass = v.estado === 'APROVADO' ? 'badge--ativo' : v.estado === 'REPROVADO' ? 'badge--bloqueada' : v.estado === 'APROVADO_COM_RESSALVAS' ? 'badge--inativo' : 'badge--ativo';
      tr.innerHTML = `<td>${escapeHtml(v.id)}</td><td>${escapeHtml(v.alvoId)}</td><td>${escapeHtml(v.alvoTipo)}</td><td>${escapeHtml(v.responsavel)}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(v.estado)}</span></td>
        <td><button class="btn btn--small" onclick="verValidacao('${escapeAttr(v.id)}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarPendencias(el) {
  try {
    const res = await api.getPendencias();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">⏳ Pendências (${items.length})</h3>
      <button class="btn btn--small btn--primario" onclick="abrirModal('modal-pendencia')">+ Nova Pendência</button>
    </div>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhuma pendência registrada.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Título</th><th>Tipo</th><th>Prioridade</th><th>Estado</th><th>Ações</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const p of items) {
      const tr = document.createElement('tr');
      const badgeClass = p.estado === 'RESOLVIDO' ? 'badge--ativo' : p.estado === 'CANCELADO' ? 'badge--inativo' : 'badge--bloqueada';
      tr.innerHTML = `<td>${escapeHtml(p.id)}</td><td>${escapeHtml(p.titulo)}</td><td>${escapeHtml(p.tipo)}</td><td>${escapeHtml(p.prioridade)}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(p.estado)}</span></td>
        <td><button class="btn btn--small" onclick="verPendencia('${escapeAttr(p.id)}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarConflitos(el) {
  try {
    const res = await api.getConflitos();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">⚡ Conflitos (${items.length})</h3>
      <button class="btn btn--small btn--primario" onclick="abrirModal('modal-conflito')">+ Novo Conflito</button>
    </div>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhum conflito registrado.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Título</th><th>Tipo</th><th>Severidade</th><th>Estado</th><th>Ações</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const c of items) {
      const tr = document.createElement('tr');
      const badgeClass = c.estado === 'RESOLVIDO' ? 'badge--ativo' : c.estado === 'CANCELADO' ? 'badge--inativo' : 'badge--bloqueada';
      tr.innerHTML = `<td>${escapeHtml(c.id)}</td><td>${escapeHtml(c.titulo)}</td><td>${escapeHtml(c.tipo)}</td><td>${escapeHtml(c.severidade)}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(c.estado)}</span></td>
        <td><button class="btn btn--small" onclick="verConflito('${escapeAttr(c.id)}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarReservas(el) {
  try {
    const res = await api.getReservas();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">🔒 Reservas (${items.length})</h3>
      <button class="btn btn--small btn--primario" onclick="abrirModal('modal-reserva')">+ Nova Reserva</button>
    </div>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhuma reserva registrada.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Alvo</th><th>Tipo</th><th>Agente</th><th>Estado</th><th>Ações</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const r of items) {
      const tr = document.createElement('tr');
      const badgeClass = r.estado === 'ATIVA' ? 'badge--ativo' : 'badge--inativo';
      tr.innerHTML = `<td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.alvo)}</td><td>${escapeHtml(r.tipoAlvo)}</td><td>${escapeHtml(r.agenteId)}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(r.estado)}</span></td>
        <td><button class="btn btn--small" onclick="verReserva('${escapeAttr(r.id)}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarDecisoes(el) {
  try {
    const res = await api.getDecisoes();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<h3>💭 Decisões (${items.length})</h3>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhuma decisão registrada.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Título</th><th>Estado</th><th>Data</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const d of items) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(d.id)}</td><td>${escapeHtml(d.titulo)}</td><td>${escapeHtml(d.estado)}</td><td>${escapeHtml(d.data)}</td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarDependencias(el) {
  try {
    const res = await api.getDependencias();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">🔗 Dependências (${items.length})</h3>
      <button class="btn btn--small btn--primario" onclick="abrirModal('modal-dependencia')">+ Nova Dependência</button>
    </div>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhuma dependência registrada.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Fonte</th><th>Tipo</th><th>Destino</th><th>Estado</th><th>Ações</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const d of items) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(d.id)}</td><td>${escapeHtml(d.fonteTipo)}:${escapeHtml(d.fonteId)}</td><td>${escapeHtml(d.tipo)}</td><td>${escapeHtml(d.destinoTipo)}:${escapeHtml(d.destinoId)}</td>
        <td><span class="badge badge--ativo">${escapeHtml(d.estado)}</span></td>
        <td><button class="btn btn--small" onclick="verDependencia('${escapeAttr(d.id)}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarResponsabilidades(el) {
  try {
    const res = await api.getResponsabilidades();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">👥 Responsabilidades (${items.length})</h3>
      <button class="btn btn--small btn--primario" onclick="abrirModal('modal-responsabilidade')">+ Nova Responsabilidade</button>
    </div>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhuma responsabilidade registrada.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Agente</th><th>Alvo</th><th>Tipo</th><th>Nível</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const r of items) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.agenteId)}</td><td>${escapeHtml(r.alvoId)}</td><td>${escapeHtml(r.alvoTipo)}</td><td>${escapeHtml(r.nivel)}</td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarSessoes(el) {
  try {
    const res = await api.getSessoes();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const items = res.dados || [];
    const ativas = items.filter((s) => !s.datas.fim);
    el.innerHTML = `<h3>🖥️ Sessões (${items.length} total, ${ativas.length} ativas)</h3>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhuma sessão registrada.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Agente</th><th>Tarefa</th><th>Início</th><th>Fim</th><th>Estado Final</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const s of items) {
      const tr = document.createElement('tr');
      const agente = s.agenteNome || s.agenteId;
      const tarefa = s.tarefaTitulo || s.tarefaId || '';
      tr.innerHTML = `<td>${escapeHtml(s.id)}</td><td>${escapeHtml(agente)}</td><td>${escapeHtml(tarefa)}</td><td>${escapeHtml(s.datas.inicio || '')}</td><td>${escapeHtml(s.datas.fim || '')}</td><td>${escapeHtml(s.estadoFinal)}</td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarCheckpoints(el) {
  try {
    const res = await api.getCheckpoints();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">📍 Marcos (${items.length})</h3>
      <button class="btn btn--small btn--primario" onclick="abrirModal('modal-checkpoint')">+ Novo Marco</button>
    </div>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhum marco registrado.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Tarefa</th><th>Agente</th><th>Título</th><th>Tipo</th><th>Ações</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const c of items) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(c.id)}</td><td>${escapeHtml(c.tarefaId)}</td><td>${escapeHtml(c.agenteId)}</td><td>${escapeHtml(c.titulo)}</td><td>${escapeHtml(c.tipo)}</td>
        <td><button class="btn btn--small" onclick="verCheckpoint('${escapeAttr(c.id)}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarAprendizados(el) {
  try {
    const res = await api.getAprendizados();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">📚 Aprendizados (${items.length})</h3>
      <button class="btn btn--small btn--primario" onclick="abrirModal('modal-aprendizado')">+ Novo Aprendizado</button>
    </div>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhum aprendizado registrado.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Título</th><th>Categoria</th><th>Utilidade</th><th>Estado</th><th>Ações</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const a of items) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(a.id)}</td><td>${escapeHtml(a.titulo)}</td><td>${escapeHtml(a.categoria)}</td><td>${escapeHtml(a.utilidade)}</td><td>${escapeHtml(a.estado)}</td>
        <td><button class="btn btn--small" onclick="verAprendizado('${escapeAttr(a.id)}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarHistorico(el) {
  try {
    const res = await api.getAuditoria();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const eventos = res.dados || [];
    el.innerHTML = `<h3>📜 Histórico de Coordenação (${eventos.length} eventos)</h3>`;
    if (eventos.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhum evento registrado.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Agente</th><th>Tarefa</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const ev of eventos) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(formatDate(ev.data))}</td><td>${escapeHtml(ev.tipo)}</td><td>${escapeHtml(ev.descricao)}</td><td>${escapeHtml(ev.agenteId || '')}</td><td>${escapeHtml(ev.tarefaId || '')}</td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarIntegridade(el) {
  try {
    const res = await api.getIntegridade();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const data = res.dados;
    el.innerHTML = `<h3>🔍 Verificação de Integridade</h3>
      <p><strong>Estado:</strong> <span class="badge ${data.estado === 'OK' ? 'badge--ativo' : 'badge--bloqueada'}">${data.estado}</span></p>
      <p><strong>Inconsistências:</strong> ${data.inconsistencias.length}</p>`;
    if (data.inconsistencias.length > 0) {
      el.innerHTML += '<h4>Detalhes:</h4><ul>';
      for (const inc of data.inconsistencias) {
        el.innerHTML += `<li>${escapeHtml(inc)}</li>`;
      }
      el.innerHTML += '</ul>';
    }
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarBloqueios(el) {
  try {
    const res = await api.getBloqueios();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<h3>🚫 Bloqueios (${items.length})</h3>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhum bloqueio registrado.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Tarefa</th><th>Agente</th><th>Motivo</th><th>Estado</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const b of items) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(b.id)}</td><td>${escapeHtml(b.tarefaId)}</td><td>${escapeHtml(b.agenteId || '')}</td><td>${escapeHtml(b.motivo)}</td><td>${escapeHtml(b.estado)}</td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

async function renderizarRiscos(el) {
  try {
    const res = await api.getRiscos();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${escapeHtml(res.erro)}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<h3>⚠️ Riscos (${items.length})</h3>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhum risco registrado.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Título</th><th>Categoria</th><th>Gravidade</th><th>Estado</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const r of items) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.titulo)}</td><td>${escapeHtml(r.categoria)}</td><td>${escapeHtml(r.gravidade)}</td><td>${escapeHtml(r.estado)}</td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
}

window.navegarPasta = function(caminho = null) {
  const input = document.getElementById('caminho-pasta');
  const raw = caminho !== null ? caminho : (input ? input.value : '.');
  pastaAtual = sanitizePath(raw) || '.';
  carregarPainel('arquivos');
};

window.abrirPasta = function(caminho) {
  pastaAtual = sanitizePath(caminho) || '.';
  carregarPainel('arquivos');
};

window.abrirPastaExplorer = async function(caminho) {
  const safePath = sanitizePath(caminho);
  if (!safePath) { showToast('Caminho inválido', 'erro'); return; }
  console.log('[abrirPastaExplorer] chamado com caminho=' + safePath);
  try {
    const res = await api.abrirPastaExplorer(safePath);
    console.log('[abrirPastaExplorer] resposta:', res.sucesso, res.dados || res.erro);
    if (res.sucesso) {
      showToast('Pasta aberta no Explorador!', 'sucesso');
    } else {
      showToast(res.erro || 'Erro ao abrir Explorador', 'erro');
    }
  } catch (err) {
    console.error('[abrirPastaExplorer] erro:', err);
    showToast(err?.message || 'Erro', 'erro');
  }
};

async function editarArquivo(caminho) {
  const safePath = sanitizePath(caminho);
  if (!safePath) { showToast('Caminho inválido', 'erro'); return; }
  try {
    const res = await api.lerArquivo(safePath);
    if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
    $('editor-titulo').textContent = safePath;
    $('editor-texto').value = res.dados;
    arquivoContexto = safePath;
    showModal('modal-editor');
  } catch (err) {
    showToast(err?.message || 'Erro', 'erro');
  }
}

async function excluirArquivo(caminho) {
  const safePath = sanitizePath(caminho);
  if (!safePath) { showToast('Caminho inválido', 'erro'); return; }
  if (!confirm(`Excluir "${safePath}"? Esta ação não pode ser revertida.`)) return;
  try {
    const res = await api.excluirArquivo(safePath, true);
    if (res.sucesso) {
      showToast('Arquivo excluído!', 'sucesso');
      carregarPainel('arquivos');
    } else {
      showToast(res.erro, 'erro');
    }
  } catch (err) {
    showToast(err?.erro || 'Erro ao excluir', 'erro');
  }
}

function salvarArquivo() {
  if (!arquivoContexto) return;
  const conteudo = $('editor-texto').value;
  api.atualizarArquivo(arquivoContexto, conteudo).then((res) => {
    if (res.sucesso) {
      showToast('Arquivo salvo!', 'sucesso');
      hideModal('modal-editor');
    } else {
      showToast(res.erro || 'Erro ao salvar', 'erro');
    }
  }).catch((err) => showToast(err?.erro || 'Erro ao salvar', 'erro'));
}

$('form-criar-arquivo').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = e.submitter || $('form-criar-arquivo').querySelector('button[type="submit"]');
  setButtonLoading(btn, true);
  const nome = $('nome-novo-arquivo').value.trim();
  if (!nome) { restoreButton(btn); return; }
  const caminho = pastaAtual === '.' ? nome : `${pastaAtual}/${nome}`;
  try {
    const res = await api.escreverArquivo(caminho, $('conteudo-novo-arquivo').value);
    if (res.sucesso) {
      showToast('Arquivo criado!', 'sucesso');
      hideModal('modal-novo-arquivo');
      e.target.reset();
      carregarPainel('arquivos');
    } else {
      showToast(res.erro, 'erro');
    }
  } catch (err) {
    showToast(err?.erro || 'Erro ao criar arquivo', 'erro');
  } finally {
    restoreButton(btn);
  }
});

$('btn-cancelar-novo-arquivo').addEventListener('click', () => hideModal('modal-novo-arquivo'));

window.abrirAgente = async function(id) {
  try {
    const res = await api.getAgente(id);
    if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
    const p = res.dados;
    const el = document.getElementById('painel-atividade');
    let html = `<h3>${escapeHtml(p.registro.nome)}</h3>
      <p><strong>Função:</strong> ${escapeHtml(p.funcao)}</p>
      <p><strong>Estado:</strong> ${escapeHtml(p.estado)}</p>
      <p><strong>Domínios permitidos:</strong> ${escapeHtml((p.diretoriosPermitidos || []).join(', ') || 'nenhum')}</p>
      <p><strong>Contratos obrigatórios:</strong> ${escapeHtml((p.contratosObrigatorios || []).join(', ') || 'nenhum')}</p>`;
    el.innerHTML = html;
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = '<thead><tr><th>Permissão</th><th>Permitido</th></tr></thead><tbody></tbody>';
    const tbody = table.querySelector('tbody');
    for (const [k, v] of Object.entries(p.permissoes)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(k)}</td><td>${v ? '✓' : ''}</td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    showToast(err?.message || 'Erro', 'erro');
  }
};

window.editarArquivo = editarArquivo;
window.excluirArquivo = excluirArquivo;
window.navegarPasta = window.navegarPasta;

window.abrirModalAgente = function() {
  console.log('[abrirModalAgente] opcoesAgente:', JSON.stringify(estado.opcoesAgente));
  $('form-agente').reset();
  $('agente-id').value = '';
  $('agente-id-input').disabled = false;
  $('agente-id-input').value = '';
  $('agente-nome').value = '';
  $('agente-funcao').value = '';
  $('agente-descricao').value = '';
  $('agente-estado').value = 'ativo';
  gerarCheckboxes('agente-diretorios-permitidos-cb', 'dir-perm', estado.opcoesAgente.diretorios, []);
  gerarCheckboxes('agente-diretorios-proibidos-cb', 'dir-proib', estado.opcoesAgente.diretorios, []);
  gerarCheckboxes('agente-contratos-cb', 'contrato', estado.opcoesAgente.contratos, []);
  gerarCheckboxes('agente-ambientes-cb', 'ambiente', estado.opcoesAgente.ambientes, ['desenvolvimento','teste']);
  console.log('[abrirModalAgente] checkboxes gerados para dirs:', estado.opcoesAgente.diretorios.length, '| contratos:', estado.opcoesAgente.contratos.length);
  $('agente-responsabilidades').value = '';
  $('agente-conhecimentos').value = '';
  ['ler','criar','alterar','executar','testar','revisar'].forEach((p) => $(`perm-${p}`).checked = true);
  ['excluir','aprovar','implantar'].forEach((p) => $(`perm-${p}`).checked = false);
  clearDirTags('dir-perm');
  clearDirTags('dir-proib');
  $('titulo-agente').textContent = 'Novo Agente';
  showModal('modal-agente');
};

function gerarCheckboxes(containerId, namePrefix, opcoes, selecionados) {
  const container = $(containerId);
  if (!container) { console.error('[gerarCheckboxes] container não encontrado:', containerId); return; }
  container.innerHTML = '';
  opcoes.forEach((opt) => {
    const label = document.createElement('label');
    label.className = 'form__checkbox';
    label.innerHTML = `<input type="checkbox" name="${escapeAttr(namePrefix)}" value="${escapeAttr(opt)}" ${selecionados.includes(opt) ? 'checked' : ''}> ${escapeHtml(opt)}`;
    container.appendChild(label);
  });
  console.log('[gerarCheckboxes]', containerId, '- opções:', opcoes.length, '| selecionados:', selecionados);
}

window.editarAgente = async function(id) {
  try {
    const res = await api.getAgente(id);
    if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
    const p = res.dados;
    $('agente-id').value = id;
    $('agente-id-input').disabled = true;
    $('agente-id-input').value = id;
    $('agente-nome').value = p.nome || '';
    $('agente-funcao').value = p.funcao || '';
    $('agente-descricao').value = p.descricao || '';
    $('agente-estado').value = p.estado || 'ativo';
    $('agente-dominio').value = p.dominio || 'geral';
    $('agente-linguagem').value = p.linguagemPreferida || '';
    $('agente-modelo').value = p.modelo?.nome || '';
    $('dir-perm-input').value = '';
    $('dir-proib-input').value = '';
    const dirs = estado.opcoesAgente.diretorios;
    gerarCheckboxes('agente-diretorios-permitidos-cb', 'dir-perm', dirs, (p.diretoriosPermitidos || []).filter(d => dirs.includes(d)));
    gerarCheckboxes('agente-diretorios-proibidos-cb', 'dir-proib', dirs, (p.diretoriosProibidos || []).filter(d => dirs.includes(d)));
    gerarCheckboxes('agente-contratos-cb', 'contrato', estado.opcoesAgente.contratos, p.contratosObrigatorios || []);
    gerarCheckboxes('agente-ambientes-cb', 'ambiente', estado.opcoesAgente.ambientes, p.ambientesPermitidos || []);
    $('agente-responsabilidades').value = (p.responsabilidades || []).join('\n');
    $('agente-conhecimentos').value = (p.conhecimentos || []).join('\n');
     const perms = p.permissoes || {};
     ['ler','criar','alterar','excluir','executar','testar','revisar','aprovar','implantar'].forEach((perm) => $(`perm-${perm}`).checked = !!perms[perm]);
     $('titulo-agente').textContent = `Editar: ${escapeHtml(p.nome)}`;
    clearDirTags('dir-perm');
    clearDirTags('dir-proib');
    (p.diretoriosPermitidos || []).filter(d => !dirs.includes(d)).forEach(d => addDirTag('dir-perm', d));
    (p.diretoriosProibidos || []).filter(d => !dirs.includes(d)).forEach(d => addDirTag('dir-proib', d));
    showModal('modal-agente');
  } catch (err) {
    showToast(err?.message || 'Erro', 'erro');
  }
};

window.excluirAgente = async function(id) {
  const agenteNome = estado.agentes.find(a => a.id === id)?.nome || id;
  if (!confirm(`Excluir agente "${agenteNome}"? Esta ação não pode ser revertida.`)) return;
  try {
    const res = await api.excluirAgente(id);
    if (res.sucesso) {
      showToast('Agente excluído!', 'sucesso');
      carregarPainel('agentes');
    } else {
      showToast(res.erro, 'erro');
    }
  } catch (err) {
    showToast(err?.erro || 'Erro ao excluir agente', 'erro');
  }
};

window.excluirTarefa = async function(id) {
  const tarefaNome = estado.tarefas.find(t => t.id === id)?.titulo || id;
  if (!confirm(`Excluir tarefa "${tarefaNome}"? Esta ação não pode ser revertida.`)) return;
  try {
    const res = await api.excluirTarefa(id);
    if (res.sucesso) {
      showToast('Tarefa excluída!', 'sucesso');
      carregarPainel('tarefas');
    } else {
      showToast(res.erro, 'erro');
    }
  } catch (err) {
    showToast(err?.erro || 'Erro ao excluir tarefa', 'erro');
  }
};

window.abrirModalTarefa = function() {
  const select = $('tarefa-agente');
  select.innerHTML = '';
  for (const a of estado.agentes) {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = a.nome;
    select.appendChild(opt);
  }
  $('form-tarefa').reset();
  $('tarefa-id').value = '';
  $('titulo-tarefa').textContent = 'Nova Tarefa';
  showModal('modal-tarefa');
};

window.editarTarefa = async function(id) {
  try {
    const res = await api.obterTarefa(id);
    if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
    const t = res.dados;
    const select = $('tarefa-agente');
    select.innerHTML = '';
    const agentesRes = await api.getAgentes();
    const agentes = (agentesRes.sucesso ? (Array.isArray(agentesRes.dados) ? agentesRes.dados : agentesRes.dados?.agentes || []) : estado.agentes) || [];
    for (const a of agentes) {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.nome;
      if (a.id === t.agenteResponsavel) opt.selected = true;
      select.appendChild(opt);
    }
    $('tarefa-id').value = t.id;
    $('tarefa-titulo').value = t.titulo;
    $('tarefa-objetivo').value = t.objetivo;
    $('tarefa-tipo').value = t.tipo;
    $('tarefa-dominio').value = t.dominio;
    $('tarefa-prioridade').value = t.prioridade;
    $('tarefa-estimativa').value = t.estimativaHoras || '';
    $('tarefa-data-limite').value = t.dataLimite || '';
    $('tarefa-dependencias').value = (t.dependencias || []).join('\n');
    $('tarefa-criterios').value = (t.criteriosAceitacao || []).join('\n');
    $('tarefa-arquivos-esperados').value = (t.arquivosPermitidos || []).join('\n');
    $('tarefa-contexto').value = (t.contextoNecessario || []).join('\n');
    $('tarefa-contratos').value = (t.contratosObrigatorios || []).join(', ');
    $('tarefa-tags').value = (t.tags || []).join(', ');
    $('titulo-tarefa').textContent = 'Editar Tarefa';
    showModal('modal-tarefa');
  } catch (err) {
    showToast(err?.message || 'Erro', 'erro');
  }
};

window.verContexto = async function(id) {
  try {
    const res = await api.getTarefaContexto(id);
    if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
    $('contexto-texto').value = JSON.stringify(res.dados, null, 2);
    showModal('modal-contexto');
  } catch (err) {
    showToast(err?.message || 'Erro', 'erro');
  }
};

window.verTarefa = async function(id) {
  try {
    const res = await api.obterTarefa(id);
    if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
    const t = res.dados;
    const el = document.getElementById('painel-atividade');
    let html = `<div style="padding:8px;">
      <h3>${escapeHtml(t.id)} — ${escapeHtml(t.titulo)}</h3>
      <p><strong>Estado:</strong> <span class="badge badge--${t.estado}">${escapeHtml(t.estado)}</span> | <strong>Prioridade:</strong> ${escapeHtml(t.prioridade)}</p>
      <p><strong>Objetivo:</strong> ${escapeHtml(t.objetivo || '')}</p>
      <p><strong>Tipo:</strong> ${escapeHtml(t.tipo)} | <strong>Domínio:</strong> ${escapeHtml(t.dominio)} | <strong>Ambiente:</strong> ${escapeHtml(t.ambiente)}</p>
      <p><strong>Agente Responsável:</strong> ${escapeHtml(agenteNomePorId(t.agenteResponsavel))}</p>
      <p><strong>Contratos Obrigatórios:</strong> ${escapeHtml((t.contratosObrigatorios || []).join(', ') || 'Nenhum')}</p>
      <p><strong>Critérios de Aceitação:</strong> ${escapeHtml((t.criteriosAceitacao || []).join(', ') || 'Nenhum')}</p>
      <p><strong>Dependências:</strong> ${escapeHtml((t.dependencias || []).join(', ') || 'Nenhuma')}</p>
      <p><strong>Estimativa:</strong> ${t.estimativaHoras ? escapeHtml(t.estimativaHoras + 'h') : 'N/A'}</p>
      <p><strong>Data Limite:</strong> ${escapeHtml(t.dataLimite || 'N/A')}</p>
      <p><strong>Tags:</strong> ${escapeHtml((t.tags || []).join(', ') || 'N/A')}</p>
      <p><strong>Arquivos Esperados:</strong> ${escapeHtml((t.arquivosPermitidos || []).join(', ') || 'N/A')}</p>
      <p><strong>Contexto:</strong> ${escapeHtml((t.contextoNecessario || []).join('; ') || 'N/A')}</p>
      ${t.datas?.inicio ? `<p><strong>Início:</strong> ${formatDate(t.datas.inicio)}</p>` : ''}
      ${t.datas?.conclusao ? `<p><strong>Conclusão:</strong> ${formatDate(t.datas.conclusao)}</p>` : ''}
      <p><strong>Criada em:</strong> ${t.datas?.criacao ? formatDate(t.datas.criacao) : '-'}</p>
      <p><strong>Última atualização:</strong> ${t.datas?.ultimaAtualizacao ? formatDate(t.datas.ultimaAtualizacao) : '-'}</p>
    </div>`;
    const container = document.createElement('div');
    container.innerHTML = html;
    el.innerHTML = '';
    el.appendChild(container);
    const relacionados = await carregarItensRelacionados('tarefa', t.id);
    const relEl = document.createElement('div');
    relEl.innerHTML = renderizarSecaoRelacionados(relacionados);
    el.appendChild(relEl);
  } catch (err) {
    showToast(err?.message || 'Erro', 'erro');
  }
};

window.abrirModalContrato = function(contrato = null) {
  $('form-contrato').reset();
  $('contrato-id').value = '';
  $('contrato-id-input').disabled = false;
  if (contrato) {
    $('contrato-id').value = contrato.id;
    $('contrato-id-input').disabled = true;
    $('contrato-id-input').value = contrato.id;
    $('contrato-nome').value = contrato.nome || '';
    $('contrato-versao').value = contrato.versao || '1.0.0';
    $('contrato-estado').value = contrato.estado || 'ativo';
    $('contrato-obrigatorio').checked = !!contrato.obrigatorio;
    $('contrato-descricao').value = contrato.descricao || '';
    $('contrato-objetivo').value = contrato.objetivo || '';
    $('contrato-regras').value = (contrato.regras || []).join('\n');
    $('contrato-restricoes').value = (contrato.restricoes || []).join('\n');
    $('titulo-contrato').textContent = `Editar: ${escapeHtml(contrato.nome)}`;
  } else {
    $('contrato-id-input').value = '';
    $('titulo-contrato').textContent = 'Novo Contrato';
  }
  showModal('modal-contrato');
};

window.verContrato = async function(id) {
  try {
    const res = await api.getContrato(id);
    if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
    const c = res.dados;
    const el = document.getElementById('painel-atividade');
    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">${escapeHtml(c.nome)}</h3>
      <div>
        <button class="btn btn--small" onclick="editarContrato('${escapeAttr(c.id)}')">Editar</button>
        <button class="btn btn--small btn--danger" onclick="excluirContrato('${escapeAttr(c.id)}')">Excluir</button>
      </div>
    </div>`;
    html += `<p><strong>ID:</strong> ${escapeHtml(c.id)}</p>
      <p><strong>Versão:</strong> ${escapeHtml(c.versao)}</p>
      <p><strong>Estado:</strong> ${escapeHtml(c.estado)}</p>
      <p><strong>Obrigatório:</strong> ${c.obrigatorio ? '✓' : ''}</p>
      <p><strong>Descrição:</strong> ${escapeHtml(c.descricao || '')}</p>
      <p><strong>Objetivo:</strong> ${escapeHtml(c.objetivo || '')}</p>`;
    if (c.regras?.length) {
      html += `<p><strong>Regras:</strong></p><ul>${c.regras.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>`;
    }
    if (c.restricoes?.length) {
      html += `<p><strong>Restrições:</strong></p><ul>${c.restricoes.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>`;
    }
    el.innerHTML = html;
    const relacionados = await carregarItensRelacionados('artefato', c.id);
    const relEl = document.createElement('div');
    relEl.innerHTML = renderizarSecaoRelacionados(relacionados);
    el.appendChild(relEl);
  } catch (err) {
    showToast(err?.message || 'Erro', 'erro');
  }
};

window.editarContrato = async function(id) {
  try {
    const res = await api.getContrato(id);
    if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
    abrirModalContrato(res.dados);
  } catch (err) {
    showToast(err?.message || 'Erro', 'erro');
  }
};

window.excluirContrato = async function(id) {
  if (!confirm(`Excluir contrato "${id}"? Esta ação não pode ser revertida.`)) return;
  try {
    const res = await api.excluirContrato(id);
    if (res.sucesso) {
      showToast('Contrato excluído!', 'sucesso');
      carregarPainel('contratos');
    } else {
      showToast(res.erro, 'erro');
    }
  } catch (err) {
    showToast(err?.message || 'Erro', 'erro');
  }
};

  $('form-contrato').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = e.submitter || $('form-contrato').querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    const id = $('contrato-id').value;
    const dados = {
      id: $('contrato-id-input').value.trim(),
      nome: $('contrato-nome').value.trim(),
      versao: $('contrato-versao').value.trim(),
      estado: $('contrato-estado').value,
      obrigatorio: $('contrato-obrigatorio').checked,
      descricao: $('contrato-descricao').value.trim(),
      objetivo: $('contrato-objetivo').value.trim(),
      regras: $('contrato-regras').value.split('\n').map(s => s.trim()).filter(s => s),
      restricoes: $('contrato-restricoes').value.split('\n').map(s => s.trim()).filter(s => s)
    };
    if (!dados.id || !dados.nome || !dados.versao) {
      showToast('ID, Nome e Versão são obrigatórios', 'erro');
      restoreButton(btn);
      return;
    }
    try {
      const res = id ? await api.atualizarContrato(dados) : await api.criarContrato(dados);
      if (res.sucesso) {
        showToast('Contrato salvo!', 'sucesso');
        hideModal('modal-contrato');
        carregarPainel('contratos');
      } else {
        showToast(res.erro, 'erro');
      }
    } catch (err) {
      showToast(err?.erro || 'Erro ao salvar contrato', 'erro');
    } finally {
      restoreButton(btn);
    }
  });

  $('form-tarefa').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = e.submitter || $('form-tarefa').querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    const id = $('tarefa-id').value;
    const dados = {
      titulo: $('tarefa-titulo').value.trim(),
      objetivo: $('tarefa-objetivo').value.trim(),
      tipo: $('tarefa-tipo').value.trim(),
      agenteResponsavel: $('tarefa-agente').value,
      dominio: $('tarefa-dominio').value.trim(),
      prioridade: $('tarefa-prioridade').value,
      estimativaHoras: $('tarefa-estimativa').value ? Number($('tarefa-estimativa').value) : undefined,
      dataLimite: $('tarefa-data-limite').value || undefined,
      dependencias: ($('tarefa-dependencias').value || '').split('\n').map(s => s.trim()).filter(s => s),
      criteriosAceitacao: $('tarefa-criterios').value.split('\n').map(s => s.trim()).filter(s => s),
      arquivosPermitidos: ($('tarefa-arquivos-esperados').value || '').split('\n').map(s => s.trim()).filter(s => s),
      contextoNecessario: ($('tarefa-contexto').value || '').split('\n').map(s => s.trim()).filter(s => s),
      contratosObrigatorios: $('tarefa-contratos').value.split(',').map(s => s.trim()).filter(s => s),
      tags: ($('tarefa-tags').value || '').split(',').map(s => s.trim()).filter(s => s)
    };
    if (!dados.titulo || !dados.objetivo || !dados.agenteResponsavel || !dados.dominio) {
      showToast('Campos marcados com * são obrigatórios', 'erro');
      restoreButton(btn);
      return;
    }
    try {
      let res;
      if (id) {
        res = await api.atualizarTarefa(id, dados);
      } else {
        res = await api.criarTarefa(dados);
      }
      if (res.sucesso) {
        showToast('Tarefa salva!', 'sucesso');
        hideModal('modal-tarefa');
        carregarPainel('tarefas');
      } else {
        showToast(res.erro, 'erro');
      }
    } catch (err) {
      showToast(err?.erro || 'Erro ao salvar tarefa', 'erro');
    } finally {
      restoreButton(btn);
    }
  });

$('btn-cancelar-tarefa').addEventListener('click', () => hideModal('modal-tarefa'));

// Agent form handlers
$('form-agente').addEventListener('submit', async function(e) {
  console.log('[form-agente submit] iniciado');
  e.preventDefault();
  const btn = e.submitter || $('form-agente').querySelector('button[type="submit"]');
  setButtonLoading(btn, true);
  const id = $('agente-id').value;
  const dados = coletarDadosAgente();
  console.log('[form-agente submit] dados coletados:', JSON.stringify({
    id: dados.id, nome: dados.nome, funcao: dados.funcao,
    diretoriosPermitidos: dados.diretoriosPermitidos,
    diretoriosProibidos: dados.diretoriosProibidos,
    contratosObrigatorios: dados.contratosObrigatorios,
    ambientesPermitidos: dados.ambientesPermitidos,
    permissoes: dados.permissoes
  }));
  if (!dados.id || !dados.nome || !dados.funcao || !dados.descricao) {
    showToast('Campos marcados com * são obrigatórios', 'erro');
    console.error('[form-agente submit] validação falhou: campos obrigatórios vazios');
    restoreButton(btn);
    return;
  }
  if (dados.diretoriosPermitidos.length === 0) {
    showToast('Selecione pelo menos um diretório permitido', 'erro');
    console.error('[form-agente submit] validação falhou: nenhum diretório permitido selecionado');
    restoreButton(btn);
    return;
  }
  if (dados.contratosObrigatorios.length === 0) {
    showToast('Selecione pelo menos um contrato obrigatório', 'erro');
    console.error('[form-agente submit] validação falhou: nenhum contrato selecionado');
    restoreButton(btn);
    return;
  }
  dados.permissoes = {};
  ['ler','criar','alterar','excluir','executar','testar','revisar','aprovar','implantar'].forEach((p) => {
    dados.permissoes[p] = $(`perm-${p}`).checked;
  });
  console.log('[form-agente submit] permissoes:', JSON.stringify(dados.permissoes));
  console.log('[form-agente submit] chamando API:', id ? 'atualizarAgente' : 'criarAgente');
  try {
    let res;
    if (id) {
      res = await api.atualizarAgente(id, dados);
    } else {
      res = await api.criarAgente(dados);
    }
    console.log('[form-agente submit] resposta API:', JSON.stringify({ sucesso: res.sucesso, erro: res?.erro }));
    if (res.sucesso) {
      showToast('Agente salvo!', 'sucesso');
      hideModal('modal-agente');
      carregarPainel('agentes');
    } else {
      showToast(res.erro, 'erro');
    }
  } catch (err) {
    console.error('[form-agente submit] exceção:', err);
    showToast(err?.erro || err?.message || 'Erro ao salvar agente', 'erro');
  } finally {
    restoreButton(btn);
  }
});

$('btn-cancelar-agente').addEventListener('click', () => hideModal('modal-agente'));

function coletarDadosAgente() {
  const dados = {
    id: $('agente-id-input').value.trim(),
    nome: $('agente-nome').value.trim(),
    funcao: $('agente-funcao').value.trim(),
    descricao: $('agente-descricao').value.trim(),
    estado: $('agente-estado').value,
    dominio: $('agente-dominio').value,
    diretoriosPermitidos: [...new Set([...coletarCheckboxes('dir-perm'), ...getDirTags('dir-perm')])],
    diretoriosProibidos: [...new Set([...coletarCheckboxes('dir-proib'), ...getDirTags('dir-proib')])],
    contratosObrigatorios: coletarCheckboxes('contrato'),
    ambientesPermitidos: coletarCheckboxes('ambiente'),
    responsabilidades: $('agente-responsabilidades').value.split('\n').map(s => s.trim()).filter(s => s),
    conhecimentos: $('agente-conhecimentos').value.split('\n').map(s => s.trim()).filter(s => s),
    linguagemPreferida: $('agente-linguagem').value.trim() || undefined,
    modelo: $('agente-modelo').value.trim() ? { nome: $('agente-modelo').value.trim() } : undefined,
  };
  console.log('[coletarDadosAgente] dados:', JSON.stringify(dados));
  return dados;
}

function coletarCheckboxes(namePrefix) {
  const checked = Array.from(document.querySelectorAll(`input[name="${namePrefix}"]:checked`)).map((el) => el.value);
  console.log('[coletarCheckboxes]', namePrefix, '->', checked);
  return checked;
}

function clearDirTags(prefix) {
  const container = $(`${prefix}-tags`);
  if (container) container.innerHTML = '';
}

function getDirTags(prefix) {
  const container = $(`${prefix}-tags`);
  if (!container) return [];
  return Array.from(container.querySelectorAll('.dir-tag')).map(el => el.dataset.path || '');
}

function addDirTag(prefix, path) {
  const container = $(`${prefix}-tags`);
  if (!container) return;
  path = (path || '').trim();
  if (!path) return;
  if (Array.from(container.querySelectorAll('.dir-tag')).some(el => (el.dataset.path || '') === path)) return;
  const tag = document.createElement('span');
  tag.className = 'dir-tag';
  tag.dataset.path = path;
  tag.innerHTML = `${escapeHtml(path)} <button type="button" class="dir-tag-remove">&times;</button>`;
  tag.querySelector('.dir-tag-remove').addEventListener('click', () => tag.remove());
  container.appendChild(tag);
}

function setupDirPicker(prefix) {
  const input = $(`${prefix}-input`);
  const addBtn = $(`${prefix}-add`);
  const browseBtn = $(`${prefix}-browse`);
  if (!input || !addBtn) return;

  const add = () => {
    addDirTag(prefix, input.value);
    input.value = '';
    input.focus();
  };

  addBtn.addEventListener('click', add);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
  });

  if (browseBtn) {
    browseBtn.addEventListener('click', async () => {
      try {
        if (window.showDirectoryPicker) {
          const handle = await window.showDirectoryPicker();
          addDirTag(prefix, handle.name + '/');
        } else {
          showToast('Navegação de pastas não suportada neste navegador. Use o campo ao lado.', 'erro');
        }
      } catch (e) {
        // usuário cancelou
      }
    });
  }
}

setupDirPicker('dir-perm');
setupDirPicker('dir-proib');

// Click outside modal to close
document.addEventListener('click', function(e) {
  if (e.target.classList && e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal').forEach((m) => {
      if (m.style.display === 'flex') m.style.display = 'none';
    });
  }
});

window.showModal = showModal;
window.hideModal = hideModal;
document.addEventListener('DOMContentLoaded', init);

let solicitacaoEditar = null;

const IMPACTOS_DISPONIVEIS = ['Backend', 'Frontend', 'API', 'Banco de Dados', 'Segurança', 'Infraestrutura', 'Documentação', 'Testes', 'Arquitetura', 'Configuração'];

function popularAgentesSelect() {
  const selSolicitante = $('solicitacao-solicitante');
  const selResponsavel = $('solicitacao-responsavel');
  selSolicitante.innerHTML = '';
  selResponsavel.innerHTML = '<option value="">Nenhum (aguardando atribuição)</option>';
  for (const a of estado.agentes) {
    const optS = document.createElement('option');
    optS.value = a.id; optS.textContent = `${a.id} — ${a.nome}`;
    selSolicitante.appendChild(optS);
    const optR = document.createElement('option');
    optR.value = a.id; optR.textContent = `${a.id} — ${a.nome}`;
    selResponsavel.appendChild(optR);
  }
}

function popularTarefasSelect() {
  const selTarefa = $('solicitacao-tarefa-origem');
  selTarefa.innerHTML = '<option value="">Nenhuma</option>';
  for (const t of (estado.tarefas || [])) {
    const opt = document.createElement('option');
    opt.value = t.id; opt.textContent = `${t.id} — ${t.titulo || t.objetivo || ''}`;
    selTarefa.appendChild(opt);
  }
}

function popularImpactosCheckboxes(selected = []) {
  const container = document.getElementById('solicitacao-impactos-cb');
  container.innerHTML = '';
  for (const imp of IMPACTOS_DISPONIVEIS) {
    const wrapper = document.createElement('label');
    wrapper.className = 'form__checkbox';
    wrapper.innerHTML = `<input type="checkbox" name="impacto" value="${escapeAttr(imp)}" ${selected.includes(imp) ? 'checked' : ''}> ${escapeHtml(imp)}`;
    container.appendChild(wrapper);
  }
  $('solicitacao-impactos').value = selected.join('\n');
}

function atualizarImpactosHidden() {
  const checked = Array.from(document.querySelectorAll('#solicitacao-impactos-cb input[name="impacto"]:checked')).map((el) => el.value);
  $('solicitacao-impactos').value = checked.join('\n');
}

window.abrirModalSolicitacao = function(solicitacao = null) {
  solicitacaoEditar = solicitacao;
  const titulo = $( 'titulo-solicitacao');
  popularAgentesSelect();
  popularTarefasSelect();
  popularImpactosCheckboxes(solicitacao ? (solicitacao.impactos || []) : ['Backend', 'Frontend', 'API']);
  if (solicitacao) {
    titulo.textContent = 'Editar Solicitação';
    $('solicitacao-id').value = solicitacao.id;
    $('solicitacao-titulo').value = solicitacao.titulo;
    $('solicitacao-descricao').value = solicitacao.descricao;
    $('solicitacao-solicitante').value = solicitacao.agenteSolicitante.id;
    $('solicitacao-responsavel').value = solicitacao.agenteResponsavel.id || '';
    $('solicitacao-tipo-alvo').value = solicitacao.alvo.tipo;
    $('solicitacao-nome-alvo').value = solicitacao.alvo.nome;
    $('solicitacao-identificador').value = solicitacao.alvo.identificador || '';
    $('solicitacao-localizacao').value = solicitacao.alvo.localizacao || '';
    $('solicitacao-tipo-alteracao').value = solicitacao.alteracao.tipo;
    $('solicitacao-alteracao-descricao').value = solicitacao.alteracao.descricao;
    $('solicitacao-motivo').value = solicitacao.alteracao.motivo;
    $('solicitacao-arquivos').value = (solicitacao.alteracao.arquivosAfetados || []).join('\n');
    popularImpactosCheckboxes(solicitacao.impactos || []);
    $('solicitacao-dependencias').value = (solicitacao.dependencias || []).join('\n');
    $('solicitacao-prioridade').value = solicitacao.prioridade;
    $('solicitacao-status').value = solicitacao.status;
    $('solicitacao-tarefa-origem').value = solicitacao.tarefaOrigem ? solicitacao.tarefaOrigem.id : '';
    $('solicitacao-requer-aprovacao').checked = solicitacao.requerAprovacao;
    $('solicitacao-observacoes').value = solicitacao.observacoes || '';
  } else {
    titulo.textContent = 'Nova Solicitação';
    $('form-solicitacao').reset();
    $('solicitacao-id').value = '';
    $('solicitacao-prioridade').value = 'MEDIA';
    $('solicitacao-tipo-alvo').value = 'CONTRATO_API';
    $('solicitacao-tipo-alteracao').value = 'ADICAO';
    $('solicitacao-status').value = 'PENDENTE';
    $('solicitacao-requer-aprovacao').checked = true;
    popularImpactosCheckboxes(['Backend', 'Frontend', 'API']);
    popularAgentesSelect();
    popularTarefasSelect();
  }
  showModal('modal-solicitacao');
};

window.verSolicitacao = async function(id) {
  try {
    const res = await api.getSolicitacao(id);
    if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
    const s = res.dados;
    const historicoRes = await api.getSolicitacaoHistorico(id);
    const historicos = historicoRes.sucesso ? historicoRes.dados : [];
    let html = `<div style="padding:8px;">
      <h3>${escapeHtml(s.id)} — ${escapeHtml(s.titulo)}</h3>
      <p><strong>Status:</strong> <span class="badge badge--ativo">${escapeHtml(s.status)}</span> | <strong>Prioridade:</strong> ${escapeHtml(s.prioridade)}</p>
      <p><strong>Solicitante:</strong> ${escapeHtml(agenteNomePorId(s.agenteSolicitante?.id))} | <strong>Responsável:</strong> ${escapeHtml(agenteNomePorId(s.agenteResponsavel?.id) || 'Nenhum')}</p>
      <p><strong>Alvo:</strong> ${escapeHtml(s.alvo.tipo)} — ${escapeHtml(s.alvo.nome)}</p>
      ${s.alvo.identificador ? `<p><strong>Identificador:</strong> ${escapeHtml(s.alvo.identificador)}</p>` : ''}
      ${s.alvo.localizacao ? `<p><strong>Localização:</strong> <code>${escapeHtml(s.alvo.localizacao)}</code></p>` : ''}
      <p><strong>Alteração:</strong> ${escapeHtml(s.alteracao.tipo)} — ${escapeHtml(s.alteracao.descricao)}</p>
      <p><strong>Motivo:</strong> ${escapeHtml(s.alteracao.motivo)}</p>
      ${s.alteracao.arquivosAfetados?.length ? `<p><strong>Arquivos Afetados:</strong> ${escapeHtml(s.alteracao.arquivosAfetados.join(', '))}</p>` : ''}
      <p><strong>Impactos:</strong> ${escapeHtml(s.impactos.join(', '))}</p>
      ${s.dependencias?.length ? `<p><strong>Dependências:</strong> ${escapeHtml(s.dependencias.join(', '))}</p>` : ''}
      <p><strong>Requer Aprovação:</strong> ${s.requerAprovacao ? 'Sim' : 'Não'}</p>
      <p><strong>Aprovação:</strong> ${escapeHtml(s.aprovacao.status)} ${s.aprovacao.agenteId ? `(por ${escapeHtml(s.aprovacao.agenteId)})` : ''} ${s.aprovacao.data ? `(${formatDate(s.aprovacao.data)})` : ''}</p>
      ${s.tarefaOrigem ? `<p><strong>Tarefa de Origem:</strong> ${escapeHtml(s.tarefaOrigem.id)}</p>` : ''}
      <p><strong>Criada em:</strong> ${s.datas.criadaEm ? formatDate(s.datas.criadaEm) : '-'}</p>
      <p><strong>Atualizada em:</strong> ${s.datas.atualizadaEm ? formatDate(s.datas.atualizadaEm) : '-'}</p>
      ${s.datas.concluidaEm ? `<p><strong>Concluída em:</strong> ${formatDate(s.datas.concluidaEm)}</p>` : ''}
      ${s.observacoes ? `<p><strong>Observações:</strong> ${escapeHtml(s.observacoes)}</p>` : ''}
    `;
    if (s.requerAprovacao && s.status === 'PENDENTE') {
      html += `<div style="margin-top:16px;padding-top:12px;border-top:1px solid #333;">
        <button class="btn btn--small btn--primario" onclick="aprovarSolicitacao('${escapeAttr(s.id)}')">Aprovar</button>
        <button class="btn btn--small btn--danger" onclick="rejeitarSolicitacao('${escapeAttr(s.id)}')">Rejeitar</button>
      </div>`;
    }
      if (historicos.length > 0) {
      html += `<h4 style="margin-top:16px;">Histórico</h4><ul>`;
      for (const h of historicos) {
        html += `<li><span class="badge badge--ativo">${escapeHtml(h.tipo)}</span> ${h.data ? formatDate(h.data) : ''} ${h.agenteId ? `(por ${escapeHtml(h.agenteId)})` : ''} ${h.observacao ? '- "' + escapeHtml(h.observacao) + '"' : ''}</li>`;
      }
      html += `</ul>`;
    }
    el.innerHTML = '';
    const container = document.createElement('div');
    container.innerHTML = html;
    el.appendChild(container);
    const relacionados = await carregarItensRelacionados('solicitacao', s.id);
    const relEl = document.createElement('div');
    relEl.innerHTML = renderizarSecaoRelacionados(relacionados);
    el.appendChild(relEl);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${escapeHtml(err?.message || err)}</p>`;
  }
};

window.editarSolicitacao = async function(id) {
  try {
    const res = await api.getSolicitacao(id);
    if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
    abrirModalSolicitacao(res.dados);
  } catch (err) {
    showToast(err?.message || err, 'erro');
  }
};

window.excluirSolicitacao = async function(id) {
  if (!confirm(`Excluir solicitação "${id}"? Esta ação não pode ser desfeita.`)) return;
  try {
    const res = await api.excluirSolicitacao(id);
    if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
    showToast('Solicitação excluída.', 'sucesso');
    await renderizarSolicitacoes($('painel-atividade'));
  } catch (err) {
    showToast(err?.message || err, 'erro');
  }
};

window.aprovarSolicitacao = async function(id) {
  showConfirmModal('Aprovar Solicitação', {
    agenteId: { label: 'ID do agente aprovador', placeholder: 'AGENTE-01' },
    observacao: { label: 'Observação (opcional)', type: 'textarea', rows: 2 }
  }, async (data) => {
    try {
      const res = await api.aprovarSolicitacao(id, data.agenteId, data.observacao || null);
      if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
      showToast('Solicitação aprovada.', 'sucesso');
      await renderizarSolicitacoes($('painel-atividade'));
    } catch (err) {
      showToast(err?.message || err, 'erro');
    }
  });
};

window.rejeitarSolicitacao = async function(id) {
  showConfirmModal('Rejeitar Solicitação', {
    agenteId: { label: 'ID do agente rejeitador', placeholder: 'AGENTE-01' },
    motivo: { label: 'Motivo da rejeição', type: 'textarea', rows: 2 }
  }, async (data) => {
    try {
      const res = await api.rejeitarSolicitacao(id, data.agenteId, data.motivo);
      if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
      showToast('Solicitação rejeitada.', 'sucesso');
      await renderizarSolicitacoes($('painel-atividade'));
    } catch (err) {
      showToast(err?.message || err, 'erro');
    }
  });
};

$('form-solicitacao').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = e.submitter || $('form-solicitacao').querySelector('button[type="submit"]');
  setButtonLoading(btn, true);
  atualizarImpactosHidden();
  const id = $('solicitacao-id').value;
  const dados = {
      titulo: $('solicitacao-titulo').value,
      descricao: $('solicitacao-descricao').value,
      agenteSolicitante: { id: $('solicitacao-solicitante').value },
      agenteResponsavel: { id: $('solicitacao-responsavel').value || null },
      alvo: {
        tipo: $('solicitacao-tipo-alvo').value,
        nome: $('solicitacao-nome-alvo').value,
        identificador: $('solicitacao-identificador').value || null,
        localizacao: $('solicitacao-localizacao').value || null
      },
      alteracao: {
        tipo: $('solicitacao-tipo-alteracao').value,
        descricao: $('solicitacao-alteracao-descricao').value,
        motivo: $('solicitacao-motivo').value,
        arquivosAfetados: $('solicitacao-arquivos').value.split('\n').map(a => a.trim()).filter(a => a),
      },
      impactos: $('solicitacao-impactos').value.split('\n').map(i => i.trim()).filter(i => i),
      dependencias: $('solicitacao-dependencias').value.split('\n').map(d => d.trim()).filter(d => d),
      prioridade: $('solicitacao-prioridade').value,
      status: $('solicitacao-status').value,
      requerAprovacao: $('solicitacao-requer-aprovacao').checked,
      tarefaOrigem: $('solicitacao-tarefa-origem').value ? { id: $('solicitacao-tarefa-origem').value } : null,
      observacoes: $('solicitacao-observacoes').value || null
    };
  try {
    let res;
    if (id) {
      res = await api.atualizarSolicitacao(id, dados);
    } else {
      res = await api.criarSolicitacao(dados);
    }
    if (!res.sucesso) { showToast(res.erro, 'erro'); restoreButton(btn); return; }
    showToast(id ? 'Solicitação atualizada.' : 'Solicitação criada.', 'sucesso');
    hideModal('modal-solicitacao');
    await renderizarSolicitacoes($('painel-atividade'));
  } catch (err) {
    showToast(err?.message || err, 'erro');
  } finally {
    restoreButton(btn);
  }
});

window.gerarPromptTarefa = async function(tarefaId) {
  try {
    const tarefaRes = await api.obterTarefa(tarefaId);
    if (!tarefaRes.sucesso || !tarefaRes.dados) {
      showToast('Tarefa não encontrada', 'erro');
      return;
    }
    const tarefa = tarefaRes.dados;
    const agentesRes = await api.getAgentes();
    const agentesLista = agentesRes.sucesso ? (Array.isArray(agentesRes.dados) ? agentesRes.dados : agentesRes.dados.agentes || []) : [];
    const agente = agentesLista.find(a => a.id === tarefa.agenteResponsavel);
    const contratosRes = await api.getContratos();
    const contratosLista = contratosRes.sucesso ? (contratosRes.dados.contratos || []) : [];
    const contratos = contratosLista.filter(c => (tarefa.contratosObrigatorios || []).includes(c.id));
    const projeto = estado.projetoAtual;
    const caminhoProjeto = projeto?.caminhoRaiz || '';
    const dominio = tarefa.dominio || 'geral';
    const pastas = {
      frontend: joinPath(caminhoProjeto, 'frontend'),
      backend: joinPath(caminhoProjeto, 'backend'),
      banco: joinPath(caminhoProjeto, 'banco'),
      android: joinPath(caminhoProjeto, 'android'),
      docs: joinPath(caminhoProjeto, 'docs'),
      infraestrutura: joinPath(caminhoProjeto, 'infraestrutura'),
      implantacao: joinPath(caminhoProjeto, 'implantacao'),
      testes: joinPath(caminhoProjeto, 'testes')
    };
    const pastaTrabalho = pastas[dominio] || caminhoProjeto;
    const promptContexto = `Projeto: ${projeto?.nome || 'N/A'}
Descrição: ${projeto?.descricao || 'N/A'}
Versão: ${projeto?.config?.versao || '1.0.0'}
Ambiente: ${projeto?.config?.ambiente || 'desenvolvimento'}
Idioma: ${projeto?.config?.idioma || 'pt-BR'}
Fuso Horário: ${projeto?.config?.fusoHorario || 'America/Sao_Paulo'}
Proprietário: ${projeto?.config?.proprietario?.nome || 'N/A'} (${projeto?.config?.proprietario?.tipo || 'humano'})
Objetivos:
${(projeto?.config?.objetivos || []).map(o => '- ' + o).join('\n') || '- N/A'}
Escopo Incluído:
${(projeto?.config?.escopo?.incluso || []).map(e => '- ' + e).join('\n') || '- N/A'}
Escopo Excluído:
${(projeto?.config?.escopo?.excluido || []).map(e => '- ' + e).join('\n') || '- N/A'}`;
    const promptTarefa = `Tarefa: ${tarefa.titulo}
Objetivo: ${tarefa.objetivo || ''}
Tipo: ${tarefa.tipo || 'desenvolvimento'}
Prioridade: ${tarefa.prioridade || 'media'}
Estimativa: ${tarefa.estimativaHoras ? tarefa.estimativaHoras + 'h' : 'N/A'}
Data Limite: ${tarefa.dataLimite || 'N/A'}
Dependências: ${(tarefa.dependencias || []).join(', ') || 'N/A'}
Tags: ${(tarefa.tags || []).join(', ') || 'N/A'}
Critérios de Aceitação:
${(tarefa.criteriosAceitacao || []).map(c => '- ' + c).join('\n') || '- N/A'}
Arquivos Esperados:
${(tarefa.arquivosPermitidos || []).map(f => '- ' + f).join('\n') || '- N/A'}`;
    const promptContratos = contratos.map(c => `- ${c.nome} (${c.id}): ${c.descricao || ''}`).join('\n') || '- Nenhum contrato específico';
    const promptCaminhos = `Pasta do projeto: ${caminhoProjeto}
Pasta de trabalho: ${pastaTrabalho}
Arquivos esperados: ${(tarefa.arquivosPermitidos || []).join(', ') || 'definidos pelo agente'}
Documentação: ${joinPath(pastaTrabalho, 'docs')}
Handoffs: ${joinPath(caminhoProjeto, '.ia', 'handoffs')}`;
    const instrucoes = `REGRAS DE COMPORTAMENTO NO AGENTMAP:
1. NÃO execute ações proativas sem solicitação. Apenas execute o que for solicitado.
2. NÃO faça suposições. Se algo não estiver claro, questione antes de agir.
3. NÃO use ferramentas irrelevantes para a tarefa atual.
4. SEMPRE valide se o caminho/arquivo pertence ao projeto antes de manipular.
5. SEMPRE registre auditoria das ações realizadas.
6. SEMPRE crie handoffs ao entregar trabalho para outro agente.
7. NÃO exclua ou altere arquivos fora da sua pasta de trabalho.
8. NÃO compartilhe dados sensíveis (senhas, tokens, chaves) em documentos ou handoffs.
9. SEMPRE siga os contratos do projeto antes de implementar.
10. NÃO use ferramentas de execução (executar, implantar) sem aprovação explícita.

COMO USAR AS FERRAMENTAS MCP:
As ferramentas são chamadas pelo nome exato abaixo. Todas requerem projeto aberto.

GERENCIAR PROJETO:
- agentmap_projetos_listar: lista projetos
- agentmap_projetos_abrir {caminhoOuId}: abre projeto
- agentmap_projetos_atual: retorna projeto atual
- agentmap_projetos_fechar {id}: fecha projeto
- agentmap_integridade_verificar: verifica integridade

GERENCIAR TAREFAS:
- agentmap_tarefas_listar: lista tarefas
- agentmap_tarefas_obter {id}: obtém tarefa
- agentmap_tarefas_criar {dados}: cria tarefa (campos: titulo, objetivo, tipo, agenteResponsavel, dominio, prioridade, criteriosAceitacao, contratosObrigatorios, dependencias, arquivosPermitidos, contextoNecessario, estimativaHoras, dataLimite, tags)
- agentmap_tarefas_atualizar {id, ...dados}: atualiza tarefa
- agentmap_tarefas_alterar_estado {id, novoEstado}: altera estado (RASCUNHO|PLANEJADA|PRONTA|EM_EXECUCAO|EM_TESTE|EM_REVISAO|AGUARDANDO_APROVACAO|BLOQUEADA|CONCLUIDA)
- agentmap_tarefas_excluir {id}: exclui tarefa

GERENCIAR AGENTES:
- agentmap_agentes_listar: lista agentes
- agentmap_agentes_obter {id}: obtém agente com perfil
- agentmap_agentes_criar {dados}: cria agente (campos: id, nome, funcao, descricao, estado, dominio, diretoriosPermitidos, diretoriosProibidos, contratosObrigatorios, ambientesPermitidos, responsabilidades, conhecimentos, permissoes, linguagemPreferida, modelo)
- agentmap_agentes_atualizar {id, ...dados}: atualiza agente
- agentmap_agentes_excluir {id}: exclui agente

GERENCIAR ARQUIVOS:
- agentmap_arquivos_listar {caminho}: lista arquivos em diretório
- agentmap_arquivos_ler {caminho}: lê conteúdo de arquivo
- agentmap_arquivos_excluir {caminho}: exclui arquivo ou diretório (com backup)
IMPORTANTE: Use caminhos relativos ao projeto. NUNCA use caminhos absolutos ou ../ para fora do projeto.

GERENCIAR CONTRATOS:
- Use os arquivos JSON em .ia/contratos/ para consultar regras.
- NÃO implemente nada que viole os contratos.

COMUNICAÇÃO ENTRE AGENTES:
- agentmap_handoffs_listar: lista handoffs
- agentmap_handoffs_obter {id}: obtém handoff
- agentmap_handoffs_criar {dados}: cria handoff (campos: de, para, tipo, titulo, descricao, arquivos, contexto)
- agentmap_handoffs_atualizar {id, ...dados}: atualiza handoff
- agentmap_handoffs_excluir {id}: exclui handoff

SOLICITAÇÕES DE ALTERAÇÃO:
- agentmap_solicitacoes_listar: lista solicitações
- agentmap_solicitacoes_obter {id}: obtém solicitação
- agentmap_solicitacoes_criar {dados}: cria solicitação
- agentmap_solicitacoes_atualizar {id, ...dados}: atualiza solicitação
- agentmap_solicitacoes_aprovar {id, agenteId, observacao}: aprova solicitação
- agentmap_solicitacoes_rejeitar {id, agenteId, motivo}: rejeita solicitação
- agentmap_solicitacoes_cancelar {id}: cancela solicitação
- agentmap_solicitacoes_excluir {id}: exclui solicitação
- agentmap_solicitacoes_historico {id}: lista histórico

OUTRAS FERRAMENTAS:
- agentmap_auditoria_listar: lista eventos de auditoria
- agentmap_workflows_iniciar_trabalho {tarefaId, agenteId}: inicia workflow
- agentmap_workflows_finalizar_trabalho {tarefaId, resultado}: finaliza workflow
- agentmap_workflows_consultar_pendencias: consulta pendências
- agentmap_workflows_obter_mapa_projeto: obtém mapa do projeto
- agentmap_decisoes_listar/obter/criar/atualizar/excluir: decisões
- agentmap_bloqueios_listar/obter/criar/resolver/excluir: bloqueios
- agentmap_pendencias_listar/obter/criar/atualizar/resolver/excluir: pendências
- agentmap_riscos_listar/obter/criar/atualizar/excluir: riscos

ANTES DE INICIAR:
1. Use agentmap_projetos_abrir ou confirme projeto aberto.
2. Use agentmap_tarefas_obter para entender a tarefa completa.
3. Use agentmap_agentes_obter para entender seu permissões e restrições.
4. Leia os contratos em .ia/contratos/.
5. Verifique handoffs pendentes.

DURANTE A EXECUÇÃO:
1. Trabalhe APENAS na sua pasta de trabalho: ${pastaTrabalho}
2. Use agentmap_arquivos_ler para ler arquivos existentes.
3. Use agentmap_arquivos_listar para explorar estrutura.
4. Documente decisões importantes.
5. Se encontrar bloqueio, crie um handoff ou solicitação.

AO FINALIZAR:
1. Crie documento de conclusão em ${joinPath(caminhoProjeto, '.ia', 'documentos')}
2. Crie handoff em ${joinPath(caminhoProjeto, '.ia', 'handoffs')} se outro agente precisar continuar.
3. Atualize a tarefa via agentmap_tarefas_atualizar com resultado e arquivos alterados.
4. Registre evento em ${joinPath(caminhoProjeto, '.ia', 'auditoria', 'eventos.json')}
    5. NÃO feche o projeto nem encerre a sessão.`;

    const guideText = await fetchGuide();

    const promptFinal = `Você é o agente responsável pela tarefa abaixo.

${promptContexto}

TAREFA:
${promptTarefa}

CONTRATOS:
${promptContratos}

CAMINHOS:
${promptCaminhos}

${instrucoes}

${guideText}

FORMATO DE RESPOSTA:
- Reporte: "Tarefa concluída: [resumo]"
- Arquivos alterados: [lista]
- Próximos passos: [se houver]`;
    $('prompt-contexto').value = promptContexto;
    $('prompt-tarefa').value = promptTarefa;
    $('prompt-contratos').value = promptContratos;
    $('prompt-caminhos').value = promptCaminhos;
    $('prompt-final').value = promptFinal;
    $('prompt-titulo').textContent = `Prompt - ${tarefa.titulo}`;
    showModal('modal-prompt');
  } catch (err) {
    showToast(err?.message || err, 'erro');
  }
};

window.gerarPromptAgente = async function(agenteId) {
  try {
    const agentesRes = await api.getAgentes();
    if (!agentesRes.sucesso || !agentesRes.dados) {
      showToast('Agentes não encontrados', 'erro');
      return;
    }
    const agentesLista = agentesRes.sucesso ? (Array.isArray(agentesRes.dados) ? agentesRes.dados : agentesRes.dados.agentes || []) : [];
    const agente = agentesLista.find(a => a.id === agenteId);
    if (!agente) {
      showToast('Agente não encontrado', 'erro');
      return;
    }
    const contratosRes = await api.getContratos();
    const contratosLista = contratosRes.sucesso ? (contratosRes.dados.contratos || []) : [];
    const contratos = contratosLista.filter(c => (agente.contratosObrigatorios || []).includes(c.id));
    const projeto = estado.projetoAtual;
    const caminhoProjeto = projeto?.caminhoRaiz || '';
    const dominio = agente.dominio || 'geral';
    const pastas = {
      frontend: joinPath(caminhoProjeto, 'frontend'),
      backend: joinPath(caminhoProjeto, 'backend'),
      banco: joinPath(caminhoProjeto, 'banco'),
      android: joinPath(caminhoProjeto, 'android'),
      docs: joinPath(caminhoProjeto, 'docs'),
      infraestrutura: joinPath(caminhoProjeto, 'infraestrutura'),
      implantacao: joinPath(caminhoProjeto, 'implantacao'),
      testes: joinPath(caminhoProjeto, 'testes')
    };
    const pastaTrabalho = pastas[dominio] || caminhoProjeto;
    const promptContexto = `Projeto: ${projeto?.nome || 'N/A'}
Descrição: ${projeto?.descricao || 'N/A'}
Versão: ${projeto?.config?.versao || '1.0.0'}
Ambiente: ${projeto?.config?.ambiente || 'desenvolvimento'}
Idioma: ${projeto?.config?.idioma || 'pt-BR'}
Fuso Horário: ${projeto?.config?.fusoHorario || 'America/Sao_Paulo'}
Proprietário: ${projeto?.config?.proprietario?.nome || 'N/A'} (${projeto?.config?.proprietario?.tipo || 'humano'})
Objetivos:
${(projeto?.config?.objetivos || []).map(o => '- ' + o).join('\n') || '- N/A'}
Escopo Incluído:
${(projeto?.config?.escopo?.incluso || []).map(e => '- ' + e).join('\n') || '- N/A'}
Escopo Excluído:
${(projeto?.config?.escopo?.excluido || []).map(e => '- ' + e).join('\n') || '- N/A'}`;
    const promptAgente = `Agente: ${agente.nome}
Função: ${agente.funcao || ''}
Estado: ${agente.estado || 'ativo'}
Domínio: ${agente.dominio || 'geral'}
Descrição: ${agente.descricao || ''}
Linguagem Preferida: ${agente.linguagemPreferida || 'N/A'}
Modelo: ${agente.modelo?.nome || 'N/A'}
Diretórios permitidos: ${(agente.diretoriosPermitidos || []).join(', ') || 'todos'}
Diretórios proibidos: ${(agente.diretoriosProibidos || []).join(', ') || 'nenhum'}
Ambientes: ${(agente.ambientesPermitidos || []).join(', ') || 'todos'}
Responsabilidades:
${(agente.responsabilidades || []).map(r => '- ' + r).join('\n') || '- N/A'}
Conhecimentos:
${(agente.conhecimentos || []).map(c => '- ' + c).join('\n') || '- N/A'}`;
    const promptContratos = contratos.map(c => `- ${c.nome} (${c.id}): ${c.descricao || ''}`).join('\n') || '- Nenhum contrato específico';
    const promptCaminhos = `Pasta do projeto: ${caminhoProjeto}
Pasta de trabalho: ${pastaTrabalho}
Conhecimento: ${joinPath(caminhoProjeto, '.ia', 'agentes', agente.nome, 'conhecimento')}
Recursos: ${joinPath(caminhoProjeto, '.ia', 'agentes', agente.nome, 'recursos')}`;
    const instrucoesAgente = `REGRAS DE COMPORTAMENTO NO AGENTMAP:
1. NÃO execute ações proativas sem solicitação. Apenas execute o que for solicitado.
2. NÃO faça suposições. Se algo não estiver claro, questione antes de agir.
3. NÃO use ferramentas irrelevantes para a tarefa atual.
4. SEMPRE valide se o caminho/arquivo pertence ao projeto antes de manipular.
5. SEMPRE registre auditoria das ações realizadas.
6. SEMPRE crie handoffs ao entregar trabalho para outro agente.
7. NÃO exclua ou altere arquivos fora da sua pasta de trabalho.
8. NÃO compartilhe dados sensíveis (senhas, tokens, chaves) em documentos ou handoffs.
9. SEMPRE siga os contratos do projeto antes de implementar.
10. NÃO use ferramentas de execução (executar, implantar) sem aprovação explícita.

COMO USAR AS FERRAMENTAS MCP:
As ferramentas são chamadas pelo nome exato abaixo. Todas requerem projeto aberto.

GERENCIAR PROJETO:
- agentmap_projetos_listar: lista projetos
- agentmap_projetos_abrir {caminhoOuId}: abre projeto
- agentmap_projetos_atual: retorna projeto atual
- agentmap_projetos_fechar {id}: fecha projeto
- agentmap_integridade_verificar: verifica integridade

GERENCIAR TAREFAS:
- agentmap_tarefas_listar: lista tarefas
- agentmap_tarefas_obter {id}: obtém tarefa
- agentmap_tarefas_criar {dados}: cria tarefa (campos: titulo, objetivo, tipo, agenteResponsavel, dominio, prioridade, criteriosAceitacao, contratosObrigatorios, dependencias, arquivosPermitidos, contextoNecessario, estimativaHoras, dataLimite, tags)
- agentmap_tarefas_atualizar {id, ...dados}: atualiza tarefa
- agentmap_tarefas_alterar_estado {id, novoEstado}: altera estado (RASCUNHO|PLANEJADA|PRONTA|EM_EXECUCAO|EM_TESTE|EM_REVISAO|AGUARDANDO_APROVACAO|BLOQUEADA|CONCLUIDA)
- agentmap_tarefas_excluir {id}: exclui tarefa

GERENCIAR AGENTES:
- agentmap_agentes_listar: lista agentes
- agentmap_agentes_obter {id}: obtém agente com perfil
- agentmap_agentes_criar {dados}: cria agente (campos: id, nome, funcao, descricao, estado, dominio, diretoriosPermitidos, diretoriosProibidos, contratosObrigatorios, ambientesPermitidos, responsabilidades, conhecimentos, permissoes, linguagemPreferida, modelo)
- agentmap_agentes_atualizar {id, ...dados}: atualiza agente
- agentmap_agentes_excluir {id}: exclui agente

GERENCIAR ARQUIVOS:
- agentmap_arquivos_listar {caminho}: lista arquivos em diretório
- agentmap_arquivos_ler {caminho}: lê conteúdo de arquivo
- agentmap_arquivos_excluir {caminho}: exclui arquivo ou diretório (com backup)
IMPORTANTE: Use caminhos relativos ao projeto. NUNCA use caminhos absolutos ou ../ para fora do projeto.

GERENCIAR CONTRATOS:
- Use os arquivos JSON em .ia/contratos/ para consultar regras.
- NÃO implemente nada que viole os contratos.

COMUNICAÇÃO ENTRE AGENTES:
- agentmap_handoffs_listar: lista handoffs
- agentmap_handoffs_obter {id}: obtém handoff
- agentmap_handoffs_criar {dados}: cria handoff (campos: de, para, tipo, titulo, descricao, arquivos, contexto)
- agentmap_handoffs_atualizar {id, ...dados}: atualiza handoff
- agentmap_handoffs_excluir {id}: exclui handoff

SOLICITAÇÕES DE ALTERAÇÃO:
- agentmap_solicitacoes_listar: lista solicitações
- agentmap_solicitacoes_obter {id}: obtém solicitação
- agentmap_solicitacoes_criar {dados}: cria solicitação
- agentmap_solicitacoes_atualizar {id, ...dados}: atualiza solicitação
- agentmap_solicitacoes_aprovar {id, agenteId, observacao}: aprova solicitação
- agentmap_solicitacoes_rejeitar {id, agenteId, motivo}: rejeita solicitação
- agentmap_solicitacoes_cancelar {id}: cancela solicitação
- agentmap_solicitacoes_excluir {id}: exclui solicitação
- agentmap_solicitacoes_historico {id}: lista histórico

OUTRAS FERRAMENTAS:
- agentmap_auditoria_listar: lista eventos de auditoria
- agentmap_workflows_iniciar_trabalho {tarefaId, agenteId}: inicia workflow
- agentmap_workflows_finalizar_trabalho {tarefaId, resultado}: finaliza workflow
- agentmap_workflows_consultar_pendencias: consulta pendências
- agentmap_workflows_obter_mapa_projeto: obtém mapa do projeto
- agentmap_decisoes_listar/obter/criar/atualizar/excluir: decisões
- agentmap_bloqueios_listar/obter/criar/resolver/excluir: bloqueios
- agentmap_pendencias_listar/obter/criar/atualizar/resolver/excluir: pendências
- agentmap_riscos_listar/obter/criar/atualizar/excluir: riscos

ANTES DE INICIAR:
1. Confirme que o projeto está aberto.
2. Leia seu perfil e restrições.
3. Verifique handoffs e documentos pendentes.
4. Leia os contratos do projeto.

DURANTE A EXECUÇÃO:
1. Trabalhe APENAS na sua pasta de trabalho: ${pastaTrabalho}
2. Use agentmap_arquivos_ler para ler arquivos existentes.
3. Documente decisões importantes.
4. Se encontrar bloqueio, crie um handoff ou solicitação.

AO FINALIZAR:
1. Crie documento de conclusão em ${joinPath(caminhoProjeto, '.ia', 'documentos')}
2. Crie handoff em ${joinPath(caminhoProjeto, '.ia', 'handoffs')} se outro agente precisar continuar.
3. Atualize sua tarefa via agentmap_tarefas_atualizar com resultado e arquivos alterados.
4. Registre evento em ${joinPath(caminhoProjeto, '.ia', 'auditoria', 'eventos.json')}
    5. NÃO feche o projeto nem encerre a sessão.`;

    const guideText = await fetchGuide();

    const promptFinal = `Você é o agente ${agente.nome} do projeto ${projeto?.nome || 'N/A'}.

${promptContexto}

AGENTE:
${promptAgente}

CONTRATOS:
${promptContratos}

CAMINHOS:
${promptCaminhos}

${instrucoesAgente}

${guideText}

FORMATO DE RESPOSTA:
- Reporte: "Agente ${agente.nome} pronto para executar tarefas"
- Crie handoffs quando necessário em: ${joinPath(caminhoProjeto, '.ia', 'handoffs')}`;
    $('prompt-contexto').value = promptContexto;
    $('prompt-tarefa').value = promptAgente;
    $('prompt-contratos').value = promptContratos;
    $('prompt-caminhos').value = promptCaminhos;
    $('prompt-final').value = promptFinal;
    $('prompt-titulo').textContent = `Prompt - ${escapeHtml(agente.nome)}`;
    showModal('modal-prompt');
  } catch (err) {
    showToast(err?.message || err, 'erro');
  }
};

document.getElementById('btn-copiar-prompt').addEventListener('click', copiarPrompt);
document.getElementById('btn-copiar-prompt-2').addEventListener('click', copiarPrompt);

function copiarPrompt() {
  const promptText = $('prompt-final').value;
  if (!promptText) {
    showToast('Nenhum prompt para copiar', 'erro');
    return;
  }
  navigator.clipboard.writeText(promptText).then(() => {
    showToast('Prompt copiado para a área de transferência!', 'sucesso');
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = promptText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Prompt copiado!', 'sucesso');
  });
}

const impactoCheckboxContainer = document.getElementById('solicitacao-impactos-cb');
if (impactoCheckboxContainer) {
  impactoCheckboxContainer.addEventListener('change', atualizarImpactosHidden);
}

async function limparTemp() {
  const modal = document.getElementById('modal-limpeza');
  const corpo = document.getElementById('limpeza-corpo');
  if (!modal || !corpo) return;

  try {
    const res = await api.post('/temp/limpar', { olderThanDays: 7 });
    if (res.sucesso) {
      const dados = res.dados || {};
      const lista = (dados.removed || []).map((item) => `• ${escapeHtml(item)}`).join('<br>');
      const erros = (dados.errors || []).map((item) => `• ${escapeHtml(item)}`).join('<br>');
      corpo.innerHTML = `
        <p><strong>Arquivos removidos:</strong> ${dados.removed?.length || 0}</p>
        <p><strong>Espaço liberado:</strong> ${escapeHtml(dados.tamanhoLiberadoFormatado || '-')}</p>
        ${lista ? `<div style="margin-top:8px; max-height:200px; overflow:auto; background:rgba(0,0,0,0.2); padding:8px; border-radius:6px;">${lista}</div>` : ''}
        ${erros ? `<p style="margin-top:8px; color:#ff9e9e;">Erros:<br>${erros}</p>` : ''}
      `;
    } else {
      corpo.innerHTML = `<p style="color:#ff9e9e;">Erro: ${escapeHtml(res.erro || 'Falha ao limpar temporários')}</p>`;
    }
  } catch (err) {
    corpo.innerHTML = `<p style="color:#ff9e9e;">Erro: ${escapeHtml(err?.message || err)}</p>`;
  } finally {
    showModal('modal-limpeza');
  }
}

const btnLimparTemp = document.getElementById('btn-limpar-temp');
if (btnLimparTemp) {
  btnLimparTemp.addEventListener('click', limparTemp);
}
