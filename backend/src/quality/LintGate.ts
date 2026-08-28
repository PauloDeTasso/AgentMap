import { execSync } from 'child_process';
import { gatePassed, gateFailed, GateResult } from './types';

export function runLintGate(): GateResult {
  const start = Date.now();
  try {
    execSync('npx eslint src --ext .ts', {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    return gatePassed('Lint', 'Nenhum problema de lint encontrado', Date.now() - start);
  } catch {
    return gateFailed('Lint', 'ESLint encontrou problemas', Date.now() - start);
  }
}
