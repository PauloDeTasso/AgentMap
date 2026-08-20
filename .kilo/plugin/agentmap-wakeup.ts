// .kilo/plugin/agentmap-wakeup.ts
//
// Plugin oficial do Kilo Code — roda DENTRO do mesmo processo do `kilo serve`
// (tanto na extensão VS Code quanto na CLI). Não é um script externo.
//
// Fluxo:
//   1. Na inicialização, abre um WebSocket cliente em ws://localhost:3150/ws/monitoramento
//   2. Escuta eventos `mensagem_nova` do backend.
//   3. Para cada mensagem nova relevante, agenda um wake-up com debounce por sessão.
//   4. Injeta o aviso no chat principal via client.session.promptAsync().
//   5. Se o WS cair, reconecta automaticamente e usa HTTP polling como fallback.
//
// Baseado em: relatório de arquitetura (2026-08-20) e tipagens oficiais
// de @kilocode/plugin v7.4.20 e @kilocode/sdk v7.4.20.

import type { Plugin, PluginInput } from "@kilocode/plugin";

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const AGENTMAP_API_URL = process.env.AGENTMAP_API_URL || "http://localhost:3150";
const AGENTMAP_API_KEY = process.env.AGENTMAP_API_KEY || "";
const DEBOUNCE_MS = Number(process.env.AGENTMAP_WAKEUP_DEBOUNCE_MS) || 3000;
const WS_TIMEOUT_MS = Number(process.env.AGENTMAP_WS_TIMEOUT_MS) || 5000;
const WS_MAX_RECONNECT_ATTEMPTS = Number(process.env.AGENTMAP_WS_MAX_RECONNECT) || 20;
const HTTP_FALLBACK_AFTER_FAILURES = Number(process.env.AGENTMAP_HTTP_FALLBACK_AFTER) || 3;

const TIPOS_RELEVANTES = new Set([
  "KILO_CHAT_REPLY",
  "KILO_REPLY",
  "KILO_RESULT",
  "KILO_CHAT",
  "WAKEUP_PARENT",
]);

// ---------------------------------------------------------------------------
// Estado local do plugin (em memória — reinicia junto com o processo do Kilo)
// ---------------------------------------------------------------------------

let ultimoEventSequenceProcessado = 0;
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>>();
let wsFailureCount = 0;
let useHttpFallback = false;

// ---------------------------------------------------------------------------
// Logs helpers
// ---------------------------------------------------------------------------

function logInfo(msg: string, meta?: Record<string, unknown>) {
  console.log(`[agentmap-wakeup] ${msg}`, meta ?? {});
}

function logWarn(msg: string, meta?: Record<string, unknown>) {
  console.warn(`[agentmap-wakeup] ${msg}`, meta ?? {});
}

function logError(msg: string, meta?: Record<string, unknown>) {
  console.error(`[agentmap-wakeup] ${msg}`, meta ?? {});
}

// ---------------------------------------------------------------------------
// Consulta HTTP ao AgentMap (usada como fallback)
// ---------------------------------------------------------------------------

interface MensagemPendente {
  id: string;
  agenteOrigem?: string;
  emissor?: string;
  resumo?: string;
  conteudo?: string;
  eventSequence?: number;
  tipo?: string;
}

async function buscarMensagensPendentes(): Promise<MensagemPendente[]> {
  const url = new URL("/api/monitoramento/mensagens", AGENTMAP_API_URL);
  url.searchParams.set("limite", "50");
  if (ultimoEventSequenceProcessado > 0) {
    url.searchParams.set("after", String(ultimoEventSequenceProcessado));
  }

  logInfo("Consultando AgentMap via HTTP", { url: url.toString() });

  const res = await fetch(url, {
    headers: AGENTMAP_API_KEY ? { "x-api-key": AGENTMAP_API_KEY } : undefined,
  });

  if (!res.ok) {
    logError("AgentMap respondeu erro HTTP", { status: res.status, url: url.toString() });
    return [];
  }

  const body = await res.json();
  const mensagens: MensagemPendente[] = Array.isArray(body?.dados)
    ? body.dados
    : Array.isArray(body?.mensagens)
      ? body.mensagens
      : [];

  const novas = mensagens.filter(
    (m) =>
      typeof m.eventSequence === "number" &&
      m.eventSequence > ultimoEventSequenceProcessado &&
      TIPOS_RELEVANTES.has(m.tipo || "")
  );

  logInfo("Mensagens pendentes via HTTP", { total: mensagens.length, novas: novas.length });
  return novas;
}

function montarResumo(mensagens: MensagemPendente[]): string {
  const linhas = mensagens.map(
    (m) => `- [${m.agenteOrigem || m.emissor || "agente"}] ${m.resumo || m.conteudo || m.id}`
  );
  return (
    `Novas atualizações no AgentMap enquanto você estava ociado:\n` +
    linhas.join("\n") +
    `\n\nConsulte o AgentMap para os detalhes completos antes de prosseguir.`
  );
}

// ---------------------------------------------------------------------------
// Disparo do wake-up (com debounce por sessão)
// ---------------------------------------------------------------------------

function agendarVerificacao(sessionId: string, client: PluginInput["client"], source: "ws" | "http") {
  const timerExistente = debounceTimers.get(sessionId);
  if (timerExistente) clearTimeout(timerExistente);

  const timer = setTimeout(async () => {
    debounceTimers.delete(sessionId);
    try {
      const pendentes = await buscarMensagensPendentes();
      if (pendentes.length === 0) {
        logInfo("Nenhuma mensagem pendente após debounce", { sessionId, source });
        return;
      }

      const resumo = montarResumo(pendentes);

      logInfo("Injetando wake-up no chat principal", {
        sessionId,
        source,
        mensagens: pendentes.length,
      });

      await client.session.promptAsync({
        sessionID: sessionId,
        parts: [{ type: "text", text: resumo }],
      });

      ultimoEventSequenceProcessado = Math.max(
        ultimoEventSequenceProcessado,
        ...pendentes.map((m) => m.eventSequence || 0)
      );

      logInfo("Wake-up enviado com sucesso", {
        sessionId,
        source,
        count: pendentes.length,
        ultimoEventSequenceProcessado,
      });
    } catch (err) {
      logError("Falha ao processar wake-up", {
        sessionId,
        source,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, DEBOUNCE_MS);

  debounceTimers.set(sessionId, timer);
}

// ---------------------------------------------------------------------------
// WebSocket client
// ---------------------------------------------------------------------------

type WsReadyState = "connecting" | "open" | "closing" | "closed";

function buildWsUrl(): string {
  const base = AGENTMAP_API_URL.replace(/^https?:\/\//, "");
  return `ws://${base}/ws/monitoramento`;
}

function connectWebSocket(onMessage: (msg: MensagemPendente) => void): WebSocket | null {
  const url = buildWsUrl();
  logInfo("Conectando WebSocket", { url });

  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;

  function scheduleReconnect() {
    if (reconnectAttempts >= WS_MAX_RECONNECT_ATTEMPTS) {
      logError("WS máximo de tentativas atingido, ativando fallback HTTP", {
        attempts: reconnectAttempts,
      });
      useHttpFallback = true;
      return;
    }

    const backoff = Math.min(1000 * 2 ** reconnectAttempts, 30000);
    reconnectAttempts += 1;
    logWarn("WS reconectando", { attempt: reconnectAttempts, backoffMs: backoff });
    setTimeout(() => connectWebSocket(onMessage), backoff);
  }

  try {
    ws = new WebSocket(url);
  } catch (err) {
    logError("Erro ao criar WebSocket", {
      error: err instanceof Error ? err.message : String(err),
    });
    scheduleReconnect();
    return null;
  }

  const timeout = setTimeout(() => {
    if (ws && ws.readyState !== WebSocket.OPEN) {
      logWarn("WS timeout na conexão", { url, timeoutMs: WS_TIMEOUT_MS });
      ws.close();
      scheduleReconnect();
    }
  }, WS_TIMEOUT_MS);

  ws.onopen = () => {
    clearTimeout(timeout);
    wsFailureCount = 0;
    reconnectAttempts = 0;
    useHttpFallback = false;
    logInfo("WS conectado", { url });
  };

  ws.onmessage = (event: MessageEvent) => {
    try {
      const payload = JSON.parse(event.data as string);
      const tipo = payload?.data?.tipo;

      if (payload?.type === "mensagem_nova" && TIPOS_RELEVANTES.has(tipo || "")) {
        const msg: MensagemPendente = {
          id: payload.data?.id,
          agenteOrigem: payload.data?.emissor,
          emissor: payload.data?.emissor,
          resumo: payload.data?.conteudo,
          conteudo: payload.data?.conteudo,
          eventSequence: payload.data?.eventSequence,
          tipo,
        };

        logInfo("WS mensagem recebida", {
          id: msg.id,
          tipo,
          eventSequence: msg.eventSequence,
        });

        if (typeof msg.eventSequence === "number" && msg.eventSequence > ultimoEventSequenceProcessado) {
          onMessage(msg);
        }
      }
    } catch (err) {
      logError("Erro ao processar mensagem WS", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  ws.onerror = (err) => {
    logError("WS erro", { url, error: err });
    wsFailureCount += 1;
    if (wsFailureCount >= HTTP_FALLBACK_AFTER_FAILURES) {
      useHttpFallback = true;
      logWarn("WS falhas acumuladas, ativando fallback HTTP", { failures: wsFailureCount });
    }
  };

  ws.onclose = (event) => {
    logWarn("WS fechado", { code: event.code, reason: event.reason, url });
    scheduleReconnect();
  };

  return ws;
}

// ---------------------------------------------------------------------------
// Definição do plugin
// ---------------------------------------------------------------------------

const AgentMapWakeup: Plugin = async (ctx: PluginInput) => {
  logInfo("Plugin carregado", {
    directory: ctx.directory,
    agentMap: AGENTMAP_API_URL,
    wsUrl: buildWsUrl(),
  });

  function handlePotentialWakeup(msg: MensagemPendente) {
    if (!msg.eventSequence) return;

    if (msg.eventSequence <= ultimoEventSequenceProcessado) {
      return;
    }

    ultimoEventSequenceProcessado = msg.eventSequence;

    const sessions = ctx.client.session as any;
    if (!sessions?.list) {
      logWarn("client.session.list indisponível, não é possível descobrir sessões para wake-up");
      return;
    }

    sessions.list().then((sessionsList: any[]) => {
      const ids = Array.isArray(sessionsList)
        ? sessionsList.map((s) => s.id).filter(Boolean)
        : [];

      if (ids.length === 0) {
        logWarn("Nenhuma sessão Kilo disponível para wake-up");
        return;
      }

      for (const sessionId of ids) {
        agendarVerificacao(sessionId, ctx.client, "ws");
      }
    }).catch((err: unknown) => {
      logError("Falha ao listar sessões para wake-up", {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  connectWebSocket(handlePotentialWakeup);

  return {
    event: async ({ event }) => {
      if (event.type !== "session.idle") return;

      const sessionId: string | undefined = event.properties?.sessionID;

      if (!sessionId) {
        logWarn("session.idle sem sessionID, ignorando.");
        return;
      }

      agendarVerificacao(sessionId, ctx.client, useHttpFallback ? "http" : "ws");
    },
  };
};

export default { id: "agentmap-wakeup", server: AgentMapWakeup };
