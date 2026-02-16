const db = require("./database");
const config = require("./config");
const logger = require("./logger");

/**
 * Verifica e cria usuários iniciais se necessário
 */
async function run() {
  try {
    // Garante que um usuário admin exista para os testes e para o primeiro uso
    const users = await db.getAllUsers();
    if (users.length === 0 && config.NODE_ENV !== "production") {
      logger.info(
        "INFO: Nenhum usuário encontrado. Criando usuário admin padrão...",
      );
      await db.saveUser({
        id: "user-seeded-admin-default",
        username: process.env.ADMIN_USERNAME || "admin",
        password: db.hashPassword(process.env.ADMIN_PASSWORD || "@admin123"),
        name: "Admin Padrão",
        email: "admin@example.com",
        role: "admin",
        isVerified: true,
        createdAt: new Date().toISOString(),
      });
      logger.info(`INFO: Usuário ${process.env.ADMIN_USERNAME || "admin"} criado com sucesso.`);
    }
  } catch (e) {
    logger.error("Erro ao executar seed de usuários:", e);
  }
}

module.exports = { run };

// Se executado diretamente via CLI
if (require.main === module) {
  (async () => {
    try {
      await db.init();
      await run();
      logger.info("Seed executado manualmente com sucesso.");
      process.exit(0);
    } catch (error) {
      logger.error("Erro ao executar seed manualmente:", error);
      process.exit(1);
    }
  })();
}
