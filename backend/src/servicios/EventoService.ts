import { ResultadoOperacao } from '../tipos';

export class EventoService {
  constructor(private fs: any, private auditoria: any, private validator: any) {}

  registrar(dados: any): ResultadoOperacao<void> {
    return { sucesso: true };
  }

  listar(filtros: any): ResultadoOperacao<any[]> {
    return { sucesso: true, dados: [] };
  }
}
