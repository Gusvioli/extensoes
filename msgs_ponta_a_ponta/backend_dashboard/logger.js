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

function format(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] ${level}: ${message}`;
}

const logger = {
  debug: (msg, ...args) => {
    if (currentLevel <= levels.DEBUG) {
      console.debug(format("DEBUG", msg), ...args);
    }
  },
  info: (msg, ...args) => {
    if (currentLevel <= levels.INFO) {
      console.log(format("INFO", msg), ...args);
    }
  },
  warn: (msg, ...args) => {
    if (currentLevel <= levels.WARN) {
      console.warn(format("WARN", msg), ...args);
    }
  },
  error: (msg, ...args) => {
    if (currentLevel <= levels.ERROR) {
      console.error(format("ERROR", msg), ...args);
    }
  },
  audit: (user, action, details) => {
    const username = user ? user.username : "anonymous";
    const role = user ? user.role : "unknown";
    const detailsStr =
      typeof details === "object" ? JSON.stringify(details) : details;
    logger.info(
      `[AUDIT] User: ${username} (${role}) | Action: ${action} | Details: ${detailsStr}`,
    );
  },
};

module.exports = logger;
