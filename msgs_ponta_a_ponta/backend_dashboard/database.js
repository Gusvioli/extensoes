// backend_dashboard/database.js

const { Pool } = require("pg");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const config = require("./config");
const logger = require("./logger");

// Funções de Criptografia
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword) return false;
  const [salt, key] = storedPassword.split(":");
  if (!salt || !key) return password === storedPassword; // Fallback para senhas antigas (texto plano)
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return key === hash;
}

// Configuração do banco de dados
const connectionString = config.DATABASE_URL;

const pool = new Pool({
  connectionString,
});

// Adjusted path: points to ../dashboard/data
const dataDir = config.DATA_DIR;
const jsonConfigPath = path.join(dataDir, "servers-config.json");
const jsonUsersPath = path.join(dataDir, "users.json");

let isConnected = false;

function query(text, params) {
  return pool.query(text, params);
}

async function init() {
  // Tentar conectar ao banco com retries (útil para Docker/Startup)
  let retries = 20;
  while (retries > 0) {
    try {
      await query("SELECT 1");
      isConnected = true;
      break;
    } catch (err) {
      logger.info(
        `⏳ Aguardando banco de dados PostgreSQL... (${retries} tentativas restantes)`,
      );
      retries--;
      if (retries === 0) {
        logger.error(
          "\n❌ AVISO: Não foi possível conectar ao PostgreSQL em 127.0.0.1:5432.",
        );
        logger.warn(
          "⚠️  Ativando modo de fallback: Usando arquivo JSON local (servers-config.json) para persistência.\n",
        );
        isConnected = false;
        return;
      }
      await new Promise((res) => setTimeout(res, 2000));
    }
  }

  try {
    // Criar Tabela de Servidores
    // Aspas duplas preservam o camelCase das colunas
    await query(`CREATE TABLE IF NOT EXISTS servers (
            "id" VARCHAR(255) PRIMARY KEY,
            "name" VARCHAR(255),
            "description" TEXT,
            "host" VARCHAR(255),
            "port" INTEGER,
            "protocol" VARCHAR(10),
            "token" VARCHAR(255),
            "status" VARCHAR(50),
            "region" VARCHAR(100),
            "maxClients" INTEGER,
            "createdAt" VARCHAR(100),
            "notes" TEXT,
            "requiresAuth" BOOLEAN DEFAULT TRUE,
            "clientsCount" INTEGER DEFAULT 0,
            "lastSeen" VARCHAR(100),
            "urltoken" VARCHAR(255)
        )`);

    // Criar Tabela de Configurações
    await query(`CREATE TABLE IF NOT EXISTS settings (
            "key" VARCHAR(255) PRIMARY KEY,
            "value" TEXT
        )`);

    // Criar Tabela de Usuários
    await query(`CREATE TABLE IF NOT EXISTS users (
            "id" VARCHAR(255) PRIMARY KEY,
            "username" VARCHAR(255) UNIQUE,
            "email" VARCHAR(255),
            "password" VARCHAR(255),
            "name" VARCHAR(255),
            "role" VARCHAR(50),
            "createdAt" VARCHAR(100)
        )`);

    // Migração: Adicionar coluna email se não existir (para bancos existentes)
    try {
      await query(`ALTER TABLE users ADD COLUMN "email" VARCHAR(255)`);
    } catch (e) {
      // Ignorar erro se a coluna já existir
    }

    // Migração: Adicionar colunas de verificação de e-mail
    try {
      await query(
        `ALTER TABLE users ADD COLUMN "isVerified" BOOLEAN DEFAULT FALSE`,
      );
    } catch (e) {}
    try {
      await query(
        `ALTER TABLE users ADD COLUMN "verificationCode" VARCHAR(20)`,
      );
    } catch (e) {}
    try {
      await query(`ALTER TABLE users ADD COLUMN "verificationExpires" BIGINT`);
    } catch (e) {}

    // Migração: Adicionar coluna requiresAuth na tabela servers se não existir
    try {
      await query(
        `ALTER TABLE servers ADD COLUMN "requiresAuth" BOOLEAN DEFAULT TRUE`,
      );
    } catch (e) {
      // Ignorar erro se a coluna já existir
    }

    // Migração Automática: Se o DB estiver vazio e existir JSON, importar dados
    const res = await query("SELECT count(*) as count FROM servers");
    const count = parseInt(res.rows[0].count);

    if (count === 0 && fs.existsSync(jsonConfigPath)) {
      logger.info(
        "📂 Migrando dados de servers-config.json para PostgreSQL...",
      );
      try {
        const content = fs.readFileSync(jsonConfigPath, "utf-8");
        const config = JSON.parse(content);

        if (config.servers && Array.isArray(config.servers)) {
          for (const s of config.servers) {
            await saveServer(s);
          }
        }

        if (config.settings) {
          for (const [key, value] of Object.entries(config.settings)) {
            await saveSetting(key, value);
          }
        }
        logger.info("✅ Migração concluída com sucesso.");
      } catch (e) {
        logger.error("❌ Erro na migração:", e);
      }
    } else {
      logger.info("✅ Banco de dados PostgreSQL conectado e inicializado.");
    }

    // Migração de Usuários
    const resUsers = await query("SELECT count(*) as count FROM users");
    const countUsers = parseInt(resUsers.rows[0].count);

    if (countUsers === 0) {
      if (fs.existsSync(jsonUsersPath)) {
        logger.info("📂 Migrando dados de users.json para PostgreSQL...");
        try {
          const content = fs.readFileSync(jsonUsersPath, "utf-8");
          const config = JSON.parse(content);

          if (config.users && Array.isArray(config.users)) {
            for (const u of config.users) {
              await query(
                `INSERT INTO users ("id", "username", "password", "name", "role", "createdAt", "email") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                  u.id,
                  u.username,
                  u.password,
                  u.name,
                  u.role,
                  u.createdAt,
                  u.email || null,
                ],
              );
            }
          }
          logger.info("✅ Migração de usuários concluída com sucesso.");
        } catch (e) {
          logger.error("❌ Erro na migração de usuários:", e);
        }
      } else {
        logger.info("👤 Criando usuários padrão (admin/gerente)...");
        const now = new Date().toISOString();
        try {
          // Admin (Acesso Total)
          await query(
            `INSERT INTO users ("id", "username", "password", "name", "role", "createdAt", "email") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              "user-admin",
              "admin",
              hashPassword("admin123"),
              "Administrador",
              "admin",
              now,
              "admin@local.host",
            ],
          );
          // Gerente (Gerencia Servidores)
          await query(
            `INSERT INTO users ("id", "username", "password", "name", "role", "createdAt", "email") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              "user-gerente",
              "gerente",
              hashPassword("gerente123"),
              "Gerente",
              "gerente",
              now,
              "gerente@local.host",
            ],
          );
          // Usuário Comum (Apenas Visualiza)
          await query(
            `INSERT INTO users ("id", "username", "password", "name", "role", "createdAt", "email") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              "user-comum",
              "usuario",
              hashPassword("user123"),
              "Funcionário",
              "user",
              now,
              "usuario@local.host",
            ],
          );
          logger.info("✅ Usuários padrão criados.");
        } catch (e) {
          logger.error("❌ Erro ao criar usuários padrão:", e);
        }
      }
    }
  } catch (err) {
    logger.error("❌ Erro ao conectar ou inicializar PostgreSQL:", err);
    logger.error(
      "Dica: Verifique se a variável de ambiente DATABASE_URL está correta.",
    );
    logger.error(
      "Exemplo: DATABASE_URL=postgresql://user:pass@localhost:5432/db_name",
    );
  }
}

// Helpers para modo JSON (Fallback)
function loadJsonConfig() {
  try {
    if (fs.existsSync(jsonConfigPath)) {
      return JSON.parse(fs.readFileSync(jsonConfigPath, "utf-8"));
    }
  } catch (e) {
    logger.error("Erro ao ler JSON:", e);
  }
  return { servers: [], settings: {} };
}

function saveJsonConfig(data) {
  try {
    fs.writeFileSync(jsonConfigPath, JSON.stringify(data, null, 2));
  } catch (e) {
    logger.error("Erro ao salvar JSON:", e);
  }
}

async function getSettings() {
  if (!isConnected) {
    const config = loadJsonConfig();
    return config.settings || {};
  }
  const res = await query("SELECT * FROM settings");
  const settings = {};
  res.rows.forEach((row) => {
    settings[row.key] = row.value;
  });
  return settings;
}

async function saveSetting(key, value) {
  if (!isConnected) {
    const config = loadJsonConfig();
    if (!config.settings) config.settings = {};
    config.settings[key] = value;
    saveJsonConfig(config);
    return;
  }
  await query(
    `INSERT INTO settings ("key", "value") VALUES ($1, $2)
     ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value"`,
    [key, value],
  );
}

async function getAllServers() {
  if (!isConnected) {
    const config = loadJsonConfig();
    return config.servers || [];
  }
  const res = await query("SELECT * FROM servers");

  // DEBUG: Ver o que está vindo do banco (amostra do primeiro item)
  if (res.rows.length > 0) {
    const s = res.rows[0];
    logger.info(
      `[DEBUG] DB Read Sample: ID=${s.id}, requiresAuth=${s.requiresAuth} (Type: ${typeof s.requiresAuth})`,
    );
  }

  return res.rows.map((s) => ({
    ...s,
    port: s.port ? parseInt(s.port) : null,
    maxClients: parseInt(s.maxClients),
    // FIX: Aceita true, 1, 't', 'true' como verdadeiro
    // Também verifica s.requiresauth (minúsculo) caso o driver do PG tenha normalizado o nome
    requiresAuth:
      s.requiresAuth === true ||
      s.requiresAuth === 1 ||
      s.requiresAuth === "t" ||
      s.requiresAuth === "true" ||
      // Fallback para coluna em minúsculo se a camelCase não existir
      (s.requiresAuth === undefined &&
        (s.requiresauth === true ||
          s.requiresauth === 1 ||
          s.requiresauth === "t" ||
          s.requiresauth === "true")),

    clientsCount: parseInt(s.clientsCount || 0),
  }));
}

async function saveServer(server) {
  logger.info(`[DEBUG] saveServer RAW input: ${JSON.stringify(server)}`);

  // Normalizar requiresAuth (aceita requireAuth também) para garantir persistência correta
  if (server.requiresAuth === undefined && server.requireAuth !== undefined) {
    server.requiresAuth = server.requireAuth;
  }

  // FIX: Normalização robusta para Booleano (cobre strings, números e undefined)
  if (
    String(server.requiresAuth) === "true" ||
    server.requiresAuth === "t" ||
    server.requiresAuth === 1
  ) {
    server.requiresAuth = true;
  } else if (
    String(server.requiresAuth) === "false" ||
    server.requiresAuth === "f" ||
    server.requiresAuth === 0
  ) {
    server.requiresAuth = false;
  } else if (typeof server.requiresAuth !== "boolean") {
    // Se for undefined/null, converte para booleano (false) para evitar erro no banco
    server.requiresAuth = Boolean(server.requiresAuth);
  }

  // Log para debug
  logger.info(
    `[DEBUG] saveServer PROCESSED: Privado? ${server.requiresAuth} (Type: ${typeof server.requiresAuth})`,
  );

  if (!isConnected) {
    const config = loadJsonConfig();
    if (!config.servers) config.servers = [];
    const index = config.servers.findIndex((s) => s.id === server.id);
    if (index !== -1) {
      config.servers[index] = server;
    } else {
      config.servers.push(server);
    }
    saveJsonConfig(config);
    return;
  }

  const sql = `
    INSERT INTO servers (
      "id", "name", "description", "host", "port", "protocol", "token",
      "status", "region", "maxClients", "createdAt", "notes",
      "requiresAuth", "clientsCount", "lastSeen", "urltoken"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    ON CONFLICT ("id") DO UPDATE SET
      "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "host" = EXCLUDED."host",
      "port" = EXCLUDED."port",
      "protocol" = EXCLUDED."protocol",
      "token" = EXCLUDED."token",
      "status" = EXCLUDED."status",
      "region" = EXCLUDED."region",
      "maxClients" = EXCLUDED."maxClients",
      "createdAt" = EXCLUDED."createdAt",
      "notes" = EXCLUDED."notes",
      "requiresAuth" = EXCLUDED."requiresAuth",
      "clientsCount" = EXCLUDED."clientsCount",
      "lastSeen" = EXCLUDED."lastSeen",
      "urltoken" = EXCLUDED."urltoken"
  `;

  await query(sql, [
    server.id,
    server.name,
    server.description,
    server.host,
    server.port,
    server.protocol,
    server.token,
    server.status,
    server.region,
    server.maxClients,
    server.createdAt,
    server.notes,
    server.requiresAuth,
    server.clientsCount || 0,
    server.lastSeen,
    server.urltoken,
  ]);
}

async function deleteServer(id) {
  if (!isConnected) {
    const config = loadJsonConfig();
    if (config.servers) {
      config.servers = config.servers.filter((s) => s.id !== id);
      saveJsonConfig(config);
    }
    return;
  }
  await query('DELETE FROM servers WHERE "id" = $1', [id]);
}

async function getAllUsers() {
  if (!isConnected) {
    if (fs.existsSync(jsonUsersPath)) {
      try {
        const content = fs.readFileSync(jsonUsersPath, "utf-8");
        const data = JSON.parse(content);
        return data.users || [];
      } catch (e) {
        return [];
      }
    }
    return [];
  }
  const res = await query("SELECT * FROM users");
  return res.rows;
}

async function getUserByUsername(username) {
  const users = await getAllUsers(); // Reutiliza lógica (DB ou JSON)
  return users.find((u) => u.username === username) || null;
}

async function getUserById(id) {
  const users = await getAllUsers();
  return users.find((u) => u.id === id) || null;
}

async function getUserByEmail(email) {
  const users = await getAllUsers();
  return users.find((u) => u.email === email) || null;
}

async function saveUser(user) {
  if (!isConnected) {
    let users = await getAllUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index !== -1) users[index] = user;
    else users.push(user);
    try {
      fs.writeFileSync(jsonUsersPath, JSON.stringify({ users }, null, 2));
    } catch (e) {}
    return;
  }

  const sql = `
    INSERT INTO users (
      "id", "username", "password", "name", "role", "createdAt", "email",
      "isVerified", "verificationCode", "verificationExpires"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT ("id") DO UPDATE SET
      "username" = EXCLUDED."username",
      "password" = EXCLUDED."password",
      "name" = EXCLUDED."name",
      "role" = EXCLUDED."role",
      "createdAt" = EXCLUDED."createdAt",
      "email" = EXCLUDED."email",
      "isVerified" = EXCLUDED."isVerified",
      "verificationCode" = EXCLUDED."verificationCode",
      "verificationExpires" = EXCLUDED."verificationExpires"
  `;

  await query(sql, [
    user.id,
    user.username,
    user.password,
    user.name,
    user.role,
    user.createdAt,
    user.email,
    user.isVerified,
    user.verificationCode,
    user.verificationExpires,
  ]);
}

async function deleteUser(id) {
  if (!isConnected) {
    let users = await getAllUsers();
    users = users.filter((u) => u.id !== id);
    try {
      fs.writeFileSync(jsonUsersPath, JSON.stringify({ users }, null, 2));
    } catch (e) {}
    return;
  }
  await query('DELETE FROM users WHERE "id" = $1', [id]);
}

async function authenticateUser(username, password) {
  const user = await getUserByUsername(username);
  if (!user) return null;
  if (verifyPassword(password, user.password)) {
    return user;
  }
  return null;
}

async function verifyUserCode(email, code) {
  const user = await getUserByEmail(email);
  if (!user) return false;
  if (
    user.verificationCode === code &&
    parseInt(user.verificationExpires) > Date.now()
  ) {
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationExpires = null;
    await saveUser(user);
    return true;
  }
  return false;
}

module.exports = {
  init,
  getSettings,
  saveSetting,
  getAllServers,
  saveServer,
  deleteServer,
  getAllUsers,
  getUserByUsername,
  getUserByEmail,
  saveUser,
  deleteUser,
  authenticateUser,
  verifyUserCode,
  hashPassword,
  getUserById,
};
