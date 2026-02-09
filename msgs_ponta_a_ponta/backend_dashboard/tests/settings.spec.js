const { test, expect } = require("@playwright/test");

test.describe("API de Configurações", () => {
  test("deve obter e atualizar configurações", async ({ request }) => {
    // Obter
    const getRes = await request.get("/api/settings");
    expect(getRes.ok()).toBeTruthy();
    const settings = await getRes.json();

    // Atualizar
    const newSettings = {
      ...settings,
      test_setting_playwright: "valor-teste",
    };

    const updateRes = await request.post("/api/settings", {
      data: newSettings,
    });
    expect(updateRes.ok()).toBeTruthy();

    // Verificar
    const verifyRes = await request.get("/api/settings");
    const verifyData = await verifyRes.json();
    expect(verifyData.test_setting_playwright).toBe("valor-teste");
  });
});
