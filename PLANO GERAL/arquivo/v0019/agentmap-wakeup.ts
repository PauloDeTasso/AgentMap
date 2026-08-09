// .kilo/plugin/agentmap-wakeup.ts
//
// Plugin oficial do Kilo Code — roda DENTRO do mesmo processo do `kilo serve`
// (tanto na extensão VS Code quanto na CLI). Não é um script externo.
//
// O que faz: toda vez que uma sessão fica ociosa (session.idle), pergunta pro
// AgentMap se tem mensagem pendente pra essa sessão/projeto. Se tiver, injeta
// um novo prompt na mesma sessão via promptAsync — sem precisar de CLI externa,
// porta ou senha (o plugin já roda com acesso nativo ao client interno).
//
// Baseado em: RELATORIO-FINAL-AGENTMAP.md (seção 1) e documentação oficial
// (@kilocode/plugin — Plugin, PluginInput, Hooks).
//
// IMPORTANTE: os nomes exatos de alguns campos (ex.: event.properties.sessionId
// vs sessionID, client.session.promptAsync vs client.session.prompt) podem
// variar ligeiramente conforme a versão instalada do @kilocode/plugin no seu
// projeto. Marquei com TODO os pontos que precisam ser conferidos contra o
// autocomplete do TypeScript (`node_modules/@kilocode/plugin`) antes do
// primeiro teste — é a forma mais confiável de confirmar a assinatura exata.

import type { Plugin, PluginInput } from "@kilocode/plugin";

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const AGENTMAP_API_URL = process.env.AGENTMAP_API_URL || "http://localhost:3150";
const AGENTMAP_API_KEY = process.env.AGENTMAP_API_KEY || ""; // ver nota de segurança abaixo
const DEBOUNCE_MS = Number(process.env.AGENTMAP_WAKEUP_DEBOUNCE_MS) || 3000;

// Nota de segurança (ver RELATORIO-FINAL-AGENTMAP.md, seção 3, achado #1):
// hoje o AgentMap documenta x-api-key como obrigatório mas não valida esse
// header em lugar nenhum do backend. Enviamos o header mesmo assim, para que
// o plugin já funcione corretamente no dia em que essa validação for
// implementada (P0-1 do relatório) — não depender de um bug de segurança.

// ---------------------------------------------------------------------------
// Estado local do plugin (em memória — reinicia junto com o processo do Kilo)
// ---------------------------------------------------------------------------

let ultimoEventSequenceProcessado = 0;
const debounceTimers = new Map<string, NodeJS.Timeout>();

// ---------------------------------------------------------------------------
// Consulta ao AgentMap
// ---------------------------------------------------------------------------

interface MensagemPendente {
  id: string;
  agenteOrigem?: string;
  resumo?: string;
  eventSequence?: number;
}

async function buscarMensagensPendentes(): Promise<MensagemPendente[]> {
  const url = new URL("/api/monitoramento/mensagens", AGENTMAP_API_URL);
  // TODO: hoje este endpoint ignora `after` (ver achado P0-3 do relatório
  // final) — quando for corrigido, passar `?after=${ultimoEventSequenceProcessado}`
  // aqui para não reprocessar mensagens antigas. Por ora, filtramos client-side.
  url.searchParams.set("limite", "50");

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

  // Filtro defensivo client-side (cobre a ausência do cursor server-side por ora)
  return mensagens.filter(
    (m) => typeof m.eventSequence === "number" && m.eventSequence > ultimoEventSequenceProcessado
  );
}

function montarResumo(mensagens: MensagemPendente[]): string {
  const linhas = mensagens.map(
    (m) => `- [${m.agenteOrigem || "agente"}] ${m.resumo || m.id}`
  );
  return (
    `Novas atualizações no AgentMap enquanto você estava ocioso:\n` +
    linhas.join("\n") +
    `\n\nConsulte o AgentMap para os detalhes completos antes de prosseguir.`
  );
}

// ---------------------------------------------------------------------------
// Disparo do wake-up (com debounce por sessão)
// ---------------------------------------------------------------------------

function agendarVerificacao(sessionId: string, client: PluginInput["client"]) {
  // Debounce: se vários filhos terminarem quase juntos, agrupa numa única
  // checagem/prompt em vez de acordar a sessão várias vezes seguidas.
  const timerExistente = debounceTimers.get(sessionId);
  if (timerExistente) clearTimeout(timerExistente);

  const timer = setTimeout(async () => {
    debounceTimers.delete(sessionId);
    try {
      const pendentes = await buscarMensagensPendentes();
      if (pendentes.length === 0) return;

      const resumo = montarResumo(pendentes);

      // TODO: confirmar o nome exato do método/params contra a versão
      // instalada do SDK — TESTING.md do kilocode documenta:
      //   client.session.promptAsync({ sessionID, parts: [{ type: "text", text }] })
      // outras referências do ecossistema opencode usam:
      //   client.session.prompt({ path: { id: sessionID }, body: { parts: [...] } })
      // Usar o autocomplete do TypeScript em cima de `client.session.` para
      // decidir qual das duas formas existe na versão instalada.
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
      // Não avança ultimoEventSequenceProcessado — tenta de novo no próximo idle.
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

      // TODO: confirmar se o campo é `event.properties.sessionId` ou
      // `event.properties.sessionID` na versão instalada (varia entre
      // exemplos do ecossistema opencode/kilocode encontrados).
      const sessionId: string | undefined =
        (event as any).properties?.sessionId ?? (event as any).properties?.sessionID;

      if (!sessionId) {
        console.warn("[agentmap-wakeup] session.idle sem sessionId reconhecível, ignorando.");
        return;
      }

      agendarVerificacao(sessionId, ctx.client);
    },
  };
};

export default { id: "agentmap-wakeup", server: AgentMapWakeup };
