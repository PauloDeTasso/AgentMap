import { api } from './api.js';

let estado = {
  projetoAtual: null,
  agentes: [],
  tarefas: [],
  arquivos: [],
  settings: null,
  opcoesAgente: { diretorios: [], contratos: [], ambientes: [] },
  fileServiceCache: new Map(),
  solicitacoes: [],
  filtroAgenteSolicitacoes: { agenteId: null, tipo: 'todos' },
};

let projConfigEdit = {};

function $(id) { return document.getElementById(id); }

function showModal(id) { $(id).style.display = 'flex'; }
function hideModal(id) { $(id).style.display = 'none'; }

function atualizarStatus() {
  const statusEl = $('status-api');
  api.getStatus().then(() => {
    statusEl.textContent = '🟢 Conectado';
    statusEl.style.color = '#27ae60';
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
    nomeEl.textContent = estado.projetoAtual.nome || estado.projetoAtual.nome;
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
  await atualizarStatus();
  await carregarSettings();
  await carregarProjetoAtual();
  renderizarProjetoAtual();
  setupEventListeners();
}

async function carregarSettings() {
  try {
    const res = await api.getSettings();
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
    showToast('Erro ao carregar configurações', 'erro');
  }
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
  try {
    const res = await api.getProjetoAtual();
    if (res.sucesso && res.dados) {
      estado.projetoAtual = res.dados;
      const cfgRes = await api.getConfiguracao(res.dados.id);
      if (cfgRes.sucesso && cfgRes.dados) {
        estado.projetoAtual.config = cfgRes.dados;
      }
      await carregarAgentes();
      await carregarTarefas();
      await carregarOpcoesAgente();
      renderizarDashboard();
    } else {
      estado.projetoAtual = null;
    }
  } catch (err) {
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
  $('btn-criar-projeto').addEventListener('click', () => showModal('modal-novo-projeto'));
  $('btn-criar-projeto-inicial').addEventListener('click', () => showModal('modal-novo-projeto'));
  $('btn-abrir-projeto').addEventListener('click', () => showModal('modal-abrir-projeto'));
  $('btn-abrir-projeto-inicial').addEventListener('click', () => showModal('modal-abrir-projeto'));
  $('btn-fechar-projeto').addEventListener('click', async () => {
    if (estado.projetoAtual?.id) {
      try { await api.fecharProjeto(estado.projetoAtual.id); } catch {}
    }
    estado.projetoAtual = null;
    estado.agentes = [];
    estado.tarefas = [];
    estado.arquivos = [];
    $('main-content').innerHTML = '<div class="card"><h2 class="card__titulo">Bem-vindo</h2><p class="card__texto">Nenhum projeto aberto. Crie ou abra um projeto para começar.</p><div class="card__actions"><button class="btn btn--primario" id="btn-criar-projeto-inicial">Criar Novo Projeto</button></div></div>';
    document.getElementById('btn-criar-projeto-inicial').addEventListener('click', () => showModal('modal-novo-projeto'));
    renderizarProjetoAtual();
  });

  $('form-novo-projeto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = $('nome-projeto').value.trim();
    const caminhoParental = $('caminho-parental').value.trim();
    const descricao = $('descricao-projeto').value.trim();
    if (!nome || !caminhoParental) return;
    const editId = $('form-novo-projeto').dataset.editId;
    try {
      let res;
      if (editId) {
        res = await api.atualizarConfiguracao(editId, { ...projConfigEdit, nome, descricao });
        if (res.sucesso) {
          showToast(`Projeto '${nome}' atualizado!`, 'sucesso');
          delete $('form-novo-projeto').dataset.editId;
        }
      } else {
        res = await api.criarProjeto(nome, caminhoParental, descricao);
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
    }
  });

  $('form-abrir-projeto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const caminho = $('caminho-abrir').value.trim();
    if (!caminho) return;
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
    }
  });

  $('btn-cancelar-novo').addEventListener('click', () => hideModal('modal-novo-projeto'));
  $('btn-cancelar-abrir').addEventListener('click', () => hideModal('modal-abrir-projeto'));
  $('btn-cancelar-editor').addEventListener('click', () => hideModal('modal-editor'));

  // Folder browser for Abrir Projeto
  $('btn-procurar-abrir').addEventListener('click', () => {
    const picker = $('file-folder-picker');
    picker.value = '';
    picker.click();
  });
  $('file-folder-picker').addEventListener('change', () => {
    const files = $('file-folder-picker').files;
    if (!files || files.length === 0) return;
    const firstPath = files[0].webkitRelativePath || '';
    const folderName = firstPath.split(/[\\/]/)[0] || '';
    const baseDir = estado.settings?.diretorioProjetosDefault || '';
    if (baseDir && folderName) {
      $('caminho-abrir').value = baseDir + '\\' + folderName;
    } else if (folderName) {
      $('caminho-abrir').value = folderName;
    }
  });

  $('btn-salvar-arquivo').addEventListener('click', salvarArquivo);
  $('btn-confirmar-salvar').addEventListener('click', salvarArquivo);
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
       <li class="painel-lateral__item" data-painel="tarefas-view">📋 Tarefas (lista)</li>
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
    </ul>
  `;

  const principal = document.createElement('div');
  principal.className = 'painel-principal';
  principal.id = 'painel-atividade';
  principal.innerHTML = '<p style="color:var(--text-muted);">Selecione uma opção ao lado.</p>';

  lateral.querySelectorAll('[data-painel]').forEach((item) => {
    item.addEventListener('click', () => {
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
    case 'dashboard': await renderizarDashboardCoordenacao(el); break;
    case 'resultados': await renderizarResultados(el); break;
    case 'artefatos': await renderizarArtefatos(el); break;
    case 'handoffs': await renderizarHandoffs(el); break;
    case 'validacoes': await renderizarValidacoes(el); break;
    case 'pendencias': await renderizarPendencias(el); break;
    case 'conflitos': await renderizarConflitos(el); break;
    case 'reservas': await renderizarReservas(el); break;
    case 'decisoes': await renderizarDecisoes(el); break;
    case 'dependencias': await renderizarDependencias(el); break;
    case 'responsabilidades': await renderizarResponsabilidades(el); break;
    case 'sessoes': await renderizarSessoes(el); break;
    case 'checkpoints': await renderizarCheckpoints(el); break;
    case 'aprendizados': await renderizarAprendizados(el); break;
    case 'historico': await renderizarHistorico(el); break;
    case 'integridade': await renderizarIntegridade(el); break;
  }
}

async function renderizarProjetos(el) {
  try {
    const res = await api.listarProjetos();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
    const projetos = res.dados;
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">Projetos (${projetos.length})</h3>
      <button class="btn btn--small btn--primario" onclick="showModal('modal-novo-projeto')">+ Novo Projeto</button>
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
      const badge = isAtual ? ' <span class="badge badge--ativo">ATUAL</span>' : '';
      tr.innerHTML = `<td>${p.nome || ''}${badge}</td><td>${caminho}</td>
        <td>
          <button class="btn btn--small" onclick="verProjeto('${p.id}')">Ver</button>
          <button class="btn btn--small" onclick="abrirProjeto('${p.id}')">Abrir</button>
          <button class="btn btn--small" onclick="editarProjeto('${p.id}')">Editar</button>
          <button class="btn btn--small btn--danger" onclick="excluirProjeto('${p.id}', '${(p.nome || '').replace(/'/g, "\\'")}')">Excluir</button>
        </td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
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

window.verProjeto = async function(id) {
  try {
    const projetosRes = await api.listarProjetos();
    if (!projetosRes.sucesso) { showToast(projetosRes.erro, 'erro'); return; }
    const proj = projetosRes.dados.find(p => p.id === id);
    if (!proj) { showToast('Projeto não encontrado', 'erro'); return; }
    const el = document.getElementById('painel-atividade');
    const isAtual = estado.projetoAtual?.id === id;
    const caminho = proj.caminhoRaiz || '';
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">${proj.nome} ${isAtual ? '<span class="badge badge--ativo">ATUAL</span>' : ''}</h3>
      <div>
        <button class="btn btn--small" onclick="abrirProjeto('${proj.id}')">Abrir</button>
        <button class="btn btn--small" onclick="editarProjeto('${proj.id}')">Editar</button>
        <button class="btn btn--small btn--danger" onclick="excluirProjeto('${proj.id}', '${(proj.nome || '').replace(/'/g, "\\'")}')">Excluir</button>
      </div>
    </div>`;
    el.innerHTML += `<p><strong>ID:</strong> ${proj.id}</p>
      <p><strong>Caminho:</strong> ${caminho}<button class="btn btn--small btn--ghost" style="margin-left:8px" data-path="${caminho}" onclick="abrirPastaExplorer(this.getAttribute('data-path'))">📂 Explorar</button></p>
      <p><strong>Ativo:</strong> ${proj.ativo ? '✓' : ''}</p>
      <p><strong>Última abertura:</strong> ${proj.ultimaAbertura || 'nunca'}</p>`;
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
    $('form-novo-projeto').dataset.editId = id;
    $('titulo-projeto').textContent = 'Editar Projeto';
    showModal('modal-novo-projeto');
  } catch (err) {
    showToast(err?.message || 'Erro', 'erro');
  }
};

window.excluirProjeto = async function(id, nome) {
  if (!confirm(`Excluir projeto "${nome}"? Esta ação remove todos os arquivos do projeto e não pode ser revertida.`)) return;
  try {
    const res = await api.removerProjeto(id);
    if (res.sucesso) {
      showToast('Projeto excluído!', 'sucesso');
      // If we deleted the currently open project, reset to welcome screen
      if (estado.projetoAtual && estado.projetoAtual.id === id) {
        estado.projetoAtual = null;
        estado.agentes = [];
        estado.tarefas = [];
        estado.arquivos = [];
        $('main-content').innerHTML = '<div class="card"><h2 class="card__titulo">Bem-vindo</h2><p class="card__texto">Nenhum projeto aberto. Crie ou abra um projeto para começar.</p><div class="card__actions"><button class="btn btn--primario" id="btn-criar-projeto-inicial">Criar Novo Projeto</button></div></div>';
        document.getElementById('btn-criar-projeto-inicial').addEventListener('click', () => showModal('modal-novo-projeto'));
        renderizarProjetoAtual();
      }
      if (typeof carregarPainel === 'function' && document.querySelector('[data-painel="projetos"].painel-lateral__item--ativo')) {
        carregarPainel('projetos');
      } else {
        renderizarProjetos(document.getElementById('painel-atividade') || null);
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
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
      tr.innerHTML = `<td>${a.nome}</td><td>${a.funcao}</td><td><span class="badge badge--${a.estado === 'ativo' ? 'ativo' : 'inativo'}">${a.estado}</span></td>
        <td>
          <button class="btn btn--small" onclick="abrirAgente('${a.id}')">Ver Perfil</button>
          <button class="btn btn--small" onclick="editarAgente('${a.id}')">Editar</button>
          <button class="btn btn--small btn--danger" onclick="excluirAgente('${a.id}')">Excluir</button>
        </td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarTarefas(el) {
  try {
    const res = await api.getTarefas();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
      tr.innerHTML = `<td>${t.id}</td><td>${t.titulo}</td><td><span class="badge badge--${t.estado}">${t.estado}</span></td><td>${t.prioridade}</td><td>${t.agenteResponsavel}</td>
        <td>
          <button class="btn btn--small" onclick="verTarefa('${t.id}')">Ver</button>
          <button class="btn btn--small" onclick="editarTarefa('${t.id}')">Editar</button>
          <button class="btn btn--small" onclick="verContexto('${t.id}')">Contexto</button>
          <button class="btn btn--small btn--danger" onclick="excluirTarefa('${t.id}')">Excluir</button>
        </td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarContratos(el) {
  try {
    const res = await api.getContratos();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
      tr.innerHTML = `<td>${c.id}</td><td>${c.nome}</td><td>${c.versao}</td><td>${c.estado}</td><td>${c.obrigatorio ? '✓' : ''}</td>
        <td>
          <button class="btn btn--small" onclick="verContrato('${c.id}')">Ver</button>
          <button class="btn btn--small" onclick="editarContrato('${c.id}')">Editar</button>
          <button class="btn btn--small btn--danger" onclick="excluirContrato('${c.id}')">Excluir</button>
        </td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarSolicitacoes(el) {
  try {
    const res = await api.getSolicitacoes();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
      <input class="form__input" type="text" id="filtro-agente-id" placeholder="ID do agente (ex: AGENTE-01)" style="max-width:200px;" value="${estado.filtroAgenteSolicitacoes?.agenteId || ''}" oninput="estado.filtroAgenteSolicitacoes={agenteId:this.value||null,tipo:estado.filtroAgenteSolicitacoes?.tipo||'todos'}" />
      <select class="form__input" id="filtro-agente-tipo" style="max-width:160px;" onchange="estado.filtroAgenteSolicitacoes={agenteId:document.getElementById('filtro-agente-id').value||null,tipo:this.value}; renderizarSolicitacoes($('painel-atividade'))">
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
      tr.innerHTML = `<td>${s.id}</td><td>${s.titulo}</td><td>${s.agenteSolicitante.id}</td><td>${s.agenteResponsavel.id || '-'}</td><td><span class="badge badge--${badgeClass}">${s.prioridade}</span></td><td><span class="badge badge--${badgeStatus(s.status)}">${s.status}</span></td><td>${s.aprovacao.status}</td>
        <td>
          <button class="btn btn--small" onclick="verSolicitacao('${s.id}')">Ver</button>
          <button class="btn btn--small" onclick="editarSolicitacao('${s.id}')">Editar</button>
          ${s.status !== 'PENDENTE' ? '<button class="btn btn--small btn--danger" onclick="excluirSolicitacao(\'' + s.id + '\')">Excluir</button>' : ''}
        </td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

let arquivoContexto = null;
let pastaAtual = '.';

async function renderizarArquivos(el) {
  try {
    const res = await api.listarArquivos(pastaAtual);
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
    el.innerHTML = `<div style="margin-bottom:12px;">
      <div class="painel-lateral__titulo">Navegação de Arquivos</div>
      <div style="display:flex;gap:8px;margin-top:8px;align-items:center;">
        <input class="form__input" type="text" id="caminho-pasta" placeholder="Caminho da pasta" value="${pastaAtual}" style="max-width:250px;">
        <button class="btn btn--small" onclick="navegarPasta()">Navegar</button>
        <button class="btn btn--small btn--ghost" onclick="navegarPasta('.')">Raiz</button>
        <button class="btn btn--small btn--success" onclick="showModal('modal-novo-arquivo')"> Novo Arquivo</button>
        <button class="btn btn--small btn--ghost" onclick="abrirPastaExplorer(pastaAtual)">📂 Explorar</button>
      </div>
    </div><ul class="file-list">`;
    for (const f of res.dados) {
      const li = document.createElement('li');
      li.className = `file-list__item file-list__item--${f.tipo}`;
      li.innerHTML = `<span class="file-list__nome">${f.nome}${f.tipo === 'diretorio' ? '/' : ''}</span><span class="file-list__tamanho">${f.tipo === 'arquivo' ? f.tamanho + ' B' : ''}</span>`;
      if (f.tipo === 'diretorio') {
        li.innerHTML += `<button class="btn btn--small" onclick="abrirPasta('${f.caminho}')">Abrir</button>`;
      }
      if (f.tipo === 'arquivo' && (f.extensao === 'json' || f.extensao === 'md' || f.extensao === 'txt')) {
        li.innerHTML += `<button class="btn btn--small" onclick="editarArquivo('${f.caminho}')">Editar</button>`;
      }
      if (f.tipo === 'arquivo') {
        li.innerHTML += `<button class="btn btn--small btn--danger" onclick="excluirArquivo('${f.caminho}')">Excluir</button>`;
      }
      el.querySelector('ul').appendChild(li);
    }
    el.querySelector('ul').innerHTML += '</ul>';
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarEstado(el) {
  try {
    const res = await api.getEstado();
    if (!res.sucesso || !res.dados) { el.innerHTML = `<p class="painel-vazio">${res.erro || 'Nenhum estado'}</p>`; return; }
    const e = res.dados;
    el.innerHTML = `<h3>Estado do Projeto</h3>
      <p><strong>Projeto:</strong> ${e.projetoId || e.nome || ''}</p>
      <p><strong>Estado:</strong> ${e.estado || ''}</p>
      <p><strong>Fase:</strong> ${e.fase || ''}</p>
      <p><strong>Versão:</strong> ${e.versao || ''}</p>
      <p><strong>Agentes ativos:</strong> ${e.agentesAtivos}</p>
      <p><strong>Tarefas ativas:</strong> ${e.tarefasAtivas}</p>
      <p><strong>Tarefas bloqueadas:</strong> ${e.tarefasBloqueadas}</p>
      <p><strong>Testes:</strong> ${e.testes?.aprovados}/${e.testes?.total} aprovados</p>
      <p><strong>Qualidade:</strong> ${e.qualidade?.percentual}% (${e.qualidade?.pendenciasCriticas} críticas)</p>
      <p><strong>Segurança:</strong> ${e.seguranca?.estado} (${e.seguranca?.riscosCriticos} críticos, ${e.seguranca?.riscosAltos} altos)</p>`;
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarAuditoria(el) {
  try {
    const res = await api.getAuditoria();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
    const eventos = res.dados;
    el.innerHTML = `<h3>Auditoria (${eventos.length} eventos)</h3>`;
    if (eventos.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhum evento registrado.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Resultado</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const ev of eventos) {
      const tr = document.createElement('tr');
      const data = new Date(ev.data).toLocaleString('pt-BR');
      const cls = ev.resultado === 'sucesso' ? 'badge--ativo' : ev.resultado === 'falha' ? 'badge--bloqueada' : 'badge--inativo';
      tr.innerHTML = `<td>${data}</td><td>${ev.tipo}</td><td>${ev.descricao}</td><td><span class="badge ${cls}">${ev.resultado}</span></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
       el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarDashboardCoordenacao(el) {
  try {
    const res = await api.getEstadoProjeto();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
        <div class="card"><h4>Reservas</h4><p>${e.residencias.ativas}/${e.residencias.total} ativas</p></div>
        <div class="card"><h4>Marcos</h4><p>${e.checkpoints.recentes} recentes</p></div>
        <div class="card"><h4>Sessões</h4><p>${e.sessoes.ativas}/${e.sessoes.total} ativas</p></div>
        <div class="card"><h4>Aprendizados</h4><p>${e.aprendizados.ativos}/${e.aprendizados.total} ativos</p></div>
        <div class="card" style="grid-column:1/-1;"><h4>🔗 Relacionamentos</h4><p>${(e.tarefas.total + e.solicitacoes.total + e.artefatos.total + e.handoffs.total + e.bloqueios + e.conflitos.total + e.riscos.total + e.validacoes.total + e.residencias.total + e.checkpoints.total + e.sessoes.total + e.aprendizados.total)} entidades com vínculos ativos</p></div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarResultados(el) {
  try {
    const res = await api.getResultados();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
      tr.innerHTML = `<td>${r.id}</td><td>${r.tarefaId}</td><td>${r.agenteId}</td><td>${r.resumo}</td>
        <td><span class="badge badge--ativo">${r.estado}</span></td>
        <td><button class="btn btn--small" onclick="verResultado('${r.id}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarArtefatos(el) {
  try {
    const res = await api.getArtefatos();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
      tr.innerHTML = `<td>${a.id}</td><td>${a.nome}</td><td>${a.tipo}</td><td>${a.agenteId}</td><td>${a.tarefaId || ''}</td>
        <td><span class="badge badge--ativo">${a.estado}</span></td>
        <td><button class="btn btn--small" onclick="verArtefato('${a.id}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarHandoffs(el) {
  try {
    const res = await api.getHandoffs();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
      tr.innerHTML = `<td>${h.id}</td><td>${h.origem}</td><td>${h.destino}</td><td>${h.tarefaId || ''}</td><td>${h.resumo}</td>
        <td><span class="badge ${badgeClass}">${h.estado}</span></td>
        <td><button class="btn btn--small" onclick="verHandoff('${h.id}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarValidacoes(el) {
  try {
    const res = await api.getValidacoes();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
      tr.innerHTML = `<td>${v.id}</td><td>${v.alvoId}</td><td>${v.alvoTipo}</td><td>${v.responsavel}</td>
        <td><span class="badge ${badgeClass}">${v.estado}</span></td>
        <td><button class="btn btn--small" onclick="verValidacao('${v.id}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarPendencias(el) {
  try {
    const res = await api.getPendencias();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
      tr.innerHTML = `<td>${p.id}</td><td>${p.titulo}</td><td>${p.tipo}</td><td>${p.prioridade}</td>
        <td><span class="badge ${badgeClass}">${p.estado}</span></td>
        <td><button class="btn btn--small" onclick="verPendencia('${p.id}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarConflitos(el) {
  try {
    const res = await api.getConflitos();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
      tr.innerHTML = `<td>${c.id}</td><td>${c.titulo}</td><td>${c.tipo}</td><td>${c.severidade}</td>
        <td><span class="badge ${badgeClass}">${c.estado}</span></td>
        <td><button class="btn btn--small" onclick="verConflito('${c.id}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarReservas(el) {
  try {
    const res = await api.getReservas();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
      tr.innerHTML = `<td>${r.id}</td><td>${r.alvo}</td><td>${r.tipoAlvo}</td><td>${r.agenteId}</td>
        <td><span class="badge ${badgeClass}">${r.estado}</span></td>
        <td><button class="btn btn--small" onclick="verReserva('${r.id}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarDecisoes(el) {
  try {
    const res = await api.getDecisoes();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<h3>💭 Decisões (${items.length})</h3>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhuma decisão registrada.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Título</th><th>Estado</th><th>Data</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const d of items) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${d.id}</td><td>${d.titulo}</td><td>${d.estado}</td><td>${d.data}</td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarDependencias(el) {
  try {
    const res = await api.getDependencias();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
      tr.innerHTML = `<td>${d.id}</td><td>${d.fonteTipo}:${d.fonteId}</td><td>${d.tipo}</td><td>${d.destinoTipo}:${d.destinoId}</td>
        <td><span class="badge badge--ativo">${d.estado}</span></td>
        <td><button class="btn btn--small" onclick="verDependencia('${d.id}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarResponsabilidades(el) {
  try {
    const res = await api.getResponsabilidades();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
      tr.innerHTML = `<td>${r.id}</td><td>${r.agenteId}</td><td>${r.alvoId}</td><td>${r.alvoTipo}</td><td>${r.nivel}</td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarSessoes(el) {
  try {
    const res = await api.getSessoes();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
      tr.innerHTML = `<td>${s.id}</td><td>${s.agenteId}</td><td>${s.tarefaId || ''}</td><td>${s.datas.inicio || ''}</td><td>${s.datas.fim || ''}</td><td>${s.estadoFinal}</td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarCheckpoints(el) {
  try {
    const res = await api.getCheckpoints();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
      tr.innerHTML = `<td>${c.id}</td><td>${c.tarefaId}</td><td>${c.agenteId}</td><td>${c.titulo}</td><td>${c.tipo}</td>
        <td><button class="btn btn--small" onclick="verCheckpoint('${c.id}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarAprendizados(el) {
  try {
    const res = await api.getAprendizados();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
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
      tr.innerHTML = `<td>${a.id}</td><td>${a.titulo}</td><td>${a.categoria}</td><td>${a.utilidade}</td><td>${a.estado}</td>
        <td><button class="btn btn--small" onclick="verAprendizado('${a.id}')">Ver</button></td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarHistorico(el) {
  try {
    const res = await api.getAuditoria();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
    const eventos = res.dados || [];
    el.innerHTML = `<h3>📜 Histórico de Coordenação (${eventos.length} eventos)</h3>`;
    if (eventos.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhum evento registrado.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Agente</th><th>Tarefa</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const ev of eventos) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${new Date(ev.data).toLocaleString('pt-BR')}</td><td>${ev.tipo}</td><td>${ev.descricao}</td><td>${ev.agenteId || ''}</td><td>${ev.tarefaId || ''}</td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarIntegridade(el) {
  try {
    const res = await api.getIntegridade();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
    const data = res.dados;
    el.innerHTML = `<h3>🔍 Verificação de Integridade</h3>
      <p><strong>Estado:</strong> <span class="badge ${data.estado === 'OK' ? 'badge--ativo' : 'badge--bloqueada'}">${data.estado}</span></p>
      <p><strong>Inconsistências:</strong> ${data.inconsistencias.length}</p>`;
    if (data.inconsistencias.length > 0) {
      el.innerHTML += '<h4>Detalhes:</h4><ul>';
      for (const inc of data.inconsistencias) {
        el.innerHTML += `<li>${inc}</li>`;
      }
      el.innerHTML += '</ul>';
    }
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarBloqueios(el) {
  try {
    const res = await api.getBloqueios();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<h3>🚫 Bloqueios (${items.length})</h3>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhum bloqueio registrado.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Tarefa</th><th>Agente</th><th>Motivo</th><th>Estado</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const b of items) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${b.id}</td><td>${b.tarefaId}</td><td>${b.agenteId || ''}</td><td>${b.motivo}</td><td>${b.estado}</td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

async function renderizarRiscos(el) {
  try {
    const res = await api.getRiscos();
    if (!res.sucesso) { el.innerHTML = `<p class="painel-vazio">${res.erro}</p>`; return; }
    const items = res.dados || [];
    el.innerHTML = `<h3>⚠️ Riscos (${items.length})</h3>`;
    if (items.length === 0) { el.innerHTML += '<p class="painel-vazio">Nenhum risco registrado.</p>'; return; }
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Título</th><th>Categoria</th><th>Gravidade</th><th>Estado</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    for (const r of items) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.id}</td><td>${r.titulo}</td><td>${r.categoria}</td><td>${r.gravidade}</td><td>${r.estado}</td>`;
      tbody.appendChild(tr);
    }
    el.appendChild(table);
  } catch (err) {
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
  }
}

window.navegarPasta = function(caminho = null) {
  const input = document.getElementById('caminho-pasta');
  pastaAtual = caminho !== null ? caminho : (input ? input.value : '.');
  carregarPainel('arquivos');
};

window.abrirPasta = function(caminho) {
  pastaAtual = caminho;
  carregarPainel('arquivos');
};

window.abrirPastaExplorer = async function(caminho) {
  console.log('[abrirPastaExplorer] chamado com caminho=' + caminho);
  try {
    const res = await api.abrirPastaExplorer(caminho);
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
  try {
    const res = await api.lerArquivo(caminho);
    if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
    $('editor-titulo').textContent = caminho;
    $('editor-texto').value = res.dados;
    arquivoContexto = caminho;
    showModal('modal-editor');
  } catch (err) {
    showToast(err?.message || 'Erro', 'erro');
  }
}

async function excluirArquivo(caminho) {
  if (!confirm(`Excluir "${caminho}"? Esta ação não pode ser revertida.`)) return;
  try {
    const res = await api.excluirArquivo(caminho, true);
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
  const nome = $('nome-novo-arquivo').value.trim();
  if (!nome) return;
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
  }
});

$('btn-cancelar-novo-arquivo').addEventListener('click', () => hideModal('modal-novo-arquivo'));

window.abrirAgente = async function(id) {
  try {
    const res = await api.getAgente(id);
    if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
    const p = res.dados;
    const el = document.getElementById('painel-atividade');
    let html = `<h3>${p.registro.nome}</h3>
      <p><strong>Função:</strong> ${p.funcao}</p>
      <p><strong>Estado:</strong> ${p.estado}</p>
      <p><strong>Domínios permitidos:</strong> ${p.diretoriosPermitidos.join(', ') || 'nenhum'}</p>
      <p><strong>Contratos obrigatórios:</strong> ${p.contratosObrigatorios.join(', ') || 'nenhum'}</p>`;
    el.innerHTML = html;
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = '<thead><tr><th>Permissão</th><th>Permitido</th></tr></thead><tbody></tbody>';
    const tbody = table.querySelector('tbody');
    for (const [k, v] of Object.entries(p.permissoes)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${k}</td><td>${v ? '✓' : ''}</td>`;
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
    label.innerHTML = `<input type="checkbox" name="${namePrefix}" value="${opt}" ${selecionados.includes(opt) ? 'checked' : ''}> ${opt}`;
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
    const dirs = estado.opcoesAgente.diretorios;
    gerarCheckboxes('agente-diretorios-permitidos-cb', 'dir-perm', dirs, p.diretoriosPermitidos || []);
    gerarCheckboxes('agente-diretorios-proibidos-cb', 'dir-proib', dirs, p.diretoriosProibidos || []);
    gerarCheckboxes('agente-contratos-cb', 'contrato', estado.opcoesAgente.contratos, p.contratosObrigatorios || []);
    gerarCheckboxes('agente-ambientes-cb', 'ambiente', estado.opcoesAgente.ambientes, p.ambientesPermitidos || []);
    $('agente-responsabilidades').value = (p.responsabilidades || []).join('\n');
    $('agente-conhecimentos').value = (p.conhecimentos || []).join('\n');
     const perms = p.permissoes || {};
     ['ler','criar','alterar','excluir','executar','testar','revisar','aprovar','implantar'].forEach((perm) => $(`perm-${perm}`).checked = !!perms[perm]);
    $('titulo-agente').textContent = `Editar: ${p.nome}`;
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
    $('tarefa-criterios').value = (t.criteriosAceitacao || []).join('\n');
    $('tarefa-contratos').value = (t.contratosObrigatorios || []).join(', ');
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
      <h3>${t.id} — ${t.titulo}</h3>
      <p><strong>Estado:</strong> <span class="badge badge--${t.estado}">${t.estado}</span> | <strong>Prioridade:</strong> ${t.prioridade}</p>
      <p><strong>Objetivo:</strong> ${t.objetivo}</p>
      <p><strong>Tipo:</strong> ${t.tipo} | <strong>Domínio:</strong> ${t.dominio} | <strong>Ambiente:</strong> ${t.ambiente}</p>
      <p><strong>Agente Responsável:</strong> ${t.agenteResponsavel}</p>
      <p><strong>Contratos Obrigatórios:</strong> ${(t.contratosObrigatorios || []).join(', ') || 'Nenhum'}</p>
      <p><strong>Critérios de Aceitação:</strong> ${(t.criteriosAceitacao || []).join(', ') || 'Nenhum'}</p>
      <p><strong>Dependências:</strong> ${(t.dependencias || []).join(', ') || 'Nenhuma'}</p>
      ${t.datas?.inicio ? `<p><strong>Início:</strong> ${new Date(t.datas.inicio).toLocaleString('pt-BR')}</p>` : ''}
      ${t.datas?.conclusao ? `<p><strong>Conclusão:</strong> ${new Date(t.datas.conclusao).toLocaleString('pt-BR')}</p>` : ''}
      <p><strong>Criada em:</strong> ${t.datas?.criacao ? new Date(t.datas.criacao).toLocaleString('pt-BR') : '-'}</p>
      <p><strong>Última atualização:</strong> ${t.datas?.ultimaAtualizacao ? new Date(t.datas.ultimaAtualizacao).toLocaleString('pt-BR') : '-'}</p>
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
    $('titulo-contrato').textContent = `Editar: ${contrato.nome}`;
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
      <h3 style="margin:0;">${c.nome}</h3>
      <div>
        <button class="btn btn--small" onclick="abrirModalContrato(${JSON.stringify(c).replace(/"/g, '&quot;')})">Editar</button>
        <button class="btn btn--small btn--danger" onclick="excluirContrato('${c.id}')">Excluir</button>
      </div>
    </div>`;
    html += `<p><strong>ID:</strong> ${c.id}</p>
      <p><strong>Versão:</strong> ${c.versao}</p>
      <p><strong>Estado:</strong> ${c.estado}</p>
      <p><strong>Obrigatório:</strong> ${c.obrigatorio ? '✓' : ''}</p>
      <p><strong>Descrição:</strong> ${c.descricao || ''}</p>
      <p><strong>Objetivo:</strong> ${c.objetivo || ''}</p>`;
    if (c.regras?.length) {
      html += `<p><strong>Regras:</strong></p><ul>${c.regras.map(r => `<li>${r}</li>`).join('')}</ul>`;
    }
    if (c.restricoes?.length) {
      html += `<p><strong>Restrições:</strong></p><ul>${c.restricoes.map(r => `<li>${r}</li>`).join('')}</ul>`;
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
    return;
  }
  try {
    const res = await api.criarContrato(dados);
    if (res.sucesso) {
      showToast('Contrato salvo!', 'sucesso');
      hideModal('modal-contrato');
      carregarPainel('contratos');
    } else {
      showToast(res.erro, 'erro');
    }
  } catch (err) {
    showToast(err?.erro || 'Erro ao salvar contrato', 'erro');
  }
});

$('form-tarefa').addEventListener('submit', async function(e) {
  e.preventDefault();
  const id = $('tarefa-id').value;
  const dados = {
    titulo: $('tarefa-titulo').value.trim(),
    objetivo: $('tarefa-objetivo').value.trim(),
    tipo: $('tarefa-tipo').value.trim(),
    agenteResponsavel: $('tarefa-agente').value,
    dominio: $('tarefa-dominio').value.trim(),
    prioridade: $('tarefa-prioridade').value,
    criteriosAceitacao: $('tarefa-criterios').value.split('\n').map(s => s.trim()).filter(s => s),
    contratosObrigatorios: $('tarefa-contratos').value.split(',').map(s => s.trim()).filter(s => s)
  };
  if (!dados.titulo || !dados.objetivo || !dados.agenteResponsavel || !dados.dominio) {
    showToast('Campos marcados com * são obrigatórios', 'erro');
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
  }
});

$('btn-cancelar-tarefa').addEventListener('click', () => hideModal('modal-tarefa'));

// Agent form handlers
$('form-agente').addEventListener('submit', async function(e) {
  console.log('[form-agente submit] iniciado');
  e.preventDefault();
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
    return;
  }
  if (dados.diretoriosPermitidos.length === 0) {
    showToast('Selecione pelo menos um diretório permitido', 'erro');
    console.error('[form-agente submit] validação falhou: nenhum diretório permitido selecionado');
    return;
  }
  if (dados.contratosObrigatorios.length === 0) {
    showToast('Selecione pelo menos um contrato obrigatório', 'erro');
    console.error('[form-agente submit] validação falhou: nenhum contrato selecionado');
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
    diretoriosPermitidos: coletarCheckboxes('dir-perm'),
    diretoriosProibidos: coletarCheckboxes('dir-proib'),
    contratosObrigatorios: coletarCheckboxes('contrato'),
    ambientesPermitidos: coletarCheckboxes('ambiente'),
    responsabilidades: $('agente-responsabilidades').value.split('\n').map(s => s.trim()).filter(s => s),
    conhecimentos: $('agente-conhecimentos').value.split('\n').map(s => s.trim()).filter(s => s),
  };
  console.log('[coletarDadosAgente] dados:', JSON.stringify(dados));
  return dados;
}

function coletarCheckboxes(namePrefix) {
  const checked = Array.from(document.querySelectorAll(`input[name="${namePrefix}"]:checked`)).map((el) => el.value);
  console.log('[coletarCheckboxes]', namePrefix, '->', checked);
  return checked;
}

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
    wrapper.innerHTML = `<input type="checkbox" name="impacto" value="${imp}" ${selected.includes(imp) ? 'checked' : ''}> ${imp}`;
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
  document.getElementById('solicitacao-impactos-cb').addEventListener('change', atualizarImpactosHidden);
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
      <h3>${s.id} — ${s.titulo}</h3>
      <p><strong>Status:</strong> <span class="badge badge--ativo">${s.status}</span> | <strong>Prioridade:</strong> ${s.prioridade}</p>
      <p><strong>Solicitante:</strong> ${s.agenteSolicitante.id} | <strong>Responsável:</strong> ${s.agenteResponsavel.id || 'Nenhum'}</p>
      <p><strong>Alvo:</strong> ${s.alvo.tipo} — ${s.alvo.nome}</p>
      ${s.alvo.identificador ? `<p><strong>Identificador:</strong> ${s.alvo.identificador}</p>` : ''}
      ${s.alvo.localizacao ? `<p><strong>Localização:</strong> <code>${s.alvo.localizacao}</code></p>` : ''}
      <p><strong>Alteração:</strong> ${s.alteracao.tipo} — ${s.alteracao.descricao}</p>
      <p><strong>Motivo:</strong> ${s.alteracao.motivo}</p>
      ${s.alteracao.arquivosAfetados?.length ? `<p><strong>Arquivos Afetados:</strong> ${s.alteracao.arquivosAfetados.join(', ')}</p>` : ''}
      <p><strong>Impactos:</strong> ${s.impactos.join(', ')}</p>
      ${s.dependencias?.length ? `<p><strong>Dependências:</strong> ${s.dependencias.join(', ')}</p>` : ''}
      <p><strong>Requer Aprovação:</strong> ${s.requerAprovacao ? 'Sim' : 'Não'}</p>
      <p><strong>Aprovação:</strong> ${s.aprovacao.status} ${s.aprovacao.agenteId ? `(por ${s.aprovacao.agenteId})` : ''} ${s.aprovacao.data ? `(${new Date(s.aprovacao.data).toLocaleString('pt-BR')})` : ''}</p>
      ${s.tarefaOrigem ? `<p><strong>Tarefa de Origem:</strong> ${s.tarefaOrigem.id}</p>` : ''}
      <p><strong>Criada em:</strong> ${s.datas.criadaEm ? new Date(s.datas.criadaEm).toLocaleString('pt-BR') : '-'}</p>
      <p><strong>Atualizada em:</strong> ${s.datas.atualizadaEm ? new Date(s.datas.atualizadaEm).toLocaleString('pt-BR') : '-'}</p>
      ${s.datas.concluidaEm ? `<p><strong>Concluída em:</strong> ${new Date(s.datas.concluidaEm).toLocaleString('pt-BR')}</p>` : ''}
      ${s.observacoes ? `<p><strong>Observações:</strong> ${s.observacoes}</p>` : ''}
    `;
    if (s.requerAprovacao && s.status === 'PENDENTE') {
      html += `<div style="margin-top:16px;padding-top:12px;border-top:1px solid #333;">
        <button class="btn btn--small btn--primario" onclick="aprovarSolicitacao('${s.id}')">Aprovar</button>
        <button class="btn btn--small btn--danger" onclick="rejeitarSolicitacao('${s.id}')">Rejeitar</button>
      </div>`;
    }
      if (historicos.length > 0) {
      html += `<h4 style="margin-top:16px;">Histórico</h4><ul>`;
      for (const h of historicos) {
        html += `<li><span class="badge badge--ativo">${h.tipo}</span> ${h.data ? new Date(h.data).toLocaleString('pt-BR') : ''} ${h.agenteId ? `(por ${h.agenteId})` : ''} ${h.observacao ? '- "' + h.observacao + '"' : ''}</li>`;
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
    el.innerHTML = `<p class="painel-vazio">Erro: ${err?.message || err}</p>`;
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
  const agente = prompt('Digite o ID do agente aprovador:');
  if (!agente) return;
  const obs = prompt('Observação (opcional):') || null;
  try {
    const res = await api.aprovarSolicitacao(id, agente, obs);
    if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
    showToast('Solicitação aprovada.', 'sucesso');
    await renderizarSolicitacoes($('painel-atividade'));
  } catch (err) {
    showToast(err?.message || err, 'erro');
  }
};

window.rejeitarSolicitacao = async function(id) {
  const agente = prompt('Digite o ID do agente rejeitador:');
  if (!agente) return;
  const motivo = prompt('Motivo da rejeição:');
  if (!motivo) return;
  try {
    const res = await api.rejeitarSolicitacao(id, agente, motivo);
    if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
    showToast('Solicitação rejeitada.', 'sucesso');
    await renderizarSolicitacoes($('painel-atividade'));
  } catch (err) {
    showToast(err?.message || err, 'erro');
  }
};

$('form-solicitacao').addEventListener('submit', async function(e) {
  e.preventDefault();
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
    if (!res.sucesso) { showToast(res.erro, 'erro'); return; }
    showToast(id ? 'Solicitação atualizada.' : 'Solicitação criada.', 'sucesso');
    hideModal('modal-solicitacao');
    await renderizarSolicitacoes($('painel-atividade'));
  } catch (err) {
    showToast(err?.message || err, 'erro');
  }
});
