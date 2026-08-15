import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Tarefa, TarefasRegistry, EstadoTarefa, ResultadoOperacao, AgentePerfil, Decisao, Risco, Bloqueio } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';
import { DependenciaService } from './DependenciaService';
import { EventoService } from './EventoService';
import { StateMachineService } from './StateMachineService';
import { v4 as uuid } from 'uuid';

export interface PacoteContexto {
  identidade: { projetoId: string; nome: string; versao: string };
  contratos: unknown[];
  tarefa: Tarefa;
  estado: unknown;
  dependencias: Tarefa[];
  arquivosRelevantes: { caminho: string; conteudo: string }[];
  decisoes: Decisao[];
  restricoes: string[];
  criteriosAceitacao: string[];
  agente: { id: string; nome: string; permissoes: Record<string, boolean>; diretoriosPermitidos: string[]; diretoriosProibidos: string[] } | null;
}

export class TarefaService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator,
    private dependenciaService?: DependenciaService,
    private eventoService?: EventoService,
    private stateMachineService?: StateMachineService
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  listar(): ResultadoOperacao<Tarefa[]> {
    const result = this.fs.lerJson<TarefasRegistry>(
      path.win32.join('.ia', 'tarefas', 'tarefas.json')
    );
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    return { sucesso: true, dados: result.dados.tarefas };
  }

  obter(id: string): ResultadoOperacao<Tarefa> {
    const listaResult = this.listar();
    if (!listaResult.sucesso || !listaResult.dados) {
      return { sucesso: false, erro: listaResult.erro, codigoErro: listaResult.codigoErro };
    }
    const tarefa = listaResult.dados.find((t) => t.id === id);
    if (!tarefa) {
      return { sucesso: false, erro: 'Tarefa não encontrada', codigoErro: 'TASK_NOT_FOUND' };
    }
    return { sucesso: true, dados: tarefa };
  }

  private getDirPorEstado(estado: EstadoTarefa): string {
    const map: Partial<Record<EstadoTarefa, string>> = {
      RASCUNHO: 'rascunho',
      PENDENTE: 'pendentes',
      PLANEJADA: 'planejadas',
      PRONTA: 'prontas',
      EM_EXECUCAO: 'execucao',
      EM_TESTE: 'testes',
      EM_REVISAO: 'revisao',
      AGUARDANDO_APROVACAO: 'aprovacao',
      BLOQUEADA: 'bloqueadas',
      CONCLUIDA: 'concluidas',
      ORFA: 'recuperacao',
      RECUPERANDO: 'recuperacao'
    };
    return map[estado] || 'rascunho';
  }

  private saveTarefa(tarefa: Tarefa): ResultadoOperacao<Tarefa> {
    const dir = this.getDirPorEstado(tarefa.estado);
    const registryResult = this.fs.lerJson<TarefasRegistry>(
      path.win32.join('.ia', 'tarefas', 'tarefas.json')
    );
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    }
    const registry = registryResult.dados;
    const existing = registry.tarefas.findIndex((t) => t.id === tarefa.id);
    if (existing >= 0) {
      registry.tarefas[existing] = tarefa;
    } else {
      registry.tarefas.push(tarefa);
    }
    registry.estatisticas = this.calcularEstatisticas(registry.tarefas);

    const regResult = this.fs.escreverJson(
      path.win32.join('.ia', 'tarefas', 'tarefas.json'),
      registry
    );
    if (!regResult.sucesso) {
      return { sucesso: false, erro: regResult.erro, codigoErro: regResult.codigoErro };
    }

    const arquivoResult = this.fs.escreverJson(
      path.win32.join('.ia', 'tarefas', dir, `${tarefa.id}.json`),
      tarefa,
      { backup: true }
    );
    if (!arquivoResult.sucesso) {
      return { sucesso: false, erro: arquivoResult.erro, codigoErro: arquivoResult.codigoErro };
    }

    return { sucesso: true, dados: tarefa };
  }

  private calcularEstatisticas(tarefas: Tarefa[]): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const t of tarefas) {
      stats[t.estado] = (stats[t.estado] || 0) + 1;
    }
    stats['total'] = tarefas.length;
    return stats;
  }

  criar(dados: Omit<Tarefa, 'id' | 'estado' | 'datas' | 'resultado' | 'aprovacao'> & { id?: string }): ResultadoOperacao<Tarefa> {
    const hoje = new Date().toISOString();
    const tarefa: Tarefa = {
      id: dados.id || this.idGenerator.gerarId('TAR', path.win32.join('.ia', 'tarefas', 'tarefas.json'), 'tarefas'),
      titulo: dados.titulo,
      descricao: dados.descricao || '',
      objetivo: dados.objetivo,
      tipo: dados.tipo || 'desenvolvimento',
      estado: 'RASCUNHO',
      prioridade: dados.prioridade || 'media',
      agenteResponsavel: dados.agenteResponsavel,
      dominio: dados.dominio,
      ambiente: dados.ambiente || 'desenvolvimento',
      dependencias: dados.dependencias || [],
      contratosObrigatorios: dados.contratosObrigatorios || [],
      procedimentosObrigatorios: dados.procedimentosObrigatorios || [],
      arquivosPermitidos: dados.arquivosPermitidos || [],
      arquivosProibidos: dados.arquivosProibidos || [],
      contextoNecessario: dados.contextoNecessario || [],
      criteriosAceitacao: dados.criteriosAceitacao || [],
      testesObrigatorios: dados.testesObrigatorios || [],
      riscos: dados.riscos || [],
      restricoes: dados.restricoes || [],
      condicoesDeParada: dados.condicoesDeParada || [],
      criteriosConclusao: dados.criteriosConclusao || [],
      estimativaHoras: dados.estimativaHoras || undefined,
      dataLimite: dados.dataLimite || undefined,
      tags: dados.tags || [],
      resultado: { resumo: '', arquivosAlterados: [], testesExecutados: [], testesAprovados: [], riscosEncontrados: [], pendencias: [], observacoes: '', commit: '' },
      aprovacao: { necessaria: false, estado: 'nao_solicitada', aprovador: '', data: null, observacao: '' },
      datas: { criacao: hoje, inicio: null, ultimaAtualizacao: hoje, conclusao: null }
    };

    const validation = this.validator.validar('tarefa', tarefa);
    if (!validation.valido) {
      return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    const result = this.saveTarefa(tarefa);
    if (!result.sucesso) {
      return result;
    }

    this.auditoria.registrar('TAREFA_CRIADA', `Tarefa '${tarefa.titulo}' criada no estado RASCUNHO.`, { tarefaId: tarefa.id, agenteId: tarefa.agenteResponsavel });
    return { sucesso: true, dados: tarefa };
  }

  alterarEstado(id: string, novoEstado: EstadoTarefa): ResultadoOperacao<Tarefa> {
    const result = this.obter(id);
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    const tarefa = result.dados;

    const transicoesValidas = this.stateMachineService
      ? this.stateMachineService.listarTransicoes()[tarefa.estado] || []
      : [];
    if (!transicoesValidas.includes(novoEstado)) {
      return { sucesso: false, erro: `Transição inválida: ${tarefa.estado} → ${novoEstado}`, codigoErro: 'INVALID_TRANSITION' };
    }

    const estadoAnterior = tarefa.estado;
    tarefa.estado = novoEstado;
    tarefa.datas.ultimaAtualizacao = new Date().toISOString();

    if (this.dependenciaService) {
      if (novoEstado === 'EM_EXECUCAO') {
        const depsResult = this.dependenciaService.listarPorDestino(tarefa.id);
        if (depsResult.sucesso && depsResult.dados) {
          const pendentes = depsResult.dados.filter((d) => d.estado === 'ATIVA');
          if (pendentes.length > 0) {
            return { sucesso: false, erro: `Não pode iniciar: dependências pendentes (${pendentes.map((d) => d.id).join(', ')})`, codigoErro: 'PENDING_DEPENDENCIES' };
          }
        }
      }
      if (novoEstado === 'CONCLUIDA') {
        const depsResult = this.dependenciaService.listarPorDestino(tarefa.id);
        if (depsResult.sucesso && depsResult.dados) {
          const pendentes = depsResult.dados.filter((d) => d.estado === 'ATIVA');
          if (pendentes.length > 0) {
            return { sucesso: false, erro: `Não pode concluir: existem dependências ativas apontando para esta tarefa (${pendentes.map((d) => d.id).join(', ')})`, codigoErro: 'PENDING_DEPENDENCIES' };
          }
        }
      }
    }

    if (novoEstado === 'EM_EXECUCAO' && !tarefa.datas.inicio) {
      tarefa.datas.inicio = new Date().toISOString();
    }
    if (novoEstado === 'CONCLUIDA') {
      tarefa.datas.conclusao = new Date().toISOString();
    }

    const saveResult = this.saveTarefa(tarefa);
    if (!saveResult.sucesso) {
      return saveResult;
    }

    this.auditoria.registrar('TAREFA_ESTADO_ALTERADO', `Tarefa '${tarefa.id}' alterada de ${estadoAnterior} para ${novoEstado}.`, { tarefaId: tarefa.id });
     return { sucesso: true, dados: tarefa };
   }

   async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
     const result = this.obter(id);
     if (!result.sucesso || !result.dados) {
       return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
     }
     const tarefa = result.dados;
     const dir = this.getDirPorEstado(tarefa.estado);
     const registryResult = this.fs.lerJson<TarefasRegistry>(
       path.win32.join('.ia', 'tarefas', 'tarefas.json')
     );
     if (!registryResult.sucesso || !registryResult.dados) {
       return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
     }
     const registry = registryResult.dados;
     registry.tarefas = registry.tarefas.filter((t) => t.id !== id);
     registry.estatisticas = this.calcularEstatisticas(registry.tarefas);
     const regResult = this.fs.escreverJson(
       path.win32.join('.ia', 'tarefas', 'tarefas.json'),
       registry
     );
     if (!regResult.sucesso) {
       return { sucesso: false, erro: regResult.erro, codigoErro: regResult.codigoErro };
     }
      const arquivoResult = this.fs.excluir(
        path.win32.join('.ia', 'tarefas', dir, `${tarefa.id}.json`),
        { backup: true }
      );
     if (!arquivoResult.sucesso) {
       return { sucesso: false, erro: arquivoResult.erro, codigoErro: arquivoResult.codigoErro };
     }
     this.auditoria.registrar('TAREFA_EXCLUIDA', `Tarefa '${tarefa.id}' excluída.`, { tarefaId: tarefa.id });
     return { sucesso: true, dados: true };
   }

   atualizar(id: string, dados: Partial<Tarefa>): ResultadoOperacao<Tarefa> {
     const result = this.obter(id);
     if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    const tarefa = { ...result.dados, ...dados, datas: { ...result.dados.datas, ultimaAtualizacao: new Date().toISOString() } };
    const saveResult = this.saveTarefa(tarefa);
    if (!saveResult.sucesso) {
      return saveResult;
    }
    this.auditoria.registrar('ARQUIVO_ALTERADO', `Tarefa '${tarefa.id}' atualizada.`, { tarefaId: tarefa.id });
    return { sucesso: true, dados: tarefa };
  }

  private getExecucaoRegistryPath(): string {
    return path.win32.join('.ia', 'execucoes', 'execucoes.json');
  }

  private getProximoExecucaoId(tarefaId: string): number {
    const result = this.fs.lerJson<ExecucoesRegistry>(this.getExecucaoRegistryPath());
    if (!result.sucesso || !result.dados) {
      return 1;
    }
    const execucoesTarefa = result.dados.execucoes.filter((e) => e.tarefaId === tarefaId);
    if (execucoesTarefa.length === 0) {
      return 1;
    }
    const maxId = execucoesTarefa.reduce((max, e) => Math.max(max, e.execucaoId), 0);
    return maxId + 1;
  }

  private salvarExecucao(execucao: Execucao): ResultadoOperacao<Execucao> {
    const registryResult = this.fs.lerJson<ExecucoesRegistry>(this.getExecucaoRegistryPath());
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
    }
    const registry = registryResult.dados;
    const existing = registry.execucoes.findIndex((e) => e.execucaoId === execucao.execucaoId && e.tarefaId === execucao.tarefaId);
    if (existing >= 0) {
      registry.execucoes[existing] = execucao;
    } else {
      registry.execucoes.push(execucao);
    }
    const regResult = this.fs.escreverJson(this.getExecucaoRegistryPath(), registry);
    if (!regResult.sucesso) {
      return { sucesso: false, erro: regResult.erro, codigoErro: regResult.codigoErro };
    }
    return { sucesso: true, dados: execucao };
  }

  criarExecucao(tarefaId: string, agenteId: string): ResultadoOperacao<Execucao> {
    const tarefaResult = this.obter(tarefaId);
    if (!tarefaResult.sucesso || !tarefaResult.dados) {
      return { sucesso: false, erro: tarefaResult.erro, codigoErro: tarefaResult.codigoErro };
    }
    const execucaoId = this.getProximoExecucaoId(tarefaId);
    const hoje = new Date().toISOString();
    const execucao: Execucao = {
      execucaoId,
      tarefaId,
      estado: 'PENDENTE',
      agenteId,
      inicio: null,
      fim: null,
      resultadoId: null,
      observacoes: '',
      datas: { criadaEm: hoje, atualizadaEm: hoje }
    };
    const result = this.salvarExecucao(execucao);
    if (!result.sucesso) {
      return result;
    }
    this.auditoria.registrar('EXECUCAO_CRIADA', `Execução ${execucaoId} criada para tarefa ${tarefaId}.`, { tarefaId, execucaoId, agenteId });
    return { sucesso: true, dados: execucao };
  }

  listarExecucoes(tarefaId: string): ResultadoOperacao<Execucao[]> {
    const result = this.fs.lerJson<ExecucoesRegistry>(this.getExecucaoRegistryPath());
    if (!result.sucesso || !result.dados) {
      return { sucesso: true, dados: [] };
    }
    const execucoes = result.dados.execucoes.filter((e) => e.tarefaId === tarefaId).sort((a, b) => a.execucaoId - b.execucaoId);
    return { sucesso: true, dados: execucoes };
  }

  obterExecucao(tarefaId: string, execucaoId: number): ResultadoOperacao<Execucao> {
    const result = this.fs.lerJson<ExecucoesRegistry>(this.getExecucaoRegistryPath());
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: 'Execução não encontrada', codigoErro: 'EXECUCAO_NOT_FOUND' };
    }
    const execucao = result.dados.execucoes.find((e) => e.tarefaId === tarefaId && e.execucaoId === execucaoId);
    if (!execucao) {
      return { sucesso: false, erro: 'Execução não encontrada', codigoErro: 'EXECUCAO_NOT_FOUND' };
    }
    return { sucesso: true, dados: execucao };
  }

  atualizarEstadoExecucao(tarefaId: string, execucaoId: number, novoEstado: EstadoExecucao, resultadoId?: string | null): ResultadoOperacao<Execucao> {
    const result = this.obterExecucao(tarefaId, execucaoId);
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    const execucao = result.dados;
    const transicoesValidas: Record<EstadoExecucao, EstadoExecucao[]> = {
      PENDENTE: ['EM_EXECUCAO', 'CANCELADA'],
      EM_EXECUCAO: ['SUCESSO', 'FALHA', 'CANCELADA'],
      SUCESSO: [],
      FALHA: ['PENDENTE'],
      CANCELADA: []
    };
    const permitidas = transicoesValidas[execucao.estado] || [];
    if (!permitidas.includes(novoEstado)) {
      return { sucesso: false, erro: `Transição inválida de execução: ${execucao.estado} → ${novoEstado}`, codigoErro: 'INVALID_TRANSITION' };
    }
    execucao.estado = novoEstado;
    execucao.datas.atualizadaEm = new Date().toISOString();
    if (novoEstado === 'EM_EXECUCAO' && !execucao.inicio) {
      execucao.inicio = new Date().toISOString();
    }
    if (novoEstado === 'SUCESSO' || novoEstado === 'FALHA' || novoEstado === 'CANCELADA') {
      execucao.fim = new Date().toISOString();
    }
    if (resultadoId !== undefined) {
      execucao.resultadoId = resultadoId;
    }
    const saveResult = this.salvarExecucao(execucao);
    if (!saveResult.sucesso) {
      return saveResult;
    }
    this.auditoria.registrar('EXECUCAO_ESTADO_ALTERADO', `Execução ${execucaoId} da tarefa ${tarefaId} alterada para ${novoEstado}.`, { tarefaId, execucaoId });
    return { sucesso: true, dados: execucao };
  }

  atualizarExecucaoObs(tarefaId: string, execucaoId: number, observacoes: string): ResultadoOperacao<Execucao> {
    const result = this.obterExecucao(tarefaId, execucaoId);
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    const execucao = result.dados;
    execucao.observacoes = observacoes;
    execucao.datas.atualizadaEm = new Date().toISOString();
    const saveResult = this.salvarExecucao(execucao);
    if (!saveResult.sucesso) {
      return saveResult;
    }
    return { sucesso: true, dados: execucao };
  }

  async montarContexto(id: string): Promise<ResultadoOperacao<PacoteContexto>> {
    const tarefaResult = this.obter(id);
    if (!tarefaResult.sucesso || !tarefaResult.dados) {
      return { sucesso: false, erro: tarefaResult.erro, codigoErro: tarefaResult.codigoErro };
    }
    const tarefa = tarefaResult.dados;

    let agentePerf: PacoteContexto['agente'] = null;

    const agentesResult = await this.fs.lerJson<{ agentes: { id: string; nome: string; arquivoPerfil: string }[] }>(
      path.win32.join('.ia', 'agentes', 'agentes.json')
    );
    if (agentesResult.sucesso && agentesResult.dados) {
      const reg = agentesResult.dados.agentes.find((a) => a.id === tarefa.agenteResponsavel);
      if (reg) {
        const perfilResult = await this.fs.lerJson<AgentePerfil>(reg.arquivoPerfil.replace(/^\.ia\//, ''));
        if (perfilResult.sucesso && perfilResult.dados) {
          const p = perfilResult.dados;
          agentePerf = { id: p.id, nome: p.nome, permissoes: p.permissoes as unknown as Record<string, boolean>, diretoriosPermitidos: p.diretoriosPermitidos, diretoriosProibidos: p.diretoriosProibidos };
        }
      }
    }

    const contratos: unknown[] = [];
    for (const cid of tarefa.contratosObrigatorios) {
      const cResult = await this.fs.lerJson<unknown>(path.win32.join('.ia', 'contratos', `${cid}.json`));
      if (cResult.sucesso) {
        contratos.push(cResult.dados);
      }
    }

    const dependencias: Tarefa[] = [];
    for (const depId of tarefa.dependencias) {
      const depResult = this.obter(depId);
      if (depResult.sucesso && depResult.dados) {
        dependencias.push(depResult.dados);
      }
    }

    const decisoesResult = await this.fs.lerJson<{ decisoes: any[] }>(
      path.win32.join('.ia', 'decisoes', 'decisoes.json')
    );
    const decisoes: Decisao[] = (decisoesResult.sucesso && decisoesResult.dados?.decisoes) || [];

    const estadoResult = await this.fs.lerJson<any>(
      path.win32.join('.ia', 'estado', 'estado-atual.json')
    );
    const estado = (estadoResult.sucesso && estadoResult.dados) || null;

    const arquivosRelevantes: { caminho: string; conteudo: string }[] = [];
    const allowedPatterns = tarefa.arquivosPermitidos.length > 0 ? tarefa.arquivosPermitidos : ['/**'];
    for (const pattern of allowedPatterns) {
      if (pattern === '/**') continue;
      const cleanPattern = pattern.replace(/^\//, '').replace(/\*\*\/?$/, '');
      if (cleanPattern) {
        const contentResult = await this.fs.ler(cleanPattern);
        if (contentResult.sucesso && contentResult.dados) {
          arquivosRelevantes.push({ caminho: cleanPattern, conteudo: contentResult.dados });
        }
      }
    }

    const pacote: PacoteContexto = {
      identidade: {
        projetoId: tarefa.agenteResponsavel ? tarefa.agenteResponsavel : '',
        nome: '',
        versao: ''
      },
      contratos,
      tarefa,
      estado,
      dependencias,
      arquivosRelevantes,
      decisoes,
      restricoes: tarefa.restricoes,
      criteriosAceitacao: tarefa.criteriosAceitacao,
      agente: agentePerf
    };

    const projetoResult = await this.fs.lerJson<any>(
      path.win32.join('.ia', 'configuracao', 'projeto.json')
    );
    if (projetoResult.sucesso && projetoResult.dados) {
      pacote.identidade = { projetoId: projetoResult.dados.id, nome: projetoResult.dados.nome, versao: projetoResult.dados.versao };
    }

    const contextoPath = path.win32.join('.ia', 'contexto', 'contextos.json');
    const contextosResult = await this.fs.lerJson<{ contextos: any[] }>(contextoPath);
    const contextos = (contextosResult.sucesso && contextosResult.dados?.contextos) || [];
    contextos.push({
      id: uuid(),
      agenteId: tarefa.agenteResponsavel,
      tarefaId: tarefa.id,
      versao: '1.0.0',
      contratos: tarefa.contratosObrigatorios,
      arquivos: arquivosRelevantes.map((a) => a.caminho),
      decisoes: decisoes.filter((d) => tarefa.contratosObrigatorios.some((c) => d.contratosAfetados?.includes(c))).map((d) => d.id),
      conhecimento: [],
      estado: 'gerado',
      restricoes: tarefa.restricoes,
      criteriosAceitacao: tarefa.criteriosAceitacao,
      geradoEm: new Date().toISOString()
    });
    await this.fs.escreverJson(contextoPath, { contextos });

    return { sucesso: true, dados: pacote };
  }
}

