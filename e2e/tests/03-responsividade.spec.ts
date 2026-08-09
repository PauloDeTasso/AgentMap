import { test, expect, devices } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';

const TEST_PROJECT_NAME = `E2E_Resp_${Date.now()}`;
const TEST_PROJECT_PATH = `G:\\PROJETOS\\AgenteMap_Projetos\\${TEST_PROJECT_NAME}`;

test.describe('Responsividade', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
  });

  test.describe('Desktop (1920x1080)', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('deve exibir layout desktop corretamente', async ({ page }) => {
      await dashboard.goto('/');
      await expect(page.locator('.header')).toBeVisible();
      await expect(page.locator('.card')).toBeVisible();
    });
  });

  test.describe('Tablet (768x1024)', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('deve exibir layout tablet corretamente', async ({ page }) => {
      await dashboard.goto('/');
      await expect(page.locator('.header')).toBeVisible();
      await expect(page.locator('.card')).toBeVisible();
    });
  });

  test.describe('Mobile (375x667)', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('deve exibir layout mobile corretamente', async ({ page }) => {
      await dashboard.goto('/');
      await expect(page.locator('.header')).toBeVisible();
      await expect(page.locator('.card')).toBeVisible();
    });

    test('deve permitir criar projeto no mobile', async ({ page }) => {
      await dashboard.criarNovoProjeto({
        nome: TEST_PROJECT_NAME,
        caminho: TEST_PROJECT_PATH,
      });
      await expect(dashboard.nomeProjetoAtivo).toContainText(TEST_PROJECT_NAME);
    });

    test('deve permitir navegação no mobile', async ({ page }) => {
      await dashboard.criarNovoProjeto({
        nome: TEST_PROJECT_NAME,
        caminho: TEST_PROJECT_PATH,
      });
      await dashboard.navegarParaPainel('Agentes');
      await expect(page.locator('main, .main')).toBeVisible();
    });
  });

  test.describe('Landscape Mobile (667x375)', () => {
    test.use({ viewport: { width: 667, height: 375 } });

    test('deve exibir layout landscape mobile corretamente', async ({ page }) => {
      await dashboard.goto('/');
      await expect(page.locator('.header')).toBeVisible();
    });
  });
});
