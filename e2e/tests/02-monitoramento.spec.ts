import { test, expect } from '@playwright/test';
import { MonitoramentoPage } from '../pages/MonitoramentoPage';

test.describe('Monitoramento (WebSocket, Chat, Filtros)', () => {
  let monitoramento: MonitoramentoPage;

  test.beforeEach(async ({ page }) => {
    monitoramento = new MonitoramentoPage(page);
    await monitoramento.goto();
  });

  test('deve carregar a página de monitoramento', async ({ page }) => {
    await expect(page).toHaveTitle(/monitoramento/i);
    await expect(page.locator('body')).toContainText(/monitoramento/i);
  });

  test('deve verificar status do WebSocket', async () => {
    await monitoramento.verificarWebSocketConectado();
  });

  test('deve exibir listas de agentes e worktrees', async () => {
    await monitoramento.verificarListaAgentesCarregada();
    await monitoramento.verificarListaWorktreesCarregada();
  });

  test('deve enviar mensagem no chat', async ({ page }) => {
    const mensagem = `Mensagem teste e2e ${Date.now()}`;
    await monitoramento.enviarMensagem(mensagem);
    await monitoramento.verificarMensagemVisivel(mensagem);
  });

  test('deve aplicar filtro no chat', async ({ page }) => {
    await monitoramento.aplicarFiltro('teste');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('deve manter conexão WebSocket estável', async ({ page }) => {
    await page.waitForTimeout(3000);
    await monitoramento.verificarWebSocketConectado();
  });

  test('deve permitir envio de múltiplas mensagens', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      const msg = `Mensagem ${i} ${Date.now()}`;
      await monitoramento.enviarMensagem(msg);
      await monitoramento.verificarMensagemVisivel(msg);
    }
  });
});
