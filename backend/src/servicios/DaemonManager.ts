import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';
import { KiloDaemonState, ModoAutonomia } from '../tipos';
import { ResultadoOperacao } from '../tipos';

const KILO_CMD = process.platform === 'win32'
  ? process.env.KILO_CMD || 'kilo'
  : 'kilo';

export interface DaemonWorkspaceMapping {
  workspacePath: string;
  pid: number | null;
  porta: number | null;
  url: string | null;
  versaoKilo: string | null;
  healthy: boolean;
  startedAt: string | null;
  ultimaVerificacao: string;
}

export class DaemonManager {
  private statePath = path.join('.ia', 'contexto', 'daemon-mapping.json');
  private mappings = new Map<string, DaemonWorkspaceMapping>();

  constructor(private projetoPath: string) {
    this.carregarMappings();
  }

  private get caminhoAbsoluto(): string {
    return path.resolve(this.projetoPath, this.statePath);
  }

  private carregarMappings(): void {
    try {
      if (fs.existsSync(this.caminhoAbsoluto)) {
        const raw = fs.readFileSync(this.caminhoAbsoluto, 'utf-8');
        const data = JSON.parse(raw) as Record<string, DaemonWorkspaceMapping>;
        for (const [key, val] of Object.entries(data)) {
          this.mappings.set(key, val);
        }
      }
    } catch {
      // ignore
    }
  }

  private salvarMappings(): void {
    try {
      const dir = path.dirname(this.caminhoAbsoluto);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const obj: Record<string, DaemonWorkspaceMapping> = {};
      for (const [key, val] of this.mappings.entries()) {
        obj[key] = val;
      }
      fs.writeFileSync(this.caminhoAbsoluto, JSON.stringify(obj, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }

  private gerarChave(workspacePath: string): string {
    return path.resolve(workspacePath).toLowerCase();
  }

  private validarWorkspace(workspacePath: string): { ok: boolean; resolved: string } {
    const resolved = path.resolve(workspacePath);
    const projeto = path.resolve(this.projetoPath);
    if (resolved !== projeto && !resolved.startsWith(projeto + path.sep)) {
      return { ok: false, resolved };
    }
    return { ok: true, resolved };
  }

  async start(workspacePath: string, porta?: number): Promise<ResultadoOperacao<DaemonWorkspaceMapping>> {
    const chave = this.gerarChave(workspacePath);
    const existente = this.mappings.get(chave);
    console.log('[DAEMON][START] requisicao', JSON.stringify({ workspacePath, porta, existeMapping: !!existente, healthy: existente?.healthy, pid: existente?.pid, portaExistente: existente?.porta }));
    if (existente && existente.healthy && !porta) {
      console.log('[DAEMON][START] reutilizando daemon existente saudavel', JSON.stringify({ workspacePath, pid: existente.pid, porta: existente.porta }));
      return { sucesso: true, dados: existente };
    }

    if (existente && existente.healthy && porta && existente.porta !== porta) {
      console.log('[DAEMON][START] porta diferente, parando daemon existente', JSON.stringify({ workspacePath, portaAntiga: existente.porta, portaNova: porta }));
      await this.stop(workspacePath);
    }

    const portaEscolhida = porta || this.encontrarPortaLivre(4097, 4116);
    const args = ['daemon', 'start', '--port', String(portaEscolhida), '--json'];
    console.log('[DAEMON][START] iniciando daemon', JSON.stringify({ workspacePath, portaEscolhida, comando: `${KILO_CMD} ${args.join(' ')}` }));

    const validacao = this.validarWorkspace(workspacePath);
    if (!validacao.ok) {
      return { sucesso: false, erro: 'Workspace fora do projeto permitido', codigoErro: 'INVALID_WORKSPACE' };
    }

    try {
      const result = spawnSync(KILO_CMD, args, {
        cwd: validacao.resolved,
        encoding: 'utf-8',
        timeout: 30000,
        shell: false
      });

      const stdout = result.stdout || '';
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[DAEMON][START] JSON nao encontrado na saida', JSON.stringify({ workspacePath, stdoutPreview: stdout.substring(0, 200) }));
        return { sucesso: false, erro: 'Formato JSON não encontrado na saída do daemon', codigoErro: 'PARSE_ERROR' };
      }

      const state: KiloDaemonState = JSON.parse(jsonMatch[0]);
      if (!state.running || !state.state) {
        console.error('[DAEMON][START] daemon nao iniciado corretamente', JSON.stringify({ workspacePath, running: state.running, state }));
        return { sucesso: false, erro: 'Daemon não iniciado corretamente', codigoErro: 'DAEMON_START_FAILED' };
      }

      const mapping: DaemonWorkspaceMapping = {
        workspacePath: path.resolve(workspacePath),
        pid: state.state.pid || null,
        porta: state.state.port || null,
        url: state.state.url || null,
        versaoKilo: state.state.version || null,
        healthy: state.health?.healthy || false,
        startedAt: state.state.startedAt || null,
        ultimaVerificacao: new Date().toISOString()
      };

      this.mappings.set(chave, mapping);
      this.salvarMappings();
      console.log('[DAEMON][START] daemon iniciado com sucesso', JSON.stringify({ workspacePath, pid: mapping.pid, porta: mapping.porta, url: mapping.url, healthy: mapping.healthy, versao: mapping.versaoKilo }));

      return { sucesso: true, dados: mapping };
    } catch (error: any) {
      console.error('[DAEMON][START] erro ao iniciar daemon', JSON.stringify({ workspacePath, erro: error?.message || String(error), stack: error?.stack }));
      return { sucesso: false, erro: error?.message || String(error), codigoErro: 'DAEMON_START_FAILED' };
    }
  }

  async status(workspacePath: string): Promise<ResultadoOperacao<DaemonWorkspaceMapping>> {
    const chave = this.gerarChave(workspacePath);
    const mapping = this.mappings.get(chave);

    if (!mapping) {
      console.warn('[DAEMON][STATUS] mapping nao encontrado', JSON.stringify({ workspacePath, chave }));
      return { sucesso: false, erro: 'Mapeamento não encontrado para este workspace', codigoErro: 'MAPPING_NOT_FOUND' };
    }

    console.log('[DAEMON][STATUS] verificando daemon', JSON.stringify({ workspacePath, pid: mapping.pid, porta: mapping.porta, healthyAnterior: mapping.healthy }));
    try {
      const args = ['daemon', 'status', '--json'];
      const validacao = this.validarWorkspace(workspacePath);
      if (!validacao.ok) {
        mapping.healthy = false;
        mapping.ultimaVerificacao = new Date().toISOString();
        this.salvarMappings();
        return { sucesso: true, dados: mapping };
      }
      const result = spawnSync(KILO_CMD, args, {
        cwd: validacao.resolved,
        encoding: 'utf-8',
        timeout: 15000,
        shell: false
      });

      const stdout = result.stdout || '';
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        mapping.healthy = false;
        mapping.ultimaVerificacao = new Date().toISOString();
        this.salvarMappings();
        console.warn('[DAEMON][STATUS] JSON nao encontrado, marcando como unhealthy', JSON.stringify({ workspacePath, pid: mapping.pid, porta: mapping.porta }));
        return { sucesso: true, dados: mapping };
      }

      const state: KiloDaemonState = JSON.parse(jsonMatch[0]);
      mapping.healthy = state.running && state.health?.healthy;
      mapping.pid = state.state?.pid || mapping.pid;
      mapping.porta = state.state?.port || mapping.porta;
      mapping.url = state.state?.url || mapping.url;
      mapping.versaoKilo = state.state?.version || mapping.versaoKilo;
      mapping.ultimaVerificacao = new Date().toISOString();

      this.mappings.set(chave, mapping);
      this.salvarMappings();
      console.log('[DAEMON][STATUS] status verificado', JSON.stringify({ workspacePath, pid: mapping.pid, porta: mapping.porta, healthy: mapping.healthy, versao: mapping.versaoKilo }));

      return { sucesso: true, dados: mapping };
    } catch (error: any) {
      mapping.healthy = false;
      mapping.ultimaVerificacao = new Date().toISOString();
      this.salvarMappings();
      console.error('[DAEMON][STATUS] erro ao verificar status', JSON.stringify({ workspacePath, pid: mapping.pid, erro: error?.message || String(error) }));
      return { sucesso: true, dados: mapping };
    }
  }

  async stop(workspacePath: string): Promise<ResultadoOperacao<void>> {
    const chave = this.gerarChave(workspacePath);
    const mapping = this.mappings.get(chave);

    if (!mapping) {
      console.warn('[DAEMON][STOP] mapping nao encontrado', JSON.stringify({ workspacePath, chave }));
      return { sucesso: false, erro: 'Mapeamento não encontrado', codigoErro: 'MAPPING_NOT_FOUND' };
    }

    console.log('[DAEMON][STOP] parando daemon', JSON.stringify({ workspacePath, pid: mapping.pid, porta: mapping.porta }));
    try {
      const args = ['daemon', 'stop'];
      const validacao = this.validarWorkspace(workspacePath);
      if (!validacao.ok) {
        return { sucesso: false, erro: 'Workspace fora do projeto permitido', codigoErro: 'INVALID_WORKSPACE' };
      }
      spawnSync(KILO_CMD, args, {
        cwd: validacao.resolved,
        encoding: 'utf-8',
        timeout: 15000,
        shell: false
      });

      mapping.healthy = false;
      mapping.pid = null;
      mapping.porta = null;
      mapping.url = null;
      mapping.ultimaVerificacao = new Date().toISOString();
      this.mappings.set(chave, mapping);
      this.salvarMappings();
      console.log('[DAEMON][STOP] daemon parado', JSON.stringify({ workspacePath, pid: mapping.pid, porta: mapping.porta }));

      return { sucesso: true };
    } catch (error: any) {
      console.error('[DAEMON][STOP] erro ao parar daemon', JSON.stringify({ workspacePath, pid: mapping.pid, erro: error?.message || String(error) }));
      return { sucesso: false, erro: error?.message || String(error), codigoErro: 'DAEMON_STOP_FAILED' };
    }
  }

  async restart(workspacePath: string, porta?: number): Promise<ResultadoOperacao<DaemonWorkspaceMapping>> {
    console.log('[DAEMON][RESTART] reiniciando daemon', JSON.stringify({ workspacePath, porta }));
    const stopResult = await this.stop(workspacePath);
    if (!stopResult.sucesso) {
      console.warn('[DAEMON][RESTART] falha ao parar daemon, continuando com start', JSON.stringify({ workspacePath, erro: stopResult.erro, codigo: stopResult.codigoErro }));
    }
    const startResult = await this.start(workspacePath, porta);
    console.log('[DAEMON][RESTART] resultado do restart', JSON.stringify({ workspacePath, sucesso: startResult.sucesso, pid: startResult.dados?.pid, porta: startResult.dados?.porta, erro: startResult.erro, codigo: startResult.codigoErro }));
    return startResult;
  }

  obterMapping(workspacePath: string): DaemonWorkspaceMapping | undefined {
    return this.mappings.get(this.gerarChave(workspacePath));
  }

  listarMappings(): DaemonWorkspaceMapping[] {
    return Array.from(this.mappings.values());
  }

  private encontrarPortaLivre(inicio: number, fim: number): number {
    for (let porta = inicio; porta <= fim; porta++) {
      try {
        const server = require('net').createServer();
        server.listen(porta, '127.0.0.1');
        server.close();
        return porta;
      } catch {
        continue;
      }
    }
    return inicio;
  }
}


