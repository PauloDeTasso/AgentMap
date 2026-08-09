export const AGENTES_MD = (nomeProjeto: string, nomeAgentMap: string) => `# ${nomeProjeto} — Governado pelo ${nomeAgentMap}

Este projeto é gerenciado pelo **${nomeAgentMap}**.
Qualquer agente Kilo Code que abrir esta pasta deve seguir as regras do AgentMap antes de executar qualquer trabalho.

## Instruções rápidas

- Toda a governança do projeto está em \`.ia/\`.
- Use as **tools MCP do AgentMap** para ler/escrever tarefas, contratos, dependências, handoffs, eventos, bloqueios, decisões, riscos e resultados.
- O AgentMap roda em \`http://localhost:3150\`.
- Não execute trabalho fora do fluxo definido em \`.ia/fluxo-trabalho.md\`.

## O que ler primeiro

1. \`.ia/fluxo-trabalho.md\`
2. \`.ia/fluxo-trabalho-padrao.md\`
3. \`.ia/contratos/\`
4. \`.ia/procedimentos/preparacao-<papel>.md\`
5. \`.ia/configuracao/projeto.json\`

## Regra obrigatória

- Nenhuma tarefa pode iniciar sem dependências atendidas.
- Cada agente só começa depois de ler seu documento de preparação.
- Cada agente só termina depois de registrar entregas, handoffs e confirmar eventos.

## Wake-up automático

Este projeto inclui \`.kilo/plugin/agentmap-wakeup.ts\`. Se o Kilo Code estiver ocioso, ele pode ser acordado automaticamente por eventos do AgentMap.
`;

export const KILO_AGENTMAP_JSON = (agentMapPath: string) => ({
  agentMapPath,
  apiBase: "http://localhost:3150",
  mcp: {
    agentmap: {
      type: "local",
      command: [
        "cmd",
        "/c",
        "cd",
        agentMapPath.replace(/\\/g, "/"),
        "&&",
        "npx",
        "tsx",
        "src/mcp-server/index.ts"
      ],
      environment: {
        NODE_ENV: "production"
      },
      enabled: true,
      timeout: 30000
    }
  },
  plugin: [
    "./.kilo/plugin/agentmap-wakeup.ts"
  ]
});

export const AGENTMAP_WAKEUP_PLUGIN_TS = `// .kilo/plugin/agentmap-wakeup.ts
//
// Plugin oficial do Kilo Code para wake-up automático via AgentMap.
// Roda DENTRO do processo do Kilo Code e consulta http://localhost:3150
// para acordar a sessão quando houver eventos pendentes.

import type { Plugin, PluginInput } from "@kilocode/plugin";

const AGENTMAP_API_URL = process.env.AGENTMAP_API_URL || "http://localhost:3150";
const AGENTMAP_API_KEY = process.env.AGENTMAP_API_KEY || "";
const DEBOUNCE_MS = Number(process.env.AGENTMAP_WAKEUP_DEBOUNCE_MS) || 3000;

let ultimoEventSequenceProcessado = 0;
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

interface MensagemPendente {
  id: string;
  agenteOrigem?: string;
  resumo?: string;
  eventSequence?: number;
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
    console.error(\`[agentmap-wakeup] AgentMap respondeu \${res.status} em \${url}\`);
    return [];
  }

  const body = await res.json();
  const mensagens: MensagemPendente[] = Array.isArray(body?.dados)
    ? body.dados
    : Array.isArray(body?.mensagens)
      ? body.mensagens
      : [];

  return mensagens.filter(
    (m) => typeof m.eventSequence === "number" && m.eventSequence > ultimoEventSequenceProcessado
  );
}

function montarResumo(mensagens: MensagemPendente[]): string {
  const linhas = mensagens.map(
    (m) => \`- [\${m.agenteOrigem || "agente"}] \${m.resumo || m.id}\`
  );
  return (
    \`Novas atualizações no AgentMap enquanto você estava ocioso:\\n\` +
    linhas.join("\\n") +
    \`\\n\\nConsulte o AgentMap para os detalhes completos antes de prosseguir.\`
  );
}

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
        path: { id: sessionId },
        body: {
          parts: [{ type: "text", text: resumo }],
        },
      });

      ultimoEventSequenceProcessado = Math.max(
        ultimoEventSequenceProcessado,
        ...pendentes.map((m) => m.eventSequence || 0)
      );

      console.log(
        \`[agentmap-wakeup] Wake-up enviado para sessão \${sessionId} (\${pendentes.length} mensagem(ns))\`
      );
    } catch (err) {
      console.error("[agentmap-wakeup] Falha ao processar wake-up:", err);
    }
  }, DEBOUNCE_MS);

  debounceTimers.set(sessionId, timer);
}

const AgentMapWakeup: Plugin = async (ctx: PluginInput) => {
  console.log(
    \`[agentmap-wakeup] Plugin carregado — diretório: \${ctx.directory}, AgentMap: \${AGENTMAP_API_URL}\`
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
`;
