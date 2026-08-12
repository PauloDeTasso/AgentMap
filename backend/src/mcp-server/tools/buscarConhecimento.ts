import { mcpServer, toMcpResult, toMcpData, projetoService, getMcpConfig } from '../server';
import { carregarContexto } from '../contexto';
import { SchemaBuscarConhecimento } from '../schemas/validacao';
import { PathValidator, createPathValidator, DEFAULT_PROJECT_OPTIONS } from '../security/pathValidator';
import { McpAuditoria, createMcpAuditoria } from '../audit/auditoria';
import * as path from 'path';

interface ConhecimentoHit {
  fonte: string;
  categoria: string;
  titulo: string;
  conteudo: string;
  relevancia: number;
}

mcpServer.registerTool(
  'agentmap_buscar_conhecimento',
  {
    description:
      'Busca termos na base de conhecimento do projeto (.ia/conhecimento, conhecimentos de agentes, procedimentos, decisões, documentação).',
    inputSchema: SchemaBuscarConhecimento,
  },
  async (args) => {
    const { termo, limite, incluirProjetos } = args as {
      termo: string;
      limite?: number;
      incluirProjetos?: boolean;
    };

    const ctx = carregarContexto(projetoService);
    if (!ctx.sucesso || !ctx.dados) {
      return toMcpResult(ctx);
    }

    const { projeto } = ctx.dados;
    const auditoria = createMcpAuditoria(projeto.auditoria);
    const config = getMcpConfig();
    const searchLimite = limite || config.limites.maxSearchResults;
    const termoLower = (termo || '').toLowerCase();
    const pathValidator = createPathValidator(projeto.caminhoRaiz, DEFAULT_PROJECT_OPTIONS);

    if (!termoLower || termoLower.length < 2) {
      const result = { sucesso: false, erro: 'termo deve ter pelo menos 2 caracteres', codigoErro: 'INVALID_INPUT' };
      auditoria.registrarToolCall('agentmap_buscar_conhecimento', projeto, { termo, limite, incluirProjetos }, result);
      return toMcpResult(result);
    }

    const hits: ConhecimentoHit[] = [];

    function processarTexto(conteudo: string, fonte: string, categoria: string, titulo: string) {
      const lines = conteudo.split('\n');
      for (let i = 0; i < lines.length && hits.length < searchLimite; i++) {
        if (lines[i].toLowerCase().includes(termoLower)) {
          hits.push({
            fonte,
            categoria,
            titulo,
            conteudo: lines[i].trim().slice(0, 500),
            relevancia: 5,
          });
        }
      }
    }

    try {
      const conhecimentoPath = path.posix.join('.ia', 'conhecimento', 'conhecimento.json');
      const conhecimentoValidated = pathValidator.validate(conhecimentoPath);
      const conhecimentoResult = projeto.fileService.lerJson<{ conhecimento: any[] }>(conhecimentoValidated.caminhoRelativo);
      if (conhecimentoResult.sucesso && conhecimentoResult.dados) {
        for (const item of conhecimentoResult.dados.conhecimento) {
          const titulo = item.titulo || item.nome || 'item-conhecimento';
          const conteudo = item.descricao || item.conteudo || JSON.stringify(item);
          if (conteudo.toLowerCase().includes(termoLower)) {
            hits.push({
              fonte: '.ia/conhecimento/conhecimento.json',
              categoria: 'conhecimento',
              titulo,
              conteudo: conteudo.slice(0, 2000),
              relevancia: 10,
            });
          }
        }
      }

      const agentesDirPath = path.posix.join('.ia', 'agentes');
      const agentesDirValidated = pathValidator.validate(agentesDirPath);
      const agentesDirResult = projeto.fileService.listar(agentesDirValidated.caminhoRelativo);
      if (agentesDirResult.sucesso && agentesDirResult.dados) {
        for (const entry of agentesDirResult.dados) {
          if (entry.tipo === 'diretorio') {
            const conhecimentoDir = path.posix.join('.ia', 'agentes', entry.nome, 'conhecimento');
            if (projeto.fileService.existe(conhecimentoDir)) {
              const listResult = projeto.fileService.listar(conhecimentoDir);
              if (listResult.sucesso && listResult.dados) {
                for (const ckEntry of listResult.dados) {
                  if (ckEntry.tipo === 'arquivo') {
                    const relPath = path.posix.join(conhecimentoDir, ckEntry.nome);
                    const readResult = projeto.fileService.ler(relPath);
                    if (readResult.sucesso && readResult.dados) {
                      processarTexto(readResult.dados, relPath, 'conhecimento-agente', `${entry.nome} - ${ckEntry.nome}`);
                    }
                  }
                }
              }
            }
          }
        }
      }

      const procedimentosPath = path.posix.join('.ia', 'procedimentos', 'procedimentos.json');
      const procedimentosValidated = pathValidator.validate(procedimentosPath);
      const procedimentosResult = projeto.fileService.lerJson<{ procedimentos: any[] }>(procedimentosValidated.caminhoRelativo);
      if (procedimentosResult.sucesso && procedimentosResult.dados) {
        for (const proc of procedimentosResult.dados.procedimentos) {
          const titulo = proc.nome || proc.id || 'procedimento';
          const conteudo = proc.descricao || JSON.stringify(proc.etapas || proc);
          if (conteudo.toLowerCase().includes(termoLower)) {
            hits.push({
              fonte: '.ia/procedimentos/procedimentos.json',
              categoria: 'procedimento',
              titulo,
              conteudo: conteudo.slice(0, 2000),
              relevancia: 5,
            });
          }
        }
      }

      const decisoesPath = path.posix.join('.ia', 'decisoes', 'decisoes.json');
      const decisoesValidated = pathValidator.validate(decisoesPath);
      const decisoesResult = projeto.fileService.lerJson<{ decisoes: any[] }>(decisoesValidated.caminhoRelativo);
      if (decisoesResult.sucesso && decisoesResult.dados) {
        for (const dec of decisoesResult.dados.decisoes) {
          const titulo = dec.titulo || dec.id || 'decisão';
          const conteudo = `${dec.problema || ''}\n${dec.decisao || ''}\n${(dec.justificativa || '')}`;
          if (conteudo.toLowerCase().includes(termoLower)) {
            hits.push({
              fonte: '.ia/decisoes/decisoes.json',
              categoria: 'decisao',
              titulo,
              conteudo: conteudo.slice(0, 2000),
              relevancia: 8,
            });
          }
        }
      }

      const docsDir = path.win32.join('docs');
      if (projeto.fileService.existe(docsDir)) {
        const listResult = projeto.fileService.listar(docsDir);
        if (listResult.sucesso && listResult.dados) {
          for (const entry of listResult.dados) {
            if (entry.tipo === 'arquivo' && (entry.extensao === 'md' || entry.extensao === 'txt')) {
              const relPath = path.posix.join(docsDir, entry.nome);
              const readResult = projeto.fileService.ler(relPath);
              if (readResult.sucesso && readResult.dados) {
                processarTexto(readResult.dados, relPath, 'documentacao', entry.nome);
              }
            }
          }
        }
      }

      if (incluirProjetos) {
        for (const dirName of ['frontend', 'backend']) {
          const dirPath = path.win32.join(dirName);
          if (projeto.fileService.existe(dirPath)) {
            const listResult = projeto.fileService.listar(dirPath);
            if (listResult.sucesso && listResult.dados) {
              for (const entry of listResult.dados) {
                if (entry.tipo === 'arquivo' && entry.extensao === 'md') {
                  const relPath = path.posix.join(dirPath, entry.nome);
                  const readResult = projeto.fileService.ler(relPath);
                  if (readResult.sucesso && readResult.dados) {
                    processarTexto(readResult.dados, relPath, 'projeto-md', entry.nome);
                  }
                }
              }
            }
          }
        }
      }

      hits.sort((a, b) => b.relevancia - a.relevancia);

      const dados = {
        termo: termo,
        totalResultados: hits.length,
        resultados: hits.slice(0, searchLimite),
      };

      auditoria.registrarToolCall('agentmap_buscar_conhecimento', projeto, { termo, limite, incluirProjetos }, { sucesso: true, dados });
      return toMcpData(dados);
    } catch (e: any) {
      const result = { sucesso: false, erro: e.message || 'Erro ao buscar conhecimento', codigoErro: 'PATH_TRAVERSAL' };
      auditoria.registrarToolCall('agentmap_buscar_conhecimento', projeto, { termo, limite, incluirProjetos }, result);
      return toMcpResult(result);
    }
  }
);
