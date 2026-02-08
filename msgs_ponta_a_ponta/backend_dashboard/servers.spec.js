const { test, expect } = require("@playwright/test");

// Nomes únicos para evitar colisão com dados existentes no banco
const TIMESTAMP = Date.now();
const SERVER_A = `Server A ${TIMESTAMP}`;
const SERVER_B = `Server B ${TIMESTAMP}`;

test.describe("Validação de Duplicidade de Servidores", () => {
  // Reutiliza o estado de autenticação do admin (gerado pelo auth.spec.js)
  test.use({ storageState: "playwright/.auth/admin.json" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Deve impedir a criação de servidor com nome duplicado", async ({
    page,
  }) => {
    // 1. Criar o primeiro servidor (SERVER_A)
    await page.getByRole("button", { name: "Adicionar Novo Servidor" }).click();
    await page.fill("#server-name", SERVER_A);
    await page.fill("#server-host", "127.0.0.1");
    await page.fill("#server-port", "5001");
    await page.fill("#server-token", "token-test-a");
    await page.click('button[type="submit"]');

    // Esperar sucesso
    await expect(page.locator(".toast.success")).toBeVisible();
    await expect(
      page.locator(".server-card", { hasText: SERVER_A }),
    ).toBeVisible();

    // 2. Tentar criar outro servidor com o MESMO nome (SERVER_A)
    await page.getByRole("button", { name: "Adicionar Novo Servidor" }).click();
    await page.fill("#server-name", SERVER_A); // Nome duplicado
    await page.fill("#server-host", "127.0.0.1");
    await page.fill("#server-port", "5002"); // Porta diferente (para isolar teste de nome)
    await page.fill("#server-token", "token-test-b");
    await page.click('button[type="submit"]');

    // Verificar erro de duplicidade
    const toastError = page.locator(".toast.error");
    await expect(toastError).toBeVisible();
    await expect(toastError).toContainText(
      `Já existe um servidor com o nome '${SERVER_A}'`,
    );

    // Fechar modal
    await page.click("#close-server-modal-btn");
  });

  test("Deve impedir a edição de servidor para um nome já existente", async ({
    page,
  }) => {
    // 1. Criar um segundo servidor (SERVER_B)
    await page.getByRole("button", { name: "Adicionar Novo Servidor" }).click();
    await page.fill("#server-name", SERVER_B);
    await page.fill("#server-host", "127.0.0.1");
    await page.fill("#server-port", "5003");
    await page.fill("#server-token", "token-test-b");
    await page.click('button[type="submit"]');

    await expect(
      page.locator(".server-card", { hasText: SERVER_B }),
    ).toBeVisible();

    // 2. Tentar editar SERVER_B para ter o nome de SERVER_A
    const cardB = page.locator(".server-card", { hasText: SERVER_B });
    await cardB.getByRole("button", { name: "Editar" }).click();

    await page.fill("#server-name", SERVER_A); // Nome do primeiro servidor
    await page.click('button[type="submit"]');

    // Verificar erro de duplicidade na edição
    const toastError = page.locator(".toast.error");
    await expect(toastError).toBeVisible();
    await expect(toastError).toContainText(
      `Já existe outro servidor com o nome '${SERVER_A}'`,
    );

    // Fechar modal
    await page.click("#close-server-modal-btn");
  });

  // Limpeza após os testes
  test.afterAll(async ({ request }) => {
    const response = await request.get("/api/servers");
    const data = await response.json();

    const serversToDelete = data.servers.filter(
      (s) => s.name === SERVER_A || s.name === SERVER_B,
    );

    for (const server of serversToDelete) {
      await request.delete("/api/servers", {
        data: { id: server.id },
      });
    }
  });
});
