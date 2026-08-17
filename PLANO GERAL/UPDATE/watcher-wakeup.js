#!/usr/bin/env node
/**
 * watcher-wakeup.js
 *
 * Processo externo e independente do Kilo Code / VS Code.
 * Faz polling no monitoramento do AgentMap e, ao detectar mensagem nova
 * relevante para o agente principal, injeta um prompt na MESMA sessão
 * que já está aberta na aba do VS Code, via `kilo run --attach`.
 *
 * Baseado em PLANO-WAKEUP-AGENTE-PRINCIPAL-KILOCODE.md.
 *
 * Uso:
 *   node watcher-wakeup.js
 *
 * Variáveis de ambiente esperadas (ver seção "Configuração" abaixo):
 *   AGENTMAP_API_URL         (obrigatória)
 *   AGENTMAP_API_TOKEN       (opcional, se a API exigir auth)
 *   KILO_SESSION_CONFIG_PATH (opcional, default: .agentmap/kilo-session.json)
 *   WATCHER_POLL_INTERVAL_MS (opcional, default: 20000)
 *   WATCHER_DEBOUNCE_MS      (opcional, default: 5000)
 *   WATCHER_AUTONOMY_LEVEL   (opcional, default: WAKE_ONLY)
 */

"use strict";

const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const CONFIG = {
  agentmapApiUrl: process.env.AGENTMAP_API_URL || "http://localhost:3150",
  agentmapApiToken: process.env.AGENTMAP_API_TOKEN || null,
  sessionConfigPath:
    process.env.KILO_SESSION_CONFIG_PATH ||
    path.join(process.cwd(), ".agentmap", "kilo-session.json"),
  pollIntervalMs: Number(process.env.WATCHER_POLL_INTERVAL_MS) || 20000,
  debounceMs: Number(process.env.WATCHER_DEBOUNCE_MS) || 5000,
  autonomyLevel: process.env.WATCHER_AUTONOMY_LEVEL || "WAKE_ONLY",
  stateFilePath: path.join(process.cwd(), ".agentmap", "watcher-state.json"),
  logFilePath: path.join(process.cwd(), ".agentmap", "watcher-wakeup.log"),
};

const TIPOS_RELEVANTES = new Set([
  "TASK_COMPLETED",
  "HANDOFF_COMPLETED",
  "BLOCKED",
  "APPROVAL_REQUIRED",
]);

const AUTONOMY_FLAGS = {
  WAKE_ONLY: [],
  WAKE_AND_CONTINUE: [],
  FULL_AUTONOMY: ["--auto"],
};

// ---------------------------------------------------------------------------
// Logging simples (console + arquivo, para o agente auditar depois)
// ---------------------------------------------------------------------------

async function log(level, msg, extra) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}${
    extra ? " " + JSON.stringify(extra) : ""
  }`;
  console.log(line);
  try {
    await fs.mkdir(path.dirname(CONFIG.logFilePath), { recursive: true });
    await fs.appendFile(CONFIG.logFilePath, line + "\n", "utf8");
  } catch (err) {
    console.error("Falha ao escrever log em arquivo:", err.message);
  }
}

// ---------------------------------------------------------------------------
// Passo 1 — Config da sessão do agente principal (porta, credenciais, session id)
// ---------------------------------------------------------------------------
//
// Formato esperado de .agentmap/kilo-session.json:
// {
//   "port": 51423,
//   "username": "kilo",
//   "password": "xxxxxxxx",
//   "sessionId": "ses_abc123",
//   "updatedAt": "2026-08-17T12:00:00.000Z"
// }
//
// TODO (agente principal): implementar a rotina real de descoberta
// (ver Passo 1 do plano: `kilo session list --format json`, inspeção do
// processo `kilo serve` filho do VS Code) e manter esse arquivo atualizado.
// Aqui só carregamos o que já foi descoberto e persistido.

async function carregarConfigSessao() {
  let raw;
  try {
    raw = await fs.readFile(CONFIG.sessionConfigPath, "utf8");
  } catch (err) {
    throw new Error(
      `Não encontrei ${CONFIG.sessionConfigPath}. Rode a rotina de descoberta ` +
        `de sessão (Passo 1 do plano) antes de iniciar o watcher. Detalhe: ${err.message}`
    );
  }

  const config = JSON.parse(raw);
  const obrigatorios = ["port", "username", "password", "sessionId"];
  const faltando = obrigatorios.filter((campo) => !config[campo]);
  if (faltando.length > 0) {
    throw new Error(
      `${CONFIG.sessionConfigPath} está incompleto. Campos faltando: ${faltando.join(", ")}`
    );
  }

  return config;
}

// ---------------------------------------------------------------------------
// Estado local do watcher (evita re-processar a mesma mensagem)
// ---------------------------------------------------------------------------

async function carregarEstado() {
  try {
    const raw = await fs.readFile(CONFIG.stateFilePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return { ultimoEventSequence: 0 };
  }
}

async function salvarEstado(estado) {
  await fs.mkdir(path.dirname(CONFIG.stateFilePath), { recursive: true });
  await fs.writeFile(CONFIG.stateFilePath, JSON.stringify(estado, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// Passo 3 (Opção B) — Polling na API do AgentMap
// ---------------------------------------------------------------------------
//
// O endpoint GET /api/monitoramento/mensagens suporta limite, agenteId, tipo.
// Não há parâmetro after no HTTP endpoint — o watcher faz fetch e filtra
// client-side por eventSequence > ultimo_processado.
// O service method listarMensagensApos(after, limite) existe internamente
// mas não é exposto via HTTP; use a MCP tool agentmap_monitoramento_verificar_pendentes
// se precisar de cursor server-side via MCP.

async function buscarMensagensNovas(ultimoEventSequence) {
  const url = new URL("/api/monitoramento/mensagens", CONFIG.agentmapApiUrl);
  url.searchParams.set("limite", "100");

  const headers = { Accept: "application/json" };
  if (CONFIG.agentmapApiToken) {
    headers.Authorization = `Bearer ${CONFIG.agentmapApiToken}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(
      `AgentMap API respondeu ${res.status} ${res.statusText} em ${url}`
    );
  }

  const body = await res.json();
  const mensagens = Array.isArray(body.dados) ? body.dados : [];
  const novas = mensagens.filter(
    (m) =>
      typeof m.eventSequence === "number" &&
      m.eventSequence > (ultimoEventSequence || 0)
  );
  return { mensagens: novas, ultimoEventSequence: ultimoEventSequence || 0 };
}

function ehRelevanteParaAgentePrincipal(mensagem) {
  if (!mensagem) return false;
  const tipo = mensagem.tipo || "";
  const destino = (mensagem.destinatario || mensagem.agenteId || "").toLowerCase();
  const projeto = (mensagem.projeto || "").toLowerCase();
  const status = (mensagem.status || "").toUpperCase();

  if (projeto && projeto !== "projeto_atual") return false;
  if (status && status !== "PENDENTE") return false;
  if (!TIPOS_RELEVANTES.has(tipo)) return false;
  if (destino && destino !== "agente_principal" && destino !== "principal") return false;

  return true;
}

// ---------------------------------------------------------------------------
// Passo 4 — Disparo do "wake-up" via CLI
// ---------------------------------------------------------------------------

function montarResumoMensagem(mensagens) {
  const linhas = mensagens.map(
    (m) => `- [${m.emissor || "agente"}] ${m.conteudo || m.id}`
  );
  return (
    `Novas mensagens no monitoramento do AgentMap enquanto você estava ocioso:\n` +
    linhas.join("\n") +
    `\n\nConsulte o AgentMap (API/tools MCP) para os detalhes completos antes de prosseguir.`
  );
}

function acordarAgentePrincipal(sessaoConfig, mensagemTexto) {
  return new Promise((resolve, reject) => {
    const flags = AUTONOMY_FLAGS[CONFIG.autonomyLevel] || [];
    const args = [
      "run",
      "--attach",
      `http://127.0.0.1:${sessaoConfig.port}`,
      "--session",
      sessaoConfig.sessionId,
      "--username",
      sessaoConfig.username,
      "--password",
      sessaoConfig.password,
      "--format",
      "json",
      ...flags,
      mensagemTexto,
    ];

    log("INFO", "Disparando kilo run --attach", {
      port: sessaoConfig.port,
      sessionId: sessaoConfig.sessionId,
      autonomyLevel: CONFIG.autonomyLevel,
      autoFlag: flags.includes("--auto"),
    });

    const proc = spawn("kilo", args, { stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => (stdout += chunk));
    proc.stderr.on("data", (chunk) => (stderr += chunk));

    proc.on("error", (err) => {
      reject(new Error(`Falha ao executar 'kilo': ${err.message}`));
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ code, stdout, stderr });
      } else if (code === 124) {
        reject(
          new Error(
            `kilo run atingiu timeout (exit 124). stderr: ${stderr}`
          )
        );
      } else if (code === 401 || /Unauthorized/i.test(stderr)) {
        reject(
          new Error(
            `Falha de autenticação (Unauthorized) — ver Passo 2 do plano ` +
              `(bug conhecido de username/password no attach). stderr: ${stderr}`
          )
        );
      } else {
        reject(
          new Error(`kilo run saiu com código ${code}. stderr: ${stderr}`)
        );
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Loop principal com debounce
// ---------------------------------------------------------------------------

let debounceTimer = null;
let pendingRelevantes = [];

async function flushWakeup() {
  if (pendingRelevantes.length === 0) return;

  const mensagensParaEnviar = [...pendingRelevantes];
  pendingRelevantes = [];

  let sessaoConfig;
  try {
    sessaoConfig = await carregarConfigSessao();
  } catch (err) {
    await log("ERROR", "Não consegui carregar config da sessão do Kilo Code", {
      erro: err.message,
    });
    return;
  }

  const resumo = montarResumoMensagem(mensagensParaEnviar);

  try {
    await acordarAgentePrincipal(sessaoConfig, resumo);
    await log("INFO", "Wake-up enviado com sucesso", {
      quantidade: mensagensParaEnviar.length,
    });

    const ultima = mensagensParaEnviar[mensagensParaEnviar.length - 1];
    await salvarEstado({
      ultimoEventSequence: ultima.eventSequence || 0,
    });
  } catch (err) {
    await log("ERROR", "Falha ao acordar o agente principal", {
      erro: err.message,
    });
    pendingRelevantes = mensagensParaEnviar;
  }
}

async function cicloDeChecagem() {
  const estado = await carregarEstado();

  let resultado;
  try {
    resultado = await buscarMensagensNovas(estado.ultimoEventSequence);
  } catch (err) {
    await log("ERROR", "Falha ao consultar API do AgentMap", {
      erro: err.message,
    });
    return;
  }

  const relevantes = resultado.mensagens.filter(
    ehRelevanteParaAgentePrincipal
  );
  if (relevantes.length === 0) {
    return;
  }

  await log(
    "INFO",
    `${relevantes.length} mensagem(ns) nova(s) detectada(s)`,
    {
      eventSequences: relevantes.map((m) => m.eventSequence),
    }
  );

  pendingRelevantes.push(...relevantes);

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    await flushWakeup();
  }, CONFIG.debounceMs);
}

async function main() {
  await log("INFO", "watcher-wakeup iniciado", {
    agentmapApiUrl: CONFIG.agentmapApiUrl,
    pollIntervalMs: CONFIG.pollIntervalMs,
    debounceMs: CONFIG.debounceMs,
    autonomyLevel: CONFIG.autonomyLevel,
    sessionConfigPath: CONFIG.sessionConfigPath,
  });

  await cicloDeChecagem();
  setInterval(cicloDeChecagem, CONFIG.pollIntervalMs);
}

main().catch((err) => {
  console.error("Erro fatal no watcher:", err);
  process.exit(1);
});
