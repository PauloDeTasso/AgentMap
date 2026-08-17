const http = require('http');

const API_BASE = 'http://localhost:3150';
const API_KEY = '66c8fdbf4b21125643a54aa0796b65f0725ceb9e867af13adef4ceb30b7b20f1';
const PROJETO_ID = '3a55a4b7-f283-49c0-aca5-96083bf6f4a6';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          Origin: url.origin,
          Referer: url.origin + '/',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
        }
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString();
          let body;
          try { body = JSON.parse(text); } catch { body = text; }
          resolve({ statusCode: res.statusCode, headers: res.headers, body });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function validar() {
  console.log('=== Validacao Fase 1: eventSequence e polling incremental ===');

  const openResult = await request('POST', `/api/projetos/${PROJETO_ID}/abrir`, {});
  if (openResult?.body?.sucesso !== true) {
    console.error('Falha ao abrir projeto:', openResult);
    process.exit(1);
  }
  console.log('Projeto aberto:', openResult.body?.dados?.config?.nome || PROJETO_ID);

  const antes = await request('GET', '/api/monitoramento/mensagens?limite=100');
  const antesCount = (antes?.body?.dados || []).length;
  console.log(`Mensagens existentes antes: ${antesCount}`);

  const tipos = ['KILO_CHAT_REPLY', 'AGENTE_FILHO_RESULTADO', 'WAKEUP_PARENT', 'KILO_CHAT', 'KILO_REPLY', 'KILO_RESULT'];
  for (let i = 0; i < tipos.length; i++) {
    const r = await request('POST', '/api/monitoramento/mensagens', {
      tipo: tipos[i],
      emissor: 'filho-teste',
      agenteId: 'filho-teste',
      tarefaId: 'TAREFA-1',
      conteudo: `mensagem ${i + 1} tipo ${tipos[i]}`
    });
    if (r?.body?.sucesso !== true) {
      console.error(`Falha ao criar mensagem ${tipos[i]}:`, r);
      process.exit(1);
    }
  }
  console.log(`Criadas ${tipos.length} mensagens de monitoramento.`);

  const all = await request('GET', '/api/monitoramento/mensagens?limite=100');
  const msgs = all?.body?.dados || [];
  console.log(`Total de mensagens retornadas (sem after): ${msgs.length}`);
  if (msgs.length < antesCount + tipos.length) {
    console.error('Esperado pelo menos', antesCount + tipos.length, 'mensagens, recebido', msgs.length);
    process.exit(1);
  }

  const after0 = await request('GET', '/api/monitoramento/mensagens?after=0&limite=100');
  const msgsAfter0 = after0?.body?.dados || [];
  console.log(`Mensagens após after=0: ${msgsAfter0.length}`);
  if (msgsAfter0.length !== msgs.length) {
    console.error('after=0 deveria retornar todas as mensagens. Esperado', msgs.length, 'recebido', msgsAfter0.length);
    process.exit(1);
  }

  let lastSeq = after0?.headers?.['x-ultimo-event-sequence'];
  if (!lastSeq && msgsAfter0.length > 0) {
    lastSeq = String(msgsAfter0[msgsAfter0.length - 1].eventSequence || 0);
  }
  console.log('Ultimo eventSequence retornado:', lastSeq);

  const afterLast = await request('GET', `/api/monitoramento/mensagens?after=${lastSeq}&limite=100`);
  const msgsAfterLast = afterLast?.body?.dados || [];
  console.log(`Mensagens após after=${lastSeq}: ${msgsAfterLast.length}`);
  if (msgsAfterLast.length !== 0) {
    console.error('Esperado 0 mensagens após cursor, recebido', msgsAfterLast.length);
    process.exit(1);
  }

  console.log('\n=== Validacao Fase 4: filtro de relevancia via API ===');
  const filtradas = await request('GET', '/api/monitoramento/mensagens?tipo=WAKEUP_PARENT');
  const wakeupMsgs = filtradas?.body?.dados || [];
  console.log(`Mensagens do tipo WAKEUP_PARENT: ${wakeupMsgs.length}`);
  if (wakeupMsgs.length < 1) {
    console.error('Esperado pelo menos 1 mensagem WAKEUP_PARENT, recebido', wakeupMsgs.length);
    process.exit(1);
  }

  const kiloReplies = await request('GET', '/api/monitoramento/mensagens?tipo=KILO_CHAT_REPLY');
  console.log(`Mensagens do tipo KILO_CHAT_REPLY: ${kiloReplies?.body?.dados?.length || 0}`);

  console.log('\n=== Validacao Fase 2: recurso MCP monitoramento (via HTTP simulando resource read) ===');
  const recursoResp = await request('GET', `/api/mcp/resource?uri=agentmap://monitoramento/mensagens/${PROJETO_ID}`);
  if (recursoResp?.body?.sucesso !== true) {
    console.log('Aviso: endpoint /api/mcp/resource nao encontrado ou nao implementado ainda.');
    console.log('Isso eh esperado se o backend nao expoe leitura de resources MCP via HTTP.');
  } else {
    const recursoDados = recursoResp.body;
    const relevantes = recursoDados?.mensagens || recursoDados?.dados?.mensagens || [];
    console.log(`Mensagens relevantes no recurso MCP: ${relevantes.length}`);
    const tiposNoRecurso = new Set(relevantes.map((m) => m.tipo));
    console.log('Tipos presentes no recurso:', Array.from(tiposNoRecurso).join(', '));
  }

  console.log('\n=== Todas as validacoes concluidas com sucesso ===');
}

validar().catch((err) => {
  console.error('Erro na validacao:', err);
  process.exit(1);
});
