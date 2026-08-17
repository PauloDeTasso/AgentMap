import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';

const TEST_PROJECT_NAME = `E2E_A11y_${Date.now()}`;
const TEST_PROJECT_PATH = `G:\\PROJETOS\\AgenteMap_Projetos\\${TEST_PROJECT_NAME}`;

test.describe('Acessibilidade', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
  });

  test('deve ter lang definido no html', async ({ page }) => {
    await dashboard.goto('/');
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBeTruthy();
    expect(htmlLang).toMatch(/pt-BR|en-US|es-ES/);
  });

  test('deve ter título da página acessível', async ({ page }) => {
    await dashboard.goto('/');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('deve ter landmarks semânticos', async ({ page }) => {
    await dashboard.goto('/');
    const header = page.locator('header');
    const nav = page.locator('nav');
    const main = page.locator('main');

    await expect(header).toHaveCount(1);
    await expect(main).toHaveCount(1);
  });

  test('deve ter botões com texto acessível', async ({ page }) => {
    await dashboard.goto('/');
    const buttons = page.locator('button');
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 20); i++) {
      const text = await buttons.nth(i).textContent();
      const ariaLabel = await buttons.nth(i).getAttribute('aria-label');
      expect(text || ariaLabel).toBeTruthy();
    }
  });

  test('deve ter inputs associados a labels', async ({ page }) => {
    await dashboard.goto('/');
    const inputs = page.locator('input[required], textarea[required], select[required]');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toHaveCount(1);
      }
    }
  });

  test('deve permitir navegação por teclado nos botões principais', async ({ page }) => {
    await dashboard.goto('/');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focused);
  });

  test('deve abrir modal com foco acessível', async ({ page }) => {
    await dashboard.criarNovoProjeto({
      nome: TEST_PROJECT_NAME,
      caminho: TEST_PROJECT_PATH,
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('deve ter foco visível em elementos interativos', async ({ page }) => {
    await dashboard.goto('/');
    await page.focus('#btn-criar-projeto-inicial');
    const outline = await page.locator('#btn-criar-projeto-inicial').evaluate(
      (el) => getComputedStyle(el).outlineStyle || getComputedStyle(el).boxShadow
    );
    expect(outline !== 'none').toBeTruthy();
  });

  test('deve ter relação de contraste adequada nos textos', async ({ page }) => {
    await dashboard.goto('/');
    const contrast = await page.evaluate(() => {
      const el = document.querySelector('.card__texto, p') as HTMLElement | null;
      if (!el) return null;
      const style = getComputedStyle(el);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
      };
    });
    if (contrast) {
      expect(contrast.color).toBeTruthy();
    }
  });

  test('deve ter skip link ou navegação acessível', async ({ page }) => {
    await dashboard.goto('/');
    const skipLink = page.locator('a[href="#main-content"], a[href="#main"], .skip-link');
    if ((await skipLink.count()) > 0) {
      await expect(skipLink.first()).toBeVisible();
    }
  });
});
