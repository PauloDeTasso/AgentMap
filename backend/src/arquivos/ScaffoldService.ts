import * as path from 'path';
import * as fsSync from 'fs';
import {
  criarProjetoConfig,
  criarGerenciadorConfig,
  criarAmbienteConfig,
  CONFIGURACAO_MARKDOWN
} from './templates/configuracao';
import {
  AGENTES_BASE,
  criarAgentesRegistry,
  criarAgentePerfil,
  criarHabilidades,
  INSTRUCOES_MD,
  PERSONALIDADE_MD,
  REGRAS_MD,
  CONTEXTO_MD,
  MEMORIA_MD
} from './templates/agentes';
import {
  criarContratosRegistry,
  getContratosPadrao,
  CONTRATO_MODELO_JSON
} from './templates/contratos';
import {
  criarEstadoAtual,
  criarProgresso,
  criarBloqueios,
  criarProcedimentos,
  criarEventosAuditoria
} from './templates/governanca';
import { ResultadoOperacao } from '../tipos';
import { FileService } from './FileService';
import { GERENCIADOR_DIR } from '../config';
import {
  AGENTES_MD,
  KILO_AGENTMAP_JSON,
  AGENTMAP_WAKEUP_PLUGIN_TS
} from './templates/projeto-kilo';

const AGENTE_ARQUIVOS_MD: Record<string, string> = {
  instrucoes: INSTRUCOES_MD,
  personalidade: PERSONALIDADE_MD,
  regras: REGRAS_MD,
  contexto: CONTEXTO_MD,
  memoria: MEMORIA_MD
};

const PAPEIS = [
  'planejador',
  'backend',
  'banco',
  'frontend',
  'android',
  'infraestrutura',
  'testes',
  'revisor',
  'documentacao',
  'observabilidade',
  'desempenho'
];

export class ScaffoldService {
  constructor() {}

  scaffoldProject(projetoId: string, nome: string, descricao: string, caminhoRaiz: string, dadosExtra?: Record<string, unknown>): ResultadoOperacao<string> {
    try {
      if (fsSync.existsSync(path.join(caminhoRaiz, '.ia'))) {
        return { sucesso: false, erro: 'Já existe uma estrutura .ia/ neste diretório', codigoErro: 'IA_EXISTS' };
      }
      fsSync.mkdirSync(caminhoRaiz, { recursive: true });
      fsSync.mkdirSync(path.join(caminhoRaiz, '.ia'), { recursive: true });
      fsSync.mkdirSync(path.join(caminhoRaiz, '.ia', '.backups'), { recursive: true });

      this.criarEstruturaIa(projetoId, nome, descricao, caminhoRaiz);

      this.criarIntegracaoKilo(caminhoRaiz, nome);
      this.copiarFrontendCorrigido(caminhoRaiz);

      const readmeContent = `# ${nome}\n\n${descricao || ''}\n\nEste projeto é gerenciado pelo **Gerenciador Local de Projetos para Agentes de IA**.\n`;
      fsSync.writeFileSync(path.join(caminhoRaiz, 'README.md'), readmeContent, 'utf-8');

      return { sucesso: true, dados: caminhoRaiz };
    } catch (e) {
      return { sucesso: false, erro: (e as Error).message, codigoErro: 'SCAFFOLD_ERROR' };
    }
  }

  private criarEstruturaIa(projetoId: string, nome: string, descricao: string, caminhoRaiz: string): void {
    const iaRoot = path.join(caminhoRaiz, '.ia');
    const hoje = new Date().toISOString();

    fsSync.mkdirSync(path.join(iaRoot, 'configuracao'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'agentes'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'contratos'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'tarefas'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'dependencias'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'estado'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'procedimentos'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'auditoria'), { recursive: true });
    fsSync.mkdirSync(path.join(iaRoot, 'contexto'), { recursive: true });

    // Configuração
    fsSync.writeFileSync(path.join(iaRoot, 'configuracao', 'projeto.json'), JSON.stringify(criarProjetoConfig(projetoId, nome, descricao), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'configuracao', 'gerenciador.json'), JSON.stringify(criarGerenciadorConfig(), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'configuracao', 'ambiente.json'), JSON.stringify(criarAmbienteConfig(), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'configuracao', 'README.md'), CONFIGURACAO_MARKDOWN, 'utf-8');

    // Agentes
    this.criarEstruturaAgentes(iaRoot, hoje, nome);

    // Contratos
    this.criarEstruturaContratos(iaRoot, hoje);

    // Estado
    fsSync.writeFileSync(path.join(iaRoot, 'estado', 'estado-atual.json'), JSON.stringify(criarEstadoAtual(projetoId), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'estado', 'progresso.json'), JSON.stringify(criarProgresso(), null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'estado', 'bloqueios.json'), JSON.stringify(criarBloqueios(), null, 2), 'utf-8');

    // Procedimentos
    fsSync.writeFileSync(path.join(iaRoot, 'procedimentos', 'procedimentos.json'), JSON.stringify(criarProcedimentos(), null, 2), 'utf-8');
    for (const papel of PAPEIS) {
      const prepPath = path.join(iaRoot, 'procedimentos', `preparacao-${papel}.md`);
      const entPath = path.join(iaRoot, 'procedimentos', `entrega-${papel}.md`);
      if (!fsSync.existsSync(prepPath)) {
        fsSync.writeFileSync(prepPath, `# Preparação: ${papel}\n\nUse este documento antes de iniciar qualquer tarefa de ${papel}.\n`, 'utf-8');
      }
      if (!fsSync.existsSync(entPath)) {
        fsSync.writeFileSync(entPath, `# Entrega: ${papel}\n\nUse este documento depois de concluir qualquer tarefa de ${papel}.\n`, 'utf-8');
      }
    }

    // Auditoria
    fsSync.writeFileSync(path.join(iaRoot, 'auditoria', 'eventos.json'), JSON.stringify(criarEventosAuditoria(), null, 2), 'utf-8');

    // Dependências
    fsSync.writeFileSync(path.join(iaRoot, 'dependencias', 'dependencias.json'), JSON.stringify({ dependencias: [] }, null, 2), 'utf-8');

    // Fluxo obrigatório
    fsSync.writeFileSync(path.join(iaRoot, 'fluxo-desenvolvimento.json'), JSON.stringify({
      fluxo: [
        { ordem: 1, etapa: 'necessidade', responsavel: 'proprietario', descricao: 'Definir o objetivo e o escopo do projeto.' },
        { ordem: 2, etapa: 'planejamento', responsavel: 'planejador-arquiteto', descricao: 'Criar estrutura de pastas, convenções e tarefas.' },
        { ordem: 3, etapa: 'arquitetura', responsavel: 'planejador-arquiteto', descricao: 'Definir arquitetura e padrões do projeto.' },
        { ordem: 4, etapa: 'contratos', responsavel: 'planejador-arquiteto', descricao: 'Criar contratos entre áreas e agentes.' },
        { ordem: 5, etapa: 'tarefas', responsavel: 'planejador-arquiteto', descricao: 'Criar tarefas com dependências explícitas.' },
        { ordem: 6, etapa: 'implementacao', responsavel: 'agente_especializado', descricao: 'Executar implementações respeitando dependências.' },
        { ordem: 7, etapa: 'testes', responsavel: 'testes', descricao: 'Executar testes automatizados e validar cobertura.' },
        { ordem: 8, etapa: 'revisao', responsavel: 'revisor', descricao: 'Revisar código, qualidade e aderência aos contratos.' },
        { ordem: 9, etapa: 'aprovacao', responsavel: 'proprietario', descricao: 'Aprovar ou rejeitar entregas conforme critérios.' },
        { ordem: 10, etapa: 'integracao', responsavel: 'git', descricao: 'Registrar alterações no Git e atualizar estado.' },
        { ordem: 11, etapa: 'documentacao', responsavel: 'documentacao', descricao: 'Documentar entregas, decisões e exemplos.' },
        { ordem: 12, etapa: 'atualizacao_estado', responsavel: 'gerenciador', descricao: 'Atualizar estado do projeto e métricas.' }
      ],
      regras: [
        'Nenhuma tarefa deve iniciar antes de suas dependências estarem concluídas.',
        'O planejador sempre cria o fluxo e as dependências antes de iniciar implementações.',
        'Agentes devem consultar dependências no início de cada ciclo de trabalho.',
        'Tarefas sem dependências podem executar em paralelo.',
        'Tarefas com dependências devem esperar bloco/reserva antes de prosseguir.'
      ]
    }, null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(iaRoot, 'fluxo-trabalho.md'), `# Fluxo de Trabalho Sincronizado — ${nome}\n\nEste documento define como o trabalho deve ser organizado para respeitar dependências entre agentes.\n\n## Princípio\n\nO AgentMap registra dependências, mas **não inicia agentes automaticamente**. O fluxo real deve ser conduzido como pessoas:\n\n1. O planejador define o que deve ser feito e em que ordem.\n2. Os agentes só começam quando os pré-requisitos estão prontos.\n3. O monitoramento mostra o estado atual para decisões humanas.\n\n## Ordem padrão do projeto\n\n1. Planejador/Arquiteto\n2. Backend / Banco / Frontend / Android / Infraestrutura\n3. Testes / Observabilidade\n4. Revisor / Documentação / Desempenho\n\n## Regras de execução\n\n- Nenhuma tarefa com dependência pendente deve iniciar.\n- Se uma tarefa dependente tentar executar antes da hora, ela deve registrar um bloqueio no AgentMap e aguardar.\n- O usuário/revisor deve usar o monitoramento para identificar gargalos e desbloqueios.\n\n## Sincronização com Kilo Code / Agent Manager\n\n- Crie worktrees apenas para tarefas sem dependências pendentes.\n- Worktrees de tarefas dependentes devem ser criados/ativados somente após a conclusão da tarefa pré-requisito.\n- Use o monitoramento do AgentMap para validar o estado antes de iniciar novos worktrees.\n`, 'utf-8');
  }

  private criarEstruturaAgentes(iaRoot: string, hoje: string, nome: string): void {
    const agentesDir = path.join(iaRoot, 'agentes');

    // Registro central
    fsSync.writeFileSync(path.join(agentesDir, 'agentes.json'), JSON.stringify(criarAgentesRegistry(), null, 2), 'utf-8');

    // Agentes base
    for (const agente of AGENTES_BASE) {
      const agenteDir = path.join(agentesDir, agente.subpasta);
      fsSync.mkdirSync(path.join(agenteDir, 'conhecimento'), { recursive: true });
      fsSync.mkdirSync(path.join(agenteDir, 'recursos'), { recursive: true });

      const perfil = criarAgentePerfil(agente, hoje);
      fsSync.writeFileSync(path.join(agenteDir, `${agente.perfilId}.json`), JSON.stringify(perfil, null, 2), 'utf-8');

      fsSync.writeFileSync(path.join(agenteDir, 'habilidades.json'), JSON.stringify(criarHabilidades(agente), null, 2), 'utf-8');

      for (const [arquivo, conteudo] of Object.entries(AGENTE_ARQUIVOS_MD)) {
        fsSync.writeFileSync(path.join(agenteDir, `${arquivo}.md`), conteudo, 'utf-8');
      }
    }

    // Orquestrador (perfil básico)
    const orquestradorDir = path.join(agentesDir, 'orquestrador');
    fsSync.mkdirSync(path.join(orquestradorDir, 'conhecimento'), { recursive: true });
    fsSync.mkdirSync(path.join(orquestradorDir, 'recursos'), { recursive: true });
    fsSync.writeFileSync(path.join(orquestradorDir, 'orquestrador-perfil.json'), JSON.stringify({
      id: 'orquestrador',
      nome: 'Orquestrador',
      funcao: 'orquestracao',
      estado: 'ativo',
      perfilId: 'orquestrador-perfil',
      subpasta: 'orquestrador',
      permissoes: { leitura: ['*'], escrita: ['.ia/tarefas', '.ia/dependencias', '.ia/handoffs', '.ia/eventos', '.ia/bloqueios'], execucao: ['api', 'mcp', 'agente_manager', 'file_watcher'], aprovacao: false },
      diretoriosPermitidos: ['*'],
      diretoriosProibidos: ['.env', '*.key', '*.pem'],
      conhecimentos: [],
      dominios: ['planejamento', 'backend', 'banco', 'frontend', 'android', 'infraestrutura', 'testes', 'revisor', 'documentacao', 'observabilidade', 'desempenho'],
      datas: { criacao: hoje, atualizacao: hoje }
    }, null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(orquestradorDir, 'habilidades.json'), JSON.stringify({
      agenteId: 'orquestrador',
      habilidades: ['Ler estado completo do projeto via API', 'Identificar tarefas prontas para execucao', 'Verificar dependencias pendentes', 'Criar handoffs e eventos', 'Enviar prompts para agentes responsaveis', 'Registrar bloqueios quando necessario', 'Atualizar estado de tarefas', 'Consultar monitoramento do projeto'],
      ferramentas: ['api', 'mcp', 'agente_manager', 'file_watcher', 'auditoria'],
      limitacoes: ['Nao executar implementacoes diretamente', 'Nao modificar codigo fonte', 'Nao aprovar ou rejeitar entregas', 'Manter circuit breaker contra loops infinitos']
    }, null, 2), 'utf-8');
    fsSync.writeFileSync(path.join(orquestradorDir, 'instrucoes.md'), `# Instrucoes: Orquestrador\n\nVoce e o agente orquestrador do projeto ${nome}. Sua funcao e gerenciar o fluxo de trabalho entre todos os agentes, garantindo que cada tarefa seja executada na ordem correta, respeitando dependencias.\n\n## Responsabilidades\n\n- Consultar o estado do projeto periodicamente\n- Identificar quais tarefas estao prontas para iniciar\n- Verificar se dependencias estao concluidas\n- Comandar agentes responsaveis via prompts\n- Registrar bloqueios e handoffs\n- Atualizar estado de tarefas\n- Manter monitoramento atualizado\n\n## Regras\n\n- Nunca iniciar tarefa com dependencia pendente\n- Sempre registrar handoff ao transferir contexto\n- Sempre registrar bloqueio se encontrar impedimento\n- Respeitar o fluxo padrao do projeto\n- Nao executar implementacoes diretamente\n- Manter circuit breaker ativo\n`, 'utf-8');
    fsSync.writeFileSync(path.join(orquestradorDir, 'personalidade.md'), `# Personalidade: Orquestrador\n\n- Metodico e sistematico\n- Focado em estado e dependencias\n- Comunicativo via eventos e handoffs\n- Conservador: prefere bloquear a executar errado\n- Transparente: registra todas as decisoes\n`, 'utf-8');
    fsSync.writeFileSync(path.join(orquestradorDir, 'regras.md'), `# Regras: Orquestrador\n\n## Regras Gerais\n\n- Respeitar o fluxo padrao definido em .ia/fluxo-desenvolvimento.json\n- Nunca iniciar tarefa com dependencia pendente\n- Sempre registrar handoff ao transferir contexto\n- Sempre registrar bloqueio se encontrar impedimento\n- Respeitar contratos obrigatorios\n\n## Regras de Seguranca\n\n- Nao expor segredos em prompts ou eventos\n- Nao modificar codigo fonte diretamente\n- Nao aprovar ou rejeitar entregas\n- Manter logs de todas as acoes\n\n## Regras de Circuit Breaker\n\n- Maximo de 5 comandos por minuto por agente\n- Maximo de 3 tentativas de reenvio por tarefa\n- Timeout de 30 minutos por tarefa\n- Se loop detectado: pausar por 5 minutos\n`, 'utf-8');
    fsSync.writeFileSync(path.join(orquestradorDir, 'contexto.md'), `# Contexto: Orquestrador\n\n## Estado do Projeto\n\nO orquestrador mantem o estado do projeto em .ia/estado/estado-atual.json.\n\n## Tarefas\n\nTarefas sao armazenadas em .ia/tarefas/tarefas.json e organizadas por estado em subpastas.\n\n## Dependencias\n\nDependencias sao armazenadas em .ia/dependencias/dependencias.json.\n\n## Eventos\n\nEventos sao registrados em .ia/auditoria/eventos.json.\n\n## Handoffs\n\nHandoffs sao registrados em .ia/handoffs/handoffs.json.\n\n## Bloqueios\n\nBloqueios sao registrados em .ia/estado/bloqueios.json.\n`, 'utf-8');
    fsSync.writeFileSync(path.join(orquestradorDir, 'memoria.md'), `# Memoria: Orquestrador\n\n## Historico de Decisoes\n\n- ${hoje.split('T')[0]}: Orquestrador criado para projeto ${nome}\n\n## Aprendizados\n\n- Sempre verificar dependencias antes de comandar agente\n- Registrar handoff para preservar contexto\n- Usar bloqueio quando nao ha como prosseguir\n`, 'utf-8');
  }

  private criarEstruturaContratos(iaRoot: string, hoje: string): void {
    const contratosDir = path.join(iaRoot, 'contratos');

    // Registro central
    const reg = criarContratosRegistry(getContratosPadrao());
    fsSync.writeFileSync(path.join(contratosDir, 'contratos.json'), JSON.stringify(reg, null, 2), 'utf-8');

    // Modelo
    fsSync.writeFileSync(path.join(contratosDir, 'modelo-contrato.json'), JSON.stringify(CONTRATO_MODELO_JSON, null, 2), 'utf-8');

    // Versão legível do contrato-projeto
    const projetoReadable = `# Contrato do Projeto\n\nEste é o contrato constitucional do projeto. Todos os agentes devem respeitá-lo.\n`;
    fsSync.writeFileSync(path.join(contratosDir, 'contrato-projeto.md'), projetoReadable, 'utf-8');
  }

  /**
   * Gera os arquivos de integração com o Kilo Code (.kilo/) e o kilo.jsonc.
   * O kilo.jsonc NÃO contém API key hardcoded: a chave é lida de
   * process.env.AGENTMAP_API_KEY (ver plugin agentmap-wakeup.ts).
   */
  private criarIntegracaoKilo(caminhoRaiz: string, nome: string): void {
    try {
      // kilo.jsonc (sem API key hardcoded; usa env var no plugin)
      const kiloPath = path.join(caminhoRaiz, 'kilo.jsonc');
      if (!fsSync.existsSync(kiloPath)) {
        const kiloConfig = KILO_AGENTMAP_JSON(GERENCIADOR_DIR);
        fsSync.writeFileSync(kiloPath, JSON.stringify(kiloConfig, null, 2), 'utf-8');
      }

      // Plugin de wake-up automático
      const pluginDir = path.join(caminhoRaiz, '.kilo', 'plugin');
      fsSync.mkdirSync(pluginDir, { recursive: true });
      const wakeupPath = path.join(pluginDir, 'agentmap-wakeup.ts');
      if (!fsSync.existsSync(wakeupPath)) {
        fsSync.writeFileSync(wakeupPath, AGENTMAP_WAKEUP_PLUGIN_TS, 'utf-8');
      }

      // Documento de governança para agentes Kilo
      const agentesMdPath = path.join(caminhoRaiz, 'AGENTES.md');
      if (!fsSync.existsSync(agentesMdPath)) {
        fsSync.writeFileSync(agentesMdPath, AGENTES_MD(nome, 'AgentMap'), 'utf-8');
      }
    } catch (e) {
      console.error('[ScaffoldService] Falha ao criar integração Kilo:', (e as Error).message);
    }
  }

  /**
   * Copia o frontend corrigido (index.html, css/style.css, js/app.js, etc.)
   * do Gerenciador para o novo projeto, garantindo que ele nasça com a
   * interface moderna e sem os bugs conhecidos (ex.: modais estáticos, abrirModal).
   */
  private copiarFrontendCorrigido(caminhoRaiz: string): void {
    try {
      const origem = path.join(GERENCIADOR_DIR, 'frontend');
      if (!fsSync.existsSync(origem)) {
        console.warn('[ScaffoldService] Frontend de origem não encontrado em', origem);
        return;
      }
      const destino = path.join(caminhoRaiz, 'frontend');
      if (fsSync.existsSync(destino)) {
        return;
      }
      fsSync.mkdirSync(path.dirname(destino), { recursive: true });
      fsSync.cpSync(origem, destino, { recursive: true });
    } catch (e) {
      console.error('[ScaffoldService] Falha ao copiar frontend corrigido:', (e as Error).message);
    }
  }
}
