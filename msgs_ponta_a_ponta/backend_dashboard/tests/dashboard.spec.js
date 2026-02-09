const { test, expect } = require("@playwright/test");

test.describe("Dashboard Frontend UI (Autenticado)", () => {
  // Usa o estado de autenticação salvo (admin.json)

  test.beforeEach(async ({ page }) => {
    // Garante que estamos na página do dashboard antes de cada teste
    await page.goto("/");
  });

  test("Deve carregar a interface principal e estatísticas", async ({
    page,
  }) => {
    // Verifica se o título da página ou cabeçalho principal está visível
    await expect(page).toHaveTitle(/Dashboard/i);

    // Verifica cards de estatísticas
    await expect(page.getByText(/Total/i)).toBeVisible();
    await expect(page.getByText(/Ativos/i).first()).toBeVisible();
    await expect(page.getByText(/Capacidade/i)).toBeVisible();
  });

  test("Deve exibir a lista de servidores na tabela", async ({ page }) => {
    // Verifica se existe pelo menos um elemento de servidor na lista
    await expect(
      page.getByText(/Servidor de Desenvolvimento Local/i).first(),
    ).toBeVisible();

    // Verifica status
    await expect(
      page
        .locator(".status, .badge, span")
        .filter({ hasText: /active|ativo/i })
        .first(),
    ).toBeVisible();
  });

  test("Deve permitir filtrar servidores", async ({ page }) => {
    const btnInativos = page.getByRole("button", { name: /Inativos/i });
    await expect(btnInativos).toBeVisible();
    await btnInativos.click();
    await expect(page.getByText(/Servidor de Teste Local/i)).toBeVisible();
  });

  test("Deve abrir o modal de Novo Servidor ao clicar no botão", async ({
    page,
  }) => {
    // Procura um botão que contenha "Novo", "Adicionar" ou "Criar"
    const btnAdd = page.getByRole("button", {
      name: /Novo Servidor|Adicionar|Criar/i,
    });
    await btnAdd.click();

    // Verifica se o modal apareceu
    const modal = page.locator(".modal, dialog, #modal-server");
    await expect(modal).toBeVisible();

    // Verifica se campos do formulário estão visíveis
    await expect(modal.locator('input[name="name"]')).toBeVisible();
    await expect(modal.locator('input[name="host"]')).toBeVisible();
  });

  test("Deve criar um novo servidor preenchendo o formulário via UI", async ({
    page,
  }) => {
    // 1. Abrir o modal
    await page
      .getByRole("button", { name: /Novo Servidor|Adicionar|Criar/i })
      .click();
    const modal = page.locator(".modal, dialog, #modal-server");
    await expect(modal).toBeVisible();

    // 2. Preencher os campos do formulário
    // Usa seletores robustos baseados no atributo 'name' dos inputs HTML
    await modal.locator('input[name="name"]').fill("Servidor Frontend Teste");
    await modal.locator('input[name="host"]').fill("frontend.test.local");

    // Verifica se o campo de porta existe antes de preencher (caso seja opcional ou oculto)
    const portInput = modal.locator('input[name="port"]');
    if (await portInput.isVisible()) {
      await portInput.fill("9090");
    }

    // 3. Clicar no botão de salvar dentro do modal
    await modal
      .getByRole("button", { name: /Salvar|Confirmar|Criar/i })
      .click();

    // 4. Validação Visual
    // O modal deve fechar
    await expect(modal).not.toBeVisible();

    // O novo servidor deve aparecer na lista (tabela ou cards)
    // Aguarda o elemento aparecer na tela
    await expect(page.getByText("Servidor Frontend Teste")).toBeVisible();
    await expect(page.getByText("frontend.test.local")).toBeVisible();
  });
});

test.describe("Dashboard Public UI (Sem Auth)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("Deve redirecionar para login ao tentar acessar dashboard sem token", async ({
    page,
  }) => {
    await page.goto("/");
    // Espera ser redirecionado para login
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
