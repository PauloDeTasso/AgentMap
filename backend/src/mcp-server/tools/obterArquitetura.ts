import { mcpServer, projetoService } from '../server';
import { carregarContexto } from '../contexto';
import { SchemaObterArquitetura } from '../schemas/validacao';
import { mapearArquitetura } from '../mapper/mapeadores';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import { PathValidator, createPathValidator, DEFAULT_PATH_VALIDATOR_OPTIONS } from '../security/pathValidator';
import { registerTracedTool } from '../../observability/tool-tracing';
import { toMcpStructured, mcpError } from '../utils/helpers';
import * as path from 'path';

registerTracedTool(mcpServer, 'agentmap_obter_arquitetura', {
  description:
      'Retorna informações de arquitetura do projeto: arquiteturas definidas, padrões, tecnologias, diretórios, estado atual e estado do Git.',
    inputSchema: SchemaObterArquitetura,
  },
  async () => {
    const ctx = carregarContexto(projetoService);
    if (!ctx.sucesso || !ctx.dados) {
      return mcpError(ctx);
    }

    const { projeto } = ctx.dados;
    const auditoria = createMcpAuditoria(projeto.auditoria);
    const pathValidator = createPathValidator(projeto.caminhoRaiz, DEFAULT_PATH_VALIDATOR_OPTIONS);

    const estadoPath = path.posix.join('.ia', 'estado', 'estado-atual.json');
    const estadoGitPath = path.posix.join('.ia', 'git', 'estado-git.json');
    const estadoValidated = pathValidator.validate(estadoPath);
    const estadoGitValidated = pathValidator.validate(estadoGitPath);
    const estadoResult = projeto.fileService.lerJson<unknown>(estadoValidated.caminhoRelativo);
    const estadoGitResult = projeto.fileService.lerJson<unknown>(estadoGitValidated.caminhoRelativo);

    const dados = mapearArquitetura(
      projeto.config as any,
      estadoResult.sucesso && estadoResult.dados ? estadoResult.dados : null,
      estadoGitResult.sucesso && estadoGitResult.dados ? estadoGitResult.dados : null
    );

    auditoria.registrarToolCall('agentmap_obter_arquitetura', projeto, {}, { sucesso: true, dados });
    return toMcpStructured(dados);
  }
);