const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  /* Configura projetos: um para login (setup) e outro para os testes */
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.js/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Usa o estado de autenticação salvo pelo setup
        storageState: ".auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  /* Inicia o servidor localmente se não estiver rodando */
  // webServer: {
  //   command: 'npm start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: true,
  // },
});
