import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class MonitoramentoPage extends BasePage {
  readonly wsStatus: Locator;
  readonly chatMessages: Locator;
  readonly chatInput: Locator;
  readonly chatSendBtn: Locator;
  readonly filterInput: Locator;
  readonly agentesList: Locator;
  readonly worktreesList: Locator;

  constructor(page: Page) {
    super(page);
    this.wsStatus = page.locator('#ws-status, .ws-status, [data-status="websocket"]');
    this.chatMessages = page.locator('#chat-messages, .chat-messages, [data-chat="mensagens"]');
    this.chatInput = page.locator('#chat-input, input[placeholder*="mensagem" i], input[placeholder*="chat" i]');
    this.chatSendBtn = page.locator('#btn-enviar-chat, button[aria-label*="enviar" i], button:has-text("Enviar")');
    this.filterInput = page.locator('#filtro-chat, input[placeholder*="filtro" i], input[placeholder*="filtrar" i]');
    this.agentesList = page.locator('#lista-agentes, .agentes-list, [data-list="agentes"]');
    this.worktreesList = page.locator('#lista-worktrees, .worktrees-list, [data-list="worktrees"]');
  }

  async goto() {
    await this.page.goto('/monitoramento.html');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  async verificarWebSocketConectado() {
    const statusLocator = this.wsStatus;
    const count = await statusLocator.count();
    if (count > 0) {
      await expect(statusLocator.first()).toContainText(/conectado|online|ativo/i);
    } else {
      await expect(this.page.locator('body')).toContainText(/monitoramento/i);
    }
  }

  async enviarMensagem(texto: string) {
    if (await this.chatInput.count() > 0) {
      await this.chatInput.fill(texto);
      await this.chatSendBtn.click();
    } else {
      await this.page.keyboard.type(texto);
      await this.page.keyboard.press('Enter');
    }
    await this.page.waitForTimeout(500);
  }

  async verificarMensagemVisivel(texto: string) {
    const msg = this.page.locator(`:has-text("${texto}")`);
    await msg.waitFor({ state: 'visible', timeout: 10000 });
  }

  async aplicarFiltro(texto: string) {
    if (await this.filterInput.count() > 0) {
      await this.filterInput.fill(texto);
      await this.page.waitForTimeout(500);
    }
  }

  async verificarListaAgentesCarregada() {
    const list = this.agentesList;
    if (await list.count() > 0) {
      await expect(list.first()).not.toBeEmpty();
    }
  }

  async verificarListaWorktreesCarregada() {
    const list = this.worktreesList;
    if (await list.count() > 0) {
      await expect(list.first()).not.toBeEmpty();
    }
  }
}
