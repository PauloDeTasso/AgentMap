import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Tarefa, ResultadoOperacao } from '../tipos';
import { KiloAgentGeneratorService, TaskContext } from './KiloAgentGeneratorService';

export class TaskContextBuilder {
  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {}

  async construirPacote(tarefaId: string): Promise<ResultadoOperacao<TaskContext>> {
    const tarefasResult = this.fs.lerJson<{ tarefas: Tarefa[] }>(path.join('.ia', 'tarefas', 'tarefas.json'));
    if (!tarefasResult.sucesso || !tarefasResult.dados) {
      return { sucesso: false, erro: 'Erro ao carregar tarefas', codigoErro: 'TASK_LOAD_ERROR' };
    }

    const tarefa = tarefasResult.dados.tarefas.find(t => t.id === tarefaId);
    if (!tarefa) {
      return { sucesso: false, erro: 'Tarefa não encontrada', codigoErro: 'TASK_NOT_FOUND' };
    }

    const contratos: string[] = [];
    for (const cid of tarefa.contratosObrigatorios) {
      const cResult = this.fs.lerJson<{ nome?: string }>(path.join('.ia', 'contratos', `${cid}.json`));
      if (cResult.sucesso && cResult.dados?.nome) {
        contratos.push(cResult.dados.nome);
      }
    }

    const decisoesResult = this.fs.lerJson<{ decisoes: Array<{ titulo: string }> }>(
      path.join('.ia', 'decisoes', 'decisoes.json')
    );
    const decisoes = decisoesResult.sucesso && decisoesResult.dados
      ? decisoesResult.dados.decisoes.filter(d => tarefa.contratosObrigatorios.some(c => d.titulo?.includes(c))).map(d => d.titulo).filter(Boolean) as string[]
      : [];

    const contexto: TaskContext = {
      objetivo: tarefa.objetivo || tarefa.titulo,
      contrato: contratos.join(', ') || 'Nenhum contrato obrigatório',
      dependencias: tarefa.dependencias || [],
      decisoes,
      restricoes: tarefa.restricoes || [],
      criteriosAceitacao: tarefa.criteriosAceitacao || [],
      arquivosRelevantes: []
    };

    const allowedPatterns = tarefa.arquivosPermitidos.length > 0 ? tarefa.arquivosPermitidos : [];
    for (const pattern of allowedPatterns) {
      if (pattern === '/**') continue;
      const cleanPattern = pattern.replace(/^\//, '').replace(/\*\*\/?$/, '');
      if (!cleanPattern || cleanPattern.includes('..')) continue;
      const contentResult = this.fs.ler(cleanPattern);
      if (contentResult.sucesso && contentResult.dados) {
        contexto.arquivosRelevantes.push({ caminho: cleanPattern, conteudo: contentResult.dados });
      }
    }

    return { sucesso: true, dados: contexto };
  }

  async gerarMarkdownContexto(tarefaId: string): Promise<ResultadoOperacao<string>> {
    const pacoteResult = await this.construirPacote(tarefaId);
    if (!pacoteResult.sucesso || !pacoteResult.dados) {
      return { sucesso: false, erro: pacoteResult.erro || 'Erro ao construir pacote', codigoErro: pacoteResult.codigoErro || 'CONTEXT_ERROR' };
    }

    const tarefasResult = this.fs.lerJson<{ tarefas: Tarefa[] }>(path.join('.ia', 'tarefas', 'tarefas.json'));
    if (!tarefasResult.sucesso || !tarefasResult.dados) {
      return { sucesso: false, erro: 'Erro ao carregar tarefa', codigoErro: 'TASK_LOAD_ERROR' };
    }
    const tarefa = tarefasResult.dados.tarefas.find(t => t.id === tarefaId);
    if (!tarefa) {
      return { sucesso: false, erro: 'Tarefa não encontrada', codigoErro: 'TASK_NOT_FOUND' };
    }

    const generator = new KiloAgentGeneratorService(this.fs);
    const md = generator.montarContextoMarkdown(tarefa, pacoteResult.dados);
    const caminhoRelativo = path.join('.kilo', 'agent', `task-${tarefaId}-context.md`).replace(/\\/g, '/');
    const writeResult = this.fs.escrever(caminhoRelativo, md);
    if (!writeResult.sucesso) {
      return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    }

    this.auditoria.registrar('TAREFA_CONTEXTO_GERADO', `Contexto Markdown gerado para tarefa ${tarefaId}`, { tarefaId, caminho: caminhoRelativo });
    return { sucesso: true, dados: caminhoRelativo };
  }
}
