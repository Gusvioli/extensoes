const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  // Procura por arquivos .spec.js
  testMatch: "**/*.spec.js",
  /* Rodar testes em paralelo */
  fullyParallel: true,
  /* Reporter para ver resultados no terminal */
  reporter: [["list"], ["html"]],
  use: {
    /* URL base para page.goto e request */
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  /* Iniciar o servidor de desenvolvimento antes dos testes */
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:3000/api/hello",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.spec\.js/,
    },
    {
      name: "e2e",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/admin.json",
      },
      dependencies: ["setup"],
      testIgnore: /auth\.spec\.js/,
    },
  ],
});
