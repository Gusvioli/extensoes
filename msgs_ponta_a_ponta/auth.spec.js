const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const authFile = path.join(__dirname, "../playwright/.auth/admin.json");

test("autenticar como admin via API e salvar estado", async ({ request }) => {
  // Garante que o diretório de auth existe
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Realiza login via API (mais rápido e robusto)
  const response = await request.post("/auth/login", {
    data: {
      username: "adminGusvioli",
      password: "@Gus1593572846000",
    },
  });

  expect(response.ok()).toBeTruthy();
  const responseBody = await response.json();
  expect(responseBody.success).toBeTruthy();

  // Extrair cookies do cabeçalho Set-Cookie para montar o storageState manualmente
  const headers = response.headersArray();
  const cookieHeaders = headers.filter(
    (h) => h.name.toLowerCase() === "set-cookie",
  );
  const cookies = [];

  cookieHeaders.forEach((header) => {
    const [nameVal] = header.value.split(";");
    const [name, value] = nameVal.split("=");
    if (name && value) {
      cookies.push({
        name: name.trim(),
        value: value.trim(),
        domain: "127.0.0.1", // Deve corresponder ao baseURL do playwright.config
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
        expires: Date.now() / 1000 + 86400 * 30,
      });
    }
  });

  // Salva o estado (cookies) para reuso nos outros testes
  const state = {
    cookies,
    origins: [],
  };

  // Adiciona localStorage se necessário (opcional, baseado na resposta do login)
  if (responseBody.user) {
    state.origins.push({
      origin: "http://127.0.0.1:3000",
      localStorage: [
        {
          name: "user_info",
          value: JSON.stringify(responseBody.user),
        },
      ],
    });
  }

  fs.writeFileSync(authFile, JSON.stringify(state, null, 2));
  console.log("✅ Estado de autenticação salvo via API.");
});
