import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';

const TEST_PROJECT_NAME = `E2E_Teste_${Date.now()}`;
const TEST_PROJECT_PATH = `G:\\PROJETOS\\AgenteMap_Projetos\\${TEST_PROJECT_NAME}`;

test.describe('Fluxo Completo do Frontend', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto('/');
  });

  test('deve exibir a tela inicial quando nenhum projeto está aberto', async ({ page }) => {
    await expect(page.locator('.card__titulo, h2')).toContainText(/bem-vindo/i);
    await expect(dashboard.btnCriarProjetoInicial).toBeVisible();
    await expect(dashboard.btnAbrirProjetoInicial).toBeVisible();
  });

  test('deve criar um novo projeto com sucesso', async ({ page }) => {
    await dashboard.criarNovoProjeto({
      nome: TEST_PROJECT_NAME,
      caminho: TEST_PROJECT_PATH,
      descricao: 'Projeto de teste e2e automatizado',
    });

    await expect(dashboard.nomeProjetoAtivo).toContainText(TEST_PROJECT_NAME);
    await expect(page.locator('.nav')).toBeVisible();
  });

  test('deve abrir um projeto existente', async ({ page }) => {
    await dashboard.abrirProjeto(TEST_PROJECT_PATH);

    await expect(page.locator('.nav')).toBeVisible();
    await expect(dashboard.nomeProjetoAtivo).not.toBeEmpty();
  });

  test('deve navegar pelo dashboard e exibir painéis', async ({ page }) => {
    await dashboard.criarNovoProjeto({
      nome: TEST_PROJECT_NAME,
      caminho: TEST_PROJECT_PATH,
    });

    const paineis = ['Agentes', 'Tarefas', 'Contratos', 'Arquivos', 'Estado'];
    for (const painel of paineis) {
      await dashboard.navegarParaPainel(painel);
      await expect(page.locator('main, .main')).toBeVisible();
    }
  });

  test('deve criar um agente no projeto', async ({ page }) => {
    await dashboard.criarNovoProjeto({
      nome: TEST_PROJECT_NAME,
      caminho: TEST_PROJECT_PATH,
    });

    await dashboard.criarAgente({
      id: `AGENTE_E2E_${Date.now()}`,
      nome: 'Agente Teste',
      funcao: 'Testes Automatizados',
      descricao: 'Agente criado via teste e2e',
    });

    await expect(page.locator('#modal-agente')).toHaveCSS('display', 'none');
  });

  test('deve criar uma tarefa no projeto', async ({ page }) => {
    await dashboard.criarNovoProjeto({
      nome: TEST_PROJECT_NAME,
      caminho: TEST_PROJECT_PATH,
    });

    await dashboard.criarTarefa({
      titulo: `Tarefa E2E ${Date.now()}`,
      descricao: 'Descrição da tarefa de teste',
    });

    await expect(page.locator('#modal-tarefa')).toHaveCSS('display', 'none');
  });

  test('deve criar um handoff de transferência', async ({ page }) => {
    await dashboard.criarNovoProjeto({
      nome: TEST_PROJECT_NAME,
      caminho: TEST_PROJECT_PATH,
    });

    await dashboard.criarAgente({
      id: 'AGENTE_ORIGEM',
      nome: 'Agente Origem',
      funcao: 'Origem',
      descricao: 'Agente origem do handoff',
    });

    await dashboard.criarAgente({
      id: 'AGENTE_DESTINO',
      nome: 'Agente Destino',
      funcao: 'Destino',
      descricao: 'Agente destino do handoff',
    });

    await dashboard.criarTarefa({
      titulo: `Tarefa Handoff ${Date.now()}`,
    });

    await dashboard.criarHandoff({
      origem: 'AGENTE_ORIGEM',
      destino: 'AGENTE_DESTINO',
      tarefa: 'Handoff de teste',
    });

    await expect(page.locator('#modal-handoff')).toHaveCSS('display', 'none');
  });

  test('deve fechar o projeto corretamente', async ({ page }) => {
    await dashboard.criarNovoProjeto({
      nome: TEST_PROJECT_NAME,
      caminho: TEST_PROJECT_PATH,
    });

    await page.locator('#btn-fechar-projeto').click();
    await page.locator('#modal-confirmacao').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /confirmar|sim|fechar/i }).click();
    await page.locator('#modal-confirmacao').waitFor({ state: 'hidden' });

    await expect(dashboard.nomeProjetoAtivo).toHaveText('');
  });
});
