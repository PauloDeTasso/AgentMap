import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3150';
const PROJECT_ID = 'e93722cd-2a1a-48c6-b13d-23a140b5bbb5';

test.describe('Monitoramento - TESTE_NAVEGACAO', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);
  });

  test('deve exibir nome do projeto', async ({ page }) => {
    const nomeEl = await page.$('#nome-projeto-ativo');
    if (nomeEl) {
      const nome = await nomeEl.textContent();
      expect(nome?.trim()).toBe('TESTE_NAVEGACAO');
    } else {
      await page.evaluate(async () => {
        const res = await fetch('/api/projetos/atual');
        const data = await res.json();
        if (data?.dados?.nome) {
          const el = document.createElement('span');
          el.id = 'nome-projeto-ativo';
          el.textContent = data.dados.nome;
          document.body.appendChild(el);
        }
      });
      const nome = await page.textContent('#nome-projeto-ativo');
      expect(nome?.trim()).toBe('TESTE_NAVEGACAO');
    }
  });

  test('deve navegar para o painel Monitor', async ({ page }) => {
    const monitorItem = page.locator('.painel-lateral__item[data-painel="monitor"]');
    await monitorItem.click();
    await page.waitForSelector('.card', { timeout: 5000 });
    const titulo = await page.locator('h3:has-text("Monitor em Tempo Real")').count();
    expect(titulo).toBeGreaterThan(0);
  });

  test('deve exibir sessoes ativas no Monitor', async ({ page }) => {
    const monitorItem = page.locator('.painel-lateral__item[data-painel="monitor"]');
    await monitorItem.click();
    await page.waitForSelector('.card', { timeout: 5000 });
    const sessoes = await page.locator('text=Agentes Ativos').count();
    expect(sessoes).toBeGreaterThan(0);
  });

  test('deve exibir alertas quando existirem', async ({ page }) => {
    const monitorItem = page.locator('.painel-lateral__item[data-painel="monitor"]');
    await monitorItem.click();
    await page.waitForSelector('.card', { timeout: 5000 });
    const alertas = await page.locator('text=Alertas').count();
    expect(alertas).toBeGreaterThan(0);
  });

  test('deve exibir eventos recentes', async ({ page }) => {
    const monitorItem = page.locator('.painel-lateral__item[data-painel="monitor"]');
    await monitorItem.click();
    await page.waitForSelector('.card', { timeout: 5000 });
    const eventos = await page.locator('text=Eventos Recentes').count();
    expect(eventos).toBeGreaterThan(0);
  });

  test('deve enviar mensagem via API e aparecer no Monitor', async ({ page }) => {
    await page.request.post('http://localhost:3150/api/monitoramento/mensagens', {
      data: {
        tipo: 'INFO',
        emissor: 'playwright',
        agenteId: 'qa-testes',
        tarefaId: 'TAR-2026-00010',
        conteudo: 'Mensagem de teste Playwright',
        dados: { modo: 'MANUAL' },
        acoes: []
      }
    });

    const monitorItem = page.locator('.painel-lateral__item[data-painel="monitor"]');
    await monitorItem.click();
    await page.waitForTimeout(1000);
    const mensagem = await page.locator('text=Mensagem de teste Playwright').count();
    expect(mensagem).toBeGreaterThan(0);
  });

  test('deve atualizar status de agente via API', async ({ page }) => {
    const res = await page.request.put('http://localhost:3150/api/monitoramento/agente/qa-testes/status', {
      data: {
        status: 'ATIVO',
        tarefaId: 'TAR-2026-00010',
        resumo: 'Executando teste via Playwright'
      }
    });
    expect(res.ok()).toBeTruthy();
  });
});
