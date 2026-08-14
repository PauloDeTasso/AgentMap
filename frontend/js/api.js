const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.cache = new Map();
    this.apiKey = null;
    this.initPromise = this.loadApiKey();
  }

  async loadApiKey() {
    try {
      const res = await fetch('/api/auth/key');
      if (res.ok) {
        const data = await res.json();
        this.apiKey = data.dados?.apiKey || null;
      }
    } catch {
      this.apiKey = null;
    }
  }

  async request(endpoint, options = {}) {
    await this.initPromise;
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {}),
      ...options.headers
    };
    const opts = {
      headers,
      ...options
    };
    const cacheKey = options.method && options.method !== 'GET' ? null : `${options.method || 'GET'}:${url}`;
    if (cacheKey && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw { status: res.status, ...(data || {}) };
    }
    if (cacheKey) {
      this.cache.set(cacheKey, data);
    }
    return data;
  }

  async getStatus() {
    return this.request('/status');
  }

  async listarProjetos() {
    return this.request('/projetos');
  }

  async criarProjeto(nome, caminhoParental, descricao) {
    return this.request('/projetos', {
      method: 'POST',
      body: JSON.stringify({ nome, caminhoParental, descricao })
    });
  }

  async abrirProjeto(idOuCaminho, caminho = null) {
    console.log('[api.abrirProjeto] idOuCaminho:', idOuCaminho, '| caminho body:', caminho || 'null');
    const body = caminho ? { caminho } : {};
    const encodedId = encodeURIComponent(idOuCaminho);
    return this.request(`/projetos/${encodedId}/abrir`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async fecharProjeto(id) {
    return this.request(`/projetos/${id}/fechar`, { method: 'POST' });
  }

  async getProjetoAtual() {
    return this.request('/projetos/atual');
  }

  async obterProjeto(id) {
    return this.request(`/projetos/${id}`);
  }

  async atualizarProjeto(id, dados) {
    return this.request(`/projetos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async getConfiguracao(projetoId = null) {
    if (projetoId) return this.request(`/projetos/${projetoId}/configuracao`);
    const res = await this.request('/projetos/atual');
    if (!res.sucesso || !res.dados) return res;
    return { sucesso: true, dados: res.dados.config };
  }

  async getAgentes() {
    return this.request('/agentes');
  }

  async getAgente(id) {
    return this.request(`/agentes/${id}`);
  }

  async criarAgente(perfil) {
    return this.request('/agentes', {
      method: 'POST',
      body: JSON.stringify(perfil)
    });
  }

  async atualizarAgente(id, perfil) {
    return this.request(`/agentes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(perfil)
    });
  }

  async excluirAgente(id) {
    return this.request(`/agentes/${id}`, {
      method: 'DELETE'
    });
  }

  async getTarefas() {
    return this.request('/tarefas');
  }

  async obterTarefa(id) {
    return this.request(`/tarefas/${id}`);
  }

  async criarTarefa(dados) {
    return this.request('/tarefas', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async atualizarTarefa(id, dados) {
    return this.request(`/tarefas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async excluirTarefa(id) {
    return this.request(`/tarefas/${id}`, { method: 'DELETE' });
  }

  async mudarEstado(tarefaId, estado) {
    return this.request(`/tarefas/${tarefaId}/estado`, {
      method: 'POST',
      body: JSON.stringify({ estado })
    });
  }

  async getTarefaContexto(tarefaId) {
    return this.request(`/tarefas/${tarefaId}/contexto`);
  }

  async listarArquivos(caminho = '.') {
    return this.request(`/arquivos?path=${encodeURIComponent(caminho)}`);
  }

  async lerArquivo(caminho) {
    return this.request(`/arquivos/conteudo?path=${encodeURIComponent(caminho)}`);
  }

  async escreverArquivo(caminho, conteudo) {
    return this.request('/arquivos', {
      method: 'POST',
      body: JSON.stringify({ caminho, conteudo })
    });
  }

  async atualizarArquivo(caminho, conteudo) {
    return this.request('/arquivos', {
      method: 'PUT',
      body: JSON.stringify({ caminho, conteudo })
    });
  }

  async excluirArquivo(caminho, confirmado = false) {
    return this.request(`/arquivos?path=${encodeURIComponent(caminho)}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirmado })
    });
  }

  async abrirPastaExplorer(caminho) {
    return this.request(`/arquivos/explorer?path=${encodeURIComponent(caminho)}`);
  }

  async validarJson(caminho) {
    return this.request(`/arquivos/validar-json?path=${encodeURIComponent(caminho)}`);
  }

  async getContratos() {
    return this.request('/contratos');
  }

  async getContrato(id) {
    return this.request(`/contratos/${id}`);
  }

  async criarContrato(contrato) {
    return this.request('/contratos', {
      method: 'POST',
      body: JSON.stringify(contrato)
    });
  }

  async atualizarContrato(contrato) {
    return this.request(`/contratos/${contrato.id}`, {
      method: 'PUT',
      body: JSON.stringify(contrato)
    });
  }

  async excluirContrato(id) {
    return this.request(`/contratos/${id}`, { method: 'DELETE' });
  }

  async getContratoDependentes(id) {
    return this.request(`/contratos/${id}/dependentes`);
  }

  async getSolicitacoes() {
    return this.request('/solicitacoes');
  }

  async getSolicitacao(id) {
    return this.request(`/solicitacoes/${id}`);
  }

  async getSolicitacaoHistorico(id) {
    return this.request(`/solicitacoes/${id}/historico`);
  }

  async criarSolicitacao(dados) {
    return this.request('/solicitacoes', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async atualizarSolicitacao(id, dados) {
    return this.request(`/solicitacoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async excluirSolicitacao(id) {
    return this.request(`/solicitacoes/${id}`, {
      method: 'DELETE'
    });
  }

  async aprovarSolicitacao(id, agenteId, observacao = null) {
    return this.request(`/solicitacoes/${id}/aprovar`, {
      method: 'PUT',
      body: JSON.stringify({ agenteId, observacao })
    });
  }

  async rejeitarSolicitacao(id, agenteId, motivo) {
    return this.request(`/solicitacoes/${id}/rejeitar`, {
      method: 'PUT',
      body: JSON.stringify({ agenteId, motivo })
    });
  }

  async getEstado() {
    return this.request('/estado');
  }

  async getAuditoria() {
    return this.request('/auditoria');
  }

  async getSettings() {
    return this.request('/projetos/settings');
  }

  async updateSettings(body) {
    return this.request('/projetos/settings', {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async scanProjetos(pasta) {
    return this.request(`/projetos/scan?pasta=${encodeURIComponent(pasta || '')}`);
  }

  async removerProjeto(id) {
    return this.request(`/projetos/${id}`, { method: 'DELETE' });
  }

  async atualizarConfiguracao(id, config) {
    return this.request(`/projetos/${id}/configuracao`, {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  }

  async validarSchema(caminho, schemaId) {
    return this.request(`/arquivos/validar-schema?path=${encodeURIComponent(caminho)}&schema=${encodeURIComponent(schemaId)}`);
  }

  async getCriterios(tarefaId = null) {
    const suffix = tarefaId ? `?tarefaId=${encodeURIComponent(tarefaId)}` : '';
    return this.request(`/criterios${suffix}`);
  }

  async getCriterio(id) {
    return this.request(`/criterios/${id}`);
  }

  async criarCriterio(dados) {
    return this.request('/criterios', { method: 'POST', body: JSON.stringify(dados) });
  }

  async excluirCriterio(id) {
    return this.request(`/criterios/${id}`, { method: 'DELETE' });
  }

  async getResultados(tarefaId = null) {
    const suffix = tarefaId ? `?tarefaId=${encodeURIComponent(tarefaId)}` : '';
    return this.request(`/resultados${suffix}`);
  }

  async getResultado(id) {
    return this.request(`/resultados/${id}`);
  }

  async criarResultado(dados) {
    return this.request('/resultados', { method: 'POST', body: JSON.stringify(dados) });
  }

  async atualizarResultado(id, dados) {
    return this.request(`/resultados/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
  }

  async excluirResultado(id) {
    return this.request(`/resultados/${id}`, { method: 'DELETE' });
  }

  async getArtefatos(tarefaId = null) {
    const suffix = tarefaId ? `?tarefaId=${encodeURIComponent(tarefaId)}` : '';
    return this.request(`/artefatos${suffix}`);
  }

  async getArtefato(id) {
    return this.request(`/artefatos/${id}`);
  }

  async getArtefatoVersoes(id) {
    return this.request(`/artefatos/${id}/versoes`);
  }

  async criarArtefato(dados) {
    return this.request('/artefatos', { method: 'POST', body: JSON.stringify(dados) });
  }

  async excluirArtefato(id) {
    return this.request(`/artefatos/${id}`, { method: 'DELETE' });
  }

  async getHandoffs(agenteId = null) {
    const suffix = agenteId ? `?agenteId=${encodeURIComponent(agenteId)}` : '';
    return this.request(`/handoffs${suffix}`);
  }

  async getHandoff(id) {
    return this.request(`/handoffs/${id}`);
  }

  async criarHandoff(dados) {
    return this.request('/handoffs', { method: 'POST', body: JSON.stringify(dados) });
  }

  async atualizarHandoff(id, dados) {
    return this.request(`/handoffs/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
  }

  async excluirHandoff(id) {
    return this.request(`/handoffs/${id}`, { method: 'DELETE' });
  }

  async getPendencias(tarefaId = null) {
    const suffix = tarefaId ? `?tarefaId=${encodeURIComponent(tarefaId)}` : '';
    return this.request(`/pendencias${suffix}`);
  }

  async getPendencia(id) {
    return this.request(`/pendencias/${id}`);
  }

  async criarPendencia(dados) {
    return this.request('/pendencias', { method: 'POST', body: JSON.stringify(dados) });
  }

  async resolverPendencia(id, resolucao) {
    return this.request(`/pendencias/${id}/resolver`, { method: 'PUT', body: JSON.stringify({ resolucao }) });
  }

  async atualizarPendencia(id, dados) {
    return this.request(`/pendencias/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
  }

  async excluirPendencia(id) {
    return this.request(`/pendencias/${id}`, { method: 'DELETE' });
  }

  async getValidacoes() {
    return this.request('/validacoes');
  }

  async getValidacao(id) {
    return this.request(`/validacoes/${id}`);
  }

  async criarValidacao(dados) {
    return this.request('/validacoes', { method: 'POST', body: JSON.stringify(dados) });
  }

  async aprovarValidacao(id) {
    return this.request(`/validacoes/${id}/aprovar`, { method: 'PUT' });
  }

  async rejeitarValidacao(id) {
    return this.request(`/validacoes/${id}/rejeitar`, { method: 'PUT' });
  }

  async excluirValidacao(id) {
    return this.request(`/validacoes/${id}`, { method: 'DELETE' });
  }

  async getConflitos() {
    return this.request('/conflitos');
  }

  async getConflito(id) {
    return this.request(`/conflitos/${id}`);
  }

  async criarConflito(dados) {
    return this.request('/conflitos', { method: 'POST', body: JSON.stringify(dados) });
  }

  async resolverConflito(id, resolucao) {
    return this.request(`/conflitos/${id}/resolver`, { method: 'PUT', body: JSON.stringify({ resolucao }) });
  }

  async excluirConflito(id) {
    return this.request(`/conflitos/${id}`, { method: 'DELETE' });
  }

  async getReservas(agenteId = null) {
    const suffix = agenteId ? `?agenteId=${encodeURIComponent(agenteId)}` : '';
    return this.request(`/reservas${suffix}`);
  }

  async getReserva(id) {
    return this.request(`/reservas/${id}`);
  }

  async criarReserva(dados) {
    return this.request('/reservas', { method: 'POST', body: JSON.stringify(dados) });
  }

  async liberarReserva(id) {
    return this.request(`/reservas/${id}/liberar`, { method: 'PUT' });
  }

  async excluirReserva(id) {
    return this.request(`/reservas/${id}`, { method: 'DELETE' });
  }

  async getSessoes() {
    return this.request('/sessoes');
  }

  async getSessao(id) {
    return this.request(`/sessoes/${id}`);
  }

  async iniciarSessao(dados) {
    return this.request('/sessoes', { method: 'POST', body: JSON.stringify(dados) });
  }

  async finalizarSessao(id, dados) {
    return this.request(`/sessoes/${id}/finalizar`, { method: 'PUT', body: JSON.stringify(dados) });
  }

  async excluirSessao(id) {
    return this.request(`/sessoes/${id}`, { method: 'DELETE' });
  }

  async getCheckpoints(tarefaId = null) {
    const suffix = tarefaId ? `?tarefaId=${encodeURIComponent(tarefaId)}` : '';
    return this.request(`/checkpoints${suffix}`);
  }

  async getCheckpoint(id) {
    return this.request(`/checkpoints/${id}`);
  }

  async criarCheckpoint(dados) {
    return this.request('/checkpoints', { method: 'POST', body: JSON.stringify(dados) });
  }

  async excluirCheckpoint(id) {
    return this.request(`/checkpoints/${id}`, { method: 'DELETE' });
  }

  async getAprendizados() {
    return this.request('/aprendizados');
  }

  async getAprendizado(id) {
    return this.request(`/aprendizados/${id}`);
  }

  async criarAprendizado(dados) {
    return this.request('/aprendizados', { method: 'POST', body: JSON.stringify(dados) });
  }

  async excluirAprendizado(id) {
    return this.request(`/aprendizados/${id}`, { method: 'DELETE' });
  }

  async getDependencias(fonteId = null, destinoId = null) {
    let suffix = '';
    if (fonteId) suffix = `?fonteId=${encodeURIComponent(fonteId)}`;
    else if (destinoId) suffix = `?destinoId=${encodeURIComponent(destinoId)}`;
    return this.request(`/dependencias${suffix}`);
  }

  async getDependencia(id) {
    return this.request(`/dependencias/${id}`);
  }

  async criarDependencia(dados) {
    return this.request('/dependencias', { method: 'POST', body: JSON.stringify(dados) });
  }

  async excluirDependencia(id) {
    return this.request(`/dependencias/${id}`, { method: 'DELETE' });
  }

  async getResponsabilidades(agenteId = null, alvoId = null) {
    let suffix = '';
    if (agenteId) suffix = `?agenteId=${encodeURIComponent(agenteId)}`;
    else if (alvoId) suffix = `?alvoId=${encodeURIComponent(alvoId)}`;
    return this.request(`/responsabilidades${suffix}`);
  }

  async getResponsabilidade(id) {
    return this.request(`/responsabilidades/${id}`);
  }

  async criarResponsabilidade(dados) {
    return this.request('/responsabilidades', { method: 'POST', body: JSON.stringify(dados) });
  }

  async excluirResponsabilidade(id) {
    return this.request(`/responsabilidades/${id}`, { method: 'DELETE' });
  }

  async getEstadoProjeto() {
    return this.request('/estado-projeto');
  }

  async getIntegridade() {
    return this.request('/integridade');
  }

  async getMonitor() {
    return this.request('/monitor');
  }

  async getDecisoes() {
    return this.request('/decisoes');
  }

  async getRiscos() {
    return this.request('/riscos');
  }

  async getBloqueios() {
    return this.request('/bloqueios');
  }

  async criarDecisao(dados) {
    return this.request('/decisoes', { method: 'POST', body: JSON.stringify(dados) });
  }

  async criarRisco(dados) {
    return this.request('/riscos', { method: 'POST', body: JSON.stringify(dados) });
  }

  async criarBloqueio(dados) {
    return this.request('/bloqueios', { method: 'POST', body: JSON.stringify(dados) });
  }
}

const api = new ApiClient();

export { api };
