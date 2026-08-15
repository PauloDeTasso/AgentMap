/**
 * @deprecated KiloDispatcherService depende de CLI `kilo` inexistente e caminho hardcoded.
 * O paralelismo real é via Agent Manager worktrees.
 * Mantido apenas para referência histórica.
 */
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { ResultadoOperacao } from '../tipos';

export interface DispatchConfig {
  versao: string;
  atualizadoEm: string;
  agentes: Record<string, {
    kiloAgent: string;
    workspacePath: string;
    sessionId: string | null;
    modoAutonomia: 'MANUAL' | 'ASSISTIDA' | 'AUTONOMA';
    autoApprove: boolean;
  }>;
}

export interface DispatchLog {
  id: string;
  timestamp: string;
  agenteId: string;
  tarefaId?: string;
  comando: string;
  status: 'SUCESSO' | 'ERRO' | 'PENDENTE';
  sessionId?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  duracaoMs?: number;
}

export class KiloDispatcherService {
  private configPath = '.ia/configuracao/agentes-config.json';
  private outboxRoot = '.ia/outbox';
  private logPath = '.ia/contexto/dispatch-log.json';
  private config: DispatchConfig;
  private logs: DispatchLog[] = [];

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {
    this.config = this.carregarConfig();
    this.logs = this.carregarLogs();
  }

  private carregarConfig(): DispatchConfig {
    const result = this.fs.lerJson<DispatchConfig>(this.configPath);
    if (!result.sucesso || !result.dados) {
      return this.getConfigPadrao();
    }
    return result.dados;
  }

  private getConfigPadrao(): DispatchConfig {
    return {
      versao: '1.0.0',
      atualizadoEm: new Date().toISOString(),
      agentes: {}
    };
  }

  private carregarLogs(): DispatchLog[] {
    const result = this.fs.lerJson<DispatchLog[]>(this.logPath);
    if (!result.sucesso || !result.dados) {
      return [];
    }
    return result.dados;
  }

  private salvarLogs(): ResultadoOperacao<void> {
    const result = this.fs.escreverJson(this.logPath, this.logs, { backup: true });
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    return { sucesso: true };
  }

  private adicionarLog(log: DispatchLog): void {
    this.logs.push(log);
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500);
    }
    this.salvarLogs();
  }

  listarConfig(): DispatchConfig {
    return { ...this.config };
  }

  listarLogs(limite = 100): DispatchLog[] {
    return this.logs.slice(-limite);
  }

  listarPendentes(agenteId?: string): Array<{ agenteId: string; arquivo: string; caminho: string }> {
    const pendentes: Array<{ agenteId: string; arquivo: string; caminho: string }> = [];
    const agentes = agenteId ? [agenteId] : Object.keys(this.config.agentes);

    for (const agente of agentes) {
      const outboxDir = path.win32.join(this.outboxRoot, agente);
      const result = this.fs.listar(outboxDir);
      if (!result.sucesso || !result.dados) {
        continue;
      }

      for (const item of result.dados) {
        if (item.nome === 'prompt.md') {
          pendentes.push({
            agenteId: agente,
            arquivo: 'prompt.md',
            caminho: path.win32.join(outboxDir, 'prompt.md')
          });
        }
      }
    }

    return pendentes;
  }

  async executarPendente(agenteId: string): Promise<ResultadoOperacao<DispatchLog>> {
    if (!this.config.agentes[agenteId]) {
      return { sucesso: false, erro: `Agente ${agenteId} não configurado`, codigoErro: 'AGENT_NOT_CONFIGURED' };
    }

    const promptPath = path.win32.join(this.outboxRoot, agenteId, 'prompt.md');
    const promptResult = this.fs.ler(promptPath);
    if (!promptResult.sucesso || !promptResult.dados) {
      return { sucesso: false, erro: 'prompt.md não encontrado', codigoErro: 'PROMPT_NOT_FOUND' };
    }

    const prompt = promptResult.dados;
    const configAgente = this.config.agentes[agenteId];
    const inicio = Date.now();

    const comandoObj = this.montarComando(configAgente, prompt);
    const comandoStr = `${comandoObj.cmd} ${comandoObj.args.join(' ')}`;

    this.auditoria.registrar('DISPATCH_INICIADO', `Executando kilocli para ${agenteId}`, { agenteId, comando: comandoStr });

    const log: DispatchLog = {
      id: `DSP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      agenteId,
      comando: comandoStr,
      status: 'PENDENTE'
    };

    try {
      const comandoStr = `${comandoObj.cmd} ${comandoObj.args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`;
      const stdout = execSync(comandoStr, {
        cwd: configAgente.workspacePath,
        timeout: 120000,
        env: { ...process.env, NODE_ENV: 'production' },
        encoding: 'utf-8'
      });

      const duracaoMs = Date.now() - inicio;
      log.stdout = this.sanitizarTexto(stdout);
      log.stderr = '';
      log.exitCode = 0;
      log.status = 'SUCESSO';
      log.duracaoMs = duracaoMs;
      log.sessionId = this.extrairSessionId(stdout);

      this.moverParaEnviado(agenteId, promptPath);
      this.adicionarLog(log);

      this.auditoria.registrar('DISPATCH_SUCESSO', `Dispatch concluído para ${agenteId}`, { agenteId, sessionId: log.sessionId, duracaoMs });

      return { sucesso: true, dados: log };
    } catch (error: any) {
      const duracaoMs = Date.now() - inicio;
      log.stderr = error?.message || String(error);
      log.exitCode = error?.status || 1;
      log.status = 'ERRO';
      log.duracaoMs = duracaoMs;

      this.moverParaErros(agenteId, promptPath, error?.message || String(error));
      this.adicionarLog(log);

      this.auditoria.registrar('DISPATCH_ERRO', `Dispatch falhou para ${agenteId}: ${error?.message || error}`, { agenteId, exitCode: log.exitCode });

      return { sucesso: false, erro: error?.message || String(error), codigoErro: 'DISPATCH_FAILED', dados: log };
    }
  }

  private montarComando(configAgente: DispatchConfig['agentes'][string], prompt: string): { cmd: string; args: string[] } {
    const kiloCmd = process.env.KILO_CMD || 'kilo';
    const args: string[] = ['run'];
    args.push('--agent');
    args.push(configAgente.kiloAgent);
    args.push('--dir');
    args.push(configAgente.workspacePath);

    if (configAgente.sessionId) {
      args.push('--session');
      args.push(configAgente.sessionId);
      args.push('--continue');
    }

    if (configAgente.autoApprove || configAgente.modoAutonomia === 'AUTONOMA') {
      args.push('--auto');
    }

    args.push('--format');
    args.push('json');
    args.push(prompt);

    return { cmd: kiloCmd, args };
  }

  private extrairSessionId(output: string): string | undefined {
    try {
      const linhas = output.split('\n');
      for (const linha of linhas) {
        if (linha.includes('"type":"step_start"')) {
          const match = linha.match(/"sessionID":"([^"]+)"/);
          if (match) {
            return match[1];
          }
        }
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  private sanitizarTexto(texto: string): string {
    return texto
      .replace(/<environment_details>[\s\S]*?<\/environment_details>/gi, '')
      .replace(/<environment_details[\s\S]*?<\/environment_details>/gi, '')
      .trim();
  }

  private moverParaEnviado(agenteId: string, promptPath: string): void {
    const enviadoDir = path.win32.join(this.outboxRoot, agenteId, 'enviado');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nomeArquivo = `${timestamp}-${path.win32.basename(promptPath)}`;
    const destino = path.win32.join(enviadoDir, nomeArquivo);

    try {
      const origemAbs = this.fs.getCaminhoAbsoluto(promptPath);
      const destinoAbs = this.fs.getCaminhoAbsoluto(destino);
      fs.mkdirSync(path.dirname(destinoAbs), { recursive: true });
      fs.renameSync(origemAbs, destinoAbs);
    } catch (error) {
      // ignore move errors
    }
  }

  private moverParaErros(agenteId: string, promptPath: string, erro: string): void {
    const errosDir = path.win32.join(this.outboxRoot, agenteId, 'erros');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nomeArquivo = `${timestamp}-${path.win32.basename(promptPath)}`;
    const destino = path.win32.join(errosDir, nomeArquivo);
    const logPath = `${destino}.log`;

    try {
      const origemAbs = this.fs.getCaminhoAbsoluto(promptPath);
      const destinoAbs = this.fs.getCaminhoAbsoluto(destino);
      const logAbs = this.fs.getCaminhoAbsoluto(logPath);
      fs.mkdirSync(path.dirname(destinoAbs), { recursive: true });
      fs.renameSync(origemAbs, destinoAbs);
      fs.writeFileSync(logAbs, erro, 'utf-8');
    } catch (error) {
      // ignore move errors
    }
  }

  async atualizarConfig(config: Partial<DispatchConfig>): Promise<ResultadoOperacao<DispatchConfig>> {
    this.config = { ...this.config, ...config, atualizadoEm: new Date().toISOString() };
    const result = this.fs.escreverJson(this.configPath, this.config, { backup: true });
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    this.auditoria.registrar('CONFIG_DISPATCH_ATUALIZADA', 'Configuração do dispatcher atualizada', { versao: this.config.versao });
    return { sucesso: true, dados: this.config };
  }

  atualizarSessao(agenteId: string, sessionId: string): ResultadoOperacao<void> {
    if (!this.config.agentes[agenteId]) {
      return { sucesso: false, erro: `Agente ${agenteId} não configurado`, codigoErro: 'AGENT_NOT_CONFIGURED' };
    }
    this.config.agentes[agenteId].sessionId = sessionId;
    const result = this.fs.escreverJson(this.configPath, this.config, { backup: true });
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    return { sucesso: true };
  }
}

