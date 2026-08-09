import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { FileService } from '../src/arquivos/FileService';

describe('FileService', () => {
  const projectRoot = path.join(os.tmpdir(), 'agentmap-fs-test-' + Date.now());
  fs.mkdirSync(projectRoot, { recursive: true });
  const svc = new FileService(projectRoot);

  afterAll(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  test('cria e lê arquivos', () => {
    const writeResult = svc.escrever('teste/arquivo.txt', 'olá mundo');
    expect(writeResult.sucesso).toBe(true);

    const readResult = svc.ler('teste/arquivo.txt');
    expect(readResult.sucesso).toBe(true);
    expect(readResult.dados).toBe('olá mundo');
  });

  test('bloqueia path traversal', () => {
    const result = svc.ler('../../../etc/passwd');
    expect(result.sucesso).toBe(false);
    expect(result.codigoErro).toBe('PATH_TRAVERSAL');
  });

  test('cria e lê JSON', () => {
    const dados = { nome: 'teste', ativo: true };
    const writeResult = svc.escreverJson('teste/config.json', dados);
    expect(writeResult.sucesso).toBe(true);

    const readResult = svc.lerJson<typeof dados>('teste/config.json');
    expect(readResult.sucesso).toBe(true);
    expect(readResult.dados).toEqual(dados);
  });

  test('lista diretório', () => {
    svc.escrever('dir1/file.txt', 'conteúdo');
    const result = svc.listar('dir1');
    expect(result.sucesso).toBe(true);
    expect(result.dados).toHaveLength(1);
    expect(result.dados![0].nome).toBe('file.txt');
    expect(result.dados![0].tipo).toBe('arquivo');
  });

  test('cria diretório', () => {
    const result = svc.criarDiretorio('nova/pasta/aninhada');
    expect(result.sucesso).toBe(true);
  });

  test('exclui arquivo com backup', () => {
    svc.escrever('para_excluir.txt', 'conteúdo');
    const result = svc.excluir('para_excluir.txt', { backup: true });
    expect(result.sucesso).toBe(true);
    expect(svc.existe('.ia/.backups')).toBe(true);
  });

  test('verifica existência', () => {
    svc.escrever('existe.txt', 'teste');
    expect(svc.existe('existe.txt')).toBe(true);
    expect(svc.existe('nao_existe.txt')).toBe(false);
  });

  test('retorna erro para arquivo inexistente', () => {
    const result = svc.ler('nao_existe.txt');
    expect(result.sucesso).toBe(false);
    expect(result.codigoErro).toBe('FILE_NOT_FOUND');
  });
});
