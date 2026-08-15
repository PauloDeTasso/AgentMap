import * as path from 'path';
import * as fs from 'fs';
import { SchemaValidator } from '../src/validacao/SchemaValidator';
import { ProjetoService } from '../src/servicios/ProjetoService';
import { AuditoriaService } from '../src/servicios';
import { FileService } from '../src/arquivos/FileService';
import { McpAuditoria, executarSanidade, gerarRelatorioSanidade } from '../src/mcp-server/audit/auditoria';
import '../src/mcp-server/tools';

async function main() {
  const esquemasPath = path.resolve(__dirname, '..', '..', '..', 'esquemas');
  const validator = new SchemaValidator(esquemasPath);
  const projetoService = new ProjetoService(validator);

  const auditoriaDummy = new AuditoriaService(new FileService(process.cwd()));
  const mcpAuditoria = new McpAuditoria(auditoriaDummy);

  console.log('Executando sanidade de tools MCP...');
  const resultados = await mcpAuditoria.executarSanidade(projetoService);

  const relatorioPath = path.resolve(process.cwd(), '..', '.ia', 'contexto', 'auditoria-tools-2026-08-15.json');
  gerarRelatorioSanidade(resultados, relatorioPath);

  const sucesso = resultados.filter((r) => r.sucesso).length;
  const falha = resultados.filter((r) => !r.sucesso).length;
  console.log(`Sanidade concluída: ${sucesso} sucesso, ${falha} falha de ${resultados.length} tools.`);
  console.log(`Relatório salvo em: ${relatorioPath}`);

  if (falha > 0) {
    console.log('Tools com falha:');
    for (const r of resultados.filter((r) => !r.sucesso)) {
      console.log(`  - ${r.toolName}: ${r.mensagem || r.codigoErro}`);
    }
  }

  process.exit(falha > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Erro na auditoria de tools:', error);
  process.exit(1);
});
