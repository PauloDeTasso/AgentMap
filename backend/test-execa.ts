import { execa } from 'execa';

async function test() {
  const kiloCmd = 'C:\\Users\\Administrator\\AppData\\Roaming\\npm\\kilo.cmd';
  const args = [
    'run',
    '--agent', 'orchestrator',
    '--dir', 'G:\\PROJETOS\\AgenteMap_Projetos\\PAGINA_PESSOAL',
    '--format', 'json',
    'Responda apenas: TESTE_EXEC_OK'
  ];

  console.log('Executando:', kiloCmd, args.join(' '));

  try {
    const result = await execa(kiloCmd, args, {
      cwd: 'G:\\PROJETOS\\AgenteMap_Projetos\\PAGINA_PESSOAL',
      timeout: 30000,
      env: { ...process.env, NODE_ENV: 'production' }
    });

    console.log('SUCESSO');
    console.log('stdout:', result.stdout.substring(0, 300));
    console.log('stderr:', result.stderr.substring(0, 300));
    console.log('exitCode:', result.exitCode);
  } catch (e: any) {
    console.log('ERRO:', e.message);
    console.log('exitCode:', e.exitCode);
    if (e.stdout) console.log('stdout:', e.stdout.substring(0, 300));
    if (e.stderr) console.log('stderr:', e.stderr.substring(0, 300));
  }
}

test();
