import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { Evento, Handoff, HandoffsRegistry, ResultadoOperacao } from '../tipos';
import { IdGenerator } from '../arquivos/IdGenerator';
import { TRANSICOES_ESTADO_HANDOFF, validarTransicao } from '../tipos';
import { EventoService } from './EventoService';
import { handoffsUri } from '../mcp-server/resources/uri-factory';
import { EventBus } from '../mcp-server/events/event-bus';

import { MonitoramentoService } from './MonitoramentoService';
export class HandoffService {
  private idGenerator: IdGenerator;

  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator,
    private eventoService?: EventoService,
    private eventBus?: EventBus,
    private monitoramento?: MonitoramentoService
  ) {
    this.idGenerator = new IdGenerator(fs);
  }

  private getRegistryPath(): string {
    return path.join('.ia', 'handoffs', 'handoffs.json');
  }

  private getHandoffPath(id: string): string {
    return path.join('.ia', 'handoffs', `${id}.json`);
  }

  private gerarId(): string {
    return this.idGenerator.gerarId('HOF', this.getRegistryPath(), 'handoffs');
  }

  private carregarRegistry(): ResultadoOperacao<HandoffsRegistry> {
    const result = this.fs.lerJson<HandoffsRegistry>(this.getRegistryPath());
    if (!result.sucesso || !result.dados) {
      return { sucesso: true, dados: { handoffs: [] } };
    }
    return result;
  }

  private salvarRegistry(registry: HandoffsRegistry): void {
    this.fs.escreverJson(this.getRegistryPath(), registry);
  }

  listar(): ResultadoOperacao<Handoff[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    return { sucesso: true, dados: result.dados.handoffs };
  }

  listarPorDestino(agenteId: string): ResultadoOperacao<Handoff[]> {
    const result = this.carregarRegistry();
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    const filtered = result.dados.handoffs.filter((h) => h.destino === agenteId);
    return { sucesso: true, dados: filtered };
  }

  obter(id: string): ResultadoOperacao<Handoff> {
    const result = this.fs.lerJson<Handoff>(this.getHandoffPath(id));
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: 'Handoff não encontrado', codigoErro: 'NOT_FOUND' };
    }
    return { sucesso: true, dados: result.dados };
  }

  async criar(dados: Partial<Handoff>): Promise<ResultadoOperacao<Handoff>> {
    const registryResult = this.carregarRegistry();
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: 'Erro ao carregar registro', codigoErro: 'REGISTRY_ERROR' };
    }

    const id = dados.id || this.gerarId();
    if (registryResult.dados.handoffs.find((h) => h.id === id)) {
      return { sucesso: false, erro: `ID '${id}' já existe`, codigoErro: 'DUPLICATE_ID' };
    }

    const hoje = new Date().toISOString();
    const handoff: Handoff = {
      id,
      origem: dados.origem || '',
      destino: dados.destino || '',
      tarefaId: dados.tarefaId || null,
      resumo: dados.resumo || '',
      concluido: dados.concluido || [],
      pendente: dados.pendente || [],
      artefatos: dados.artefatos || [],
      decisoes: dados.decisoes || [],
      alteracoes: dados.alteracoes || [],
      riscos: dados.riscos || [],
      bloqueios: dados.bloqueios || [],
      observacoes: dados.observacoes || null,
      estado: dados.estado || 'PENDENTE',
      datas: { criadaEm: hoje, criacao: hoje, aceitaEm: null, concluidaEm: null }
    };

    const validation = this.validator.validar('handoff', handoff);
    if (!validation.valido) {
      return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    const fileResult = this.fs.escreverJson(this.getHandoffPath(id), handoff, { backup: true });
    if (!fileResult.sucesso) {
      return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };
    }

    registryResult.dados.handoffs.push(handoff);
    this.salvarRegistry(registryResult.dados);
    this.auditoria.registrar('HANDOFF_CRIADO', `Handoff '${id}' de '${handoff.origem}' para '${handoff.destino}'.`, { handoffId: id, origem: handoff.origem, destino: handoff.destino });
    if (this.eventoService) {
      this.eventoService.registrar({ tipo: 'HANDOFF_CRIADO', origem: handoff.origem, destino: handoff.destino, referenciaTipo: 'handoff', referenciaId: id, mensagem: `Novo handoff de ${handoff.origem} para ${handoff.destino}` });
    }
    if (this.monitoramento) {
      this.monitoramento.adicionarMensagem({
        id: `MSG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        tipo: 'HANDOFF_CRIADO',
        emissor: handoff.origem,
        agenteId: handoff.origem,
        conteudo: `Novo handoff de ${handoff.origem} para ${handoff.destino}: ${handoff.resumo || id}`,
        dados: { handoffId: id, origem: handoff.origem, destino: handoff.destino }
      }).catch(() => {});
    }
    if (this.eventBus) {
      this.eventBus.publish({ uri: handoffsUri(handoff.destino), timestamp: Date.now(), reason: 'handoff_criado' });
    }
    return { sucesso: true, dados: handoff };
  }

  async atualizar(id: string, dados: Partial<Handoff>): Promise<ResultadoOperacao<Handoff>> {
    const existente = this.obter(id);
    if (!existente.sucesso || !existente.dados) {
      return { sucesso: false, erro: existente.erro, codigoErro: existente.codigoErro };
    }

    const hoje = new Date().toISOString();
    const atualizado: Handoff = { ...existente.dados, ...dados };

    const validation = this.validator.validar('handoff', atualizado);
    if (!validation.valido) {
      return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    if (dados.estado && dados.estado !== existente.dados.estado) {
      if (!validarTransicao(TRANSICOES_ESTADO_HANDOFF, existente.dados.estado, dados.estado)) {
        return { sucesso: false, erro: `Transição inválida: ${existente.dados.estado} → ${dados.estado}`, codigoErro: 'INVALID_TRANSITION' };
      }
    }

    const fileResult = this.fs.escreverJson(this.getHandoffPath(id), atualizado, { backup: true });
    if (!fileResult.sucesso) {
      return { sucesso: false, erro: fileResult.erro, codigoErro: fileResult.codigoErro };
    }

    const registryResult = this.carregarRegistry();
    if (registryResult.sucesso && registryResult.dados) {
      registryResult.dados.handoffs = registryResult.dados.handoffs.map((h) => (h.id === id ? atualizado : h));
      this.salvarRegistry(registryResult.dados);
    }

     if (atualizado.estado === 'ACEITO' && !existente.dados.datas.aceitaEm) {
       atualizado.datas.aceitaEm = hoje;
       this.fs.escreverJson(this.getHandoffPath(id), atualizado, { backup: true });
       const registryResult = this.carregarRegistry();
       if (registryResult.sucesso && registryResult.dados) {
         registryResult.dados.handoffs = registryResult.dados.handoffs.map((h) => (h.id === id ? atualizado : h));
         this.salvarRegistry(registryResult.dados);
       }
     }
     if (atualizado.estado === 'CONCLUIDO' && !existente.dados.datas.concluidaEm) {
       atualizado.datas.concluidaEm = hoje;
       this.fs.escreverJson(this.getHandoffPath(id), atualizado, { backup: true });
       const registryResult = this.carregarRegistry();
       if (registryResult.sucesso && registryResult.dados) {
         registryResult.dados.handoffs = registryResult.dados.handoffs.map((h) => (h.id === id ? atualizado : h));
         this.salvarRegistry(registryResult.dados);
       }
     }

    if (this.eventoService && dados.estado && dados.estado !== existente.dados.estado) {
      if (dados.estado === 'ACEITO') {
        this.eventoService.registrar({ tipo: 'HANDOFF_ACEITO', origem: atualizado.destino, destino: atualizado.origem, referenciaTipo: 'handoff', referenciaId: id, mensagem: `Handoff '${id}' aceito por '${atualizado.destino}'.` });
      }
      if (dados.estado === 'CONCLUIDO') {
        this.eventoService.registrar({ tipo: 'HANDOFF_CONCLUIDO', origem: atualizado.destino, destino: atualizado.origem, referenciaTipo: 'handoff', referenciaId: id, mensagem: `Handoff '${id}' concluido.` });
      }
    }
    if (this.monitoramento && dados.estado && dados.estado !== existente.dados.estado) {
      const tipoMonitoramento = dados.estado === 'ACEITO' ? 'HANDOFF_ACEITO' : dados.estado === 'CONCLUIDO' ? 'HANDOFF_CONCLUIDO' : 'HANDOFF_ATUALIZADO';
      this.monitoramento.adicionarMensagem({
        id: `MSG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        tipo: tipoMonitoramento,
        emissor: atualizado.destino,
        agenteId: atualizado.destino,
        conteudo: `Handoff '${id}' ${dados.estado.toLowerCase()} por '${atualizado.destino}'.`,
        dados: { handoffId: id, estado: dados.estado, origem: atualizado.origem, destino: atualizado.destino }
      }).catch(() => {});
    }
    if (this.eventBus && dados.estado && dados.estado !== existente.dados.estado) {
      this.eventBus.publish({ uri: handoffsUri(atualizado.destino), timestamp: Date.now(), reason: `handoff_${dados.estado.toLowerCase()}` });
    }

    return { sucesso: true, dados: atualizado };
  }

   async excluir(id: string): Promise<ResultadoOperacao<boolean>> {
     const registryResult = this.carregarRegistry();
     if (!registryResult.sucesso || !registryResult.dados) {
       return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
     }
     registryResult.dados.handoffs = registryResult.dados.handoffs.filter((h) => h.id !== id);
     this.salvarRegistry(registryResult.dados);
     this.fs.excluir(this.getHandoffPath(id), { backup: true });
     return { sucesso: true, dados: true };
   }

   async excluirTodos(): Promise<ResultadoOperacao<number>> {
     const registryResult = this.carregarRegistry();
     if (!registryResult.sucesso || !registryResult.dados) {
       return { sucesso: false, erro: registryResult.erro, codigoErro: registryResult.codigoErro };
     }
     const handoffs = [...registryResult.dados.handoffs];
     let removidos = 0;
     for (const h of handoffs) {
       this.fs.excluir(this.getHandoffPath(h.id), { backup: true });
       removidos++;
     }
     registryResult.dados.handoffs = [];
     this.salvarRegistry(registryResult.dados);
     this.auditoria.registrar('HANDOFFS_EXCLUIDOS', `${removidos} handoffs excluídos.`, {});
     return { sucesso: true, dados: removidos };
   }
 }

