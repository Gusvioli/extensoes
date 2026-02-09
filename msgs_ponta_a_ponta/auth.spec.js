const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const authFile = path.join(__dirname, "../playwright/.auth/admin.json");

test("autenticar como admin e salvar estado", async ({ page }) => {
  // Garante que o diretório de auth existe
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Acessa a raiz (deve redirecionar para login se não autenticado)
  await page.goto("/");

  // Verifica se estamos na tela de login procurando por um campo de senha
  const passwordInput = page.locator('input[type="password"]');

  if (await passwordInput.isVisible()) {
    console.log("🔐 Realizando login...");

    // Preenche usuário (tenta seletores comuns)
    const userInput = page
      .locator(
        'input[name="username"], input[name="email"], input[type="text"]',
      )
      .first();
    await userInput.fill("adminGusvioli");

    // Preenche senha
    await passwordInput.fill("@Gus1593572846000");

    // Clica no botão de entrar
    const submitBtn = page
      .locator(
        'button[type="submit"], button:has-text("Entrar"), button:has-text("Login")',
      )
      .first();
    await submitBtn.click();

    // Aguarda elemento que confirme o login (ex: título Dashboard ou botão de Sair)
    await expect(page.getByText(/Dashboard|Sair|Logout/i).first()).toBeVisible({
      timeout: 15000,
    });
  }

  // Salva o estado (cookies/localStorage) para reuso nos outros testes
  await page.context().storageState({ path: authFile });
});
