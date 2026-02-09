const { test, expect } = require("@playwright/test");

test.describe("API de Servidores", () => {
  test("deve listar servidores", async ({ request }) => {
    const response = await request.get("/api/servers");
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty("servers");
    expect(Array.isArray(data.servers)).toBeTruthy();
  });

  test("deve criar, atualizar e deletar um servidor", async ({ request }) => {
    const serverId = `test-server-${Date.now()}`;
    const newServer = {
      id: serverId,
      name: "Servidor de Teste Playwright",
      host: "playwright.test",
      port: 3000,
      protocol: "ws",
      status: "active",
      maxClients: 100,
      token: "test-token-123",
    };

    // Criar
    const createRes = await request.post("/api/servers", { data: newServer });
    expect(createRes.ok()).toBeTruthy();
    const createData = await createRes.json();
    expect(createData.success).toBeTruthy();

    // Atualizar
    const updateRes = await request.put("/api/servers", {
      data: { ...newServer, name: "Servidor Atualizado Playwright" },
    });
    expect(updateRes.ok()).toBeTruthy();
    const updateData = await updateRes.json();
    expect(updateData.server.name).toBe("Servidor Atualizado Playwright");

    // Deletar
    const deleteRes = await request.delete("/api/servers", {
      data: { id: serverId },
    });
    expect(deleteRes.ok()).toBeTruthy();

    // Verificar deleção
    const listRes = await request.get("/api/servers");
    expect(listRes.ok()).toBeTruthy();
    const listData = await listRes.json();
    const found = listData.servers.find((s) => s.id === serverId);
    expect(found).toBeUndefined();
  });
});
