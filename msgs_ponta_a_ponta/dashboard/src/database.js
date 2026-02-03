const { Pool } = require("pg");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

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
// Você deve definir a variável de ambiente DATABASE_URL
// Exemplo: postgres://usuario:senha@localhost:5432/dashboard_db
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://gerente:admin@localhost:5432/dashboard_p2p";

const pool = new Pool({
  connectionString,
});

const dataDir = path.join(__dirname, "../data");
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
      console.log(
        `⏳ Aguardando banco de dados PostgreSQL... (${retries} tentativas restantes)`,
      );
      retries--;
      if (retries === 0) {
        console.error(
          "\n❌ AVISO: Não foi possível conectar ao PostgreSQL em 127.0.0.1:5432.",
        );
        console.warn(
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
            "password" VARCHAR(255),
            "name" VARCHAR(255),
            "role" VARCHAR(50),
            "createdAt" VARCHAR(100)
        )`);

    // Migração Automática: Se o DB estiver vazio e existir JSON, importar dados
    const res = await query("SELECT count(*) as count FROM servers");
    const count = parseInt(res.rows[0].count);

    if (count === 0 && fs.existsSync(jsonConfigPath)) {
      console.log(
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
        console.log("✅ Migração concluída com sucesso.");
      } catch (e) {
        console.error("❌ Erro na migração:", e);
      }
    } else {
      console.log("✅ Banco de dados PostgreSQL conectado e inicializado.");
    }

    // Migração de Usuários
    const resUsers = await query("SELECT count(*) as count FROM users");
    const countUsers = parseInt(resUsers.rows[0].count);

    if (countUsers === 0) {
      if (fs.existsSync(jsonUsersPath)) {
        console.log("📂 Migrando dados de users.json para PostgreSQL...");
        try {
          const content = fs.readFileSync(jsonUsersPath, "utf-8");
          const config = JSON.parse(content);

          if (config.users && Array.isArray(config.users)) {
            for (const u of config.users) {
              await query(
                `INSERT INTO users ("id", "username", "password", "name", "role", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)`,
                [u.id, u.username, u.password, u.name, u.role, u.createdAt],
              );
            }
          }
          console.log("✅ Migração de usuários concluída com sucesso.");
        } catch (e) {
          console.error("❌ Erro na migração de usuários:", e);
        }
      } else {
        console.log("👤 Criando usuários padrão (admin/gerente)...");
        const now = new Date().toISOString();
        try {
          // Admin (Acesso Total)
          await query(
            `INSERT INTO users ("id", "username", "password", "name", "role", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              "user-admin",
              "admin",
              hashPassword("admin123"),
              "Administrador",
              "admin",
              now,
            ],
          );
          // Gerente (Gerencia Servidores)
          await query(
            `INSERT INTO users ("id", "username", "password", "name", "role", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              "user-gerente",
              "gerente",
              hashPassword("gerente123"),
              "Gerente",
              "gerente",
              now,
            ],
          );
          // Usuário Comum (Apenas Visualiza)
          await query(
            `INSERT INTO users ("id", "username", "password", "name", "role", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              "user-comum",
              "usuario",
              hashPassword("user123"),
              "Funcionário",
              "user",
              now,
            ],
          );
          console.log("✅ Usuários padrão criados.");
        } catch (e) {
          console.error("❌ Erro ao criar usuários padrão:", e);
        }
      }
    }
  } catch (err) {
    console.error("❌ Erro ao conectar ou inicializar PostgreSQL:", err);
    console.error(
      "Dica: Verifique se a variável de ambiente DATABASE_URL está correta.",
    );
    console.error(
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
    console.error("Erro ao ler JSON:", e);
  }
  return { servers: [], settings: {} };
}

function saveJsonConfig(data) {
  try {
    fs.writeFileSync(jsonConfigPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Erro ao salvar JSON:", e);
  }
}

async function getAllServers() {
  if (!isConnected) {
    const data = loadJsonConfig();
    return (data.servers || []).map((s) => ({
      ...s,
      requiresAuth: s.requiresAuth !== false,
    }));
  }
  const res = await query("SELECT * FROM servers");
  return res.rows.map((row) => ({
    ...row,
    requiresAuth: row.requiresAuth === true,
  }));
}

async function saveServer(server) {
  if (!isConnected) {
    const data = loadJsonConfig();
    if (!data.servers) data.servers = [];
    const index = data.servers.findIndex((s) => s.id === server.id);
    if (index !== -1) {
      data.servers[index] = { ...data.servers[index], ...server };
    } else {
      data.servers.push(server);
    }
    saveJsonConfig(data);
    return;
  }
  const sql = `
        INSERT INTO servers (
            "id", "name", "description", "host", "port", "protocol", "token", "status", "region", 
            "maxClients", "createdAt", "notes", "requiresAuth", "clientsCount", "lastSeen", "urltoken"
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

  const params = [
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
    server.clientsCount,
    server.lastSeen,
    server.urltoken,
  ];

  await query(sql, params);
}

async function deleteServer(id) {
  if (!isConnected) {
    const data = loadJsonConfig();
    if (data.servers) {
      data.servers = data.servers.filter((s) => s.id !== id);
      saveJsonConfig(data);
    }
    return;
  }
  await query('DELETE FROM servers WHERE "id" = $1', [id]);
}

async function getSettings() {
  if (!isConnected) {
    const data = loadJsonConfig();
    return data.settings || {};
  }
  const res = await query("SELECT * FROM settings");
  const settings = {};
  res.rows.forEach((row) => (settings[row.key] = row.value));
  return settings;
}

async function saveSetting(key, value) {
  if (!isConnected) {
    const data = loadJsonConfig();
    if (!data.settings) data.settings = {};
    data.settings[key] = value;
    saveJsonConfig(data);
    return;
  }
  const sql = `
        INSERT INTO settings ("key", "value") VALUES ($1, $2)
        ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value"
    `;
  await query(sql, [key, value]);
}

async function authenticateUser(username, password) {
  if (!isConnected) {
    try {
      if (fs.existsSync(jsonUsersPath)) {
        const content = fs.readFileSync(jsonUsersPath, "utf-8");
        const data = JSON.parse(content);
        if (data.users) {
          return (
            data.users.find(
              (u) =>
                u.username === username && verifyPassword(password, u.password),
            ) || null
          );
        }
      }
    } catch (e) {
      console.error("Erro ao ler users.json:", e);
    }
    return null;
  }
  const res = await query('SELECT * FROM users WHERE "username" = $1', [
    username,
  ]);
  const user = res.rows[0];
  if (user && verifyPassword(password, user.password)) return user;
  return null;
}

async function getUserByUsername(username) {
  if (!isConnected) {
    try {
      if (fs.existsSync(jsonUsersPath)) {
        const content = fs.readFileSync(jsonUsersPath, "utf-8");
        const data = JSON.parse(content);
        if (data.users) {
          return data.users.find((u) => u.username === username) || null;
        }
      }
    } catch (e) {
      console.error("Erro ao ler users.json:", e);
    }
    return null;
  }
  const res = await query('SELECT * FROM users WHERE "username" = $1', [
    username,
  ]);
  return res.rows[0] || null;
}

async function getAllUsers() {
  if (!isConnected) {
    try {
      if (fs.existsSync(jsonUsersPath)) {
        const content = fs.readFileSync(jsonUsersPath, "utf-8");
        const data = JSON.parse(content);
        return data.users || [];
      }
    } catch (e) {
      console.error("Erro ao ler users.json:", e);
    }
    return [];
  }
  const res = await query("SELECT * FROM users");
  return res.rows;
}

async function saveUser(user) {
  // Criptografar senha se fornecida
  if (user.password) {
    // Evitar criptografar novamente se já estiver criptografada (migrações/updates)
    if (!user.password.includes(":") || user.password.length < 100) {
      user.password = hashPassword(user.password);
    }
  } else {
    // Se não forneceu senha, tentar manter a atual (apenas para DB conectado)
    if (isConnected && user.id) {
      const res = await query("SELECT password FROM users WHERE id = $1", [
        user.id,
      ]);
      if (res.rows.length > 0) {
        user.password = res.rows[0].password;
      }
    }
  }

  if (!isConnected) {
    try {
      let data = { users: [] };
      if (fs.existsSync(jsonUsersPath)) {
        const content = fs.readFileSync(jsonUsersPath, "utf-8");
        data = JSON.parse(content);
      }
      if (!data.users) data.users = [];

      const index = data.users.findIndex((u) => u.id === user.id);
      if (index !== -1) {
        data.users[index] = { ...data.users[index], ...user };
      } else {
        data.users.push(user);
      }
      fs.writeFileSync(jsonUsersPath, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error("Erro ao salvar users.json:", e);
    }
    return;
  }

  const sql = `
        INSERT INTO users ("id", "username", "password", "name", "role", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT ("id") DO UPDATE SET
            "username" = EXCLUDED."username",
            "password" = EXCLUDED."password",
            "name" = EXCLUDED."name",
            "role" = EXCLUDED."role",
            "createdAt" = EXCLUDED."createdAt"
    `;

  await query(sql, [
    user.id,
    user.username,
    user.password,
    user.name,
    user.role,
    user.createdAt,
  ]);
}

async function deleteUser(id) {
  if (!isConnected) {
    try {
      if (fs.existsSync(jsonUsersPath)) {
        const content = fs.readFileSync(jsonUsersPath, "utf-8");
        const data = JSON.parse(content);
        if (data.users) {
          data.users = data.users.filter((u) => u.id !== id);
          fs.writeFileSync(jsonUsersPath, JSON.stringify(data, null, 2));
        }
      }
    } catch (e) {
      console.error("Erro ao deletar de users.json:", e);
    }
    return;
  }
  await query('DELETE FROM users WHERE "id" = $1', [id]);
}

module.exports = {
  init,
  getAllServers,
  saveServer,
  deleteServer,
  getSettings,
  saveSetting,
  authenticateUser,
  getUserByUsername,
  getAllUsers,
  saveUser,
  deleteUser,
};
