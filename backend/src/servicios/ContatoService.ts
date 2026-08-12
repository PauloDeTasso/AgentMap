import { FileService } from '../arquivos/FileService';
import { AuditoriaService } from './AuditoriaService';
import { SchemaValidator } from '../validacao/SchemaValidator';
import { ResultadoOperacao } from '../tipos';
import { ProjetoAberto } from '../servicios/ProjetoService';

export interface Contato {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  criadoEm: string;
  atualizadoEm: string;
}

export class ContatoService {
  private fileService: FileService;
  private auditoria: AuditoriaService;
  private validator: SchemaValidator;
  private projeto: ProjetoAberto;

  constructor(fileService: FileService, auditoria: AuditoriaService, validator: SchemaValidator, projeto: ProjetoAberto) {
    this.fileService = fileService;
    this.auditoria = auditoria;
    this.validator = validator;
    this.projeto = projeto;
  }

  async listar(): Promise<ResultadoOperacao<Contato[]>> {
    const caminho = '.ia/dados/contatos.json';
    const resultado = await this.fileService.lerJson<{ contatos: Contato[] }>(caminho);
    if (!resultado.sucesso || !resultado.dados) {
      return { sucesso: true, dados: [] };
    }
    return { sucesso: true, dados: resultado.dados.contatos || [] };
  }

  async obter(id: string): Promise<ResultadoOperacao<Contato>> {
    const contatos = await this.listar();
    if (!contatos.sucesso || !contatos.dados) {
      return { sucesso: false, erro: 'Contato não encontrado', codigoErro: 'NOT_FOUND' };
    }
    const contato = contatos.dados.find((c) => c.id === id);
    if (!contato) {
      return { sucesso: false, erro: 'Contato não encontrado', codigoErro: 'NOT_FOUND' };
    }
    return { sucesso: true, dados: contato };
  }

  async criar(dados: Partial<Contato>): Promise<ResultadoOperacao<Contato>> {
    const validacao = this.validator.validar('contato', dados);
    if (!validacao.valido) {
      return { sucesso: false, erro: `Validação: ${validacao.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    const contatosResult = await this.listar();
    if (!contatosResult.sucesso || !contatosResult.dados) {
      return { sucesso: false, erro: 'Erro ao acessar contatos', codigoErro: 'STORAGE_ERROR' };
    }

    const emailNormalizado = (dados.email || '').toLowerCase().trim();
    const duplicado = contatosResult.dados.find((c) => c.email.toLowerCase() === emailNormalizado);
    if (duplicado) {
      return { sucesso: false, erro: 'Email já cadastrado', codigoErro: 'DUPLICATE_EMAIL' };
    }

    const agora = new Date().toISOString();
    const contato: Contato = {
      id: crypto.randomUUID(),
      nome: String(dados.nome || '').trim(),
      email: emailNormalizado,
      telefone: String(dados.telefone || '').trim(),
      criadoEm: agora,
      atualizadoEm: agora,
    };

    const atualizados = [...contatosResult.dados, contato];
    const salvou = await this.fileService.escreverJson('.ia/dados/contatos.json', { contatos: atualizados }, { backup: true });
    if (!salvou.sucesso) {
      return { sucesso: false, erro: salvou.erro || 'Erro ao salvar contato', codigoErro: salvou.codigoErro || 'STORAGE_ERROR' };
    }

    this.auditoria.registrar('CONTATO_CRIADO', `Contato ${contato.id} criado`, { contatoId: contato.id, email: contato.email });
    return { sucesso: true, dados: contato };
  }

  async atualizar(id: string, dados: Partial<Contato>): Promise<ResultadoOperacao<Contato>> {
    const existenteResult = await this.obter(id);
    if (!existenteResult.sucesso || !existenteResult.dados) {
      return existenteResult;
    }

    const atualizado: Contato = {
      ...existenteResult.dados,
      ...dados,
      id: existenteResult.dados.id,
      atualizadoEm: new Date().toISOString(),
    };

    if (dados.email) {
      atualizado.email = dados.email.toLowerCase().trim();
    }

    const validacao = this.validator.validar('contato', atualizado);
    if (!validacao.valido) {
      return { sucesso: false, erro: `Validação: ${validacao.erros?.join(', ')}`, codigoErro: 'VALIDATION_ERROR' };
    }

    const contatosResult = await this.listar();
    if (!contatosResult.sucesso || !contatosResult.dados) {
      return { sucesso: false, erro: 'Erro ao acessar contatos', codigoErro: 'STORAGE_ERROR' };
    }

    const emailNormalizado = atualizado.email;
    const duplicado = contatosResult.dados.find((c) => c.id !== id && c.email.toLowerCase() === emailNormalizado);
    if (duplicado) {
      return { sucesso: false, erro: 'Email já cadastrado', codigoErro: 'DUPLICATE_EMAIL' };
    }

    const atualizados = contatosResult.dados.map((c) => (c.id === id ? atualizado : c));
    const salvou = await this.fileService.escreverJson('.ia/dados/contatos.json', { contatos: atualizados }, { backup: true });
    if (!salvou.sucesso) {
      return { sucesso: false, erro: salvou.erro || 'Erro ao atualizar contato', codigoErro: salvou.codigoErro || 'STORAGE_ERROR' };
    }

    this.auditoria.registrar('CONTATO_ATUALIZADO', `Contato ${id} atualizado`, { contatoId: id });
    return { sucesso: true, dados: atualizado };
  }

  async excluir(id: string): Promise<ResultadoOperacao<null>> {
    const existenteResult = await this.obter(id);
    if (!existenteResult.sucesso || !existenteResult.dados) {
      return { sucesso: false, erro: 'Contato não encontrado', codigoErro: 'NOT_FOUND' };
    }

    const contatosResult = await this.listar();
    if (!contatosResult.sucesso || !contatosResult.dados) {
      return { sucesso: false, erro: 'Erro ao acessar contatos', codigoErro: 'STORAGE_ERROR' };
    }

    const atualizados = contatosResult.dados.filter((c) => c.id !== id);
    const salvou = await this.fileService.escreverJson('.ia/dados/contatos.json', { contatos: atualizados }, { backup: true });
    if (!salvou.sucesso) {
      return { sucesso: false, erro: salvou.erro || 'Erro ao excluir contato', codigoErro: salvou.codigoErro || 'STORAGE_ERROR' };
    }

    this.auditoria.registrar('CONTATO_EXCLUIDO', `Contato ${id} excluído`, { contatoId: id });
    return { sucesso: true, dados: null };
  }
}
