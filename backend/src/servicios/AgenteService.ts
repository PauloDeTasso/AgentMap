import * as path from 'path';
import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { AgenteRegistro, AgentesRegistry, AgentePerfil, ResultadoOperacao, Permissoes, EstadoEntidade } from '../tipos';

export class AgenteService {
  constructor(
    private fs: FileService,
    private auditoria: AuditoriaService,
    private validator: SchemaValidator
  ) {}

  listar(): ResultadoOperacao<AgenteRegistro[]> {
    const result = this.fs.lerJson<AgentesRegistry>(
      path.win32.join('.ia', 'agentes', 'agentes.json')
    );
    if (!result.sucesso || !result.dados) {
      console.error('[AgenteService.listar] erro ao ler agentes.json:', result.erro);
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    console.log('[AgenteService.listar] agentes encontrados:', result.dados.agentes.length);
    return { sucesso: true, dados: result.dados.agentes };
  }

  obter(id: string): ResultadoOperacao<AgentePerfil & { registro: AgenteRegistro }> {
    console.log('[AgenteService.obter] buscando agente:', id);
    const listaResult = this.listar();
    if (!listaResult.sucesso || !listaResult.dados) {
      return { sucesso: false, erro: listaResult.erro, codigoErro: listaResult.codigoErro };
    }
    const registro = listaResult.dados.find((a) => a.id === id);
    if (!registro) {
      console.error('[AgenteService.obter] agente não encontrado:', id, '| agentes disponíveis:', listaResult.dados.map((a) => a.id));
      return { sucesso: false, erro: 'Agente não encontrado', codigoErro: 'AGENT_NOT_FOUND' };
    }
    const perfilResult = this.fs.lerJson<AgentePerfil>(registro.arquivoPerfil.replace(/^\.ia\//, ''));
    if (!perfilResult.sucesso || !perfilResult.dados) {
      console.error('[AgenteService.obter] erro ao ler perfil:', perfilResult.erro);
      return { sucesso: false, erro: 'Não foi possível ler o perfil do agente', codigoErro: 'PROFILE_READ_ERROR' };
    }
    console.log('[AgenteService.obter] agente encontrado:', id, '| arquivoPerfil:', registro.arquivoPerfil);
    return { sucesso: true, dados: { ...perfilResult.dados, registro } };
  }

  async criar(perfil: Omit<AgentePerfil, 'datas'> & { permissoes: Permissoes; linguagemPreferida?: string; modelo?: AgentePerfil['modelo'] }): Promise<ResultadoOperacao<AgentePerfil>> {
    const validation = this.validator.validar('agente-perfil', perfil);
    if (!validation.valido) {
      return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    const hoje = new Date().toISOString();
    const fullPerfil: AgentePerfil = {
      ...perfil,
      datas: { criacao: hoje, ultimaAtualizacao: hoje }
    };

    const agenteDir = path.win32.join('.ia', 'agentes', perfil.id);
    const subpasta = perfil.id;
    this.fs.criarDiretorio(path.win32.join(agenteDir, 'conhecimento'));
    this.fs.criarDiretorio(path.win32.join(agenteDir, 'recursos'));

    const profileResult = this.fs.escreverJson(
      path.win32.join('.ia', 'agentes', subpasta, `${subpasta}.json`),
      fullPerfil
    );
    if (!profileResult.sucesso) {
      return { sucesso: false, erro: profileResult.erro, codigoErro: profileResult.codigoErro };
    }

    this.fs.escreverJson(
      path.win32.join('.ia', 'agentes', subpasta, 'habilidades.json'),
      { id: `${perfil.id}-habilidades`, nome: `Habilidades — ${perfil.nome}`, agenteId: perfil.id, conhecimentos: perfil.conhecimentos || [], ferramentas: perfil.ferramentasPermitidas || [], atualizadoEm: hoje }
    );
    this.fs.escrever(path.win32.join('.ia', 'agentes', subpasta, 'instrucoes.md'), '# Instruções\n\nSubstitua este conteúdo.\n');
    this.fs.escrever(path.win32.join('.ia', 'agentes', subpasta, 'personalidade.md'), '# Personalidade\n\nSubstitua este conteúdo.\n');
    this.fs.escrever(path.win32.join('.ia', 'agentes', subpasta, 'regras.md'), '# Regras\n\nSubstitua este conteúdo.\n');
    this.fs.escrever(path.win32.join('.ia', 'agentes', subpasta, 'contexto.md'), '# Contexto\n\nSubstitua este conteúdo.\n');
    this.fs.escrever(path.win32.join('.ia', 'agentes', subpasta, 'memoria.md'), '# Memória\n\nSubstitua este conteúdo.\n');

    const registryResult = this.listar();
    if (!registryResult.sucesso || !registryResult.dados) {
      return { sucesso: false, erro: 'Não foi possível ler o registro de agentes', codigoErro: 'REGISTRY_READ_ERROR' };
    }
    const agentes = registryResult.dados;
    agentes.push({
      id: perfil.id,
      nome: perfil.nome,
      funcao: perfil.funcao,
      estado: perfil.estado,
      arquivoPerfil: `/.ia/agentes/${subpasta}/${subpasta}.json`
    });
    const regResult = this.fs.escreverJson(
      path.win32.join('.ia', 'agentes', 'agentes.json'),
      { agentes }
    );
    if (!regResult.sucesso) {
      return { sucesso: false, erro: regResult.erro, codigoErro: regResult.codigoErro };
    }

    this.auditoria.registrar('AGENTE_CRIADO', `Agente '${perfil.nome}' criado.`, { agenteId: perfil.id });

    return { sucesso: true, dados: fullPerfil };
  }

  atualizar(id: string, perfil: Partial<AgentePerfil>): ResultadoOperacao<AgentePerfil> {
    const result = this.obter(id);
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    const existente = result.dados;
    const atualizado: AgentePerfil = { ...existente, ...perfil };
    if (atualizado.datas) {
      atualizado.datas.ultimaAtualizacao = new Date().toISOString();
    }

    const validation = this.validator.validar('agente-perfil', atualizado);
    if (!validation.valido) {
      return { sucesso: false, erro: `Validação: ${validation.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    const profilePath = existente.registro.arquivoPerfil.replace(/^\.ia\//, '');
    const writeResult = this.fs.escreverJson(profilePath, atualizado, { backup: true });
    if (!writeResult.sucesso) {
      return { sucesso: false, erro: writeResult.erro, codigoErro: writeResult.codigoErro };
    }

    this.auditoria.registrar('AGENTE_ATUALIZADO', `Agente '${id}' atualizado.`, { agenteId: id });

    return { sucesso: true, dados: atualizado };
  }

   validarDominioArquivo(agenteId: string, caminhoRelativo: string): ResultadoOperacao<boolean> {
    const result = this.obter(agenteId);
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, erro: result.erro, codigoErro: result.codigoErro };
    }
    const perfil = result.dados;
    return { sucesso: true, dados: this.fs.isSafe(caminhoRelativo) };
  }

   excluir(id: string): ResultadoOperacao<boolean> {
    const listResult = this.listar();
    if (!listResult.sucesso || !listResult.dados) {
      return { sucesso: false, erro: listResult.erro, codigoErro: listResult.codigoErro };
    }
    const agentes = listResult.dados;
    const idx = agentes.findIndex((a) => a.id === id);
    if (idx < 0) {
      return { sucesso: false, erro: 'Agente não encontrado', codigoErro: 'AGENT_NOT_FOUND' };
    }
    const registro = agentes[idx];
    const profilePath = registro.arquivoPerfil.replace(/^\.ia\//, '');
    const profileDir = path.win32.dirname(profilePath);
    this.fs.excluir(profileDir, { backup: false });
    agentes.splice(idx, 1);
    this.fs.escreverJson(
      path.win32.join('.ia', 'agentes', 'agentes.json'),
      { agentes }
    );
    this.auditoria.registrar('AGENTE_EXCLUIDO', `Agente '${id}' excluído.`, { agenteId: id });
    return { sucesso: true, dados: true };
  }
 }

