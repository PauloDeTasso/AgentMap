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
//
// Arquitetura: máquina de estados por sessão com cursor isolado por
// \`projectId:sessionId\` e exclusão de sessoes-filhas do wake-up.

import type { Plugin, PluginInput } from "@kilocode/plugin";

const AGENTMAP_API_URL = process.env.AGENTMAP_API_URL || "http://localhost:3150";
const AGENTMAP_API_KEY = process.env.AGENTMAP_API_KEY || "";
const DEBOUNCE_MS = Number(process.env.AGENTMAP_WAKEUP_DEBOUNCE_MS) || 3000;

const TIPOS_RELEVANTES = new Set([
  "KILO_CHAT_REPLY","KILO_REPLY","KILO_RESULT","KILO_CHAT","WAKEUP_PARENT",
  "HANDOFF_CRIADO","HANDOFF_ACEITO","HANDOFF_CONCLUIDO",
  "SOLICITACAO_CRIADA","SOLICITACAO_APROVADA","SOLICITACAO_REJEITADA",
  "SOLICITACAO_EXCLUIDA","SOLICITACAO_ALTERADA",
  "TAREFA_CRIADA","TAREFA_ATRIBUIDA","TAREFA_INICIADA","TAREFA_CONCLUIDA",
  "TAREFA_CANCELADA","TAREFA_BLOQUEADA","TAREFA_DESBLOQUEADA",
  "TAREFA_ESTADO_ALTERADO","TAREFA_EXCLUIDA","TAREFA_RECONCILIADA",
  "BLOQUEIO_CRIADO","BLOQUEIO_RESOLVIDO","CONFLITO_CRIADO","CONFLITO_RESOLVIDO",
  "RESULTADO_REGISTRADO","ARTEFATO_CRIADO","VALIDACAO_INICIADA","VALIDACAO_CONCLUIDA",
  "RESERVA_CRIADA","RESERVA_LIBERADA","SESSAO_INICIADA","SESSAO_FINALIZADA",
  "CHECKPOINT_CRIADO","APRENDIZADO_REGISTRADO","PENDENCIA_CRIADA","PENDENCIA_RESOLVIDA",
  "DEPENDENCIA_CRIADA","DECISAO_CRIADA","DECISAO_ATUALIZADA",
  "RISCO_CRIADO","RISCO_ATUALIZADO","RESPONSABILIDADE_REGISTRADA",
  "ARQUIVO_ALTERADO","ARQUIVO_EXCLUIDO","APROVACAO_SOLICITADA",
  "APROVACAO_CONCEDIDA","APROVACAO_REJEITADA","IMPLANTACAO_REALIZADA",
  "SEGURANCA_VIOLACAO","BACKUP_CRIADO","CONTRATO_CRIADO","CONTRATO_ALTERADO",
  "CONTRATO_EXCLUIDO","CONTRATO_VALIDADO","CONTRATO_INVALIDO",
  "TESTE_EXECUTADO","REVISAO_REALIZADA","MODO_GLOBAL_ALTERADO",
  "MODO_AGENTE_ALTERADO","STATUS_AGENTE_ATUALIZADO","MODO_AUTONOMIA_ALTERADO",
  "INSTANCIA_REGISTRADA","INSTANCIA_CONECTADA","INSTANCIA_DESCONECTADA",
  "INSTANCIA_ERRO","INSTANCIA_ATUALIZADA","INSTANCIA_EXCLUIDA",
  "PROJETO_CRIADO","PROJETO_ABERTO","AGENTE_CRIADO","AGENTE_ATUALIZADO",
  "AGENTE_EXCLUIDO","INTERVENCAO_MANUAL","REGRAS_RESPEITADAS",
  "CONTATO_CRIADO","CONTATO_ATUALIZADO","CONTATO_EXCLUIDO",
  "EVENTO_CRIADO","EVENTO_CONSUMIDO","BROADCAST_ANUNCIO",
  "INTEGRIDADE_VERIFICADA","INTEGRIDADE_FALHA","COMANDO_USUARIO",
  "INTERVENCAO_USUARIO","MODO_ALTERADO","AGENTE_STATUS_ALTERADO","ATUALIZAR_STATUS",
]);

interface EstadoSessao {
  sessionId: string;
  projectId: string;
  isChildSession: boolean;
  status: string;
  cursorEventSequence: number;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  recoveryAtivo: boolean;
  recoveryTimer: ReturnType<typeof setTimeout> | null;
  operacaoEmAndamento: string;
}

const sessoes = new Map<string, EstadoSessao>();

function chaveSessao(projectId: string, sessionId: string) {
  return projectId + ":" + sessionId;
}

function obterOuCriarEstado(projectId: string, sessionId: string): EstadoSessao {
  const key = chaveSessao(projectId, sessionId);
  let estado = sessoes.get(key);
  if (!estado) {
    estado = {
      sessionId, projectId, isChildSession: false, status: "unknown",
      cursorEventSequence: 0, debounceTimer: null, recoveryAtivo: false,
      recoveryTimer: null, operacaoEmAndamento: "idle",
    };
    sessoes.set(key, estado);
  }
  return estado;
}

function estaOcupado(estado: EstadoSessao): boolean {
  return estado.status === "busy" || estado.status === "retry";
}

async function buscarMensagensPendentes(estado: EstadoSessao): Promise<any[]> {
  const url = new URL("/api/monitoramento/mensagens", AGENTMAP_API_URL);
  url.searchParams.set("limite", "50");
  if (estado.cursorEventSequence > 0) {
    url.searchParams.set("after", String(estado.cursorEventSequence));
  }

  const res = await fetch(url, {
    headers: AGENTMAP_API_KEY ? { "x-api-key": AGENTMAP_API_KEY } : undefined,
  });

  if (!res.ok) {
    console.error("[agentmap-wakeup] AgentMap respondeu " + res.status);
    return [];
  }

  const body = await res.json();
  const raw = Array.isArray(body?.dados) ? body.dados : Array.isArray(body?.mensagens) ? body.mensagens : [];

  const mensagens = raw.filter((item: any) => {
    const obj = item;
    return typeof obj.eventSequence === "number" && TIPOS_RELEVANTES.has(obj.tipo || "");
  });

  const novas = mensagens.filter((m: any) => m.eventSequence > estado.cursorEventSequence);
  if (novas.length > 0) {
    estado.cursorEventSequence = Math.max(estado.cursorEventSequence, ...novas.map((m: any) => m.eventSequence || 0));
  }

  return novas;
}

function montarResumo(mensagens: any[]): string {
  const linhas = mensagens.map((m) => "- [" + (m.agenteOrigem || m.emissor || "agente") + "] " + (m.resumo || m.conteudo || m.id));
  return "Novas atualizações no AgentMap enquanto você estava ocioso:\n" + linhas.join("\n") + "\n\nConsulte o AgentMap para os detalhes completos antes de prosseguir.";
}

function agendarVerificacao(projectId: string, sessionId: string, client: PluginInput["client"]) {
  const estado = obterOuCriarEstado(projectId, sessionId);
  if (estado.debounceTimer) clearTimeout(estado.debounceTimer);

  estado.debounceTimer = setTimeout(async () => {
    estado.debounceTimer = null;
    if (estaOcupado(estado)) {
      console.log("[agentmap-wakeup] Verificacao suprimida (ocupado): " + sessionId);
      return;
    }
    const pendentes = await buscarMensagensPendentes(estado);
    if (pendentes.length === 0) return;

    const resumo = montarResumo(pendentes);
    if (estado.operacaoEmAndamento !== "idle") return;
    estado.operacaoEmAndamento = "wakeup";

    try {
      const metodo = client.session;
      const chamar = typeof metodo.prompt === "function" ? metodo.prompt : typeof metodo.promptAsync === "function" ? metodo.promptAsync : null;
      if (chamar) {
        await chamar({ path: { id: sessionId }, body: { parts: [{ type: "text", text: resumo }] } });
      }
    } catch (err) {
      console.error("[agentmap-wakeup] Falha no wake-up:", err);
    } finally {
      estado.operacaoEmAndamento = "idle";
    }
  }, DEBOUNCE_MS);
}

function extrairParentId(event: any): string | null {
  const data = event?.properties?.data || event?.data || {};
  const parentId = data?.parentID || event?.properties?.parentID;
  return typeof parentId === "string" ? parentId : null;
}

const AgentMapWakeup: Plugin = async (ctx: PluginInput) => {
  const projectId = ctx.project?.id || ctx.directory;
  console.log("[agentmap-wakeup] Plugin carregado — diretorio: " + ctx.directory + ", projeto: " + projectId);

  return {
    event: async ({ event }) => {
      const sessionId: string | undefined = (event as any).properties?.sessionID || (event as any).sessionID;
      const eventType = (event as any).type;

      if (!sessionId) return;

      const estado = obterOuCriarEstado(projectId, sessionId);

      if (eventType === "session.created") {
        const parentId = extrairParentId(event);
        if (parentId) {
          estado.parentId = parentId;
          estado.isChildSession = true;
          console.log("[agentmap-wakeup] Sessao-filha detectada: " + sessionId);
        }
        return;
      }

      if (eventType === "session.updated") {
        const parentId = extrairParentId(event);
        if (parentId && !estado.parentId) {
          estado.parentId = parentId;
          estado.isChildSession = true;
          console.log("[agentmap-wakeup] Sessao-filha detectada via updated: " + sessionId);
        }
        return;
      }

      if (eventType === "session.status") {
        const status = typeof (event as any)?.properties?.status === "string"
          ? (event as any).properties.status
          : typeof (event as any)?.data?.status === "string"
            ? (event as any).data.status
            : "unknown";
        if (status === "idle" || status === "busy" || status === "retry") {
          estado.status = status;
        }
        if (estado.status === "idle" && estado.operacaoEmAndamento !== "idle") {
          estado.operacaoEmAndamento = "idle";
        }
        return;
      }

      if (eventType === "session.idle") {
        if (estado.isChildSession) {
          console.log("[agentmap-wakeup] session.idle suprimido (sessao-filha): " + sessionId);
          return;
        }
        estado.status = "idle";
        estado.operacaoEmAndamento = "idle";
        agendarVerificacao(projectId, sessionId, ctx.client);
        return;
      }

      if (eventType === "session.next.interrupt.requested") {
        console.log("[agentmap-wakeup] Interrupcao detectada: " + sessionId);
        return;
      }

      if (eventType === "session.error") {
        const nomeErro = typeof (event as any)?.properties?.error?.name === "string"
          ? (event as any).properties.error.name
          : "";
        const mensagemErro = typeof (event as any)?.properties?.error?.data?.message === "string"
          ? (event as any).properties.error.data.message
          : "";
        const ehInterrupcao = nomeErro === "MessageAbortedError" || /abort|cancel|interrompid|interrupt|stopped|user/i.test(nomeErro + " " + mensagemErro);
        if (ehInterrupcao) {
          console.log("[agentmap-wakeup] session.error suprimido (interrupcao): " + sessionId);
          return;
        }

        if (estado.recoveryAtivo) {
          console.log("[agentmap-wakeup] Recovery suprimido (cooldown ativo): " + sessionId);
          return;
        }

        const promptRecovery = "Ocorreu um erro no sistema. Nao tente resolver agora. Apenas continue sua tarefa de onde parou.";
        estado.operacaoEmAndamento = "recovery";
        try {
          const metodo = client.session;
          const chamar = typeof metodo.prompt === "function" ? metodo.prompt : typeof metodo.promptAsync === "function" ? metodo.promptAsync : null;
          if (chamar) {
            await chamar({ path: { id: sessionId }, body: { parts: [{ type: "text", text: promptRecovery }] } });
          }
          estado.recoveryAtivo = true;
          estado.recoveryTimer = setTimeout(() => {
            estado.recoveryAtivo = false;
            estado.recoveryTimer = null;
          }, 300000);
        } catch (err) {
          console.error("[agentmap-wakeup] Falha no recovery:", err);
        } finally {
          estado.operacaoEmAndamento = "idle";
        }
        return;
      }

      if (eventType === "session.deleted") {
        const key = chaveSessao(projectId, sessionId);
        const e = sessoes.get(key);
        if (e) {
          if (e.debounceTimer) clearTimeout(e.debounceTimer);
          if (e.recoveryTimer) clearTimeout(e.recoveryTimer);
          if (e.heartbeatTimer) clearInterval(e.heartbeatTimer);
          sessoes.delete(key);
        }
        return;
      }
    },
    "tool.execute.after": async () => {},
    "chat.message": async () => {},
  };
};

export default { id: "agentmap-wakeup", server: AgentMapWakeup };
`;
