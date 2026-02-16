const fs = require("fs");
const path = require("path");

// Carregar variáveis de ambiente
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
  }
} catch (e) {}

const db = require("./database");

async function run() {
  try {
    console.log("🌱 Iniciando seed do usuário admin para testes...");
    await db.init();

    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "@admin123";

    const existing = await db.getUserByUsername(username);
    if (existing) {
      console.log(
        `✅ Usuário ${username} já existe. Atualizando permissões...`,
      );
      existing.password = db.hashPassword(password);
      existing.role = "admin";
      await db.saveUser(existing);
    } else {
      console.log(`👤 Criando usuário ${username}...`);
      await db.saveUser({
        id: `user-admin-test-${Date.now()}`,
        username,
        password: db.hashPassword(password),
        name: "Admin Test",
        email: "admin@test.com",
        role: "admin",
        createdAt: new Date().toISOString(),
        isVerified: true,
      });
    }
    console.log("✅ Seed concluído com sucesso.");
    process.exit(0);
  } catch (e) {
    console.error("❌ Erro ao criar usuário admin:", e);
    process.exit(1);
  }
}

run();
