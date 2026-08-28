import { execSync } from 'child_process';
import { gatePassed, gateFailed, GateResult } from './types';

export function runTestGate(): GateResult {
  const start = Date.now();
  try {
    execSync('npx jest', {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    return gatePassed('Test', 'Todos os testes passaram', Date.now() - start);
  } catch {
    return gateFailed('Test', 'Alguns testes falharam', Date.now() - start);
  }
}
