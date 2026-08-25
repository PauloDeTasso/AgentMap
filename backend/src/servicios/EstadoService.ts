import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';

export interface EstadoNota {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  estado: 'ATIVO' | 'ARQUIVADO' | 'RESOLVIDO';
  datas: {
    criacao: string;
    ultimaAtualizacao: string;
  };
}

export interface EstadoNotasRegistry {
  notas: EstadoNota[];
  estatisticas: {
    total: number;
    ativas: number;
    arquivadas: number;
    resolvidas: number;
  };
}

export class EstadoService {
  private readonly registryPath = path.win32.join('.ia', 'estado', 'estado-notas.json');
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  listar(): ResultadoOperacao<EstadoNota[]> {
    const result = this.fs.lerJson<EstadoNotasRegistry>(this.registryPath);
    if (!result.sucesso || !result.dados) {
      if (result.codigoErro === 'FILE_NOT_FOUND') {
        return { sucesso: true, dados: [] };
      }
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    return { sucesso: true, dados: result.dados.notas };
  }

  obter(id: string): ResultadoOperacao<EstadoNota> {
    const listaResult = this.listar();
    if (!listaResult.sucesso || !listaResult.dados) {
      return { sucesso: false, erro: listaResult.erro, codigoErro: listaResult.codigoErro };
    }
    const nota = listaResult.dados.find((n) => n.id === id);
    if (!nota) {
      return { sucesso: false, erro: 'Nota não encontrada', codigoErro: 'NOTA_NOT_FOUND' };
    }
    return { sucesso: true, dados: nota };
  }

  criar(dados: Omit<EstadoNota, 'id' | 'datas'> & { id?: string }): ResultadoOperacao<EstadoNota> {
    const hoje = new Date().toISOString();
    const nota: EstadoNota = {
      id: dados.id || this.idGenerator.gerarId('NOTA', this.registryPath, 'notas'),
      titulo: dados.titulo,
      conteudo: dados.conteudo,
      categoria: dados.categoria || 'GERAL',
      prioridade: dados.prioridade || 'MEDIA',
      estado: dados.estado || 'ATIVO',
      datas: {
        criacao: hoje,
        ultimaAtualizacao: hoje
      }
    };

    if (!nota.titulo || nota.titulo.trim() === '') {
      return { sucesso: false, erro: 'Título é obrigatório', codigoErro: 'VALIDATION_ERROR' };
    }

    const registryResult = this.fs.lerJson<EstadoNotasRegistry>(this.registryPath);
    let registry: EstadoNotasRegistry;
    if (!registryResult.sucesso || !registryResult.dados) {
      registry = { notas: [], estatisticas: { total: 0, ativas: 0, arquivadas: 0, resolvidas: 0 } };
    } else {
      registry = registryResult.dados;
    }

    const existente = registry.notas.find((n) => n.id === nota.id);
    if (existente) {
      return { sucesso: false, erro: `Nota com ID '${nota.id}' já existe`, codigoErro: 'NOTA_JA_EXISTE' };
    }

    registry.notas.push(nota);
    registry.estatisticas = this.calcularEstatisticas(registry.notas);

    const writeResult = this.fs.escreverJson(this.registryPath, registry, { backup: true });
    if (!writeResult.sucesso) {
      return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    }

    this.auditoria.registrar('ESTADO_NOTA_CRIADA', `Nota '${nota.titulo}' criada.`, { notaId: nota.id });
    return { sucesso: true, dados: nota };
  }

  atualizar(id: string, dados: Partial<Omit<EstadoNota, 'id' | 'datas'>>): ResultadoOperacao<EstadoNota> {
    const result = this.obter(id);
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }

    const notaAtualizada: EstadoNota = {
      ...result.dados,
      ...dados,
      id: result.dados.id,
      datas: {
        criacao: result.dados.datas.criacao,
        ultimaAtualizacao: new Date().toISOString()
      }
    };

    const registryResult = this.fs.lerJson<EstadoNotasRegistry>(this.registryPath);
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: 'Registro de notas não encontrado', codigoErro: 'REGISTRY_NOT_FOUND' };
    }

    const registry = registryResult.dados;
    const idx = registry.notas.findIndex((n) => n.id === id);
    if (idx < 0) {
      return { sucesso: false, erro: 'Nota não encontrada no registro', codigoErro: 'NOTA_NOT_FOUND' };
    }

    registry.notas[idx] = notaAtualizada;
    registry.estatisticas = this.calcularEstatisticas(registry.notas);

    const writeResult = this.fs.escreverJson(this.registryPath, registry, { backup: true });
    if (!writeResult.sucesso) {
      return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    }

    this.auditoria.registrar('ESTADO_NOTA_ATUALIZADA', `Nota '${notaAtualizada.titulo}' atualizada.`, { notaId: id });
    return { sucesso: true, dados: notaAtualizada };
  }

  excluir(id: string): ResultadoOperacao<boolean> {
    const result = this.obter(id);
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }

    const registryResult = this.fs.lerJson<EstadoNotasRegistry>(this.registryPath);
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: 'Registro de notas não encontrado', codigoErro: 'REGISTRY_NOT_FOUND' };
    }

    const registry = registryResult.dados;
    const idx = registry.notas.findIndex((n) => n.id === id);
    if (idx < 0) {
      return { sucesso: false, erro: 'Nota não encontrada no registro', codigoErro: 'NOTA_NOT_FOUND' };
    }

    const nota = registry.notas[idx];
    registry.notas.splice(idx, 1);
    registry.estatisticas = this.calcularEstatisticas(registry.notas);

    const writeResult = this.fs.escreverJson(this.registryPath, registry, { backup: true });
    if (!writeResult.sucesso) {
      return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    }

    this.auditoria.registrar('ESTADO_NOTA_EXCLUIDA', `Nota '${nota.titulo}' excluída.`, { notaId: id });
    return { sucesso: true, dados: true };
  }

  excluirTodas(): ResultadoOperacao<number> {
    const registryResult = this.fs.lerJson<EstadoNotasRegistry>(this.registryPath);
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: true, dados: 0 };
    }

    const registry = registryResult.dados;
    const total = registry.notas.length;

    registry.notas = [];
    registry.estatisticas = { total: 0, ativas: 0, arquivadas: 0, resolvidas: 0 };

    const writeResult = this.fs.escreverJson(this.registryPath, registry, { backup: true });
    if (!writeResult.sucesso) {
      return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    }

    this.auditoria.registrar('ESTADO_NOTAS_EXCLUIDAS', `${total} notas de estado excluídas.`, {});
    return { sucesso: true, dados: total };
  }

  private calcularEstatisticas(notas: EstadoNota[]): EstadoNotasRegistry['estatisticas'] {
    return {
      total: notas.length,
      ativas: notas.filter((n) => n.estado === 'ATIVO').length,
      arquivadas: notas.filter((n) => n.estado === 'ARQUIVADO').length,
      resolvidas: notas.filter((n) => n.estado === 'RESOLVIDO').length
    };
  }
}
