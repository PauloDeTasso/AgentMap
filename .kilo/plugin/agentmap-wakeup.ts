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
  const promptRecovery = "ERRO NO SISTEMA! NAO PRECISA RESOLVER ESSE ERRO, APENAS CONTINUE SUA TAREFA DE ONDE PAROU E SE PRECISAR SE AUTOIDENTIFIQUE PELAS TOOLS DO MCP, ROTAS DE API OU DOCUMENTOS DO AGENT MAP!";

  const logInicio = `[agentmap-wakeup] session.error detectado na sessão ${sessionId} — iniciando recovery`;
  console.error(logInicio);
  await logEmArquivo(directory, logInicio);

  try {
    const logPrompt = `[agentmap-wakeup] Injetando prompt de recovery na sessão ${sessionId}`;
    console.log(logPrompt);
    await logEmArquivo(directory, logPrompt);

    const promptResult = await (client.session as any).promptAsync({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text", text: promptRecovery }],
      },
    });

    const logRetorno = `[agentmap-wakeup] promptAsync recovery retornou: ${JSON.stringify(promptResult)}`;
    console.log(logRetorno);
    await logEmArquivo(directory, logRetorno);

    const logSucesso = `[agentmap-wakeup] Recovery injetado com sucesso na sessão ${sessionId} às ${new Date().toISOString()}`;
    console.log(logSucesso);
    await logEmArquivo(directory, logSucesso);
  } catch (err) {
    const logErro = `[agentmap-wakeup] Falha ao injetar prompt de recovery: ${err}`;
    console.error(logErro);
    await logEmArquivo(directory, logErro);
  }
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
      const sessionId: string | undefined = (event as any).properties?.sessionID;
      const logEvento = `[agentmap-wakeup] EVENTO RECEBIDO tipo=${event.type} sessionID=${sessionId}`;
      console.log(logEvento);
      await logEmArquivo(ctx.directory, logEvento);

      if (event.type === "session.idle") {
        if (!sessionId) {
          console.warn("[agentmap-wakeup] session.idle sem sessionID, ignorando.");
          return;
        }

        agendarVerificacao(sessionId, ctx.client, ctx.directory);
        return;
      }

      if (event.type === "session.error") {
        if (!sessionId) {
          console.warn("[agentmap-wakeup] session.error sem sessionID, ignorando.");
          return;
        }

        await injetarPromptRecovery(sessionId, ctx.client, ctx.directory);
        return;
      }
    },
  };
};

export default { id: "agentmap-wakeup", server: AgentMapWakeup };
