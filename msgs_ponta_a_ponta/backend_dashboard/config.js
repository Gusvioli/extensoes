const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Carregar variáveis de ambiente
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
  }
} catch (e) {
  console.warn("⚠️  Erro ao carregar .env:", e.message);
}

const SESSION_DAYS = parseInt(process.env.SESSION_DAYS || "30", 10);

module.exports = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  HOST: process.env.HOST || "0.0.0.0",
  NODE_ENV: process.env.NODE_ENV || "development",

  // Database
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://gerente:admin@localhost:5432/dashboard_p2p",

  // Auth / Session
  JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex"),
  SESSION_DAYS: SESSION_DAYS,
  SESSION_MS: SESSION_DAYS * 24 * 60 * 60 * 1000,
  SESSION_SEC: SESSION_DAYS * 24 * 60 * 60,

  // CORS
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || "*")
    .split(",")
    .map((o) => o.trim()),

  // SMTP
  SMTP: {
    HOST: process.env.SMTP_HOST,
    PORT: process.env.SMTP_PORT || 587,
    SECURE: process.env.SMTP_SECURE === "true",
    USER: process.env.SMTP_USER,
    PASS: process.env.SMTP_PASS,
    FROM: process.env.SMTP_FROM || '"Dashboard P2P" <noreply@example.com>',
  },

  // Paths
  DATA_DIR: path.join(__dirname, "../dashboard/data"),
  PUBLIC_DIR: path.join(__dirname, "../dashboard/public"),
};
