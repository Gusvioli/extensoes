const { test: setup, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

// Caminho onde o estado da autenticação será salvo (definido no playwright.config.js)
const authFile = path.join(__dirname, "../playwright/.auth/admin.json");

setup("autenticar como admin via API e salvar estado", async ({ request }) => {
  // Garante que o diretório de auth existe
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Realiza login via API (mais rápido e robusto para testes de backend)
  const response = await request.post("/auth/login", {
    data: {
      username: "adminGusvioli",
      password: "@Gus1593572846000",
    },
  });

  expect(response.ok()).toBeTruthy();

  // Salva o estado (cookies) para reuso nos outros testes
  await request.storageState({ path: authFile });
});
