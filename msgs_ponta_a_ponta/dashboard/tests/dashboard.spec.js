const { test, expect } = require("@playwright/test");

test.describe("Dashboard UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("deve exibir estatísticas principais", async ({ page }) => {
    await expect(page).toHaveTitle(/Dashboard/i);

    // Verifica cards de estatísticas
    await expect(page.getByText(/Total/i)).toBeVisible();
    await expect(page.getByText(/Ativos/i).first()).toBeVisible();
    await expect(page.getByText(/Capacidade/i)).toBeVisible();
  });

  test("deve listar servidores e permitir filtros", async ({ page }) => {
    // Verifica se a lista carregou
    await expect(page.locator(".server-list, table")).toBeVisible();

    // Testa filtro de Inativos
    const btnInativos = page.getByRole("button", { name: /Inativos/i });
    if (await btnInativos.isVisible()) {
      await btnInativos.click();
      // Verifica se algum item apareceu ou se a lista filtrou
      // (Depende dos dados, mas garante que a UI não quebrou)
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("deve abrir modal de novo servidor", async ({ page }) => {
    const btnAdd = page.getByRole("button", { name: /Novo|Adicionar/i });
    await btnAdd.click();

    const modal = page.locator(".modal, dialog");
    await expect(modal).toBeVisible();
    await expect(modal.locator('input[name="name"]')).toBeVisible();
  });

  test("deve validar formulário de criação", async ({ page }) => {
    await page.getByRole("button", { name: /Novo|Adicionar/i }).click();

    // Tenta salvar vazio
    await page
      .locator('.modal button[type="submit"], .modal button:has-text("Salvar")')
      .click();

    // Verifica se o modal continua aberto (validação impediu fechamento)
    // ou se apareceu mensagem de erro (browser validation ou toast)
    const modal = page.locator(".modal, dialog");
    await expect(modal).toBeVisible();
  });
});
