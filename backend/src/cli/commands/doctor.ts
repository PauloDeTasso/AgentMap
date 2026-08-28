/**
 * Comando: agentmap doctor [--json] [--repair]
 *
 * Valida a integridade do projeto AgentMap atual.
 */

import * as path from 'path';
import * as fs from 'fs';
import type { DoctorOptions, CliContext, DoctorIssue } from '../types.js';
import { resolveAgentMapRoot, resolveProjectRoot } from '../utils/project.js';

export function runDoctor(options: DoctorOptions): void {
  const cwd = process.cwd();
  const agentMapRoot = resolveAgentMapRoot(cwd);
  const projectRoot = resolveProjectRoot(cwd);

  console.log(`\n[doctor] AgentMap root: ${agentMapRoot}`);
  console.log(`[doctor] Project root: ${projectRoot}\n`);

  const issues: DoctorIssue[] = [];

  // 1. Verifica estrutura mínima
  const requiredDirs = [
    '.ia/contratos',
    '.ia/tarefas',
    '.ia/dependencias',
    '.ia/agentes',
    '.ia/procedimentos',
  ];

  for (const dir of requiredDirs) {
    const fullPath = path.join(projectRoot, dir);
    if (!fs.existsSync(fullPath)) {
      issues.push({
        severity: 'error',
        code: 'MISSING_DIR',
        message: `Diretório obrigatório ausente: ${dir}`,
        path: fullPath,
        fix: `mkdir ${dir}`,
      });
    }
  }

  // 2. Verifica fluxo-trabalho.md
  const fluxoPath = path.join(projectRoot, '.ia', 'fluxo-trabalho.md');
  if (!fs.existsSync(fluxoPath)) {
    issues.push({
      severity: 'error',
      code: 'MISSING_FLUXO',
      message: '.ia/fluxo-trabalho.md obrigatório ausente',
      path: fluxoPath,
      fix: 'Crie o arquivo de fluxo de trabalho',
    });
  }

  // 3. Verifica agentes
  const agentsSource = path.join(agentMapRoot, '.ia', 'agentes');
  if (fs.existsSync(agentsSource)) {
    const agentDirs = fs.readdirSync(agentsSource, { withFileTypes: true }).filter((d) => d.isDirectory());
    let agentsWithJson = 0;
    for (const dir of agentDirs) {
      const jsonPath = path.join(agentsSource, dir.name, `${dir.name}.json`);
      if (fs.existsSync(jsonPath)) {
        agentsWithJson++;
      } else {
        issues.push({
          severity: 'warning',
          code: 'AGENT_MISSING_JSON',
          message: `Agente ${dir.name} sem definição JSON`,
          path: path.join(agentsSource, dir.name),
          fix: `Crie ${dir.name}.json em .ia/agentes/${dir.name}/`,
        });
      }
    }

    if (agentsWithJson === 0 && agentDirs.length > 0) {
      issues.push({
        severity: 'warning',
        code: 'NO_AGENT_JSON',
        message: 'Nenhum agente com definição JSON encontrado',
        path: agentsSource,
        fix: 'Adicione arquivos .json aos diretórios de agentes',
      });
    }
  } else {
    issues.push({
      severity: 'error',
      code: 'MISSING_AGENTES',
      message: '.ia/agentes não encontrado',
      path: agentsSource,
      fix: 'Execute agentmap init ou crie a estrutura manualmente',
    });
  }

  // 4. Verifica dependências circulares (simplificado)
  const depsPath = path.join(projectRoot, '.ia', 'dependencias', 'dependencias.json');
  if (fs.existsSync(depsPath)) {
    try {
      const deps = JSON.parse(fs.readFileSync(depsPath, 'utf-8'));
      if (Array.isArray(deps)) {
        const hasCircular = detectCircularDependencies(deps);
        if (hasCircular) {
          issues.push({
            severity: 'error',
            code: 'CIRCULAR_DEPENDENCY',
            message: 'Dependência circular detectada',
            path: depsPath,
            fix: 'Remova a dependência circular',
          });
        }
      }
    } catch {
      issues.push({
        severity: 'error',
        code: 'INVALID_JSON',
        message: 'dependencias.json inválido',
        path: depsPath,
        fix: 'Corrija o JSON',
      });
    }
  }

  // 5. Verifica MCP
  const mcpDist = path.join(agentMapRoot, '.ia', 'runtime', 'mcp', 'dist', 'main.js');
  if (!fs.existsSync(mcpDist)) {
    issues.push({
      severity: 'warning',
      code: 'MCP_NOT_BUILT',
      message: 'MCP server não buildado (.ia/runtime/mcp/dist/main.js ausente)',
      path: mcpDist,
      fix: 'Execute `agentmap init` ou build manualmente o MCP',
    });
  }

  // 6. Verifica contratos
  const contratosPath = path.join(projectRoot, '.ia', 'contratos', 'contratos.json');
  if (fs.existsSync(contratosPath)) {
    try {
      JSON.parse(fs.readFileSync(contratosPath, 'utf-8'));
    } catch {
      issues.push({
        severity: 'error',
        code: 'INVALID_CONTRACT_JSON',
        message: 'contratos.json inválido',
        path: contratosPath,
        fix: 'Corrija o JSON',
      });
    }
  } else {
    issues.push({
      severity: 'warning',
      code: 'MISSING_CONTRACTS',
      message: 'Nenhum contrato registrado',
      path: contratosPath,
      fix: 'Adicione contratos em .ia/contratos/',
    });
  }

  // Exibe resultados
  if (issues.length === 0) {
    console.log('  ✅ Nenhum problema encontrado.\n');
    return;
  }

  console.log(`  ${issues.length} problema(s) encontrado(s):\n`);

  for (const issue of issues) {
    const icon = issue.severity === 'error' ? '❌' : '⚠️';
    console.log(`  ${icon} [${issue.code}] ${issue.message}`);
    if (issue.path) console.log(`      Path: ${issue.path}`);
    if (issue.fix) console.log(`      Fix: ${issue.fix}`);
    console.log('');
  }

  if (options.json) {
    console.log('\n' + JSON.stringify({ issues, healthy: issues.filter((i) => i.severity === 'error').length === 0 }, null, 2));
  }
}

function detectCircularDependencies(deps: any[]): boolean {
  const graph = new Map<string, string[]>();
  for (const dep of deps) {
    const from = dep.de || dep.from || dep.origem;
    const to = dep.para || dep.to || dep.destino;
    if (!from || !to) continue;
    if (!graph.has(from)) graph.set(from, []);
    graph.get(from)!.push(to);
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      if (dfs(node)) return true;
    }
  }

  return false;
}
