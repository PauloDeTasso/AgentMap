import { Router, Request, Response } from 'express';
import { asyncHandler, responder } from './middleware';
import { AgenteService } from '../servicios/AgenteService';
import { FileService } from '../arquivos/FileService';
import path from 'path';

const DOMINIO_ARQUIVOS_PADRAO: Record<string, string[]> = {
  frontend: [
    'frontend/index.html',
    'frontend/css/style.css',
    'frontend/js/app.js',
    'frontend/js/api.js',
    'frontend/monitoramento.html',
    'frontend/js/monitoramento.js',
    'frontend/css/monitoramento.css'
  ],
  backend: [
    'backend/src/app.ts',
    'backend/src/index.ts',
    'backend/src/api/index.ts',
    'backend/src/servicios/index.ts',
    'backend/src/tipos/index.ts',
    'backend/src/mcp-server/index.ts'
  ],
  banco: [
    'backend/src/api/contratos-validacao.ts',
    'esquemas/',
    'banco/'
  ],
  android: [
    'frontend/android/',
    'android/'
  ],
  docs: [
    'docs/',
    'README.md',
    'PLANO GERAL/'
  ],
  infraestrutura: [
    'backend/src/config.ts',
    'docker-compose.yml',
    'Dockerfile',
    '.github/',
    'kilo.json'
  ],
  testes: [
    'backend/testes/',
    'backend/src/**/*.test.ts',
    'backend/src/**/*.spec.ts'
  ],
  seguranca: [
    'backend/src/api/middleware.ts',
    'backend/src/validacao/',
    'esquemas/'
  ],
  desempenho: [
    'backend/src/servicios/',
    'backend/src/api/'
  ],
  observabilidade: [
    'backend/src/websocket/monitoramento.ts',
    'backend/src/servicios/MonitoramentoService.ts',
    'backend/src/mcp-server/audit/auditoria.ts'
  ],
  revisor: [
    'backend/src/validacao/SchemaValidator.ts',
    'backend/src/servicios/ContractValidatorService.ts',
    'esquemas/'
  ],
  planejador: [
    'PLANO GERAL/',
    '.ia/fluxo-trabalho.md',
    '.ia/procedimentos/'
  ],
  geral: [
    '.ia/',
    'backend/',
    'frontend/'
  ]
};

const FLUXO_PADRAO_PROMPT = [
  '.ia/fluxo-trabalho.md',
  '.ia/procedimentos/preparacao-{papel}.md',
  '.ia/procedimentos/entrega-{papel}.md',
  '.ia/agentes/{id}/{id}.json',
  '.ia/agentes/{id}/instrucoes.md',
  '.ia/agentes/{id}/personalidade.md',
  '.ia/agentes/{id}/regras.md',
  '.ia/agentes/{id}/contexto.md',
  '.ia/agentes/{id}/memoria.md',
  '.ia/agentes/{id}/conhecimento/',
  '.ia/agentes/{id}/recursos/',
  '.ia/contratos/',
  '.ia/tarefas/',
  'AGENTS.md',
  'kilo.json'
];

function resolverFluxoPadrao(papel: string, agenteId: string): string[] {
  return FLUXO_PADRAO_PROMPT.map((p) => {
    return p
      .replace('{papel}', papel)
      .replace('{id}', agenteId);
  });
}

function MontarCaminhosAgente(registro: { id: string; arquivoPerfil: string }) {
  const base = `.ia/agentes/${registro.id}`;
  const profile = registro.arquivoPerfil.replace(/^\.ia\//, '');
  return {
    perfil: profile,
    instrucoes: `${base}/instrucoes.md`,
    personalidade: `${base}/personalidade.md`,
    regras: `${base}/regras.md`,
    contexto: `${base}/contexto.md`,
    memoria: `${base}/memoria.md`,
    conhecimento: `${base}/conhecimento/`,
    recursos: `${base}/recursos/`,
    habilidades: `${base}/habilidades.json`
  };
}

export function criarGerenciadorAgentesRouter(): Router {
  const router = Router();

  router.get('/agentes', asyncHandler(async (req: Request, res: Response) => {
    const agentesResult = await req.servicos!.agente.listar();
    if (!agentesResult.sucesso || !agentesResult.dados) {
      return responder(res, agentesResult);
    }

    const registros = agentesResult.dados;
    const perfis = await Promise.all(
      registros.map((r) => req.servicos!.agente.obter(r.id))
    );

    const agentes = registros.map((a, idx) => {
      const perfilResult = perfis[idx];
      const perfil = perfilResult.sucesso && perfilResult.dados ? perfilResult.dados : null;
      const dominioPrincipal = (perfil?.dominios && perfil.dominios.length > 0 ? perfil.dominios[0] : 'geral').toLowerCase();
      const caminhos = MontarCaminhosAgente(a);
      const dominioArquivos = DOMINIO_ARQUIVOS_PADRAO[dominioPrincipal] || DOMINIO_ARQUIVOS_PADRAO['geral'] || [];
      return {
        ...a,
        dominio: dominioPrincipal,
        caminhos,
        dominioArquivos,
        fluxoPadrao: resolverFluxoPadrao(a.funcao.toLowerCase(), a.id)
      };
    });

    return responder(res, { sucesso: true, dados: agentes });
  }));

  router.get('/agentes/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const agenteResult = await req.servicos!.agente.obter(id);
    if (!agenteResult.sucesso || !agenteResult.dados) {
      return responder(res, agenteResult);
    }

    const { registro, ...perfil } = agenteResult.dados;
    const caminhos = MontarCaminhosAgente(registro);
    const dominioPrincipal = (perfil.dominios && perfil.dominios.length > 0 ? perfil.dominios[0] : 'geral').toLowerCase();
    const dominioArquivos = DOMINIO_ARQUIVOS_PADRAO[dominioPrincipal] || DOMINIO_ARQUIVOS_PADRAO['geral'] || [];
    const fluxoPadrao = resolverFluxoPadrao(perfil.funcao.toLowerCase(), perfil.id);

    return responder(res, {
      sucesso: true,
      dados: {
        perfil,
        registro,
        caminhos,
        dominioArquivos,
        fluxoPadrao
      }
    });
  }));

  router.get('/fluxo-padrao', asyncHandler(async (_req: Request, res: Response) => {
    return responder(res, {
      sucesso: true,
      dados: {
        fluxoPrompt: FLUXO_PADRAO_PROMPT,
        dominios: DOMINIO_ARQUIVOS_PADRAO
      }
    });
  }));

  return router;
}
