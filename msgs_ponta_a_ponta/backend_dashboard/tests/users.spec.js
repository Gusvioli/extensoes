const { test, expect } = require("@playwright/test");

test.describe("API de Usuários", () => {
  test("deve listar usuários", async ({ request }) => {
    const response = await request.get("/api/users");
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const users = Array.isArray(data) ? data : data.users;
    expect(Array.isArray(users)).toBeTruthy();
  });

  test("deve criar e deletar um usuário", async ({ request }) => {
    const timestamp = Date.now();
    const newUser = {
      username: `user_test_${timestamp}`,
      password: "Password123!",
      name: "Usuário Teste Playwright",
      email: `test_${timestamp}@example.com`,
      role: "user",
    };

    // Criar
    const createRes = await request.post("/api/users", { data: newUser });
    expect(createRes.ok()).toBeTruthy();
    const createData = await createRes.json();
    expect(createData.success).toBeTruthy();

    // Verificar existência
    const listRes = await request.get("/api/users");
    expect(listRes.ok()).toBeTruthy();
    const listData = await listRes.json();
    const users = Array.isArray(listData) ? listData : listData.users;
    const createdUser = users.find((u) => u.username === newUser.username);
    expect(createdUser).toBeDefined();
    expect(createdUser.name).toBe(newUser.name);

    // Deletar
    const deleteRes = await request.delete("/api/users", {
      data: { id: createdUser.id },
    });
    expect(deleteRes.ok()).toBeTruthy();
  });
});
