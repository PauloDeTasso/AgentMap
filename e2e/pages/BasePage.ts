import { type Page, type Locator, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string = '/') {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForApiStatus(status: 'online' | 'offline' = 'online') {
    const statusEl = this.page.locator('#status-api');
    await statusEl.waitFor({ state: 'visible' });
    if (status === 'online') {
      await expect(statusEl).toContainText('Conectado');
    } else {
      await expect(statusEl).toContainText('Desconectado');
    }
  }

  async openModal(modalId: string) {
    await this.page.locator(`#${modalId}`).waitFor({ state: 'visible' });
  }

  async closeModal(modalId: string) {
    const modal = this.page.locator(`#${modalId}`);
    if (await modal.isVisible()) {
      await modal.locator('.modal__fechar').click();
      await modal.waitFor({ state: 'hidden' });
    }
  }

  async fillInput(id: string, value: string) {
    await this.page.locator(`#${id}`).fill(value);
  }

  async clickButton(text: string | RegExp) {
    await this.page.getByRole('button', { name: text }).click();
  }

  async expectSuccessToast() {
    await this.page.locator('.toast--sucesso, .mensagem--sucesso, [data-toast="sucesso"]').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
  }
}
