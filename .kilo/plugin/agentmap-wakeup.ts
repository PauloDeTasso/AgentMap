// .kilo/plugin/agentmap-wakeup.ts
//
// Plugin oficial do Kilo Code — roda DENTRO do mesmo processo do `kilo serve`
// (tanto na extensão VS Code quanto na CLI). Não é um script externo.
//
// O que faz: toda vez que uma sessão fica ociosa (session.idle), pergunta pro
// AgentMap se tem mensagem pendente pra essa sessão/projeto. Se tiver, injeta
// um novo prompt na mesma sessão via client.session.promptAsync — sem precisar
// de CLI externo, porta ou senha (o plugin já roda com acesso nativo ao client).
//
// Baseado em: RELATORIO-FINAL-AGENTMAP.md (seção 1 e §4) e tipagens oficiais
// de @kilocode/plugin v7.4.20 e @kilocode/sdk v7.4.20.

import type { Plugin, PluginInput } from "@kilocode/plugin";

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const AGENTMAP_API_URL = (globalThis as any).process?.env?.AGENTMAP_API_URL || "http://localhost:3150";
const AGENTMAP_API_KEY = (globalThis as any).process?.env?.AGENTMAP_API_KEY || "";
const DEBOUNCE_MS = Number((globalThis as any).process?.env?.AGENTMAP_WAKEUP_DEBOUNCE_MS || "3000");
const HEARTBEAT_INTERVAL_MS = Number((globalThis as any).process?.env?.AGENTMAP_WAKEUP_HEARTBEAT_MS || String(2 * 60 * 1000));
const HEARTBEAT_PROMPT = (globalThis as any).process?.env?.AGENTMAP_WAKEUP_HEARTBEAT_PROMPT || "Aviso do AgentMap: verifique o status das tarefas no agentmap e verique as que sao para voce, se necessario se autoidentifique-se e se atualize do seu progresso ou tarefas se necessário, reporte o que precisa se ainda nao foi reportado.";

const TIPOS_RELEVANTES = new Set([
  "KILO_CHAT_REPLY",
  "KILO_REPLY",
  "KILO_RESULT",
  "KILO_CHAT",
  "WAKEUP_PARENT",
  "HANDOFF_CRIADO",
  "HANDOFF_ACEITO",
  "HANDOFF_CONCLUIDO",
  "SOLICITACAO_CRIADA",
  "SOLICITACAO_APROVADA",
  "SOLICITACAO_REJEITADA",
  "SOLICITACAO_EXCLUIDA",
  "SOLICITACAO_ALTERADA",
  "TAREFA_CRIADA",
  "TAREFA_ATRIBUIDA",
  "TAREFA_INICIADA",
  "TAREFA_CONCLUIDA",
  "TAREFA_CANCELADA",
  "TAREFA_BLOQUEADA",
  "TAREFA_DESBLOQUEADA",
  "TAREFA_ESTADO_ALTERADO",
  "TAREFA_EXCLUIDA",
  "TAREFA_RECONCILIADA",
  "BLOQUEIO_CRIADO",
  "BLOQUEIO_RESOLVIDO",
  "CONFLITO_CRIADO",
  "CONFLITO_RESOLVIDO",
  "RESULTADO_REGISTRADO",
  "ARTEFATO_CRIADO",
  "VALIDACAO_INICIADA",
  "VALIDACAO_CONCLUIDA",
  "RESERVA_CRIADA",
  "RESERVA_LIBERADA",
  "SESSAO_INICIADA",
  "SESSAO_FINALIZADA",
  "CHECKPOINT_CRIADO",
  "APRENDIZADO_REGISTRADO",
  "PENDENCIA_CRIADA",
  "PENDENCIA_RESOLVIDA",
  "DEPENDENCIA_CRIADA",
  "DECISAO_CRIADA",
  "DECISAO_ATUALIZADA",
  "RISCO_CRIADO",
  "RISCO_ATUALIZADO",
  "RESPONSABILIDADE_REGISTRADA",
  "ARQUIVO_ALTERADO",
  "ARQUIVO_EXCLUIDO",
  "APROVACAO_SOLICITADA",
  "APROVACAO_CONCEDIDA",
  "APROVACAO_REJEITADA",
  "IMPLANTACAO_REALIZADA",
  "SEGURANCA_VIOLACAO",
  "BACKUP_CRIADO",
  "CONTRATO_CRIADO",
  "CONTRATO_ALTERADO",
  "CONTRATO_EXCLUIDO",
  "CONTRATO_VALIDADO",
  "CONTRATO_INVALIDO",
  "TESTE_EXECUTADO",
  "REVISAO_REALIZADA",
  "MODO_GLOBAL_ALTERADO",
  "MODO_AGENTE_ALTERADO",
  "STATUS_AGENTE_ATUALIZADO",
  "MODO_AUTONOMIA_ALTERADO",
  "INSTANCIA_REGISTRADA",
  "INSTANCIA_CONECTADA",
  "INSTANCIA_DESCONECTADA",
  "INSTANCIA_ERRO",
  "INSTANCIA_ATUALIZADA",
  "INSTANCIA_EXCLUIDA",
  "PROJETO_CRIADO",
  "PROJETO_ABERTO",
  "AGENTE_CRIADO",
  "AGENTE_ATUALIZADO",
  "AGENTE_EXCLUIDO",
  "INTERVENCAO_MANUAL",
  "REGRAS_RESPEITADAS",
  "CONTATO_CRIADO",
  "CONTATO_ATUALIZADO",
  "CONTATO_EXCLUIDO",
  "EVENTO_CRIADO",
  "EVENTO_CONSUMIDO",
  "BROADCAST_ANUNCIO",
  "INTEGRIDADE_VERIFICADA",
  "INTEGRIDADE_FALHA",
  "COMANDO_USUARIO",
  "INTERVENCAO_USUARIO",
  "MODO_ALTERADO",
  "AGENTE_STATUS_ALTERADO",
  "ATUALIZAR_STATUS",
]);

// ---------------------------------------------------------------------------
// Estado local do plugin (em memória — reinicia junto com o processo do Kilo)
// ---------------------------------------------------------------------------

let ultimoEventSequenceProcessado = 0;
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const sessoesComRecovery = new Set<string>();
const RECOVERY_COOLDOWN_MS = 5 * 60 * 1000;
const recoveryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const heartbeatTimers = new Map<string, ReturnType<typeof setTimeout>>();
const sessoesInterrompidas = new Set<string>();
const INTERRUPT_CLEANUP_MS = 5 * 60 * 1000;
const interruptTimers = new Map<string, ReturnType<typeof setTimeout>>();
const ATIVIDADE_MAX_MS = 60_000;
const atividadeRecente = new Map<string, number>();

// ---------------------------------------------------------------------------
// Consulta ao AgentMap
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

  return mensagens.filter(
    (m) => typeof m.eventSequence === "number" && m.eventSequence > ultimoEventSequenceProcessado
  );
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
// Log em arquivo
// ---------------------------------------------------------------------------

async function logEmArquivo(directory: string, mensagem: string) {
  try {
    // @ts-ignore
    const { promises } = await import("fs") as any;
    // @ts-ignore
    const { join } = await import("path") as any;
    const logDir = join(directory, ".ia", "contexto");
    const logPath = join(logDir, "agentmap-wakeup.log");
    const linha = `${new Date().toISOString()} ${mensagem}\n`;
    await promises.mkdir(logDir, { recursive: true });
    await promises.appendFile(logPath, linha, "utf-8");
  } catch {
    // silencioso — se não conseguir escrever, mantém apenas o console
  }
}

// ---------------------------------------------------------------------------
// Disparo do wake-up (com debounce por sessão)
// ---------------------------------------------------------------------------

function agendarVerificacao(sessionId: string, client: PluginInput["client"], directory: string) {
  const timerExistente = debounceTimers.get(sessionId);
  if (timerExistente) clearTimeout(timerExistente);

  const logAgendado = `[agentmap-wakeup] Verificacao agendada para session ${sessionId} em ${DEBOUNCE_MS}ms`;
  console.log(logAgendado);
  logEmArquivo(directory, logAgendado);

  const timer = setTimeout(async () => {
    debounceTimers.delete(sessionId);
    try {
      if (estaOcupado(sessionId)) {
        const logOcupado = `[agentmap-wakeup] Verificacao suprimida (ocupado): sessao ${sessionId}`;
        console.log(logOcupado);
        await logEmArquivo(directory, logOcupado);
        return;
      }
      const pendentes = await buscarMensagensPendentes();
      if (pendentes.length === 0) {
        const logVazio = `[agentmap-wakeup] Nenhuma mensagem pendente para session ${sessionId}`;
        console.log(logVazio);
        await logEmArquivo(directory, logVazio);
        return;
      }

      const resumo = montarResumo(pendentes);

      const logPrompt = `[agentmap-wakeup] Injetando prompt na sessão ${sessionId}:\n${resumo}`;
      console.log(logPrompt);
      await logEmArquivo(directory, logPrompt);

      const promptResult = await (client.session as any).promptAsync({
        path: { id: sessionId },
        body: {
          parts: [{ type: "text", text: resumo }],
        },
      });

      const logRetorno = `[agentmap-wakeup] promptAsync retornou: ${JSON.stringify(promptResult)}`;
      console.log(logRetorno);
      await logEmArquivo(directory, logRetorno);

      ultimoEventSequenceProcessado = Math.max(
        ultimoEventSequenceProcessado,
        ...pendentes.map((m) => m.eventSequence || 0)
      );

      const logOk = `[agentmap-wakeup] Wake-up enviado para sessão ${sessionId} (${pendentes.length} mensagem(ns))`;
      console.log(logOk);
      await logEmArquivo(directory, logOk);

      const logConfirmacao = `[agentmap-wakeup] Confirmacao: mensagem injetada na sessão ${sessionId} às ${new Date().toISOString()}`;
      console.log(logConfirmacao);
      await logEmArquivo(directory, logConfirmacao);
    } catch (err) {
      const logErro = `[agentmap-wakeup] Falha ao processar wake-up: ${err}`;
      console.error(logErro);
      await logEmArquivo(directory, logErro);
    }
  }, DEBOUNCE_MS);

  debounceTimers.set(sessionId, timer);
}

async function injetarPromptRecovery(sessionId: string, client: PluginInput["client"], directory: string) {
  const promptRecovery = "Ocorreu um erro no sistema. Nao tente resolver agora. Apenas continue sua tarefa de onde parou e, se precisar se autoidentificar, use as tools do MCP, rotas de API ou documentos do Agent Map.";

  try {
    await (client.session as any).promptAsync({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text", text: promptRecovery }],
      },
    });

    sessoesComRecovery.add(sessionId);
    const timerExistente = recoveryTimers.get(sessionId);
    if (timerExistente) clearTimeout(timerExistente);
    recoveryTimers.set(
      sessionId,
      setTimeout(() => {
        sessoesComRecovery.delete(sessionId);
        recoveryTimers.delete(sessionId);
      }, RECOVERY_COOLDOWN_MS)
    );
  } catch {
    // silencioso — se falhar, o proximo session.error tentara de novo
  }
}

function isToolError(output: any): boolean {
  if (!output || typeof output !== "object") return false;
  if (output.isError === true) return true;
  if (output.status === "error") return true;
  if (typeof output.exit === "number" && output.exit !== 0) return true;

  const text = [
    typeof output.output === "string" ? output.output : "",
    typeof output.title === "string" ? output.title : "",
    typeof output.error === "string" ? output.error : "",
    typeof output.message === "string" ? output.message : "",
  ]
    .join(" ")
    .toLowerCase();

  if (!text) return false;
  return /error|exception|failed|traceback|not recognized|não é reconhecido|command not found|code \d+|fatal|crash/.test(text);
}

function marcarAtividade(sessionId: string) {
  if (!sessionId) return;
  const agora = Date.now();
  atividadeRecente.set(sessionId, agora);
  const log = `[agentmap-wakeup] Atividade registrada para ${sessionId} em ${new Date(agora).toISOString()}`;
  console.log(log);
}

function estaOcupado(sessionId: string): boolean {
  if (!sessionId) return false;
  const ultima = atividadeRecente.get(sessionId);
  const agora = Date.now();
  const log = `[agentmap-wakeup] estaOcupado(${sessionId}) => ultima=${ultima ? new Date(ultima).toISOString() : "nunca"}, agora=${new Date(agora).toISOString()}, delta=${ultima ? agora - ultima : "n/a"}ms => ${ultima ? agora - ultima < ATIVIDADE_MAX_MS : false}`;
  console.log(log);
  if (ultima === undefined) return false;
  return agora - ultima < ATIVIDADE_MAX_MS;
}

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
    const temTarefa = Number(tarefas.pendentes || 0) > 0 || Number(tarefas.emExecucao || 0) > 0 || Number(tarefas.bloqueadas || 0) > 0;

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

async function injetarHeartbeat(sessionId: string, client: PluginInput["client"], directory: string) {
  if (estaOcupado(sessionId)) {
    const logOcupado = `[agentmap-wakeup] heartbeat suprimido (ocupado): sessao ${sessionId}`;
    console.log(logOcupado);
    await logEmArquivo(directory, logOcupado);
    return;
  }

  const log = `[agentmap-wakeup] heartbeat iniciado para session ${sessionId}`;
  console.log(log);
  await logEmArquivo(directory, log);

  try {
    const promptResult = await (client.session as any).promptAsync({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text", text: HEARTBEAT_PROMPT }],
      },
    });

    const logRetorno = `[agentmap-wakeup] heartbeat retornou: ${JSON.stringify(promptResult)}`;
    console.log(logRetorno);
    await logEmArquivo(directory, logRetorno);
  } catch (err) {
    const logErro = `[agentmap-wakeup] Falha no heartbeat: ${err}`;
    console.error(logErro);
    await logEmArquivo(directory, logErro);
  }
}
async function iniciarHeartbeat(sessionId: string, client: PluginInput["client"], directory: string) {
  const timerExistente = heartbeatTimers.get(sessionId);
  if (timerExistente) clearInterval(timerExistente);

  const log = `[agentmap-wakeup] heartbeat agendado para session ${sessionId} a cada ${HEARTBEAT_INTERVAL_MS}ms`;
  console.log(log);
  await logEmArquivo(directory, log);

  const timer = setInterval(async () => {
    try {
      const pendentes = await buscarMensagensPendentes();
      if (pendentes.length > 0) {
        const log = `[agentmap-wakeup] heartbeat skip: ${pendentes.length} mensagem(ns) pendente(s) para session ${sessionId}`;
        console.log(log);
        await logEmArquivo(directory, log);
        return;
      }

      const trabalho = await temTrabalhoPendente();
      if (!trabalho) {
        const log = `[agentmap-wakeup] heartbeat parado: sem trabalho pendente para session ${sessionId}`;
        console.log(log);
        await logEmArquivo(directory, log);
        pararHeartbeat(sessionId, directory);
        return;
      }

      await injetarHeartbeat(sessionId, client, directory);
    } catch (err) {
      const logErro = `[agentmap-wakeup] Falha no heartbeat cycle: ${err}`;
      console.error(logErro);
      await logEmArquivo(directory, logErro);
    }
  }, HEARTBEAT_INTERVAL_MS);

  heartbeatTimers.set(sessionId, timer);
}
async function pararHeartbeat(sessionId: string, directory: string) {
  const timer = heartbeatTimers.get(sessionId);
  if (timer) {
    clearInterval(timer);
    heartbeatTimers.delete(sessionId);
  }

  const log = `[agentmap-wakeup] heartbeat parado para session ${sessionId}`;
  console.log(log);
  await logEmArquivo(directory, log);
}

// ---------------------------------------------------------------------------
// Definição do plugin
// ---------------------------------------------------------------------------

const AgentMapWakeup: Plugin = async (ctx: PluginInput) => {
  const inicio = `[agentmap-wakeup] Plugin carregado — diretório: ${ctx.directory}, AgentMap: ${AGENTMAP_API_URL}`;
  console.log(inicio);
  await logEmArquivo(ctx.directory, inicio);

  return {
    event: async ({ event }) => {
      const sessionId: string | undefined =
        (event as any).properties?.sessionID || (event as any).sessionID;
      const eventType = (event as any).type as string;

      const logEvento = `[agentmap-wakeup] Evento recebido: type=${eventType}, sessionID=${sessionId}, props=${JSON.stringify((event as any).properties || {}).slice(0, 200)}`;
      console.log(logEvento);

      if (sessionId && eventType !== "session.idle") {
        marcarAtividade(sessionId);
      }

      if (eventType === "session.idle") {
        const logIdle = `[agentmap-wakeup] session.idle detectado na sessão ${sessionId}`;
        console.log(logIdle);
        await logEmArquivo(ctx.directory, logIdle);

        if (!sessionId) {
          console.warn("[agentmap-wakeup] session.idle sem sessionID, ignorando.");
          return;
        }

        sessoesInterrompidas.delete(sessionId);
        const timerInterrupcao = interruptTimers.get(sessionId);
        if (timerInterrupcao) clearTimeout(timerInterrupcao);
        interruptTimers.delete(sessionId);

        agendarVerificacao(sessionId, ctx.client, ctx.directory);
        iniciarHeartbeat(sessionId, ctx.client, ctx.directory);
        sessoesComRecovery.delete(sessionId);
        const timer = recoveryTimers.get(sessionId);
        if (timer) clearTimeout(timer);
        recoveryTimers.delete(sessionId);
        return;
      }

      if (eventType === "session.next.interrupt.requested") {
        const sid = typeof (event as any).properties?.sessionID === "string"
          ? (event as any).properties.sessionID
          : sessionId;
        if (!sid) {
          console.warn("[agentmap-wakeup] session.next.interrupt.requested sem sessionID, ignorando.");
          return;
        }

        sessoesInterrompidas.add(sid);
        const logInterrupcao = `[agentmap-wakeup] Interrupção (stop) detectada na sessão ${sid} — recuperação suprimida.`;
        console.log(logInterrupcao);
        await logEmArquivo(ctx.directory, logInterrupcao);

        const timerExistente = interruptTimers.get(sid);
        if (timerExistente) clearTimeout(timerExistente);
        interruptTimers.set(
          sid,
          setTimeout(() => {
            sessoesInterrompidas.delete(sid);
            interruptTimers.delete(sid);
          }, INTERRUPT_CLEANUP_MS)
        );

        return;
      }

      if (eventType === "session.error") {
        const nomeErro = typeof (event as any)?.properties?.error?.name === "string"
          ? (event as any).properties.error.name
          : "";
        const mensagemErro = typeof (event as any)?.properties?.error?.data?.message === "string"
          ? (event as any).properties.error.data.message
          : "";

        const ehInterrupcaoUsuario =
          sessoesInterrompidas.has(sessionId || "") ||
          nomeErro === "MessageAbortedError" ||
          /abort|cancel|interrompid|interrupt|stopped|user/i.test(`${nomeErro} ${mensagemErro}`);

        if (ehInterrupcaoUsuario) {
          const logInterrupcao = `[agentmap-wakeup] session.error suprimido (interrupção do usuário: ${nomeErro || "desconhecido"}) na sessão ${sessionId}.`;
          console.log(logInterrupcao);
          await logEmArquivo(ctx.directory, logInterrupcao);
          return;
        }

        const logError = `[agentmap-wakeup] session.error detectado na sessão ${sessionId}`;
        console.error(logError);
        await logEmArquivo(ctx.directory, logError);

        if (!sessionId) {
          console.warn("[agentmap-wakeup] session.error sem sessionID, ignorando.");
          return;
        }

        await injetarPromptRecovery(sessionId, ctx.client, ctx.directory);
        await pararHeartbeat(sessionId, ctx.directory);
        return;
      }
    },
    "tool.execute.after": async (input) => {
      const logTool = `[agentmap-wakeup] tool.execute.after: sessionID=${input.sessionID}, tool=${input.tool}`;
      console.log(logTool);
      if (input.sessionID) marcarAtividade(input.sessionID);
    },
    "chat.message": async (input) => {
      const logChat = `[agentmap-wakeup] chat.message: sessionID=${input.sessionID}`;
      console.log(logChat);
      if (input.sessionID) marcarAtividade(input.sessionID);
    },
  };
};

export default { id: "agentmap-wakeup", server: AgentMapWakeup };
