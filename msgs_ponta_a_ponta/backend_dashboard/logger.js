const fs = require("fs");
const path = require("path");
const config = require("./config");

const levels = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Define o nível de log baseado no ambiente ou variável explícita
const currentLevel =
  process.env.LOG_LEVEL &&
  levels[process.env.LOG_LEVEL.toUpperCase()] !== undefined
    ? levels[process.env.LOG_LEVEL.toUpperCase()]
    : config.NODE_ENV === "development"
      ? levels.DEBUG
      : levels.INFO;

// Configuração de diretórios e arquivos de log
const LOG_DIR = path.join(__dirname, "logs");
const APP_LOG = path.join(LOG_DIR, "app.log");
const AUDIT_LOG = path.join(LOG_DIR, "audit.log");
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_LOG_BACKUPS = 5;

// Garante que o diretório de logs existe
if (!fs.existsSync(LOG_DIR)) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (e) {
    console.error("FATAL: Não foi possível criar diretório de logs:", e);
  }
}

function format(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

function rotateLog(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;

    const stats = fs.statSync(filePath);
    if (stats.size < MAX_LOG_SIZE) return;

    // Remove o backup mais antigo
    const oldestBackup = `${filePath}.${MAX_LOG_BACKUPS}`;
    if (fs.existsSync(oldestBackup)) {
      fs.unlinkSync(oldestBackup);
    }

    // Rotaciona os backups existentes
    for (let i = MAX_LOG_BACKUPS - 1; i >= 1; i--) {
      const current = `${filePath}.${i}`;
      const next = `${filePath}.${i + 1}`;
      if (fs.existsSync(current)) {
        fs.renameSync(current, next);
      }
    }

    // Rotaciona o atual
    const firstBackup = `${filePath}.1`;
    fs.renameSync(filePath, firstBackup);
  } catch (e) {
    console.error(`Erro na rotação de logs (${filePath}):`, e.message);
  }
}

function writeLog(filePath, message) {
  rotateLog(filePath);
  try {
    fs.appendFileSync(filePath, message + "\n");
  } catch (e) {
    console.error(`Erro de escrita no log ${filePath}:`, e);
  }
}

const logger = {
  debug: (msg, ...args) => {
    if (currentLevel <= levels.DEBUG) {
      const formatted = format("DEBUG", msg);
      console.debug(formatted, ...args);
      writeLog(APP_LOG, formatted);
    }
  },
  info: (msg, ...args) => {
    if (currentLevel <= levels.INFO) {
      const formatted = format("INFO", msg);
      console.log(formatted, ...args);
      writeLog(APP_LOG, formatted);
    }
  },
  warn: (msg, ...args) => {
    if (currentLevel <= levels.WARN) {
      const formatted = format("WARN", msg);
      console.warn(formatted, ...args);
      writeLog(APP_LOG, formatted);
    }
  },
  error: (msg, ...args) => {
    if (currentLevel <= levels.ERROR) {
      const formatted = format("ERROR", msg);
      console.error(formatted, ...args);
      writeLog(APP_LOG, formatted);
    }
  },
  audit: (user, action, details) => {
    const username = user ? user.username : "anonymous";
    const role = user ? user.role : "unknown";
    const detailsStr =
      typeof details === "object" ? JSON.stringify(details) : details;

    const message = `User: ${username} (${role}) | Action: ${action} | Details: ${detailsStr}`;
    const formatted = format("AUDIT", message);

    console.log(formatted);
    writeLog(AUDIT_LOG, formatted);
  },
  getAuditLogs: (limit = 50) => {
    try {
      if (!fs.existsSync(AUDIT_LOG)) return [];

      const content = fs.readFileSync(AUDIT_LOG, "utf-8");
      const lines = content.trim().split("\n");

      // Pega as últimas linhas e inverte para mostrar mais recentes primeiro
      return lines
        .reverse()
        .slice(0, limit)
        .map((line) => {
          // Tenta parsear o formato: [DATA] [AUDIT] CONTEUDO
          const match = line.match(/^\[(.*?)\] \[AUDIT\] (.*)$/);
          if (match) {
            return {
              timestamp: match[1],
              raw: match[2],
            };
          }
          return { raw: line };
        });
    } catch (e) {
      console.error("Erro ao ler logs de auditoria", e);
      return [];
    }
  },
};

module.exports = logger;
