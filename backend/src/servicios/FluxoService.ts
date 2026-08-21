import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { ResultadoOperacao } from '../tipos';

export interface ChecklistFluxo {
  fluxoTrabalhoExiste: boolean;
  pastaContratosExiste: boolean;
  pastaTarefasExiste: boolean;
  pastaDependenciasExiste: boolean;
  peloMenosUmContrato: boolean;
  tarefasSemDependenciasCirculares: boolean;
}

export class FluxoService {
  constructor(private fs: FileService, private auditoria: AuditoriaService) {}

  validarChecklist(): ResultadoOperacao<ChecklistFluxo> {
    const checklist: ChecklistFluxo = {
      fluxoTrabalhoExiste: this.existeArquivo('.ia/fluxo-trabalho.md'),
      pastaContratosExiste: this.existeDiretorio('.ia/contratos'),
      pastaTarefasExiste: this.existeDiretorio('.ia/tarefas'),
      pastaDependenciasExiste: this.existeDiretorio('.ia/dependencias'),
      peloMenosUmContrato: this.contarArquivos('.ia/contratos') > 0,
      tarefasSemDependenciasCirculares: !this.existeDependenciaCircular()
    };

    const pendentes = this.obterPendentes(checklist);
    const estado = pendentes.length === 0 ? 'OK' : 'PENDENTE';

    if (!checklist.fluxoTrabalhoExiste) {
      this.auditoria.registrar('CHECKLIST_FLUXO_WARNING', 'Arquivo .ia/fluxo-trabalho.md não encontrado — não bloqueia abertura do projeto', { checklist });
    }

    this.auditoria.registrar('CHECKLIST_FLUXO_VERIFICADO', `Checklist de fluxo verificado: ${estado}`, { checklist, pendentes });

    return { sucesso: pendentes.length === 0, dados: checklist };
  }

  obterPendentes(checklist: ChecklistFluxo): string[] {
    const pendentes: string[] = [];
    if (!checklist.pastaContratosExiste) pendentes.push('Pasta .ia/contratos não encontrada');
    if (!checklist.pastaTarefasExiste) pendentes.push('Pasta .ia/tarefas não encontrada');
    if (!checklist.pastaDependenciasExiste) pendentes.push('Pasta .ia/dependencias não encontrada');
    if (!checklist.peloMenosUmContrato) pendentes.push('Nenhum contrato registrado');
    if (!checklist.tarefasSemDependenciasCirculares) pendentes.push('Dependências circulares detectadas');
    return pendentes;
  }

  private existeArquivo(caminhoRelativo: string): boolean {
    const result = this.fs.ler(caminhoRelativo);
    return result.sucesso && result.dados !== null && result.dados !== undefined;
  }

  private existeDiretorio(caminhoRelativo: string): boolean {
    const result = this.fs.listar(caminhoRelativo);
    return result.sucesso && Array.isArray(result.dados);
  }

  private contarArquivos(caminhoRelativo: string): number {
    const result = this.fs.listar(caminhoRelativo);
    if (!result.sucesso || !Array.isArray(result.dados)) return 0;
    return result.dados.filter((item: any) => item && item.tipo === 'arquivo').length;
  }

  private existeDependenciaCircular(): boolean {
    const result = this.fs.lerJson<{ dependencias?: any[] }>(path.win32.join('.ia', 'dependencias', 'dependencias.json'));
    if (!result.sucesso || !result.dados) return false;
    const deps = result.dados.dependencias || result.dados;
    if (!Array.isArray(deps) || deps.length === 0) return false;

    const adj = new Map<string, string[]>();
    for (const dep of deps) {
      if (!dep.fonteId || !dep.destinoId) continue;
      if (!adj.has(dep.fonteId)) adj.set(dep.fonteId, []);
      adj.get(dep.fonteId)!.push(dep.destinoId);
    }

    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);
      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }
      recursionStack.delete(node);
      return false;
    };

    for (const node of adj.keys()) {
      if (!visited.has(node)) {
        if (dfs(node)) return true;
      }
    }
    return false;
  }
}

