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

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const AGENTMAP_API_URL = (globalThis as any).process?.env?.AGENTMAP_API_URL || "http://localhost:3150";
const AGENTMAP_API_KEY = (globalThis as any).process?.env?.AGENTMAP_API_KEY || "";
const DEBOUNCE_MS = Number((globalThis as any).process?.env?.AGENTMAP_WAKEUP_DEBOUNCE_MS || "3000");
const HEARTBEAT_INTERVAL_MS = Number((globalThis as any).process?.env?.AGENTMAP_WAKEUP_HEARTBEAT_MS || String(2 * 60 * 1000));
const HEARTBEAT_PROMPT = (globalThis as any).process?.env?.AGENTMAP_WAKEUP_HEARTBEAT_PROMPT || "Aviso do AgentMap: verifique o status das tarefas no agentmap e verique as que sao para voce, se necessario se autoidentifique-se e se atualize do seu progresso ou tarefas se necessário, reporte o que precisa se ainda nao foi reportado.";
const RECOVERY_COOLDOWN_MS = 5 * 60 * 1000;
const INTERRUPT_CLEANUP_MS = 5 * 60 * 1000;
const CONFIRM_TIMEOUT_MS = Number((globalThis as any).process?.env?.AGENTMAP_WAKEUP_CONFIRM_MS || "10000");

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
type Operacao = "idle" | "wakeup" | "recovery" | "heartbeat";

interface SessionWakeupState {
  sessionId: string;
  projectId: string;
  isChildSession: boolean;
  parentId: string | null;
  status: SessionStatus;
  cursorEventSequence: number;
  operacaoEmAndamento: Operacao;
  recoveryAtivo: boolean;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  recoveryTimer: ReturnType<typeof setTimeout> | null;
  interruptCleanupTimer: ReturnType<typeof setTimeout> | null;
  confirmTimer: ReturnType<typeof setTimeout> | null;
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

// ---------------------------------------------------------------------------
// Estado global do plugin
// ---------------------------------------------------------------------------

const sessoes = new Map<string, SessionWakeupState>();
let projectIdGlobal: string | null = null;

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
      debounceTimer: null,
      heartbeatTimer: null,
      recoveryTimer: null,
      interruptCleanupTimer: null,
      confirmTimer: null,
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

async function buscarMensagensPendentes(estado: SessionWakeupState): Promise<MensagemPendente[]> {
  const url = new URL("/api/monitoramento/mensagens", AGENTMAP_API_URL);
  url.searchParams.set("limite", "50");
  if (estado.cursorEventSequence > 0) {
    url.searchParams.set("after", String(estado.cursorEventSequence));
  }

  const res = await fetch(url, {
    headers: AGENTMAP_API_KEY ? { "x-api-key": AGENTMAP_API_KEY } : undefined,
  });

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

  const pendentes = await buscarMensagensPendentes(estado);
  if (pendentes.length === 0) {
    console.log(`[agentmap-wakeup] Nenhuma mensagem pendente para session ${estado.sessionId}`);
    await logEmArquivo(directory, `[agentmap-wakeup] Nenhuma mensagem pendente para session ${estado.sessionId}`);
    return;
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
    const res = await fetch(url, {
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

  const pendentes = await buscarMensagensPendentes(estado);
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

  await injetarPrompt(sessionId, client, directory, HEARTBEAT_PROMPT, "heartbeat", estado);
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

  return {
    event: async (input: { event: any }) => {
      const sessionId = extrairSessionId(input.event);
      const eventType = extrairEventType(input.event);
      const projectId = projectIdGlobal || ctx.directory;

      const logEvento = `[agentmap-wakeup] Evento: type=${eventType}, sessionID=${sessionId}, props=${JSON.stringify((input.event as any)?.properties || {}).slice(0, 200)}`;
      console.log(logEvento);

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

        if (estado.interruptCleanupTimer) {
          clearTimeout(estado.interruptCleanupTimer);
          estado.interruptCleanupTimer = null;
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

        if (!sessionId) {
          console.warn("[agentmap-wakeup] session.error sem sessionID, ignorando.");
          return;
        }

        const logError = `[agentmap-wakeup] session.error: ${sessionId}`;
        console.error(logError);
        await logEmArquivo(ctx.directory, logError);

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
  };
};

export default { id: "agentmap-wakeup", server: AgentMapWakeup };
