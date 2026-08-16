const API_BASE = '/api/monitoramento';

let ws = null;
let autoScroll = true;
let msgCounter = 0;
let mensagensCache = [];
let agentesCache = [];
let filtroAgente = 'todos';
let filtroTipo = 'todos';
let modoAtual = null;
let apiKey = null;

async function carregarApiKey() {
  try {
    const res = await fetch('/api/auth/key');
    if (res.ok) {
      const data = await res.json();
      apiKey = data.dados?.apiKey || null;
    }
  } catch {
    apiKey = null;
  }
}
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

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/monitoramento`;

  function authHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;
    return headers;
  }

  function conectarWebSocket() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      statusWs.textContent = '🟢 WebSocket Conectado';
      statusWs.className = 'header__status status-conectado';
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
          data = { ...data, conteudo: sanitizarConteudo(data.conteudo) };
        }
        adicionarMensagem(data);
        break;
      case 'agente_status_alterado':
        atualizarListaAgentes(data);
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
      const res = await fetch(`${API_BASE}/modo`, { headers: authHeaders() });
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
        headers: authHeaders(),
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
      }
    } catch (err) {
      console.error('Erro ao alterar modo:', err);
    }
  }

  function adicionarMensagem(msg) {
    mensagensCache.push(msg);
    if (mensagensCache.length > 500) {
      mensagensCache = mensagensCache.slice(-500);
    }
    aplicarFiltros();
    if (autoScroll) {
      rolarParaUltima();
    } else {
      mostrarBadgeNovas();
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

    return div;
  }

  function executarAcao(comando, msg) {
    const payload = {};
    if (msg.tarefaId) payload.tarefaId = msg.tarefaId;
    if (msg.agenteId) payload.agenteId = msg.agenteId;

    fetch(`${API_BASE}/intervir`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ comando, payload })
    }).then(() => {
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
      `;
      list.appendChild(div);
    });

    atualizarFiltroAgente(agentes);
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

  function rolarParaUltima() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
    esconderBadge();
  }

  function mostrarBadge() {
    if (autoScroll) return;
    badgeNovas.classList.add('scroll-badge--ativo');
  }

  function esconderBadge() {
    badgeNovas.classList.remove('scroll-badge--ativo');
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
    if (autoScroll) {
      autoScroll = false;
      mostrarBadge();
    } else {
      autoScroll = true;
      rolarParaUltima();
    }
  });

  btnEnviar.addEventListener('click', async () => {
    const texto = inputMensagem.value.trim();
    if (texto) {
      try {
        await fetch(`${API_BASE}/mensagens`, {
          method: 'POST',
         headers: authHeaders(),
         body: JSON.stringify({ tipo: 'COMANDO_USUARIO', emissor: 'usuario', conteudo: texto })
        });
      } catch (err) {
        console.error('Erro ao enviar mensagem:', err);
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

  await carregarApiKey();
  carregarModoAtual();
  carregarMensagens();
  conectarWebSocket();
});

async function carregarMensagens() {
  try {
    const res = await fetch(`${API_BASE}/mensagens?limite=100`, { headers: authHeaders() });
    const json = await res.json();
    if (json.sucesso) {
      mensagensCache = json.dados;
      aplicarFiltros();
    }
  } catch (err) {
    console.error('Erro ao carregar mensagens:', err);
  }
}
