const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const utils = require("./utils");
const config = require("./config");
const logger = require("./logger");

// Persistência de Sessões
const dataDir = config.DATA_DIR;
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const sessionsFile = path.join(dataDir, "sessions.json");

let sessionsData = {};

try {
  if (fs.existsSync(sessionsFile)) {
    sessionsData = JSON.parse(fs.readFileSync(sessionsFile, "utf-8"));
  }
} catch (e) {
  logger.error("Erro ao carregar sessões:", e.message);
}

function saveSessions() {
  try {
    fs.writeFileSync(sessionsFile, JSON.stringify(sessionsData, null, 2));
  } catch (e) {
    logger.error("Erro ao salvar sessões:", e.message);
  }
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getValidSession(req) {
  const cookies = utils.parseCookies(req);
  const token = cookies.session_token;

  if (!token) return null;

  const session = sessionsData[token];
  if (!session) return null;
  if (Date.now() > session.expiresAt) return null;

  const userAgent = req.headers["user-agent"];
  if (session.userAgent !== userAgent) {
    if (config.NODE_ENV === "production") {
      logger.warn(
        `⚠️  Sessão inválida: User-Agent alterado (User: ${session.username})`,
      );
    }
  }

  return session;
}

function createSession(username, ip, userAgent) {
  const token = generateSessionToken();
  const expiresAt = Date.now() + config.SESSION_MS;
  sessionsData[token] = { username, expiresAt, ip, userAgent };
  saveSessions();
  return token;
}

function destroySession(token) {
  if (sessionsData[token]) {
    delete sessionsData[token];
    saveSessions();
  }
}

function touchSession(token) {
  if (sessionsData[token]) {
    sessionsData[token].expiresAt = Date.now() + config.SESSION_MS;
    saveSessions();
  }
}

// Garbage Collection de Sessões
setInterval(
  () => {
    const now = Date.now();
    for (const [token, session] of Object.entries(sessionsData)) {
      if (session.expiresAt < now) delete sessionsData[token];
    }
  },
  60 * 60 * 1000,
);

module.exports = {
  getValidSession,
  createSession,
  destroySession,
  touchSession,
};
