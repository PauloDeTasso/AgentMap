import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { KiloState, KiloWorktree, KiloSession, KiloAgentDef, ResultadoOperacao } from '../tipos';

interface AgentManagerState {
  worktrees: Record<string, any>;
  sessions: Record<string, any>;
  tabOrder?: Record<string, string[]>;
  sessionsCollapsed?: boolean;
}

interface KiloAgentMarkdown {
  description?: string;
  mode?: string;
  color?: string;
}

export class KiloDiscoveryService {
  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private projetoPath: string
  ) {}

  async descobrir(): Promise<ResultadoOperacao<KiloState>> {
    const kiloRoot = '.kilo';
    const managerPath = path.join(kiloRoot, 'agent-manager.json');

    if (!this.fs.existe(managerPath)) {
      return { sucesso: true, dados: this.estadoVazio() };
    }

    const managerResult = this.fs.lerJson<AgentManagerState>(managerPath);
    if (!managerResult.sucesso || !managerResult.dados) {
      return { sucesso: false, erro: managerResult.erro || 'Erro ao ler agent-manager.json', codigoErro: managerResult.codigoErro || 'KILO_DISCOVERY_ERROR' };
    }

    const worktrees = await this.descobrirWorktrees(kiloRoot, managerResult.dados);
    const sessoes = this.descobrirSessoes(managerResult.dados, worktrees);
    const agentes = await this.descobrirAgentes(kiloRoot);

    const estado: KiloState = {
      descobertoEm: new Date().toISOString(),
      worktrees,
      sessoes,
      agentes
    };

    this.auditoria.registrar('KILO_DESCOBERTO', `Estado Kilo descoberto: ${worktrees.length} worktrees, ${sessoes.length} sessoes, ${agentes.length} agentes.`, {
      projetoPath: this.projetoPath,
      worktrees: worktrees.length,
      sessoes: sessoes.length,
      agentes: agentes.length
    });

    return { sucesso: true, dados: estado };
  }

  async obterEstadoKilo(): Promise<ResultadoOperacao<KiloState>> {
    return this.descobrir();
  }

  private async descobrirWorktrees(kiloRoot: string, manager: AgentManagerState): Promise<KiloWorktree[]> {
    const worktreesDir = path.join(kiloRoot, 'worktrees');
    const worktrees: KiloWorktree[] = [];

    const listResult = this.fs.listar(worktreesDir);
    if (!listResult.sucesso || !listResult.dados) {
      return worktrees;
    }

    for (const entry of listResult.dados) {
      if (entry.tipo !== 'diretorio') continue;

      const nome = entry.nome;
      const caminho = path.join(worktreesDir, nome);
      const wtData = manager.worktrees[nome];

      let branch = nome;
      let sessaoId: string | undefined;
      let agenteId: string | undefined;
      let tarefaId: string | undefined;

      if (wtData && typeof wtData === 'object') {
        branch = (wtData as any).branch || nome;
        sessaoId = (wtData as any).sessionId;
        agenteId = (wtData as any).agentId;
        tarefaId = (wtData as any).tarefaId;
      }

      const readmePath = path.join(caminho, 'README.md');
      const readmeResult = this.fs.ler(readmePath);
      if (readmeResult.sucesso && readmeResult.dados) {
        const tarefaMatch = readmeResult.dados.match(/TAR-\d+/);
        if (tarefaMatch) {
          tarefaId = tarefaMatch[0];
        }
      }

      worktrees.push({
        nome,
        caminho,
        branch,
        sessaoId,
        agenteId,
        tarefaId
      });
    }

    return worktrees;
  }

  private descobrirSessoes(manager: AgentManagerState, worktrees: KiloWorktree[]): KiloSession[] {
    const sessoes: KiloSession[] = [];
    const rawSessoes = manager.sessions || {};

    for (const [sessionId, sessaoData] of Object.entries(rawSessoes)) {
      const data = sessaoData as any;
      const wtNome = data.worktreeId || data.worktree;
      const worktree = worktrees.find(w => w.nome === wtNome || w.sessaoId === sessionId);

      sessoes.push({
        id: sessionId,
        nome: data.name || sessionId,
        tipo: data.type || 'local',
        agenteId: data.agentId || worktree?.agenteId,
        worktreeId: wtNome,
        estado: this.mapearEstadoSessao(data.state || data.status),
        criadoEm: data.createdAt || data.startedAt,
        atualizadoEm: data.updatedAt || data.lastActivity
      });
    }

    return sessoes;
  }

  private async descobrirAgentes(kiloRoot: string): Promise<KiloAgentDef[]> {
    const agentDir = path.join(kiloRoot, 'agent');
    const agentes: KiloAgentDef[] = [];

    const listResult = this.fs.listar(agentDir);
    if (!listResult.sucesso || !listResult.dados) {
      return agentes;
    }

    for (const entry of listResult.dados) {
      if (entry.tipo !== 'arquivo' || !entry.nome.endsWith('.md')) continue;

      const agentId = entry.nome.replace(/\.md$/, '');
      const readResult = this.fs.ler(path.join(agentDir, entry.nome));
      if (!readResult.sucesso || !readResult.dados) continue;

      const frontmatter = this.extrairFrontmatter(readResult.dados);
      agentes.push({
        id: agentId,
        nome: frontmatter.description || agentId,
        descricao: frontmatter.description || agentId,
        mode: frontmatter.mode || 'primary',
        cor: frontmatter.color || '#607D8B'
      });
    }

    return agentes;
  }

  private extrairFrontmatter(md: string): KiloAgentMarkdown {
    const match = md.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};

    const lines = match[1].split('\n');
    const result: Record<string, string> = {};
    for (const line of lines) {
      const [key, ...rest] = line.split(':');
      if (!key || rest.length === 0) continue;
      const value = rest.join(':').trim().replace(/^["']|["']$/g, '');
      result[key.trim()] = value;
    }
    return result;
  }

  private mapearEstadoSessao(state?: string): 'ativo' | 'pausado' | 'finalizado' | 'erro' {
    if (!state) return 'ativo';
    const normalized = state.toLowerCase();
    if (normalized.includes('paus') || normalized.includes('idle')) return 'pausado';
    if (normalized.includes('finaliz') || normalized.includes('fim') || normalized.includes('end')) return 'finalizado';
    if (normalized.includes('erro') || normalized.includes('error')) return 'erro';
    return 'ativo';
  }

  private estadoVazio(): KiloState {
    return {
      descobertoEm: new Date().toISOString(),
      worktrees: [],
      sessoes: [],
      agentes: []
    };
  }
}
