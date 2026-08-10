import { FileService } from './FileService';

export class IdGenerator {
  constructor(private fs: FileService) {}

  gerarId(prefixo: string, caminhoRegistro: string, chaveArray: string): string {
    const ano = new Date().getFullYear().toString();
    const result = this.fs.lerJson<Record<string, any[]>>(caminhoRegistro);
    if (!result.sucesso || !result.dados) {
      return `${prefixo}-${ano}-00001`;
    }
    const arr = result.dados[chaveArray] || [];
    const maxSeq = arr
      .map((item: any) => {
        const partes = item.id.split('-');
        if (partes.length >= 3 && partes[0] === prefixo && partes[1] === ano) {
          const seq = parseInt(partes[2] || '0', 10);
          return isNaN(seq) ? 0 : seq;
        }
        return 0;
      })
      .reduce((max: number, n: number) => Math.max(max, n), 0);
    return `${prefixo}-${ano}-${String(maxSeq + 1).padStart(5, '0')}`;
  }
}
