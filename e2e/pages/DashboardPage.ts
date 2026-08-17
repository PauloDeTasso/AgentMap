import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly btnCriarProjetoInicial: Locator;
  readonly btnAbrirProjetoInicial: Locator;
  readonly btnNovoProjeto: Locator;
  readonly btnAbrirProjeto: Locator;
  readonly modalNovoProjeto: Locator;
  readonly modalAbrirProjeto: Locator;
  readonly sidebar: Locator;
  readonly nomeProjetoAtivo: Locator;

  constructor(page: Page) {
    super(page);
    this.btnCriarProjetoInicial = page.locator('#btn-criar-projeto-inicial');
    this.btnAbrirProjetoInicial = page.locator('#btn-abrir-projeto-inicial');
    this.btnNovoProjeto = page.locator('#btn-criar-projeto');
    this.btnAbrirProjeto = page.locator('#btn-abrir-projeto');
    this.modalNovoProjeto = page.locator('#modal-novo-projeto');
    this.modalAbrirProjeto = page.locator('#modal-abrir-projeto');
    this.sidebar = page.locator('.sidebar, .nav-projetos, [data-painel]');
    this.nomeProjetoAtivo = page.locator('#nome-projeto-ativo');
  }

  async criarNovoProjeto(dados: { nome: string; caminho: string; descricao?: string }) {
    await this.btnCriarProjetoInicial.click();
    await this.openModal('modal-novo-projeto');
    await this.fillInput('nome-projeto', dados.nome);
    await this.fillInput('caminho-parental', dados.caminho);
    if (dados.descricao) {
      await this.fillInput('descricao-projeto', dados.descricao);
    }
    await this.page.getByRole('button', { name: 'Criar' }).click();
    await this.modalNovoProjeto.waitFor({ state: 'hidden' });
    await this.waitForApiStatus('online');
  }

  async abrirProjeto(caminho: string) {
    await this.btnAbrirProjetoInicial.click();
    await this.openModal('modal-abrir-projeto');
    await this.fillInput('caminho-abrir', caminho);
    await this.page.getByRole('button', { name: 'Abrir' }).click();
    await this.modalAbrirProjeto.waitFor({ state: 'hidden' });
    await this.nomeProjetoAtivo.waitFor({ state: 'visible' });
  }

  async navegarParaPainel(painel: string) {
    const painelBtn = this.page.locator(`[data-painel="${painel}"]`);
    if (await painelBtn.count() > 0) {
      await painelBtn.click();
    } else {
      await this.page.getByRole('button', { name: new RegExp(painel, 'i') }).click();
    }
    await this.page.waitForTimeout(500);
  }

  async abrirModalAgente() {
    await this.navegarParaPainel('Agentes');
    await this.page.waitForTimeout(300);
    const btnNovoAgente = this.page.locator('#btn-novo-agente, button:has-text("Novo Agente"), button:has-text("Criar Agente")');
    if (await btnNovoAgente.count() > 0) {
      await btnNovoAgente.click();
    } else {
      await this.page.getByRole('button', { name: /agente/i }).first().click();
    }
    await this.page.locator('#modal-agente').waitFor({ state: 'visible' });
  }

  async criarAgente(dados: { id: string; nome: string; funcao: string; descricao: string }) {
    await this.abrirModalAgente();
    await this.fillInput('agente-id-input', dados.id);
    await this.fillInput('agente-nome', dados.nome);
    await this.fillInput('agente-funcao', dados.funcao);
    await this.fillInput('agente-descricao', dados.descricao);
    await this.page.getByRole('button', { name: /criar|salvar/i }).click();
    await this.page.locator('#modal-agente').waitFor({ state: 'hidden' });
  }

  async abrirModalTarefa() {
    await this.navegarParaPainel('Tarefas');
    await this.page.waitForTimeout(300);
    const btnNovaTarefa = this.page.locator('button:has-text("Nova Tarefa"), button:has-text("Criar Tarefa")');
    if (await btnNovaTarefa.count() > 0) {
      await btnNovaTarefa.click();
    } else {
      await this.page.getByRole('button', { name: /tarefa/i }).first().click();
    }
    await this.page.locator('#modal-tarefa').waitFor({ state: 'visible' });
  }

  async criarTarefa(dados: { titulo: string; descricao?: string }) {
    await this.abrirModalTarefa();
    await this.fillInput('tarefa-titulo', dados.titulo);
    if (dados.descricao) {
      await this.fillInput('tarefa-descricao', dados.descricao);
    }
    await this.page.getByRole('button', { name: /criar|salvar/i }).click();
    await this.page.locator('#modal-tarefa').waitFor({ state: 'hidden' });
  }

  async abrirModalHandoff() {
    await this.navegarParaPainel('Handoffs');
    await this.page.waitForTimeout(300);
    const btnNovo = this.page.locator('button:has-text("Novo Handoff"), button:has-text("Criar Handoff"), button:has-text("Nova Transferência")');
    if (await btnNovo.count() > 0) {
      await btnNovo.click();
    } else {
      await this.page.getByRole('button', { name: /handoff|transferência/i }).first().click();
    }
    await this.page.locator('#modal-handoff').waitFor({ state: 'visible' });
  }

  async criarHandoff(dados: { origem: string; destino: string; tarefa: string }) {
    await this.abrirModalHandoff();
    const selects = this.page.locator('select');
    const count = await selects.count();
    if (count >= 2) {
      await selects.nth(0).selectOption({ value: dados.origem });
      await selects.nth(1).selectOption({ value: dados.destino });
    }
    await this.fillInput('handoff-tarefa', dados.tarefa);
    await this.page.getByRole('button', { name: /criar|salvar|enviar/i }).click();
    await this.page.locator('#modal-handoff').waitFor({ state: 'hidden' });
  }
}
