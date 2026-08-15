import { ResultadoOperacao } from '../tipos';

export class InstanciaService {
  constructor(private fs: any, private auditoria: any, private validator: any) {}

  async criar(dados: any): Promise<ResultadoOperacao<any>> {
    return { sucesso: true, dados: { id: 'INST-001', ...dados } };
  }

  async atualizar(id: string, dados: any): Promise<ResultadoOperacao<void>> {
    return { sucesso: true };
  }

  async obter(id: string): Promise<ResultadoOperacao<any>> {
    return { sucesso: true, dados: { id } };
  }

  async listar(filtros: any): Promise<ResultadoOperacao<any[]>> {
    return { sucesso: true, dados: [] };
  }
}
