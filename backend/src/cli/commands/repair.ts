/**
 * Comando: agentmap repair
 *
 * Repara problemas comuns detectados pelo doctor.
 */

import * as path from 'path';
import * as fs from 'fs';
import { resolveProjectRoot, mkdirSync } from '../utils/project.js';

export function runRepair(): void {
  const projectRoot = resolveProjectRoot(process.cwd());

  console.log(`\n[repair] Project root: ${projectRoot}\n`);

  const fixes: string[] = [];

  // 1. Cria diretórios obrigatórios ausentes
  const requiredDirs = [
    '.ia/contratos',
    '.ia/tarefas',
    '.ia/dependencias',
    '.ia/agentes',
    '.ia/procedimentos',
    '.ia/handoffs',
    '.ia/sessoes',
    '.ia/checkpoints',
    '.ia/riscos',
    '.ia/bloqueios',
    '.ia/pendencias',
    '.ia/reservas',
    '.ia/decisoes',
    '.ia/artefatos',
    '.ia/resultados',
    '.ia/criterios',
    '.ia/aprendizados',
    '.ia/validacoes',
    '.ia/conflitos',
    '.ia/auditoria',
    '.ia/instancias',
    '.ia/estado',
    '.ia/conhecimento',
    '.ia/docs',
    '.ia/docs/guias',
    '.ia/contexto',
  ];

  for (const dir of requiredDirs) {
    const fullPath = path.join(projectRoot, dir);
    if (!fs.existsSync(fullPath)) {
      mkdirSync(fullPath);
      fixes.push(`Criado: ${dir}`);
    }
  }

  // 2. Cria arquivos JSON mínimos se ausentes
  const minFiles: Record<string, string> = {
    '.ia/contratos/contratos.json': '[]',
    '.ia/tarefas/tarefas.json': '[]',
    '.ia/dependencias/dependencias.json': '[]',
    '.ia/handoffs/handoffs.json': '[]',
    '.ia/sessoes/sessoes.json': '[]',
    '.ia/checkpoints/checkpoints.json': '[]',
    '.ia/riscos/riscos.json': '[]',
    '.ia/bloqueios/bloqueios.json': '[]',
    '.ia/pendencias/pendencias.json': '[]',
    '.ia/reservas/reservas.json': '[]',
    '.ia/decisoes/decisoes.json': '[]',
    '.ia/artefatos/artefatos.json': '[]',
    '.ia/resultados/resultados.json': '[]',
    '.ia/criterios/criterios.json': '[]',
    '.ia/aprendizados/aprendizados.json': '[]',
    '.ia/validacoes/validacoes.json': '[]',
    '.ia/conflitos/conflitos.json': '[]',
    '.ia/auditoria/auditoria.json': '[]',
    '.ia/instancias/instancias.json': '[]',
    '.ia/estado/estado-atual.json': '{}',
    '.ia/conhecimento/conhecimento.json': '{}',
  };

  for (const [file, defaultContent] of Object.entries(minFiles)) {
    const fullPath = path.join(projectRoot, file);
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, defaultContent, 'utf-8');
      fixes.push(`Criado: ${file}`);
    }
  }

  // 3. Cria fluxo-trabalho.md mínimo se ausente
  const fluxoPath = path.join(projectRoot, '.ia', 'fluxo-trabalho.md');
  if (!fs.existsSync(fluxoPath)) {
    const defaultFluxo = `# Fluxo de Trabalho — AgentMap\n\n> Fluxo padrão do projeto.\n\n## Fases\n\n1. Planejamento de Projeto\n2. Análise de Viabilidade\n3. Requisitos\n4. Design e Contratos\n5. Design UX/UI\n6. Banco de Dados\n7. Implementação\n8. Testes e Qualidade\n9. DevSecOps / Segurança\n10. Deploy e Infraestrutura\n11. Documentação e Manutenção\n`;
    fs.writeFileSync(fluxoPath, defaultFluxo, 'utf-8');
    fixes.push('Criado: .ia/fluxo-trabalho.md');
  }

  if (fixes.length === 0) {
    console.log('  ✅ Nenhuma reparação necessária.\n');
    return;
  }

  console.log('  Reparações aplicadas:');
  for (const fix of fixes) {
    console.log(`    - ${fix}`);
  }
  console.log(`\n  Total: ${fixes.length} reparação(ões) aplicada(s).\n`);
}
