// .kilo/plugin/agentmap-wakeup.ts
//
// Plugin oficial do Kilo Code — roda DENTRO do mesmo processo do `kilo serve`
// (tanto na extensão VS Code quanto na CLI). Não é um script externo.
//
// Arquitetura: máquina de estados por sessão, com isolamento real via cursor
// `projectId:sessionId` e detecção de sessoes-filhas para exclusao de wake-up.
//
// Limitacao conhecida: o contrato `MensagemMonitoramento` do AgentMap nao possui
// `sessionId`/`sessionIdDestino`. O plugin retorna mensagens sem filtro de
// destinatario por sessao — o isolamento completo depende de alteracao futura
// no backend para adicionar esse campo.

import type { Plugin, PluginInput } from "@kilocode/plugin";

// Node built-ins disponíveis no runtime do plugin
const childProcess = (globalThis as any).require?.("child_process") || (globalThis as any).process?.env?.NODE_CHILD_PROCESS;

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const AGENTMAP_API_URL = (globalThis as any).process?.env?.AGENTMAP_API_URL || "http://localhost:3150";
const AGENTMAP_API_KEY = (globalThis as any).process?.env?.AGENTMAP_API_KEY || "";
const DEBOUNCE_MS = Number((globalThis as any).process?.env?.AGENTMAP_WAKEUP_DEBOUNCE_MS || "3000");
const HEARTBEAT_INTERVAL_MS = Number((globalThis as any).process?.env?.AGENTMAP_WAKEUP_HEARTBEAT_MS || String(2 * 60 * 1000));
const HEARTBEAT_PROMPT = (globalThis as any).process?.env?.AGENTMAP_WAKEUP_HEARTBEAT_PROMPT || "";
const RECOVERY_COOLDOWN_MS = 5 * 60 * 1000;
const INTERRUPT_CLEANUP_MS = 5 * 60 * 1000;
const CONFIRM_TIMEOUT_MS = Number((globalThis as any).process?.env?.AGENTMAP_WAKEUP_CONFIRM_MS || "10000");
const MEMORIA_ENVIO_THRESHOLD = 3;
const MEMORIA_ENVIO_RESET_MS = Number((globalThis as any).process?.env?.AGENTMAP_WAKEUP_MEMORIA_RESET_MS || String(5 * 60 * 1000));

const HEALTH_CHECK_INTERVAL_MS = Number((globalThis as any).process?.env?.AGENTMAP_HEALTH_CHECK_INTERVAL_MS || String(15 * 1000));
const HTTP_TIMEOUT_MS = Number((globalThis as any).process?.env?.AGENTMAP_HTTP_TIMEOUT_MS || String(8000));
const HTTP_RESTART_RETRY_MS = Number((globalThis as any).process?.env?.AGENTMAP_HTTP_RESTART_RETRY_MS || String(5000));
const MCP_RECONNECT_INTERVAL_MS = Number((globalThis as any).process?.env?.AGENTMAP_MCP_RECONNECT_MS || String(10000));
const BACKEND_DIR = (globalThis as any).process?.env?.AGENTMAP_BACKEND_DIR || "backend";
const AGENT_MAP_INSTANCE_ID = `agentmap-${Date.now()}`;

const MCP_SERVER_NAME = "agentmap";

const RESPONSE_LIMIT_PROMPT =
  "ERRO DE Limite de resposta atingido antes da conclusão, CONTINUE DE ONDE PAROU";

const TIPOS_RELEVANTES = new Set([
  "KILO_CHAT_REPLY", "KILO_REPLY", "KILO_RESULT", "KILO_CHAT", "WAKEUP_PARENT",
  "HANDOFF_CRIADO", "HANDOFF_ACEITO", "HANDOFF_CONCLUIDO",
  "SOLICITACAO_CRIADA", "SOLICITACAO_APROVADA", "SOLICITACAO_REJEITADA",
  "SOLICITACAO_EXCLUIDA", "SOLICITACAO_ALTERADA",
  "TAREFA_CRIADA", "TAREFA_ATRIBUIDA", "TAREFA_INICIADA", "TAREFA_CONCLUIDA",
  "TAREFA_CANCELADA", "TAREFA_BLOQUEADA", "TAREFA_DESBLOQUEADA",
  "TAREFA_ESTADO_ALTERADO", "TAREFA_EXCLUIDA", "TAREFA_RECONCILIADA",
  "BLOQUEIO_CRIADO", "BLOQUEIO_RESOLVIDO", "CONFLITO_CRIADO", "CONFLITO_RESOLVIDO",
  "RESULTADO_REGISTRADO", "ARTEFATO_CRIADO", "VALIDACAO_INICIADA", "VALIDACAO_CONCLUIDA",
  "RESERVA_CRIADA", "RESERVA_LIBERADA", "SESSAO_INICIADA", "SESSAO_FINALIZADA",
  "CHECKPOINT_CRIADO", "APRENDIZADO_REGISTRADO", "PENDENCIA_CRIADA", "PENDENCIA_RESOLVIDA",
  "DEPENDENCIA_CRIADA", "DECISAO_CRIADA", "DECISAO_ATUALIZADA",
  "RISCO_CRIADO", "RISCO_ATUALIZADO", "RESPONSABILIDADE_REGISTRADA",
  "ARQUIVO_ALTERADO", "ARQUIVO_EXCLUIDO", "APROVACAO_SOLICITADA",
  "APROVACAO_CONCEDIDA", "APROVACAO_REJEITADA", "IMPLANTACAO_REALIZADA",
  "SEGURANCA_VIOLACAO", "BACKUP_CRIADO", "CONTRATO_CRIADO", "CONTRATO_ALTERADO",
  "CONTRATO_EXCLUIDO", "CONTRATO_VALIDADO", "CONTRATO_INVALIDO",
  "TESTE_EXECUTADO", "REVISAO_REALIZADA", "MODO_GLOBAL_ALTERADO",
  "MODO_AGENTE_ALTERADO", "STATUS_AGENTE_ATUALIZADO", "MODO_AUTONOMIA_ALTERADO",
  "INSTANCIA_REGISTRADA", "INSTANCIA_CONECTADA", "INSTANCIA_DESCONECTADA",
  "INSTANCIA_ERRO", "INSTANCIA_ATUALIZADA", "INSTANCIA_EXCLUIDA",
  "PROJETO_CRIADO", "PROJETO_ABERTO", "AGENTE_CRIADO", "AGENTE_ATUALIZADO",
  "AGENTE_EXCLUIDO", "INTERVENCAO_MANUAL", "REGRAS_RESPEITADAS",
  "CONTATO_CRIADO", "CONTATO_ATUALIZADO", "CONTATO_EXCLUIDO",
  "EVENTO_CRIADO", "EVENTO_CONSUMIDO", "BROADCAST_ANUNCIO",
  "INTEGRIDADE_VERIFICADA", "INTEGRIDADE_FALHA", "COMANDO_USUARIO",
  "INTERVENCAO_USUARIO", "MODO_ALTERADO", "AGENTE_STATUS_ALTERADO", "ATUALIZAR_STATUS",
]);

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type SessionStatus = "idle" | "busy" | "retry" | "unknown";
type Operacao = "idle" | "wakeup" | "recovery" | "heartbeat" | "continue";

interface SessionWakeupState {
  sessionId: string;
  projectId: string;
  isChildSession: boolean;
  parentId: string | null;
  status: SessionStatus;
  cursorEventSequence: number;
  operacaoEmAndamento: Operacao;
  recoveryAtivo: boolean;
  outputLimitHit: boolean;
  stepFinishReason: string | null;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  recoveryTimer: ReturnType<typeof setTimeout> | null;
  interruptCleanupTimer: ReturnType<typeof setTimeout> | null;
  confirmTimer: ReturnType<typeof setTimeout> | null;
  memoriaEnvio: MemoriaEnvioMensagem;
  ultimoHeartbeatPrompt: string;
  memoriaResetTimer: ReturnType<typeof setTimeout> | null;
}

interface MemoriaEnvioMensagem {
  [tipoConteudo: string]: number;
}

interface MensagemPendente {
  id: string;
  agenteOrigem?: string;
  emissor?: string;
  resumo?: string;
  conteudo?: string;
  eventSequence?: number;
  tipo?: string;
}

type McpServerStatus = "connected" | "failed" | "disabled" | "needs_auth" | "unknown";

interface ConexaoSaudavelState {
  mcpDesconectado: boolean;
  httpDesconectado: boolean;
  mcpStatus: McpServerStatus;
  ultimaVerificacao: number;
  tentativaReconexaoMcp: number;
  tentativaRestartHttp: number;
  healthTimer: ReturnType<typeof setInterval> | null;
  sseAtivo: boolean;
  backendProcessoIniciado: boolean;
}

interface SseEvent {
  type: string;
  properties?: Record<string, any>;
  data?: Record<string, any>;
  [key: string]: unknown;
}

// Tipos para resposta do AgentMap /api/estado-projeto
interface EstatisticasItem {
  pendentes: number;
  concluidas?: number;
  emExecucao?: number;
  bloqueadas?: number;
  total?: number;
  aprovadas?: number;
  rejeitadas?: number;
}

interface BloqueioItem {
  estado: string;
  // outros campos conforme necessário
}

interface ValidacoesItem {
  pendentes: number;
  aprovadas?: number;
  reprovadas?: number;
  total?: number;
}

interface EstadoProjetoDados {
  projetoId?: string;
  versao?: string;
  estado?: string;
  resumo?: string;
  tarefas: EstatisticasItem;
  solicitacoes: EstatisticasItem;
  artefatos?: { total: number; ativos: number };
  handoffs: EstatisticasItem;
  bloqueios: BloqueioItem[];
  conflitos?: { total: number; abertos: number };
  riscos?: { total: number; ativos: number; criticos: number };
  validacoes: ValidacoesItem;
  reservas?: { total: number; ativas: number };
  checkpoints?: { total: number; recentes: number };
  sessoes?: { total: number; ativas: number };
  aprendizados?: { total: number; ativos: number };
  integridade?: {
    ultimaVerificacao: string;
    inconsistencias: number;
  };
  datas?: {
    atualizadaEm: string;
  };
}

interface EstadoProjetoResponse {
  sucesso: boolean;
  dados: EstadoProjetoDados | EstadoProjetoDados[] | Record<string, unknown>;
  // Outros campos possíveis
}

// ---------------------------------------------------------------------------
// Estado global do plugin
// ---------------------------------------------------------------------------

const sessoes = new Map<string, SessionWakeupState>();
let projectIdGlobal: string | null = null;

const conexaoSaudavel: ConexaoSaudavelState = {
  mcpDesconectado: false,
  httpDesconectado: false,
  mcpStatus: "unknown",
  ultimaVerificacao: 0,
  tentativaReconexaoMcp: 0,
  tentativaRestartHttp: 0,
  healthTimer: null,
  sseAtivo: false,
  backendProcessoIniciado: false,
};

function chaveSessao(projectId: string, sessionId: string): string {
  return `${projectId}:${sessionId}`;
}

function obterEstado(projectId: string, sessionId: string): SessionWakeupState | undefined {
  return sessoes.get(chaveSessao(projectId, sessionId));
}

function obterOuCriarEstado(projectId: string, sessionId: string): SessionWakeupState {
  const key = chaveSessao(projectId, sessionId);
  let estado = sessoes.get(key);
  if (!estado) {
      estado = {
        sessionId,
        projectId,
        isChildSession: false,
        parentId: null,
        status: "unknown",
        cursorEventSequence: 0,
        operacaoEmAndamento: "idle",
        recoveryAtivo: false,
        outputLimitHit: false,
        stepFinishReason: null,
        debounceTimer: null,
        heartbeatTimer: null,
        recoveryTimer: null,
        interruptCleanupTimer: null,
        confirmTimer: null,
        memoriaEnvio: {},
        ultimoHeartbeatPrompt: "",
        memoriaResetTimer: null,
      };
    sessoes.set(key, estado);
  }
  return estado;
}

function estaOcupado(estado: SessionWakeupState): boolean {
  return estado.status === "busy" || estado.status === "retry";
}

function ehSessaoFilha(estado: SessionWakeupState): boolean {
  return estado.isChildSession;
}

// ---------------------------------------------------------------------------
// Log em arquivo
// ---------------------------------------------------------------------------

async function logEmArquivo(directory: string, mensagem: string) {
  try {
    const { promises } = await import("fs");
    const { join } = await import("path");
    const logDir = join(directory, ".ia", "contexto");
    const logPath = join(logDir, "agentmap-wakeup.log");
    const linha = `${new Date().toISOString()} ${mensagem}\n`;
    await promises.mkdir(logDir, { recursive: true });
    await promises.appendFile(logPath, linha, "utf-8");
  } catch {
    // silencioso
  }
}

// ---------------------------------------------------------------------------
// Consulta ao AgentMap
// ---------------------------------------------------------------------------

async function buscarMensagensPendentes(estado: SessionWakeupState, projetoId: string): Promise<MensagemPendente[]> {
  const url = new URL("/api/monitoramento/mensagens", AGENTMAP_API_URL);
  url.searchParams.set("limite", "50");
  if (estado.cursorEventSequence > 0) {
    url.searchParams.set("after", String(estado.cursorEventSequence));
  }
  if (projetoId) {
    url.searchParams.set("projetoId", projetoId);
  }

  let res: Response;
  try {
    res = await fetchComTimeout(url.toString(), {
      headers: AGENTMAP_API_KEY ? { "x-api-key": AGENTMAP_API_KEY } : undefined,
    });
  } catch (err) {
    console.warn(`[agentmap-wakeup] HTTP falhou ao buscar mensagens (backend provavelmente desconectado): ${err}`);
    return [];
  }

  if (!res.ok) {
    console.error(`[agentmap-wakeup] AgentMap respondeu ${res.status} em ${url}`);
    return [];
  }

  const body = (await res.json()) as Record<string, unknown>;
  const raw = Array.isArray(body?.dados)
    ? body.dados
    : Array.isArray(body?.mensagens)
      ? body.mensagens
      : [];

  const mensagens: MensagemPendente[] = raw.filter((item) => {
    const obj = item as Partial<MensagemPendente>;
    return typeof obj.eventSequence === "number" && TIPOS_RELEVANTES.has(obj.tipo || "");
  });

  const novas = mensagens.filter(
    (m) => typeof m.eventSequence === "number" && m.eventSequence > estado.cursorEventSequence
  );

  if (novas.length > 0) {
    estado.cursorEventSequence = Math.max(estado.cursorEventSequence, ...novas.map((m) => m.eventSequence || 0));
  }

  return novas;
}

function montarResumo(mensagens: MensagemPendente[]): string {
  const linhas = mensagens.map(
    (m) => `- [${m.agenteOrigem || m.emissor || "agente"}] ${m.resumo || m.conteudo || m.id}`
  );
  return (
    `Novas atualizações no AgentMap enquanto você estava ocioso:\n` +
    linhas.join("\n") +
    `\n\nConsulte o AgentMap para os detalhes completos antes de prosseguir.`
  );
}

async function montarHeartbeatPrompt(): Promise<string> {
  try {
    const url = new URL("/api/estado-projeto", AGENTMAP_API_URL);
    const res = await fetchComTimeout(url.toString(), {
      headers: AGENTMAP_API_KEY ? { "x-api-key": AGENTMAP_API_KEY } : undefined,
    });
    if (!res.ok) return "";
    const body = (await res.json()) as Record<string, unknown>;
    const dados = body?.dados as EstadoProjetoDados | undefined;
    if (!dados) return "";

    const partes: string[] = [];
    if (Number(dados.tarefas?.pendentes || 0) > 0) partes.push(`${dados.tarefas.pendentes} tarefa(s) pendente(s)`);
    if (Number(dados.solicitacoes?.pendentes || 0) > 0) partes.push(`${dados.solicitacoes.pendentes} solicitação(ões) aguardando`);
    if (Number(dados.handoffs?.pendentes || 0) > 0) partes.push(`${dados.handoffs.pendentes} handoff(s) em andamento`);
    const bloqueiosAtivos = Array.isArray(dados.bloqueios) ? dados.bloqueios.filter((b) => b.estado === "ATIVO").length : 0;
    if (bloqueiosAtivos > 0) partes.push(`${bloqueiosAtivos} bloqueio(s) ativo(s)`);
    if (Number(dados.validacoes?.pendentes || 0) > 0) partes.push(`${dados.validacoes.pendentes} validação(ões) pendente(s)`);

    if (partes.length === 0) return "";

    return (
      `⚠️ Heartbeat AgentMap — há trabalho pendente no projeto:\n` +
      partes.map((p) => `• ${p}`).join("\n") +
      `\n\n👉 Para ver o que é seu, use as tools MCP do AgentMap:\n` +
      `• agentmap_tarefas_listar → filtra por responsável\n` +
      `• agentmap_handoffs_listar → filtra por destino (seu agenteId)\n` +
      `• agentmap_sessao_atual → descubra seu agenteId\n\n` +
      `✅ Se nada for seu → ignore este aviso.\n` +
      `📝 Se for seu → atualize via agentmap_tarefas_atualizar ou agentmap_handoffs_atualizar.`
    );
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Feature detection do método de prompt
// ---------------------------------------------------------------------------

function getPromptMethod(client: PluginInput["client"]): ((args: any) => Promise<any>) | null {
  const metodo = client.session as any;
  if (typeof metodo.prompt === "function") return metodo.prompt.bind(metodo);
  if (typeof metodo.promptAsync === "function") return metodo.promptAsync.bind(metodo);
  return null;
}

// ---------------------------------------------------------------------------
// Injeção de prompt (wake-up, heartbeat, recovery)
// ---------------------------------------------------------------------------

async function injetarPrompt(
  sessionId: string,
  client: PluginInput["client"],
  directory: string,
  texto: string,
  tipo: Operacao,
  estado: SessionWakeupState
): Promise<boolean> {
  const metodo = getPromptMethod(client);
  if (!metodo) {
    console.error("[agentmap-wakeup] Nenhum método de prompt disponível no SDK");
    return false;
  }

  if (estaOcupado(estado)) {
    console.log(`[agentmap-wakeup] ${tipo} suprimido (sessao ocupada - status=${estado.status}): sessao ${sessionId}`);
    await logEmArquivo(directory, `[agentmap-wakeup] ${tipo} suprimido (sessao ocupada): sessao ${sessionId}`);
    return false;
  }

  if (estado.operacaoEmAndamento !== "idle") {
    console.log(`[agentmap-wakeup] ${tipo} suprimido (operação em andamento: ${estado.operacaoEmAndamento}): sessao ${sessionId}`);
    await logEmArquivo(directory, `[agentmap-wakeup] ${tipo} suprimido (operação em andamento): sessao ${sessionId}`);
    return false;
  }

  estado.operacaoEmAndamento = tipo;

  try {
    await metodo({
      path: { id: sessionId },
      body: { parts: [{ type: "text", text: texto }] },
    });

    const confirmStart = Date.now();
    const esperarConfirmacao = new Promise<boolean>((resolve) => {
      const check = () => {
        if (estado.status === "busy") {
          resolve(true);
        } else if (Date.now() - confirmStart > CONFIRM_TIMEOUT_MS) {
          resolve(false);
        } else {
          estado.confirmTimer = setTimeout(check, 200);
        }
      };
      estado.confirmTimer = setTimeout(check, 200);
    });

    const confirmado = await esperarConfirmacao;
    if (!confirmado) {
      console.log(`[agentmap-wakeup] ${tipo}: entrega nao confirmada em ${CONFIRM_TIMEOUT_MS}ms para sessao ${sessionId}`);
      await logEmArquivo(directory, `[agentmap-wakeup] ${tipo}: entrega nao confirmada: sessao ${sessionId}`);
    }

    return true;
  } catch (err) {
    console.error(`[agentmap-wakeup] Falha em ${tipo}:`, err);
    await logEmArquivo(directory, `[agentmap-wakeup] Falha em ${tipo}: ${err}`);
    return false;
  } finally {
    if (estado.confirmTimer) {
      clearTimeout(estado.confirmTimer);
      estado.confirmTimer = null;
    }
    estado.operacaoEmAndamento = "idle";
  }
}

// ---------------------------------------------------------------------------
// Wake-up (verificação pós-idle)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Memória de envio — anti-loop por mensagem repetida
// ---------------------------------------------------------------------------

function gerarChaveMemoria(mensagem: MensagemPendente): string {
  const tipo = mensagem.tipo || "DESCONHECIDO";
  const conteudo = mensagem.resumo || mensagem.conteudo || mensagem.id || "";
  return `${tipo}:${conteudo}`;
}

function atualizarMemoriaEnvio(estado: SessionWakeupState, mensagens: MensagemPendente[]): { repetido: boolean; conteudoMudou: boolean } {
  const chavesAtuais = new Set(mensagens.map(gerarChaveMemoria));
  const chavesAnteriores = new Set(Object.keys(estado.memoriaEnvio));
  const conteudoMudou = chavesAtuais.size > 0 && [...chavesAtuais].some((chave) => !chavesAnteriores.has(chave));

  for (const chave of Object.keys(estado.memoriaEnvio)) {
    if (!chavesAtuais.has(chave)) {
      delete estado.memoriaEnvio[chave];
    }
  }

  for (const chave of chavesAtuais) {
    estado.memoriaEnvio[chave] = (estado.memoriaEnvio[chave] || 0) + 1;
  }

  const repetido = Object.values(estado.memoriaEnvio).some((count) => count >= MEMORIA_ENVIO_THRESHOLD);
  return { repetido, conteudoMudou };
}

function resetarMemoriaEnvio(estado: SessionWakeupState): void {
  estado.memoriaEnvio = {};
}

function pararMemoriaResetTimer(estado: SessionWakeupState): void {
  if (estado.memoriaResetTimer) {
    clearTimeout(estado.memoriaResetTimer);
    estado.memoriaResetTimer = null;
  }
}

function agendarMemoriaReset(estado: SessionWakeupState, directory: string): void {
  pararMemoriaResetTimer(estado);
  estado.memoriaResetTimer = setTimeout(() => {
    resetarMemoriaEnvio(estado);
    estado.memoriaResetTimer = null;
    console.log(`[agentmap-wakeup] Memoria de envio resetada por timeout: ${estado.sessionId}`);
    logEmArquivo(directory, `[agentmap-wakeup] Memoria de envio resetada por timeout: ${estado.sessionId}`);
  }, MEMORIA_ENVIO_RESET_MS);
}

async function executarWakeup(estado: SessionWakeupState, client: PluginInput["client"], directory: string) {
  if (ehSessaoFilha(estado)) {
    console.log(`[agentmap-wakeup] Wake-up suprimido (sessao-filha): ${estado.sessionId}`);
    return;
  }
  if (estaOcupado(estado)) {
    console.log(`[agentmap-wakeup] Verificacao suprimida (ocupado): sessao ${estado.sessionId}`);
    await logEmArquivo(directory, `[agentmap-wakeup] Verificacao suprimida (ocupado): sessao ${estado.sessionId}`);
    return;
  }

  const pendentes = await buscarMensagensPendentes(estado, estado.projectId);
  if (pendentes.length === 0) {
    console.log(`[agentmap-wakeup] Nenhuma mensagem pendente para session ${estado.sessionId}`);
    await logEmArquivo(directory, `[agentmap-wakeup] Nenhuma mensagem pendente para session ${estado.sessionId}`);
    return;
  }

  const { repetido, conteudoMudou } = atualizarMemoriaEnvio(estado, pendentes);
  if (repetido) {
    const tiposRepetidos = Object.entries(estado.memoriaEnvio)
      .filter(([, count]) => count >= MEMORIA_ENVIO_THRESHOLD)
      .map(([chave]) => chave.split(":")[0]);
    const log = `[agentmap-wakeup] Wake-up suprimido (memoria de envio): mensagem repetida ${MEMORIA_ENVIO_THRESHOLD}x na sessao ${estado.sessionId}. Tipos: ${tiposRepetidos.join(", ")}`;
    console.log(log);
    await logEmArquivo(directory, log);
    agendarMemoriaReset(estado, directory);
    return;
  }

  if (conteudoMudou) {
    resetarMemoriaEnvio(estado);
    pararMemoriaResetTimer(estado);
    const logMudou = `[agentmap-wakeup] Memoria de envio resetada (conteudo mudou): ${estado.sessionId}`;
    console.log(logMudou);
    await logEmArquivo(directory, logMudou);
  }

  const resumo = montarResumo(pendentes);
  console.log(`[agentmap-wakeup] Injetando wake-up na sessão ${estado.sessionId}:\n${resumo}`);
  await logEmArquivo(directory, `[agentmap-wakeup] Injetando wake-up na sessao ${estado.sessionId}`);

  await injetarPrompt(estado.sessionId, client, directory, resumo, "wakeup", estado);
}

async function agendarVerificacao(
  projectId: string,
  sessionId: string,
  client: PluginInput["client"],
  directory: string
) {
  const estado = obterOuCriarEstado(projectId, sessionId);

  if (estado.debounceTimer) {
    clearTimeout(estado.debounceTimer);
  }

  const log = `[agentmap-wakeup] Verificacao agendada para session ${sessionId} em ${DEBOUNCE_MS}ms`;
  console.log(log);
  await logEmArquivo(directory, log);

  estado.debounceTimer = setTimeout(async () => {
    estado.debounceTimer = null;
    await executarWakeup(estado, client, directory);
  }, DEBOUNCE_MS);
}

// ---------------------------------------------------------------------------
// Recovery
// ---------------------------------------------------------------------------

async function injetarRecovery(
  projectId: string,
  sessionId: string,
  client: PluginInput["client"],
  directory: string
) {
  const estado = obterOuCriarEstado(projectId, sessionId);

  if (estaOcupado(estado)) {
    console.log(`[agentmap-wakeup] Recovery suprimido (sessao ocupada): sessao ${sessionId}`);
    await logEmArquivo(directory, `[agentmap-wakeup] Recovery suprimido (sessao ocupada): sessao ${sessionId}`);
    return;
  }

  if (estado.recoveryAtivo) {
    console.log(`[agentmap-wakeup] Recovery suprimido (cooldown ativo): sessao ${sessionId}`);
    return;
  }

  const promptRecovery = "Ocorreu um erro no sistema. Nao tente resolver agora. Apenas continue sua tarefa de onde parou e, se precisar se autoidentificar, use as tools do MCP, rotas de API ou documentos do Agent Map.";

  const sucesso = await injetarPrompt(sessionId, client, directory, promptRecovery, "recovery", estado);
  if (!sucesso) return;

  estado.recoveryAtivo = true;

  if (estado.recoveryTimer) {
    clearTimeout(estado.recoveryTimer);
  }
  estado.recoveryTimer = setTimeout(() => {
    estado.recoveryAtivo = false;
    estado.recoveryTimer = null;
  }, RECOVERY_COOLDOWN_MS);
}

// ---------------------------------------------------------------------------
// Heartbeat
// ---------------------------------------------------------------------------

async function temTrabalhoPendente(): Promise<boolean> {
  try {
    const url = new URL("/api/estado-projeto", AGENTMAP_API_URL);
    const res = await fetchComTimeout(url.toString(), {
      headers: AGENTMAP_API_KEY ? { "x-api-key": AGENTMAP_API_KEY } : undefined,
    });

    if (!res.ok) return true;

    const body = (await res.json()) as Record<string, unknown>;
    const dados = (body?.dados || body) as Record<string, unknown> | undefined;
    if (!dados) return true;

    const tarefas = (dados.tarefas || {}) as Record<string, number>;
    const temTarefa =
      Number(tarefas.pendentes || 0) > 0 ||
      Number(tarefas.emExecucao || 0) > 0 ||
      Number(tarefas.bloqueadas || 0) > 0;

    const solicitacoes = (dados.solicitacoes || {}) as Record<string, number>;
    const temSolicitacao = Number(solicitacoes.pendentes || 0) > 0;

    const handoffs = (dados.handoffs || {}) as Record<string, number>;
    const temHandoff = Number(handoffs.pendentes || 0) > 0;

    const bloqueios = Array.isArray(dados.bloqueios) ? dados.bloqueios : [];
    const temBloqueio = bloqueios.some((b: any) => b.estado === "ATIVO");

    const validacoes = (dados.validacoes || {}) as Record<string, number>;
    const temValidacao = Number(validacoes.pendentes || 0) > 0;

    return temTarefa || temSolicitacao || temHandoff || temBloqueio || temValidacao;
  } catch {
    return true;
  }
}

async function cicloHeartbeat(
  projectId: string,
  sessionId: string,
  client: PluginInput["client"],
  directory: string
) {
  const estado = obterEstado(projectId, sessionId);
  if (!estado) return;

  if (ehSessaoFilha(estado)) {
    pararHeartbeat(projectId, sessionId, directory);
    return;
  }

  const pendentes = await buscarMensagensPendentes(estado, estado.projectId);
  if (pendentes.length > 0) {
    console.log(`[agentmap-wakeup] heartbeat skip: ${pendentes.length} mensagem(ns) pendente(s) para session ${sessionId}`);
    await logEmArquivo(directory, `[agentmap-wakeup] heartbeat skip: ${pendentes.length} mensagens pendentes: sessao ${sessionId}`);
    return;
  }

  const trabalho = await temTrabalhoPendente();
  if (!trabalho) {
    console.log(`[agentmap-wakeup] heartbeat parado: sem trabalho pendente para session ${sessionId}`);
    await logEmArquivo(directory, `[agentmap-wakeup] heartbeat parado: sem trabalho pendente: sessao ${sessionId}`);
    pararHeartbeat(projectId, sessionId, directory);
    return;
  }

  if (estaOcupado(estado)) {
    console.log(`[agentmap-wakeup] heartbeat suprimido (ocupado): sessao ${sessionId}`);
    await logEmArquivo(directory, `[agentmap-wakeup] heartbeat suprimido (ocupado): sessao ${sessionId}`);
    return;
  }

  const prompt = HEARTBEAT_PROMPT || (await montarHeartbeatPrompt());
  if (!prompt) {
    console.log(`[agentmap-wakeup] heartbeat parado: sem prompt para sessao ${sessionId}`);
    await logEmArquivo(directory, `[agentmap-wakeup] heartbeat parado: sem prompt para sessao ${sessionId}`);
    pararHeartbeat(projectId, sessionId, directory);
    return;
  }

  if (estado.ultimoHeartbeatPrompt === prompt) {
    console.log(`[agentmap-wakeup] heartbeat suprimido (prompt repetido): sessao ${sessionId}`);
    await logEmArquivo(directory, `[agentmap-wakeup] heartbeat suprimido (prompt repetido): sessao ${sessionId}`);
    return;
  }

  estado.ultimoHeartbeatPrompt = prompt;
  await injetarPrompt(sessionId, client, directory, prompt, "heartbeat", estado);
}

async function iniciarHeartbeat(
  projectId: string,
  sessionId: string,
  client: PluginInput["client"],
  directory: string
) {
  const estado = obterOuCriarEstado(projectId, sessionId);

  if (estado.heartbeatTimer) {
    clearInterval(estado.heartbeatTimer);
  }

  const log = `[agentmap-wakeup] heartbeat agendado para session ${sessionId} a cada ${HEARTBEAT_INTERVAL_MS}ms`;
  console.log(log);
  logEmArquivo(directory, log);

  estado.heartbeatTimer = setInterval(async () => {
    await cicloHeartbeat(projectId, sessionId, client, directory);
  }, HEARTBEAT_INTERVAL_MS);
}

function pararHeartbeat(projectId: string, sessionId: string, directory: string) {
  const estado = obterEstado(projectId, sessionId);
  if (estado?.heartbeatTimer) {
    clearInterval(estado.heartbeatTimer);
    estado.heartbeatTimer = null;
  }

  const log = `[agentmap-wakeup] heartbeat parado para session ${sessionId}`;
  console.log(log);
  logEmArquivo(directory, log);
}

function limparTimers(estado: SessionWakeupState) {
  if (estado.debounceTimer) {
    clearTimeout(estado.debounceTimer);
    estado.debounceTimer = null;
  }
  if (estado.heartbeatTimer) {
    clearInterval(estado.heartbeatTimer);
    estado.heartbeatTimer = null;
  }
  if (estado.recoveryTimer) {
    clearTimeout(estado.recoveryTimer);
    estado.recoveryTimer = null;
  }
  if (estado.interruptCleanupTimer) {
    clearTimeout(estado.interruptCleanupTimer);
    estado.interruptCleanupTimer = null;
  }
  if (estado.confirmTimer) {
    clearTimeout(estado.confirmTimer);
    estado.confirmTimer = null;
  }
  if (estado.memoriaResetTimer) {
    clearTimeout(estado.memoriaResetTimer);
    estado.memoriaResetTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Health Check & Auto-Reconnection (MCP + HTTP)
// ---------------------------------------------------------------------------

async function fetchComTimeout(url: string, opcoes: RequestInit = {}, timeoutMs: number = HTTP_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opcoes, signal: controller.signal, headers: { ...opcoes.headers } });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function verificarStatusHttp(): Promise<boolean> {
  try {
    const url = new URL("/api/status", AGENTMAP_API_URL);
    const res = await fetchComTimeout(url.toString());
    if (!res.ok) return false;
    const body = await res.json().catch(() => null);
    return body?.sucesso === true && body?.dados?.status === "online";
  } catch {
    return false;
  }
}

async function verificarStatusMcp(client: PluginInput["client"]): Promise<McpServerStatus> {
  const mcpClient = (client as any).mcp;
  if (!mcpClient || typeof mcpClient.status !== "function") {
    return "unknown";
  }
  try {
    const result = await mcpClient.status({ query: { directory: "" } });
    const raw = (result as any)?.data ?? (result as any)?.$outerBody ?? result;
    const serverEntry = (raw as any)?.[MCP_SERVER_NAME];
    const statusCandidate = typeof serverEntry?.status === "string"
      ? serverEntry.status
      : typeof raw?.status === "string"
        ? raw.status
        : "";
    switch (statusCandidate) {
      case "connected":
      case "failed":
      case "disabled":
      case "needs_auth":
      case "unknown":
        return statusCandidate;
      default:
        return "unknown";
    }
  } catch (err) {
    console.warn(`[agentmap-health] Erro ao consultar status MCP: ${err}`);
    return "unknown";
  }
}

async function reconectarMcp(client: PluginInput["client"], directory: string): Promise<boolean> {
  const estado = conexaoSaudavel;
  if (estado.tentativaReconexaoMcp > 0) {
    const elapsed = Date.now() - estado.ultimaVerificacao;
    if (elapsed < MCP_RECONNECT_INTERVAL_MS) return false;
  }

  estado.tentativaReconexaoMcp++;

  try {
    const result = await (client as any).mcp?.connect?.({
      path: { name: MCP_SERVER_NAME },
      query: { directory: "" },
    });
    const sucesso = (result as any)?.data !== false && (result as any)?.data?.success !== false;
    if (sucesso) {
      console.log(`[agentmap-health] MCP reconectado com sucesso (tentativa ${estado.tentativaReconexaoMcp})`);
      await logEmArquivo(directory, `[agentmap-health] MCP reconectado com sucesso (tentativa ${estado.tentativaReconexaoMcp})`);
      estado.tentativaReconexaoMcp = 0;
      estado.mcpDesconectado = false;
      estado.mcpStatus = "connected";
      return true;
    }
    console.error(`[agentmap-health] MCP connect retornou resultado sem sucesso:`, result);
  } catch (err) {
    console.error(`[agentmap-health] MCP connect falhou (tentativa ${estado.tentativaReconexaoMcp}):`, err);
    await logEmArquivo(directory, `[agentmap-health] MCP connect falhou (tentativa ${estado.tentativaReconexaoMcp}): ${err}`);
  }

  try {
    const addResult = await (client as any).mcp?.add?.({
      body: {
        name: MCP_SERVER_NAME,
        config: {
          type: "local",
          command: ["cmd", "/c", "cd", BACKEND_DIR, "&&", "npx", "tsx", "--tsconfig", "backend/tsconfig.json", "backend/src/mcp-server/index.ts"],
          environment: { NODE_ENV: "production" },
          enabled: true,
          timeout: 30000,
        },
      },
      query: { directory: "" },
    });
    if (addResult) {
      console.log(`[agentmap-health] MCP re-add concluido (tentativa ${estado.tentativaReconexaoMcp})`);
      await logEmArquivo(directory, `[agentmap-health] MCP add concluido (tentativa ${estado.tentativaReconexaoMcp})`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const status = await verificarStatusMcp(client);
      if (status === "connected") {
        estado.mcpDesconectado = false;
        estado.mcpStatus = "connected";
        estado.tentativaReconexaoMcp = 0;
        return true;
      }
    }
  } catch (err) {
    console.error(`[agentmap-health] MCP add falhou (tentativa ${estado.tentativaReconexaoMcp}):`, err);
    await logEmArquivo(directory, `[agentmap-health] MCP add falhou: ${err}`);
  }

  return false;
}

async function reiniciarBackend(client: PluginInput["client"], directory: string, ctx: PluginInput): Promise<boolean> {
  if (conexaoSaudavel.tentativaRestartHttp > 0) {
    const elapsed = Date.now() - conexaoSaudavel.ultimaVerificacao;
    if (elapsed < HTTP_RESTART_RETRY_MS) return false;
  }

  conexaoSaudavel.tentativaRestartHttp++;

  try {
    console.log(`[agentmap-health] Reiniciando backend HTTP (tentativa ${conexaoSaudavel.tentativaRestartHttp})...`);
    await logEmArquivo(directory, `[agentmap-health] Reiniciando backend HTTP (tentativa ${conexaoSaudavel.tentativaRestartHttp})`);

    let backendIniciado = false;

    // Tentativa 1: BunShell (se disponível)
    const shell = (ctx as any).$;
    if (typeof shell === "function" && !backendIniciado) {
      try {
        const backendPath = BACKEND_DIR;
        const proc = shell`cd ${backendPath} && npm run dev`;
        if (proc && typeof proc.then === "function") {
          proc.then((output: any) => {
            console.log(`[agentmap-health] Backend stdout: ${output?.text?.()?.slice(0, 200)}`);
          }).catch((err: any) => {
            console.error("[agentmap-health] Backend shell error:", err);
          });
          backendIniciado = true;
        }
      } catch (err) {
        console.warn("[agentmap-health] BunShell falhou, tentando child_process...");
      }
    }

    // Tentativa 2: child_process nativo (fallback para Windows/outros)
    if (!backendIniciado && typeof childProcess?.spawn === "function") {
      try {
        const backendPath = BACKEND_DIR;
        const isWindows = (globalThis as any).process?.platform === "win32";
        const script = isWindows ? "npm.cmd" : "npm";
        const args = ["run", "dev"];
        
        const proc = childProcess.spawn(script, args, {
          cwd: backendPath,
          detached: true,
          stdio: "ignore",
          windowsHide: true,
          env: { ...(globalThis as any).process?.env, NODE_ENV: "production" },
        });
        
        proc.unref();
        backendIniciado = true;
        console.log(`[agentmap-health] Backend iniciado via child_process (PID ${proc.pid})`);
      } catch (err) {
        console.error("[agentmap-health] child_process spawn falhou:", err);
      }
    }

    if (!backendIniciado) {
      console.warn("[agentmap-health] Nenhum metodo de spawn disponivel, restart automatico desabilitado");
      await logEmArquivo(directory, "[agentmap-health] Nenhum metodo de spawn disponivel");
    }

    conexaoSaudavel.backendProcessoIniciado = true;

    const startWait = Date.now();
    while (Date.now() - startWait < 30000) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (await verificarStatusHttp()) {
        console.log(`[agentmap-health] Backend HTTP restaurado (tentativa ${conexaoSaudavel.tentativaRestartHttp})`);
        await logEmArquivo(directory, `[agentmap-health] Backend HTTP restaurado (tentativa ${conexaoSaudavel.tentativaRestartHttp})`);
        conexaoSaudavel.tentativaRestartHttp = 0;
        conexaoSaudavel.httpDesconectado = false;
        return true;
      }
    }

    console.error(`[agentmap-health] Backend HTTP nao respondeu em 30s (tentativa ${conexaoSaudavel.tentativaRestartHttp})`);
    await logEmArquivo(directory, `[agentmap-health] Backend HTTP nao respondeu em 30s (tentativa ${conexaoSaudavel.tentativaRestartHttp})`);
    return false;
  } catch (err) {
    console.error(`[agentmap-health] Erro ao reiniciar backend (tentativa ${conexaoSaudavel.tentativaRestartHttp}):`, err);
    await logEmArquivo(directory, `[agentmap-health] Erro ao reiniciar backend: ${err}`);
    return false;
  }
}

async function notificarRecuperacao(client: PluginInput["client"], directory: string) {
  const projetoId = projectIdGlobal || directory;
  const recoveryPrompt =
    "O sistema AgentMap foi restaurado após uma interrupcao. " +
    "Verifique se suas ferramentas MCP (agentmap_*) estao disponiveis e " +
    "consulte o monitor para quaisquer mensagens pendentes que podem ter sido perdidas. " +
    "Use agentmap_monitoramento_verificar_pendentes para verificar atualizacoes.";

  let count = 0;
  for (const [key, estado] of Array.from(sessoes.entries())) {
    if (ehSessaoFilha(estado)) continue;
    if (estado.status !== "idle" && estado.status !== "unknown") continue;
    if (estado.operacaoEmAndamento !== "idle") continue;

    const sucesso = await injetarPrompt(estado.sessionId, client, directory, recoveryPrompt, "recovery", estado);
    if (sucesso) {
      console.log(`[agentmap-health] Recovery prompt injetado na sessao idle: ${estado.sessionId}`);
      await logEmArquivo(directory, `[agentmap-health] Recovery prompt injetado na sessao idle: ${estado.sessionId}`);
      count++;
    }
  }

  if (count > 0) {
    console.log(`[agentmap-health] Recovery notificado para ${count} sessao(s) idle(s)`);
    await logEmArquivo(directory, `[agentmap-health] Recovery notificado para ${count} sessao(s) idle(s)`);
  }
}

async function notificarDesconexao(client: PluginInput["client"], directory: string, motivo: string) {
  const recoveryPrompt =
    `URGENTE: Conexao AgentMap interrompida (${motivo}).\n` +
    "O MCP server ou HTTP backend nao esta disponivel. " +
    "Aguarde alguns segundos - o plugin de wake-up esta tentando reconectar automaticamente. " +
    "Nao tente usar ferramentas agentmap_* ate que a conexao seja restaurada.";

  let count = 0;
  for (const [, estado] of Array.from(sessoes.entries())) {
    if (ehSessaoFilha(estado)) continue;
    if (estado.status !== "idle" && estado.status !== "unknown") continue;
    if (estado.operacaoEmAndamento !== "idle") continue;

    const sucesso = await injetarPrompt(estado.sessionId, client, directory, recoveryPrompt, "recovery", estado);
    if (sucesso) count++;
  }

  if (count > 0) {
    await logEmArquivo(directory, `[agentmap-health] Desconexao notificada: "${motivo}" para ${count} sessao(s)`);
  }
}

async function registrarEventoInstancia(directory: string, tipo: string, dados: Record<string, any> = {}) {
  try {
    const url = new URL("/api/eventos/custom", AGENTMAP_API_URL);
    await fetchComTimeout(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(AGENTMAP_API_KEY ? { "x-api-key": AGENTMAP_API_KEY } : {}) },
      body: JSON.stringify({
        tipo,
        emissor: AGENT_MAP_INSTANCE_ID,
        conteudo: dados.mensagem || tipo,
        dados: {
          instanciaId: AGENT_MAP_INSTANCE_ID,
          ...dados,
        },
      }),
    });
  } catch {
    // silencioso
  }
}

async function executarHealthCheck(client: PluginInput["client"], directory: string, ctx: PluginInput) {
  conexaoSaudavel.ultimaVerificacao = Date.now();

  const mcpStatus = await verificarStatusMcp(client);
  const mcpConectado = mcpStatus === "connected";
  conexaoSaudavel.mcpStatus = mcpStatus;

  const httpOk = await verificarStatusHttp();

  if (!mcpConectado) {
    if (!conexaoSaudavel.mcpDesconectado) {
      conexaoSaudavel.mcpDesconectado = true;
      console.warn(`[agentmap-health] MCP desconectado (status: ${mcpStatus}). Iniciando reconexao...`);
      await logEmArquivo(directory, `[agentmap-health] MCP desconectado (status: ${mcpStatus})`);
      await registrarEventoInstancia(directory, "INSTANCIA_DESCONECTADA", { mensagem: "MCP desconectado", mcpStatus });
      await notificarDesconexao(client, directory, `MCP ${mcpStatus}`);
    }
    await reconectarMcp(client, directory);
  } else {
    if (conexaoSaudavel.mcpDesconectado) {
      conexaoSaudavel.mcpDesconectado = false;
      conexaoSaudavel.tentativaReconexaoMcp = 0;
      console.log("[agentmap-health] MCP reconectado com sucesso!");
      await logEmArquivo(directory, "[agentmap-health] MCP reconectado com sucesso");
      await registrarEventoInstancia(directory, "INSTANCIA_CONECTADA", { mensagem: "MCP reconectado" });
      await notificarRecuperacao(client, directory);
    }
  }

  if (!httpOk) {
    if (!conexaoSaudavel.httpDesconectado) {
      conexaoSaudavel.httpDesconectado = true;
      console.warn("[agentmap-health] HTTP backend desconectado. Iniciando reinicio...");
      await logEmArquivo(directory, "[agentmap-health] HTTP backend desconectado");
      await registrarEventoInstancia(directory, "INSTANCIA_DESCONECTADA", { mensagem: "HTTP backend desconectado" });
    }
    await reiniciarBackend(client, directory, ctx);
  } else {
    if (conexaoSaudavel.httpDesconectado) {
      conexaoSaudavel.httpDesconectado = false;
      conexaoSaudavel.tentativaRestartHttp = 0;
      console.log("[agentmap-health] HTTP backend restaurado!");
      await logEmArquivo(directory, "[agentmap-health] HTTP backend restaurado");
      await registrarEventoInstancia(directory, "INSTANCIA_CONECTADA", { mensagem: "HTTP backend restaurado" });
    }
  }
}

function iniciarHealthCheck(client: PluginInput["client"], directory: string, ctx: PluginInput) {
  if (conexaoSaudavel.healthTimer) {
    clearInterval(conexaoSaudavel.healthTimer);
  }

  console.log(`[agentmap-health] Monitor de saude iniciado (intervalo: ${HEALTH_CHECK_INTERVAL_MS}ms)`);
  logEmArquivo(directory, `[agentmap-health] Monitor de saude iniciado (intervalo: ${HEALTH_CHECK_INTERVAL_MS}ms)`);

  conexaoSaudavel.healthTimer = setInterval(async () => {
    try {
      await executarHealthCheck(client, directory, ctx);
    } catch (err) {
      console.error("[agentmap-health] Erro no health check:", err);
      await logEmArquivo(directory, `[agentmap-health] Erro no health check: ${err}`);
    }
  }, HEALTH_CHECK_INTERVAL_MS);
}

function pararHealthCheck(directory: string) {
  if (conexaoSaudavel.healthTimer) {
    clearInterval(conexaoSaudavel.healthTimer);
    conexaoSaudavel.healthTimer = null;
    console.log("[agentmap-health] Monitor de saude parado");
    logEmArquivo(directory, "[agentmap-health] Monitor de saude parado");
  }
}

async function iniciarSseListener(client: PluginInput["client"], directory: string, ctx: PluginInput) {
  if (conexaoSaudavel.sseAtivo) return;

  const eventoClient = (client as any).event;
  if (!eventoClient || typeof eventoClient.subscribe !== "function") {
    console.warn("[agentmap-health] client.event.subscribe nao disponivel, usando polling apenas");
    await logEmArquivo(directory, "[agentmap-health] client.event.subscribe nao disponivel, usando polling apenas");
    return;
  }

  try {
    conexaoSaudavel.sseAtivo = true;
    const stream = await eventoClient.subscribe({ query: { directory: "" } });

    if (stream && typeof stream[Symbol.asyncIterator] === "function") {
      (async () => {
        try {
          for await (const evento of stream as AsyncIterable<SseEvent>) {
            if (evento.type === "server.connected") {
              console.log("[agentmap-health] server.connected detectado via SSE! Reexecutando health check...");
              await logEmArquivo(directory, "[agentmap-health] server.connected detectado via SSE! Reexecutando health check");
      await executarHealthCheck(client, directory, ctx);
            } else if (evento.type === "server.instance.disposed") {
              console.log("[agentmap-health] server.instance.disposed detectado via SSE");
              await logEmArquivo(directory, "[agentmap-health] server.instance.disposed detectado via SSE");
              conexaoSaudavel.mcpDesconectado = true;
              conexaoSaudavel.httpDesconectado = true;
            }
          }
        } catch (err) {
          console.error("[agentmap-health] SSE stream erro:", err);
          await logEmArquivo(directory, `[agentmap-health] SSE stream erro: ${err}`);
        } finally {
          conexaoSaudavel.sseAtivo = false;
        }
      })();
    } else if (stream && typeof (stream as any).on === "function") {
      (stream as any).on("data" as never, (evento: SseEvent) => {
        if (evento.type === "server.connected") {
          console.log("[agentmap-health] server.connected detectado via SSE (event-based)!");
          logEmArquivo(directory, "[agentmap-health] server.connected detectado via SSE (event-based)");
          executarHealthCheck(client, directory, ctx);
        }
      });
    }
    console.log("[agentmap-health] SSE listener iniciado");
    await logEmArquivo(directory, "[agentmap-health] SSE listener iniciado");
  } catch (err) {
    conexaoSaudavel.sseAtivo = false;
    console.error("[agentmap-health] Erro ao iniciar SSE listener:", err);
    await logEmArquivo(directory, `[agentmap-health] Erro ao iniciar SSE listener: ${err}`);
  }
}

function removerEstado(projectId: string, sessionId: string) {
  const key = chaveSessao(projectId, sessionId);
  const estado = sessoes.get(key);
  if (estado) {
    limparTimers(estado);
    sessoes.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Eventos Kilo — hook principal
// ---------------------------------------------------------------------------

function extrairSessionId(event: any): string | undefined {
  const props = event?.properties || {};
  return typeof props?.sessionID === "string" ? props.sessionID : typeof event?.sessionID === "string" ? event.sessionID : undefined;
}

function extrairParentId(event: any): string | null {
  const props = event?.properties || {};
  const data = props?.data || event?.data || {};
  const parentId = data?.parentID || props?.parentID;
  return typeof parentId === "string" ? parentId : null;
}

function extrairEventType(event: any): string {
  return typeof event?.type === "string" ? event.type : "";
}

function extrairFinishReason(event: any): string | null {
  const props = event?.properties || {};
  const finish = typeof props?.finish === "string" ? props.finish : null;
  const dataFinish = typeof event?.data?.finish === "string" ? event.data.finish : null;
  return finish || dataFinish;
}

// ---------------------------------------------------------------------------
// Continue prompt (when output limit / length cap is hit)
// ---------------------------------------------------------------------------

async function injetarContinue(
  projectId: string,
  sessionId: string,
  client: PluginInput["client"],
  directory: string,
  estado: SessionWakeupState
) {
  if (ehSessaoFilha(estado)) {
    console.log(`[agentmap-wakeup] Continue suprimido (sessao-filha): ${sessionId}`);
    return;
  }

  if (estaOcupado(estado)) {
    console.log(`[agentmap-wakeup] Continue suprimido (sessao ocupada): sessao ${sessionId}`);
    await logEmArquivo(directory, `[agentmap-wakeup] Continue suprimido (sessao ocupada): sessao ${sessionId}`);
    return;
  }

  console.log(`[agentmap-wakeup] Injetando continue (limite de resposta) na sessao ${sessionId}`);
  await logEmArquivo(directory, `[agentmap-wakeup] Injetando continue (limite de resposta): sessao ${sessionId}`);

  await injetarPrompt(sessionId, client, directory, RESPONSE_LIMIT_PROMPT, "continue", estado);

  estado.outputLimitHit = false;
  estado.stepFinishReason = null;
}

async function handleSessionStatus(
  projectId: string,
  sessionId: string,
  status: string,
  directory: string
) {
  const estado = obterOuCriarEstado(projectId, sessionId);
  const statusNormalizado = status === "idle" || status === "busy" || status === "retry" ? status : "unknown";

  if (estado.status === statusNormalizado) return;

  const anterior = estado.status;
  estado.status = statusNormalizado;

  const log = `[agentmap-wakeup] session.status: ${sessionId} ${anterior} -> ${statusNormalizado}`;
  console.log(log);
  await logEmArquivo(directory, log);

  if (statusNormalizado === "busy" && anterior !== "busy" && anterior !== "unknown") {
    resetarMemoriaEnvio(estado);
    estado.ultimoHeartbeatPrompt = "";
    const logReset = `[agentmap-wakeup] Memoria de envio e heartbeat resetados (novo ciclo de trabalho): ${sessionId}`;
    console.log(logReset);
    await logEmArquivo(directory, logReset);
  }
}

async function handleSessionCreated(
  projectId: string,
  sessionId: string,
  event: any,
  directory: string
) {
  const parentId = extrairParentId(event);
  const estado = obterOuCriarEstado(projectId, sessionId);

  if (parentId && !estado.parentId) {
    estado.parentId = parentId;
    estado.isChildSession = true;
    console.log(`[agentmap-wakeup] Sessao-filha detectada: ${sessionId} -> parent ${parentId}`);
    await logEmArquivo(directory, `[agentmap-wakeup] Sessao-filha detectada: ${sessionId}`);
  }
}

async function handleSessionUpdated(
  projectId: string,
  sessionId: string,
  event: any,
  directory: string
) {
  const parentId = extrairParentId(event);
  const estado = obterEstado(projectId, sessionId);

  if (estado && parentId && !estado.parentId) {
    estado.parentId = parentId;
    estado.isChildSession = true;
    console.log(`[agentmap-wakeup] Sessao-filha detectada via updated: ${sessionId} -> parent ${parentId}`);
    await logEmArquivo(directory, `[agentmap-wakeup] Sessao-filha detectada via updated: ${sessionId}`);
  }
}

// ---------------------------------------------------------------------------
// Definição do plugin
// ---------------------------------------------------------------------------

const AgentMapWakeup: Plugin = async (ctx: PluginInput) => {
  projectIdGlobal = ctx.project?.id || ctx.directory;
  const inicio = `[agentmap-wakeup] Plugin carregado — diretorio: ${ctx.directory}, projeto: ${projectIdGlobal}, AgentMap: ${AGENTMAP_API_URL}`;
  console.log(inicio);
  await logEmArquivo(ctx.directory, inicio);

  iniciarHealthCheck(ctx.client, ctx.directory, ctx);
  iniciarSseListener(ctx.client, ctx.directory, ctx);

  return {
    event: async (input: { event: any }) => {
      const sessionId = extrairSessionId(input.event);
      const eventType = extrairEventType(input.event);
      const projectId = projectIdGlobal || ctx.directory;

      const logEvento = `[agentmap-wakeup] Evento: type=${eventType}, sessionID=${sessionId}, props=${JSON.stringify((input.event as any)?.properties || {}).slice(0, 200)}`;
      console.log(logEvento);

      // server.connected — Kilo server (re)conectado após restart
      if (eventType === "server.connected") {
        console.log("[agentmap-wakeup] server.connected detectado — reexecutando health check e reconexao MCP");
        await logEmArquivo(ctx.directory, "[agentmap-wakeup] server.connected detectado — reexecutando health check");
        conexaoSaudavel.mcpDesconectado = true;
        conexaoSaudavel.httpDesconectado = true;
        setTimeout(async () => {
          try {
            await executarHealthCheck(ctx.client, ctx.directory, ctx);
          } catch (err) {
            console.error("[agentmap-wakeup] Erro no health check pós server.connected:", err);
          }
        }, 1000);
        return;
      }

      if (!sessionId) return;

      const estado = obterOuCriarEstado(projectId, sessionId);

      // Marcar atividade para eventos nao-idle
      if (eventType !== "session.idle") {
        // handled by session.status below
      }

      // session.created — detecção de sessão-filha
      if (eventType === "session.created") {
        await handleSessionCreated(projectId, sessionId, input.event, ctx.directory);
        return;
      }

      // session.updated — detecção tardia de sessão-filha
      if (eventType === "session.updated") {
        await handleSessionUpdated(projectId, sessionId, input.event, ctx.directory);
        return;
      }

      // session.next.step.started — reinicia monitoramento de limite de resposta
      if (eventType === "session.next.step.started") {
        estado.outputLimitHit = false;
        estado.stepFinishReason = null;
        return;
      }

      // session.next.step.ended — detecta se o limite de resposta foi atingido
      if (eventType === "session.next.step.ended") {
        const finish = extrairFinishReason(input.event);
        estado.stepFinishReason = finish;
        if (finish === "length") {
          estado.outputLimitHit = true;
          const logLen = `[agentmap-wakeup] session.next.step.ended finish=length (limite de resposta atingido): ${sessionId}`;
          console.log(logLen);
          await logEmArquivo(ctx.directory, logLen);
        }
        return;
      }

      // session.status — status real da sessão
      if (eventType === "session.status") {
        const status = typeof (input.event as any)?.properties?.status === "string"
          ? (input.event as any).properties.status
          : typeof (input.event as any)?.data?.status === "string"
            ? (input.event as any).data.status
            : "unknown";
        await handleSessionStatus(projectId, sessionId, status, ctx.directory);

        if (estado.status === "idle" && estado.operacaoEmAndamento !== "idle") {
          estado.operacaoEmAndamento = "idle";
        }

        // Se a sessão ficou idle após limite de resposta atingido, injeta continue
        if (estado.status === "idle" && estado.outputLimitHit && !ehSessaoFilha(estado)) {
          await injetarContinue(projectId, sessionId, ctx.client, ctx.directory, estado);
        }
        return;
      }

      // session.idle — gatilho principal
      if (eventType === "session.idle") {
        const logIdle = `[agentmap-wakeup] session.idle: ${sessionId}`;
        console.log(logIdle);
        await logEmArquivo(ctx.directory, logIdle);

        if (ehSessaoFilha(estado)) {
          console.log(`[agentmap-wakeup] session.idle suprimido (sessao-filha): ${sessionId}`);
          return;
        }

        estado.status = "idle";
        estado.operacaoEmAndamento = "idle";
        estado.ultimoHeartbeatPrompt = "";

        if (estado.interruptCleanupTimer) {
          clearTimeout(estado.interruptCleanupTimer);
          estado.interruptCleanupTimer = null;
        }

        // Se o limite de resposta foi atingido antes da session.idle, injeta continue
        if (estado.outputLimitHit && !ehSessaoFilha(estado)) {
          await injetarContinue(projectId, sessionId, ctx.client, ctx.directory, estado);
        }

        agendarVerificacao(projectId, sessionId, ctx.client, ctx.directory);
        iniciarHeartbeat(projectId, sessionId, ctx.client, ctx.directory);

        if (estado.recoveryAtivo) {
          estado.recoveryAtivo = false;
          if (estado.recoveryTimer) {
            clearTimeout(estado.recoveryTimer);
            estado.recoveryTimer = null;
          }
        }
        return;
      }

      // session.next.interrupt.requested
      if (eventType === "session.next.interrupt.requested") {
        if (!sessionId) return;

        const logInterrupcao = `[agentmap-wakeup] Interrupcao detectada: ${sessionId}`;
        console.log(logInterrupcao);
        await logEmArquivo(ctx.directory, logInterrupcao);

        if (estado.interruptCleanupTimer) {
          clearTimeout(estado.interruptCleanupTimer);
        }
        estado.interruptCleanupTimer = setTimeout(() => {
          estado.interruptCleanupTimer = null;
        }, INTERRUPT_CLEANUP_MS);
        return;
      }

      // session.error
      if (eventType === "session.error") {
        const nomeErro = typeof (input.event as any)?.properties?.error?.name === "string"
          ? (input.event as any).properties.error.name
          : "";
        const mensagemErro = typeof (input.event as any)?.properties?.error?.data?.message === "string"
          ? (input.event as any).properties.error.data.message
          : "";

        const ehInterrupcaoUsuario =
          nomeErro === "MessageAbortedError" ||
          /abort|cancel|interrompid|interrupt|stopped|user/i.test(`${nomeErro} ${mensagemErro}`);

        if (ehInterrupcaoUsuario) {
          const logInterrupcao = `[agentmap-wakeup] session.error suprimido (interrupcao): ${nomeErro || "desconhecido"} na sessao ${sessionId}.`;
          console.log(logInterrupcao);
          await logEmArquivo(ctx.directory, logInterrupcao);
          return;
        }

        // MessageOutputLengthError — limite de resposta atingido via erro do provedor
        const ehLimiteResposta =
          nomeErro === "MessageOutputLengthError" ||
          /output.*length|length.*output|output.*limit|limit.*output|exceeds.*max|max.*tokens.*output/i.test(`${nomeErro} ${mensagemErro}`);

        if (ehLimiteResposta && !ehSessaoFilha(estado)) {
          if (estaOcupado(estado)) {
            const logLimite = `[agentmap-wakeup] session.error (limite de resposta) suprimido (ocupado): sessao ${sessionId}`;
            console.log(logLimite);
            await logEmArquivo(ctx.directory, logLimite);
            estado.outputLimitHit = false;
            estado.stepFinishReason = null;
            pararHeartbeat(projectId, sessionId, ctx.directory);
            return;
          }

          const logLimite = `[agentmap-wakeup] session.error (limite de resposta): ${nomeErro || "desconhecido"} na sessao ${sessionId}. Injetando continue.`;
          console.log(logLimite);
          await logEmArquivo(ctx.directory, logLimite);

          await injetarContinue(projectId, sessionId, ctx.client, ctx.directory, estado);

          const recoveryTimer = estado.recoveryTimer;
          if (recoveryTimer) {
            clearTimeout(recoveryTimer);
            estado.recoveryTimer = null;
          }
          pararHeartbeat(projectId, sessionId, ctx.directory);
          return;
        }

        if (!sessionId) {
          console.warn("[agentmap-wakeup] session.error sem sessionID, ignorando.");
          return;
        }

        const logError = `[agentmap-wakeup] session.error: ${sessionId}`;
        console.error(logError);
        await logEmArquivo(ctx.directory, logError);

        if (estaOcupado(estado)) {
          console.log(`[agentmap-wakeup] session.error suprimido (sessao ocupada): sessao ${sessionId}`);
          await logEmArquivo(ctx.directory, `[agentmap-wakeup] session.error suprimido (sessao ocupada): sessao ${sessionId}`);
          pararHeartbeat(projectId, sessionId, ctx.directory);
          return;
        }

        await injetarRecovery(projectId, sessionId, ctx.client, ctx.directory);
        pararHeartbeat(projectId, sessionId, ctx.directory);
        return;
      }

      // session.deleted
      if (eventType === "session.deleted") {
        const logDeleted = `[agentmap-wakeup] session.deleted: ${sessionId} — limpando estado`;
        console.log(logDeleted);
        await logEmArquivo(ctx.directory, logDeleted);
        removerEstado(projectId, sessionId);
        return;
      }
    },

    "tool.execute.after": async (input: { sessionID?: string }) => {
      if (input.sessionID) {
        const estado = obterEstado(projectIdGlobal || "", input.sessionID);
        if (estado) {
          // Status already reflects real state via session.status events
        }
      }
    },

    "chat.message": async (input: { sessionID?: string }) => {
      if (input.sessionID) {
        const estado = obterEstado(projectIdGlobal || "", input.sessionID);
        if (estado) {
          // Status already reflects real state via session.status events
        }
      }
    },

    dispose: async () => {
      for (const estado of Array.from(sessoes.values())) {
        limparTimers(estado);
      }
      pararHealthCheck(ctx.directory);
      conexaoSaudavel.sseAtivo = false;
    },
  };
};

export default { id: "agentmap-wakeup", server: AgentMapWakeup };
