import { runTypecheckGate } from './TypecheckGate';
import { runLintGate } from './LintGate';
import { runTestGate } from './TestGate';
import { runCoverageGate } from './CoverageGate';

const gates = [
  { name: 'Typecheck', run: runTypecheckGate },
  { name: 'Lint', run: runLintGate },
  { name: 'Test', run: runTestGate },
  { name: 'Coverage', run: runCoverageGate }
];

let failed = 0;

console.log('\n========================================');
console.log('  Quality Gates');
console.log('========================================\n');

for (const gate of gates) {
  process.stdout.write(`[gate] Running ${gate.name}... `);
  const result = gate.run();
  console.log(result.passed ? '✅ PASS' : '❌ FAIL');
  console.log(`       ${result.message} (${result.durationMs}ms)`);
  if (!result.passed) {
    failed++;
  }
}

console.log('\n========================================');
if (failed === 0) {
  console.log('  Todos os gates passaram ✅');
  console.log('========================================\n');
  process.exit(0);
} else {
  console.log(`  ${failed} gate(s) falharam ❌`);
  console.log('========================================\n');
  process.exit(1);
}
