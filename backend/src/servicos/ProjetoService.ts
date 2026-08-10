import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { FileService } from '../arquivos/FileService';
import { ScaffoldService } from '../arquivos/ScaffoldService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { DependenciaService } from './DependenciaService';
import {
  ProjetoConfig,
  ProjetoRegistro,
  RegistroProjetos,
  ResultadoOperacao
} from '../tipos';
import {
  loadRegistroProjetos,
  saveRegistroProjetos,
  registrarProjeto,
  removerProjetoDoRegistro
} from '../config';

export interface ProjetoAberto {
  id: string;
  nome: string;
  caminhoRaiz: string;
  fileService: FileService;
  auditoria: AuditoriaService;
  validator: SchemaValidator;
  config: ProjetoConfig;
  dependencia: DependenciaService;
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

  getProjetoAtual(): ResultadoOperacao<ProjetoAberto | null> {
    if (!this.registro.projetoAtual) {
      return { sucesso: true, dados: null };
    }
    const projeto = this.abrirProjeto(this.registro.projetoAtual);
    return projeto;
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

    const fsService = new FileService(caminhoRaiz);
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
    const projeto: ProjetoAberto = {
      id: config.id,
      nome: config.nome,
      caminhoRaiz,
      fileService,
      auditoria,
      validator: this.validator,
      config,
      dependencia: new DependenciaService(fileService, auditoria, this.validator)
    };
    console.log('[ProjetoService.abrirProjeto] ProjetoAberto criado - id:', projeto.id, 'nome:', projeto.nome, 'caminho:', projeto.caminhoRaiz);

    this.projetosAbertos.set(config.id, projeto);
    this.registro = registrarProjeto(this.registro, { id: config.id, nome: config.nome, caminhoRaiz, ativo: true, ultimaAbertura: new Date().toISOString() });
    this.registro.projetoAtual = config.id;
    saveRegistroProjetos(this.registro);

    auditoria.registrar('PROJETO_ABERTO', `Projeto '${config.nome}' aberto.`, { caminhoRaiz });

    return { sucesso: true, dados: projeto };
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
