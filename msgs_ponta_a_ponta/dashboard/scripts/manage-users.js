const db = require("../src/database");

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log("Gerenciador de Usuários (CLI)");
  console.log("-----------------------------");
  console.log("Uso:");
  console.log("  list                          - Lista todos os usuários");
  console.log(
    "  add <user> <pass> <name> [role] - Adiciona ou atualiza um usuário",
  );
  console.log(
    "                                  (role padrão: user, opções: admin, user)",
  );
  console.log("  delete <id>                   - Remove um usuário pelo ID");
  console.log("");
  console.log("Exemplos:");
  console.log('  node manage-users.js add joao 123456 "João Silva" admin');
  console.log("  node manage-users.js delete user-123");
}

async function main() {
  // Configurar DATABASE_URL se não estiver definida (fallback para local)
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      "postgresql://gerente:admin@localhost:5432/dashboard_p2p";
  }

  try {
    // Silenciar logs de conexão do database.js para saída limpa no CLI
    const originalLog = console.log;
    console.log = function () {};
    await db.init();
    console.log = originalLog; // Restaurar logs
  } catch (error) {
    console.error("Erro ao conectar ao banco:", error.message);
    process.exit(1);
  }

  if (command === "list") {
    const users = await db.getAllUsers();
    if (users.length === 0) {
      console.log("Nenhum usuário encontrado.");
    } else {
      console.table(
        users.map((u) => ({
          ID: u.id,
          Username: u.username,
          Name: u.name,
          Role: u.role,
          Created: u.createdAt,
        })),
      );
    }
    process.exit(0);
  } else if (command === "add") {
    const [_, username, password, name, role] = args;
    if (!username || !password || !name) {
      console.error("❌ Erro: Faltam argumentos.");
      printHelp();
      process.exit(1);
    }

    const users = await db.getAllUsers();
    const existing = users.find((u) => u.username === username);

    const newUser = {
      id: existing ? existing.id : `user-${Date.now()}`,
      username,
      password,
      name,
      role: role || "user",
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
    };

    await db.saveUser(newUser);
    console.log(
      existing
        ? `✅ Usuário '${username}' atualizado com sucesso!`
        : `✅ Usuário '${username}' criado com sucesso!`,
    );
    process.exit(0);
  } else if (command === "delete") {
    const id = args[1];
    if (!id) {
      console.error("❌ Erro: ID não fornecido.");
      process.exit(1);
    }
    await db.deleteUser(id);
    console.log(`✅ Usuário com ID '${id}' removido.`);
    process.exit(0);
  } else {
    printHelp();
    process.exit(1);
  }
}

main();
