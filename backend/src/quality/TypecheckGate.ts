import { execSync } from 'child_process';
import { gatePassed, gateFailed, GateResult } from './types';

export function runTypecheckGate(): GateResult {
  const start = Date.now();
  try {
    execSync('npx tsc --noEmit', {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    return gatePassed('Typecheck', 'TypeScript compila sem erros', Date.now() - start);
  } catch {
    return gateFailed('Typecheck', 'TypeScript encontrou erros de tipo', Date.now() - start);
  }
}
