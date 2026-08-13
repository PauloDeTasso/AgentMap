import { mcpServer, toMcpResult, toMcpData, projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { SchemaObterArquitetura } from '../schemas/validacao';
import { mapearArquitetura } from '../mapper/mapeadores';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import * as path from 'path';

mcpServer.registerTool(
  'agentmap_obter_arquitetura',
  {
    description:
      'Retorna informações de arquitetura do projeto: arquiteturas definidas, padrões, tecnologias, diretórios, estado atual e estado do Git.',
    inputSchema: SchemaObterArquitetura,
  },
  async () => {
    const ctx = carregarContexto(projetoService);
    if (!ctx.sucesso || !ctx.dados) {
      return toMcpResult(ctx);
    }

    const { projeto } = ctx.dados;
    const auditoria = createMcpAuditoria(projeto.auditoria);

    const estadoResult = projeto.fileService.lerJson<unknown>(
      path.win32.join('.ia', 'estado', 'estado-atual.json')
    );
    const estadoGitResult = projeto.fileService.lerJson<unknown>(
      path.win32.join('.ia', 'git', 'estado-git.json')
    );

    const dados = mapearArquitetura(
      projeto.config as any,
      estadoResult.sucesso && estadoResult.dados ? estadoResult.dados : null,
      estadoGitResult.sucesso && estadoGitResult.dados ? estadoGitResult.dados : null
    );

    auditoria.registrarToolCall('agentmap_obter_arquitetura', projeto, {}, { sucesso: true, dados });
    return toMcpData(dados);
  }
);