const { test: setup, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const authFile = path.join(__dirname, "../.auth/user.json");

setup("autenticar como admin", async ({ page }) => {
  // Garante que o diretório .auth existe
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  await page.goto("/");

  // Verifica se caiu na tela de login
  const passwordInput = page.locator('input[type="password"]');

  if (await passwordInput.isVisible()) {
    // Preenche credenciais (usando as mesmas do seed-admin.js)
    await page.fill(
      'input[name="username"], input[name="email"]',
      "adminGusvioli",
    );
    await passwordInput.fill("@Gus1593572846000");

    await page.click('button[type="submit"], button:has-text("Entrar")');

    // Aguarda login completar
    await expect(
      page.getByText(/Dashboard|Sair|Logout/i).first(),
    ).toBeVisible();
  }

  // Salva os cookies/storage para os testes usarem
  await page.context().storageState({ path: authFile });
});
