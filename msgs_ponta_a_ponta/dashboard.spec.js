const { test, expect } = require("@playwright/test");

test.describe("Dashboard Frontend", () => {
  test.beforeEach(async ({ page }) => {
    // A autenticação já foi tratada pelo projeto 'setup'
    await page.goto("/");
  });

  test("deve carregar a interface principal e estatísticas", async ({
    page,
  }) => {
    // Verifica título da página
    await expect(page).toHaveTitle(/Dashboard/i);

    // Verifica se os cards de estatísticas estão visíveis
    // Baseado no README: "Estatísticas - Total, ativos, inativos, capacidade"
    await expect(page.getByText(/Total de Servidores/i)).toBeVisible();
    await expect(page.getByText(/Ativos/i).first()).toBeVisible();
    await expect(page.getByText(/Capacidade/i)).toBeVisible();
  });

  test("deve listar os servidores configurados", async ({ page }) => {
    // Verifica se existe pelo menos um elemento de servidor na lista
    // Procurando por um servidor conhecido do seed (servers-config.example.json)
    const serverName = page
      .getByText(/Servidor de Desenvolvimento Local/i)
      .first();
    await expect(serverName).toBeVisible();

    // Verifica se o status está visível (badge ou texto)
    const statusBadge = page
      .locator(".status, .badge, span")
      .filter({ hasText: /active|ativo/i })
      .first();
    await expect(statusBadge).toBeVisible();
  });

  test("deve permitir filtrar servidores", async ({ page }) => {
    // Localiza botões de filtro
    const btnAtivos = page.getByRole("button", { name: /Ativos/i });
    const btnInativos = page.getByRole("button", { name: /Inativos/i });

    await expect(btnAtivos).toBeVisible();
    await expect(btnInativos).toBeVisible();

    // Clica no filtro de inativos
    await btnInativos.click();

    // Verifica se a lista mudou (ex: "Servidor de Teste Local" é inativo no exemplo)
    await expect(page.getByText(/Servidor de Teste Local/i)).toBeVisible();
  });

  test("deve exibir modal de adicionar servidor", async ({ page }) => {
    // Botão de adicionar (geralmente tem ícone + ou texto Adicionar/Novo)
    const btnAdd = page.getByRole("button", { name: /Adicionar|Novo/i });
    await expect(btnAdd).toBeVisible();

    await btnAdd.click();

    // Verifica se o modal abriu procurando por campos do formulário
    await expect(
      page.getByRole("dialog").or(page.locator(".modal")),
    ).toBeVisible();
    await expect(page.locator('input[name="name"], input#name')).toBeVisible();
  });
});
