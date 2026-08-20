const API_BASE = '/api/monitoramento';

let ws = null;
let autoScroll = true;
let msgCounter = 0;
let mensagensCache = [];
let agentesCache = [];
let kiloCache = [];
let filtroAgente = 'todos';
let filtroTipo = 'todos';
let modoAtual = null;
let ultimaMensagemEnviada = null;
let novasCount = 0;
function generateMsgId() {
  msgCounter += 1;
  return `MSG-${Date.now()}-${msgCounter}`;
}

function sanitizarConteudo(conteudo) {
  if (typeof conteudo !== 'string') return conteudo;
  return conteudo
    .replace(/<environment_details\b[^>]*>[\s\S]*?<\/environment_details>/gi, '')
    .replace(/<environment_details\b[^>]*\/>/gi, '')
    .replace(/Current time:[\s\S]*?Workspace root folder:[\s\S]*/gi, '')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

document.addEventListener('DOMContentLoaded', () => {
  const chatMessages = document.getElementById('chat-messages');
  const inputMensagem = document.getElementById('input-mensagem');
  const btnEnviar = document.getElementById('btn-enviar');
  const btnScroll = document.getElementById('btn-scroll');
  const badgeNovas = document.getElementById('badge-novas');
  const btnModoAuto = document.getElementById('btn-modo-auto');
  const btnModoHibrido = document.getElementById('btn-modo-hibrido');
  const btnModoManual = document.getElementById('btn-modo-manual');
  const filtroAgenteSelect = document.getElementById('filtro-agente');
  const filtroTipoSelect = document.getElementById('filtro-tipo');
  const statusWs = document.getElementById('status-ws');
  const btnLimparTodas = document.getElementById('btn-limpar-todas');
  const btnLimparMensagens = document.getElementById('btn-limpar-mensagens');

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/monitoramento`;

  function conectarWebSocket() {
    ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        statusWs.textContent = '🟢 WebSocket Conectado';
        statusWs.className = 'header__status status-conectado';
        ws.send(JSON.stringify({ type: 'solicitar_kilo_state', data: {} }));
      };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        processarEventoWebSocket(payload);
      } catch (err) {
        console.error('Erro ao parsear mensagem WebSocket:', err);
      }
    };

    ws.onclose = () => {
      statusWs.textContent = '🔴 WebSocket Desconectado';
      statusWs.className = 'header__status status-desconectado';
      setTimeout(conectarWebSocket, 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket erro:', err);
    };
  }

  function processarEventoWebSocket(payload) {
    const { type, data } = payload;

    switch (type) {
      case 'mensagem_nova':
        if (data?.conteudo) {
          const sanitized = { ...data, conteudo: sanitizarConteudo(data.conteudo) };
          adicionarMensagem(sanitized);
        } else {
          adicionarMensagem(data);
        }
        break;
      case 'agente_status_alterado':
        renderizarAgentes(data || []);
        break;
      case 'mensagens':
        mensagensCache = (data || []).map(msg => ({
          ...msg,
          conteudo: sanitizarConteudo(msg.conteudo)
        }));
        renderizarMensagens();
        break;
      case 'agentes':
        agentesCache = data || [];
        renderizarAgentes(agentesCache);
        break;
      case 'kilo_state':
        kiloCache = data || [];
        renderizarKilo(kiloCache);
        break;
      case 'resultado':
        if (data?.sucesso === false) {
          console.error('API erro:', data.erro);
        }
        if (data?.dados?.modo || (data?.dados?.modoGlobal)) {
          const novoModo = data.dados.modo || data.dados.modoGlobal;
          atualizarModoAtivo(novoModo);
        }
        break;
    }
  }

  async function carregarModoAtual() {
    try {
      const res = await fetch(`${API_BASE}/modo`, { headers: { 'Content-Type': 'application/json' } });
      const json = await res.json();
      if (json.sucesso) {
        modoAtual = json.dados.modoGlobal;
        atualizarModoAtivo(modoAtual);
      }
    } catch (err) {
      console.error('Erro ao carregar modo:', err);
    }
  }

  function atualizarModoAtivo(modo) {
    [btnModoAuto, btnModoHibrido, btnModoManual].forEach(btn => {
      if (btn) btn.classList.remove('modo-btn--ativo');
    });
    const map = { AUTOMATICO: btnModoAuto, HIBRIDO: btnModoHibrido, MANUAL: btnModoManual };
    const btn = map[modo];
    if (btn) btn.classList.add('modo-btn--ativo');
    modoAtual = modo;
  }

  async function alterarModo(modo) {
    try {
      const res = await fetch(`${API_BASE}/modo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo, escopo: 'GLOBAL' })
      });
      const json = await res.json();
      if (json.sucesso) {
        atualizarModoAtivo(modo);
        adicionarMensagem({
          id: generateMsgId(),
          timestamp: new Date().toISOString(),
          tipo: 'MODO_ALTERADO',
          emissor: 'usuario',
          conteudo: `Modo alterado para ${modo}`,
          modo
        });
      } else {
        console.error('API erro:', json.erro);
      }
    } catch (err) {
      console.error('Erro ao alterar modo:', err);
    }
  }

  function adicionarMensagem(msg) {
    if (ultimaMensagemEnviada && msg.tipo === 'COMANDO_USUARIO' && msg.emissor === 'usuario') {
      const last = ultimaMensagemEnviada;
      if (msg.conteudo === last.conteudo && msg.emissor === last.emissor) {
        const idx = mensagensCache.findIndex(m => m.id === last.id);
        if (idx !== -1) {
          ultimaMensagemEnviada = null;
          mensagensCache[idx] = { ...mensagensCache[idx], ...msg };
          atualizarFiltroTipo();
          aplicarFiltros();
          if (autoScroll) {
            rolarParaUltima();
          } else {
            novasCount += 1;
            mostrarBadge();
          }
          return;
        }
      }
    }

    mensagensCache.push(msg);
    if (mensagensCache.length > 500) {
      mensagensCache = mensagensCache.slice(-500);
    }
    atualizarFiltroTipo();
    aplicarFiltros();
    if (autoScroll) {
      rolarParaUltima();
    } else {
      novasCount += 1;
      mostrarBadge();
    }
  }

  function sanitizarMensagem(msg) {
    if (!msg || typeof msg.conteudo === 'undefined') return msg;
    return { ...msg, conteudo: sanitizarConteudo(msg.conteudo) };
  }

  function aplicarFiltros() {
    let msgs = mensagensCache.map(sanitizarMensagem);
    if (filtroAgente !== 'todos') {
      msgs = msgs.filter(m => m.agenteId === filtroAgente || m.emissor === filtroAgente);
    }
    if (filtroTipo !== 'todos') {
      msgs = msgs.filter(m => m.tipo === filtroTipo);
    }
    renderizarMensagens(msgs);
    const tipoAtual = filtroTipo;
    atualizarFiltroTipo();
    filtroTipoSelect.value = tipoAtual;
  }

  function renderizarMensagens(msgs = null) {
    const container = chatMessages;
    const mensagens = (msgs || mensagensCache).map(sanitizarMensagem);
    container.innerHTML = '';
    mensagens.slice().reverse().forEach(msg => {
      const el = criarElementoMensagem(msg);
      container.appendChild(el);
    });
  }

  function criarElementoMensagem(msg) {
    const div = document.createElement('div');
    const classeMap = {
      TAREFA_INICIADA: 'mensagem--agente',
      TAREFA_EM_EXECUCAO: 'mensagem--agente',
      TAREFA_CONCLUIDA: 'mensagem--agente',
      TAREFA_FALHOU: 'mensagem--agente',
      ERRO: 'mensagem--agente',
      SOLICITAR_APROVACAO: 'mensagem--agente',
      ATUALIZAR_STATUS: 'mensagem--agente',
      INTERVENCAO_USUARIO: 'mensagem--usuario',
      COMANDO_USUARIO: 'mensagem--usuario',
      MODO_ALTERADO: 'mensagem--sistema',
      AGENTE_STATUS_ALTERADO: 'mensagem--sistema',
      CONECTADO: 'mensagem--sistema'
    };
    div.className = `mensagem ${classeMap[msg.tipo] || 'mensagem--agente'}`;
    div.setAttribute('data-mensagem-id', msg.id);

    const tipoEl = document.createElement('div');
    tipoEl.className = `mensagem-tipo mensagem-tipo--${msg.tipo ? msg.tipo.toLowerCase() : 'default'}`;
    if (msg.tipo) tipoEl.textContent = msg.tipo;
    div.appendChild(tipoEl);

    const emissorEl = document.createElement('div');
    emissorEl.className = 'mensagem-emissor';
    emissorEl.textContent = msg.emissor || 'sistema';
    if (msg.agenteId) {
      const badge = document.createElement('span');
      badge.className = 'modo-tag';
      badge.textContent = msg.agenteId;
      emissorEl.appendChild(badge);
    }
    div.appendChild(emissorEl);

    const conteudoEl = document.createElement('div');
    conteudoEl.className = 'mensagem-conteudo';
    conteudoEl.textContent = msg.conteudo || '';
    div.appendChild(conteudoEl);

    if (msg.progresso !== undefined) {
      const progContainer = document.createElement('div');
      progContainer.className = 'progresso-container';
      const barra = document.createElement('div');
      barra.className = 'progresso-barra';
      const fill = document.createElement('div');
      fill.className = 'progresso-fill';
      fill.style.width = `${msg.progresso}%`;
      barra.appendChild(fill);
      const txt = document.createElement('div');
      txt.className = 'progresso-texto';
      txt.textContent = `${msg.progresso}%`;
      progContainer.appendChild(barra);
      progContainer.appendChild(txt);
      div.appendChild(progContainer);
    }

    if (msg.acoes && msg.acoes.length > 0) {
      const acoesDiv = document.createElement('div');
      acoesDiv.className = 'acoes-container';
      msg.acoes.forEach(acao => {
        const btn = document.createElement('button');
        btn.className = `acao-btn${acao.estilo ? ' acao-btn--' + acao.estilo : ''}`;
        btn.textContent = acao.label;
        btn.onclick = () => executarAcao(acao.comando, msg);
        acoesDiv.appendChild(btn);
      });
      div.appendChild(acoesDiv);
    }

    const tsEl = document.createElement('div');
    tsEl.className = 'mensagem-timestamp';
    const d = new Date(msg.timestamp);
    tsEl.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    div.appendChild(tsEl);

    const acaoEl = document.createElement('button');
    acaoEl.className = 'mensagem-excluir';
    acaoEl.textContent = '✕';
    acaoEl.title = 'Apagar mensagem';
    acaoEl.onclick = async () => {
      try {
        const res = await fetch(`${API_BASE}/mensagens/${encodeURIComponent(msg.id)}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.sucesso) {
          mensagensCache = mensagensCache.filter(m => m.id !== msg.id);
          div.remove();
        } else {
          console.error('Erro ao apagar mensagem:', json.erro);
        }
      } catch (err) {
        console.error('Erro ao apagar mensagem:', err);
      }
    };
    div.appendChild(acaoEl);

    return div;
  }

  function executarAcao(comando, msg) {
    const payload = {};
    if (msg.tarefaId) payload.tarefaId = msg.tarefaId;
    if (msg.agenteId) payload.agenteId = msg.agenteId;

    fetch(`${API_BASE}/intervir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comando, payload })
    }).then(async (res) => {
      const json = await res.json();
      if (!json.sucesso) {
        console.error('API erro:', json.erro);
      }
      adicionarMensagem({
        id: generateMsgId(),
        timestamp: new Date().toISOString(),
        tipo: 'INTERVENCAO_USUARIO',
        emissor: 'usuario',
        conteudo: `Executado: ${comando}`
      });
    }).catch(err => {
      console.error('Erro na intervenção:', err);
    });
  }

  function renderizarAgentes(agentes) {
    const list = document.getElementById('agentes-list');
    list.innerHTML = '';
    agentes.forEach(agente => {
      const div = document.createElement('div');
      div.className = `agente-item agente-item--${agente.status.toLowerCase()}`;
      div.innerHTML = `
        <div class="agente-nome">
          <span class="status-badge status-badge--${agente.status.toLowerCase()}"></span>
          ${agente.nome || agente.id}
          <span class="modo-tag">${agente.modo || 'AUTOMATICO'}</span>
        </div>
        <div class="agente-status">
          <span>${agente.tarefaAtualTitulo || 'Sem tarefa'}</span>
          <span class="status-badge-text">${agente.status}</span>
        </div>
        <button class="agente-excluir" data-agente-id="${agente.id}" title="Remover agente">✕</button>
      `;
      list.appendChild(div);
    });

    atualizarFiltroAgente(agentes);
  }

  function renderizarKilo(kilo) {
    const list = document.getElementById('kilo-list');
    const count = document.getElementById('kilo-count');
    if (!list) return;

    const worktrees = kilo.worktrees || [];
    const sessoes = kilo.sessoes || [];
    count.textContent = `${worktrees.length} worktrees`;

    list.innerHTML = '';
    worktrees.forEach(wt => {
      const sessao = sessoes.find(s => s.worktreeId === wt.nome || s.id === wt.sessaoId);
      const div = document.createElement('div');
      div.className = 'agente-item agente-item--kilo';
      div.innerHTML = `
        <div class="agente-nome">
          <span class="status-badge status-badge--kilo"></span>
          ${wt.nome}
          <span class="modo-tag">${wt.branch || ''}</span>
        </div>
        <div class="agente-status">
          <span>${sessao?.nome || 'Sem sessão'}</span>
          <span class="status-badge-text">${sessao?.estado || 'desconhecido'}</span>
        </div>
      `;
      list.appendChild(div);
    });

    if (worktrees.length === 0) {
      list.innerHTML = '<div style="padding:12px;color:#6e7681;font-size:12px;">Nenhum worktree Kilo descoberto</div>';
    }
  }

  function atualizarFiltroAgente(agentes) {
    const select = filtroAgenteSelect;
    const options = select.innerHTML;
    let html = '<option value="todos">Todos os agentes</option>';
    agentes.forEach(a => {
      html += `<option value="${a.id}">${a.nome || a.id}</option>`;
    });
    select.innerHTML = html;
  }

  function atualizarFiltroTipo() {
    const select = filtroTipoSelect;
    const tipos = new Set(mensagensCache.map(m => m.tipo).filter(Boolean));
    let html = '<option value="todos">Todos os tipos</option>';
    tipos.forEach(tipo => {
      html += `<option value="${tipo}">${tipo}</option>`;
    });
    select.innerHTML = html;
  }

  function rolarParaUltima() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
    novasCount = 0;
    badgeNovas.textContent = '0';
    esconderBadge();
  }

  function mostrarBadge() {
    if (autoScroll) return;
    badgeNovas.textContent = String(novasCount);
    badgeNovas.classList.add('scroll-badge--ativo');
  }

  function esconderBadge() {
    badgeNovas.classList.remove('scroll-badge--ativo');
    badgeNovas.textContent = '0';
  }

  chatMessages.addEventListener('scroll', () => {
    const isNearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 50;
    if (isNearBottom) {
      if (!autoScroll) {
        autoScroll = true;
        esconderBadge();
      }
    } else {
      if (autoScroll) {
        autoScroll = false;
        mostrarBadge();
      }
    }
  });

  btnScroll.addEventListener('click', () => {
    autoScroll = true;
    rolarParaUltima();
  });

  btnEnviar.addEventListener('click', async () => {
    const texto = inputMensagem.value.trim();
    if (texto) {
      const msg = {
        id: generateMsgId(),
        timestamp: new Date().toISOString(),
        tipo: 'COMANDO_USUARIO',
        emissor: 'usuario',
        conteudo: texto
      };
      ultimaMensagemEnviada = msg;
      adicionarMensagem(msg);
      try {
        const res = await fetch(`${API_BASE}/mensagens`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg)
        });
        const json = await res.json();
        if (!json.sucesso) {
          console.error('API erro:', json.erro);
          adicionarMensagem({
            ...msg,
            id: generateMsgId(),
            tipo: 'ERRO',
            conteudo: `Erro ao enviar: ${json.erro || 'falha desconhecida'}`
          });
        }
      } catch (err) {
        console.error('Erro ao enviar mensagem:', err);
        adicionarMensagem({
          ...msg,
          id: generateMsgId(),
          tipo: 'ERRO',
          conteudo: `Erro de conexão: ${err.message}`
        });
      }
      inputMensagem.value = '';
    }
  });

  inputMensagem.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnEnviar.click();
    }
  });

  [btnModoAuto, btnModoHibrido, btnModoManual].forEach((btn, i) => {
    if (btn) {
      const modos = ['AUTOMATICO', 'HIBRIDO', 'MANUAL'];
      btn.addEventListener('click', () => alterarModo(modos[i]));
    }
  });

  filtroAgenteSelect.addEventListener('change', (e) => {
    filtroAgente = e.target.value;
    aplicarFiltros();
  });

  filtroTipoSelect.addEventListener('change', (e) => {
    filtroTipo = e.target.value;
    aplicarFiltros();
  });

  btnLimparTodas.addEventListener('click', async () => {
    if (!confirm('Apagar todas as mensagens de monitoramento?')) return;
    try {
      const res = await fetch(`${API_BASE}/mensagens`, { method: 'DELETE' });
      const json = await res.json();
      if (json.sucesso) {
        mensagensCache = [];
        renderizarMensagens([]);
      } else {
        console.error('Erro ao limpar mensagens:', json.erro);
      }
    } catch (err) {
      console.error('Erro ao limpar mensagens:', err);
    }
  });

  if (btnLimparMensagens) {
    btnLimparMensagens.addEventListener('click', async () => {
      try {
        await fetch(`${API_BASE}/mensagens`, { method: 'DELETE' });
      } catch (err) {
        console.error('Erro ao limpar mensagens:', err);
      }
      mensagensCache = [];
      atualizarFiltroTipo();
      renderizarMensagens([]);
      esconderBadge();
    });
  }

  async function excluirAgente(id) {
    if (!id) return;
    if (!confirm(`Remover agente "${id}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/agentes/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.sucesso) {
        const items = document.querySelectorAll('.agente-item');
        items.forEach(item => {
          if (item.querySelector(`[data-agente-id="${CSS.escape(id)}"]`)) {
            item.remove();
          }
        });
        const countEl = document.getElementById('agentes-count');
        if (countEl) {
          const current = parseInt(countEl.textContent || '0', 10);
          countEl.textContent = `${Math.max(0, current - 1)} agentes`;
        }
      } else {
        console.error('Erro ao excluir agente:', json.erro);
      }
    } catch (err) {
      console.error('Erro ao excluir agente:', err);
    }
  }

  async function limparAgentes() {
    if (!confirm('Remover todos os agentes?')) return;
    try {
      const res = await fetch(`${API_BASE}/agentes`, { method: 'DELETE' });
      const json = await res.json();
      if (json.sucesso) {
        document.getElementById('agentes-list').innerHTML = '';
        const countEl = document.getElementById('agentes-count');
        if (countEl) {
          countEl.textContent = `0 agentes`;
        }
      } else {
        console.error('Erro ao limpar agentes:', json.erro);
      }
    } catch (err) {
      console.error('Erro ao limpar agentes:', err);
    }
  }

  document.getElementById('agentes-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('.agente-excluir');
    if (!btn) return;
    const id = btn.getAttribute('data-agente-id');
    if (id) {
      await excluirAgente(id);
    }
  });

  const btnLimparAgentes = document.getElementById('btn-limpar-agentes');
  if (btnLimparAgentes) {
    btnLimparAgentes.addEventListener('click', limparAgentes);
  }

  async function carregarMensagens() {
    try {
      const res = await fetch(`${API_BASE}/mensagens?limite=100`);
      const json = await res.json();
      if (json.sucesso) {
        mensagensCache = json.dados;
        aplicarFiltros();
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    }
  }

  carregarModoAtual();
  carregarMensagens();
  conectarWebSocket();
});
