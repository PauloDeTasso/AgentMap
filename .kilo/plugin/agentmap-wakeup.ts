// .kilo/plugin/agentmap-wakeup.ts
//
// Plugin oficial do Kilo Code — roda DENTRO do mesmo processo do `kilo serve`
// (tanto na extensão VS Code quanto na CLI). Não é um script externo.
//
// O que faz: toda vez que uma sessão fica ociosa (session.idle), pergunta pro
// AgentMap se tem mensagem pendente pra essa sessão/projeto. Se tiver, injeta
// um novo prompt na mesma sessão via client.session.promptAsync — sem precisar
// de CLI externa, porta ou senha (o plugin já roda com acesso nativo ao client).
//
// Baseado em: RELATORIO-FINAL-AGENTMAP.md (seção 1 e §4) e tipagens oficiais
// de @kilocode/plugin v7.4.20 e @kilocode/sdk v7.4.20.

import type { Plugin, PluginInput } from "@kilocode/plugin";

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const AGENTMAP_API_URL = process.env.AGENTMAP_API_URL || "http://localhost:3150";
const AGENTMAP_API_KEY = process.env.AGENTMAP_API_KEY || "";
const DEBOUNCE_MS = Number(process.env.AGENTMAP_WAKEUP_DEBOUNCE_MS) || 3000;

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
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ---------------------------------------------------------------------------
// Consulta ao AgentMap
// ---------------------------------------------------------------------------

interface MensagemPendente {
  id: string;
  agenteOrigem?: string;
  resumo?: string;
  eventSequence?: number;
  tipo?: string;
}

async function buscarMensagensPendentes(): Promise<MensagemPendente[]> {
  const url = new URL("/api/monitoramento/mensagens", AGENTMAP_API_URL);
  url.searchParams.set("limite", "50");
  if (ultimoEventSequenceProcessado > 0) {
    url.searchParams.set("after", String(ultimoEventSequenceProcessado));
  }

  const res = await fetch(url, {
    headers: AGENTMAP_API_KEY ? { "x-api-key": AGENTMAP_API_KEY } : undefined,
  });

  if (!res.ok) {
    console.error(`[agentmap-wakeup] AgentMap respondeu ${res.status} em ${url}`);
    return [];
  }

  const body = await res.json();
  const mensagens: MensagemPendente[] = Array.isArray(body?.dados)
    ? body.dados
    : Array.isArray(body?.mensagens)
      ? body.mensagens
      : [];

  return mensagens.filter(
    (m) =>
      typeof m.eventSequence === "number" &&
      m.eventSequence > ultimoEventSequenceProcessado &&
      TIPOS_RELEVANTES.has(m.tipo || "")
  );
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

function agendarVerificacao(sessionId: string, client: PluginInput["client"]) {
  const timerExistente = debounceTimers.get(sessionId);
  if (timerExistente) clearTimeout(timerExistente);

  const timer = setTimeout(async () => {
    debounceTimers.delete(sessionId);
    try {
      const pendentes = await buscarMensagensPendentes();
      if (pendentes.length === 0) return;

      const resumo = montarResumo(pendentes);

      await client.session.promptAsync({
        sessionID: sessionId,
        parts: [{ type: "text", text: resumo }],
      });

      ultimoEventSequenceProcessado = Math.max(
        ultimoEventSequenceProcessado,
        ...pendentes.map((m) => m.eventSequence || 0)
      );

      console.log(
        `[agentmap-wakeup] Wake-up enviado para sessão ${sessionId} (${pendentes.length} mensagem(ns))`
      );
    } catch (err) {
      console.error("[agentmap-wakeup] Falha ao processar wake-up:", err);
    }
  }, DEBOUNCE_MS);

  debounceTimers.set(sessionId, timer);
}

// ---------------------------------------------------------------------------
// Definição do plugin
// ---------------------------------------------------------------------------

const AgentMapWakeup: Plugin = async (ctx: PluginInput) => {
  console.log(
    `[agentmap-wakeup] Plugin carregado — diretório: ${ctx.directory}, AgentMap: ${AGENTMAP_API_URL}`
  );

  return {
    event: async ({ event }) => {
      if (event.type !== "session.idle") return;

      const sessionId: string | undefined = event.properties?.sessionID;

      if (!sessionId) {
        console.warn("[agentmap-wakeup] session.idle sem sessionID, ignorando.");
        return;
      }

      agendarVerificacao(sessionId, ctx.client);
    },
  };
};

export default { id: "agentmap-wakeup", server: AgentMapWakeup };
