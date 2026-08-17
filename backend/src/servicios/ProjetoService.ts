import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { FileService } from '../arquivos/FileService';
import { ScaffoldService } from '../arquivos/ScaffoldService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { DependenciaService } from './DependenciaService';
import { FluxoService } from './FluxoService';
import { MonitoramentoService } from './MonitoramentoService';
import { ProjetoConfig, ProjetoRegistro, RegistroProjetos, ResultadoOperacao } from '../tipos';
import {
  loadRegistroProjetos,
  saveRegistroProjetos,
  registrarProjeto,
  removerProjetoDoRegistro
} from '../config';
import { KiloDiscoveryService } from './KiloDiscoveryService';
import { KiloReconciliationService } from './KiloReconciliationService';

export interface ProjetoAberto {
  id: string;
  nome: string;
  caminhoRaiz: string;
  fileService: FileService;
  auditoria: AuditoriaService;
  validator: SchemaValidator;
  config: ProjetoConfig;
  dependencia: DependenciaService;
  fluxo: FluxoService;
  monitoramento: MonitoramentoService;
  kiloDiscovery: KiloDiscoveryService;
  kiloReconciliation: KiloReconciliationService;
}

export class ProjetoService {
  private registro: RegistroProjetos;
  private projetosAbertos: Map<string, ProjetoAberto>;
  private validator: SchemaValidator;

  constructor(validator: SchemaValidator) {
    this.registro = loadRegistroProjetos();
    this.projetosAbertos = new Map();
    this.validator = validator;
  }

  listarProjetos(): ResultadoOperacao<ProjetoRegistro[]> {
    return { sucesso: true, dados: this.registro.projetos };
  }

  obterProjetoAtual(): ResultadoOperacao<ProjetoAberto | null> {
    if (!this.registro.projetoAtual) {
      return { sucesso: true, dados: null };
    }
    const cached = this.projetosAbertos.get(this.registro.projetoAtual);
    if (cached) {
      return { sucesso: true, dados: cached };
    }
    const projetoResult = this.abrirProjeto(this.registro.projetoAtual);
    return projetoResult;
  }

  getProjetoAtual(): ResultadoOperacao<ProjetoAberto | null> {
    return this.obterProjetoAtual();
  }

  criarProjeto(nome: string, caminhoParental: string, descricao: string, dadosExtra?: Record<string, unknown>): ResultadoOperacao<string> {
    const id = uuid();
    const nomeSanitizado = nome.replace(/[^a-zA-Z0-9_-]/g, '_');
    const caminhoRaiz = path.win32.join(caminhoParental, nomeSanitizado);

    if (fs.existsSync(path.win32.join(caminhoRaiz, '.ia'))) {
      return { sucesso: false, erro: 'Já existe um projeto com estrutura .ia/ neste local', codigoErro: 'IA_EXISTS' };
    }

    if (fs.existsSync(caminhoRaiz) && fs.readdirSync(caminhoRaiz).length > 0) {
      return { sucesso: false, erro: 'Diretório de destino não está vazio', codigoErro: 'DIR_NOT_EMPTY' };
    }

    const scaffold = new ScaffoldService();
    console.log('[ProjetoService.criarProjeto] Criando scaffold para projeto:', nome, 'em', caminhoRaiz);
    const result = scaffold.scaffoldProject(id, nome, descricao, caminhoRaiz);
    if (!result.sucesso) {
      console.error('[ProjetoService.criarProjeto] FALHA no scaffold:', result.erro);
      return result;
    }
    console.log('[ProjetoService.criarProjeto] Scaffold OK');

    const iaRoot = path.win32.join(caminhoRaiz, '.ia');
    [path.win32.join('.ia', 'contratos'), path.win32.join('.ia', 'tarefas'), path.win32.join('.ia', 'dependencias')].forEach((dir) => {
      const fullPath = path.win32.join(caminhoRaiz, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
    const fluxoMdPath = path.win32.join(iaRoot, 'fluxo-trabalho.md');
    if (!fs.existsSync(fluxoMdPath)) {
      fs.writeFileSync(fluxoMdPath, `# Fluxo de Trabalho Sincronizado — ${nome}\n\nEste documento define como o trabalho deve ser organizado para respeitar dependências entre agentes.\n`, 'utf-8');
    }

    const objetivos = Array.isArray(dadosExtra?.objetivos) ? dadosExtra.objetivos : [];
    const escopoIncluso = Array.isArray(dadosExtra?.escopoIncluso) ? dadosExtra.escopoIncluso : [];
    const escopoExcluido = Array.isArray(dadosExtra?.escopoExcluido) ? dadosExtra.escopoExcluido : [];
    const tecnologias = Array.isArray(dadosExtra?.tecnologias) ? dadosExtra.tecnologias : [];
    const hoje = new Date().toISOString();

    const config: ProjetoConfig = {
      id,
      nome,
      descricao: descricao || '',
      versao: String(dadosExtra?.versao || '1.0.0'),
      estado: 'ativo',
      idioma: String(dadosExtra?.idioma || 'pt-BR'),
      fusoHorario: String(dadosExtra?.fusoHorario || 'America/Sao_Paulo'),
      proprietario: {
        tipo: (dadosExtra?.proprietarioTipo as 'humano' | 'equipe' | 'empresa') || 'humano',
        nome: String(dadosExtra?.proprietarioNome || ''),
      },
      objetivos,
      escopo: { incluso: escopoIncluso, excluido: escopoExcluido },
      tecnologias: {
        frontend: Array.isArray(dadosExtra?.tecnologiasFrontend) ? dadosExtra.tecnologiasFrontend : [],
        backend: Array.isArray(dadosExtra?.tecnologiasBackend) ? dadosExtra.tecnologiasBackend : [],
        android: Array.isArray(dadosExtra?.tecnologiasAndroid) ? dadosExtra.tecnologiasAndroid : [],
        bancoDeDados: Array.isArray(dadosExtra?.tecnologiasBanco) ? dadosExtra.tecnologiasBanco : [],
        infraestrutura: Array.isArray(dadosExtra?.tecnologiasInfra) ? dadosExtra.tecnologiasInfra : [],
        testes: Array.isArray(dadosExtra?.tecnologiasTestes) ? dadosExtra.tecnologiasTestes : [],
      },
      ambiente: String(dadosExtra?.ambiente || 'desenvolvimento'),
      arquiteturas: Array.isArray(dadosExtra?.arquiteturas) ? dadosExtra.arquiteturas : [],
      padroes: Array.isArray(dadosExtra?.padroes) ? dadosExtra.padroes : [],
      diretorios: (dadosExtra?.diretorios as Record<string, string>) || {},
      configuracaoIa: {
        diretorio: '/.ia',
        contratoPrincipal: '/.ia/contratos/contrato-projeto.json',
        estadoAtual: '/.ia/estado/estado-atual.json'
      },
      datas: { criacao: hoje, ultimaAtualizacao: hoje }
    };

    const fsService = new FileService(caminhoRaiz);
    const fluxo = new FluxoService(fsService, new AuditoriaService(fsService));
    const checklistResult = fluxo.validarChecklist();
    if (checklistResult.sucesso && checklistResult.dados) {
      const pendentes = fluxo.obterPendentes(checklistResult.dados);
      if (pendentes.length > 0) {
        return { sucesso: false, erro: `Checklist de fluxo pendente: ${pendentes.join('; ')}`, codigoErro: 'FLOW_CHECKLIST_PENDING' };
      }
    }

    fsService.escreverJson(
      path.win32.join('.ia', 'configuracao', 'projeto.json'),
      config,
      { backup: true }
    );

    const registro: ProjetoRegistro = {
      id,
      nome,
      caminhoRaiz,
      ativo: true,
      ultimaAbertura: new Date().toISOString()
    };
    this.registro = registrarProjeto(this.registro, registro);
    this.registro.projetoAtual = id;
    saveRegistroProjetos(this.registro);
    console.log('[ProjetoService.criarProjeto] SUCESSO - id=' + id + ' | nome=' + nome + ' | caminhoRaiz=' + caminhoRaiz);

    fsService.escreverJson(
      path.win32.join('.ia', 'auditoria', 'eventos.json'),
      { eventos: [{ id: uuid(), tipo: 'PROJETO_CRIADO', origem: 'gerenciador', agenteId: null, usuarioId: 'proprietario', tarefaId: null, descricao: `Projeto '${nome}' criado.`, dados: { caminhoRaiz }, resultado: 'sucesso', data: new Date().toISOString() }] }
    );

    return { sucesso: true, dados: caminhoRaiz };
  }

  abrirProjeto(caminhoOuId: string): ResultadoOperacao<ProjetoAberto> {
    let caminhoRaiz = caminhoOuId;
    if (!caminhoOuId.includes(path.win32.sep) && !caminhoOuId.includes('/')) {
      console.log('[ProjetoService.abrirProjeto] lookup by ID:', caminhoOuId);
      const proj = this.registro.projetos.find((p) => p.id === caminhoOuId);
      if (!proj) {
        console.error('[ProjetoService.abrirProjeto] PROJETO NAO ENCONTRADO no registro:', caminhoOuId);
        return { sucesso: false, erro: 'Projeto não encontrado no registro', codigoErro: 'PROJECT_NOT_FOUND' };
      }
      console.log('[ProjetoService.abrirProjeto] encontrado - caminhoRaiz=' + proj.caminhoRaiz);
      caminhoRaiz = proj.caminhoRaiz;
    }

    if (!fs.existsSync(path.win32.join(caminhoRaiz, '.ia'))) {
      return { sucesso: false, erro: 'Diretório .ia/ não encontrado — não é um projeto gerenciado', codigoErro: 'IA_NOT_FOUND' };
    }

    try {
      const fileService = new FileService(caminhoRaiz);
      const auditoria = new AuditoriaService(fileService);

      const configResult = fileService.lerJson<ProjetoConfig>(
        path.win32.join('.ia', 'configuracao', 'projeto.json')
      );
      if (!configResult.sucesso || !configResult.dados) {
        return { sucesso: false, erro: 'Não foi possível ler a configuração do projeto', codigoErro: 'CONFIG_READ_ERROR' };
      }

      const config = configResult.dados;
      console.log('[ProjetoService.abrirProjeto] Config lida:', config.id, config.nome);

      const fluxo = new FluxoService(fileService, auditoria);
      const checklistResult = fluxo.validarChecklist();
      if (checklistResult.sucesso && checklistResult.dados) {
        const pendentes = fluxo.obterPendentes(checklistResult.dados);
        if (pendentes.length > 0) {
          return { sucesso: false, erro: `Checklist de fluxo pendente: ${pendentes.join('; ')}`, codigoErro: 'FLOW_CHECKLIST_PENDING' };
        }
      }

      const projeto: ProjetoAberto = {
        id: config.id,
        nome: config.nome,
        caminhoRaiz,
        fileService,
        auditoria,
        validator: this.validator,
        config,
        dependencia: new DependenciaService(fileService, auditoria, this.validator),
        fluxo,
        monitoramento: new MonitoramentoService(fileService, auditoria, this.validator),
        kiloDiscovery: new KiloDiscoveryService(fileService, auditoria, caminhoRaiz),
        kiloReconciliation: new KiloReconciliationService(fileService, auditoria, this.validator, caminhoRaiz)
      };
      console.log('[ProjetoService.abrirProjeto] ProjetoAberto criado - id:', projeto.id, 'nome:', projeto.nome, 'caminho:', projeto.caminhoRaiz);

      this.projetosAbertos.set(config.id, projeto);
      this.registro = registrarProjeto(this.registro, { id: config.id, nome: config.nome, caminhoRaiz, ativo: true, ultimaAbertura: new Date().toISOString() });
      this.registro.projetoAtual = config.id;
      saveRegistroProjetos(this.registro);

      auditoria.registrar('PROJETO_ABERTO', `Projeto '${config.nome}' aberto.`, { caminhoRaiz });

      projeto.kiloReconciliation.reconciliar().then(async (reconciliacao) => {
        if (reconciliacao.sucesso && reconciliacao.dados) {
          const kiloStateResult = await projeto.kiloDiscovery.obterEstadoKilo();
          if (kiloStateResult.sucesso && kiloStateResult.dados) {
            projeto.monitoramento.registrarKiloState(kiloStateResult.dados).catch((err) => {
              console.warn('[ProjetoService][KILO] Falha ao registrar estado Kilo:', err?.message || err);
            });
          }
        }
      }).catch((err) => {
        console.warn('[ProjetoService][KILO] Falha na reconciliação automática:', err?.message || err);
      });

      return { sucesso: true, dados: projeto };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[ProjetoService.abrirProjeto] ERRO INTERNO:', err.message);
      console.error('[ProjetoService.abrirProjeto] Stack:', err.stack);
      return { sucesso: false, erro: 'Erro interno ao abrir projeto: ' + err.message, codigoErro: 'INTERNAL_ERROR' };
    }
  }

  fecharProjeto(id: string): ResultadoOperacao<boolean> {
    const projeto = this.projetosAbertos.get(id);
    if (!projeto) {
      return { sucesso: false, erro: 'Projeto não está aberto', codigoErro: 'NOT_OPEN' };
    }
    this.projetosAbertos.delete(id);
    return { sucesso: true, dados: true };
  }

  getProjetoCached(id: string): ProjetoAberto | undefined {
    return this.projetosAbertos.get(id);
  }

  removerProjeto(id: string): ResultadoOperacao<boolean> {
    const idx = this.registro.projetos.findIndex((p) => p.id === id);
    if (idx < 0) {
      return { sucesso: false, erro: 'Projeto não encontrado', codigoErro: 'NOT_FOUND' };
    }
    const proj = this.registro.projetos[idx];
    if (fs.existsSync(proj.caminhoRaiz)) {
      fs.rmSync(proj.caminhoRaiz, { recursive: true, force: true });
    }
    this.registro = removerProjetoDoRegistro(this.registro, id);
    saveRegistroProjetos(this.registro);

    // Close if open
    this.projetosAbertos.delete(id);
    if (this.registro.projetoAtual === id) {
      this.registro.projetoAtual = null;
    }

    return { sucesso: true, dados: true };
  }

  atualizarConfiguracao(id: string, config: ProjetoConfig): ResultadoOperacao<ProjetoConfig> {
    const projeto = this.getProjetoCached(id);
    if (!projeto) {
      return { sucesso: false, erro: 'Projeto não está aberto', codigoErro: 'NOT_OPEN' };
    }
    projeto.config = config;
    const result = projeto.fileService.escreverJson(
      path.win32.join('.ia', 'configuracao', 'projeto.json'),
      config,
      { backup: true }
    );
    if (!result.sucesso) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    const validacao = this.validator.validar('projeto', config);
    if (!validacao.valido) {
      return { sucesso: false, erro: `Validação: ${validacao.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }
    projeto.auditoria.registrar('ARQUIVO_ALTERADO', 'Configuração do projeto atualizada.', { tarefaId: null, agenteId: 'proprietario' });
    return { sucesso: true, dados: config };
  }
}

