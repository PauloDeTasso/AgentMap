import { execSync } from 'child_process';
import { gatePassed, gateFailed, GateResult } from './types';

export function runCoverageGate(): GateResult {
  const start = Date.now();
  try {
    execSync('npx jest --coverage', {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    return gatePassed('Coverage', 'Cobertura mínima atendida', Date.now() - start);
  } catch {
    return gateFailed('Coverage', 'Cobertura abaixo do mínimo', Date.now() - start);
  }
}
