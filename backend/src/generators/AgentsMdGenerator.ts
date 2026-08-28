/**
 * AgentsMdGenerator — gera .kilo/agents/agentmap/*.md a partir de .ia/agentes/*.json
 */

import * as path from 'path';
import * as fs from 'fs';
import type { GeneratorResult, CliContext } from '../cli/types';

export class AgentsMdGenerator {
  constructor(private ctx: CliContext) {}

  generate(): GeneratorResult[] {
    const results: GeneratorResult[] = [];
    const agentsSource = path.join(this.ctx.agentMapRoot, '.ia', 'agentes');
    const agentsTarget = path.join(this.ctx.cwd, '.kilo', 'agents', 'agentmap');

    if (!fs.existsSync(agentsSource)) {
      return [{ success: false, path: agentsTarget, action: 'skipped', message: '.ia/agentes não encontrado' }];
    }

    fs.mkdirSync(agentsTarget, { recursive: true });

    const dirs = fs.readdirSync(agentsSource, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const dir of dirs) {
      const sourceDir = path.join(agentsSource, dir);
      const jsonPath = path.join(sourceDir, `${dir}.json`);
      if (!fs.existsSync(jsonPath)) continue;

      const def = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as Record<string, unknown>;
      const targetPath = path.join(agentsTarget, `${dir}.md`);
      const content = this.buildMarkdown(def);

      if (fs.existsSync(targetPath) && !this.ctx.force) {
        results.push({ success: true, path: targetPath, action: 'unchanged', message: 'Já existe (use --force para sobrescrever)' });
        continue;
      }

      if (this.ctx.dryRun) {
        results.push({ success: true, path: targetPath, action: 'updated', message: '[dry-run]' });
        continue;
      }

      fs.writeFileSync(targetPath, content, 'utf-8');
      results.push({ success: true, path: targetPath, action: 'updated' });
    }

    return results;
  }

  private buildMarkdown(def: Record<string, unknown>): string {
    const nome = (def.nome as string) || def.id;
    const descricao = (def.descricao as string) || '';
    const responsabilidades = (def.responsabilidades as string[]) || [];
    const conhecimentos = (def.conhecimentos as string[]) || [];
    const condicoesParada = (def.condicoesDeParada as string[]) || [];
    const criteriosQualidade = (def.criteriosDeQualidade as string[]) || [];
    const diretoriosPermitidos = (def.diretoriosPermitidos as string[]) || [];
    const diretoriosProibidos = (def.diretoriosProibidos as string[]) || [];
    const ferramentasPermitidas = (def.ferramentasPermitidas as string[]) || [];
    const contratosObrigatorios = (def.contratosObrigatorios as string[]) || [];
    const procedimentosObrigatorios = (def.procedimentosObrigatorios as string[]) || [];
    const protocolo = (def.protocoloDeEntrega as Record<string, unknown>) || {};
    const ambientes = (def.ambientesPermitidos as string[]) || [];
    const criteriosConclusao = (def.criteriosDeConclusao as string[]) || [];

    const lines: string[] = [];
    lines.push(`# Agente: ${nome}`);
    lines.push('');
    lines.push('> Arquivo gerado automaticamente a partir de `.ia/agentes/<id>/<id>.json`.');
    lines.push('> **NÃO edite manualmente** — altere o JSON fonte e execute `agentmap update`.');
    lines.push('');
    lines.push('---');
    lines.push('');

    if (descricao) {
      lines.push('## Identidade');
      lines.push('');
      lines.push(descricao);
      lines.push('');
    }

    lines.push('## Responsabilidades');
    lines.push('');
    for (const r of responsabilidades) {
      lines.push(`- ${r}`);
    }
    lines.push('');

    if (conhecimentos.length) {
      lines.push('## Conhecimentos');
      lines.push('');
      for (const c of conhecimentos) {
        lines.push(`- ${c}`);
      }
      lines.push('');
    }

    if (criteriosQualidade.length) {
      lines.push('## Critérios de Qualidade');
      lines.push('');
      for (const c of criteriosQualidade) {
        lines.push(`- ${c}`);
      }
      lines.push('');
    }

    if (diretoriosPermitidos.length || diretoriosProibidos.length) {
      lines.push('## Acesso a Arquivos');
      lines.push('');
      if (diretoriosPermitidos.length) {
        lines.push('**Permitidos:**');
        for (const d of diretoriosPermitidos) {
          lines.push(`- \`${d}\``);
        }
      }
      if (diretoriosProibidos.length) {
        lines.push('**Proibidos:**');
        for (const d of diretoriosProibidos) {
          lines.push(`- \`${d}\``);
        }
      }
      lines.push('');
    }

    if (ferramentasPermitidas.length) {
      lines.push('## Ferramentas Permitidas');
      lines.push('');
      for (const f of ferramentasPermitidas) {
        lines.push(`- ${f}`);
      }
      lines.push('');
    }

    if (contratosObrigatorios.length) {
      lines.push('## Contratos Obrigatórios');
      lines.push('');
      for (const c of contratosObrigatorios) {
        lines.push(`- ${c}`);
      }
      lines.push('');
    }

    if (procedimentosObrigatorios.length) {
      lines.push('## Procedimentos Obrigatórios');
      lines.push('');
      for (const p of procedimentosObrigatorios) {
        lines.push(`- ${p}`);
      }
      lines.push('');
    }

    if (condicoesParada.length) {
      lines.push('## Condições de Parada');
      lines.push('');
      for (const c of condicoesParada) {
        lines.push(`- ${c}`);
      }
      lines.push('');
    }

    if (criteriosConclusao.length) {
      lines.push('## Critérios de Conclusão');
      lines.push('');
      for (const c of criteriosConclusao) {
        lines.push(`- ${c}`);
      }
      lines.push('');
    }

    if (Object.keys(protocolo).length) {
      lines.push('## Protocolo de Entrega');
      lines.push('');
      lines.push('| Campo | Valor |');
      lines.push('|-------|-------|');
      for (const [k, v] of Object.entries(protocolo)) {
        lines.push(`| ${k} | ${v} |`);
      }
      lines.push('');
    }

    if (ambientes.length) {
      lines.push('## Ambientes Permitidos');
      lines.push('');
      for (const a of ambientes) {
        lines.push(`- ${a}`);
      }
      lines.push('');
    }

    lines.push('## Regras');
    lines.push('');
    lines.push('1. **Não executar** — Você planeja, coordena e monitora. Não escreve código, não implanta, não testa.');
    lines.push('2. **Sempre verificar dependências** — Antes de liberar qualquer tarefa, confirme que pré-requisitos estão atendidos.');
    lines.push('3. **Documentar decisões** — Toda decisão deve ser registrada em `.ia/decisoes/`.');
    lines.push('4. **Respeitar contratos** — Nenhuma tarefa pode violar contratos estabelecidos.');
    lines.push('5. **Checkpoint humano** — Decisões críticas requerem aprovação do Proprietário.');
    lines.push('6. **Nunca alterar domínio técnico** — Você pode solicitar mudanças, mas não implementa diretamente em código.');
    lines.push('');

    return lines.join('\n');
  }
}
