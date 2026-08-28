/**
 * AgentsRootGenerator — gera AGENTS.md com seção protegida do AgentMap.
 *
 * Estrutura:
 * 1. Cabeçalho padrão do AgentMap (protegido)
 * 2. Seção customizada do usuário (preservada entre atualizações)
 */

import * as path from 'path';
import * as fs from 'fs';
import type { GeneratorResult, CliContext } from '../cli/types';

const PROTECTED_SECTION_START = '<!-- AGENTMAP_PROTECTED_START -->';
const PROTECTED_SECTION_END = '<!-- AGENTMAP_PROTECTED_END -->';
const USER_SECTION_START = '<!-- AGENTMAP_USER_START -->';
const USER_SECTION_END = '<!-- AGENTMAP_USER_END -->';

export class AgentsRootGenerator {
  constructor(private ctx: CliContext) {}

  generate(): GeneratorResult {
    const targetPath = path.join(this.ctx.cwd, 'AGENTS.md');
    const protectedContent = this.buildProtectedSection();

    if (!fs.existsSync(targetPath)) {
      const content = this.buildNewAgentsMd(protectedContent);
      if (this.ctx.dryRun) {
        return { success: true, path: targetPath, action: 'created', message: '[dry-run]' };
      }
      fs.writeFileSync(targetPath, content, 'utf-8');
      return { success: true, path: targetPath, action: 'created' };
    }

    const existing = fs.readFileSync(targetPath, 'utf-8');
    const merged = this.mergeWithExisting(existing, protectedContent);

    if (merged === existing && !this.ctx.force) {
      return { success: true, path: targetPath, action: 'unchanged', message: 'Nenhuma alteração na seção protegida' };
    }

    if (this.ctx.dryRun) {
      return { success: true, path: targetPath, action: 'updated', message: '[dry-run]' };
    }

    fs.writeFileSync(targetPath, merged, 'utf-8');
    return { success: true, path: targetPath, action: 'updated' };
  }

  private buildProtectedSection(): string {
    const lines: string[] = [];
    lines.push(PROTECTED_SECTION_START);
    lines.push('');
    lines.push('# AgentMap — Gerenciador Local de Agentes de IA');
    lines.push('');
    lines.push('## O que é');
    lines.push('');
    lines.push('Gerenciador local para Windows, Linux e macOS que organiza projetos, agentes, contratos, tarefas,');
    lines.push('contexto, conhecimento e governança através de arquivos reais no sistema de arquivos.');
    lines.push('');
    lines.push('O arquivo é a informação principal. PostgreSQL é opcional (não implementado no momento; apenas pasta para futura expansão).');
    lines.push('');
    lines.push('## Princípios');
    lines.push('');
    lines.push('- O gerenciador **não executa agentes**, não escolhe modelos, não distribui tarefas.');
    lines.push('- Ele entrega contexto correto e registra o que acontece.');
    lines.push('- Git é somente leitura (consulta).');
    lines.push('- Proteção contra path traversal, validação de JSON, backups automáticos.');
    lines.push('');
    lines.push('## Arquitetura');
    lines.push('');
    lines.push('```');
    lines.push('backend/    → Node.js + TypeScript + Express');
    lines.push('frontend/   → HTML5 + CSS3 + JavaScript (vanilla ES modules)');
    lines.push('banco/      → PostgreSQL opcional (não implementado)');
    lines.push('esquemas/   → JSON Schemas de validação');
    lines.push('temp/       → Arquivos temporários do projeto (limpeza automática/manual)');
    lines.push('```');
    lines.push('');
    lines.push('**Armazenamento operacional:** predominantemente **filesystem + JSON**. Os dados reais do projeto vivem em arquivos dentro de `.ia/`. PostgreSQL, se usado no futuro, será apenas para metadados/índice.');
    lines.push('');
    lines.push('Arquivos temporários são gerenciados pela pasta `temp/`, com limpeza automática por TTL (padrão 7 dias) e botão "🧹 Limpar Temp" na interface web.');
    lines.push('');
    lines.push('## Desenvolvimento');
    lines.push('');
    lines.push('```bash');
    lines.push('cd backend');
    lines.push('npm install');
    lines.push('npm run dev      # inicia backend + frontend na porta 3150');
    lines.push('```');
    lines.push('');
    lines.push('Acesse: http://localhost:3150');
    lines.push('');
    lines.push('## Estrutura de pastas de projetos');
    lines.push('');
    lines.push('- Pasta base de projetos: configurável por projeto (caminho absoluto ou relativo)');
    lines.push('- Cada projeto recebe sua própria pasta com o **mesmo nome do projeto**');
    lines.push('- Exemplo Windows: projeto `PAGINA_PESSOAL` → `G:\\PROJETOS\\AgenteMap_Projetos\\PAGINA_PESSOAL`');
    lines.push('- Exemplo Linux/macOS: projeto `PAGINA_PESSOAL` → `~/projetos/agentmap/PAGINA_PESSOAL`');
    lines.push('');
    lines.push('## Estrutura de um projeto gerenciado');
    lines.push('');
    lines.push('Cada projeto recebe uma pasta `.ia/` com a estrutura completa de governança.');
    lines.push('Veja: `PLANO GERAL/arquivo/GERENCIADOR_LOCAL_DE_AGENTES_DE_IA-ESPECIFICACAO_DE_IMPLEMENTACAO.md`');
    lines.push('');
    lines.push('## Regra obrigatória: fluxo e dependências');
    lines.push('');
    lines.push('Novos projetos devem respeitar o fluxo padrão definido em `.ia/fluxo-trabalho.md`.');
    lines.push('O **ProjectOrchestrator** (serviço backend) controla a execução fase a fase.');
    lines.push('Agentes são Custom Subagents em `.kilo/agent/` executados dentro de worktrees por fase.');
    lines.push('Nenhuma fase avança sem aprovação explícita do checkpoint.');
    lines.push('');
    lines.push('**Ordem de execução obrigatória:**');
    lines.push('1. Planejamento de Projeto');
    lines.push('2. Análise de Viabilidade');
    lines.push('3. Requisitos');
    lines.push('4. Design e Contratos');
    lines.push('5. Design UX/UI');
    lines.push('6. Banco de Dados');
    lines.push('7. Implementação');
    lines.push('8. Testes e Qualidade');
    lines.push('9. DevSecOps / Segurança');
    lines.push('10. Deploy e Infraestrutura');
    lines.push('11. Documentação e Manutenção');
    lines.push('');
    lines.push('Documentação completa: `docs/plano-final-implementacao.md`');
    lines.push('');
    lines.push('## Checklist automático de novos projetos');
    lines.push('');
    lines.push('O AgentMap valida automaticamente a estrutura mínima de fluxo ao criar ou abrir um projeto:');
    lines.push('- `.ia/fluxo-trabalho.md` obrigatório');
    lines.push('- Pastas `.ia/contratos`, `.ia/tarefas`, `.ia/dependencias` obrigatórias');
    lines.push('- Pelo menos 1 contrato e 1 tarefa registrados');
    lines.push('- Sem dependências circulares');
    lines.push('');
    lines.push('Se o checklist não estiver completo, a criação/abertura do projeto é bloqueada.');
    lines.push('Endpoint: `GET /api/projetos/:id/fluxo/checklist`');
    lines.push('');
    lines.push('## Preparação e entrega por agente');
    lines.push('');
    lines.push('Cada agente possui documento de preparação e entrega em `.ia/procedimentos/`:');
    lines.push('- `preparacao-<papel>.md` — o que ler e verificar antes de começar');
    lines.push('- `entrega-<papel>.md` — o que registrar e entregar depois de terminar');
    lines.push('');
    lines.push('Papéis cobertos:');
    lines.push('planejador, planejador-arquiteto, gerente-projeto, analista-sistemas, analista-negocios, engenheiro-software, analista-banco-dados, testador-qa, documentador-tecnico, seguranca, backend, banco, frontend, android, infraestrutura, testes, revisor, documentacao, observabilidade, desempenho');
    lines.push('');
    lines.push('## Regra de corporação/equipe');
    lines.push('');
    lines.push('Em projetos com múltiplos agentes:');
    lines.push('- O planejador define a ordem e as dependências.');
    lines.push('- Cada agente só inicia quando seus pré-requisitos estão prontos.');
    lines.push('- O monitoramento é a fonte de verdade para o estado do projeto.');
    lines.push('- Bloqueios devem ser registrados no AgentMap, não resolvidos informalmente.');
    lines.push('- Handoffs devem ser usados para transferir contexto entre agentes.');
    lines.push('- O revisor valida aderência aos contratos antes da documentação final.');
    lines.push('');
    lines.push(PROTECTED_SECTION_END);
    lines.push('');
    lines.push(USER_SECTION_START);
    lines.push('');
    lines.push('# Seção customizada do usuário');
    lines.push('');
    lines.push('> Esta seção é preservada entre atualizações do AgentMap.');
    lines.push('> Adicione aqui instruções específicas do seu projeto.');
    lines.push('');
    lines.push(USER_SECTION_END);
    lines.push('');
    return lines.join('\n');
  }

  private mergeWithExisting(existing: string, newProtected: string): string {
    const hasProtectedStart = existing.includes(PROTECTED_SECTION_START);
    const hasProtectedEnd = existing.includes(PROTECTED_SECTION_END);
    const hasUserStart = existing.includes(USER_SECTION_START);
    const hasUserEnd = existing.includes(USER_SECTION_END);

    if (!hasProtectedStart || !hasProtectedEnd) {
      return newProtected + '\n\n' + existing;
    }

    const beforeProtected = existing.split(PROTECTED_SECTION_START)[0];
    const afterProtected = existing.split(PROTECTED_SECTION_END).slice(1).join(PROTECTED_SECTION_END);

    let userSection = '';
    if (hasUserStart && hasUserEnd) {
      const userMatch = existing.match(new RegExp(`${USER_SECTION_START}([\\s\\S]*?)${USER_SECTION_END}`));
      if (userMatch) {
        userSection = userMatch[1].trim();
      }
    }

    if (!userSection) {
      userSection = '\n# Seção customizada do usuário\n\n> Esta seção é preservada entre atualizações do AgentMap.\n> Adicione aqui instruções específicas do seu projeto.\n';
    }

    const result = `${beforeProtected}${newProtected}\n\n${USER_SECTION_START}${userSection}\n${USER_SECTION_END}\n${afterProtected}`;
    return result;
  }

  private buildNewAgentsMd(protectedContent: string): string {
    return protectedContent + '\n';
  }
}
