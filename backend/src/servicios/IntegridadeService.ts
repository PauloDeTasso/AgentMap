import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { EstadoProjeto, ResultadoOperacao, SolicitacaoAlteracao, Tarefa, HistoricoCoordenacao, Bloqueio, ResultadoEntity, CriterioAceitacao, Artefato, Handoff, Validacao, Conflito, Reserva, Sessao, Checkpoint, Aprendizado, Dependencia, Responsabilidade, Decisao, Risco, Pendencia } from '../tipos';
import { v4 as uuid } from 'uuid';

function lerJsonSeguro<T>(fs: FileService, caminho: string, chave?: string): T[] {
  const result = fs.lerJson<T>(caminho);
  if (!result.sucesso || !result.dados) return [];
  if (chave && typeof result.dados === 'object' && chave in result.dados) {
    return (result.dados as Record<string, T[]>)[chave] || [];
  }
  return Array.isArray(result.dados) ? result.dados : [];
}

export class IntegridadeService {
  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {}

  async verificar(projetoId: string): Promise<ResultadoOperacao<{ inconsistencias: string[]; estado: string }>> {
    const inconsistencias: string[] = [];

    const agentes = lerJsonSeguro<{ id: string }>(this.fs, path.win32.join('.ia', 'agentes', 'agentes.json'), 'agentes');
    const agentesSet = new Set(agentes.map((a) => a.id));

    const tarefas = lerJsonSeguro<Tarefa>(this.fs, path.win32.join('.ia', 'tarefas', 'tarefas.json'), 'tarefas');
    const tarefasSet = new Set(tarefas.map((t) => t.id));

    const solicitacoes = lerJsonSeguro<SolicitacaoAlteracao>(this.fs, path.win32.join('.ia', 'solicitacoes', 'solicitacoes.json'), 'solicitacoes');
    const solicitacoesSet = new Set(solicitacoes.map((s) => s.id));

    const resultados = lerJsonSeguro<ResultadoEntity>(this.fs, path.win32.join('.ia', 'resultados', 'resultados.json'), 'resultados');
    const criterios = lerJsonSeguro<CriterioAceitacao>(this.fs, path.win32.join('.ia', 'criterios', 'criterios.json'), 'criterios');
    const bloqueios = lerJsonSeguro<Bloqueio>(this.fs, path.win32.join('.ia', 'estado', 'bloqueios.json'), 'bloqueios');
    const artefatos = lerJsonSeguro<Artefato>(this.fs, path.win32.join('.ia', 'artefatos', 'artefatos.json'), 'artefatos');
    const handoffs = lerJsonSeguro<Handoff>(this.fs, path.win32.join('.ia', 'handoffs', 'handoffs.json'), 'handoffs');
    const validacoes = lerJsonSeguro<Validacao>(this.fs, path.win32.join('.ia', 'validacoes', 'validacoes.json'), 'validacoes');
    const conflitos = lerJsonSeguro<Conflito>(this.fs, path.win32.join('.ia', 'conflitos', 'conflitos.json'), 'conflitos');
    const reservas = lerJsonSeguro<Reserva>(this.fs, path.win32.join('.ia', 'reservas', 'reservas.json'), 'reservas');
    const sessoes = lerJsonSeguro<Sessao>(this.fs, path.win32.join('.ia', 'sessoes', 'sessoes.json'), 'sessoes');
    const checkpoints = lerJsonSeguro<Checkpoint>(this.fs, path.win32.join('.ia', 'checkpoints', 'checkpoints.json'), 'checkpoints');
    const aprendizados = lerJsonSeguro<Aprendizado>(this.fs, path.win32.join('.ia', 'aprendizados', 'aprendizados.json'), 'aprendizados');
    const dependencias = lerJsonSeguro<Dependencia>(this.fs, path.win32.join('.ia', 'dependencias', 'dependencias.json'), 'dependencias');
    const responsabilidades = lerJsonSeguro<Responsabilidade>(this.fs, path.win32.join('.ia', 'responsabilidades', 'responsabilidades.json'), 'responsabilidades');
    const decisoes = lerJsonSeguro<Decisao>(this.fs, path.win32.join('.ia', 'decisoes', 'decisoes.json'), 'decisoes');
    const riscos = lerJsonSeguro<Risco>(this.fs, path.win32.join('.ia', 'riscos', 'riscos.json'), 'riscos');
    const pendencias = lerJsonSeguro<Pendencia>(this.fs, path.win32.join('.ia', 'pendencias', 'pendencias.json'), 'pendencias');

    const contratosSet = new Set<string>();
    const contratosRes = this.fs.lerJson<{ contratos: { id: string }[] }>(path.win32.join('.ia', 'contratos', 'contratos.json'));
    if (contratosRes.sucesso && contratosRes.dados) {
      contratosRes.dados.contratos.forEach((c) => contratosSet.add(c.id));
    }

    const projetosSet = new Set<string>();
    const projetosRes = this.fs.lerJson<{ projetos: { id: string }[] }>(path.win32.join('.ia', 'configuracao', 'projetos.json'));
    if (projetosRes.sucesso && projetosRes.dados) {
      projetosRes.dados.projetos.forEach((p) => projetosSet.add(p.id));
    }

    const alvoIdSet = new Set<string>([
      ...resultados.map((r) => r.id),
      ...criterios.map((c) => c.id),
      ...artefatos.map((a) => a.id),
      ...handoffs.map((h) => h.id),
      ...validacoes.map((v) => v.id),
      ...conflitos.map((c) => c.id),
      ...reservas.map((r) => r.id),
      ...sessoes.map((s) => s.id),
      ...checkpoints.map((c) => c.id),
      ...aprendizados.map((a) => a.id),
      ...decisoes.map((d) => d.id),
      ...riscos.map((r) => r.id),
      ...pendencias.map((p) => p.id),
      ...bloqueios.map((b) => b.id),
      ...dependencias.map((d) => d.id),
      ...responsabilidades.map((r) => r.id)
    ]);

    for (const s of solicitacoes) {
      if (s.agenteSolicitante?.id && !agentesSet.has(s.agenteSolicitante.id)) {
        inconsistencias.push(`Solicitação '${s.id}': agenteSolicitante '${s.agenteSolicitante.id}' não existe`);
      }
      if (s.agenteResponsavel?.id && !agentesSet.has(s.agenteResponsavel.id)) {
        inconsistencias.push(`Solicitação '${s.id}': agenteResponsavel '${s.agenteResponsavel.id}' não existe`);
      }
      if (s.tarefaOrigem?.id && !tarefasSet.has(s.tarefaOrigem.id)) {
        inconsistencias.push(`Solicitação '${s.id}': tarefaOrigem '${s.tarefaOrigem.id}' não existe`);
      }
      if (s.dependencias) {
        for (const dep of s.dependencias) {
          if (dep.startsWith('TAR') && !tarefasSet.has(dep)) {
            inconsistencias.push(`Solicitação '${s.id}': dependência de tarefa '${dep}' não existe`);
          }
          if (dep.startsWith('ALT') && !solicitacoesSet.has(dep)) {
            inconsistencias.push(`Solicitação '${s.id}': dependência de solicitação '${dep}' não existe`);
          }
        }
      }
    }

    for (const t of tarefas) {
      if (t.agenteResponsavel && !agentesSet.has(t.agenteResponsavel)) {
        inconsistencias.push(`Tarefa '${t.id}': agenteResponsavel '${t.agenteResponsavel}' não existe`);
      }
      for (const depId of (t.dependencias || [])) {
        if (!tarefasSet.has(depId)) {
          inconsistencias.push(`Tarefa '${t.id}': dependência '${depId}' não existe`);
        }
      }
      for (const cid of (t.contratosObrigatorios || [])) {
        if (!contratosSet.has(cid)) {
          inconsistencias.push(`Tarefa '${t.id}': contrato obrigatório '${cid}' não existe`);
        }
      }
      for (const caId of (t.criteriosAceitacao || [])) {
        if (!criterios.some((c) => c.id === caId)) {
          inconsistencias.push(`Tarefa '${t.id}': critério de aceitação '${caId}' não encontrado`);
        }
      }
    }

    for (const r of resultados) {
      if (r.tarefaId && !tarefasSet.has(r.tarefaId)) {
        inconsistencias.push(`Resultado '${r.id}': tarefaId '${r.tarefaId}' não existe`);
      }
      if (r.agenteId && !agentesSet.has(r.agenteId)) {
        inconsistencias.push(`Resultado '${r.id}': agenteId '${r.agenteId}' não existe`);
      }
      for (const altId of r.alteracoesSolicitadas) {
        if (!solicitacoesSet.has(altId)) {
          inconsistencias.push(`Resultado '${r.id}': alteracaoSolicitada '${altId}' não encontrada`);
        }
      }
    }

    for (const c of criterios) {
      if (c.tarefaId && !tarefasSet.has(c.tarefaId)) {
        inconsistencias.push(`Critério '${c.id}': tarefaId '${c.tarefaId}' não existe`);
      }
    }

    for (const b of bloqueios) {
      if (b.tarefaId && !tarefasSet.has(b.tarefaId)) {
        inconsistencias.push(`Bloqueio '${b.id}': tarefaId '${b.tarefaId}' não existe`);
      }
      if (b.responsavelResolucao && !agentesSet.has(b.responsavelResolucao)) {
        inconsistencias.push(`Bloqueio '${b.id}': responsavelResolucao '${b.responsavelResolucao}' não existe`);
      }
    }

    for (const h of handoffs) {
      if (h.origem && !agentesSet.has(h.origem)) {
        inconsistencias.push(`Handoff '${h.id}': origem '${h.origem}' não existe`);
      }
      if (h.destino && !agentesSet.has(h.destino)) {
        inconsistencias.push(`Handoff '${h.id}': destino '${h.destino}' não existe`);
      }
      if (h.tarefaId && !tarefasSet.has(h.tarefaId)) {
        inconsistencias.push(`Handoff '${h.id}': tarefaId '${h.tarefaId}' não existe`);
      }
    }

    for (const v of validacoes) {
      if (v.responsavel && !agentesSet.has(v.responsavel)) {
        inconsistencias.push(`Validação '${v.id}': responsavel '${v.responsavel}' não existe`);
      }
      if (v.tarefaId && !tarefasSet.has(v.tarefaId)) {
        inconsistencias.push(`Validação '${v.id}': tarefaId '${v.tarefaId}' não existe`);
      }
      if (v.alvoId && !alvoIdSet.has(v.alvoId)) {
        inconsistencias.push(`Validação '${v.id}': alvoId '${v.alvoId}' (${v.alvoTipo}) não existe`);
      }
    }

    for (const c of conflitos) {
      if (c.agenteId && !agentesSet.has(c.agenteId)) {
        inconsistencias.push(`Conflito '${c.id}': agenteId '${c.agenteId}' não existe`);
      }
      if (c.tarefaId && !tarefasSet.has(c.tarefaId)) {
        inconsistencias.push(`Conflito '${c.id}': tarefaId '${c.tarefaId}' não existe`);
      }
    }

    for (const a of artefatos) {
      if (a.agenteId && !agentesSet.has(a.agenteId)) {
        inconsistencias.push(`Artefato '${a.id}': agenteId '${a.agenteId}' não existe`);
      }
      if (a.tarefaId && !tarefasSet.has(a.tarefaId)) {
        inconsistencias.push(`Artefato '${a.id}': tarefaId '${a.tarefaId}' não existe`);
      }
    }

    for (const p of pendencias) {
      if (p.agenteId && !agentesSet.has(p.agenteId)) {
        inconsistencias.push(`Pendência '${p.id}': agenteId '${p.agenteId}' não existe`);
      }
      if (p.tarefaId && !tarefasSet.has(p.tarefaId)) {
        inconsistencias.push(`Pendência '${p.id}': tarefaId '${p.tarefaId}' não existe`);
      }
      if (p.referenciaId && !alvoIdSet.has(p.referenciaId)) {
        inconsistencias.push(`Pendência '${p.id}': referenciaId '${p.referenciaId}' não existe`);
      }
    }

    for (const r of reservas) {
      if (r.agenteId && !agentesSet.has(r.agenteId)) {
        inconsistencias.push(`Reserva '${r.id}': agenteId '${r.agenteId}' não existe`);
      }
      if (r.tarefaId && !tarefasSet.has(r.tarefaId)) {
        inconsistencias.push(`Reserva '${r.id}': tarefaId '${r.tarefaId}' não existe`);
      }
    }

    for (const s of sessoes) {
      if (s.agenteId && !agentesSet.has(s.agenteId)) {
        inconsistencias.push(`Sessão '${s.id}': agenteId '${s.agenteId}' não existe`);
      }
      if (s.tarefaId && !tarefasSet.has(s.tarefaId)) {
        inconsistencias.push(`Sessão '${s.id}': tarefaId '${s.tarefaId}' não existe`);
      }
      if (s.projetoId && !projetosSet.has(s.projetoId)) {
        inconsistencias.push(`Sessão '${s.id}': projetoId '${s.projetoId}' não existe`);
      }
    }

    for (const c of checkpoints) {
      if (c.agenteId && !agentesSet.has(c.agenteId)) {
        inconsistencias.push(`Checkpoint '${c.id}': agenteId '${c.agenteId}' não existe`);
      }
      if (c.tarefaId && !tarefasSet.has(c.tarefaId)) {
        inconsistencias.push(`Checkpoint '${c.id}': tarefaId '${c.tarefaId}' não existe`);
      }
    }

    for (const a of aprendizados) {
      if (a.agenteId && !agentesSet.has(a.agenteId)) {
        inconsistencias.push(`Aprendizado '${a.id}': agenteId '${a.agenteId}' não existe`);
      }
      if (a.tarefaId && !tarefasSet.has(a.tarefaId)) {
        inconsistencias.push(`Aprendizado '${a.id}': tarefaId '${a.tarefaId}' não existe`);
      }
    }

    for (const d of decisoes) {
      if (d.aprovacao?.aprovador && !agentesSet.has(d.aprovacao.aprovador)) {
        inconsistencias.push(`Decisão '${d.id}': aprovador '${d.aprovacao.aprovador}' não existe`);
      }
    }

    for (const r of riscos) {
      if (r.responsavel && !agentesSet.has(r.responsavel)) {
        inconsistencias.push(`Risco '${r.id}': responsavel '${r.responsavel}' não existe`);
      }
    }

    for (const d of dependencias) {
      if (d.fonteTipo === 'TAREFA' && !tarefasSet.has(d.fonteId)) {
        inconsistencias.push(`Dependência '${d.id}': fonteId '${d.fonteId}' (${d.fonteTipo}) não existe`);
      }
      if (d.destinoTipo === 'TAREFA' && !tarefasSet.has(d.destinoId)) {
        inconsistencias.push(`Dependência '${d.id}': destinoId '${d.destinoId}' (${d.destinoTipo}) não existe`);
      }
    }

    for (const r of responsabilidades) {
      if (!agentesSet.has(r.agenteId)) {
        inconsistencias.push(`Responsabilidade '${r.id}': agenteId '${r.agenteId}' não existe`);
      }
      if (r.alvoTipo === 'TAREFA' && !tarefasSet.has(r.alvoId)) {
        inconsistencias.push(`Responsabilidade '${r.id}': alvoId '${r.alvoId}' (${r.alvoTipo}) não existe`);
      }
    }

    const historicoRes = this.fs.lerJson<HistoricoCoordenacao>(path.win32.join('.ia', 'historico', 'historico.json'));
    if (!historicoRes.sucesso) {
      inconsistencias.push('Arquivo historico/historico.json não encontrado');
    }

    this.auditoria.registrar('INTEGRIDADE_VERIFICADA', `Verificação de integridade: ${inconsistencias.length} inconsistências`, { projetoId, inconsistencias: inconsistencias.length });
    return { sucesso: true, dados: { inconsistencias, estado: inconsistencias.length === 0 ? 'OK' : 'INCONSISTENCIAS' } };
  }

  calcularEstadoProjeto(projetoId: string): ResultadoOperacao<EstadoProjeto> {
    const agentesRes = this.fs.lerJson<{ agentes: any[] }>(path.win32.join('.ia', 'agentes', 'agentes.json'));
    const tarefasRes = this.fs.lerJson<{ tarefas: any[]; estatisticas?: Record<string, number> }>(path.win32.join('.ia', 'tarefas', 'tarefas.json'));
    const solicitacoesRes = this.fs.lerJson<{ solicitacoes: any[] }>(path.win32.join('.ia', 'solicitacoes', 'solicitacoes.json'));
    const artefatosRes = this.fs.lerJson<{ artefatos: any[] }>(path.win32.join('.ia', 'artefatos', 'artefatos.json'));
    const handoffsRes = this.fs.lerJson<{ handoffs: any[] }>(path.win32.join('.ia', 'handoffs', 'handoffs.json'));
    const bloqueiosRes = this.fs.lerJson<{ bloqueios: any[] }>(path.win32.join('.ia', 'estado', 'bloqueios.json'));
    const conflitosRes = this.fs.lerJson<{ conflitos: any[] }>(path.win32.join('.ia', 'conflitos', 'conflitos.json'));
    const riscosRes = this.fs.lerJson<{ riscos: any[] }>(path.win32.join('.ia', 'riscos', 'riscos.json'));
    const validacoesRes = this.fs.lerJson<{ validacoes: any[] }>(path.win32.join('.ia', 'validacoes', 'validacoes.json'));
    const reservasRes = this.fs.lerJson<{ reservas: any[] }>(path.win32.join('.ia', 'reservas', 'reservas.json'));
    const checkpointsRes = this.fs.lerJson<{ checkpoints: any[] }>(path.win32.join('.ia', 'checkpoints', 'checkpoints.json'));
    const sessoesRes = this.fs.lerJson<{ sessoes: any[] }>(path.win32.join('.ia', 'sessoes', 'sessoes.json'));
    const aprendizadosRes = this.fs.lerJson<{ aprendizados: any[] }>(path.win32.join('.ia', 'aprendizados', 'aprendizados.json'));

    const tarefas = tarefasRes.dados?.tarefas || [];
    const solicitacoes = solicitacoesRes.dados?.solicitacoes || [];
    const artefatos = artefatosRes.dados?.artefatos || [];
    const handoffs = handoffsRes.dados?.handoffs || [];
    const bloqueios = bloqueiosRes.dados?.bloqueios || [];
    const conflitos = conflitosRes.dados?.conflitos || [];
    const riscos = riscosRes.dados?.riscos || [];
    const validacoes = validacoesRes.dados?.validacoes || [];
    const reservas = reservasRes.dados?.reservas || [];
    const checkpoints = checkpointsRes.dados?.checkpoints || [];
    const sessoes = sessoesRes.dados?.sessoes || [];
    const aprendizados = aprendizadosRes.dados?.aprendizados || [];

    const estado: EstadoProjeto = {
      projetoId,
      versao: '1.0.0',
      estado: 'IMPLEMENTACAO',
      resumo: '',
      tarefas: {
        total: tarefas.length,
        concluidas: tarefas.filter((t) => t.estado === 'CONCLUIDA').length,
        emExecucao: tarefas.filter((t) => t.estado === 'EM_EXECUCAO').length,
        bloqueadas: tarefas.filter((t) => t.estado === 'BLOQUEADA').length,
        pendentes: tarefas.filter((t) => ['RASCUNHO', 'PLANEJADA', 'PRONTA'].includes(t.estado)).length
      },
      solicitacoes: {
        total: solicitacoes.length,
        pendentes: solicitacoes.filter((s) => s.status === 'PENDENTE').length,
        aprovadas: solicitacoes.filter((s) => s.status === 'APROVADA').length,
        rejeitadas: solicitacoes.filter((s) => s.status === 'REJEITADA').length,
        concluidas: solicitacoes.filter((s) => s.status === 'CONCLUIDA').length
      },
      artefatos: {
        total: artefatos.length,
        ativos: artefatos.filter((a) => a.estado === 'ATIVO').length
      },
      handoffs: {
        total: handoffs.length,
        pendentes: handoffs.filter((h) => h.estado === 'PENDENTE').length,
        concluidos: handoffs.filter((h) => h.estado === 'CONCLUIDO').length
      },
      bloqueios: bloqueios.length,
      conflitos: {
        total: conflitos.length,
        abertos: conflitos.filter((c) => c.estado === 'ABERTO').length
      },
      riscos: {
        total: riscos.length,
        ativos: riscos.filter((r) => r.estado === 'ATIVO').length,
        criticos: riscos.filter((r) => r.gravidade === 'CRITICA').length
      },
      validacoes: {
        total: validacoes.length,
        pendentes: validacoes.filter((v) => v.estado === 'PENDENTE').length,
        aprovadas: validacoes.filter((v) => v.estado === 'APROVADO').length,
        reprovadas: validacoes.filter((v) => v.estado === 'REPROVADO').length
      },
      reservas: {
        total: reservas.length,
        ativas: reservas.filter((r) => r.estado === 'ATIVA').length
      },
      checkpoints: {
        total: checkpoints.length,
        recentes: checkpoints.slice(-5).length
      },
      sessoes: {
        total: sessoes.length,
        ativas: sessoes.filter((s) => !s.datas.fim).length
      },
      aprendizados: {
        total: aprendizados.length,
        ativos: aprendizados.filter((a) => a.estado === 'ATIVO').length
      },
      integridade: {
        ultimaVerificacao: new Date().toISOString(),
        inconsistencias: 0
      },
      datas: { atualizadaEm: new Date().toISOString() }
    };

    return { sucesso: true, dados: estado };
  }
}
